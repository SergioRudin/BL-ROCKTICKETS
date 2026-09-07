const router = require('express').Router()
const { summary } = require('../controllers/dashboardController')

router.get('/summary', summary)

module.exports = router
