import {
  Navigate,
  Route,
  Routes
} from 'react-router-dom'

import LoginPage
  from './pages/LoginPage'

import EventsPage
  from './pages/EventsPage'

import ScannerPage
  from './pages/ScannerPage'

import ProtectedRoute
  from './components/ProtectedRoute'


export default function App() {
  return (
    <Routes>

      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />


      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <EventsPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/scanner/:eventId"
        element={
          <ProtectedRoute>
            <ScannerPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/"
        element={
          <Navigate
            to="/events"
            replace
          />
        }
      />


      <Route
        path="*"
        element={
          <Navigate
            to="/events"
            replace
          />
        }
      />

    </Routes>
  )
}