const express = require('express')

const router = express.Router()

const {
    getEvents,
    getEventBySlug,
    getEventZones,
    createEvent,
    updateEvent,
    deleteEvent
} = require('../controllers/eventController')

const {
    auth,
    requireRole
} = require('../middleware/auth')


/*
  Listar eventos
  Público
*/

router.get(
    '/',
    getEvents
)


/*
  Zonas del evento
  Público

  IMPORTANTE:
  esta ruta debe ir antes de /:slug
*/

router.get(
    '/:id/zones',
    getEventZones
)


/*
  Crear evento
  Solo ADMIN
*/

router.post(
    '/',
    auth,
    requireRole('ADMIN'),
    createEvent
)


/*
  Editar evento
  Solo ADMIN
*/

router.put(
    '/:id',
    auth,
    requireRole('ADMIN'),
    updateEvent
)


/*
  Eliminar evento
  Solo ADMIN
*/

router.delete(
    '/:id',
    auth,
    requireRole('ADMIN'),
    deleteEvent
)


/*
  Buscar evento por slug
  Público

  Debe mantenerse al final
*/

router.get(
    '/:slug',
    getEventBySlug
)


module.exports = router