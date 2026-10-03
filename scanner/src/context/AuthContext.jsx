import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import {
  loginScanner
} from '../utils/api'


const AuthContext =
  createContext(null)


export function AuthProvider({
  children
}) {
  const [user, setUser] =
    useState(null)

  const [token, setToken] =
    useState(
      localStorage.getItem(
        'rocktickets_scanner_token'
      )
    )

  const [loading, setLoading] =
    useState(true)


  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        'rocktickets_scanner_user'
      )

    if (
      token &&
      storedUser
    ) {
      try {
        setUser(
          JSON.parse(
            storedUser
          )
        )
      } catch (error) {
        console.error(
          'Error leyendo usuario del scanner:',
          error
        )

        localStorage.removeItem(
          'rocktickets_scanner_user'
        )
      }
    }

    setLoading(false)
  }, [token])


  async function login(
    email,
    password
  ) {
    const result =
      await loginScanner(
        email,
        password
      )


    if (
      !result.user ||
      !result.token
    ) {
      throw new Error(
        'Respuesta de autenticación inválida'
      )
    }


    const role =
      result.user.role


    if (
      role !== 'STAFF' &&
      role !== 'ADMIN'
    ) {
      throw new Error(
        'Tu cuenta no tiene permisos para utilizar RockTickets Scanner'
      )
    }


    localStorage.setItem(
      'rocktickets_scanner_token',
      result.token
    )

    localStorage.setItem(
      'rocktickets_scanner_user',
      JSON.stringify(
        result.user
      )
    )


    setToken(
      result.token
    )

    setUser(
      result.user
    )


    return result.user
  }


  function logout() {
    localStorage.removeItem(
      'rocktickets_scanner_token'
    )

    localStorage.removeItem(
      'rocktickets_scanner_user'
    )

    setToken(null)
    setUser(null)
  }


  const isAuthenticated =
    Boolean(
      token &&
      user
    )


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  return useContext(
    AuthContext
  )
}