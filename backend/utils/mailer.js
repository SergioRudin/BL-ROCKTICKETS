const { Resend } = require('resend')

const resend =
    new Resend(
        process.env.RESEND_API_KEY
    )


async function sendEmail({
    to,
    subject,
    html,
    attachments = []
}) {
    const result =
        await resend.emails.send({
            from: process.env.EMAIL_FROM,

            to,

            subject,

            html,

            attachments
        })


    if (result.error) {
        throw new Error(
            result.error.message ||
            'No se pudo enviar el correo'
        )
    }


    return result.data
}


module.exports = {
    sendEmail
}