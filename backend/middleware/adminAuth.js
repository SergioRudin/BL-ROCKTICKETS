module.exports = function adminAuth(req, res, next) {
  const token = req.header('x-admin-token')
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ message: 'No autorizado' })
  }
  next()
}
