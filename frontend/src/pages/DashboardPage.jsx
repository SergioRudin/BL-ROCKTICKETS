import { useEffect, useMemo, useState } from 'react'
import { getEvents, getTickets } from '../utils/api'
import { formatMoney } from '../utils/formatters'
import { Link } from 'react-router-dom'

function getEventStats(event) {
  const zones = event.zones || []

  const totalCapacity = zones.reduce((sum, zone) => {
    return sum + Number(zone.capacity || 0)
  }, 0)

  const ticketsSold = zones.reduce((sum, zone) => {
    return sum + Number(zone.sold || 0)
  }, 0)

  const totalRevenue = zones.reduce((sum, zone) => {
    return sum + Number(zone.sold || 0) * Number(zone.price || 0)
  }, 0)

  const available = totalCapacity - ticketsSold

  const occupancy =
    totalCapacity > 0
      ? Math.round((ticketsSold / totalCapacity) * 100)
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
  return events.reduce((acc, event) => {
    const zones = event.zones || []

    zones.forEach((zone) => {
      const code = zone.code || zone.name || 'SIN_ZONA'

      if (!acc[code]) {
        acc[code] = {
          code,
          name: zone.name || code,
          sold: 0,
          capacity: 0,
          revenue: 0
        }
      }

      acc[code].sold += Number(zone.sold || 0)
      acc[code].capacity += Number(zone.capacity || 0)
      acc[code].revenue += Number(zone.sold || 0) * Number(zone.price || 0)
    })

    return acc
  }, {})
}
export default function DashboardPage() {
  const [events, setEvents] = useState([])

  const [tickets, setTickets] = useState([])

  useEffect(() => {
  getEvents().then((data) => {
    setEvents(Array.isArray(data) ? data : [])
  })

  getTickets().then((data) => {
    setTickets(Array.isArray(data.tickets) ? data.tickets : [])
  })
}, [])

  const dashboardStats = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        const stats = getEventStats(event)

        return {
          totalCapacity: acc.totalCapacity + stats.totalCapacity,
          totalSales: acc.totalSales + stats.ticketsSold,
          totalRevenue: acc.totalRevenue + stats.totalRevenue
        }
      },
      {
        totalCapacity: 0,
        totalSales: 0,
        totalRevenue: 0
      }
    )
  }, [events])

  function getOccupancyClass(value) {
  if (value >= 75) return 'danger'
  if (value >= 50) return 'warning'
  if (value >= 25) return 'medium'

  return 'low'
}

  const totalAvailable = dashboardStats.totalCapacity - dashboardStats.totalSales

  const enrichedEvents = useMemo(() => {
  return events.map((event) => ({
    ...event,
    stats: getEventStats(event)
  }))
}, [events])

const topSalesEvent = useMemo(() => {
  return enrichedEvents.reduce((top, event) => {
    if (!top || event.stats.ticketsSold > top.stats.ticketsSold) {
      return event
    }

    return top
  }, null)
}, [enrichedEvents])

const topRevenueEvent = useMemo(() => {
  return enrichedEvents.reduce((top, event) => {
    if (!top || event.stats.totalRevenue > top.stats.totalRevenue) {
      return event
    }

    return top
  }, null)
}, [enrichedEvents])

const topOccupancyEvent = useMemo(() => {
  return enrichedEvents.reduce((top, event) => {
    if (!top || event.stats.occupancy > top.stats.occupancy) {
      return event
    }

    return top
  }, null)
}, [enrichedEvents])

const zoneStats = useMemo(() => {
  return Object.values(getZoneStats(events))
}, [events])

const usedTickets = useMemo(() => {
  return tickets
    .filter((ticket) => ticket.status === 'USED' && ticket.usedAt)
    .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt))
    .slice(0, 5)
}, [tickets])

const topZone = useMemo(() => {
  return zoneStats.reduce((top, zone) => {
    if (!top || zone.sold > top.sold) {
      return zone
    }

    return top
  }, null)
}, [zoneStats])

const nextEvent = useMemo(() => {
  const now = new Date()

  return events
    .filter((event) => new Date(event.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]
}, [events])

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="metric card-blur">
          <span>Tickets vendidos</span>
          <strong>{dashboardStats.totalSales}</strong>
        </article>

        <article className="metric card-blur">
          <span>Tickets disponibles</span>
          <strong>{totalAvailable}</strong>
        </article>

        <article className="metric card-blur">
          <span>Capacidad total</span>
          <strong>{dashboardStats.totalCapacity}</strong>
        </article>

        <article className="metric card-blur">
          <span>Ingresos estimados</span>
          <strong>{formatMoney(dashboardStats.totalRevenue)}</strong>
        </article>

        <article className="metric card-blur">
          <span>Eventos activos</span>
          <strong>{events.length}</strong>
        </article>
      </section>

      <section className="dashboard-insights">
  <article className="card-blur insight-card">
    <span>🏆 Evento líder</span>
    <Link
      className="dashboard-event-link"
      to={`/evento/${topSalesEvent?.slug}`}   >
      {topSalesEvent?.title}
    </Link>
    <p>{topSalesEvent?.stats.ticketsSold || 0} tickets vendidos</p>
  </article>

  <article className="card-blur insight-card">
    <span>💰 Mayor ingreso</span>
    <Link
  className="dashboard-event-link"
  to={`/evento/${topRevenueEvent?.slug}`}>
     {topRevenueEvent?.title}
  </Link>
    <p>{formatMoney(topRevenueEvent?.stats.totalRevenue || 0)}</p>
  </article>

  <article className="card-blur insight-card">
    <span>🔥 Mayor ocupación</span>
    <Link
  className="dashboard-event-link"
  to={`/evento/${topOccupancyEvent?.slug}`} >
     {topOccupancyEvent?.title}
  </Link>
    <p>{topOccupancyEvent?.stats.occupancy || 0}% ocupación</p>
  </article>
</section>

<section className="dashboard-extra-grid">
  <article className="card-blur dashboard-feature-card">
    <span>🎟️ Zona líder</span>
    <strong>{topZone?.name || 'Sin datos'}</strong>
    <p>
      {topZone?.sold || 0} vendidos · {formatMoney(topZone?.revenue || 0)}
    </p>
  </article>

  <article className="card-blur dashboard-feature-card">
    <span>📅 Próximo evento</span>
    <strong>{nextEvent?.title || 'Sin eventos próximos'}</strong>
    <p>
      {nextEvent
        ? `${new Date(nextEvent.date).toLocaleDateString('es-CR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })} · ${nextEvent.venue}`
        : 'No hay eventos programados'}
    </p>
  </article>
</section>

<section className="card-blur stack-md">
  <h2>Últimos accesos</h2>

  {usedTickets.length === 0 ? (
    <p className="muted">Todavía no hay tickets validados.</p>
  ) : (
    usedTickets.map((ticket) => (
      <article className="access-log-row" key={ticket._id}>
        <div>
        {ticket.event?.slug ? (  
        <Link className="dashboard-event-link" to={`/evento/${ticket.event.slug}`}>
        {ticket.event.title}
        </Link>
  ) : (
        <strong>{ticket.event?.title || 'Evento no disponible'}</strong>
  )}
          <p className="muted">
            {ticket.buyerName} · {ticket.zoneName} · {ticket.ticketCode}
          </p>
        </div>

        <span>
          {new Date(ticket.usedAt).toLocaleString('es-CR', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}
        </span>
      </article>
    ))
  )}
</section>

<section className="card-blur stack-md">
  <h2>Ventas por zona</h2>

  <div className="zone-stats-grid">
    {zoneStats.map((zone) => {
      const occupancy =
        zone.capacity > 0
          ? Math.round((zone.sold / zone.capacity) * 100)
          : 0

      return (
        <article className="zone-stat-card" key={zone.code}>
          <div>
            <span>{zone.name}</span>
            <strong>{zone.sold} vendidos</strong>
          </div>

          <p>{zone.capacity - zone.sold} disponibles</p>

<div className="dashboard-bar">
    <div
        className={`dashboard-fill ${getOccupancyClass(occupancy)}`}
        style={{ width: `${occupancy}%` }}  />
    </div>

          <small>{occupancy}% ocupación · {formatMoney(zone.revenue)}</small>
        </article>
      )
    })}
  </div>
</section>

      <section className="card-blur stack-md">
        <h2>Rendimiento por evento</h2>

        {events.map((event) => {
          const stats = getEventStats(event)

          return (
            <article className="dashboard-row" key={event.id || event._id}>
              <div>
              <Link className="dashboard-event-link" to={`/evento/${event.slug}`}>
                {event.title}
              </Link>
                <p className="muted">
                {event.artist} · {stats.ticketsSold} vendidos · {stats.available} disponibles · {formatMoney(stats.totalRevenue)}
              </p>
              </div>
          <div className="dashboard-bar">
           <div
                className={`dashboard-fill ${getOccupancyClass(stats.occupancy)}`}
                style={{ width: `${stats.occupancy}%` }} />
          </div>

            <div className="dashboard-row__summary">
              <strong>{stats.occupancy}%</strong>
              <span>ocupación</span>
            </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}