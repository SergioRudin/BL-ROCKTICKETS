const express =
    require('express');

const router =
    express.Router();

const {
    getEvents,
    getEventBySlug,
    getEventZones,
    createEvent,
    updateEvent,
    deleteEvent,
} = require('../controllers/eventController');


router.get(
    '/',
    getEvents
);


/*
  IMPORTANTE:
  esta debe ir antes de /:slug
*/

router.get(
    '/:id/zones',
    getEventZones
);


router.post(
    '/',
    createEvent
);


router.put(
    '/:id',
    updateEvent
);


router.delete(
    '/:id',
    deleteEvent
);


router.get(
    '/:slug',
    getEventBySlug
);


module.exports =
    router;