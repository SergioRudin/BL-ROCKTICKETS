import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { getTicketByCode, useTicketByCode } from '../utils/api'

function formatDate(date) {
  if (!date) return 'No disponible'

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

  const cleanCode = ticketCode.trim().toUpperCase()

  const searchTicket = async (code) => {
    const formattedCode = code.trim().toUpperCase()

    if (!formattedCode) {
      setError('Ingresá un código de ticket')
      setTicket(null)
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')
      setScannerMessage('')

      const data = await getTicketByCode(formattedCode)

      setTicketCode(formattedCode)
      setTicket(data.ticket)
    } catch (error) {
      setTicket(null)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    await searchTicket(cleanCode)
  }

const stopScanner = async () => {
  if (!scannerRef.current) return

  try {
    await scannerRef.current.clear()
  } catch (error) {
    console.error('Error deteniendo scanner:', error)
  } finally {
    scannerRef.current = null
    setScannerActive(false)
  }
}

const startScanner = async () => {
  try {
    setError('')
    setMessage('')
    setScannerMessage('Activando cámara...')

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: {
          width: 300,
          height: 300
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: []
      },
      false
    )

    scannerRef.current = scanner

    scanner.render(
      async (decodedText) => {
        alert(`QR detectado: ${decodedText}`)

        const scannedCode = decodedText.trim().toUpperCase()

        setScannerMessage(`QR detectado: ${scannedCode}`)

        await stopScanner()
        await searchTicket(scannedCode)
      },
      () => {}
    )

    setScannerActive(true)
    setScannerMessage('Cámara activa. Apuntá al QR del ticket.')
  } catch (error) {
    console.error('Error iniciando scanner:', error)
    setScannerActive(false)
    setScannerMessage('')
    setError('No se pudo activar la cámara. Revisá permisos del navegador.')
  }
}
  const handleScannerToggle = async () => {
    if (scannerActive) {
      await stopScanner()
      setScannerMessage('')
      return
    }

    await startScanner()
  }

  const handleValidate = async () => {
    if (!ticket?.ticketCode) return

    try {
      setValidating(true)
      setError('')
      setMessage('')

      const data = await useTicketByCode(ticket.ticketCode)

      setTicket(data.ticket)
      setMessage('ACCESO AUTORIZADO')
    } catch (error) {
      setError(error.message)
    } finally {
      setValidating(false)
    }
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const status = ticket?.status?.toLowerCase()

  const statusLabel = {
  ACTIVE: 'ACTIVO',
  USED: 'UTILIZADO',
  CANCELLED: 'CANCELADO'
}

const accessInfo = {
  ACTIVE: {
    icon: '✅',
    title: 'ACCESO DISPONIBLE',
    text: 'Este ticket aún no ha sido utilizado.'
  },
  USED: {
    icon: '⚠️',
    title: 'TICKET YA UTILIZADO',
    text: 'Esta entrada ya fue validada anteriormente.'
  },
  CANCELLED: {
    icon: '⛔',
    title: 'TICKET CANCELADO',
    text: 'Esta entrada no es válida para ingresar.'
  }
}

const currentAccess = accessInfo[ticket?.status]

  return (
    <section className="stack-lg">
      <div className="card-blur validate-hero">
        <span className="eyebrow">Control de acceso</span>
        <h2>Validar ticket</h2>
        <p>
          Escaneá o ingresá el código del ticket para confirmar si la entrada está activa,
          usada o cancelada.
        </p>

        <div className="scanner-panel">
          <div id="qr-reader" className="qr-reader"></div>

          <button
            className="btn-secondary"
            type="button"
            onClick={handleScannerToggle}
          >
            {scannerActive ? 'Detener cámara' : 'Escanear QR'}
          </button>

          {scannerMessage && (
            <p className="scanner-message">
              {scannerMessage}
            </p>
          )}
        </div>

        <form className="validate-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Ej: TQ-868943-JNL30Z"
            value={ticketCode}
            onChange={(event) => setTicketCode(event.target.value.toUpperCase())}
          />

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar ticket'}
          </button>
        </form>
      </div>

      {error && (
        <div className="validate-alert validate-alert--error">
          {error}
        </div>
      )}

      {message && (
        <div className="validate-alert validate-alert--success">
          {message}
        </div>
      )}

    {ticket && (
    <article className={`card-blur validate-card validate-card--${status}`}>
 {currentAccess && (
    <div className={`access-result access-result--${status}`}>
      <span className="access-result__icon">{currentAccess.icon}</span>
      <strong>{currentAccess.title}</strong>
      <span>{currentAccess.text}</span>
    </div>
  )}

  {ticket.usedAt && (
  <div className="validation-record">
    <span>Registro de validación</span>
    <strong>{formatDate(ticket.usedAt)}</strong>
  </div>
)}

          <div className="validate-card__header">
            <div>
            <span className={`ticket-status ${status}`}>
            {statusLabel[ticket.status] || ticket.status}
            </span>


              <h3>{ticket.event?.title || 'Evento no disponible'}</h3>
              <p>
                {ticket.event?.artist} · {ticket.event?.venue}, {ticket.event?.city}
              </p>
            </div>

            <strong className="validate-card__zone">
              {ticket.zoneName}
            </strong>
          </div>

          <div className="validate-details">
            <div>
              <span>Comprador</span>
              <strong>{ticket.buyerName}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{ticket.buyerEmail}</strong>
            </div>

            <div>
              <span>Código</span>
              <strong className="ticket-code-text">{ticket.ticketCode}</strong>
            </div>

            <div>
              <span>Fecha del evento</span>
              <strong>{formatDate(ticket.event?.date)}</strong>
            </div>

            <div>
              <span>Precio</span>
              <strong>₡{Number(ticket.price).toLocaleString('es-CR')}</strong>
            </div>

     <div>
        <span>Validado</span>
        <strong>{ticket.usedAt ? 'Sí' : 'No'}</strong>       
    </div>
    </div>

          <button
            className="btn-primary validate-action"
            onClick={handleValidate}
            disabled={validating || ticket.status !== 'ACTIVE'}
          >
            {validating ? 'Validando...' : 'Validar ingreso'}
          </button>
        </article>
      )}
    </section>
  )
}

