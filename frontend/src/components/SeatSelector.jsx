import { useState } from 'react'
import { formatMoney } from '../utils/formatters'

const MAX_PER_ORDER = 10

export default function SeatSelector({ onConfirm, zones = [] }) {
  const [quantities, setQuantities] = useState({})

  function getAvailable(zone) {
    return Math.max((zone.capacity || 0) - (zone.sold || 0), 0)
  }

  function getSoldPercentage(zone) {
    if (!zone.capacity) return 0
    return Math.round(((zone.sold || 0) / zone.capacity) * 100)
  }

  function updateQuantity(zoneCode, value) {
    setQuantities((prev) => ({
      ...prev,
      [zoneCode]: value
    }))
  }

  function increase(zone) {
    const current = quantities[zone.code] || 0
    const available = getAvailable(zone)

    if (current >= available) return
    if (current >= MAX_PER_ORDER) return

    updateQuantity(zone.code, current + 1)
  }

  function decrease(zone) {
    const current = quantities[zone.code] || 0

    if (current <= 0) return

    updateQuantity(zone.code, current - 1)
  }

  function handleConfirm() {
    const ticketSelection = zones.flatMap((zone) => {
      const quantity = quantities[zone.code] || 0

      return Array.from({ length: quantity }, (_, index) => ({
        seatKey: `${zone.code}-${Date.now()}-${index + 1}`,
        zone: zone.name,
        zoneCode: zone.code,
        price: zone.price
      }))
    })

    onConfirm(ticketSelection)
    setQuantities({})
  }

  const selectedTotal = Object.values(quantities).reduce(
    (sum, quantity) => sum + quantity,
    0
  )

  return (
    <section className="selector card-blur">
      <div className="selector__header">
        <div>
          <span className="pill">Compra por zona</span>
          <h2>Selecciona tus entradas</h2>
          <p className="muted">
            Elige la cantidad de boletos para cada zona disponible.
          </p>
        </div>

        <div className="selector__limit">
          Máximo {MAX_PER_ORDER} por zona
        </div>
      </div>

      <div className="zone-grid">
        {zones.map((zone) => {
          const quantity = quantities[zone.code] || 0
          const available = getAvailable(zone)
          const soldPercentage = getSoldPercentage(zone)
          const isSoldOut = available === 0

          return (
            <article
              className={`zone-card ${isSoldOut ? 'zone-card--soldout' : ''}`}
              key={zone.code}
            >
              <div className="zone-card__top">
                <div>
                  <span className="zone-card__label">{zone.code}</span>
                  <h3>{zone.name}</h3>
                </div>

                <strong className="zone-card__price">
                  {formatMoney(zone.price)}
                </strong>
              </div>

              <div className="zone-card__availability">
                <span>{available} disponibles</span>
                <span>{soldPercentage}% vendido</span>
              </div>

              <div className="zone-card__bar">
                <div style={{ width: `${soldPercentage}%` }} />
              </div>

              {isSoldOut ? (
                <div className="zone-card__soldout">Agotado</div>
              ) : (
                <div className="zone-card__controls">
                  <button
                    className="btn-counter"
                    type="button"
                    onClick={() => decrease(zone)}
                    disabled={quantity === 0}
                  >
                    -
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    className="btn-counter"
                    type="button"
                    onClick={() => increase(zone)}
                    disabled={quantity >= available || quantity >= MAX_PER_ORDER}
                  >
                    +
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <button
        className="btn-primary selector__cta"
        onClick={handleConfirm}
        disabled={!selectedTotal}
      >
        Agregar {selectedTotal || ''} entrada(s) al carrito
      </button>
    </section>
  )
}