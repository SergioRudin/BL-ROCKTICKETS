const express = require('express')

const router = express.Router()

const {
    createOrder,
    getOrderTickets,
    getOrderStatus,
    getMyOrders
} = require('../controllers/orderController')

const {
    auth
} = require('../middleware/auth')


// =========================================================
// CREAR ORDEN
// =========================================================

router.post(
    '/',
    auth,
    createOrder
)


// =========================================================
// MIS ÓRDENES
// =========================================================

router.get(
    '/me',
    auth,
    getMyOrders
)


// =========================================================
// ESTADO DE ORDEN
// =========================================================

router.get(
    '/:orderId/status',
    auth,
    getOrderStatus
)


// =========================================================
// TICKETS DE UNA ORDEN
// =========================================================

router.get(
    '/:orderId/tickets',
    auth,
    getOrderTickets
)


module.exports = router