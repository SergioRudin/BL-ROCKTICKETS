const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  try {
    let token

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        message: 'No autorizado, token no encontrado'
      })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'rocktickets_secret_dev'
    )

    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({
        message: 'No autorizado, usuario no encontrado'
      })
    }

    req.user = user

    next()
  } catch (error) {
    return res.status(401).json({
      message: 'No autorizado, token inválido'
    })
  }
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'No tienes permisos para realizar esta acción'
      })
    }

    next()
  }
}

module.exports = {
  protect,
  authorizeRoles
}