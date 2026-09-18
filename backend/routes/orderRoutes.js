const express =
    require('express');

const router =
    express.Router();


const {
    createOrder,
    getOrderTickets,
} = require(
    '../controllers/orderController'
);


const {
    optionalAuth,
} = require(
    '../middleware/auth'
);


router.post(
    '/',
    optionalAuth,
    createOrder
);


router.get(
    '/:orderId/tickets',
    getOrderTickets
);


module.exports =
    router;