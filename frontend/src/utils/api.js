import { mockEvents } from '../data/mockEvents'

const API_BASE = 'http://localhost:5000/api'

const API_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api'

function normalizeEvent(event) {
    const zones =
        Array.isArray(event.zones) ?
        event.zones : []

    const generalZone =
        zones.find(
            (zone) => zone.code === 'GENERAL'
        )

    const vipZone =
        zones.find(
            (zone) => zone.code === 'VIP'
        )

    return {
        ...event,

        id: event.id,

        priceGeneral: generalZone && generalZone.price ?
            generalZone.price : event.priceGeneral || 0,

        priceVIP: vipZone && vipZone.price ?
            vipZone.price : event.priceVIP || 0
    }
}


export async function getEvents() {
    try {
        const response =
            await fetch(
                `${API_BASE}/events`
            )

        if (!response.ok) {
            throw new Error(
                'API no disponible'
            )
        }

        const data =
            await response.json()

        const events =
            Array.isArray(data) ?
            data :
            data && Array.isArray(data.events) ?
            data.events : []

        return events.map(
            normalizeEvent
        )
    } catch (error) {
        console.error(
            'Error cargando eventos:',
            error
        )

        return mockEvents
    }
}


export async function getEventBySlug(slug) {
    const events =
        await getEvents()

    return events.find(
        (event) =>
        event.slug === slug
    )
}


export async function createEvent(eventData) {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    if (!token) {
        throw new Error(
            'Debes iniciar sesión como administrador'
        )
    }

    const response =
        await fetch(
            `${API_BASE}/events`, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',

                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify(
                    eventData
                )
            }
        )

    const data =
        await response.json()

    if (!response.ok) {
        throw new Error(
            data.message ||
            'No se pudo crear el evento'
        )
    }

    return data
}


export async function updateEvent(
    id,
    eventData
) {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    if (!token) {
        throw new Error(
            'Debes iniciar sesión como administrador'
        )
    }

    const response =
        await fetch(
            `${API_BASE}/events/${id}`, {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json',

                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify(
                    eventData
                )
            }
        )

    const data =
        await response.json()

    if (!response.ok) {
        throw new Error(
            data.message ||
            'No se pudo actualizar el evento'
        )
    }

    return data
}


export async function deleteEvent(id) {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    if (!token) {
        throw new Error(
            'Debes iniciar sesión como administrador'
        )
    }

    const response =
        await fetch(
            `${API_BASE}/events/${id}`, {
                method: 'DELETE',

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
            'No se pudo eliminar el evento'
        )
    }

    return data
}


export async function createOrder(payload) {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    const headers = {
        'Content-Type': 'application/json'
    }

    if (token) {
        headers.Authorization =
            `Bearer ${token}`
    }

    const response =
        await fetch(
            'http://localhost:5000/api/orders', {
                method: 'POST',
                headers,
                body: JSON.stringify(
                    payload
                )
            }
        )

    const data =
        await response.json()

    if (!response.ok) {
        throw new Error(
            data.message ||
            'No se pudo crear la orden'
        )
    }

    return data
}


export async function createTestTickets(payload) {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    const headers = {
        'Content-Type': 'application/json'
    }

    if (token) {
        headers.Authorization =
            `Bearer ${token}`
    }

    const response =
        await fetch(
            `${API_BASE}/tickets/test`, {
                method: 'POST',
                headers,
                body: JSON.stringify(
                    payload
                )
            }
        )

    const data =
        await response.json()

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Error al crear tickets'
        )
    }

    return data
}


export async function getTicketsByOrder(orderId) {
    const response =
        await fetch(
            `${API_BASE}/tickets/order/${orderId}`
        )

    const data =
        await response.json()

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Error al obtener tickets'
        )
    }

    return data
}


export async function getTicketByCode(ticketCode) {
    const response =
        await fetch(
            `${API_BASE}/tickets/code/${ticketCode}`
        )

    const data =
        await response.json()

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Error al buscar ticket'
        )
    }

    return data
}


export async function useTicket(ticketId) {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    if (!token) {
        throw new Error(
            'Debes iniciar sesión para validar tickets'
        )
    }

    const headers = {
        Authorization: `Bearer ${token}`
    }

    const response =
        await fetch(
            `${API_BASE}/tickets/${ticketId}/use`, {
                method: 'PUT',
                headers
            }
        )

    const data =
        await response.json()

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Error al validar ticket'
        )
    }

    return data
}


export async function getTickets() {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    if (!token) {
        throw new Error(
            'Debes iniciar sesión como administrador'
        )
    }

    const response =
        await fetch(
            `${API_BASE}/tickets`, {
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
            'Error al obtener tickets'
        )
    }

    return data
}


export async function getMyTickets() {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    if (!token) {
        throw new Error(
            'Debes iniciar sesión para ver tus tickets'
        )
    }

    const response =
        await fetch(
            `${API_BASE}/me/tickets`, {
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
            'Error al obtener tus tickets'
        )
    }

    return data
}


export async function transferTicket(
    ticketId,
    ownerName,
    ownerEmail
) {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    const headers = {
        'Content-Type': 'application/json'
    }

    if (token) {
        headers.Authorization =
            `Bearer ${token}`
    }

    const response =
        await fetch(
            `${API_BASE}/tickets/${ticketId}/transfer`, {
                method: 'PUT',

                headers,

                body: JSON.stringify({
                    ownerName,
                    ownerEmail
                })
            }
        )

    const data =
        await response.json()

    if (!response.ok) {
        throw new Error(
            data.message ||
            'No se pudo transferir el ticket'
        )
    }

    return data
}


export async function getDashboard() {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )

    if (!token) {
        throw new Error(
            'Debes iniciar sesión como administrador'
        )
    }

    const response =
        await fetch(
            `${API_BASE}/dashboard`, {
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
            'No se pudo cargar el dashboard'
        )
    }

    return data
}

export async function getOrderStatus(
    orderId
) {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )


    const response =
        await fetch(
            `http://localhost:5000/api/orders/${encodeURIComponent(
        orderId
      )}/status`, {
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
            'No se pudo consultar la orden'
        )
    }


    return data
}


export async function getMyOrders() {
    const token =
        localStorage.getItem(
            'rocktickets_token'
        )


    const response =
        await fetch(
            'http://localhost:5000/api/orders/me', {
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
            'No se pudo cargar el historial'
        )
    }


    return data
}