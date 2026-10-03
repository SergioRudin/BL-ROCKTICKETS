const {
    pool
} = require('../config/db')

const {
    releaseOrderReservation
} = require('./reservationService')


async function expireOldPendingOrders() {
    const [orders] =
    await pool.execute(
        `
      SELECT orderId
      FROM orders
      WHERE status = 'PENDING'
        AND reservationReleasedAt IS NULL
        AND reservationExpiresAt IS NOT NULL
        AND reservationExpiresAt < NOW()
      `
    )


    let expiredCount = 0


    for (
        const order of orders
    ) {
        try {
            const released =
                await releaseOrderReservation(
                    order.orderId,
                    'EXPIRED'
                )


            if (released) {
                expiredCount += 1
            }
        } catch (error) {
            console.error(
                `Error expirando ${order.orderId}:`,
                error
            )
        }
    }


    if (
        expiredCount > 0
    ) {
        console.log(
            `🧹 Órdenes expiradas y reservas liberadas: ${expiredCount}`
        )
    }


    return expiredCount
}


module.exports = {
    expireOldPendingOrders
}