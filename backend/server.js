require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const eventRoutes = require('./routes/eventRoutes')
const orderRoutes = require('./routes/orderRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const errorHandler = require('./middleware/errorHandler')
const ticketRoutes = require('./routes/ticketRoutes')
const app = express()
const PORT = process.env.PORT || 5000
const authRoutes = require('./routes/authRoutes')


app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'RockTickets API', version: '1.0.0' })
})

app.use('/api/events', eventRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/auth', authRoutes)

app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.originalUrl}` })
})

app.use(errorHandler)

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`))
  })
  .catch((error) => {
    console.error('Error conectando a MongoDB:', error.message)
    process.exit(1)
  })
