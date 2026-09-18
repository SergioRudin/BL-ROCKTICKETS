require('dotenv').config();

const express =
    require('express');

const cors =
    require('cors');

const {
    testConnection,
} = require('./config/db');


const eventRoutes =
    require('./routes/eventRoutes');

const orderRoutes =
    require('./routes/orderRoutes');

const ticketRoutes =
    require('./routes/ticketRoutes');

const dashboardRoutes =
    require('./routes/dashboardRoutes');

const authRoutes =
    require('./routes/authRoutes');


const {
    auth,
} = require('./middleware/auth');

const {
    getMyTickets,
} = require('./controllers/ticketController');


const app =
    express();


app.use(
    cors({
        origin: process.env.FRONTEND_URL ||
            'http://localhost:5173',

        credentials: true,
    })
);


app.use(
    express.json()
);


app.use(
    express.urlencoded({
        extended: true,
    })
);


/*
==========================================================
HEALTH
==========================================================
*/

app.get(
    '/api/health',
    (req, res) => {
        res.json({
            ok: true,

            database: 'MySQL',

            project: 'RockTickets',
        });
    }
);


/*
==========================================================
ROUTES
==========================================================
*/

app.use(
    '/api/auth',
    authRoutes
);


app.use(
    '/api/events',
    eventRoutes
);


app.use(
    '/api/orders',
    orderRoutes
);


app.use(
    '/api/tickets',
    ticketRoutes
);


app.use(
    '/api/dashboard',
    dashboardRoutes
);


/*
==========================================================
COMPATIBILIDAD /api/me/tickets
==========================================================
*/

app.get(
    '/api/me/tickets',
    auth,
    getMyTickets
);


/*
==========================================================
404
==========================================================
*/

app.use(
    (req, res) => {
        res.status(404).json({
            message: 'Ruta no encontrada',
        });
    }
);


/*
==========================================================
SERVER
==========================================================
*/

const PORT =
    process.env.PORT ||
    5000;


async function startServer() {
    await testConnection();

    app.listen(
        PORT,
        () => {
            console.log(
                `🚀 RockTickets API corriendo en http://localhost:${PORT}`
            );

            console.log(
                `🗄️ Base de datos: MySQL`
            );
        }
    );
}


startServer();