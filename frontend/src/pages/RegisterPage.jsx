import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Completa todos los campos')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      setLoading(true)

      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      })

      navigate('/tickets')
    } catch (err) {
      setError(
        err.message ||
        'No se pudo crear la cuenta'
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

          <h1>Crear cuenta</h1>

          <p className="muted">
            Regístrate para guardar tus entradas,
            administrar transferencias y acceder a tus tickets.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label>
            Nombre completo

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Tu nombre"
              autoComplete="name"
            />
          </label>

          <label>
            Correo electrónico

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </label>

          <label>
            Contraseña

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </label>

          <label>
            Confirmar contraseña

            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Creando cuenta...'
              : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-footer">
          <span>
            ¿Ya tienes cuenta?
          </span>

          <Link to="/login">
            Iniciar sesión
          </Link>
        </div>
      </section>
    </div>
  )
}
