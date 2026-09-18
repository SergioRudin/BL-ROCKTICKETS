import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import CheckoutPage from './pages/CheckoutPage'
import AdminPage from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import ValidateTicketPage from './pages/ValidateTicketPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <div className="app-shell">
      <div className="concert-bg" />
      <Navbar />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/evento/:slug" element={<EventPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/validate" element={<ValidateTicketPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
