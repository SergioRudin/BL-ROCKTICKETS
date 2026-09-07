import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectTo = location.state?.from?.pathname || '/'

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((current) => ({
      ...current,
      [name]: value
    }))

    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email.trim() || !formData.password) {
      setError('Ingresá tu correo y contraseña.')
      return
    }

    try {
      setLoading(true)
      setError('')

      await login({
        email: formData.email.trim(),
        password: formData.password
      })

      navigate(redirectTo, {
        replace: true
      })
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-visual">
          <div className="auth-visual__glow"></div>

          <div className="auth-visual__content">
            <span className="auth-kicker">
              ⚡ ACCESO ROCKTICKETS
            </span>

            <h1>
              Volvé al lugar donde comienza el show.
            </h1>

            <p>
              Iniciá sesión para administrar tus entradas, descargar tus tickets
              y consultar tus próximos eventos.
            </p>

            <div className="auth-features">
              <div>
                <span>01</span>
                <p>Todos tus tickets en un solo lugar</p>
              </div>

              <div>
                <span>02</span>
                <p>Transferencias oficiales y seguras</p>
              </div>

              <div>
                <span>03</span>
                <p>Acceso rápido a tus códigos QR</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-panel__header">
            <div className="auth-mini-logo">
              ⚡
            </div>

            <div>
              <span>RockTickets</span>
              <small>Ticketera para shows extremos</small>
            </div>
          </div>

          <div className="auth-form-heading">
            <span className="auth-eyebrow">
              BIENVENIDO DE NUEVO
            </span>

            <h2>Iniciar sesión</h2>

            <p>
              Ingresá tus datos para continuar.
            </p>
          </div>

          {error && (
            <div className="auth-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">
              Correo electrónico
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">✉</span>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nombre@correo.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="auth-password-row">
              <label htmlFor="password">
                Contraseña
              </label>

              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => {
                  alert('La recuperación de contraseña será nuestra próxima mejora.')
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">◆</span>

              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Ingresá tu contraseña"
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="auth-spinner"></span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span></span>
            <p>NUEVO EN ROCKTICKETS</p>
            <span></span>
          </div>

          <p className="auth-register-message">
            ¿Todavía no tenés una cuenta?
          </p>

          <Link
            to="/register"
            className="auth-register-button"
          >
            Crear cuenta
          </Link>

          <p className="auth-legal">
            Al ingresar aceptás los términos de uso y la política de privacidad
            de RockTickets.
          </p>
        </div>
      </section>
    </main>
  )
}