import {
  useEffect,
  useState
} from 'react'

import {
  Link,
  useSearchParams
} from 'react-router-dom'

import {
  getOrderStatus
} from '../utils/api'


function PaymentSuccessPage() {
  const [searchParams] =
    useSearchParams()

  const orderId =
    searchParams.get(
      'orderId'
    )


  const [status, setStatus] =
    useState(
      'LOADING'
    )

  const [message, setMessage] =
    useState(
      'Estamos confirmando tu pago...'
    )

  const [error, setError] =
    useState('')


  useEffect(
    () => {
      if (!orderId) {
        setStatus(
          'ERROR'
        )

        setMessage(
          'No se encontró el número de orden.'
        )

        return
      }


      let cancelled =
        false

      let attempts =
        0


      async function checkOrder() {
        try {
          attempts += 1


          const result =
            await getOrderStatus(
              orderId
            )


          if (cancelled) {
            return
          }


          const order =
            result.order


          if (
            order.status ===
            'PAID'
          ) {
            setStatus(
              'PAID'
            )

            setMessage(
              '¡Pago confirmado! Tus entradas ya están listas.'
            )

            return
          }


          if (
            order.status ===
            'PAYMENT_REVIEW'
          ) {
            setStatus(
              'PAYMENT_REVIEW'
            )

            setMessage(
              'Tu pago fue recibido, pero la orden requiere revisión.'
            )

            return
          }


          if (
            order.status ===
            'PAYMENT_FAILED'
          ) {
            setStatus(
              'PAYMENT_FAILED'
            )

            setMessage(
              'El pago no pudo completarse.'
            )

            return
          }


          if (
            order.status ===
            'EXPIRED'
          ) {
            setStatus(
              'EXPIRED'
            )

            setMessage(
              'La orden expiró antes de confirmarse el pago.'
            )

            return
          }


          if (
            order.status ===
            'PAYMENT_ERROR'
          ) {
            setStatus(
              'PAYMENT_ERROR'
            )

            setMessage(
              'Ocurrió un problema al procesar el pago.'
            )

            return
          }


          setStatus(
            'PENDING'
          )

          setMessage(
            'Estamos confirmando tu pago...'
          )


          if (
            attempts < 20
          ) {
            setTimeout(
              checkOrder,
              2000
            )
          } else {
            setMessage(
              'El pago todavía está siendo procesado. Puedes revisar Mis tickets en unos momentos.'
            )
          }
        } catch (requestError) {
          if (cancelled) {
            return
          }


          setError(
            requestError.message
          )

          setStatus(
            'ERROR'
          )
        }
      }


      checkOrder()


      return () => {
        cancelled = true
      }
    },
    [
      orderId
    ]
  )


  return (
    <main className="payment-success-page">

      <div className="payment-success-card">

        {status ===
          'LOADING' && (
          <div className="payment-status-icon">
            ⏳
          </div>
        )}


        {status ===
          'PENDING' && (
          <div className="payment-status-icon">
            ⏳
          </div>
        )}


        {status ===
          'PAID' && (
          <div className="payment-status-icon">
            ✅
          </div>
        )}


        {status ===
          'PAYMENT_REVIEW' && (
          <div className="payment-status-icon">
            ⚠️
          </div>
        )}


        {(
          status ===
            'PAYMENT_FAILED' ||
          status ===
            'PAYMENT_ERROR' ||
          status ===
            'EXPIRED' ||
          status ===
            'ERROR'
        ) && (
          <div className="payment-status-icon">
            ❌
          </div>
        )}


        <h1>
          {status ===
          'PAID'
            ? 'Pago confirmado'
            : 'Estado de tu compra'}
        </h1>


        <p>
          {message}
        </p>


        {orderId && (
          <div className="payment-order-id">
            Orden:
            <strong>
              {' '}
              {orderId}
            </strong>
          </div>
        )}


        {error && (
          <div className="payment-error">
            {error}
          </div>
        )}


        {status ===
          'PAID' && (
          <Link
            to="/tickets"
            className="btn-primary"
          >
            Ver mis tickets
          </Link>
        )}


        {status !==
          'PAID' && (
          <Link
            to="/"
            className="btn-secondary"
          >
            Volver al inicio
          </Link>
        )}

      </div>

    </main>
  )
}


export default PaymentSuccessPage