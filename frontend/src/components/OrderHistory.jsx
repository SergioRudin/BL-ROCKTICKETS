import {
  useEffect,
  useState
} from 'react'

import {
  Link
} from 'react-router-dom'

import {
  getMyOrders
} from '../utils/api'

import {
  formatMoney
} from '../utils/formatters'


function OrderHistory() {
  const [
    orders,
    setOrders
  ] = useState([])

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    error,
    setError
  ] = useState('')


  useEffect(
    () => {
      loadOrders()
    },
    []
  )


  async function loadOrders() {
    try {
      setLoading(true)
      setError('')


      const data =
        await getMyOrders()


      setOrders(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (error) {
      console.error(
        'Error cargando historial:',
        error
      )


      setError(
        error.message ||
        'No se pudo cargar el historial de compras'
      )
    } finally {
      setLoading(false)
    }
  }


  function getStatusInfo(
    status
  ) {
    switch (status) {
      case 'PAID':
        return {
          label:
            'Pagada',

          className:
            'order-status order-status--paid'
        }


      case 'PENDING':
        return {
          label:
            'Pendiente',

          className:
            'order-status order-status--pending'
        }


      case 'EXPIRED':
        return {
          label:
            'Expirada',

          className:
            'order-status order-status--expired'
        }


      case 'PAYMENT_FAILED':
        return {
          label:
            'Pago fallido',

          className:
            'order-status order-status--failed'
        }


      case 'PAYMENT_ERROR':
        return {
          label:
            'Error de pago',

          className:
            'order-status order-status--failed'
        }


      case 'PAYMENT_REVIEW':
        return {
          label:
            'En revisión',

          className:
            'order-status order-status--review'
        }


      default:
        return {
          label:
            status || 'Desconocido',

          className:
            'order-status'
        }
    }
  }


  function formatDate(
    value
  ) {
    if (!value) {
      return 'Fecha no disponible'
    }


    const date =
      new Date(
        value
      )


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Fecha no disponible'
    }


    return date.toLocaleDateString(
      'es-CR',
      {
        year:
          'numeric',

        month:
          'long',

        day:
          'numeric'
      }
    )
  }


  if (loading) {
    return (
      <section className="account-orders">

        <div className="account-orders__header">
          <div>
            <span className="account-orders__eyebrow">
              RockTickets
            </span>

            <h2>
              Mis compras
            </h2>
          </div>
        </div>


        <div className="orders-empty">
          Cargando historial...
        </div>

      </section>
    )
  }


  if (error) {
    return (
      <section className="account-orders">

        <div className="account-orders__header">
          <div>
            <span className="account-orders__eyebrow">
              RockTickets
            </span>

            <h2>
              Mis compras
            </h2>
          </div>
        </div>


        <div className="orders-error">
          {error}
        </div>

      </section>
    )
  }


  return (
    <section className="account-orders">

      <div className="account-orders__header">

        <div>

          <span className="account-orders__eyebrow">
            RockTickets
          </span>


          <h2>
            Mis compras
          </h2>


          <p>
            Consulta tus órdenes y el estado de tus pagos.
          </p>

        </div>

      </div>


      {!orders.length ? (

        <div className="orders-empty">

          <h3>
            Todavía no tienes compras
          </h3>


          <p>
            Cuando compres entradas aparecerán aquí.
          </p>


          <Link
            to="/"
            className="btn-primary"
          >
            Ver eventos
          </Link>

        </div>

      ) : (

        <div className="orders-list">

          {orders.map(
            (order) => {
              const statusInfo =
                getStatusInfo(
                  order.status
                )


              return (
                <article
                  className="order-card"
                  key={
                    order.orderId
                  }
                >

                  <div className="order-card__main">

                    <div className="order-card__event">

                      {order.eventImage && (
                        <img
                          src={
                            order.eventImage
                          }
                          alt={
                            order.eventTitle ||
                            'Evento'
                          }
                        />
                      )}


                      <div>

                        <span className="order-card__artist">
                          {
                            order.eventArtist ||
                            'RockTickets'
                          }
                        </span>


                        <h3>
                          {
                            order.eventTitle ||
                            'Evento'
                          }
                        </h3>


                        <p>
                          {formatDate(
                            order.eventDate
                          )}
                        </p>


                        <p>
                          {
                            order.eventVenue ||
                            ''
                          }

                          {
                            order.eventCity
                              ? ` · ${order.eventCity}`
                              : ''
                          }
                        </p>

                      </div>

                    </div>


                    <div className="order-card__status">

                      <span
                        className={
                          statusInfo.className
                        }
                      >
                        {
                          statusInfo.label
                        }
                      </span>

                    </div>

                  </div>


                  <div className="order-card__footer">

                    <div className="order-card__info">

                      <div>

                        <span>
                          Orden
                        </span>

                        <strong>
                          {
                            order.orderId
                          }
                        </strong>

                      </div>


                      <div>

                        <span>
                          Compra
                        </span>

                        <strong>
                          {formatDate(
                            order.createdAt
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Total
                        </span>

                        <strong>
                          {formatMoney(
                            Number(
                              order.total
                            )
                          )}
                        </strong>

                      </div>

                    </div>


                    {order.status ===
                      'PAID' && (

                      <Link
                        to="/tickets"
                        className="btn-primary"
                      >
                        Ver tickets
                      </Link>

                    )}

                  </div>

                </article>
              )
            }
          )}

        </div>

      )}

    </section>
  )
}


export default OrderHistory