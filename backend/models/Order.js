const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema(
  {
    buyerName: String,
    buyerEmail: String,
    items: [
      {
        eventId: String,
        eventTitle: String,
        seatKey: String,
        zone: String,
        price: Number,
        ticketId: String
      }
    ],
    total: Number
  },
  { timestamps: true }
)

module.exports = mongoose.model('Order', orderSchema)
