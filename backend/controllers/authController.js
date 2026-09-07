const jwt = require('jsonwebtoken')
const User = require('../models/User')

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'rocktickets_secret_dev',
    { expiresIn: '7d' }
  )
}

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Nombre, correo y contraseña son obligatorios'
      })
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(400).json({
        message: 'Ya existe una cuenta con este correo'
      })
    }

    const user = await User.create({
      name,
      email,
      password
    })

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: generateToken(user._id)
    })
  } catch (error) {
    console.error('Error registering user:', error)

    res.status(500).json({
      message: 'Error al registrar usuario',
      error: error.message
    })
  }
}

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Correo y contraseña son obligatorios'
      })
    }

    const user = await User.findOne({ email })

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        message: 'Credenciales inválidas'
      })
    }

    res.json({
      message: 'Inicio de sesión correcto',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: generateToken(user._id)
    })
  } catch (error) {
    console.error('Error logging in:', error)

    res.status(500).json({
      message: 'Error al iniciar sesión',
      error: error.message
    })
  }
}

const getMe = async (req, res) => {
  res.json({
    user: req.user
  })
}

module.exports = {
  registerUser,
  loginUser,
  getMe
}