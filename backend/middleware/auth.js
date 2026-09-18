const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');


async function auth(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'No autorizado',
            });
        }

        const token = header.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const [users] = await pool.execute(
            `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        avatar
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [decoded.id]
        );

        if (!users.length) {
            return res.status(401).json({
                message: 'Usuario no encontrado',
            });
        }

        req.user = users[0];

        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Token inválido o expirado',
        });
    }
}


async function optionalAuth(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith('Bearer ')) {
            req.user = null;

            return next();
        }

        const token = header.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const [users] = await pool.execute(
            `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        avatar
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [decoded.id]
        );

        req.user = users[0] || null;

        next();
    } catch (error) {
        req.user = null;

        next();
    }
}


function requireRole(...roles) {
    return function(req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                message: 'No autorizado',
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'No tienes permisos para realizar esta acción',
            });
        }

        next();
    };
}


module.exports = {
    auth,
    optionalAuth,
    requireRole,
};