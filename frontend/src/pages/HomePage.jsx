import { useEffect, useMemo, useState } from 'react'
import Hero from '../components/Hero'
import SearchBar from '../components/SearchBar'
import EventCard from '../components/EventCard'
import { getEvents } from '../utils/api'

export default function HomePage() {
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    getEvents().then((data) => {
      const safeEvents = Array.isArray(data) ? data : data?.events || []
      setEvents(safeEvents)
    })
  }, [])

  const filteredEvents = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : []

    return safeEvents.filter((event) => {
      const q = `${event.title} ${event.artist} ${event.venue} ${event.city}`.toLowerCase()
      const matchesSearch = q.includes(search.toLowerCase())
      const matchesCategory = category ? event.category === category : true
      return matchesSearch && matchesCategory
    })
  }, [events, search, category])

  return (
    <div className="stack-lg">
      <Hero />

      <SearchBar
        value={search}
        onChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
      />

      <section className="events-grid">
        {filteredEvents.map((event) => (
          <EventCard key={event.id || event._id} event={event} />
        ))}
      </section>
    </div>
  )
}
