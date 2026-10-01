const express = require('express')

const router = express.Router()

const {
    getDashboard
} = require('../controllers/dashboardController')

const {
    auth,
    requireRole
} = require('../middleware/auth')


router.get(
    '/',
    auth,
    requireRole('ADMIN'),
    getDashboard
)


module.exports = router