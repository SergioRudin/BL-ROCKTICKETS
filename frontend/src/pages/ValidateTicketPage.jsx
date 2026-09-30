import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

import {
  getTicketByCode,
  useTicket
} from '../utils/api'


function formatDate(date) {
  if (!date) {
    return 'No disponible'
  }

  return new Date(date).toLocaleString('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}


export default function ValidateTicketPage() {
  const scannerRef = useRef(null)

  const [ticketCode, setTicketCode] = useState('')
  const [ticket, setTicket] = useState(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)

  const [scannerActive, setScannerActive] = useState(false)
  const [scannerMessage, setScannerMessage] = useState('')


  const cleanCode =
    ticketCode
      .trim()
      .toUpperCase()


  // ========================================================
  // BUSCAR TICKET
  // ========================================================

  const searchTicket = async (code) => {
    const formattedCode =
      String(code || '')
        .trim()
        .toUpperCase()


    if (!formattedCode) {
      setError(
        'Ingresá un código de ticket'
      )

      setTicket(null)

      return
    }


    try {
      setLoading(true)

      setError('')
      setMessage('')
      setScannerMessage('')


      const data =
        await getTicketByCode(
          formattedCode
        )


      setTicketCode(
        formattedCode
      )


      /*
       * El backend MySQL devuelve
       * directamente el ticket:
       *
       * {
       *   id,
       *   ticketCode,
       *   eventTitle,
       *   ...
       * }
       */

      setTicket(data)
    } catch (error) {
      setTicket(null)

      setError(
        error.message ||
        'No se pudo buscar el ticket'
      )
    } finally {
      setLoading(false)
    }
  }


  // ========================================================
  // BÚSQUEDA MANUAL
  // ========================================================

  const handleSearch = async (event) => {
    event.preventDefault()

    await searchTicket(
      cleanCode
    )
  }


  // ========================================================
  // DETENER SCANNER
  // ========================================================

  const stopScanner = async () => {
    if (!scannerRef.current) {
      return
    }

    try {
      await scannerRef.current.clear()
    } catch (error) {
      console.error(
        'Error deteniendo scanner:',
        error
      )
    } finally {
      scannerRef.current = null

      setScannerActive(false)
    }
  }


  // ========================================================
  // INICIAR SCANNER
  // ========================================================

  const startScanner = async () => {
    try {
      setError('')
      setMessage('')

      setScannerMessage(
        'Activando cámara...'
      )


      const scanner =
        new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,

            qrbox: {
              width: 300,
              height: 300
            },

            rememberLastUsedCamera:
              true
          },
          false
        )


      scannerRef.current =
        scanner


      scanner.render(
        async (decodedText) => {
          const scannedCode =
            String(decodedText || '')
              .trim()
              .toUpperCase()


          setScannerMessage(
            `QR detectado: ${scannedCode}`
          )


          await stopScanner()

          await searchTicket(
            scannedCode
          )
        },

        () => {
          // Ignoramos errores normales
          // mientras la cámara busca un QR.
        }
      )


      setScannerActive(true)

      setScannerMessage(
        'Cámara activa. Apuntá al QR del ticket.'
      )
    } catch (error) {
      console.error(
        'Error iniciando scanner:',
        error
      )

      setScannerActive(false)

      setScannerMessage('')

      setError(
        'No se pudo activar la cámara. Revisá los permisos del navegador.'
      )
    }
  }


  const handleScannerToggle =
    async () => {
      if (scannerActive) {
        await stopScanner()

        setScannerMessage('')

        return
      }

      await startScanner()
    }


  // ========================================================
  // VALIDAR TICKET
  // ACTIVE -> USED
  // ========================================================

  const handleValidate = async () => {
    if (
      !ticket ||
      !ticket.id
    ) {
      return
    }


    try {
      setValidating(true)

      setError('')
      setMessage('')


      /*
       * Backend nuevo:
       *
       * PUT /api/tickets/:id/use
       */

      const data =
        await useTicket(
          ticket.id
        )


      /*
       * También devuelve directamente
       * el ticket actualizado.
       */

      setTicket(data)

      setMessage(
        'ACCESO AUTORIZADO'
      )
    } catch (error) {
      setError(
        error.message ||
        'No se pudo validar el ticket'
      )

      /*
       * Si falló porque ya estaba usado,
       * refrescamos el ticket para mostrar
       * el estado correcto.
       */

      try {
        const refreshed =
          await getTicketByCode(
            ticket.ticketCode
          )

        setTicket(
          refreshed
        )
      } catch (refreshError) {
        console.error(
          'Error actualizando ticket:',
          refreshError
        )
      }
    } finally {
      setValidating(false)
    }
  }


  // ========================================================
  // LIMPIEZA SCANNER
  // ========================================================

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .catch(() => {})
      }
    }
  }, [])


  // ========================================================
  // ESTADO
  // ========================================================

  const status =
    ticket && ticket.status
      ? ticket.status.toLowerCase()
      : ''


  const statusLabel = {
    ACTIVE: 'ACTIVO',
    USED: 'UTILIZADO',
    CANCELLED: 'CANCELADO'
  }


  const accessInfo = {
    ACTIVE: {
      icon: '✅',
      title: 'ACCESO DISPONIBLE',
      text:
        'Este ticket aún no ha sido utilizado.'
    },

    USED: {
      icon: '⚠️',
      title: 'TICKET YA UTILIZADO',
      text:
        'Esta entrada ya fue validada anteriormente.'
    },

    CANCELLED: {
      icon: '⛔',
      title: 'TICKET CANCELADO',
      text:
        'Esta entrada no es válida para ingresar.'
    }
  }


  const currentAccess =
    ticket && ticket.status
      ? accessInfo[ticket.status]
      : null


  // ========================================================
  // VIEW
  // ========================================================

  return (
    <section className="stack-lg">

      <div className="card-blur validate-hero">

        <span className="eyebrow">
          Control de acceso
        </span>

        <h2>
          Validar ticket
        </h2>

        <p>
          Escaneá o ingresá el código del ticket
          para confirmar si la entrada está activa,
          usada o cancelada.
        </p>


        {/* SCANNER */}

        <div className="scanner-panel">

          <div
            id="qr-reader"
            className="qr-reader"
          />


          <button
            className="btn-secondary"
            type="button"
            onClick={
              handleScannerToggle
            }
          >
            {scannerActive
              ? 'Detener cámara'
              : 'Escanear QR'}
          </button>


          {scannerMessage && (
            <p className="scanner-message">
              {scannerMessage}
            </p>
          )}

        </div>


        {/* BÚSQUEDA MANUAL */}

        <form
          className="validate-form"
          onSubmit={handleSearch}
        >

          <input
            type="text"
            placeholder="Ej: TQ-868943-JNL30Z"
            value={ticketCode}

            onChange={(event) =>
              setTicketCode(
                event.target.value.toUpperCase()
              )
            }
          />


          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Buscando...'
              : 'Buscar ticket'}
          </button>

        </form>

      </div>


      {/* ERROR */}

      {error && (
        <div className="validate-alert validate-alert--error">
          {error}
        </div>
      )}


      {/* ÉXITO */}

      {message && (
        <div className="validate-alert validate-alert--success">
          {message}
        </div>
      )}


      {/* TICKET */}

      {ticket && (

        <article
          className={
            `card-blur validate-card validate-card--${status}`
          }
        >

          {/* RESULTADO */}

          {currentAccess && (

            <div
              className={
                `access-result access-result--${status}`
              }
            >

              <span className="access-result__icon">
                {currentAccess.icon}
              </span>

              <strong>
                {currentAccess.title}
              </strong>

              <span>
                {currentAccess.text}
              </span>

            </div>

          )}


          {/* VALIDACIÓN PREVIA */}

          {ticket.usedAt && (

            <div className="validation-record">

              <span>
                Registro de validación
              </span>

              <strong>
                {formatDate(
                  ticket.usedAt
                )}
              </strong>

            </div>

          )}


          {/* HEADER */}

          <div className="validate-card__header">

            <div>

              <span
                className={
                  `ticket-status ${status}`
                }
              >
                {
                  statusLabel[
                    ticket.status
                  ] ||
                  ticket.status
                }
              </span>


              <h3>
                {
                  ticket.eventTitle ||
                  'Evento no disponible'
                }
              </h3>


              <p>
                {
                  ticket.eventArtist ||
                  'Artista no disponible'
                }
                {' · '}
                {
                  ticket.eventVenue ||
                  'Venue no disponible'
                }
                {
                  ticket.eventCity
                    ? `, ${ticket.eventCity}`
                    : ''
                }
              </p>

            </div>


            <strong className="validate-card__zone">
              {ticket.zoneName}
            </strong>

          </div>


          {/* DETAILS */}

          <div className="validate-details">

            <div>
              <span>Titular</span>

              <strong>
                {
                  ticket.ownerName ||
                  ticket.buyerName
                }
              </strong>
            </div>


            <div>
              <span>Email titular</span>

              <strong>
                {
                  ticket.ownerEmail ||
                  ticket.buyerEmail
                }
              </strong>
            </div>


            <div>
              <span>Código</span>

              <strong className="ticket-code-text">
                {ticket.ticketCode}
              </strong>
            </div>


            <div>
              <span>
                Fecha del evento
              </span>

              <strong>
                {formatDate(
                  ticket.eventDate
                )}
              </strong>
            </div>


            <div>
              <span>Zona</span>

              <strong>
                {ticket.zoneName}
              </strong>
            </div>


            <div>
              <span>Precio</span>

              <strong>
                ₡
                {
                  Number(
                    ticket.price || 0
                  ).toLocaleString(
                    'es-CR'
                  )
                }
              </strong>
            </div>


            <div>
              <span>Validado</span>

              <strong>
                {ticket.usedAt
                  ? 'Sí'
                  : 'No'}
              </strong>
            </div>


            <div>
              <span>Orden</span>

              <strong>
                {
                  ticket.orderId ||
                  'No disponible'
                }
              </strong>
            </div>

          </div>


          {/* VALIDAR */}

          <button
            className="btn-primary validate-action"

            onClick={
              handleValidate
            }

            disabled={
              validating ||
              ticket.status !==
                'ACTIVE'
            }
          >

            {validating
              ? 'Validando...'
              : ticket.status === 'ACTIVE'
                ? 'Validar ingreso'
                : ticket.status === 'USED'
                  ? 'Ticket ya utilizado'
                  : 'Ticket no válido'}

          </button>

        </article>

      )}

    </section>
  )
}