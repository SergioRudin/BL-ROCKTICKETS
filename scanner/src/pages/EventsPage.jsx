import {
  useEffect,
  useState
} from 'react'

import {
  useNavigate
} from 'react-router-dom'

import {
  getScannerEvents
} from '../utils/api'

import {
  useAuth
} from '../context/AuthContext'


export default function EventsPage() {
  const navigate =
    useNavigate()

  const {
    user,
    logout
  } = useAuth()


  const [events, setEvents] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')


  useEffect(() => {
    loadEvents()
  }, [])


  async function loadEvents() {
    try {
      setLoading(true)

      const data =
        await getScannerEvents()

      setEvents(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (error) {
      console.error(error)

      setError(
        error.message ||
        'No se pudieron cargar los eventos'
      )
    } finally {
      setLoading(false)
    }
  }


  function handleLogout() {
    logout()

    navigate(
      '/login'
    )
  }


  return (
    <div className="scanner-page">

      <header className="scanner-topbar">

        <div>

          <div className="scanner-brand">
            RockTickets
          </div>

          <div className="scanner-topbar-subtitle">
            Scanner
          </div>

        </div>


        <div className="scanner-user-box">

          <span>
            {
              user
                ? user.name
                : 'Staff'
            }
          </span>

          <span className="scanner-role">
            {
              user
                ? user.role
                : ''
            }
          </span>


          <button
            type="button"
            className="scanner-ghost-button"
            onClick={handleLogout}
          >
            Salir
          </button>

        </div>

      </header>


      <main className="scanner-content">

        <div className="scanner-section-header">

          <div>

            <h1>
              Seleccioná el evento
            </h1>

            <p className="scanner-muted">
              Elegí el evento que vas a validar.
            </p>

          </div>

        </div>


        {
          loading && (
            <p className="scanner-muted">
              Cargando eventos...
            </p>
          )
        }


        {
          error && (
            <div className="scanner-error">
              {error}
            </div>
          )
        }


        {
          !loading &&
          !error &&
          !events.length && (
            <p className="scanner-muted">
              No hay eventos disponibles.
            </p>
          )
        }


        <div className="scanner-events-grid">

          {
            events.map(
              (event) => (
                <button
                  type="button"
                  className="scanner-event-card"
                  key={event.id}
                  onClick={() =>
                    navigate(
                      `/scanner/${event.id}`
                    )
                  }
                >

                  <div className="scanner-event-title">
                    {event.title}
                  </div>


                  {
                    event.artist && (
                      <div className="scanner-event-artist">
                        {event.artist}
                      </div>
                    )
                  }


                  <div className="scanner-event-meta">

                    <span>
                      {
                        event.venue ||
                        'Venue por confirmar'
                      }
                    </span>

                    <span>
                      {
                        event.city ||
                        ''
                      }
                    </span>

                  </div>

                </button>
              )
            )
          }

        </div>

      </main>

    </div>
  )
}