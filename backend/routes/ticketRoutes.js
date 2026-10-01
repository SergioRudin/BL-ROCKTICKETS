const express = require('express')

const router = express.Router()

const {
    getTickets,
    getTicketsByOrder,
    getTicketByCode,
    markTicketUsed,
    transferTicket,
    createTestTickets,
    getMyTickets
} = require('../controllers/ticketController')

const {
    auth,
    optionalAuth,
    requireRole
} = require('../middleware/auth')


/*
  Todos los tickets
*/

router.get(
    '/',
    auth,
    requireRole('ADMIN'),
    getTickets
)

/*
  Crear tickets de prueba
*/

router.post(
    '/test',
    optionalAuth,
    createTestTickets
)


/*
  Mis tickets
*/

router.get(
    '/me',
    auth,
    getMyTickets
)


/*
  Buscar tickets por orderId
*/

router.get(
    '/order/:orderId',
    getTicketsByOrder
)


/*
  Buscar ticket por código QR
*/

router.get(
    '/code/:ticketCode',
    getTicketByCode
)


/*
  Validar ingreso.

  Solo STAFF y ADMIN pueden marcar
  un ticket como USED.
*/

router.put(
    '/:id/use',
    auth,
    requireRole('STAFF', 'ADMIN'),
    markTicketUsed
)


/*
  Transferir ticket
*/

router.put(
    '/:id/transfer',
    auth,
    transferTicket
)


module.exports = router