import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TicketCard from '../components/TicketCard'
import { getTicketsByOrder, transferTicket} from '../utils/api'
import TransferTicketModal from '../components/TransferTicketModal'

export default function TicketsPage() {
  const [searchParams] = useSearchParams()
  const orderIdFromUrl = searchParams.get('orderId')

  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    async function loadTickets() {
      try {
        const orderId = orderIdFromUrl || localStorage.getItem('last_order_id')

        if (!orderId) {
          setTickets([])
          return
        }

        const data = await getTicketsByOrder(orderId)

        setTickets(data.tickets || [])
      } catch (error) {
        setMessage(error.message || 'No se pudieron cargar los tickets')
      } finally {
        setLoading(false)
      }
    }

    loadTickets()
  }, [orderIdFromUrl])


const handleTransferClick = (ticket) => {
  setSelectedTicket(ticket)
  setShowTransferModal(true)
}

const handleTransfer = async ({ ownerName, ownerEmail }) => {
  try {
    await transferTicket(
      selectedTicket.ticketCode,
      ownerName,
      ownerEmail
    )

    setShowTransferModal(false)
    setSelectedTicket(null)

    setToastMessage('Ticket transferido correctamente')
    setShowToast(true)

    setTimeout(() => {
      setShowToast(false)
    }, 3000)

    window.location.reload()
  } catch (err) {
    alert(err.message)
  }
}
  return (
    <div className="stack-lg">
      <section className="card-blur stack-md">
        <h2>Mis tickets</h2>
        <p className="muted">
          Cada ticket incluye un identificador único y un QR visual simplificado.
        </p>
      </section>

      {message && <div className="empty-state">{message}</div>}

      {loading ? (
        <div className="empty-state">Cargando tickets...</div>
      ) : (
        <section className="tickets-grid">
          {tickets.length ? (
            tickets.map((ticket) => (
          <TicketCard
          key={ticket._id}
          ticket={{
            ticketId: ticket.ticketCode,

          buyer: {
              name: ticket.ownerName || ticket.buyerName,
              email: ticket.ownerEmail || ticket.buyerEmail
            },

            owner: {
              name: ticket.ownerName,
              email: ticket.ownerEmail
            },

            transferHistory: ticket.transferHistory || [],

            orderId: ticket.orderId,
            ticketCode: ticket.ticketCode,
            zone: ticket.zoneName,
            price: ticket.price,
            status: ticket.status,
            eventTitle: ticket.event?.title || 'RockTickets Event',
            venue: ticket.event?.venue || '',
            date: ticket.event?.date || ticket.createdAt
          }}

          onTransfer={() => handleTransferClick(ticket)}
        />
            ))
          ) : (
            <div className="empty-state">Todavía no has emitido entradas.</div>
          )}
        </section>
      )}

      <TransferTicketModal
    open={showTransferModal}
    onClose={() => setShowTransferModal(false)}
    onConfirm={handleTransfer}
/>

      {showToast && (
  <div className="toast-success">
    ✓ {toastMessage}
  </div>
)}
    </div>
  )
}