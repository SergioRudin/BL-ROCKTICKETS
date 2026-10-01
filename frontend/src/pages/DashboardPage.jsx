import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  getDashboard,
  getEvents,
  getTickets
} from '../utils/api'

import {
  formatMoney
} from '../utils/formatters'

import {
  Link
} from 'react-router-dom'


function getEventStats(event) {
  const zones =
    Array.isArray(event.zones)
      ? event.zones
      : []

  const totalCapacity =
    zones.reduce(
      (sum, zone) =>
        sum +
        Number(zone.capacity || 0),
      0
    )

  const ticketsSold =
    zones.reduce(
      (sum, zone) =>
        sum +
        Number(zone.sold || 0),
      0
    )

  const totalRevenue =
    zones.reduce(
      (sum, zone) =>
        sum +
        (
          Number(zone.sold || 0) *
          Number(zone.price || 0)
        ),
      0
    )

  const available =
    totalCapacity -
    ticketsSold

  const occupancy =
    totalCapacity > 0
      ? Number(
          (
            (
              ticketsSold /
              totalCapacity
            ) * 100
          ).toFixed(2)
        )
      : 0

  return {
    totalCapacity,
    ticketsSold,
    totalRevenue,
    available,
    occupancy
  }
}


function getZoneStats(events) {
  return events.reduce(
    (acc, event) => {
      const zones =
        Array.isArray(event.zones)
          ? event.zones
          : []

      zones.forEach(
        (zone) => {
          const code =
            zone.code ||
            zone.name ||
            'SIN_ZONA'

          if (!acc[code]) {
            acc[code] = {
              code,
              name:
                zone.name ||
                code,
              sold: 0,
              capacity: 0,
              revenue: 0
            }
          }

          acc[code].sold +=
            Number(
              zone.sold || 0
            )

          acc[code].capacity +=
            Number(
              zone.capacity || 0
            )

          acc[code].revenue +=
            Number(
              zone.sold || 0
            ) *
            Number(
              zone.price || 0
            )
        }
      )

      return acc
    },
    {}
  )
}


export default function DashboardPage() {
  const [events, setEvents] =
    useState([])

  const [tickets, setTickets] =
    useState([])

  const [dashboardData, setDashboardData] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')


  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        /*
          Esta llamada verifica además
          que el usuario tenga permiso ADMIN.
        */

        const adminData =
          await getDashboard()

        setDashboardData(
          adminData
        )


        /*
          Conservamos estas dos llamadas
          porque el dashboard actual utiliza
          zones completas y tickets usados.
        */

        const eventsData =
          await getEvents()

        setEvents(
          Array.isArray(eventsData)
            ? eventsData
            : []
        )


        const ticketsData =
          await getTickets()

        if (
          Array.isArray(
            ticketsData
          )
        ) {
          setTickets(
            ticketsData
          )
        } else if (
          ticketsData &&
          Array.isArray(
            ticketsData.tickets
          )
        ) {
          setTickets(
            ticketsData.tickets
          )
        } else {
          setTickets([])
        }
      } catch (error) {
        console.error(
          'Error cargando dashboard:',
          error
        )

        setError(
          error.message ||
          'No se pudo cargar el dashboard'
        )
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])


  const dashboardStats =
    useMemo(() => {
      /*
        Si el backend ya nos da global,
        usamos esos datos protegidos.
      */

      if (
        dashboardData &&
        dashboardData.global
      ) {
        return {
          totalCapacity:
            Number(
              dashboardData.global
                .capacity || 0
            ),

          totalSales:
            Number(
              dashboardData.global
                .sold || 0
            ),

          totalRevenue:
            Number(
              dashboardData.global
                .revenue || 0
            )
        }
      }


      /*
        Fallback para no romper
        la interfaz.
      */

      return events.reduce(
        (acc, event) => {
          const stats =
            getEventStats(
              event
            )

          return {
            totalCapacity:
              acc.totalCapacity +
              stats.totalCapacity,

            totalSales:
              acc.totalSales +
              stats.ticketsSold,

            totalRevenue:
              acc.totalRevenue +
              stats.totalRevenue
          }
        },
        {
          totalCapacity: 0,
          totalSales: 0,
          totalRevenue: 0
        }
      )
    }, [
      events,
      dashboardData
    ])


  function getOccupancyClass(
    value
  ) {
    if (value >= 75) {
      return 'danger'
    }

    if (value >= 50) {
      return 'warning'
    }

    if (value >= 25) {
      return 'medium'
    }

    return 'low'
  }


  const totalAvailable =
    dashboardStats.totalCapacity -
    dashboardStats.totalSales


  const enrichedEvents =
    useMemo(() => {
      return events.map(
        (event) => ({
          ...event,

          stats:
            getEventStats(
              event
            )
        })
      )
    }, [events])


  const topSalesEvent =
    useMemo(() => {
      return enrichedEvents.reduce(
        (top, event) => {
          if (
            !top ||
            event.stats.ticketsSold >
              top.stats.ticketsSold
          ) {
            return event
          }

          return top
        },
        null
      )
    }, [enrichedEvents])


  const topRevenueEvent =
    useMemo(() => {
      return enrichedEvents.reduce(
        (top, event) => {
          if (
            !top ||
            event.stats.totalRevenue >
              top.stats.totalRevenue
          ) {
            return event
          }

          return top
        },
        null
      )
    }, [enrichedEvents])


  const topOccupancyEvent =
    useMemo(() => {
      return enrichedEvents.reduce(
        (top, event) => {
          if (
            !top ||
            event.stats.occupancy >
              top.stats.occupancy
          ) {
            return event
          }

          return top
        },
        null
      )
    }, [enrichedEvents])


  const zoneStats =
    useMemo(() => {
      return Object.values(
        getZoneStats(events)
      )
    }, [events])


  function getTicketEvent(
    ticket
  ) {
    return events.find(
      (event) =>
        Number(event.id) ===
        Number(ticket.eventId)
    )
  }


  const usedTickets =
    useMemo(() => {
      return tickets
        .filter(
          (ticket) =>
            ticket.status ===
              'USED' &&
            ticket.usedAt
        )
        .sort(
          (a, b) =>
            new Date(
              b.usedAt
            ) -
            new Date(
              a.usedAt
            )
        )
        .slice(
          0,
          5
        )
    }, [tickets])


  const topZone =
    useMemo(() => {
      return zoneStats.reduce(
        (top, zone) => {
          if (
            !top ||
            zone.sold >
              top.sold
          ) {
            return zone
          }

          return top
        },
        null
      )
    }, [zoneStats])


  const nextEvent =
    useMemo(() => {
      const now =
        new Date()

      return events
        .filter(
          (event) =>
            new Date(
              event.date
            ) >= now
        )
        .sort(
          (a, b) =>
            new Date(
              a.date
            ) -
            new Date(
              b.date
            )
        )[0]
    }, [events])


  if (loading) {
    return (
      <div className="card-blur empty-state">
        Cargando dashboard...
      </div>
    )
  }


  if (error) {
    return (
      <div className="validate-alert validate-alert--error">
        {error}
      </div>
    )
  }


  return (
    <div className="stack-lg">

      {/* MÉTRICAS */}

      <section className="metrics-grid">

        <article className="metric card-blur">
          <span>
            Tickets vendidos
          </span>

          <strong>
            {
              dashboardStats
                .totalSales
            }
          </strong>
        </article>


        <article className="metric card-blur">
          <span>
            Tickets disponibles
          </span>

          <strong>
            {totalAvailable}
          </strong>
        </article>


        <article className="metric card-blur">
          <span>
            Capacidad total
          </span>

          <strong>
            {
              dashboardStats
                .totalCapacity
            }
          </strong>
        </article>


        <article className="metric card-blur">
          <span>
            Ingresos estimados
          </span>

          <strong>
            {
              formatMoney(
                dashboardStats
                  .totalRevenue
              )
            }
          </strong>
        </article>


        <article className="metric card-blur">
          <span>
            Eventos activos
          </span>

          <strong>
            {events.length}
          </strong>
        </article>

      </section>


      {/* INSIGHTS */}

      <section className="dashboard-insights">

        <article className="card-blur insight-card">
          <span>
            🏆 Evento líder
          </span>

          {topSalesEvent ? (
            <Link
              className="dashboard-event-link"
              to={
                `/evento/${topSalesEvent.slug}`
              }
            >
              {
                topSalesEvent.title
              }
            </Link>
          ) : (
            <strong>
              Sin datos
            </strong>
          )}

          <p>
            {
              topSalesEvent
                ? topSalesEvent
                    .stats
                    .ticketsSold
                : 0
            } tickets vendidos
          </p>
        </article>


        <article className="card-blur insight-card">
          <span>
            💰 Mayor ingreso
          </span>

          {topRevenueEvent ? (
            <Link
              className="dashboard-event-link"
              to={
                `/evento/${topRevenueEvent.slug}`
              }
            >
              {
                topRevenueEvent.title
              }
            </Link>
          ) : (
            <strong>
              Sin datos
            </strong>
          )}

          <p>
            {
              formatMoney(
                topRevenueEvent
                  ? topRevenueEvent
                      .stats
                      .totalRevenue
                  : 0
              )
            }
          </p>
        </article>


        <article className="card-blur insight-card">
          <span>
            🔥 Mayor ocupación
          </span>

          {topOccupancyEvent ? (
            <Link
              className="dashboard-event-link"
              to={
                `/evento/${topOccupancyEvent.slug}`
              }
            >
              {
                topOccupancyEvent.title
              }
            </Link>
          ) : (
            <strong>
              Sin datos
            </strong>
          )}

          <p>
            {
              topOccupancyEvent
                ? topOccupancyEvent
                    .stats
                    .occupancy
                : 0
            }% ocupación
          </p>
        </article>

      </section>


      {/* EXTRAS */}

      <section className="dashboard-extra-grid">

        <article className="card-blur dashboard-feature-card">

          <span>
            🎟️ Zona líder
          </span>

          <strong>
            {
              topZone
                ? topZone.name
                : 'Sin datos'
            }
          </strong>

          <p>
            {
              topZone
                ? topZone.sold
                : 0
            } vendidos
            {' · '}
            {
              formatMoney(
                topZone
                  ? topZone.revenue
                  : 0
              )
            }
          </p>

        </article>


        <article className="card-blur dashboard-feature-card">

          <span>
            📅 Próximo evento
          </span>

          <strong>
            {
              nextEvent
                ? nextEvent.title
                : 'Sin eventos próximos'
            }
          </strong>

          <p>
            {
              nextEvent
                ? `${new Date(
                    nextEvent.date
                  ).toLocaleDateString(
                    'es-CR',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }
                  )} · ${nextEvent.venue}`
                : 'No hay eventos programados'
            }
          </p>

        </article>

      </section>


      {/* ÚLTIMOS ACCESOS */}

      <section className="card-blur stack-md">

        <h2>
          Últimos accesos
        </h2>

        {
          usedTickets.length === 0
            ? (
              <p className="muted">
                Todavía no hay tickets validados.
              </p>
            )
            : (
              usedTickets.map(
                (ticket) => {
                  const event =
                    getTicketEvent(
                      ticket
                    )

                  const eventSlug =
                    ticket.eventSlug ||
                    (
                      event
                        ? event.slug
                        : ''
                    )

                  const eventTitle =
                    ticket.eventTitle ||
                    (
                      event
                        ? event.title
                        : 'Evento no disponible'
                    )

                  return (
                    <article
                      className="access-log-row"
                      key={ticket.id}
                    >

                      <div>

                        {eventSlug ? (
                          <Link
                            className="dashboard-event-link"
                            to={
                              `/evento/${eventSlug}`
                            }
                          >
                            {
                              eventTitle
                            }
                          </Link>
                        ) : (
                          <strong>
                            {
                              eventTitle
                            }
                          </strong>
                        )}


                        <p className="muted">
                          {
                            ticket.ownerName ||
                            ticket.buyerName
                          }
                          {' · '}
                          {
                            ticket.zoneName
                          }
                          {' · '}
                          {
                            ticket.ticketCode
                          }
                        </p>

                      </div>


                      <span>
                        {
                          new Date(
                            ticket.usedAt
                          ).toLocaleString(
                            'es-CR',
                            {
                              dateStyle:
                                'medium',

                              timeStyle:
                                'short'
                            }
                          )
                        }
                      </span>

                    </article>
                  )
                }
              )
            )
        }

      </section>


      {/* VENTAS POR ZONA */}

      <section className="card-blur stack-md">

        <h2>
          Ventas por zona
        </h2>

        <div className="zone-stats-grid">

          {
            zoneStats.map(
              (zone) => {
                const occupancy =
                  zone.capacity > 0
                    ? Number(
                        (
                          (
                            zone.sold /
                            zone.capacity
                          ) * 100
                        ).toFixed(2)
                      )
                    : 0

                return (
                  <article
                    className="zone-stat-card"
                    key={zone.code}
                  >

                    <div>

                      <span>
                        {zone.name}
                      </span>

                      <strong>
                        {zone.sold}
                        {' '}
                        vendidos
                      </strong>

                    </div>


                    <p>
                      {
                        zone.capacity -
                        zone.sold
                      } disponibles
                    </p>


                    <div className="dashboard-bar">

                      <div
                        className={
                          `dashboard-fill ${getOccupancyClass(occupancy)}`
                        }

                        style={{
                          width:
                            `${occupancy}%`
                        }}
                      />

                    </div>


                    <small>
                      {occupancy}% ocupación
                      {' · '}
                      {
                        formatMoney(
                          zone.revenue
                        )
                      }
                    </small>

                  </article>
                )
              }
            )
          }

        </div>

      </section>


      {/* EVENTOS */}

      <section className="card-blur stack-md">

        <h2>
          Rendimiento por evento
        </h2>

        {
          events.map(
            (event) => {
              const stats =
                getEventStats(
                  event
                )

              return (
                <article
                  className="dashboard-row"
                  key={event.id}
                >

                  <div>

                    <Link
                      className="dashboard-event-link"
                      to={
                        `/evento/${event.slug}`
                      }
                    >
                      {event.title}
                    </Link>


                    <p className="muted">
                      {event.artist}
                      {' · '}
                      {
                        stats
                          .ticketsSold
                      } vendidos
                      {' · '}
                      {
                        stats
                          .available
                      } disponibles
                      {' · '}
                      {
                        formatMoney(
                          stats
                            .totalRevenue
                        )
                      }
                    </p>

                  </div>


                  <div className="dashboard-bar">

                    <div
                      className={
                        `dashboard-fill ${getOccupancyClass(stats.occupancy)}`
                      }

                      style={{
                        width:
                          `${stats.occupancy}%`
                      }}
                    />

                  </div>


                  <div className="dashboard-row__summary">

                    <strong>
                      {
                        stats.occupancy
                      }%
                    </strong>

                    <span>
                      ocupación
                    </span>

                  </div>

                </article>
              )
            }
          )
        }

      </section>

    </div>
  )
}