const Event = require('../models/Event')

exports.createOrder = async (req, res, next) => {
  try {
    const { eventId, items } = req.body

    if (!eventId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'eventId e items son requeridos'
      })
    }

    const event = await Event.findById(eventId)

    if (!event) {
      return res.status(404).json({
        message: 'Evento no encontrado'
      })
    }

    const summary = []

    for (const item of items) {
      const zoneCode = item.zoneCode || item.zone || item.type
      const quantity = Number(item.quantity || item.qty || 1)

      const zone = event.zones.find((zone) => zone.code === zoneCode)

      if (!zone) {
        return res.status(400).json({
          message: `La zona ${zoneCode} no existe en este evento`
        })
      }

      const available = zone.capacity - zone.sold

      if (quantity > available) {
        return res.status(400).json({
          message: `No hay suficientes entradas disponibles en ${zone.name}`
        })
      }

      zone.sold += quantity

      summary.push({
        zone: zone.name,
        code: zone.code,
        quantity,
        price: zone.price,
        subtotal: quantity * zone.price
      })
    }

    await event.save()

    const total = summary.reduce((sum, item) => sum + item.subtotal, 0)

    res.status(201).json({
      message: 'Orden creada correctamente',
      eventId: event._id,
      eventTitle: event.title,
      items: summary,
      total,
      event
    })
  } catch (error) {
    next(error)
  }
}