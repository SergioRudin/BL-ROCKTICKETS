import { QRCodeCanvas } from 'qrcode.react'
import { useRef } from 'react'
import jsPDF from 'jspdf'

  export default function TicketCard({ticket,onTransfer}) {
  const displayCode = ticket?.ticketCode || ticket?.ticketId || ''
  const qrValue = displayCode
  const ticketRef = useRef(null)
  const hasBeenTransferred = ticket?.transferHistory?.length > 0
  

  const downloadPdf = () => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const colors = {
    background: [7, 7, 7],
    panel: [18, 18, 18],
    header: [34, 34, 34],
    red: [239, 68, 68],
    redSoft: [255, 107, 87],
    white: [255, 255, 255],
    muted: [160, 160, 160],
    line: [70, 70, 70],
    greenBg: [22, 101, 52],
    greenBorder: [74, 222, 128],
    greenText: [187, 247, 208],
    usedBg: [92, 64, 20],
    usedBorder: [255, 189, 89],
    usedText: [255, 224, 163],
    cancelledBg: [127, 29, 29],
    cancelledBorder: [255, 107, 107],
    cancelledText: [255, 180, 180],
    zoneGeneralBg: [37, 49, 74],
    zoneGeneralBorder: [96, 165, 250],
    zoneGeneralText: [239, 246, 255],
    zoneVipBg: [96, 56, 19],
    zoneVipBorder: [251, 191, 36],
    zoneVipText: [255, 244, 194]
    
  }

  const setFill = (color) => pdf.setFillColor(...color)
  const setText = (color) => pdf.setTextColor(...color)
  const setDraw = (color) => pdf.setDrawColor(...color)

  const eventDate = new Date(ticket.date).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  const statusConfig = {
    ACTIVE: {
      label: 'ACTIVO',
      fill: colors.greenBg,
      border: colors.greenBorder,
      text: colors.greenText
    },
    USED: {
      label: 'UTILIZADO',
      fill: colors.usedBg,
      border: colors.usedBorder,
      text: colors.usedText
    },
    CANCELLED: {
      label: 'CANCELADO',
      fill: colors.cancelledBg,
      border: colors.cancelledBorder,
      text: colors.cancelledText
    }
  }[ticket.status] || {
    label: ticket.status || 'SIN ESTADO',
    fill: colors.header,
    border: colors.line,
    text: colors.white
  }

 const zoneConfig =
  ticket.zone === 'VIP'
    ? {
        label: 'VIP',
        fill: colors.zoneVipBg,
        border: colors.zoneVipBorder,
        text: colors.zoneVipText
      }
    : {
        label: 'GENERAL',
        fill: colors.zoneGeneralBg,
        border: colors.zoneGeneralBorder,
        text: colors.zoneGeneralText
      }

  const qrCanvas = ticketRef.current?.querySelector('canvas')
  const qrImage = qrCanvas?.toDataURL('image/png')

  // Fondo
  setFill(colors.background)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')

  // Header
  setFill(colors.header)
  pdf.roundedRect(12, 12, pageWidth - 24, 34, 5, 5, 'F')

  setText(colors.red)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.text('RockTickets', 20, 28)

  setText(colors.muted)
  pdf.setFontSize(10)
  pdf.text('Ticket oficial para shows extremos', 20, 36)

  setFill(colors.red)
  pdf.roundedRect(pageWidth - 70, 20, 42, 10, 3, 3, 'F')

  setText(colors.white)
  pdf.setFontSize(8)
  pdf.text('ENTRADA DIGITAL', pageWidth - 49, 26.5, { align: 'center' })

  // Evento
  setText(colors.white)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(22)

  const titleLines = pdf.splitTextToSize(
    ticket.eventTitle || 'Evento',
    pageWidth - 40
  )

  pdf.text(titleLines, 20, 64)

  setText(colors.redSoft)
  pdf.setFontSize(11)
  pdf.text(eventDate.toUpperCase(), 20, 82)

  setText([190, 190, 190])
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)
  pdf.text(ticket.venue || 'Venue no disponible', 20, 90)

  pdf.setTextColor(28, 28, 28)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(42)

  pdf.text('ROCKTICKETS',pageWidth / 2,162,
  {align: 'center' })


  // Panel QR

  setText([18,18,18])
  pdf.setFont('helvetica','bold')
  pdf.setFontSize(44)

  pdf.text(
    'ROCKTICKETS',
    pageWidth/2,
    158,
    {align:'center'}
  )

  const panelX = 15
  const panelY = 98
  const panelW = pageWidth - 30
  const panelH = 112

  setFill(colors.panel)
  setDraw(colors.red)
  pdf.setLineWidth(0.35)
  pdf.roundedRect(panelX, panelY, panelW, panelH, 6, 6, 'FD')

  if (qrImage) {
    setFill(colors.white)
    pdf.roundedRect(65, 111, 80, 80, 4, 4, 'F')
    pdf.addImage(qrImage, 'PNG', 71, 117, 68, 68)
  }

  setText(colors.redSoft)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(displayCode, pageWidth / 2, 198, { align: 'center' })

  setText(colors.muted)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('Código oficial del ticket', pageWidth / 2, 204, {
    align: 'center'
  })

  // Datos
  const infoY = 218

  setText(colors.muted)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('COMPRADOR', 20, infoY)

  setText(colors.white)
  pdf.setFontSize(12)
  pdf.text(ticket.buyer?.name || 'Invitado', 20, infoY + 8)

  setDraw([45,45,45])
  pdf.line(105,220,105,260)

  setText(colors.muted)
  pdf.setFontSize(8)
  pdf.text('EMAIL', 115, infoY)

  setText(colors.white)
  pdf.setFontSize(10)
  pdf.text(ticket.buyer?.email || ticket.buyerEmail || 'No disponible', 115, infoY + 8)

  const issueDate = new Date()

  const issueText =
  issueDate.toLocaleDateString('es-CR') + ' ' +
  issueDate.toLocaleTimeString('es-CR', {
  hour: '2-digit',
  minute: '2-digit'})


  setText(colors.muted)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('ZONA', 20, infoY + 18)

  setText(colors.white)
  pdf.setFontSize(12)
  pdf.text(ticket.zone || 'General', 20, infoY + 25)

  setFill(zoneConfig.fill)
  setDraw(zoneConfig.border)
  pdf.roundedRect(20,infoY + 21,40,10,3,3,'FD')

  setText(zoneConfig.text)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
 

  pdf.text(zoneConfig.label,40,infoY + 27.5,
  {align: 'center'}
)

  setText(colors.muted)
  pdf.setFontSize(8)
  pdf.text('ESTADO', 115, infoY + 18)

  const orderText =
  ticket.orderId ||
  displayCode.replace('TQ', 'ORD')
  const priceText = ticket.price
  ? `CRC ${Number(ticket.price).toLocaleString('es-CR')}`
  : 'No disponible'

  setText(colors.muted)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('ORDEN', 20, infoY + 37)



  setText(colors.white)
  pdf.setFontSize(10)
  pdf.text(orderText, 20, infoY + 45)

  setText(colors.muted)
  pdf.setFontSize(8)
  pdf.text('PRECIO', 115, infoY + 37)

  setText(colors.white)
  pdf.setFontSize(10)
  pdf.text(priceText, 115, infoY + 45)

  setFill(statusConfig.fill)
  setDraw(statusConfig.border)
  pdf.roundedRect(115, infoY + 21, 36, 10, 3, 3, 'FD')

  setText(statusConfig.text)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text(statusConfig.label, 133, infoY + 27.5, { align: 'center' })


  // Verificación
  setFill(colors.panel)
  setDraw(colors.line)
  pdf.roundedRect(20,266,pageWidth - 40,18,3,3,'FD')

  setText(colors.muted)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text('VERIFICACIÓN DIGITAL',26,272)

  pdf.setFontSize(8)
  pdf.text(`Código: ${displayCode}`,26,277)
  pdf.setTextColor(160, 160, 160)
  pdf.setFontSize(7)
  pdf.text('Escaneá este código en RockTickets.',26,282)

  // Footer

  setText(colors.muted)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text(
   'Este ticket es único. La titularidad puede cambiar únicamente mediante transferencia oficial en RockTickets.',
    pageWidth / 2,
    288,
    { align: 'center' }
  )

  setText(colors.muted)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text(`Emitido: ${issueText}`, pageWidth / 2, 296, {
    align: 'center'
  })
  pdf.setFontSize(6)
  pdf.text('Documento generado automáticamente por RockTickets.', pageWidth / 2, 292, {
  align: 'center'
  })

  pdf.save(`RockTickets-${displayCode}.pdf`)
}
  return (
    <div className="ticket-download-wrapper">
      <article
        ref={ticketRef}
        className="ticket-card ticket-card--premium"
      >
        <div className="ticket-card__content">
          <h3>{ticket.eventTitle}</h3>

          <div className="ticket-divider"></div>

          <div className="ticket-event-info">
            <span>
              {new Date(ticket.date).toLocaleDateString('es-CR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>

            <span>{ticket.venue}</span>
          </div>

          <div className="ticket-card__meta">
            <div>
              <span>Zona</span>
              <div
                className={`ticket-zone ${
                  ticket.zone === 'VIP' ? 'vip' : 'general'
                }`}
              >
                {ticket.zone}
              </div>
            </div>

            <div className="ticket-meta-item">
              <span>Estado</span>
              <strong className={`ticket-status ${ticket.status?.toLowerCase()}`}>
                {ticket.status === 'ACTIVE' ? 'ACTIVO' : ticket.status}
              </strong>
            </div>

            <div className="ticket-meta-item">
              <span>Titular</span>
              <strong>{ticket.buyer?.name || 'Invitado'}</strong>
            </div>

            {ticket.transferHistory?.length > 0 && (
            <small className="ticket-transfer-badge">
              ↻ Transferido {ticket.transferHistory.length} vec{ticket.transferHistory.length > 1 ? 'es' : ''} 
            </small>
            )}

            <div className="ticket-meta-item">
              <span>Código</span>
              <strong className="ticket-code-text">{displayCode}</strong>
            </div>
          </div>

          <div className="ticket-card__footer">
            <strong>RockTickets</strong>
            <span>Ticket Oficial</span>
          </div>
        </div>

        <div className="ticket-qr-clean">
          <QRCodeCanvas
            value={String(qrValue)}
            size={320}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            marginSize={4}
          />
        </div>
      </article>

    <div className="ticket-actions">
    <button
        className="btn-secondary"
        onClick={downloadPdf}
    >
        Descargar PDF
    </button>

<button
  className="ticket-transfer-button"
  onClick={onTransfer}
  disabled={hasBeenTransferred}
>
  {hasBeenTransferred ?'🔒 Ticket ya transferido' : 'Transferir ticket'}
</button>

</div>          
</div>  
  )
}