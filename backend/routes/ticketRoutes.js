const express = require('express')
const router = express.Router()

const {
  createTestTickets,
  getTickets,
  getTicketsByOrder,
  getTicketByCode,
  useTicketByCode,
  transferTicketByCode
} = require('../controllers/ticketController')

router.get('/', getTickets)
router.get('/order/:orderId', getTicketsByOrder)
router.get('/code/:ticketCode', getTicketByCode)
router.patch('/code/:ticketCode/use', useTicketByCode)
router.post('/test', createTestTickets)
router.patch('/code/:ticketCode/transfer', transferTicketByCode)

module.exports = router