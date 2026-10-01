const PDFDocument = require('pdfkit')
const QRCode = require('qrcode')


async function generateTicketPdf(ticket) {
    return new Promise(async(resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 0
            })

            const chunks = []

            doc.on('data', (chunk) => {
                chunks.push(chunk)
            })

            doc.on('end', () => {
                resolve(
                    Buffer.concat(chunks)
                )
            })

            doc.on('error', reject)


            const pageWidth =
                doc.page.width

            const pageHeight =
                doc.page.height


            // =====================================================
            // FONDO
            // =====================================================

            doc
                .rect(
                    0,
                    0,
                    pageWidth,
                    pageHeight
                )
                .fill('#070707')


            // =====================================================
            // HEADER
            // =====================================================

            doc
                .roundedRect(
                    34,
                    34,
                    pageWidth - 68,
                    90,
                    14
                )
                .fill('#222222')


            doc
                .fillColor('#ff2b2b')
                .fontSize(28)
                .font('Helvetica-Bold')
                .text(
                    'RockTickets',
                    54,
                    58
                )


            doc
                .fillColor('#aaaaaa')
                .fontSize(10)
                .font('Helvetica')
                .text(
                    'Ticket oficial para shows extremos',
                    54,
                    94
                )


            doc
                .roundedRect(
                    pageWidth - 185,
                    58,
                    120,
                    30,
                    8
                )
                .fill('#ef4444')


            doc
                .fillColor('#ffffff')
                .fontSize(9)
                .font('Helvetica-Bold')
                .text(
                    'ENTRADA DIGITAL',
                    pageWidth - 185,
                    68, {
                        width: 120,
                        align: 'center'
                    }
                )


            // =====================================================
            // EVENTO
            // =====================================================

            doc
                .fillColor('#ffffff')
                .fontSize(24)
                .font('Helvetica-Bold')
                .text(
                    ticket.eventTitle ||
                    'Evento',
                    54,
                    155, {
                        width: pageWidth - 108
                    }
                )


            const eventDate =
                ticket.eventDate ?
                new Date(
                    ticket.eventDate
                ).toLocaleString(
                    'es-CR', {
                        dateStyle: 'medium',

                        timeStyle: 'short'
                    }
                ) :
                'Fecha por confirmar'


            doc
                .fillColor('#ff6b57')
                .fontSize(11)
                .font('Helvetica-Bold')
                .text(
                    eventDate,
                    54,
                    210
                )


            doc
                .fillColor('#bbbbbb')
                .fontSize(11)
                .font('Helvetica')
                .text(
                    ticket.eventVenue ||
                    'Venue por confirmar',
                    54,
                    232
                )


            // =====================================================
            // PANEL QR
            // =====================================================

            const qrDataUrl =
                await QRCode.toDataURL(
                    String(
                        ticket.ticketCode
                    ), {
                        width: 500,
                        margin: 2,
                        errorCorrectionLevel: 'M'
                    }
                )


            const qrBase64 =
                qrDataUrl.split(',')[1]


            const qrBuffer =
                Buffer.from(
                    qrBase64,
                    'base64'
                )


            doc
                .roundedRect(
                    54,
                    280,
                    pageWidth - 108,
                    300,
                    18
                )
                .fillAndStroke(
                    '#121212',
                    '#ef4444'
                )


            doc
                .roundedRect(
                    pageWidth / 2 - 105,
                    310,
                    210,
                    210,
                    12
                )
                .fill('#ffffff')


            doc.image(
                qrBuffer,
                pageWidth / 2 - 90,
                325, {
                    width: 180,
                    height: 180
                }
            )


            doc
                .fillColor('#ff6b57')
                .fontSize(14)
                .font('Helvetica-Bold')
                .text(
                    ticket.ticketCode,
                    54,
                    540, {
                        width: pageWidth - 108,

                        align: 'center'
                    }
                )


            // =====================================================
            // DATOS
            // =====================================================

            const leftX = 54
            const rightX = 320
            const infoY = 620


            drawLabel(
                doc,
                'TITULAR',
                leftX,
                infoY
            )

            drawValue(
                doc,
                ticket.ownerName ||
                ticket.buyerName ||
                'Invitado',
                leftX,
                infoY + 18,
                220
            )


            drawLabel(
                doc,
                'EMAIL',
                rightX,
                infoY
            )

            drawValue(
                doc,
                ticket.ownerEmail ||
                ticket.buyerEmail ||
                'No disponible',
                rightX,
                infoY + 18,
                220
            )


            drawLabel(
                doc,
                'ZONA',
                leftX,
                infoY + 70
            )

            drawValue(
                doc,
                ticket.zoneName ||
                'General',
                leftX,
                infoY + 88,
                220
            )


            drawLabel(
                doc,
                'ESTADO',
                rightX,
                infoY + 70
            )

            drawValue(
                doc,
                ticket.status ||
                'ACTIVE',
                rightX,
                infoY + 88,
                220
            )


            drawLabel(
                doc,
                'ORDEN',
                leftX,
                infoY + 140
            )

            drawValue(
                doc,
                ticket.orderId ||
                'No disponible',
                leftX,
                infoY + 158,
                220
            )


            drawLabel(
                doc,
                'PRECIO',
                rightX,
                infoY + 140
            )

            drawValue(
                doc,
                `CRC ${Number(
          ticket.price || 0
        ).toLocaleString(
          'es-CR'
        )}`,
                rightX,
                infoY + 158,
                220
            )


            // =====================================================
            // FOOTER
            // =====================================================

            doc
                .fillColor('#777777')
                .fontSize(8)
                .font('Helvetica')
                .text(
                    'Este ticket es único y solo puede utilizarse una vez.',
                    54,
                    pageHeight - 74, {
                        width: pageWidth - 108,

                        align: 'center'
                    }
                )


            doc
                .fillColor('#555555')
                .fontSize(7)
                .text(
                    'Documento generado automáticamente por RockTickets.',
                    54,
                    pageHeight - 54, {
                        width: pageWidth - 108,

                        align: 'center'
                    }
                )


            doc.end()
        } catch (error) {
            reject(error)
        }
    })
}


function drawLabel(
    doc,
    text,
    x,
    y
) {
    doc
        .fillColor('#888888')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(
            text,
            x,
            y
        )
}


function drawValue(
    doc,
    text,
    x,
    y,
    width
) {
    doc
        .fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica')
        .text(
            String(text || ''),
            x,
            y, {
                width
            }
        )
}


module.exports = {
    generateTicketPdf
}