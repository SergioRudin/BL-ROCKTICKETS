const express = require('express')

const router = express.Router()

const {
    register,
    login,
    me,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/authController')

const {
    auth
} = require('../middleware/auth')


router.post(
    '/register',
    register
)

router.post(
    '/login',
    login
)

router.post(
    '/forgot-password',
    forgotPassword
)

router.post(
    '/reset-password',
    resetPassword
)

router.get(
    '/me',
    auth,
    me
)

router.put(
    '/me',
    auth,
    updateProfile
)

router.put(
    '/change-password',
    auth,
    changePassword
)


module.exports = router