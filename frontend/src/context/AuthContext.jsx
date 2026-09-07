import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const API_URL = 'http://localhost:5000/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('rocktickets_user')
    return storedUser ? JSON.parse(storedUser) : null
  })

  const [token, setToken] = useState(() => {
    return localStorage.getItem('rocktickets_token')
  })

  const [loading, setLoading] = useState(true)

  const isAuthenticated = Boolean(user && token)

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        if (!token) {
          setLoading(false)
          return
        }

        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          logout()
          return
        }

        const data = await response.json()

        setUser(data.user)
        localStorage.setItem('rocktickets_user', JSON.stringify(data.user))
      } catch (error) {
        console.error('Error loading current user:', error)
        logout()
      } finally {
        setLoading(false)
      }
    }

    loadCurrentUser()
  }, [token])

  const register = async ({ name, email, password }) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo registrar el usuario')
    }

    setUser(data.user)
    setToken(data.token)

    localStorage.setItem('rocktickets_user', JSON.stringify(data.user))
    localStorage.setItem('rocktickets_token', data.token)

    return data
  }

  const login = async ({ email, password }) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo iniciar sesión')
    }

    setUser(data.user)
    setToken(data.token)

    localStorage.setItem('rocktickets_user', JSON.stringify(data.user))
    localStorage.setItem('rocktickets_token', data.token)

    return data
  }

  const logout = () => {
    setUser(null)
    setToken(null)

    localStorage.removeItem('rocktickets_user')
    localStorage.removeItem('rocktickets_token')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        register,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}