import { useState } from 'react'
import { Link } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Ingresá tu correo electrónico')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        `${API_URL}/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim()
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'No se pudo procesar la solicitud'
        )
      }

      setMessage(data.message)
    } catch (error) {
      setError(
        error.message ||
        'No se pudo procesar la solicitud'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card card-blur">

        <div className="auth-header">
          <span className="auth-eyebrow">
            ROCKTICKETS
          </span>

          <h1>
            Recuperar contraseña
          </h1>

          <p className="muted">
            Ingresá el correo asociado a tu cuenta.
          </p>
        </div>


        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          <label>
            Correo electrónico

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </label>


          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}


          {message && (
            <div className="success-banner">
              {message}
            </div>
          )}


          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading}
          >
            {
              loading
                ? 'Enviando...'
                : 'Enviar enlace'
            }
          </button>

        </form>


        <div className="auth-footer">
          <Link to="/login">
            Volver a iniciar sesión
          </Link>
        </div>

      </section>
    </div>
  )
}