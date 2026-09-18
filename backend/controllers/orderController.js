const crypto = require('crypto');

const {
    pool,
} = require('../config/db');


function generateOrderId() {
    return (
        'ORD-' +
        Date.now() +
        '-' +
        crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()
    );
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
    );
}


async function createPurchase({
    eventId,
    buyerName,
    buyerEmail,
    items,
    zoneCode,
    quantity,
    userId = null,
}) {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        let normalizedItems = items;

        // Compatibilidad con el frontend actual:
        // {
        //   zoneCode: "GENERAL",
        //   quantity: 3
        // }
        if (!Array.isArray(normalizedItems) &&
            zoneCode &&
            quantity
        ) {
            normalizedItems = [{
                zoneCode,
                quantity,
            }, ];
        }


        if (!eventId ||
            !buyerName ||
            !buyerEmail ||
            !Array.isArray(normalizedItems) ||
            !normalizedItems.length
        ) {
            throw new Error(
                'Faltan datos requeridos para crear la orden'
            );
        }


        // =====================================================
        // EVENT
        // =====================================================

        const [events] =
        await connection.execute(
            `
        SELECT *
        FROM events
        WHERE id = ?
        FOR UPDATE
        `, [eventId]
        );


        if (!events.length) {
            throw new Error(
                'Evento no encontrado'
            );
        }


        const processedItems = [];

        let total = 0;


        // =====================================================
        // VALIDAR ZONAS
        // =====================================================

        for (const item of normalizedItems) {
            const normalizedZoneCode =
                String(
                    item.zoneCode
                ).toUpperCase();


            const normalizedQuantity =
                Number(
                    item.quantity
                );


            if (!normalizedQuantity ||
                normalizedQuantity < 1
            ) {
                throw new Error(
                    `Cantidad inválida para ${normalizedZoneCode}`
                );
            }


            const [zones] =
            await connection.execute(
                `
          SELECT *
          FROM event_zones
          WHERE eventId = ?
            AND code = ?
          FOR UPDATE
          `, [
                    eventId,
                    normalizedZoneCode,
                ]
            );


            if (!zones.length) {
                throw new Error(
                    `La zona ${normalizedZoneCode} no existe`
                );
            }


            const zone = zones[0];


            const available =
                Number(zone.capacity) -
                Number(zone.sold);


            if (
                normalizedQuantity >
                available
            ) {
                throw new Error(
                    `No hay suficientes entradas disponibles en ${zone.name}`
                );
            }


            const itemTotal =
                Number(zone.price) *
                normalizedQuantity;


            total += itemTotal;


            processedItems.push({
                zone,
                quantity: normalizedQuantity,
                itemTotal,
            });
        }


        // =====================================================
        // CREAR ORDER
        // =====================================================

        const orderId =
            generateOrderId();


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
          status
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, 'PAID'
        )
        `, [
                orderId,
                userId,
                eventId,
                buyerName,
                buyerEmail
                .trim()
                .toLowerCase(),
                total,
            ]
        );


        const orderDbId =
            orderResult.insertId;


        const tickets = [];


        // =====================================================
        // ORDER ITEMS + TICKETS
        // =====================================================

        for (const item of processedItems) {
            const {
                zone,
                quantity,
            } = item;


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
                    zone.price,
                ]
            );


            // Actualizar entradas vendidas
            await connection.execute(
                `
        UPDATE event_zones
        SET sold = sold + ?
        WHERE id = ?
        `, [
                    quantity,
                    zone.id,
                ]
            );


            // Crear un ticket por entrada
            for (
                let i = 0; i < quantity; i++
            ) {
                const ticketCode =
                    generateTicketCode();


                const normalizedEmail =
                    buyerEmail
                    .trim()
                    .toLowerCase();


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
                        eventId,
                        orderId,
                        userId,
                        buyerName,
                        normalizedEmail,
                        buyerName,
                        normalizedEmail,
                        zone.name,
                        zone.code,
                        zone.price,
                        ticketCode,
                    ]
                );


                tickets.push({
                    id: ticketResult.insertId,

                    eventId,

                    orderId,

                    buyerName,

                    buyerEmail: normalizedEmail,

                    ownerName: buyerName,

                    ownerEmail: normalizedEmail,

                    zoneName: zone.name,

                    zoneCode: zone.code,

                    price: Number(
                        zone.price
                    ),

                    ticketCode,

                    status: 'ACTIVE',

                    usedAt: null,
                });
            }
        }


        // =====================================================
        // COMMIT
        // =====================================================

        await connection.commit();


        return {
            order: {
                id: orderDbId,

                orderId,

                eventId,

                buyerName,

                buyerEmail: buyerEmail
                    .trim()
                    .toLowerCase(),

                total,

                status: 'PAID',
            },

            tickets,
        };
    } catch (error) {
        await connection.rollback();

        throw error;
    } finally {
        connection.release();
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
                    null,
            });


        res
            .status(201)
            .json(result);
    } catch (error) {
        console.error(
            'Error creando orden:',
            error
        );


        res
            .status(400)
            .json({
                message: error.message,
            });
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
            orderId,
        } = req.params;


        const [tickets] =
        await pool.execute(
            `
        SELECT
          t.*,

          e.title AS eventTitle,
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
        `, [orderId]
        );


        res.json(tickets);
    } catch (error) {
        console.error(
            'Error obteniendo tickets:',
            error
        );


        res
            .status(500)
            .json({
                message: 'Error obteniendo tickets de la orden',
            });
    }
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    createPurchase,
    createOrder,
    getOrderTickets,
};