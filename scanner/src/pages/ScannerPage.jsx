import {
  useEffect,
  useRef,
  useState
} from 'react'

import {
  useNavigate,
  useParams
} from 'react-router-dom'

import {
  Html5QrcodeScanner
} from 'html5-qrcode'

import {
  getScannerEvents,
  getTicketByCode,
  validateTicket
} from '../utils/api'

import {
  useAuth
} from '../context/AuthContext'


export default function ScannerPage() {
  const {
    eventId
  } = useParams()

  const navigate =
    useNavigate()

  const {
    user,
    logout
  } = useAuth()


  const scannerRef =
    useRef(null)

  const scannerRunningRef =
    useRef(false)

  const processingRef =
    useRef(false)


  const [event, setEvent] =
    useState(null)

  const [manualCode, setManualCode] =
    useState('')
const [sessionCount, setSessionCount] =
  useState(0)

const [lastValidated, setLastValidated] =
  useState(null)

const [isOnline, setIsOnline] =
  useState(
    navigator.onLine
  )
  const [scannerActive, setScannerActive] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  const [result, setResult] =
    useState(null)

  const [error, setError] =
    useState('')

useEffect(() => {
  function handleOnline() {
    setIsOnline(true)
  }

  function handleOffline() {
    setIsOnline(false)
  }

  window.addEventListener(
    'online',
    handleOnline
  )

  window.addEventListener(
    'offline',
    handleOffline
  )

  return () => {
    window.removeEventListener(
      'online',
      handleOnline
    )

    window.removeEventListener(
      'offline',
      handleOffline
    )
  }
}, [])
  useEffect(() => {
    loadEvent()

    return () => {
      destroyScanner()
    }
  }, [eventId])


  async function loadEvent() {
    try {
      const events =
        await getScannerEvents()

      const foundEvent =
        Array.isArray(events)
          ? events.find(
              (item) =>
                String(item.id) ===
                String(eventId)
            )
          : null


      if (!foundEvent) {
        setError(
          'Evento no encontrado'
        )

        return
      }


      setEvent(
        foundEvent
      )
    } catch (error) {
      console.error(
        'Error cargando evento:',
        error
      )

      setError(
        'No se pudo cargar el evento'
      )
    }
  }


  function startScanner() {
    if (
      scannerRunningRef.current
    ) {
      return
    }


    setResult(null)
    setError('')
    setScannerActive(true)


    setTimeout(() => {
      const scanner =
        new Html5QrcodeScanner(
          'rocktickets-reader',
          {
            fps: 10,

            qrbox: {
              width: 250,
              height: 250
            },

            rememberLastUsedCamera:
              true,

            supportedScanTypes: []
          },
          false
        )


      scannerRef.current =
        scanner

      scannerRunningRef.current =
        true


      scanner.render(
        async (
          decodedText
        ) => {
          if (
            processingRef.current
          ) {
            return
          }


          processingRef.current =
            true


          await stopScanner()


          await processCode(
            decodedText
          )


          processingRef.current =
            false
        },

        () => {
          /*
            Los errores normales de lectura
            mientras la cámara busca un QR
            no necesitan mostrarse.
          */
        }
      )
    }, 100)
  }


  async function stopScanner() {
    if (
      !scannerRef.current
    ) {
      scannerRunningRef.current =
        false

      setScannerActive(false)

      return
    }


    try {
      await scannerRef.current.clear()
    } catch (error) {
      console.log(
        'Scanner ya detenido'
      )
    }


    scannerRef.current =
      null

    scannerRunningRef.current =
      false

    setScannerActive(false)
  }


  function destroyScanner() {
    if (
      scannerRef.current
    ) {
      scannerRef.current
        .clear()
        .catch(() => {})

      scannerRef.current =
        null
    }

    scannerRunningRef.current =
      false
  }


  async function processCode(
    rawCode
  ) {
    const code =
      String(
        rawCode || ''
      ).trim()


    if (!code) {
      setResult({
        type: 'error',
        title:
          'Código inválido',
        message:
          'No se recibió un código válido.'
      })

      return
    }


    try {
      setLoading(true)
      setError('')
      setResult(null)


      // ==========================================
      // BUSCAR TICKET
      // ==========================================

      const ticket =
        await getTicketByCode(
          code
        )


      if (!ticket) {
        setResult({
          type: 'error',
          title:
            'Ticket no encontrado',
          message:
            'El código no corresponde a una entrada válida.'
        })

        return
      }


      // ==========================================
      // COMPROBAR EVENTO
      // ==========================================

      if (
        String(
          ticket.eventId
        ) !==
        String(
          eventId
        )
      ) {
        setResult({
          type: 'error',

          title:
            'EVENTO INCORRECTO',

          message:
            'Este ticket pertenece a otro evento.',

          ticket
        })

        return
      }


      // ==========================================
      // TICKET YA UTILIZADO
      // ==========================================

      if (
        ticket.status ===
        'USED'
      ) {
        setResult({
          type: 'error',

          title:
            'TICKET YA UTILIZADO',

          message:
            'Esta entrada ya fue validada anteriormente.',

          ticket
        })

        return
      }


      // ==========================================
      // CANCELADO
      // ==========================================

      if (
        ticket.status ===
        'CANCELLED'
      ) {
        setResult({
          type: 'error',

          title:
            'TICKET CANCELADO',

          message:
            'Esta entrada fue cancelada y no permite acceso.',

          ticket
        })

        return
      }


      // ==========================================
      // ESTADO DESCONOCIDO
      // ==========================================

      if (
        ticket.status !==
        'ACTIVE'
      ) {
        setResult({
          type: 'error',

          title:
            'TICKET NO VÁLIDO',

          message:
            `Estado actual: ${ticket.status}`,

          ticket
        })

        return
      }


      // ==========================================
      // VALIDAR
      // ==========================================

      const validation =
        await validateTicket(
          ticket.id
        )


      const validatedTicket =
        validation.ticket
          ? validation.ticket
          : validation

const validatedAt =
  new Date()

setSessionCount(
  (prev) => prev + 1
)

setLastValidated({
  ticketCode:
    validatedTicket.ticketCode,

  zoneName:
    validatedTicket.zoneName ||
    validatedTicket.zoneCode ||
    'Sin zona',

  ownerName:
    validatedTicket.ownerName ||
    validatedTicket.buyerName ||
    'Sin nombre',

  time:
    validatedAt
})
      setResult({
        type: 'success',

        title:
          'ACCESO PERMITIDO',

        message:
          'Entrada validada correctamente.',

        ticket:
          validatedTicket
      })
    } catch (error) {
      console.error(
        'Error validando ticket:',
        error
      )


      setResult({
        type: 'error',

        title:
          'ACCESO DENEGADO',

        message:
          error.message ||
          'No se pudo validar la entrada.'
      })
    } finally {
      setLoading(false)
    }
  }


  async function handleManualSubmit(
    e
  ) {
    e.preventDefault()

    if (
      !manualCode.trim()
    ) {
      return
    }


    await stopScanner()


    await processCode(
      manualCode
    )


    setManualCode('')
  }


  function handleNextScan() {
    setResult(null)
    setError('')
    setManualCode('')

    startScanner()
  }


  function handleLogout() {
    destroyScanner()

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
            Access Scanner
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


      <main className="scanner-content scanner-content-narrow">

        <button
          type="button"
          className="scanner-back-button"
          onClick={() =>
            navigate(
              '/events'
            )
          }
        >
          ← Cambiar evento
        </button>


        {
          event && (
            <section className="scanner-selected-event">

              <div className="scanner-event-label">
                VALIDANDO ACCESO PARA
              </div>


              <h1>
                {event.title}
              </h1>


              {
                event.artist && (
                  <p className="scanner-selected-artist">
                    {event.artist}
                  </p>
                )
              }


              <div className="scanner-selected-meta">

                <span>
                  {
                    event.venue ||
                    'Venue por confirmar'
                  }
                </span>

                {
                  event.city && (
                    <span>
                      {event.city}
                    </span>
                  )
                }

              </div>

            </section>
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
          !result && (
            <>

              <section className="scanner-camera-card">

                <div className="scanner-camera-header">

                  <div>

                    <h2>
                      Escanear QR
                    </h2>

                    <p className="scanner-muted">
                      Colocá el código dentro del cuadro.
                    </p>

                  </div>


                  {
                    !scannerActive
                      ? (
                        <button
                          type="button"
                          className="scanner-primary-button scanner-small-button"
                          onClick={startScanner}
                          disabled={loading}
                        >
                          Abrir cámara
                        </button>
                      )
                      : (
                        <button
                          type="button"
                          className="scanner-ghost-button"
                          onClick={stopScanner}
                        >
                          Detener
                        </button>
                      )
                  }

                </div>


                {
                  scannerActive && (
                    <div className="scanner-reader-container">

                      <div
                        id="rocktickets-reader"
                      />

                    </div>
                  )
                }


                {
                  !scannerActive && (
                    <div className="scanner-camera-placeholder">

                      <div className="scanner-camera-icon">
                        ▣
                      </div>

                      <p>
                        Cámara detenida
                      </p>

                    </div>
                  )
                }

              </section>


              <div className="scanner-divider">

                <span>
                  O
                </span>

              </div>


              <section className="scanner-manual-card">

                <h2>
                  Código manual
                </h2>


                <p className="scanner-muted">
                  Usalo si la cámara no puede leer el QR.
                </p>


                <form
                  className="scanner-manual-form"
                  onSubmit={
                    handleManualSubmit
                  }
                >

                  <input
                    type="text"
                    value={
                      manualCode
                    }
                    onChange={(e) =>
                      setManualCode(
                        e.target.value
                      )
                    }
                    placeholder="TQ-..."
                    disabled={loading}
                    autoComplete="off"
                  />


                  <button
                    type="submit"
                    className="scanner-primary-button"
                    disabled={
                      loading ||
                      !manualCode.trim()
                    }
                  >
                    {
                      loading
                        ? 'Validando...'
                        : 'Validar entrada'
                    }
                  </button>

                </form>

              </section>

            </>
          )
        }


        {
          result && (
            <ValidationResult
              result={result}
              onNext={
                handleNextScan
              }
            />
          )
        }

      </main>

    </div>
  )
}


function ValidationResult({
  result,
  onNext
}) {
  const ticket =
    result.ticket


  const success =
    result.type ===
    'success'


  return (
    <section
      className={
        success
          ? 'scanner-result scanner-result-success'
          : 'scanner-result scanner-result-error'
      }
    >

      <div className="scanner-result-icon">

        {
          success
            ? '✓'
            : '✕'
        }

      </div>


      <div className="scanner-result-status">

        {
          success
            ? 'VALIDADO'
            : 'RECHAZADO'
        }

      </div>


      <h1>
        {result.title}
      </h1>


      <p>
        {result.message}
      </p>


      {
        ticket && (
          <div className="scanner-ticket-info">

            <InfoRow
              label="Ticket"
              value={
                ticket.ticketCode
              }
            />


            <InfoRow
              label="Titular"
              value={
                ticket.ownerName ||
                ticket.buyerName ||
                'Sin nombre'
              }
            />


            <InfoRow
              label="Zona"
              value={
                ticket.zoneName ||
                ticket.zoneCode ||
                'Sin zona'
              }
            />


            <InfoRow
              label="Estado"
              value={
                ticket.status ||
                ''
              }
            />


            {
              ticket.usedAt && (
                <InfoRow
                  label="Validado"
                  value={
                    new Date(
                      ticket.usedAt
                    ).toLocaleString(
                      'es-CR'
                    )
                  }
                />
              )
            }

          </div>
        )
      }


      <button
        type="button"
        className={
          success
            ? 'scanner-result-button scanner-result-button-success'
            : 'scanner-result-button scanner-result-button-error'
        }
        onClick={onNext}
      >
        Escanear siguiente
      </button>

    </section>
  )
}


function InfoRow({
  label,
  value
}) {
  return (
    <div className="scanner-info-row">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  )
}