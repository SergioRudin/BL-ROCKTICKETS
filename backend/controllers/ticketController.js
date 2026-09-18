const {
    pool,
} = require('../config/db');

const {
    createPurchase,
} = require('./orderController');


async function getTickets(req, res) {
    try {
        const [tickets] = await pool.execute(
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

      ORDER BY t.createdAt DESC
      `
        );

        res.json(tickets);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo tickets',
        });
    }
}


async function getTicketsByOrder(req, res) {
    try {
        const { orderId } =
        req.params;

        const [tickets] = await pool.execute(
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
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo tickets',
        });
    }
}


async function getTicketByCode(req, res) {
    try {
        const {
            ticketCode,
        } = req.params;

        const [tickets] = await pool.execute(
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

      WHERE t.ticketCode = ?

      LIMIT 1
      `, [ticketCode]
        );

        if (!tickets.length) {
            return res.status(404).json({
                message: 'Ticket no encontrado',
            });
        }

        res.json(tickets[0]);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error buscando ticket',
        });
    }
}


async function markTicketUsed(req, res) {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } =
        req.params;

        const [tickets] =
        await connection.execute(
            `
        SELECT *
        FROM tickets
        WHERE id = ?
        FOR UPDATE
        `, [id]
        );

        if (!tickets.length) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Ticket no encontrado',
            });
        }

        const ticket =
            tickets[0];

        if (
            ticket.status === 'USED'
        ) {
            await connection.execute(
                `
        INSERT INTO ticket_validations (
          ticketId,
          validatedBy,
          result
        )
        VALUES (?, ?, 'ALREADY_USED')
        `, [
                    ticket.id,
                    req.user ? req.user.id : null,
                ]
            );

            await connection.commit();

            return res.status(409).json({
                message: 'Este ticket ya fue utilizado',
                ticket,
            });
        }

        if (
            ticket.status === 'CANCELLED'
        ) {
            await connection.execute(
                `
        INSERT INTO ticket_validations (
          ticketId,
          validatedBy,
          result
        )
        VALUES (?, ?, 'CANCELLED')
        `, [
                    ticket.id,
                    req.user ? req.user.id : null,
                ]
            );

            await connection.commit();

            return res.status(409).json({
                message: 'Este ticket está cancelado',
                ticket,
            });
        }

        await connection.execute(
            `
      UPDATE tickets
      SET
        status = 'USED',
        usedAt = NOW()
      WHERE id = ?
      `, [id]
        );

        await connection.execute(
            `
      INSERT INTO ticket_validations (
        ticketId,
        validatedBy,
        result
      )
      VALUES (?, ?, 'VALID')
      `, [
                ticket.id,
                req.user ? req.user.id : null,
            ]
        );

        await connection.commit();

        const [updated] =
        await pool.execute(
            `
        SELECT *
        FROM tickets
        WHERE id = ?
        `, [id]
        );

        res.json(updated[0]);
    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
            message: 'Error validando ticket',
        });
    } finally {
        connection.release();
    }
}


async function transferTicket(req, res) {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } =
        req.params;

        const {
            ownerName,
            ownerEmail,
        } = req.body;

        if (!ownerName ||
            !ownerEmail
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: 'Nombre y correo del nuevo titular son requeridos',
            });
        }

        const [tickets] =
        await connection.execute(
            `
        SELECT *
        FROM tickets
        WHERE id = ?
        FOR UPDATE
        `, [id]
        );

        if (!tickets.length) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Ticket no encontrado',
            });
        }

        const ticket =
            tickets[0];

        if (
            Number(
                ticket.transferCount
            ) >= 1
        ) {
            await connection.rollback();

            return res.status(409).json({
                message: 'Este ticket ya fue transferido anteriormente y no puede volver a transferirse.',
            });
        }

        if (
            ticket.status !== 'ACTIVE'
        ) {
            await connection.rollback();

            return res.status(409).json({
                message: 'Solo se pueden transferir tickets activos.',
            });
        }

        await connection.execute(
            `
      INSERT INTO ticket_transfers (
        ticketId,
        previousOwnerName,
        previousOwnerEmail,
        newOwnerName,
        newOwnerEmail
      )
      VALUES (?, ?, ?, ?, ?)
      `, [
                ticket.id,
                ticket.ownerName,
                ticket.ownerEmail,
                ownerName,
                ownerEmail.toLowerCase(),
            ]
        );

        await connection.execute(
            `
      UPDATE tickets
      SET
        ownerName = ?,
        ownerEmail = ?,
        transferredAt = NOW(),
        transferCount = transferCount + 1
      WHERE id = ?
      `, [
                ownerName,
                ownerEmail.toLowerCase(),
                id,
            ]
        );

        await connection.commit();

        const [updated] =
        await pool.execute(
            `
        SELECT *
        FROM tickets
        WHERE id = ?
        `, [id]
        );

        res.json(updated[0]);
    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
            message: 'Error transfiriendo ticket',
        });
    } finally {
        connection.release();
    }
}


async function createTestTickets(req, res) {
    try {
        const result =
            await createPurchase({
                ...req.body,

                userId: req.user ? req.user.id : null,
            });

        /*
          Para mantener compatibilidad con el frontend viejo
          devolvemos tickets directamente y también la orden.
        */

        res.status(201).json({
            orderId: result.order.orderId,

            order: result.order,

            tickets: result.tickets,
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message,
        });
    }
}


async function getMyTickets(req, res) {
    try {
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

        WHERE
          t.userId = ?
          OR t.ownerEmail = ?

        ORDER BY e.date ASC
        `, [
                req.user.id,
                req.user.email,
            ]
        );

        res.json(tickets);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo tus tickets',
        });
    }
}


module.exports = {
    getTickets,
    getTicketsByOrder,
    getTicketByCode,
    markTicketUsed,
    transferTicket,
    createTestTickets,
    getMyTickets,
};