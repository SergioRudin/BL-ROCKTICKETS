import {
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import PaymentSuccessPage
  from './pages/PaymentSuccessPage'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import CheckoutPage from './pages/CheckoutPage'
import AdminPage from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import ValidateTicketPage from './pages/ValidateTicketPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AccountPage from './pages/AccountPage'
import { useAuth } from './context/AuthContext'

function RoleRoute({
  children,
  allowedRoles


  
}) {
  const {
    user,
    isAuthenticated,
    loading
  } = useAuth()


  if (loading) {
    return (
      <div className="card-blur empty-state">
        Cargando...
      </div>
    )
  }


  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }


  if (
    !user ||
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    )
  }


  return children
}


export default function App() {
  return (
    <div className="app-shell">
      <div className="concert-bg" />

      <Navbar />

      <main className="page-shell">
        <Routes>
<Route
  path="/payment-success"
  element={
    <PaymentSuccessPage />
  }
/>
          <Route
  path="/forgot-password"
  element={<ForgotPasswordPage />}
/>

<Route
  path="/reset-password"
  element={<ResetPasswordPage />}
/>
<Route
  path="/account"
  element={
    <RoleRoute
      allowedRoles={[
        'USER',
        'STAFF',
        'ADMIN'
      ]}
    >
      <AccountPage />
    </RoleRoute>
  }
/>
          <Route
            path="/"
            element={<HomePage />}
          />

          <Route
            path="/evento/:slug"
            element={<EventPage />}
          />

          <Route
            path="/checkout"
            element={<CheckoutPage />}
          />

          <Route
            path="/tickets"
            element={
              <RoleRoute
                allowedRoles={[
                  'USER',
                  'STAFF',
                  'ADMIN'
                ]}
              >
                <TicketsPage />
              </RoleRoute>
            }
          />

          <Route
            path="/validate"
            element={
              <RoleRoute
                allowedRoles={[
                  'STAFF',
                  'ADMIN'
                ]}
              >
                <ValidateTicketPage />
              </RoleRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <RoleRoute
                allowedRoles={[
                  'ADMIN'
                ]}
              >
                <AdminPage />
              </RoleRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RoleRoute
                allowedRoles={[
                  'ADMIN'
                ]}
              >
                <DashboardPage />
              </RoleRoute>
            }
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

        </Routes>
      </main>

      <Footer />
    </div>
  )
}