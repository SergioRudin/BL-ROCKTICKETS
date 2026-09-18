const slugify = require('slugify');

const { pool } = require('../config/db');


function attachZones(events, zones) {
    return events.map((event) => ({
        ...event,

        zones: zones.filter(
            (zone) => Number(zone.eventId) === Number(event.id)
        ),
    }));
}


async function getEvents(req, res) {
    try {
        const [events] = await pool.execute(
            `
      SELECT *
      FROM events
      ORDER BY date ASC
      `
        );

        const [zones] = await pool.execute(
            `
      SELECT *
      FROM event_zones
      ORDER BY id ASC
      `
        );

        res.json(
            attachZones(events, zones)
        );
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo eventos',
        });
    }
}


async function getEventBySlug(req, res) {
    try {
        const { slug } = req.params;

        const [events] = await pool.execute(
            `
      SELECT *
      FROM events
      WHERE slug = ?
      LIMIT 1
      `, [slug]
        );

        if (!events.length) {
            return res.status(404).json({
                message: 'Evento no encontrado',
            });
        }

        const event = events[0];

        const [zones] = await pool.execute(
            `
      SELECT *
      FROM event_zones
      WHERE eventId = ?
      ORDER BY id ASC
      `, [event.id]
        );

        res.json({
            ...event,
            zones,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo evento',
        });
    }
}


async function getEventZones(req, res) {
    try {
        const { id } = req.params;

        const [zones] = await pool.execute(
            `
      SELECT *
      FROM event_zones
      WHERE eventId = ?
      ORDER BY id ASC
      `, [id]
        );

        res.json(zones);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo zonas',
        });
    }
}


async function createEvent(req, res) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            title,
            slug,
            artist,
            arena,
            venue,
            city,
            country,
            date,
            doorsOpenAt,
            category,
            image,
            description,
            status,
            zones = [],
        } = req.body;

        if (!title || !date) {
            await connection.rollback();

            return res.status(400).json({
                message: 'Título y fecha son requeridos',
            });
        }

        const finalSlug =
            slug ||
            slugify(title, {
                lower: true,
                strict: true,
            });

        const [result] = await connection.execute(
            `
      INSERT INTO events (
        title,
        slug,
        artist,
        arena,
        venue,
        city,
        country,
        date,
        doorsOpenAt,
        category,
        image,
        description,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                title,
                finalSlug,
                artist || null,
                arena || null,
                venue || null,
                city || null,
                country || null,
                date,
                doorsOpenAt || null,
                category || null,
                image || null,
                description || null,
                status || 'PUBLISHED',
            ]
        );

        const eventId = result.insertId;

        for (const zone of zones) {
            await connection.execute(
                `
        INSERT INTO event_zones (
          eventId,
          name,
          code,
          price,
          capacity,
          sold
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `, [
                    eventId,
                    zone.name,
                    String(zone.code).toUpperCase(),
                    Number(zone.price || 0),
                    Number(zone.capacity || 0),
                    Number(zone.sold || 0),
                ]
            );
        }

        await connection.commit();

        const [events] = await pool.execute(
            `
      SELECT *
      FROM events
      WHERE id = ?
      `, [eventId]
        );

        const [createdZones] = await pool.execute(
            `
      SELECT *
      FROM event_zones
      WHERE eventId = ?
      `, [eventId]
        );

        res.status(201).json({
            ...events[0],
            zones: createdZones,
        });
    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
            message: 'Error creando evento',
            error: error.message,
        });
    } finally {
        connection.release();
    }
}


async function updateEvent(req, res) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        const [existing] = await connection.execute(
            `
      SELECT *
      FROM events
      WHERE id = ?
      LIMIT 1
      `, [id]
        );

        if (!existing.length) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Evento no encontrado',
            });
        }

        const old = existing[0];

        const data = {
            ...old,
            ...req.body,
        };

        if (req.body.title && !req.body.slug) {
            data.slug = slugify(
                req.body.title, {
                    lower: true,
                    strict: true,
                }
            );
        }

        await connection.execute(
            `
      UPDATE events
      SET
        title = ?,
        slug = ?,
        artist = ?,
        arena = ?,
        venue = ?,
        city = ?,
        country = ?,
        date = ?,
        doorsOpenAt = ?,
        category = ?,
        image = ?,
        description = ?,
        status = ?
      WHERE id = ?
      `, [
                data.title,
                data.slug,
                data.artist || null,
                data.arena || null,
                data.venue || null,
                data.city || null,
                data.country || null,
                data.date,
                data.doorsOpenAt || null,
                data.category || null,
                data.image || null,
                data.description || null,
                data.status,
                id,
            ]
        );

        if (Array.isArray(req.body.zones)) {
            for (const zone of req.body.zones) {
                await connection.execute(
                    `
          INSERT INTO event_zones (
            eventId,
            name,
            code,
            price,
            capacity,
            sold
          )
          VALUES (?, ?, ?, ?, ?, ?)

          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            price = VALUES(price),
            capacity = VALUES(capacity),
            sold = VALUES(sold)
          `, [
                        id,
                        zone.name,
                        String(zone.code).toUpperCase(),
                        Number(zone.price || 0),
                        Number(zone.capacity || 0),
                        Number(zone.sold || 0),
                    ]
                );
            }
        }

        await connection.commit();

        const [events] = await pool.execute(
            `
      SELECT *
      FROM events
      WHERE id = ?
      `, [id]
        );

        const [zones] = await pool.execute(
            `
      SELECT *
      FROM event_zones
      WHERE eventId = ?
      `, [id]
        );

        res.json({
            ...events[0],
            zones,
        });
    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
            message: 'Error actualizando evento',
            error: error.message,
        });
    } finally {
        connection.release();
    }
}


async function deleteEvent(req, res) {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            `
      DELETE FROM events
      WHERE id = ?
      `, [id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: 'Evento no encontrado',
            });
        }

        res.json({
            message: 'Evento eliminado correctamente',
        });
    } catch (error) {
        console.error(error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                message: 'No se puede eliminar el evento porque ya tiene órdenes o tickets asociados',
            });
        }

        res.status(500).json({
            message: 'Error eliminando evento',
        });
    }
}


module.exports = {
    getEvents,
    getEventBySlug,
    getEventZones,
    createEvent,
    updateEvent,
    deleteEvent,
};