import {
  Link,
  useSearchParams
} from 'react-router-dom'


export default function PaymentSuccessPage() {
  const [searchParams] =
    useSearchParams()

  const orderId =
    searchParams.get(
      'orderId'
    )


  return (
    <div className="auth-page">
      <section className="auth-card card-blur">

        <div className="auth-header">

          <span className="auth-eyebrow">
            ROCKTICKETS
          </span>

          <h1>
            Pago procesado
          </h1>

          <p className="muted">
            Estamos confirmando tu compra.
          </p>

        </div>


        <div
          style={{
            marginTop: '24px',
            lineHeight: '1.7'
          }}
        >
          <p>
            Si el pago fue aprobado,
            tus entradas aparecerán
            en tu cuenta en unos segundos.
          </p>

          {
            orderId && (
              <p>
                Orden:
                {' '}
                <strong>
                  {orderId}
                </strong>
              </p>
            )
          }
        </div>


        <div
          style={{
            marginTop: '28px'
          }}
        >
          <Link
            to="/tickets"
            className="btn-primary"
          >
            Ver mis tickets
          </Link>
        </div>

      </section>
    </div>
  )
}