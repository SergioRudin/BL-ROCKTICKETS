const mongoose = require('mongoose')

const zoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 0 },
    sold: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
)

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    artist: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, default: 'Costa Rica', trim: true },
    date: { type: Date, required: true },
    doorsOpenAt: { type: Date },
    category: { type: String, default: 'Concierto', trim: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'CANCELLED'],
      default: 'PUBLISHED'
    },
    featured: { type: Boolean, default: false },
    zones: { type: [zoneSchema], default: [] }
  },
  { timestamps: true }
)

eventSchema.virtual('totalCapacity').get(function () {
  return (this.zones || []).reduce((sum, zone) => {
    return sum + Number(zone.capacity || 0)
  }, 0)
})

eventSchema.virtual('totalSold').get(function () {
  return (this.zones || []).reduce((sum, zone) => {
    return sum + Number(zone.sold || 0)
  }, 0)
})

eventSchema.virtual('availableTickets').get(function () {
  return this.totalCapacity - this.totalSold
})

module.exports = mongoose.model('Event', eventSchema)
