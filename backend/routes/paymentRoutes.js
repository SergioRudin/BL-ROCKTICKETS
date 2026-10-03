const express =
    require('express')

const router =
    express.Router()

const {
    handleOnvoWebhook
} = require(
    '../controllers/paymentController'
)


router.post(
    '/onvo/webhook',
    handleOnvoWebhook
)


module.exports =
    router