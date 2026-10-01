const crypto = require('crypto')

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
// CREAR ORDEN PENDING + CHECKOUT ONVO
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
        // VALIDAR ZONAS
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


            if (!normalizedQuantity ||
                normalizedQuantity < 1
            ) {
                throw new Error(
                    `Cantidad inválida para ${normalizedZoneCode}`
                )
            }


            const [zones] =
            await connection.execute(
                `
          SELECT *
          FROM event_zones
          WHERE eventId = ?
            AND code = ?
          LIMIT 1
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


            const available =
                Number(
                    zone.capacity
                ) -
                Number(
                    zone.sold
                )


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
          paymentProvider
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, 'PENDING', 'ONVO'
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
        // GUARDAR ORDER ITEMS
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
        }


        await connection.commit()


        // =====================================================
        // CREAR LINE ITEMS ONVO
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
            await pool.execute(
                `
        UPDATE orders
        SET status = 'PAYMENT_ERROR'
        WHERE id = ?
        `, [
                    orderDbId
                ]
            )

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
        // RESPUESTA AL FRONTEND
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
// CONFIRMAR ORDEN PAGADA
// ESTA FUNCIÓN LA LLAMARÁ EL WEBHOOK DE ONVO
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
        // BLOQUEAR ORDER
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
                order,
                tickets: []
            }
        }


        if (
            order.status !==
            'PENDING' &&
            order.status !==
            'PAYMENT_ERROR'
        ) {
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
        // ORDER ITEMS
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
        // VALIDAR INVENTARIO DE NUEVO
        // =====================================================

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


            const available =
                Number(
                    zone.capacity
                ) -
                Number(
                    zone.sold
                )


            if (
                Number(
                    item.quantity
                ) >
                available
            ) {
                throw new Error(
                    `No hay suficientes entradas disponibles en ${zone.name}`
                )
            }
        }


        // =====================================================
        // CREAR TICKETS + ACTUALIZAR SOLD
        // =====================================================

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


            const zone =
                zones[0]


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
        // MARCAR PAID
        // =====================================================

        await connection.execute(
            `
      UPDATE orders
      SET
        status = 'PAID',
        paymentProvider = 'ONVO',
        paymentId = COALESCE(?, paymentId),
        checkoutSessionId = COALESCE(?, checkoutSessionId),
        paidAt = NOW()
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


        // =====================================================
        // CORREO + PDFs
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
            console.error(
                '⚠️ Pago confirmado, pero falló el email:',
                emailError
            )
        }


        return {
            alreadyProcessed: false,

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
                    req.user.id :
                    null
            })


        return res
            .status(201)
            .json(result)
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
            'Error obteniendo tickets:',
            error
        )


        return res
            .status(500)
            .json({
                message: 'Error obteniendo tickets de la orden'
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
    fulfillPaidOrder
}