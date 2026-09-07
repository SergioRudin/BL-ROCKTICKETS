require('dotenv').config()
const connectDB = require('../config/db')
const Event = require('../models/Event')

const events = [
  {
    title: 'Metal Night Costa Rica',
    slug: 'metal-night-costa-rica',
    artist: 'Kraken Ritual',
    venue: 'Pepper Club',
    city: 'San José',
    date: new Date('2026-09-12T20:00:00-06:00'),
    doorsOpenAt: new Date('2026-09-12T18:30:00-06:00'),
    category: 'Concierto',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a',
    description: 'Una noche de rock pesado, luces rojas, guitarras afiladas y energía total.',
    featured: true,
    zones: [
      { name: 'General', code: 'GENERAL', price: 18000, capacity: 300, sold: 0 },
      { name: 'VIP', code: 'VIP', price: 32000, capacity: 80, sold: 0 }
    ]
  },
  {
    title: 'Rock Legends Festival',
    slug: 'rock-legends-festival',
    artist: 'Various Artists',
    venue: 'Parque Viva',
    city: 'Alajuela',
    date: new Date('2026-10-25T16:00:00-06:00'),
    doorsOpenAt: new Date('2026-10-25T14:00:00-06:00'),
    category: 'Festival',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
    description: 'Festival de rock con varias bandas, zona general, VIP y experiencia premium.',
    featured: true,
    zones: [
      { name: 'General', code: 'GENERAL', price: 25000, capacity: 1200, sold: 0 },
      { name: 'VIP', code: 'VIP', price: 55000, capacity: 250, sold: 0 }
    ]
  }
]

async function seedEvents() {
  try {
    await connectDB()
    await Event.deleteMany()
    await Event.insertMany(events)
    console.log('Eventos demo creados correctamente')
    process.exit(0)
  } catch (error) {
    console.error('Error cargando eventos demo:', error.message)
    process.exit(1)
  }
}

seedEvents()
