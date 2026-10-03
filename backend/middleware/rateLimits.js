const {
    rateLimit
} = require('express-rate-limit')


// =========================================================
// LOGIN / REGISTER
// =========================================================

const authLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 20,

        standardHeaders: 'draft-8',

        legacyHeaders: false,

        message: {
            message: 'Demasiados intentos. Intenta nuevamente en unos minutos.'
        }
    })


// =========================================================
// RECUPERACIÓN DE CONTRASEÑA
// =========================================================

const passwordResetLimiter =
    rateLimit({
        windowMs: 30 * 60 * 1000,

        limit: 10,

        standardHeaders: 'draft-8',

        legacyHeaders: false,

        message: {
            message: 'Demasiadas solicitudes de recuperación. Intenta nuevamente más tarde.'
        }
    })


// =========================================================
// ENDPOINTS GENERALES DE API
// =========================================================

const apiLimiter =
    rateLimit({
        windowMs: 60 * 1000,

        limit: 300,

        standardHeaders: 'draft-8',

        legacyHeaders: false,

        message: {
            message: 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.'
        }
    })


module.exports = {
    authLimiter,
    passwordResetLimiter,
    apiLimiter
}