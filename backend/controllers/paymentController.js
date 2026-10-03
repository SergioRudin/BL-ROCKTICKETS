const {
    createCheckoutSession
} = require('../services/onvoService')
const {
    releaseOrderReservation
} = require('../services/reservationService')
const {
    fulfillPaidOrder
} = require('./orderController')

const {
    pool
} = require('../config/db')


// =========================================================
// TEST ONVO
// =========================================================

async function testOnvo(
    req,
    res
) {
    try {
        const session =
            await createCheckoutSession({
                orderId: 'TEST-' + Date.now(),

                buyerEmail: 'test@example.com',

                lineItems: [{
                    quantity: 1,
                    unitAmount: 100000,
                    currency: 'CRC',
                    description: 'RockTickets Test'
                }]
            })


        return res.json({
            ok: true,
            session
        })
    } catch (error) {
        console.error(
            'Error probando ONVO:',
            error
        )


        return res
            .status(500)
            .json({
                ok: false,
                message: error.message
            })
    }
}


// =========================================================
// BUSCAR ORDER ID DESDE WEBHOOK
// =========================================================

async function resolveOrderId(
    data
) {
    const metadata =
        data.metadata || {}


    if (
        metadata.orderId
    ) {
        return metadata.orderId
    }


    const paymentId =
        data.paymentIntentId ||
        data.id ||
        null


    if (!paymentId) {
        return null
    }


    const [orders] =
    await pool.execute(
        `
      SELECT orderId
      FROM orders
      WHERE paymentId = ?
      LIMIT 1
      `, [
            paymentId
        ]
    )


    if (!orders.length) {
        return null
    }


    return orders[0].orderId
}


// =========================================================
// PAYMENT FAILED
// =========================================================

async function markPaymentFailed(
    data
) {
    const orderId =
        await resolveOrderId(
            data
        )


    if (!orderId) {
        console.warn(
            '⚠️ No se encontró orden para payment-intent.failed'
        )

        return false
    }


    const [orders] =
    await pool.execute(
        `
      SELECT
        id,
        orderId,
        status,
        reservationReleasedAt
      FROM orders
      WHERE orderId = ?
      LIMIT 1
      `, [
            orderId
        ]
    )


    if (!orders.length) {
        console.warn(
            `⚠️ Orden ${orderId} no encontrada`
        )

        return false
    }


    const order =
        orders[0]


    // Si ya fue pagada, jamás degradarla
    if (
        order.status === 'PAID'
    ) {
        console.log(
            `ℹ️ ${orderId} ya está PAID. Se ignora payment-intent.failed`
        )

        return false
    }


    // Si requiere revisión, tampoco tocarla
    if (
        order.status ===
        'PAYMENT_REVIEW'
    ) {
        console.log(
            `ℹ️ ${orderId} está en PAYMENT_REVIEW`
        )

        return false
    }


    // ============================================
    // LIBERAR RESERVA
    // ============================================

    if (!order.reservationReleasedAt) {
        const released =
            await releaseOrderReservation(
                orderId,
                'PAYMENT_FAILED'
            )


        console.log(
            released ?
            `❌ Pago fallido. Reserva liberada para ${orderId}` :
            `ℹ️ Reserva de ${orderId} ya estaba liberada`
        )


        return true
    }


    // ============================================
    // YA ESTABA LIBERADA
    // Solo actualizamos estado
    // ============================================

    await pool.execute(
        `
    UPDATE orders
    SET status = 'PAYMENT_FAILED'
    WHERE orderId = ?
      AND status NOT IN (
        'PAID',
        'PAYMENT_REVIEW'
      )
    `, [
            orderId
        ]
    )


    console.log(
        `❌ Pago fallido para ${orderId}`
    )


    return true
}


// =========================================================
// WEBHOOK ONVO
// =========================================================

async function handleOnvoWebhook(
    req,
    res
) {
    try {
        const receivedSecret =
            String(
                req.headers[
                    'x-webhook-secret'
                ] || ''
            ).trim()


        const expectedSecret =
            String(
                process.env.ONVO_WEBHOOK_SECRET ||
                ''
            ).trim()


        if (!expectedSecret ||
            !receivedSecret ||
            receivedSecret !==
            expectedSecret
        ) {
            console.warn(
                '⚠️ Webhook ONVO rechazado'
            )


            return res
                .status(401)
                .json({
                    message: 'Webhook no autorizado'
                })
        }


        const event =
            req.body


        if (!event ||
            !event.type ||
            !event.data
        ) {
            return res
                .status(400)
                .json({
                    message: 'Payload inválido'
                })
        }


        console.log(
            '📩 Webhook ONVO:',
            event.type
        )


        // =====================================================
        // CHECKOUT PAGADO
        // =====================================================

        if (
            event.type ===
            'checkout-session.succeeded'
        ) {
            const session =
                event.data


            if (
                session.paymentStatus !==
                'paid'
            ) {
                console.log(
                    'ℹ️ Checkout completado sin pago confirmado'
                )


                return res.json({
                    received: true,
                    processed: false
                })
            }


            const metadata =
                session.metadata || {}


            const orderId =
                metadata.orderId


            if (!orderId) {
                console.error(
                    '❌ Checkout pagado sin orderId'
                )


                return res
                    .status(400)
                    .json({
                        message: 'Webhook sin orderId'
                    })
            }


            const result =
                await fulfillPaidOrder({
                    orderId,

                    paymentId: session.paymentIntentId ||
                        null,

                    checkoutSessionId: session.id ||
                        null
                })


            if (
                result.requiresReview
            ) {
                console.warn(
                    `⚠️ Orden ${orderId} requiere revisión`
                )
            } else if (
                result.alreadyProcessed
            ) {
                console.log(
                    `ℹ️ Orden ${orderId} ya estaba procesada`
                )
            } else {
                console.log(
                    `✅ Orden ${orderId} pagada y procesada`
                )
            }


            return res.json({
                received: true,
                processed: true,
                alreadyProcessed: Boolean(
                    result.alreadyProcessed
                ),
                requiresReview: Boolean(
                    result.requiresReview
                )
            })
        }


        // =====================================================
        // PAYMENT INTENT EXITOSO
        // =====================================================

        if (
            event.type ===
            'payment-intent.succeeded'
        ) {
            const data =
                event.data


            const orderId =
                await resolveOrderId(
                    data
                )


            if (!orderId) {
                console.log(
                    'ℹ️ payment-intent.succeeded sin orden asociada'
                )


                return res.json({
                    received: true,
                    processed: false
                })
            }


            const result =
                await fulfillPaidOrder({
                    orderId,

                    paymentId: data.id ||
                        data.paymentIntentId ||
                        null,

                    checkoutSessionId: null
                })


            return res.json({
                received: true,
                processed: true,
                alreadyProcessed: Boolean(
                    result.alreadyProcessed
                ),
                requiresReview: Boolean(
                    result.requiresReview
                )
            })
        }


        // =====================================================
        // PAYMENT INTENT FALLIDO
        // =====================================================

        if (
            event.type ===
            'payment-intent.failed'
        ) {
            const processed =
                await markPaymentFailed(
                    event.data
                )


            return res.json({
                received: true,
                processed
            })
        }


        // =====================================================
        // PAYMENT DEFERRED
        // =====================================================

        if (
            event.type ===
            'payment-intent.deferred'
        ) {
            console.log(
                '⏳ Pago pendiente de confirmación'
            )


            return res.json({
                received: true,
                processed: false
            })
        }


        // =====================================================
        // EVENTOS QUE NO UTILIZAMOS
        // =====================================================

        console.log(
            'ℹ️ Evento ONVO ignorado:',
            event.type
        )


        return res.json({
            received: true,
            processed: false
        })
    } catch (error) {
        console.error(
            '❌ Error procesando webhook ONVO:',
            error
        )


        return res
            .status(500)
            .json({
                message: 'Error procesando webhook'
            })
    }
}


module.exports = {

    handleOnvoWebhook
}