import {
  useEffect,
  useState
} from 'react'

import {
  useSearchParams
} from 'react-router-dom'

import {
  useCart
} from '../context/CartContext'

import {
  formatMoney
} from '../utils/formatters'

import {
  createOrder
} from '../utils/api'


export default function CheckoutPage() {
  const [searchParams] =
    useSearchParams()


  const [
    paymentMessage,
    setPaymentMessage
  ] = useState('')


  useEffect(
    () => {
      const paymentStatus =
        searchParams.get(
          'payment'
        )


      if (
        paymentStatus ===
        'cancelled'
      ) {
        setPaymentMessage(
          'El pago fue cancelado. Tus entradas no fueron cobradas y puedes intentarlo nuevamente.'
        )
      }
    },
    [
      searchParams
    ]
  )


  const {
    items,
    total,
    removeItem
  } = useCart()


  const [
    buyer,
    setBuyer
  ] = useState({
    name: '',
    email: ''
  })


  const [
    loading,
    setLoading
  ] = useState(false)


  const [
    error,
    setError
  ] = useState('')


  async function handleSubmit(
    e
  ) {
    e.preventDefault()


    if (!items.length) {
      return
    }


    setError('')


    if (
      !buyer.name.trim() ||
      !buyer.email.trim()
    ) {
      setError(
        'Completa los datos del comprador'
      )

      return
    }


    try {
      setLoading(true)


      const eventId =
        items[0].eventId


      // =====================================================
      // AGRUPAR TICKETS POR ZONA
      // =====================================================

      const groupedByZone =
        items.reduce(
          (
            acc,
            item
          ) => {
            const zoneCode =
              item.zoneCode


            if (
              !acc[zoneCode]
            ) {
              acc[zoneCode] = 0
            }


            acc[zoneCode] += 1


            return acc
          },
          {}
        )


      // =====================================================
      // CONVERTIR A ITEMS PARA EL BACKEND
      // =====================================================

      const orderItems =
        Object.entries(
          groupedByZone
        ).map(
          (
            [
              zoneCode,
              quantity
            ]
          ) => {
            return {
              zoneCode,
              quantity
            }
          }
        )


      // =====================================================
      // CREAR ORDEN PENDING
      // =====================================================

      const result =
        await createOrder({
          eventId,

          buyerName:
            buyer.name.trim(),

          buyerEmail:
            buyer.email.trim(),

          items:
            orderItems
        })


      // =====================================================
      // VALIDAR RESPUESTA ONVO
      // =====================================================

      if (
        !result ||
        !result.checkoutUrl
      ) {
        throw new Error(
          'No se recibió la URL de pago'
        )
      }


      if (
        result.order &&
        result.order.orderId
      ) {
        localStorage.setItem(
          'last_order_id',
          result.order.orderId
        )
      }


      // =====================================================
      // NO LIMPIAMOS CARRITO TODAVÍA
      // =====================================================

      window.location.href =
        result.checkoutUrl
    } catch (error) {
      console.error(
        'Error iniciando pago:',
        error
      )


      setError(
        error.message ||
        'No se pudo iniciar el pago'
      )


      setLoading(false)
    }
  }


  return (
    <div className="checkout-layout">

      <section className="card-blur stack-md">

        <h2>
          Resumen de compra
        </h2>


        {!items.length ? (

          <p className="muted">
            No hay tickets en el carrito.
          </p>

        ) : (

          items.map(
            (item) => (
              <article
                className="cart-row"
                key={item.seatKey}
              >

                <div>

                  <strong>
                    {item.eventTitle}
                  </strong>


                  <p>
                    {item.zone} · Entrada
                  </p>

                </div>


                <div className="cart-row__actions">

                  <span>
                    {formatMoney(
                      item.price
                    )}
                  </span>


                  <button
                    className="btn-ghost"
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      removeItem(
                        item.seatKey
                      )
                    }
                  >
                    Quitar
                  </button>

                </div>

              </article>
            )
          )

        )}

      </section>


      <section className="card-blur stack-md">

        <h2>
          Datos del comprador
        </h2>


        {paymentMessage && (
          <div className="checkout-payment-message">

            <strong>
              Pago cancelado
            </strong>


            <p>
              {paymentMessage}
            </p>

          </div>
        )}


        <form
          className="stack-sm"
          onSubmit={
            handleSubmit
          }
        >

          <input
            type="text"
            placeholder="Nombre completo"
            value={
              buyer.name
            }
            disabled={
              loading
            }
            onChange={
              (e) =>
                setBuyer(
                  (prev) => ({
                    ...prev,

                    name:
                      e.target.value
                  })
                )
            }
            required
          />


          <input
            type="email"
            placeholder="Correo electrónico"
            value={
              buyer.email
            }
            disabled={
              loading
            }
            onChange={
              (e) =>
                setBuyer(
                  (prev) => ({
                    ...prev,

                    email:
                      e.target.value
                  })
                )
            }
            required
          />


          <div className="total-box">

            <span>
              Total
            </span>


            <strong>
              {formatMoney(
                total
              )}
            </strong>

          </div>


          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}


          <button
            className="btn-primary"
            type="submit"
            disabled={
              !items.length ||
              loading
            }
          >

            {
              loading
                ? 'Redirigiendo al pago...'
                : 'Continuar al pago'
            }

          </button>

        </form>

      </section>

    </div>
  )
}