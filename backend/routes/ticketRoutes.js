const express = require('express')

const router = express.Router()

const {
    getTickets,
    getTicketByCode,
    markTicketUsed,
    transferTicket,
    getMyTickets
} = require('../controllers/ticketController')

const {
    auth,
    requireRole
} = require('../middleware/auth')


// =========================================================
// TODOS LOS TICKETS
// SOLO ADMIN
// =========================================================

router.get(
    '/',
    auth,
    requireRole('ADMIN'),
    getTickets
)


// =========================================================
// MIS TICKETS
// =========================================================

router.get(
    '/me',
    auth,
    getMyTickets
)


// =========================================================
// BUSCAR TICKET POR QR / CÓDIGO
// SOLO STAFF Y ADMIN
// =========================================================

router.get(
    '/code/:ticketCode',
    auth,
    requireRole(
        'STAFF',
        'ADMIN'
    ),
    getTicketByCode
)


// =========================================================
// VALIDAR / USAR TICKET
// SOLO STAFF Y ADMIN
// =========================================================

router.put(
    '/:id/use',
    auth,
    requireRole(
        'STAFF',
        'ADMIN'
    ),
    markTicketUsed
)


// =========================================================
// TRANSFERIR TICKET
// =========================================================

router.put(
    '/:id/transfer',
    auth,
    transferTicket
)


module.exports = router