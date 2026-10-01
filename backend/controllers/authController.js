const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const { pool } = require('../config/db')
const { sendEmail } = require('../utils/mailer')

async function forgotPassword(req, res) {
    try {
        const email =
            String(req.body.email || '')
            .trim()
            .toLowerCase()

        if (!email) {
            return res.status(400).json({
                message: 'El correo es obligatorio'
            })
        }

        const genericMessage =
            'Si existe una cuenta asociada a ese correo, te enviaremos instrucciones para recuperar tu contraseña.'


        const [users] =
        await pool.execute(
            `
        SELECT id, name, email
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
        `, [email]
        )


        if (!users.length) {
            return res.json({
                message: genericMessage
            })
        }


        const user =
            users[0]


        const resetToken =
            crypto
            .randomBytes(32)
            .toString('hex')


        const tokenHash =
            crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex')


        /*
          Invalidamos tokens anteriores
          que todavía estén activos.
        */

        await pool.execute(
            `
      UPDATE password_reset_tokens
      SET usedAt = NOW()
      WHERE userId = ?
        AND usedAt IS NULL
      `, [user.id]
        )


        await pool.execute(
            `
      INSERT INTO password_reset_tokens (
        userId,
        tokenHash,
        expiresAt
      )
      VALUES (
        ?,
        ?,
        DATE_ADD(NOW(), INTERVAL 30 MINUTE)
      )
      `, [
                user.id,
                tokenHash
            ]
        )


        const resetUrl =
            `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`


        const html = `
      <div
        style="
          font-family: Arial, sans-serif;
          background: #070707;
          color: #ffffff;
          padding: 32px;
        "
      >
        <div
          style="
            max-width: 560px;
            margin: 0 auto;
            background: #121212;
            border: 1px solid #2c2c2c;
            border-radius: 18px;
            padding: 32px;
          "
        >
          <div
            style="
              font-size: 28px;
              font-weight: 800;
              color: #ff2b2b;
              margin-bottom: 18px;
            "
          >
            RockTickets
          </div>

          <h2
            style="
              margin: 0 0 16px;
              color: #ffffff;
            "
          >
            Recuperar contraseña
          </h2>

          <p
            style="
              color: #c8c8c8;
              line-height: 1.6;
            "
          >
            Hola ${user.name || 'usuario'},
          </p>

          <p
            style="
              color: #c8c8c8;
              line-height: 1.6;
            "
          >
            Recibimos una solicitud para cambiar la contraseña
            de tu cuenta de RockTickets.
          </p>

          <p
            style="
              color: #c8c8c8;
              line-height: 1.6;
            "
          >
            Este enlace estará disponible durante 30 minutos.
          </p>

          <div
            style="
              margin: 28px 0;
              text-align: center;
            "
          >
            <a
              href="${resetUrl}"
              style="
                display: inline-block;
                padding: 14px 22px;
                background: #ef4444;
                color: #ffffff;
                border-radius: 12px;
                text-decoration: none;
                font-weight: 700;
              "
            >
              Cambiar contraseña
            </a>
          </div>

          <p
            style="
              color: #8f8f8f;
              font-size: 13px;
              line-height: 1.6;
            "
          >
            Si no solicitaste este cambio, podés ignorar este correo.
          </p>

          <p
            style="
              color: #666666;
              font-size: 12px;
              margin-top: 24px;
            "
          >
            RockTickets · Ticketera para shows extremos
          </p>
        </div>
      </div>
    `


        await sendEmail({
            to: user.email,
            subject: 'Recuperá tu contraseña de RockTickets',
            html
        })


        return res.json({
            message: genericMessage
        })
    } catch (error) {
        console.error(
            'Error en forgotPassword:',
            error
        )

        return res.status(500).json({
            message: 'No se pudo procesar la recuperación de contraseña'
        })
    }
}


async function resetPassword(req, res) {
    const connection =
        await pool.getConnection()

    try {
        const token =
            String(req.body.token || '')
            .trim()

        const newPassword =
            String(req.body.newPassword || '')


        if (!token || !newPassword) {
            return res.status(400).json({
                message: 'Token y nueva contraseña son obligatorios'
            })
        }


        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 6 caracteres'
            })
        }


        const tokenHash =
            crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')


        await connection.beginTransaction()


        const [tokens] =
        await connection.execute(
            `
        SELECT
          prt.id,
          prt.userId,
          prt.expiresAt,
          prt.usedAt
        FROM password_reset_tokens prt
        WHERE prt.tokenHash = ?
        LIMIT 1
        FOR UPDATE
        `, [tokenHash]
        )


        if (!tokens.length) {
            await connection.rollback()

            return res.status(400).json({
                message: 'El enlace de recuperación no es válido'
            })
        }


        const resetRecord =
            tokens[0]


        if (resetRecord.usedAt) {
            await connection.rollback()

            return res.status(400).json({
                message: 'Este enlace de recuperación ya fue utilizado'
            })
        }


        const expiresAt =
            new Date(
                resetRecord.expiresAt
            )


        if (
            expiresAt.getTime() <
            Date.now()
        ) {
            await connection.rollback()

            return res.status(400).json({
                message: 'El enlace de recuperación ha expirado'
            })
        }


        const passwordHash =
            await bcrypt.hash(
                newPassword,
                12
            )


        await connection.execute(
            `
      UPDATE users
      SET
        password = ?,
        updatedAt = NOW()
      WHERE id = ?
      `, [
                passwordHash,
                resetRecord.userId
            ]
        )


        await connection.execute(
            `
      UPDATE password_reset_tokens
      SET usedAt = NOW()
      WHERE id = ?
      `, [
                resetRecord.id
            ]
        )


        await connection.execute(
            `
      UPDATE password_reset_tokens
      SET usedAt = NOW()
      WHERE userId = ?
        AND usedAt IS NULL
      `, [
                resetRecord.userId
            ]
        )


        await connection.commit()


        return res.json({
            message: 'Contraseña actualizada correctamente'
        })
    } catch (error) {
        try {
            await connection.rollback()
        } catch (rollbackError) {
            console.error(
                'Error haciendo rollback:',
                rollbackError
            )
        }

        console.error(
            'Error en resetPassword:',
            error
        )

        return res.status(500).json({
            message: 'No se pudo actualizar la contraseña'
        })
    } finally {
        connection.release()
    }
}

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
    forgotPassword,
    resetPassword
}