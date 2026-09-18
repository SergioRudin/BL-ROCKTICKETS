const {
    pool,
} = require('../config/db');


async function getDashboard(req, res) {
    try {
        const [events] =
        await pool.execute(
            `
        SELECT
          e.id,
          e.title,
          e.slug,
          e.artist,
          e.venue,
          e.date,

          COALESCE(
            SUM(z.capacity),
            0
          ) AS capacity,

          COALESCE(
            SUM(z.sold),
            0
          ) AS sold,

          COALESCE(
            SUM(
              z.capacity -
              z.sold
            ),
            0
          ) AS available,

          COALESCE(
            SUM(
              z.sold *
              z.price
            ),
            0
          ) AS revenue

        FROM events e

        LEFT JOIN event_zones z
          ON z.eventId = e.id

        GROUP BY
          e.id,
          e.title,
          e.slug,
          e.artist,
          e.venue,
          e.date

        ORDER BY e.date ASC
        `
        );

        const [zones] =
        await pool.execute(
            `
        SELECT
          z.id,
          z.eventId,
          z.name,
          z.code,
          z.price,
          z.capacity,
          z.sold,

          (
            z.capacity -
            z.sold
          ) AS available,

          (
            z.sold *
            z.price
          ) AS revenue

        FROM event_zones z

        ORDER BY
          z.eventId,
          z.id
        `
        );

        const formattedEvents =
            events.map(
                (event) => {
                    const capacity =
                        Number(
                            event.capacity
                        );

                    const sold =
                        Number(
                            event.sold
                        );

                    return {
                        ...event,

                        capacity,
                        sold,

                        available: Number(
                            event.available
                        ),

                        revenue: Number(
                            event.revenue
                        ),

                        occupancy: capacity > 0 ?
                            Number(
                                (
                                    (
                                        sold /
                                        capacity
                                    ) *
                                    100
                                ).toFixed(2)
                            ) :
                            0,

                        zones: zones
                            .filter(
                                (zone) =>
                                Number(
                                    zone.eventId
                                ) ===
                                Number(
                                    event.id
                                )
                            )
                            .map(
                                (zone) => ({
                                    ...zone,

                                    price: Number(
                                        zone.price
                                    ),

                                    capacity: Number(
                                        zone.capacity
                                    ),

                                    sold: Number(
                                        zone.sold
                                    ),

                                    available: Number(
                                        zone.available
                                    ),

                                    revenue: Number(
                                        zone.revenue
                                    ),

                                    occupancy: Number(
                                            zone.capacity
                                        ) > 0 ?
                                        Number(
                                            (
                                                (
                                                    Number(
                                                        zone.sold
                                                    ) /
                                                    Number(
                                                        zone.capacity
                                                    )
                                                ) *
                                                100
                                            ).toFixed(
                                                2
                                            )
                                        ) :
                                        0,
                                })
                            ),
                    };
                }
            );

        const global =
            formattedEvents.reduce(
                (acc, event) => {
                    acc.capacity +=
                        event.capacity;

                    acc.sold +=
                        event.sold;

                    acc.available +=
                        event.available;

                    acc.revenue +=
                        event.revenue;

                    return acc;
                }, {
                    capacity: 0,
                    sold: 0,
                    available: 0,
                    revenue: 0,
                }
            );

        global.occupancy =
            global.capacity > 0 ?
            Number(
                (
                    (
                        global.sold /
                        global.capacity
                    ) *
                    100
                ).toFixed(2)
            ) :
            0;

        res.json({
            global,
            events: formattedEvents,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo dashboard',
        });
    }
}


module.exports = {
    getDashboard,
};