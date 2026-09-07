const router = require('express').Router()
const {
  getEvents,
  getEventBySlug,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController')

router.get('/', getEvents)
router.get('/:slug', getEventBySlug)
router.post('/', createEvent)
router.put('/:id', updateEvent)
router.delete('/:id', deleteEvent)

module.exports = router