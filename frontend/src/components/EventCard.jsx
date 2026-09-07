import { Link } from 'react-router-dom'
import { formatEventDate, formatMoney } from '../utils/formatters'

export default function EventCard({ event }) {
  return (
    <article className="event-card">
      <img src={event.image} alt={event.title} />
      <div className="event-card__overlay" />
      <div className="event-card__content">
        <span className="pill">{event.category}</span>
        <h3>{event.title}</h3>
        <p>{event.artist}</p>
        <small>{formatEventDate(event.date)}</small>
        <small>{event.venue} · {event.city}</small>
        <div className="event-card__footer">
          <span>Desde {formatMoney(event.priceGeneral)}</span>
          <Link className="btn-primary" to={`/evento/${event.slug}`}>Ver evento</Link>
        </div>
      </div>
    </article>
  )
}
