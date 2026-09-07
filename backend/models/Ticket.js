const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },

    orderId: {
      type: String,
      required: true,
      index: true
    },

    buyerName: {
      type: String,
      required: true,
      trim: true
    },

        buyerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    ownerName: {
      type: String,
      required: true,
      trim: true
    },

    ownerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    transferHistory: [
      {
        fromName: {
          type: String,
          required: true,
          trim: true
        },
        fromEmail: {
          type: String,
          required: true,
          trim: true,
          lowercase: true
        },
        toName: {
          type: String,
          required: true,
          trim: true
        },
        toEmail: {
          type: String,
          required: true,
          trim: true,
          lowercase: true
        },
        transferredAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    zoneName: {
      type: String,
      required: true,
      trim: true
    },

    zoneCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    price: {
      type: Number,
      required: true
    },

    ticketCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'USED', 'CANCELLED'],
      default: 'ACTIVE'
    },

    usedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Ticket', ticketSchema)