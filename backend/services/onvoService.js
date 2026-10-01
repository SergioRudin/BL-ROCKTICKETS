const axios = require('axios')

const ONVO_API_URL =
    process.env.ONVO_API_URL ||
    'https://api.onvopay.com'


async function createCheckoutSession({
    orderId,
    buyerEmail,
    lineItems
}) {
    try {
        const response =
            await axios.post(
                `${ONVO_API_URL}/v1/checkout/sessions/one-time-link`, {
                    lineItems,

                    customerEmail: buyerEmail,

                    redirectUrl: `${process.env.FRONTEND_URL}/payment-success?orderId=${orderId}`,

                    cancelUrl: `${process.env.FRONTEND_URL}/checkout?payment=cancelled`,

                    metadata: {
                        orderId
                    }
                }, {
                    headers: {
                        Authorization: `Bearer ${process.env.ONVO_SECRET_KEY}`,

                        'Content-Type': 'application/json'
                    }
                }
            )

        return response.data
    } catch (error) {
        console.error(
            'Error creando Checkout ONVO:'
        )

        if (
            error.response &&
            error.response.data
        ) {
            console.error(
                error.response.data
            )
        } else {
            console.error(
                error.message
            )
        }

        throw new Error(
            'No se pudo crear la sesión de pago con ONVO'
        )
    }
}


module.exports = {
    createCheckoutSession
}