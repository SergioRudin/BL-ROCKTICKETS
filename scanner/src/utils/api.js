const API_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api'


export async function loginScanner(
    email,
    password
) {
    const response =
        await fetch(
            `${API_URL}/auth/login`, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        )


    const data =
        await response.json()


    if (!response.ok) {
        throw new Error(
            data.message ||
            'No se pudo iniciar sesión'
        )
    }


    return data
}


export async function getScannerEvents() {
    const response =
        await fetch(
            `${API_URL}/events`
        )


    const data =
        await response.json()


    if (!response.ok) {
        throw new Error(
            data.message ||
            'No se pudieron cargar los eventos'
        )
    }


    return data
}


export async function getTicketByCode(
    ticketCode
) {
    const token =
        localStorage.getItem(
            'rocktickets_scanner_token'
        )


    const response =
        await fetch(
            `${API_URL}/tickets/code/${encodeURIComponent(ticketCode)}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )


    const data =
        await response.json()


    if (!response.ok) {
        throw new Error(
            data.message ||
            'Ticket no encontrado'
        )
    }


    return data
}


export async function validateTicket(
    ticketId
) {
    const token =
        localStorage.getItem(
            'rocktickets_scanner_token'
        )


    const response =
        await fetch(
            `${API_URL}/tickets/${ticketId}/use`, {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json',

                    Authorization: `Bearer ${token}`
                }
            }
        )


    const data =
        await response.json()


    if (!response.ok) {
        throw new Error(
            data.message ||
            'No se pudo validar el ticket'
        )
    }


    return data
}