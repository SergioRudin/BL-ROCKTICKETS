const mongoose = require('mongoose')

async function connectDB() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('Falta MONGODB_URI en el archivo .env')
  }

  const connection = await mongoose.connect(uri)
  console.log(`MongoDB conectado: ${connection.connection.name}`)
}

module.exports = connectDB
