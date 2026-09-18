const express =
    require('express');

const router =
    express.Router();

const {
    getTickets,
    getTicketsByOrder,
    getTicketByCode,
    markTicketUsed,
    transferTicket,
    createTestTickets,
    getMyTickets,
} = require('../controllers/ticketController');

const {
    auth,
    optionalAuth,
} = require('../middleware/auth');


router.get(
    '/',
    getTickets
);


router.post(
    '/test',
    optionalAuth,
    createTestTickets
);


/*
  Mis tickets
*/

router.get(
    '/me',
    auth,
    getMyTickets
);


/*
  Buscar por orderId
*/

router.get(
    '/order/:orderId',
    getTicketsByOrder
);


/*
  Este endpoint lo utiliza el scanner QR.
*/

router.get(
    '/code/:ticketCode',
    getTicketByCode
);


/*
  Marcar USED
*/

router.put(
    '/:id/use',
    optionalAuth,
    markTicketUsed
);


/*
  Transferir
*/

router.put(
    '/:id/transfer',
    optionalAuth,
    transferTicket
);


module.exports =
    router;