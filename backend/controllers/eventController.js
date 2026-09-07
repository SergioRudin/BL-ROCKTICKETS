const slugify = require('slugify')
const Event = require('../models/Event')

function buildSlug(title) {
  return slugify(title, { lower: true, strict: true })
}

exports.getEvents = async (req, res, next) => {
  try {
    const { q, category, featured } = req.query

    const filters = { status: 'PUBLISHED' }

    if (category) filters.category = category
    if (featured === 'true') filters.featured = true

    if (q) {
      filters.$or = [
        { title: { $regex: q, $options: 'i' } },
        { artist: { $regex: q, $options: 'i' } },
        { venue: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } }
      ]
    }

    const events = await Event.find(filters).sort({ featured: -1, date: 1 })
    res.json({ count: events.length, events })
  } catch (error) {
    next(error)
  }
}

exports.getEventBySlug = async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug })

    if (!event) {
      return res.status(404).json({ message: 'Evento no encontrado' })
    }

    res.json(event)
  } catch (error) {
    next(error)
  }
}

exports.createEvent = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      slug: req.body.slug || buildSlug(req.body.title)
    }

    const event = await Event.create(payload)
    res.status(201).json(event)
  } catch (error) {
    next(error)
  }
}

exports.updateEvent = async (req, res, next) => {
  try {
    const payload = { ...req.body }

    if (payload.title && !payload.slug) {
      payload.slug = buildSlug(payload.title)
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true
      }
    )

    if (!event) {
      return res.status(404).json({ message: 'Evento no encontrado' })
    }

    res.json(event)
  } catch (error) {
    next(error)
  }
}

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id)

    if (!event) {
      return res.status(404).json({ message: 'Evento no encontrado' })
    }

    res.json({
      message: 'Evento eliminado correctamente',
      event
    })
  } catch (error) {
    next(error)
  }
}