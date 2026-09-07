import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatMoney } from '../utils/formatters'
import { createTestTickets } from '../utils/api'


export default function CheckoutPage() {
  const { items, total, removeItem, clearCart } = useCart()
  const navigate = useNavigate()
  const [buyer, setBuyer] = useState({ name: '', email: '' })

async function handleSubmit(e) {
  e.preventDefault()

  if (!items.length) return

  try {
    const eventId = items[0].eventId

    const groupedByZone = items.reduce((acc, item) => {
      acc[item.zoneCode] = (acc[item.zoneCode] || 0) + 1
      return acc
    }, {})

    const results = []

    for (const [zoneCode, quantity] of Object.entries(groupedByZone)) {
      const result = await createTestTickets({
        eventId,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        zoneCode,
        quantity
      })

      results.push(result)
    }

    const lastOrderId = results[results.length - 1]?.orderId

    localStorage.setItem('last_order_id', lastOrderId)

    clearCart()

    navigate(`/tickets?orderId=${lastOrderId}`)

  } catch (error) {
    console.error(error)
    alert(error.message || 'No se pudo completar la compra')
  }
}


  return (
    <div className="checkout-layout">
      <section className="card-blur stack-md">
        <h2>Resumen de compra</h2>
        {!items.length ? (
          <p className="muted">No hay tickets en el carrito.</p>
        ) : (
          items.map((item) => (
            <article className="cart-row" key={item.seatKey}>
              <div>
                <strong>{item.eventTitle}</strong>
                <p>{item.zone} · Entrada</p>
              </div>
              <div className="cart-row__actions">
                <span>{formatMoney(item.price)}</span>
                <button className="btn-ghost" onClick={() => removeItem(item.seatKey)}>Quitar</button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="card-blur stack-md">
        <h2>Datos del comprador</h2>
        <form className="stack-sm" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={buyer.name}
            onChange={(e) => setBuyer((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={buyer.email}
            onChange={(e) => setBuyer((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <div className="total-box">
            <span>Total</span>
            <strong>{formatMoney(total)}</strong>
          </div>
          <button className="btn-primary" type="submit" disabled={!items.length}>
            Confirmar compra y emitir tickets
          </button>
        </form>
      </section>
    </div>
  )
}
