import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StageMap from '../components/StageMap'
import SeatSelector from '../components/SeatSelector'
import { getEventBySlug } from '../utils/api'
import { formatEventDate, formatMoney } from '../utils/formatters'
import { useCart } from '../context/CartContext'

export default function EventPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [event, setEvent] = useState(null)
  const [message, setMessage] = useState('')
  const [loadingPurchase, setLoadingPurchase] = useState(false)

  async function loadEvent() {
    const data = await getEventBySlug(slug)
    setEvent(data)
  }

  useEffect(() => {
    loadEvent()
  }, [slug])

  if (!event) return <div className="empty-state">Cargando evento...</div>

  const generalZone = event.zones?.find((zone) => zone.code === 'GENERAL')
  const vipZone = event.zones?.find((zone) => zone.code === 'VIP')

function handleSeatConfirm(selection) {
  selection.forEach((item) => {
    addItem({
      ...item,
      eventId: event.id || event._id,
      eventTitle: event.title,
      eventSlug: event.slug,
      venue: event.venue,
      date: event.date
    })
  })

  setMessage(`${selection.length} entrada(s) agregada(s) al carrito.`)

  setTimeout(() => {
    navigate('/checkout')
  }, 800)
}

  return (
    <div className="stack-lg">
      <section className="event-hero card-blur">
        <img src={event.image} alt={event.title} />

        <div className="stack-md">
          <span className="pill">{event.category}</span>
          <h2>{event.title}</h2>
          <p className="muted">{event.artist}</p>
          <p>{event.description}</p>

          <div className="event-meta-grid">
            <article>
              <strong>Fecha</strong>
              <span>{formatEventDate(event.date)}</span>
            </article>

            <article>
              <strong>Venue</strong>
              <span>
                {event.venue} · {event.city}
              </span>
            </article>

            <article>
              <strong>General</strong>
              <span>{formatMoney(generalZone?.price || 0)}</span>
            </article>

            <article>
              <strong>VIP</strong>
              <span>{formatMoney(vipZone?.price || 0)}</span>
            </article>
          </div>
        </div>
      </section>

      <StageMap zones={event.zones || []} />

      <SeatSelector
        zones={event.zones || []}
        onConfirm={handleSeatConfirm}
      />

      {loadingPurchase && (
        <div className="empty-state">Procesando compra...</div>
      )}

      {message && <div className="success-banner">{message}</div>}
    </div>
  )
}