const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { pool } = require('../config/db');


function createToken(user) {
    return jwt.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET, {
            expiresIn: '7d',
        }
    );
}


async function register(req, res) {
    try {
        const {
            name,
            email,
            phone,
            password,
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Nombre, email y contraseña son requeridos',
            });
        }

        const normalizedEmail = email
            .trim()
            .toLowerCase();

        const [existing] = await pool.execute(
            `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `, [normalizedEmail]
        );

        if (existing.length) {
            return res.status(409).json({
                message: 'Ya existe una cuenta con este correo',
            });
        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        const [result] = await pool.execute(
            `
      INSERT INTO users (
        name,
        email,
        phone,
        password
      )
      VALUES (?, ?, ?, ?)
      `, [
                name.trim(),
                normalizedEmail,
                phone || null,
                passwordHash,
            ]
        );

        const user = {
            id: result.insertId,
            name: name.trim(),
            email: normalizedEmail,
            phone: phone || null,
            role: 'USER',
            avatar: null,
        };

        const token = createToken(user);

        res.status(201).json({
            token,
            user,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error registrando usuario',
        });
    }
}


async function login(req, res) {
    try {
        const {
            email,
            password,
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email y contraseña son requeridos',
            });
        }

        const [users] = await pool.execute(
            `
      SELECT *
      FROM users
      WHERE email = ?
      LIMIT 1
      `, [
                email
                .trim()
                .toLowerCase(),
            ]
        );

        if (!users.length) {
            return res.status(401).json({
                message: 'Correo o contraseña incorrectos',
            });
        }

        const user = users[0];

        const valid = await bcrypt.compare(
            password,
            user.password
        );

        if (!valid) {
            return res.status(401).json({
                message: 'Correo o contraseña incorrectos',
            });
        }

        const token = createToken(user);

        res.json({
            token,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error iniciando sesión',
        });
    }
}


async function me(req, res) {
    res.json({
        user: req.user,
    });
}


async function updateProfile(req, res) {
    try {
        const {
            name,
            phone,
            avatar,
        } = req.body;

        await pool.execute(
            `
      UPDATE users
      SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        avatar = COALESCE(?, avatar)
      WHERE id = ?
      `, [
                name || null,
                phone || null,
                avatar || null,
                req.user.id,
            ]
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
      `, [req.user.id]
        );

        res.json({
            user: users[0],
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error actualizando perfil',
        });
    }
}


async function changePassword(req, res) {
    try {
        const {
            currentPassword,
            newPassword,
        } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: 'Debes indicar ambas contraseñas',
            });
        }

        const [users] = await pool.execute(
            `
      SELECT password
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [req.user.id]
        );

        const valid = await bcrypt.compare(
            currentPassword,
            users[0].password
        );

        if (!valid) {
            return res.status(400).json({
                message: 'La contraseña actual es incorrecta',
            });
        }

        const newHash = await bcrypt.hash(
            newPassword,
            12
        );

        await pool.execute(
            `
      UPDATE users
      SET password = ?
      WHERE id = ?
      `, [
                newHash,
                req.user.id,
            ]
        );

        res.json({
            message: 'Contraseña actualizada correctamente',
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error cambiando contraseña',
        });
    }
}


module.exports = {
    register,
    login,
    me,
    updateProfile,
    changePassword,
};