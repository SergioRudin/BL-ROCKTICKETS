const express =
    require('express')

const router =
    express.Router()

const {
    testOnvo,
    handleOnvoWebhook
} = require(
    '../controllers/paymentController'
)


router.get(
    '/onvo/test',
    testOnvo
)


router.post(
    '/onvo/webhook',
    handleOnvoWebhook
)


module.exports =
    router