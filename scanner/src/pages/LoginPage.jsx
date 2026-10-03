import {
  useState
} from 'react'

import {
  useNavigate
} from 'react-router-dom'

import {
  useAuth
} from '../context/AuthContext'


export default function LoginPage() {
  const navigate =
    useNavigate()

  const {
    login
  } = useAuth()


  const [form, setForm] =
    useState({
      email: '',
      password: ''
    })


  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')


  function handleChange(e) {
    const {
      name,
      value
    } = e.target


    setForm(
      (prev) => ({
        ...prev,
        [name]: value
      })
    )
  }


  async function handleSubmit(e) {
    e.preventDefault()

    setError('')


    if (
      !form.email.trim() ||
      !form.password
    ) {
      setError(
        'Completa el correo y la contraseña'
      )

      return
    }


    try {
      setLoading(true)


      await login(
        form.email.trim(),
        form.password
      )


      navigate(
        '/events'
      )
    } catch (error) {
      console.error(
        'Error login scanner:',
        error
      )

      setError(
        error.message ||
        'No se pudo iniciar sesión'
      )
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="scanner-auth-page">

      <section className="scanner-login-card">

        <div className="scanner-brand">
          RockTickets
        </div>


        <div className="scanner-badge">
          STAFF ACCESS
        </div>


        <h1>
          Scanner
        </h1>


        <p className="scanner-muted">
          Acceso exclusivo para personal autorizado.
        </p>


        <form
          className="scanner-form"
          onSubmit={handleSubmit}
        >

          <label>

            Correo

            <input
              type="email"
              name="email"
              value={
                form.email
              }
              onChange={
                handleChange
              }
              placeholder="staff@rocktickets.com"
              autoComplete="email"
              disabled={loading}
            />

          </label>


          <label>

            Contraseña

            <input
              type="password"
              name="password"
              value={
                form.password
              }
              onChange={
                handleChange
              }
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />

          </label>


          {
            error && (
              <div className="scanner-error">
                {error}
              </div>
            )
          }


          <button
            type="submit"
            className="scanner-primary-button"
            disabled={loading}
          >
            {
              loading
                ? 'Ingresando...'
                : 'Ingresar'
            }
          </button>

        </form>

      </section>

    </div>
  )
}