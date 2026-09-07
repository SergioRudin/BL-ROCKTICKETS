import { createContext, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

const SAVED_TICKETS_KEY = 'rocktickets_issued_tickets'

function getSavedTickets() {
  const saved = localStorage.getItem(SAVED_TICKETS_KEY)
  return saved ? JSON.parse(saved) : []
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [issuedTickets, setIssuedTickets] = useState(getSavedTickets)

  const addItem = (item) => {
    setItems((prev) => [...prev, item])
  }

  const removeItem = (seatKey) => {
    setItems((prev) => prev.filter((item) => item.seatKey !== seatKey))
  }

  const clearCart = () => setItems([])

  const issueTickets = (buyer) => {
    const tickets = items.map((item, index) => ({
      ...item,
      buyer,
      ticketId: `RT-${Date.now()}-${index + 1}`
    }))

    const updatedTickets = [...tickets, ...issuedTickets]

    setIssuedTickets(updatedTickets)
    localStorage.setItem(SAVED_TICKETS_KEY, JSON.stringify(updatedTickets))

    setItems([])

    return tickets
  }

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        total,
        issuedTickets,
        issueTickets
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)

  if (!ctx) {
    throw new Error('useCart debe usarse dentro de CartProvider')
  }

  return ctx
}