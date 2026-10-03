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

const {
    authLimiter,
    passwordResetLimiter
} = require('../middleware/rateLimits')


// =========================================================
// AUTH
// =========================================================

router.post(
    '/register',
    authLimiter,
    register
)

router.post(
    '/login',
    authLimiter,
    login
)


// =========================================================
// PASSWORD RESET
// =========================================================

router.post(
    '/forgot-password',
    passwordResetLimiter,
    forgotPassword
)

router.post(
    '/reset-password',
    passwordResetLimiter,
    resetPassword
)


// =========================================================
// ACCOUNT
// =========================================================

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