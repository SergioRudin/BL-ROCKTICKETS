import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { items } = useCart()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark">⚡</span>

        <div>
          <h1>RockTickets</h1>
          <p>Ticketera para shows extremos</p>
        </div>
      </Link>

      <nav className="nav-links">
        <NavLink to="/">Eventos</NavLink>
        <NavLink to="/checkout">Carrito ({items.length})</NavLink>
        <NavLink to="/tickets">Mis tickets</NavLink>
        <NavLink to="/admin">Admin</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>

        {isAuthenticated ? (
          <div className="nav-user-menu">
            <button className="nav-user-trigger">
              <span className="nav-user-avatar">👤</span>
              <span>{user.name}</span>
              <span className="nav-user-arrow">▾</span>
            </button>

            <div className="nav-user-dropdown">
              <div className="nav-user-dropdown-header">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </div>

              <NavLink to="/account">Mi cuenta</NavLink>
              <NavLink to="/tickets">Mis tickets</NavLink>

              <button onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <NavLink to="/login" className="nav-login-link">
            Iniciar sesión
          </NavLink>
        )}
      </nav>
    </header>
  )
}