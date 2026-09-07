const Event = require('../models/Event')
const Ticket = require('../models/Ticket')

const generateTicketCode = () => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  const timestamp = Date.now().toString().slice(-6)

  return `TQ-${timestamp}-${random}`
}

const createTestTickets = async (req, res) => {
  try {
    const { eventId, buyerName, buyerEmail, zoneCode, quantity } = req.body

    if (!eventId || !buyerName || !buyerEmail || !zoneCode || !quantity) {
      return res.status(400).json({
        message: 'Todos los campos son obligatorios'
      })
    }

    const event = await Event.findById(eventId)

    if (!event) {
      return res.status(404).json({
        message: 'Evento no encontrado'
      })
    }

    const zone = event.zones.find(
      (item) => item.code.toUpperCase() === zoneCode.toUpperCase()
    )

    if (!zone) {
      return res.status(404).json({
        message: 'Zona no encontrada en este evento'
      })
    }

    const ticketQuantity = Number(quantity)
    const available = zone.capacity - zone.sold

    if (ticketQuantity <= 0) {
      return res.status(400).json({
        message: 'La cantidad debe ser mayor a 0'
      })
    }

    if (ticketQuantity > available) {
      return res.status(400).json({
        message: 'No hay suficientes entradas disponibles',
        available
      })
    }

    const orderId = `ORDER-${Date.now()}`

    const ticketsToCreate = Array.from(
      { length: ticketQuantity },
      () => ({
        event: event._id,
        orderId,
        buyerName,
        buyerEmail,
        ownerName: buyerName,
        ownerEmail: buyerEmail,
        transferHistory: [],
        zoneName: zone.name,
        zoneCode: zone.code,
        price: zone.price,
        ticketCode: generateTicketCode()
      })
    )

    const tickets = await Ticket.insertMany(ticketsToCreate)

    zone.sold = Number(zone.sold || 0) + ticketQuantity

    event.markModified('zones')
    await event.save()

    res.status(201).json({
      message: 'Tickets creados correctamente',
      orderId,
      count: tickets.length,
      tickets
    })
  } catch (error) {
    console.error('Error creating test tickets:', error)

    res.status(500).json({
      message: 'Error al crear tickets',
      error: error.message
    })
  }
}

const getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
  .populate('event', 'title slug artist venue city date image')
  .sort({ createdAt: -1 })
    res.json({
      count: tickets.length,
      tickets
    })
  } catch (error) {
    console.error('Error getting tickets:', error)

    res.status(500).json({
      message: 'Error al obtener tickets',
      error: error.message
    })
  }
}

const getTicketsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params

  const tickets = await Ticket.find({ orderId })
  .populate('event', 'title slug artist venue city date image')
  .sort({ createdAt: -1 })

    res.json({
      orderId,
      count: tickets.length,
      tickets
    })
  } catch (error) {
    console.error('Error getting tickets by order:', error)

    res.status(500).json({
      message: 'Error al obtener tickets por orden',
      error: error.message
    })
  }
}

const getTicketByCode = async (req, res) => {
  try {
    const { ticketCode } = req.params

const ticket = await Ticket.findOne({
  ticketCode: ticketCode.toUpperCase()
}).populate(
  'event',
  'title slug artist venue city date image'
)

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket no encontrado'
      })
    }

    res.json({
      ticket
    })
  } catch (error) {
    console.error('Error getting ticket by code:', error)

    res.status(500).json({
      message: 'Error al obtener ticket por código',
      error: error.message
    })
  }
}

const useTicketByCode = async (req, res) => {
  try {
    const { ticketCode } = req.params

    const ticket = await Ticket.findOne({
      ticketCode: ticketCode.toUpperCase()
    }).populate('event', 'title slug artist venue city date image')

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket no encontrado'
      })
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({
        message: 'Este ticket está cancelado',
        ticket
      })
    }

    if (ticket.status === 'USED' || ticket.usedAt) {
      return res.status(400).json({
        message: 'Este ticket ya fue utilizado',
        ticket
      })
    }

    ticket.status = 'USED'
    ticket.usedAt = new Date()

    await ticket.save()

    res.json({
      message: 'Ticket validado correctamente',
      ticket
    })
  } catch (error) {
    console.error('Error using ticket by code:', error)

    res.status(500).json({
      message: 'Error al validar ticket',
      error: error.message
    })
  }
}

const transferTicketByCode = async (req, res) => {
  try {
    const { ticketCode } = req.params
    const { newOwnerName, newOwnerEmail } = req.body

    if (!newOwnerName || !newOwnerEmail) {
      return res.status(400).json({
        message: 'Nombre y correo del nuevo titular son obligatorios'
      })
    }

    const ticket = await Ticket.findOne({
      ticketCode: ticketCode.toUpperCase()
    }).populate('event', 'title slug artist venue city date image')

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket no encontrado'
      })
    }

    if (ticket.status !== 'ACTIVE') {
      return res.status(400).json({
        message: 'Solo se pueden transferir tickets activos',
        ticket
      })
    }

    if (ticket.transferHistory && ticket.transferHistory.length > 0) {
  return res.status(400).json({
    message: 'Este ticket ya fue transferido anteriormente y no puede volver a transferirse',
    ticket
  })
}

    ticket.transferHistory.push({
      fromName: ticket.ownerName,
      fromEmail: ticket.ownerEmail,
      toName: newOwnerName,
      toEmail: newOwnerEmail,
      transferredAt: new Date()
    })

    ticket.ownerName = newOwnerName
    ticket.ownerEmail = newOwnerEmail

    await ticket.save()
    
    res.json({
      message: 'Ticket transferido correctamente',
      ticket
    })
  } catch (error) {
    console.error('Error transferring ticket:', error)

    res.status(500).json({
      message: 'Error al transferir ticket',
      error: error.message
    })

  }
}

module.exports = {
  createTestTickets,
  getTickets,
  getTicketsByOrder,
  getTicketByCode,
  useTicketByCode,
  transferTicketByCode
}