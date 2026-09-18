import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import TicketCard from '../components/TicketCard'
import TransferTicketModal from '../components/TransferTicketModal'

import {
  getTicketsByOrder,
  getMyTickets,
  transferTicket
} from '../utils/api'


export default function TicketsPage() {
  const [searchParams] = useSearchParams()

  const orderIdFromUrl =
    searchParams.get('orderId')


  const [toastMessage, setToastMessage] =
    useState('')

  const [showToast, setShowToast] =
    useState(false)

  const [tickets, setTickets] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [message, setMessage] =
    useState('')

  const [selectedTicket, setSelectedTicket] =
    useState(null)

  const [
    showTransferModal,
    setShowTransferModal
  ] = useState(false)


  async function loadTickets() {
    try {
      setLoading(true)
      setMessage('')

      let data


      /*
       * Si venimos inmediatamente de Checkout:
       *
       * /tickets?orderId=ORD-...
       *
       * mostramos esa orden concreta.
       */
      if (orderIdFromUrl) {
        data =
          await getTicketsByOrder(
            orderIdFromUrl
          )
      } else {
        /*
         * Si entramos desde Navbar → Mis tickets,
         * cargamos los tickets del usuario autenticado.
         */
        data =
          await getMyTickets()
      }


      setTickets(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (error) {
      console.error(
        'Error cargando tickets:',
        error
      )

      setTickets([])

      setMessage(
        error.message ||
          'No se pudieron cargar los tickets'
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadTickets()
  }, [orderIdFromUrl])


  const handleTransferClick = (ticket) => {
    setSelectedTicket(ticket)

    setShowTransferModal(true)
  }


  const handleTransfer = async ({
    ownerName,
    ownerEmail
  }) => {
    try {
      if (!selectedTicket) {
        return
      }

      await transferTicket(
        selectedTicket.id,
        ownerName,
        ownerEmail
      )


      setShowTransferModal(false)

      setSelectedTicket(null)


      setToastMessage(
        'Ticket transferido correctamente'
      )

      setShowToast(true)


      /*
       * En vez de recargar toda la página,
       * volvemos a consultar la API.
       */
      await loadTickets()


      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    } catch (error) {
      alert(
        error.message ||
          'No se pudo transferir el ticket'
      )
    }
  }


  return (
    <div className="stack-lg">

      <section className="card-blur stack-md">
        <h2>Mis tickets</h2>

        <p className="muted">
          Cada ticket incluye un identificador único
          y un QR visual simplificado.
        </p>
      </section>


      {message && (
        <div className="empty-state">
          {message}
        </div>
      )}


      {loading ? (
        <div className="empty-state">
          Cargando tickets...
        </div>
      ) : (
        <section className="tickets-grid">

          {tickets.length ? (
            tickets.map((ticket) => (

              <TicketCard
                key={ticket.id}

                ticket={{
                  id:
                    ticket.id,

                  ticketId:
                    ticket.ticketCode,

                  buyer: {
                    name:
                      ticket.ownerName ||
                      ticket.buyerName,

                    email:
                      ticket.ownerEmail ||
                      ticket.buyerEmail
                  },

                  owner: {
                    name:
                      ticket.ownerName,

                    email:
                      ticket.ownerEmail
                  },

                  transferHistory:
                    ticket.transferHistory ||
                    [],

                  transferCount:
                    Number(
                      ticket.transferCount ||
                      0
                    ),

                  transferredAt:
                    ticket.transferredAt,

                  orderId:
                    ticket.orderId,

                  ticketCode:
                    ticket.ticketCode,

                  zone:
                    ticket.zoneName,

                  zoneCode:
                    ticket.zoneCode,

                  price:
                    Number(
                      ticket.price ||
                      0
                    ),

                  status:
                    ticket.status,

                  eventTitle:
                    ticket.eventTitle ||
                    'RockTickets Event',

                  venue:
                    ticket.eventVenue ||
                    ticket.eventArena ||
                    '',

                  date:
                    ticket.eventDate ||
                    ticket.createdAt,

                  image:
                    ticket.eventImage ||
                    null
                }}

                onTransfer={() =>
                  handleTransferClick(
                    ticket
                  )
                }
              />

            ))
          ) : (
            <div className="empty-state">
              Todavía no tienes entradas.
            </div>
          )}

        </section>
      )}


      <TransferTicketModal
        open={showTransferModal}

        onClose={() => {
          setShowTransferModal(false)
          setSelectedTicket(null)
        }}

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