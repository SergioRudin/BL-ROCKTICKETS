const {
    pool
} = require('../config/db')


async function releaseOrderReservation(
    orderId,
    newStatus
) {
    const connection =
        await pool.getConnection()

    try {
        await connection.beginTransaction()


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


        const order =
            orders[0]


        // Ya pagada: nunca liberar inventario vendido.
        if (
            order.status === 'PAID'
        ) {
            await connection.commit()

            return false
        }


        // La reserva ya fue liberada antes.
        if (
            order.reservationReleasedAt
        ) {
            await connection.commit()

            return false
        }


        const [items] =
        await connection.execute(
            `
        SELECT
          zoneId,
          quantity
        FROM order_items
        WHERE orderDbId = ?
        `, [
                order.id
            ]
        )


        for (
            const item of items
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
      SET
        status = ?,
        reservationReleasedAt = NOW()
      WHERE id = ?
      `, [
                newStatus,
                order.id
            ]
        )


        await connection.commit()

        return true
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


module.exports = {
    releaseOrderReservation
}