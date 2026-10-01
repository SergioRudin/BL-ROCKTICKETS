import { useState } from 'react'
import {
  Link,
  useNavigate,
  useSearchParams
} from 'react-router-dom'

const API_URL = 'http://localhost:5000/api'

export default function ResetPasswordPage() {
  const navigate = useNavigate()

  const [searchParams] =
    useSearchParams()

  const token =
    searchParams.get('token') || ''

  const [form, setForm] =
    useState({
      newPassword: '',
      confirmPassword: ''
    })

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  const [loading, setLoading] =
    useState(false)


  function handleChange(event) {
    const {
      name,
      value
    } = event.target

    setForm(
      (prev) => ({
        ...prev,
        [name]: value
      })
    )
  }


  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setError('')


    if (!token) {
      setError(
        'El enlace de recuperación no es válido'
      )

      return
    }


    if (
      !form.newPassword ||
      !form.confirmPassword
    ) {
      setError(
        'Completa todos los campos'
      )

      return
    }


    if (
      form.newPassword !==
      form.confirmPassword
    ) {
      setError(
        'Las contraseñas no coinciden'
      )

      return
    }


    if (
      form.newPassword.length < 6
    ) {
      setError(
        'La contraseña debe tener al menos 6 caracteres'
      )

      return
    }


    try {
      setLoading(true)

      const response =
        await fetch(
          `${API_URL}/auth/reset-password`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({
                token,
                newPassword:
                  form.newPassword
              })
          }
        )


      const data =
        await response.json()


      if (!response.ok) {
        throw new Error(
          data.message ||
          'No se pudo actualizar la contraseña'
        )
      }


      setMessage(
        'Contraseña actualizada correctamente.'
      )


      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (error) {
      setError(
        error.message ||
        'No se pudo actualizar la contraseña'
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
            Nueva contraseña
          </h1>

          <p className="muted">
            Elegí una nueva contraseña para tu cuenta.
          </p>

        </div>


        {!token ? (

          <div className="auth-error">
            Este enlace de recuperación no es válido.
          </div>

        ) : (

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            <label>
              Nueva contraseña

              <input
                type="password"
                name="newPassword"
                value={
                  form.newPassword
                }
                onChange={
                  handleChange
                }
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </label>


            <label>
              Confirmar contraseña

              <input
                type="password"
                name="confirmPassword"
                value={
                  form.confirmPassword
                }
                onChange={
                  handleChange
                }
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
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
                  ? 'Actualizando...'
                  : 'Cambiar contraseña'
              }
            </button>

          </form>

        )}


        <div className="auth-footer">
          <Link to="/login">
            Volver a iniciar sesión
          </Link>
        </div>

      </section>

    </div>
  )
}