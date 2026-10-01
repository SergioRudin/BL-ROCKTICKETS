const {
    createCheckoutSession
} = require('../services/onvoService')

const {
    fulfillPaidOrder
} = require('./orderController')


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
// WEBHOOK ONVO
// =========================================================

async function handleOnvoWebhook(
    req,
    res
) {
    try {
        const receivedSecret =
            String(
                req.headers['x-webhook-secret'] || ''
            ).trim()

        const expectedSecret =
            String(
                process.env.ONVO_WEBHOOK_SECRET || ''
            ).trim()
        console.log(
            'Webhook secret cargado:',
            Boolean(expectedSecret)
        )

        console.log(
            'Longitud secret .env:',
            expectedSecret.length
        )

        console.log(
            'Longitud secret recibido:',
            receivedSecret.length
        )

        console.log(
            'Secrets coinciden:',
            receivedSecret === expectedSecret
        )

        if (!expectedSecret ||
            !receivedSecret ||
            receivedSecret !==
            expectedSecret
        ) {
            console.warn(
                '⚠️ Webhook ONVO rechazado por secret inválido'
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
                    message: 'Payload de webhook inválido'
                })
        }


        console.log(
            '📩 Webhook ONVO recibido:',
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
                    'ℹ️ Checkout completado pero no pagado'
                )

                return res
                    .status(200)
                    .json({
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
                    '❌ Webhook sin metadata.orderId'
                )

                return res
                    .status(400)
                    .json({
                        message: 'Webhook sin orderId'
                    })
            }


            console.log(
                '💳 Pago confirmado para:',
                orderId
            )


            const result =
                await fulfillPaidOrder({
                    orderId,

                    paymentId: session.paymentIntentId ||
                        null,

                    checkoutSessionId: session.id ||
                        null
                })


            console.log(
                result.alreadyProcessed ?
                `ℹ️ Orden ${orderId} ya había sido procesada` :
                `✅ Orden ${orderId} procesada correctamente`
            )


            return res
                .status(200)
                .json({
                    received: true,
                    processed: true,
                    alreadyProcessed: result.alreadyProcessed
                })
        }


        // =====================================================
        // OTROS EVENTOS
        // =====================================================

        console.log(
            'ℹ️ Evento ONVO ignorado:',
            event.type
        )


        return res
            .status(200)
            .json({
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
    testOnvo,
    handleOnvoWebhook
}