require('dotenv').config()
const {
    expireOldPendingOrders
} = require('./services/orderCleanupService')
const express =
    require('express')
const {
    apiLimiter
} = require('./middleware/rateLimits')
const cors =
    require('cors')

const {
    testConnection
} = require('./config/db')

const paymentRoutes =
    require('./routes/paymentRoutes')

const eventRoutes =
    require('./routes/eventRoutes')

const orderRoutes =
    require('./routes/orderRoutes')

const ticketRoutes =
    require('./routes/ticketRoutes')

const dashboardRoutes =
    require('./routes/dashboardRoutes')

const authRoutes =
    require('./routes/authRoutes')

const {
    auth
} = require('./middleware/auth')

const {
    getMyTickets
} = require('./controllers/ticketController')

const helmet = require('helmet')
const app =
    express()

app.disable(
    'x-powered-by'
)

app.use(
        helmet()
    )
    // =========================================================
    // CORS
    // =========================================================

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.SCANNER_URL,
    process.env.SCANNER_LOCAL_URL
].filter(Boolean)

app.use(
    '/api',
    apiLimiter
)
app.use(
    cors({
        origin: function(
            origin,
            callback
        ) {
            /*
              Permite requests sin origin, por ejemplo:
              Thunder Client, Postman, servidor-servidor.
            */

            if (!origin) {
                return callback(
                    null,
                    true
                )
            }


            if (
                allowedOrigins.includes(
                    origin
                )
            ) {
                return callback(
                    null,
                    true
                )
            }


            console.warn(
                `⚠️ Origen bloqueado por CORS: ${origin}`
            )


            return callback(
                new Error(
                    'Origen no permitido por CORS'
                )
            )
        },

        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS'
        ],

        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Webhook-Secret'
        ]
    })
)


// =========================================================
// BODY PARSERS
// =========================================================

app.use(
    express.json({
        limit: '1mb'
    })
)

app.use(
    express.urlencoded({
        extended: true,
        limit: '1mb'
    })
)


// =========================================================
// HEALTH
// =========================================================

app.get(
    '/api/health',
    (req, res) => {
        return res.json({
            ok: true,
            database: 'MySQL',
            project: 'RockTickets'
        })
    }
)


// =========================================================
// ROUTES
// =========================================================

app.use(
    '/api/auth',
    authRoutes
)

app.use(
    '/api/events',
    eventRoutes
)

app.use(
    '/api/orders',
    orderRoutes
)

app.use(
    '/api/tickets',
    ticketRoutes
)

app.use(
    '/api/dashboard',
    dashboardRoutes
)

app.use(
    '/api/payments',
    paymentRoutes
)


// =========================================================
// COMPATIBILIDAD /api/me/tickets
// =========================================================

app.get(
    '/api/me/tickets',
    auth,
    getMyTickets
)


// =========================================================
// 404
// =========================================================

app.use(
    (req, res) => {
        return res
            .status(404)
            .json({
                message: 'Ruta no encontrada'
            })
    }
)


// =========================================================
// ERROR HANDLER GENERAL
// =========================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            '❌ Error del servidor:',
            error
        )


        return res
            .status(500)
            .json({
                message: error.message ||
                    'Error interno del servidor'
            })
    }
)


// =========================================================
// SERVER
// =========================================================

const PORT =
    process.env.PORT ||
    5000


async function startServer() {
    try {
        await testConnection()
        await expireOldPendingOrders()

        app.listen(
            PORT,
            () => {
                console.log(
                    `🚀 RockTickets API corriendo en http://localhost:${PORT}`
                )

                console.log(
                    '🗄️ Base de datos: MySQL'
                )

                console.log(
                    '🌐 Orígenes permitidos por CORS:'
                )

                allowedOrigins.forEach(
                    (origin) => {
                        console.log(
                            `   - ${origin}`
                        )
                    }
                )
            }
        )
    } catch (error) {
        console.error(
            '❌ No se pudo iniciar RockTickets:',
            error
        )

        process.exit(1)
    }
}


startServer()