const {
    pool,
} = require('../config/db');

const {
    createPurchase,
} = require('./orderController');

const {
    sendEmail
} = require('../utils/mailer')

const {
    generateTicketPdf
} = require('../utils/ticketPdf')
async function getTickets(req, res) {
    try {
        const [tickets] = await pool.execute(
            `
      SELECT
        t.*,

        e.title AS eventTitle,
        e.artist AS eventArtist,
        e.venue AS eventVenue,
        e.arena AS eventArena,
        e.city AS eventCity,
        e.country AS eventCountry,
        e.date AS eventDate,
        e.image AS eventImage

      FROM tickets t

      JOIN events e
        ON e.id = t.eventId

      ORDER BY t.createdAt DESC
      `
        );

        res.json(tickets);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo tickets',
        });
    }
}


async function getTicketsByOrder(
    req,
    res
) {
    try {
        const {
            orderId
        } = req.params


        if (!orderId) {
            return res
                .status(400)
                .json({
                    message: 'Order ID requerido'
                })
        }


        // =====================================================
        // BUSCAR ORDEN
        // =====================================================

        const [orders] =
        await pool.execute(
            `
        SELECT
          id,
          orderId,
          userId,
          buyerName,
          buyerEmail,
          status
        FROM orders
        WHERE orderId = ?
        LIMIT 1
        `, [
                orderId
            ]
        )


        if (!orders.length) {
            return res
                .status(404)
                .json({
                    message: 'Orden no encontrada'
                })
        }


        const order =
            orders[0]


        // =====================================================
        // COMPROBAR PROPIEDAD
        // =====================================================

        const currentUserId =
            Number(
                req.user.id
            )


        const orderUserId =
            order.userId ?
            Number(
                order.userId
            ) :
            null


        const currentEmail =
            String(
                req.user.email || ''
            )
            .trim()
            .toLowerCase()


        const orderEmail =
            String(
                order.buyerEmail || ''
            )
            .trim()
            .toLowerCase()


        const isOwnerById =
            orderUserId &&
            orderUserId ===
            currentUserId


        const isOwnerByEmail =
            currentEmail &&
            orderEmail &&
            currentEmail ===
            orderEmail


        const isAdmin =
            req.user.role ===
            'ADMIN'


        if (!isOwnerById &&
            !isOwnerByEmail &&
            !isAdmin
        ) {
            return res
                .status(403)
                .json({
                    message: 'No tienes permiso para ver esta orden'
                })
        }


        // =====================================================
        // OBTENER TICKETS
        // =====================================================

        const [tickets] =
        await pool.execute(
            `
        SELECT
          t.*,

          e.title AS eventTitle,
          e.slug AS eventSlug,
          e.artist AS eventArtist,
          e.venue AS eventVenue,
          e.arena AS eventArena,
          e.city AS eventCity,
          e.country AS eventCountry,
          e.date AS eventDate,
          e.image AS eventImage

        FROM tickets t

        JOIN events e
          ON e.id = t.eventId

        WHERE t.orderId = ?

        ORDER BY t.id ASC
        `, [
                orderId
            ]
        )


        return res.json(
            tickets
        )
    } catch (error) {
        console.error(
            'Error obteniendo tickets por orden:',
            error
        )


        return res
            .status(500)
            .json({
                message: 'Error obteniendo tickets de la orden'
            })
    }
}


async function getTicketByCode(req, res) {
    try {
        const {
            ticketCode,
        } = req.params;

        const [tickets] = await pool.execute(
            `
      SELECT
        t.*,

        e.title AS eventTitle,
        e.artist AS eventArtist,
        e.venue AS eventVenue,
        e.arena AS eventArena,
        e.city AS eventCity,
        e.country AS eventCountry,
        e.date AS eventDate,
        e.image AS eventImage

      FROM tickets t

      JOIN events e
        ON e.id = t.eventId

      WHERE t.ticketCode = ?

      LIMIT 1
      `, [ticketCode]
        );

        if (!tickets.length) {
            return res.status(404).json({
                message: 'Ticket no encontrado',
            });
        }

        res.json(tickets[0]);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error buscando ticket',
        });
    }
}


async function markTicketUsed(req, res) {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } =
        req.params;

        const [tickets] =
        await connection.execute(
            `
        SELECT *
        FROM tickets
        WHERE id = ?
        FOR UPDATE
        `, [id]
        );

        if (!tickets.length) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Ticket no encontrado',
            });
        }

        const ticket =
            tickets[0];

        if (
            ticket.status === 'USED'
        ) {
            await connection.execute(
                `
        INSERT INTO ticket_validations (
          ticketId,
          validatedBy,
          result
        )
        VALUES (?, ?, 'ALREADY_USED')
        `, [
                    ticket.id,
                    req.user ? req.user.id : null,
                ]
            );

            await connection.commit();

            return res.status(409).json({
                message: 'Este ticket ya fue utilizado',
                ticket,
            });
        }

        if (
            ticket.status === 'CANCELLED'
        ) {
            await connection.execute(
                `
        INSERT INTO ticket_validations (
          ticketId,
          validatedBy,
          result
        )
        VALUES (?, ?, 'CANCELLED')
        `, [
                    ticket.id,
                    req.user ? req.user.id : null,
                ]
            );

            await connection.commit();

            return res.status(409).json({
                message: 'Este ticket está cancelado',
                ticket,
            });
        }

        await connection.execute(
            `
      UPDATE tickets
      SET
        status = 'USED',
        usedAt = NOW()
      WHERE id = ?
      `, [id]
        );

        await connection.execute(
            `
      INSERT INTO ticket_validations (
        ticketId,
        validatedBy,
        result
      )
      VALUES (?, ?, 'VALID')
      `, [
                ticket.id,
                req.user ? req.user.id : null,
            ]
        );

        await connection.commit();

        const [updated] =
        await pool.execute(
            `
        SELECT *
        FROM tickets
        WHERE id = ?
        `, [id]
        );

        res.json(updated[0]);
    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
            message: 'Error validando ticket',
        });
    } finally {
        connection.release();
    }
}


async function transferTicket(
    req,
    res
) {
    const connection =
        await pool.getConnection()

    let transactionFinished =
        false


    try {
        const ticketId =
            Number(
                req.params.id
            )


        const {
            ownerName,
            ownerEmail
        } = req.body


        // =====================================================
        // VALIDAR DATOS
        // =====================================================

        if (!ticketId ||
            !ownerName ||
            !ownerEmail
        ) {
            return res
                .status(400)
                .json({
                    message: 'Nombre y correo del nuevo titular son requeridos'
                })
        }


        const normalizedOwnerName =
            String(
                ownerName
            ).trim()


        const normalizedOwnerEmail =
            String(
                ownerEmail
            )
            .trim()
            .toLowerCase()


        if (!normalizedOwnerName ||
            !normalizedOwnerEmail
        ) {
            return res
                .status(400)
                .json({
                    message: 'Datos del nuevo titular inválidos'
                })
        }


        await connection.beginTransaction()


        // =====================================================
        // BLOQUEAR TICKET
        // =====================================================

        const [tickets] =
        await connection.execute(
            `
        SELECT *
        FROM tickets
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
        `, [
                ticketId
            ]
        )


        if (!tickets.length) {
            await connection.rollback()

            transactionFinished =
                true


            return res
                .status(404)
                .json({
                    message: 'Ticket no encontrado'
                })
        }


        const ticket =
            tickets[0]


        // =====================================================
        // VALIDAR PROPIEDAD
        // =====================================================

        const currentUserId =
            Number(
                req.user.id
            )


        const ticketUserId =
            ticket.userId ?
            Number(
                ticket.userId
            ) :
            null


        const currentEmail =
            String(
                req.user.email || ''
            )
            .trim()
            .toLowerCase()


        const currentOwnerEmail =
            String(
                ticket.ownerEmail ||
                ticket.buyerEmail ||
                ''
            )
            .trim()
            .toLowerCase()


        const isOwnerById =
            ticketUserId &&
            ticketUserId ===
            currentUserId


        const isOwnerByEmail =
            currentEmail &&
            currentOwnerEmail &&
            currentEmail ===
            currentOwnerEmail


        if (!isOwnerById &&
            !isOwnerByEmail
        ) {
            await connection.rollback()

            transactionFinished =
                true


            return res
                .status(403)
                .json({
                    message: 'No tienes permiso para transferir este ticket'
                })
        }


        // =====================================================
        // VALIDAR ESTADO
        // =====================================================

        if (
            ticket.status !==
            'ACTIVE'
        ) {
            await connection.rollback()

            transactionFinished =
                true


            return res
                .status(400)
                .json({
                    message: 'Solo se pueden transferir tickets activos'
                })
        }


        // =====================================================
        // SOLO UNA TRANSFERENCIA
        // =====================================================

        const transferCount =
            Number(
                ticket.transferCount || 0
            )


        if (
            transferCount >= 1
        ) {
            await connection.rollback()

            transactionFinished =
                true


            return res
                .status(400)
                .json({
                    message: 'Este ticket ya fue transferido anteriormente'
                })
        }


        // =====================================================
        // NO TRANSFERIR AL MISMO CORREO
        // =====================================================

        if (
            normalizedOwnerEmail ===
            currentOwnerEmail
        ) {
            await connection.rollback()

            transactionFinished =
                true


            return res
                .status(400)
                .json({
                    message: 'El nuevo titular debe tener un correo diferente'
                })
        }


        const previousOwnerName =
            ticket.ownerName ||
            ticket.buyerName


        const previousOwnerEmail =
            ticket.ownerEmail ||
            ticket.buyerEmail


        // =====================================================
        // REGISTRAR TRANSFERENCIA
        // =====================================================

        await connection.execute(
            `
      INSERT INTO ticket_transfers (
        ticketId,
        previousOwnerName,
        previousOwnerEmail,
        newOwnerName,
        newOwnerEmail,
        transferredAt
      )
      VALUES (
        ?, ?, ?, ?, ?, NOW()
      )
      `, [
                ticket.id,
                previousOwnerName,
                previousOwnerEmail,
                normalizedOwnerName,
                normalizedOwnerEmail
            ]
        )


        // =====================================================
        // ACTUALIZAR TICKET
        // =====================================================

        await connection.execute(
            `
      UPDATE tickets
      SET
        ownerName = ?,
        ownerEmail = ?,
        transferCount =
          COALESCE(
            transferCount,
            0
          ) + 1
      WHERE id = ?
      `, [
                normalizedOwnerName,
                normalizedOwnerEmail,
                ticket.id
            ]
        )


        await connection.commit()

        transactionFinished =
            true


        // =====================================================
        // CARGAR TICKET ACTUALIZADO + EVENTO
        // =====================================================

        const [updatedTickets] =
        await pool.execute(
            `
        SELECT
          t.*,

          e.title AS eventTitle,
          e.artist AS eventArtist,
          e.venue AS eventVenue,
          e.city AS eventCity,
          e.country AS eventCountry,
          e.date AS eventDate,
          e.image AS eventImage

        FROM tickets t

        JOIN events e
          ON e.id = t.eventId

        WHERE t.id = ?

        LIMIT 1
        `, [
                ticket.id
            ]
        )


        if (!updatedTickets.length) {
            throw new Error(
                'No se pudo cargar el ticket actualizado'
            )
        }


        const updatedTicket =
            updatedTickets[0]


        // =====================================================
        // EMAILS
        // =====================================================

        try {
            const pdfBuffer =
                await generateTicketPdf(
                    updatedTicket
                )


            // ===================================================
            // EMAIL AL NUEVO TITULAR
            // ===================================================

            await sendEmail({
                to: normalizedOwnerEmail,

                subject: `RockTickets | Recibiste una entrada - ${updatedTicket.eventTitle}`,

                html: `
          <div
            style="
              background: #070707;
              color: #ffffff;
              font-family: Arial, sans-serif;
              padding: 32px 16px;
            "
          >

            <div
              style="
                max-width: 620px;
                margin: 0 auto;
                background: #111111;
                border: 1px solid #292929;
                border-radius: 20px;
                padding: 32px;
              "
            >

              <div
                style="
                  color: #ff2b2b;
                  font-size: 30px;
                  font-weight: 800;
                  margin-bottom: 22px;
                "
              >
                RockTickets
              </div>


              <h1
                style="
                  color: #ffffff;
                  margin-bottom: 12px;
                "
              >
                Recibiste una entrada
              </h1>


              <p
                style="
                  color: #bdbdbd;
                  line-height: 1.6;
                "
              >
                Hola ${normalizedOwnerName},
                ${previousOwnerName} te transfirió una entrada.
              </p>


              <div
                style="
                  background: #181818;
                  border: 1px solid #292929;
                  border-radius: 14px;
                  padding: 20px;
                  margin: 24px 0;
                "
              >

                <div
                  style="
                    color: #888888;
                    font-size: 12px;
                    margin-bottom: 5px;
                  "
                >
                  EVENTO
                </div>


                <strong
                  style="
                    color: #ffffff;
                    font-size: 19px;
                  "
                >
                  ${updatedTicket.eventTitle}
                </strong>


                <div
                  style="
                    margin-top: 18px;
                    color: #888888;
                    font-size: 12px;
                  "
                >
                  ZONA
                </div>


                <div
                  style="
                    margin-top: 5px;
                    color: #ffffff;
                  "
                >
                  ${updatedTicket.zoneName}
                </div>


                <div
                  style="
                    margin-top: 18px;
                    color: #888888;
                    font-size: 12px;
                  "
                >
                  CÓDIGO
                </div>


                <div
                  style="
                    margin-top: 5px;
                    color: #ff5656;
                    font-family: monospace;
                    font-weight: 700;
                  "
                >
                  ${updatedTicket.ticketCode}
                </div>

              </div>


              <p
                style="
                  color: #bdbdbd;
                  line-height: 1.6;
                "
              >
                Tu entrada actualizada viene adjunta en PDF.
              </p>


              <p
                style="
                  color: #888888;
                  font-size: 13px;
                  line-height: 1.5;
                "
              >
                Esta entrada ya fue transferida y no puede
                transferirse nuevamente.
              </p>

            </div>

          </div>
        `,

                attachments: [{
                    filename: `RockTickets-${updatedTicket.ticketCode}.pdf`,

                    content: pdfBuffer
                }]
            })


            // ===================================================
            // EMAIL AL TITULAR ANTERIOR
            // ===================================================

            if (
                previousOwnerEmail
            ) {
                await sendEmail({
                    to: previousOwnerEmail,

                    subject: `RockTickets | Entrada transferida - ${updatedTicket.eventTitle}`,

                    html: `
            <div
              style="
                background: #070707;
                color: #ffffff;
                font-family: Arial, sans-serif;
                padding: 32px 16px;
              "
            >

              <div
                style="
                  max-width: 620px;
                  margin: 0 auto;
                  background: #111111;
                  border: 1px solid #292929;
                  border-radius: 20px;
                  padding: 32px;
                "
              >

                <div
                  style="
                    color: #ff2b2b;
                    font-size: 30px;
                    font-weight: 800;
                    margin-bottom: 22px;
                  "
                >
                  RockTickets
                </div>


                <h1
                  style="
                    color: #ffffff;
                  "
                >
                  Transferencia completada
                </h1>


                <p
                  style="
                    color: #bdbdbd;
                    line-height: 1.6;
                  "
                >
                  Tu entrada para
                  <strong>
                    ${updatedTicket.eventTitle}
                  </strong>
                  fue transferida correctamente.
                </p>


                <div
                  style="
                    background: #181818;
                    border: 1px solid #292929;
                    border-radius: 14px;
                    padding: 20px;
                    margin: 24px 0;
                  "
                >

                  <div
                    style="
                      color: #888888;
                      font-size: 12px;
                    "
                  >
                    NUEVO TITULAR
                  </div>


                  <div
                    style="
                      color: #ffffff;
                      margin-top: 5px;
                      font-weight: 700;
                    "
                  >
                    ${normalizedOwnerName}
                  </div>


                  <div
                    style="
                      color: #888888;
                      font-size: 12px;
                      margin-top: 18px;
                    "
                  >
                    CORREO
                  </div>


                  <div
                    style="
                      color: #ffffff;
                      margin-top: 5px;
                    "
                  >
                    ${normalizedOwnerEmail}
                  </div>


                  <div
                    style="
                      color: #888888;
                      font-size: 12px;
                      margin-top: 18px;
                    "
                  >
                    TICKET
                  </div>


                  <div
                    style="
                      color: #ff5656;
                      margin-top: 5px;
                      font-family: monospace;
                    "
                  >
                    ${updatedTicket.ticketCode}
                  </div>

                </div>


                <p
                  style="
                    color: #888888;
                    font-size: 13px;
                    line-height: 1.5;
                  "
                >
                  Ya no eres el titular de esta entrada.
                </p>

              </div>

            </div>
          `
                })
            }


            console.log(
                `✅ Correos de transferencia enviados para ticket ${ticket.ticketCode}`
            )
        } catch (emailError) {
            /*
              La transferencia YA fue guardada.

              Un fallo de Resend o del PDF
              no debe revertir la transferencia.
            */

            console.error(
                '⚠️ Ticket transferido, pero falló el correo:',
                emailError
            )
        }


        // =====================================================
        // RESPUESTA
        // =====================================================

        return res.json({
            message: 'Ticket transferido correctamente',

            ticket: updatedTicket
        })
    } catch (error) {
        if (!transactionFinished) {
            try {
                await connection.rollback()
            } catch (rollbackError) {
                console.error(
                    'Error haciendo rollback:',
                    rollbackError
                )
            }
        }


        console.error(
            'Error transfiriendo ticket:',
            error
        )


        return res
            .status(500)
            .json({
                message: 'Error transfiriendo ticket'
            })
    } finally {
        connection.release()
    }
}
async function createTestTickets(req, res) {
    try {
        const result =
            await createPurchase({
                ...req.body,

                userId: req.user ? req.user.id : null,
            });

        /*
          Para mantener compatibilidad con el frontend viejo
          devolvemos tickets directamente y también la orden.
        */

        res.status(201).json({
            orderId: result.order.orderId,

            order: result.order,

            tickets: result.tickets,
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message,
        });
    }
}


async function getMyTickets(req, res) {
    try {
        const [tickets] =
        await pool.execute(
            `
        SELECT
          t.*,

          e.title AS eventTitle,
          e.artist AS eventArtist,
          e.venue AS eventVenue,
          e.arena AS eventArena,
          e.city AS eventCity,
          e.country AS eventCountry,
          e.date AS eventDate,
          e.image AS eventImage

        FROM tickets t

        JOIN events e
          ON e.id = t.eventId

        WHERE
          t.userId = ?
          OR t.ownerEmail = ?

        ORDER BY e.date ASC
        `, [
                req.user.id,
                req.user.email,
            ]
        );

        res.json(tickets);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Error obteniendo tus tickets',
        });
    }
}


module.exports = {
    getTickets,
    getTicketsByOrder,
    getTicketByCode,
    markTicketUsed,
    transferTicket,
    createTestTickets,
    getMyTickets,
};