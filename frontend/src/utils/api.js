import { mockEvents } from '../data/mockEvents'

const API_BASE = 'http://localhost:5000/api'

function normalizeEvent(event) {
  const generalZone = event.zones?.find((zone) => zone.code === 'GENERAL')
  const vipZone = event.zones?.find((zone) => zone.code === 'VIP')

  return {
    ...event,
    id: event._id || event.id,
    priceGeneral: generalZone?.price || event.priceGeneral || 0,
    priceVIP: vipZone?.price || event.priceVIP || 0
  }
}

export async function getEvents() {
  try {
    const response = await fetch(`${API_BASE}/events`)

    if (!response.ok) {
      throw new Error('API no disponible')
    }

    const data = await response.json()
    const events = Array.isArray(data) ? data : data.events || []

    return events.map(normalizeEvent)
  } catch (error) {
    console.error('Error cargando eventos:', error)
    return mockEvents
  }
}

export async function getEventBySlug(slug) {
  const events = await getEvents()
  return events.find((event) => event.slug === slug)
}

export async function createEvent(eventData) {
  const response = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  })

  if (!response.ok) {
    throw new Error('No se pudo crear el evento')
  }

  return await response.json()
}

export async function updateEvent(id, eventData) {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  })

  if (!response.ok) {
    throw new Error('No se pudo actualizar el evento')
  }

  return await response.json()
}

export async function deleteEvent(id) {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error('No se pudo eliminar el evento')
  }

  return await response.json()
}

export async function createOrder(payload) {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error('No se pudo crear la orden')
  }

  return response.json()
}

export async function createTestTickets(payload) {
  const response = await fetch(`${API_BASE}/tickets/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear tickets')
  }

  return data
}

export async function getTicketsByOrder(orderId) {
  const response = await fetch(`${API_BASE}/tickets/order/${orderId}`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al obtener tickets')
  }

  return data
}

export async function getTicketByCode(ticketCode) {
  const response = await fetch(`${API_BASE}/tickets/code/${ticketCode}`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al buscar ticket')
  }

  return data
}

export async function useTicketByCode(ticketCode) {
  const response = await fetch(`${API_BASE}/tickets/code/${ticketCode}/use`, {
    method: 'PATCH'
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al validar ticket')
  }

  return data
}

export async function getTickets() {
  const response = await fetch(`${API_BASE}/tickets`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al obtener tickets')
  }

  return data
}

export async function transferTicket(ticketCode, ownerName, ownerEmail) {
  const response = await fetch(
    `${API_BASE}/tickets/code/${ticketCode}/transfer`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newOwnerName: ownerName,
        newOwnerEmail: ownerEmail
      })
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo transferir el ticket')
  }

  return data
}