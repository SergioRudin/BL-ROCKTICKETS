function errorHandler(error, _req, res, _next) {
  console.error(error)

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: Object.values(error.errors).map((item) => item.message)
    })
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'Ya existe un registro con esos datos' })
  }

  res.status(500).json({ message: 'Error interno del servidor' })
}

module.exports = errorHandler
