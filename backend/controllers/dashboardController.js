const Event = require('../models/Event')

exports.summary = async (_req, res) => {
  const events = await Event.find()
  const ticketsSold = events.reduce((sum, event) => sum + (event.sales || 0), 0)
  const revenue = events.reduce((sum, event) => sum + (event.sales || 0) * (event.priceGeneral || 0), 0)

  res.json({
    ticketsSold,
    revenue,
    activeEvents: events.length,
    events
  })
}
