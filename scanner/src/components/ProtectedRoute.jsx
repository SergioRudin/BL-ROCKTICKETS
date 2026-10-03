import {
  Navigate
} from 'react-router-dom'

import {
  useAuth
} from '../context/AuthContext'


export default function ProtectedRoute({
  children
}) {
  const {
    user,
    loading,
    isAuthenticated
  } = useAuth()


  if (loading) {
    return (
      <div className="scanner-loading">
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
    user.role !== 'STAFF' &&
    user.role !== 'ADMIN'
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }


  return children
}