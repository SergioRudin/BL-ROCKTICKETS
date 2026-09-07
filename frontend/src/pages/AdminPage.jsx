import { useEffect, useState } from 'react'
import { createEvent, deleteEvent, getEvents, updateEvent } from '../utils/api'


const initialState = {
  title: '',
  artist: '',
  venue: '',
  city: '',
  date: '',
  category: 'Concierto',
  image: '',
  priceGeneral: '',
  priceVIP: '',
  capacityGeneral: '',
  capacityVIP: '',
  description: ''
}

export default function AdminPage() {
  const [form, setForm] = useState(initialState)
  const [preview, setPreview] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState([])
  const [editingId, setEditingId] = useState(null)


  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function loadEvents() {
  const data = await getEvents()
  setEvents(Array.isArray(data) ? data : [])
}
useEffect(() => {
  loadEvents()
}, [])


  async function handleDelete(id) {
  const confirmDelete = window.confirm('¿Seguro que deseas eliminar este evento?')

  if (!confirmDelete) return

  try {
    await deleteEvent(id)
    setMessage('Evento eliminado correctamente.')
    await loadEvents()
  } catch (error) {
    console.error(error)
    setMessage('No se pudo eliminar el evento.')
  }
}

function handleEdit(event) {
  const generalZone = event.zones?.find((zone) => zone.code === 'GENERAL')
  const vipZone = event.zones?.find((zone) => zone.code === 'VIP')

  setEditingId(event.id || event._id)

  setForm({
    title: event.title || '',
    artist: event.artist || '',
    venue: event.venue || '',
    city: event.city || '',
    date: event.date ? event.date.slice(0, 16) : '',
    category: event.category || 'Concierto',
    image: event.image || '',
    priceGeneral: generalZone?.price || '',
    priceVIP: vipZone?.price || '',
    capacityGeneral: generalZone?.capacity || '',
    capacityVIP: vipZone?.capacity || '',
    description: event.description || ''
  })

  setMessage('Editando evento. Modifica los datos y guarda los cambios.')
}



  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const payload = {
      title: form.title,
      artist: form.artist,
      venue: form.venue,
      city: form.city,
      country: 'Costa Rica',
      date: form.date,
      category: form.category,
      image: form.image,
      description: form.description,
      status: 'PUBLISHED',
      featured: true,
      zones: [
        {
          name: 'General',
          code: 'GENERAL',
          price: Number(form.priceGeneral),
          capacity: Number(form.capacityGeneral),
          sold: 0
        },
        {
          name: 'VIP',
          code: 'VIP',
          price: Number(form.priceVIP),
          capacity: Number(form.capacityVIP),
          sold: 0
        }
      ]
    }

    try {
          const savedEvent = editingId
        ? await updateEvent(editingId, payload)
        : await createEvent(payload)

        setPreview(savedEvent.event || savedEvent)

      setMessage(
      editingId
      ? 'Evento actualizado correctamente.'
      : 'Evento creado correctamente en MongoDB.'
)

        setEditingId(null)

        setForm(initialState)

        await loadEvents()


    } catch (error) {
      console.error(error)
      setMessage('No se pudo crear el evento. Revisa la consola o el backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-layout">
      <section className="card-blur stack-md">
        <h2>Panel administrador</h2>
        <p className="muted">
          Crea eventos reales y guárdalos directamente en MongoDB Atlas.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <input
            name="title"
            placeholder="Nombre del evento"
            value={form.title}
            onChange={handleChange}
            required
          />

          <input
            name="artist"
            placeholder="Bandas o artista"
            value={form.artist}
            onChange={handleChange}
            required
          />

          <input
            name="venue"
            placeholder="Venue"
            value={form.venue}
            onChange={handleChange}
            required
          />

          <input
            name="city"
            placeholder="Ciudad"
            value={form.city}
            onChange={handleChange}
            required
          />

          <input
            name="date"
            type="datetime-local"
            value={form.date}
            onChange={handleChange}
            required
          />

          <select name="category" onChange={handleChange} value={form.category}>
            <option>Concierto</option>
            <option>Festival</option>
            <option>Metal</option>
          </select>

          <input
            name="image"
            placeholder="URL de imagen"
            value={form.image}
            onChange={handleChange}
            required
          />

          <input
            name="priceGeneral"
            type="number"
            placeholder="Precio General"
            value={form.priceGeneral}
            onChange={handleChange}
            required
          />

          <input
            name="capacityGeneral"
            type="number"
            placeholder="Capacidad General"
            value={form.capacityGeneral}
            onChange={handleChange}
            required
          />

          <input
            name="priceVIP"
            type="number"
            placeholder="Precio VIP"
            value={form.priceVIP}
            onChange={handleChange}
            required
          />

          <input
            name="capacityVIP"
            type="number"
            placeholder="Capacidad VIP"
            value={form.capacityVIP}
            onChange={handleChange}
            required
          />

          <textarea
            name="description"
            placeholder="Descripción"
            value={form.description}
            onChange={handleChange}
            required
          />

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading
            ? editingId
            ? 'Guardando cambios...'
            : 'Creando evento...'
            : editingId
            ? 'Guardar cambios'
            : 'Crear evento'}
          </button>
        </form>

        {message && <div className="success-banner">{message}</div>}
      </section>

       <section className="card-blur stack-md">
        <h2>Último evento creado</h2>

        {preview ? (
          <pre className="json-preview">{JSON.stringify(preview, null, 2)}</pre>
        ) : (
          <p className="muted">
            Cuando crees un evento, aquí aparecerá el registro guardado.
          </p>
        )}
      </section>

      <section className="card-blur stack-md">
        <h2>Eventos existentes</h2>

        {events.length === 0 ? (
          <p className="muted">No hay eventos registrados.</p>
        ) : (
          events.map((event) => (
            <article className="dashboard-row" key={event.id || event._id}>
              <div>
                <strong>{event.title}</strong>
                <p className="muted">
                  {event.artist} · {event.venue} · {event.city}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => handleEdit(event)}
                >
                  Editar
                </button>

                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => handleDelete(event.id || event._id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}