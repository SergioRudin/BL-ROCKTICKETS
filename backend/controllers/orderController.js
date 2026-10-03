const crypto = require('crypto')

const {
    releaseOrderReservation
} = require('../services/reservationService')

const {
    pool
} = require('../config/db')

const {
    sendEmail
} = require('../utils/mailer')

const {
    generateTicketPdf
} = require('../utils/ticketPdf')

const {
    createCheckoutSession
} = require('../services/onvoService')


// =========================================================
// HELPERS
// =========================================================

function generateOrderId() {
    return (
        'ORD-' +
        Date.now() +
        '-' +
        crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()
    )
}


function generateTicketCode() {
    return (
        'TQ-' +
        Date.now() +
        '-' +
        crypto
        .randomBytes(5)
        .toString('hex')
        .toUpperCase()
    )
}


// =========================================================
// CREAR ORDEN PENDING + RESERVA + CHECKOUT ONVO
// =========================================================

async function createPurchase({
    eventId,
    buyerName,
    buyerEmail,
    items,
    zoneCode,
    quantity,
    userId = null
}) {
    const connection =
        await pool.getConnection()

    let orderDbId = null
    let orderId = null
    let committed = false

    try {
        await connection.beginTransaction()


        // =====================================================
        // NORMALIZAR ITEMS
        // =====================================================

        let normalizedItems =
            items


        if (!Array.isArray(
                normalizedItems
            ) &&
            zoneCode &&
            quantity
        ) {
            normalizedItems = [{
                zoneCode,
                quantity
            }]
        }


        if (!eventId ||
            !buyerName ||
            !buyerEmail ||
            !Array.isArray(
                normalizedItems
            ) ||
            !normalizedItems.length
        ) {
            throw new Error(
                'Faltan datos requeridos para crear la orden'
            )
        }


        const normalizedBuyerEmail =
            String(
                buyerEmail
            )
            .trim()
            .toLowerCase()


        // =====================================================
        // EVENTO
        // =====================================================

        const [events] =
        await connection.execute(
            `
        SELECT *
        FROM events
        WHERE id = ?
        LIMIT 1
        `, [
                eventId
            ]
        )


        if (!events.length) {
            throw new Error(
                'Evento no encontrado'
            )
        }


        const event =
            events[0]


        // =====================================================
        // VALIDAR ZONAS + BLOQUEAR INVENTARIO
        // =====================================================

        const processedItems = []

        let total = 0


        for (
            const item of normalizedItems
        ) {
            const normalizedZoneCode =
                String(
                    item.zoneCode || ''
                )
                .trim()
                .toUpperCase()


            const normalizedQuantity =
                Number(
                    item.quantity
                )


            if (!normalizedZoneCode) {
                throw new Error(
                    'Código de zona inválido'
                )
            }


            if (!Number.isInteger(
                    normalizedQuantity
                ) ||
                normalizedQuantity < 1
            ) {
                throw new Error(
                    `Cantidad inválida para ${normalizedZoneCode}`
                )
            }


            /*
              FOR UPDATE es importante.

              Si dos personas intentan comprar
              las últimas entradas al mismo tiempo,
              una transacción espera a la otra.
            */

            const [zones] =
            await connection.execute(
                `
          SELECT *
          FROM event_zones
          WHERE eventId = ?
            AND code = ?
          LIMIT 1
          FOR UPDATE
          `, [
                    eventId,
                    normalizedZoneCode
                ]
            )


            if (!zones.length) {
                throw new Error(
                    `La zona ${normalizedZoneCode} no existe`
                )
            }


            const zone =
                zones[0]


            const capacity =
                Number(
                    zone.capacity
                )


            const sold =
                Number(
                    zone.sold
                )


            const reserved =
                Number(
                    zone.reserved || 0
                )


            const available =
                capacity -
                sold -
                reserved


            if (
                normalizedQuantity >
                available
            ) {
                throw new Error(
                    `No hay suficientes entradas disponibles en ${zone.name}`
                )
            }


            const itemTotal =
                Number(
                    zone.price
                ) *
                normalizedQuantity


            total +=
                itemTotal


            processedItems.push({
                zone,
                quantity: normalizedQuantity,
                itemTotal
            })
        }


        // =====================================================
        // CREAR ORDER PENDING
        // =====================================================

        orderId =
            generateOrderId()


        const [orderResult] =
        await connection.execute(
            `
        INSERT INTO orders (
          orderId,
          userId,
          eventId,
          buyerName,
          buyerEmail,
          total,
          status,
          paymentProvider,
          reservationExpiresAt
        )
        VALUES (
          ?, ?, ?, ?, ?, ?,
          'PENDING',
          'ONVO',
          DATE_ADD(NOW(), INTERVAL 30 MINUTE)
        )
        `, [
                orderId,
                userId,
                eventId,
                buyerName,
                normalizedBuyerEmail,
                total
            ]
        )


        orderDbId =
            orderResult.insertId


        // =====================================================
        // GUARDAR ITEMS + RESERVAR INVENTARIO
        // =====================================================

        for (
            const item of processedItems
        ) {
            const {
                zone,
                quantity
            } = item


            await connection.execute(
                `
        INSERT INTO order_items (
          orderDbId,
          zoneId,
          zoneCode,
          zoneName,
          quantity,
          price
        )
        VALUES (
          ?, ?, ?, ?, ?, ?
        )
        `, [
                    orderDbId,
                    zone.id,
                    zone.code,
                    zone.name,
                    quantity,
                    zone.price
                ]
            )


            /*
              Todavía NO aumentamos sold.

              Mientras el usuario está en ONVO,
              esas entradas quedan reservadas.
            */

            await connection.execute(
                `
        UPDATE event_zones
        SET reserved = reserved + ?
        WHERE id = ?
        `, [
                    quantity,
                    zone.id
                ]
            )
        }


        await connection.commit()

        committed = true


        // =====================================================
        // LINE ITEMS ONVO
        // =====================================================

        const lineItems =
            processedItems.map(
                (item) => {
                    return {
                        quantity: item.quantity,

                        unitAmount: Math.round(
                            Number(
                                item.zone.price
                            ) * 100
                        ),

                        currency: 'CRC',

                        description: `${event.title} - ${item.zone.name}`
                    }
                }
            )


        // =====================================================
        // CREAR CHECKOUT ONVO
        // =====================================================

        let checkoutSession


        try {
            checkoutSession =
                await createCheckoutSession({
                    orderId,

                    buyerEmail: normalizedBuyerEmail,

                    lineItems
                })
        } catch (error) {
            /*
              La reserva ya fue COMMIT.

              Si ONVO no puede crear el checkout,
              debemos devolver las entradas
              inmediatamente.
            */

            try {
                await releaseOrderReservation(
                    orderId,
                    'PAYMENT_ERROR'
                )
            } catch (releaseError) {
                console.error(
                    'Error liberando reserva después de fallo ONVO:',
                    releaseError
                )
            }

            throw error
        }


        // =====================================================
        // GUARDAR DATOS ONVO
        // =====================================================

        await pool.execute(
            `
      UPDATE orders
      SET
        paymentProvider = 'ONVO',
        paymentId = ?,
        checkoutSessionId = ?
      WHERE id = ?
      `, [
                checkoutSession.paymentIntentId ||
                null,

                checkoutSession.id ||
                null,

                orderDbId
            ]
        )


        // =====================================================
        // RESPUESTA
        // =====================================================

        return {
            order: {
                id: orderDbId,

                orderId,

                eventId,

                userId,

                buyerName,

                buyerEmail: normalizedBuyerEmail,

                total,

                status: 'PENDING',

                paymentProvider: 'ONVO',

                paymentId: checkoutSession.paymentIntentId ||
                    null,

                checkoutSessionId: checkoutSession.id ||
                    null
            },

            checkoutUrl: checkoutSession.url
        }
    } catch (error) {
        /*
          Si todavía estábamos dentro de la
          transacción inicial, hacemos rollback.

          Si ya hicimos commit, no intentamos
          revertir esa misma transacción.
        */

        if (!committed) {
            try {
                await connection.rollback()
            } catch (rollbackError) {
                console.error(
                    'Error haciendo rollback:',
                    rollbackError
                )
            }
        }

        throw error
    } finally {
        connection.release()
    }
}


// =========================================================
// CONFIRMAR ORDEN PAGADA
// LLAMADA DESDE WEBHOOK ONVO
// =========================================================

async function fulfillPaidOrder({
    orderId,
    paymentId = null,
    checkoutSessionId = null
}) {
    const connection =
        await pool.getConnection()

    let tickets = []
    let order = null
    let event = null

    try {
        await connection.beginTransaction()


        // =====================================================
        // BLOQUEAR ORDEN
        // =====================================================

        const [orders] =
        await connection.execute(
            `
        SELECT *
        FROM orders
        WHERE orderId = ?
        LIMIT 1
        FOR UPDATE
        `, [
                orderId
            ]
        )


        if (!orders.length) {
            throw new Error(
                'Orden no encontrada'
            )
        }


        order =
            orders[0]


        // =====================================================
        // IDEMPOTENCIA
        // =====================================================

        if (
            order.status ===
            'PAID'
        ) {
            await connection.commit()

            return {
                alreadyProcessed: true,

                requiresReview: false,

                order,

                tickets: []
            }
        }


        if (
            order.status ===
            'PAYMENT_REVIEW'
        ) {
            await connection.commit()

            return {
                alreadyProcessed: true,

                requiresReview: true,

                order,

                tickets: []
            }
        }


        const allowedStatuses = [
            'PENDING',
            'PAYMENT_ERROR',
            'EXPIRED',
            'PAYMENT_FAILED'
        ]


        if (!allowedStatuses.includes(
                order.status
            )) {
            throw new Error(
                `La orden no puede procesarse desde estado ${order.status}`
            )
        }


        // =====================================================
        // EVENTO
        // =====================================================

        const [events] =
        await connection.execute(
            `
        SELECT *
        FROM events
        WHERE id = ?
        LIMIT 1
        `, [
                order.eventId
            ]
        )


        if (!events.length) {
            throw new Error(
                'Evento no encontrado'
            )
        }


        event =
            events[0]


        // =====================================================
        // ITEMS
        // =====================================================

        const [orderItems] =
        await connection.execute(
            `
        SELECT *
        FROM order_items
        WHERE orderDbId = ?
        ORDER BY id ASC
        `, [
                order.id
            ]
        )


        if (!orderItems.length) {
            throw new Error(
                'La orden no tiene items'
            )
        }


        // =====================================================
        // DETERMINAR ESTADO REAL DE LA RESERVA
        // =====================================================

        const reservationReleased =
            Boolean(
                order.reservationReleasedAt
            )


        const reservationExpiresAt =
            order.reservationExpiresAt ?
            new Date(
                order.reservationExpiresAt
            ) :
            null


        const reservationExpired =
            reservationExpiresAt ?
            reservationExpiresAt.getTime() <
            Date.now() :
            true


        let reservationStillActive = !reservationReleased &&
            !reservationExpired


        /*
          Caso especial:

          La hora de reserva ya pasó,
          pero el cleanup todavía no alcanzó
          a liberar físicamente los cupos.

          Los liberamos aquí dentro de la misma
          transacción y luego tratamos esto como
          un pago tardío.
        */

        if (!reservationReleased &&
            reservationExpired
        ) {
            for (
                const item of orderItems
            ) {
                await connection.execute(
                    `
          UPDATE event_zones
          SET reserved =
            GREATEST(
              reserved - ?,
              0
            )
          WHERE id = ?
          `, [
                        item.quantity,
                        item.zoneId
                    ]
                )
            }


            await connection.execute(
                `
        UPDATE orders
        SET reservationReleasedAt = NOW()
        WHERE id = ?
        `, [
                    order.id
                ]
            )


            order.reservationReleasedAt =
                new Date()


            reservationStillActive =
                false
        }


        // =====================================================
        // INVENTARIO
        // =====================================================

        const lockedZones = []


        for (
            const item of orderItems
        ) {
            const [zones] =
            await connection.execute(
                `
          SELECT *
          FROM event_zones
          WHERE id = ?
          FOR UPDATE
          `, [
                    item.zoneId
                ]
            )


            if (!zones.length) {
                throw new Error(
                    `Zona ${item.zoneName} no encontrada`
                )
            }


            const zone =
                zones[0]


            // =============================================
            // RESERVA VIGENTE
            // =============================================

            if (
                reservationStillActive
            ) {
                if (
                    Number(
                        zone.reserved
                    ) <
                    Number(
                        item.quantity
                    )
                ) {
                    throw new Error(
                        `Reserva inconsistente para ${zone.name}`
                    )
                }
            } else {

                // ===========================================
                // PAGO TARDÍO / RESERVA YA LIBERADA
                // ===========================================

                const available =
                    Number(
                        zone.capacity
                    ) -
                    Number(
                        zone.sold
                    ) -
                    Number(
                        zone.reserved || 0
                    )


                if (
                    Number(
                        item.quantity
                    ) >
                    available
                ) {
                    await connection.execute(
                        `
            UPDATE orders
            SET
              status = 'PAYMENT_REVIEW',
              paymentProvider = 'ONVO',
              paymentId =
                COALESCE(
                  ?,
                  paymentId
                ),
              checkoutSessionId =
                COALESCE(
                  ?,
                  checkoutSessionId
                ),
              paidAt = NOW(),
              reservationReleasedAt =
                COALESCE(
                  reservationReleasedAt,
                  NOW()
                )
            WHERE id = ?
            `, [
                            paymentId,
                            checkoutSessionId,
                            order.id
                        ]
                    )


                    await connection.commit()


                    console.error(
                        `⚠️ Orden ${order.orderId} pagada pero sin inventario suficiente`
                    )


                    return {
                        alreadyProcessed: false,

                        requiresReview: true,

                        order: {
                            ...order,
                            status: 'PAYMENT_REVIEW'
                        },

                        tickets: []
                    }
                }
            }


            lockedZones.push({
                item,
                zone
            })
        }


        // =====================================================
        // CONVERTIR RESERVA EN VENTA
        // =====================================================

        for (
            const entry of lockedZones
        ) {
            const {
                item,
                zone
            } = entry


            if (
                reservationStillActive
            ) {
                await connection.execute(
                    `
          UPDATE event_zones
          SET
            reserved =
              GREATEST(
                reserved - ?,
                0
              ),
            sold =
              sold + ?
          WHERE id = ?
          `, [
                        item.quantity,
                        item.quantity,
                        zone.id
                    ]
                )
            } else {
                /*
                  La reserva ya había sido liberada.
                  Como acabamos de comprobar disponibilidad,
                  simplemente vendemos.
                */

                await connection.execute(
                    `
          UPDATE event_zones
          SET sold = sold + ?
          WHERE id = ?
          `, [
                        item.quantity,
                        zone.id
                    ]
                )
            }
        }


        // =====================================================
        // CREAR TICKETS
        // =====================================================

        for (
            const entry of lockedZones
        ) {
            const {
                item,
                zone
            } = entry


            for (
                let i = 0; i <
                Number(
                    item.quantity
                ); i++
            ) {
                const ticketCode =
                    generateTicketCode()


                const [ticketResult] =
                await connection.execute(
                    `
            INSERT INTO tickets (
              eventId,
              orderId,
              userId,
              buyerName,
              buyerEmail,
              ownerName,
              ownerEmail,
              zoneName,
              zoneCode,
              price,
              ticketCode,
              status
            )
            VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE'
            )
            `, [
                        order.eventId,
                        order.orderId,
                        order.userId,
                        order.buyerName,
                        order.buyerEmail,
                        order.buyerName,
                        order.buyerEmail,
                        zone.name,
                        zone.code,
                        zone.price,
                        ticketCode
                    ]
                )


                tickets.push({
                    id: ticketResult.insertId,

                    eventId: order.eventId,

                    orderId: order.orderId,

                    userId: order.userId,

                    buyerName: order.buyerName,

                    buyerEmail: order.buyerEmail,

                    ownerName: order.buyerName,

                    ownerEmail: order.buyerEmail,

                    zoneName: zone.name,

                    zoneCode: zone.code,

                    price: Number(
                        zone.price
                    ),

                    ticketCode,

                    status: 'ACTIVE',

                    usedAt: null,

                    eventTitle: event.title,

                    eventArtist: event.artist,

                    eventVenue: event.venue,

                    eventCity: event.city,

                    eventCountry: event.country,

                    eventDate: event.date,

                    eventImage: event.image
                })
            }
        }


        // =====================================================
        // MARCAR ORDEN PAID
        // =====================================================

        await connection.execute(
            `
      UPDATE orders
      SET
        status = 'PAID',
        paymentProvider = 'ONVO',
        paymentId =
          COALESCE(
            ?,
            paymentId
          ),
        checkoutSessionId =
          COALESCE(
            ?,
            checkoutSessionId
          ),
        paidAt = NOW(),
        reservationReleasedAt =
          COALESCE(
            reservationReleasedAt,
            NOW()
          )
      WHERE id = ?
      `, [
                paymentId,
                checkoutSessionId,
                order.id
            ]
        )


        await connection.commit()


        order.status =
            'PAID'

        order.paymentId =
            paymentId ||
            order.paymentId

        order.checkoutSessionId =
            checkoutSessionId ||
            order.checkoutSessionId

        order.reservationReleasedAt =
            order.reservationReleasedAt ||
            new Date()


        // =====================================================
        // EMAIL + PDFs
        // =====================================================

        try {
            const ticketsHtml =
                tickets
                .map(
                    (ticket) => {
                        return `
                <div
                  style="
                    padding: 18px;
                    margin-bottom: 12px;
                    border: 1px solid #2c2c2c;
                    border-radius: 14px;
                    background: #171717;
                  "
                >

                  <div
                    style="
                      font-size: 12px;
                      color: #888888;
                    "
                  >
                    Zona
                  </div>


                  <div
                    style="
                      margin-top: 5px;
                      font-size: 18px;
                      font-weight: 700;
                      color: #ffffff;
                    "
                  >
                    ${ticket.zoneName}
                  </div>


                  <div
                    style="
                      margin-top: 16px;
                      font-size: 12px;
                      color: #888888;
                    "
                  >
                    Código del ticket
                  </div>


                  <div
                    style="
                      margin-top: 5px;
                      color: #ff6b57;
                      font-family: monospace;
                      font-weight: 700;
                    "
                  >
                    ${ticket.ticketCode}
                  </div>

                </div>
              `
                    }
                )
                .join('')


            const eventDate =
                event.date ?
                new Date(
                    event.date
                ).toLocaleString(
                    'es-CR', {
                        dateStyle: 'long',

                        timeStyle: 'short'
                    }
                ) :
                'Fecha por confirmar'


            const emailHtml = `
        <div
          style="
            background: #070707;
            color: #ffffff;
            font-family: Arial, sans-serif;
            padding: 32px 16px;
          "
        >

          <div
            style="
              max-width: 620px;
              margin: 0 auto;
              background: #111111;
              border: 1px solid #292929;
              border-radius: 20px;
              padding: 32px;
            "
          >

            <div
              style="
                color: #ff2b2b;
                font-size: 30px;
                font-weight: 800;
                margin-bottom: 22px;
              "
            >
              RockTickets
            </div>


            <h1
              style="
                margin: 0 0 10px;
                color: #ffffff;
              "
            >
              ¡Pago confirmado!
            </h1>


            <p
              style="
                color: #bdbdbd;
                line-height: 1.6;
              "
            >
              Hola ${order.buyerName},
              tu pago fue confirmado correctamente.
            </p>


            <div
              style="
                padding: 20px;
                margin: 24px 0;
                background: #181818;
                border: 1px solid #292929;
                border-radius: 14px;
              "
            >

              <div
                style="
                  color: #888888;
                  font-size: 12px;
                "
              >
                EVENTO
              </div>


              <div
                style="
                  margin-top: 5px;
                  color: #ffffff;
                  font-size: 20px;
                  font-weight: 700;
                "
              >
                ${event.title}
              </div>


              <div
                style="
                  margin-top: 16px;
                  color: #888888;
                  font-size: 12px;
                "
              >
                FECHA
              </div>


              <div
                style="
                  margin-top: 5px;
                  color: #ffffff;
                "
              >
                ${eventDate}
              </div>


              <div
                style="
                  margin-top: 16px;
                  color: #888888;
                  font-size: 12px;
                "
              >
                ORDEN
              </div>


              <div
                style="
                  margin-top: 5px;
                  color: #ffffff;
                  font-family: monospace;
                "
              >
                ${order.orderId}
              </div>


              <div
                style="
                  margin-top: 16px;
                  color: #888888;
                  font-size: 12px;
                "
              >
                TOTAL
              </div>


              <div
                style="
                  margin-top: 5px;
                  color: #ffffff;
                  font-size: 20px;
                  font-weight: 700;
                "
              >
                ₡${Number(
                  order.total
                ).toLocaleString(
                  'es-CR'
                )}
              </div>

            </div>


            <h2>
              Tus tickets
            </h2>


            ${ticketsHtml}


            <div
              style="
                margin-top: 28px;
                text-align: center;
              "
            >

              <a
                href="${process.env.FRONTEND_URL}/tickets"
                style="
                  display: inline-block;
                  padding: 14px 24px;
                  background: #ef4444;
                  color: #ffffff;
                  border-radius: 12px;
                  text-decoration: none;
                  font-weight: 700;
                "
              >
                Ver mis tickets
              </a>

            </div>

          </div>

        </div>
      `


            const attachments = []


            for (
                const ticket of tickets
            ) {
                const pdfBuffer =
                    await generateTicketPdf(
                        ticket
                    )


                attachments.push({
                    filename: `RockTickets-${ticket.ticketCode}.pdf`,

                    content: pdfBuffer
                })
            }


            await sendEmail({
                to: order.buyerEmail,

                subject: `RockTickets | Pago confirmado - ${event.title}`,

                html: emailHtml,

                attachments
            })


            console.log(
                `✅ Email y PDFs enviados a ${order.buyerEmail}`
            )
        } catch (emailError) {
            /*
              La compra ya está PAID.

              Un error de email nunca debe
              deshacer la venta.
            */

            console.error(
                '⚠️ Pago confirmado, pero falló el email:',
                emailError
            )
        }


        return {
            alreadyProcessed: false,

            requiresReview: false,

            order,

            tickets
        }
    } catch (error) {
        try {
            await connection.rollback()
        } catch (rollbackError) {
            console.error(
                'Error haciendo rollback:',
                rollbackError
            )
        }

        throw error
    } finally {
        connection.release()
    }
}


// =========================================================
// POST /api/orders
// =========================================================

async function createOrder(
    req,
    res
) {
    try {
        const result =
            await createPurchase({
                ...req.body,

                userId: req.user ?
                    req.user.id : null
            })


        return res
            .status(201)
            .json(
                result
            )
    } catch (error) {
        console.error(
            'Error creando orden:',
            error
        )


        return res
            .status(400)
            .json({
                message: error.message
            })
    }
}


// =========================================================
// GET /api/orders/:orderId/tickets
// =========================================================

async function getOrderTickets(
    req,
    res
) {
    try {
        const {
            orderId
        } = req.params


        if (!orderId) {
            return res
                .status(400)
                .json({
                    message: 'Order ID requerido'
                })
        }


        // =====================================================
        // BUSCAR ORDEN
        // =====================================================

        const [orders] =
        await pool.execute(
            `
        SELECT
          id,
          orderId,
          userId,
          buyerEmail,
          status
        FROM orders
        WHERE orderId = ?
        LIMIT 1
        `, [
                orderId
            ]
        )


        if (!orders.length) {
            return res
                .status(404)
                .json({
                    message: 'Orden no encontrada'
                })
        }


        const order =
            orders[0]


        // =====================================================
        // VALIDAR PROPIEDAD
        // =====================================================

        const currentUserId =
            Number(
                req.user.id
            )


        const orderUserId =
            order.userId ?
            Number(
                order.userId
            ) :
            null


        const currentEmail =
            String(
                req.user.email || ''
            )
            .trim()
            .toLowerCase()


        const orderEmail =
            String(
                order.buyerEmail || ''
            )
            .trim()
            .toLowerCase()


        const isOwnerById =
            orderUserId &&
            orderUserId ===
            currentUserId


        const isOwnerByEmail =
            currentEmail &&
            orderEmail &&
            currentEmail ===
            orderEmail


        const isAdmin =
            req.user.role ===
            'ADMIN'


        if (!isOwnerById &&
            !isOwnerByEmail &&
            !isAdmin
        ) {
            return res
                .status(403)
                .json({
                    message: 'No tienes permiso para ver los tickets de esta orden'
                })
        }


        // =====================================================
        // SOLO ENTREGAR TICKETS SI LA ORDEN ESTÁ PAGADA
        // =====================================================

        if (
            order.status !==
            'PAID'
        ) {
            return res
                .status(409)
                .json({
                    message: 'La orden todavía no está pagada'
                })
        }


        // =====================================================
        // OBTENER TICKETS
        // =====================================================

        const [tickets] =
        await pool.execute(
            `
        SELECT
          t.*,

          e.title AS eventTitle,
          e.slug AS eventSlug,
          e.artist AS eventArtist,
          e.venue AS eventVenue,
          e.arena AS eventArena,
          e.city AS eventCity,
          e.country AS eventCountry,
          e.date AS eventDate,
          e.image AS eventImage

        FROM tickets t

        JOIN events e
          ON e.id = t.eventId

        WHERE t.orderId = ?

        ORDER BY t.id ASC
        `, [
                orderId
            ]
        )


        return res.json(
            tickets
        )
    } catch (error) {
        console.error(
            'Error obteniendo tickets de la orden:',
            error
        )


        return res
            .status(500)
            .json({
                message: 'Error obteniendo tickets de la orden'
            })
    }
}

async function getOrderStatus(
    req,
    res
) {
    try {
        const {
            orderId
        } = req.params


        if (!orderId) {
            return res
                .status(400)
                .json({
                    message: 'Order ID requerido'
                })
        }


        const [orders] =
        await pool.execute(
            `
        SELECT
          id,
          orderId,
          userId,
          eventId,
          buyerName,
          buyerEmail,
          total,
          status,
          paymentProvider,
          paymentId,
          checkoutSessionId,
          paidAt,
          reservationExpiresAt,
          reservationReleasedAt,
          createdAt,
          updatedAt
        FROM orders
        WHERE orderId = ?
        LIMIT 1
        `, [
                orderId
            ]
        )


        if (!orders.length) {
            return res
                .status(404)
                .json({
                    message: 'Orden no encontrada'
                })
        }


        const order =
            orders[0]


        const currentUserId =
            req.user ?
            Number(
                req.user.id
            ) :
            null


        const orderUserId =
            order.userId ?
            Number(
                order.userId
            ) :
            null


        const currentEmail =
            req.user ?
            String(
                req.user.email || ''
            )
            .trim()
            .toLowerCase() :
            ''


        const orderEmail =
            String(
                order.buyerEmail || ''
            )
            .trim()
            .toLowerCase()


        const isOwnerById =
            currentUserId &&
            orderUserId &&
            currentUserId ===
            orderUserId


        const isOwnerByEmail =
            currentEmail &&
            orderEmail &&
            currentEmail ===
            orderEmail


        const isAdmin =
            req.user &&
            req.user.role ===
            'ADMIN'


        if (!isOwnerById &&
            !isOwnerByEmail &&
            !isAdmin
        ) {
            return res
                .status(403)
                .json({
                    message: 'No tienes permiso para consultar esta orden'
                })
        }


        return res.json({
            order
        })
    } catch (error) {
        console.error(
            'Error obteniendo estado de orden:',
            error
        )


        return res
            .status(500)
            .json({
                message: 'Error obteniendo estado de la orden'
            })
    }
}


async function getMyOrders(
    req,
    res
) {
    try {
        const userId =
            Number(
                req.user.id
            )

        const userEmail =
            String(
                req.user.email || ''
            )
            .trim()
            .toLowerCase()


        const [orders] =
        await pool.execute(
            `
        SELECT
          o.id,
          o.orderId,
          o.eventId,
          o.buyerName,
          o.buyerEmail,
          o.total,
          o.status,
          o.paymentProvider,
          o.paidAt,
          o.reservationExpiresAt,
          o.createdAt,

          e.title AS eventTitle,
          e.artist AS eventArtist,
          e.venue AS eventVenue,
          e.city AS eventCity,
          e.country AS eventCountry,
          e.date AS eventDate,
          e.image AS eventImage

        FROM orders o

        JOIN events e
          ON e.id = o.eventId

        WHERE
          o.userId = ?
          OR LOWER(o.buyerEmail) = ?

        ORDER BY o.createdAt DESC
        `, [
                userId,
                userEmail
            ]
        )


        return res.json(
            orders
        )
    } catch (error) {
        console.error(
            'Error obteniendo órdenes del usuario:',
            error
        )


        return res
            .status(500)
            .json({
                message: 'Error obteniendo historial de órdenes'
            })
    }
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    createPurchase,
    createOrder,
    getOrderTickets,
    getOrderStatus,
    getMyOrders,
    fulfillPaidOrder
}