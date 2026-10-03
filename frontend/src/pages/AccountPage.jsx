import {
  useState
} from 'react'

import {
  useAuth
} from '../context/AuthContext'

import OrderHistory from '../components/OrderHistory'


const API_URL =
  'http://localhost:5000/api'


export default function AccountPage() {
  const {
    user,
    token
  } = useAuth()


  const [
    profileForm,
    setProfileForm
  ] = useState({
    name:
      user && user.name
        ? user.name
        : '',

    phone:
      user && user.phone
        ? user.phone
        : '',

    avatar:
      user && user.avatar
        ? user.avatar
        : ''
  })


  const [
    passwordForm,
    setPasswordForm
  ] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })


  const [
    profileMessage,
    setProfileMessage
  ] = useState('')


  const [
    passwordMessage,
    setPasswordMessage
  ] = useState('')


  const [
    loadingProfile,
    setLoadingProfile
  ] = useState(false)


  const [
    loadingPassword,
    setLoadingPassword
  ] = useState(false)


  function handleProfileChange(
    event
  ) {
    const {
      name,
      value
    } = event.target


    setProfileForm(
      (prev) => ({
        ...prev,
        [name]:
          value
      })
    )
  }


  function handlePasswordChange(
    event
  ) {
    const {
      name,
      value
    } = event.target


    setPasswordForm(
      (prev) => ({
        ...prev,
        [name]:
          value
      })
    )
  }


  async function handleProfileSubmit(
    event
  ) {
    event.preventDefault()


    try {
      setLoadingProfile(true)

      setProfileMessage('')


      const response =
        await fetch(
          `${API_URL}/auth/me`,
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`
            },

            body:
              JSON.stringify({
                name:
                  profileForm.name.trim(),

                phone:
                  profileForm.phone.trim(),

                avatar:
                  profileForm.avatar.trim()
              })
          }
        )


      const data =
        await response.json()


      if (!response.ok) {
        throw new Error(
          data.message ||
          'No se pudo actualizar el perfil'
        )
      }


      setProfileMessage(
        'Perfil actualizado correctamente.'
      )


      if (
        data.user
      ) {
        localStorage.setItem(
          'rocktickets_user',
          JSON.stringify(
            data.user
          )
        )
      }
    } catch (error) {
      setProfileMessage(
        error.message ||
        'No se pudo actualizar el perfil'
      )
    } finally {
      setLoadingProfile(false)
    }
  }


  async function handlePasswordSubmit(
    event
  ) {
    event.preventDefault()


    setPasswordMessage('')


    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordMessage(
        'Completa todos los campos'
      )

      return
    }


    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setPasswordMessage(
        'Las contraseñas nuevas no coinciden'
      )

      return
    }


    if (
      passwordForm.newPassword.length <
      6
    ) {
      setPasswordMessage(
        'La nueva contraseña debe tener al menos 6 caracteres'
      )

      return
    }


    try {
      setLoadingPassword(true)


      const response =
        await fetch(
          `${API_URL}/auth/change-password`,
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`
            },

            body:
              JSON.stringify({
                currentPassword:
                  passwordForm.currentPassword,

                newPassword:
                  passwordForm.newPassword
              })
          }
        )


      const data =
        await response.json()


      if (!response.ok) {
        throw new Error(
          data.message ||
          'No se pudo cambiar la contraseña'
        )
      }


      setPasswordMessage(
        'Contraseña actualizada correctamente.'
      )


      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      setPasswordMessage(
        error.message ||
        'No se pudo cambiar la contraseña'
      )
    } finally {
      setLoadingPassword(false)
    }
  }


  return (
    <div className="stack-lg">

      <section className="card-blur account-card">

        <h2>
          Mi cuenta
        </h2>


        <p className="muted">
          Administra tus datos personales y preferencias de cuenta.
        </p>


        <form
          className="form-grid"
          onSubmit={
            handleProfileSubmit
          }
        >

          <input
            name="name"
            placeholder="Nombre"
            value={
              profileForm.name
            }
            onChange={
              handleProfileChange
            }
            required
          />


          <input
            name="phone"
            placeholder="Teléfono"
            value={
              profileForm.phone
            }
            onChange={
              handleProfileChange
            }
          />


          <input
            name="avatar"
            placeholder="URL de avatar"
            value={
              profileForm.avatar
            }
            onChange={
              handleProfileChange
            }
          />


          <input
            value={
              user &&
              user.email
                ? user.email
                : ''
            }
            disabled
          />


          <button
            className="btn-primary"
            type="submit"
            disabled={
              loadingProfile
            }
          >

            {
              loadingProfile
                ? 'Guardando...'
                : 'Guardar cambios'
            }

          </button>

        </form>


        {profileMessage && (
          <div className="success-banner">
            {profileMessage}
          </div>
        )}

      </section>


      <section className="card-blur account-card">

        <h2>
          Cambiar contraseña
        </h2>


        <form
          className="form-grid"
          onSubmit={
            handlePasswordSubmit
          }
        >

          <input
            name="currentPassword"
            type="password"
            placeholder="Contraseña actual"
            value={
              passwordForm.currentPassword
            }
            onChange={
              handlePasswordChange
            }
            required
          />


          <input
            name="newPassword"
            type="password"
            placeholder="Nueva contraseña"
            value={
              passwordForm.newPassword
            }
            onChange={
              handlePasswordChange
            }
            required
          />


          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={
              passwordForm.confirmPassword
            }
            onChange={
              handlePasswordChange
            }
            required
          />


          <button
            className="btn-primary"
            type="submit"
            disabled={
              loadingPassword
            }
          >

            {
              loadingPassword
                ? 'Actualizando...'
                : 'Cambiar contraseña'
            }

          </button>

        </form>


        {passwordMessage && (
          <div className="success-banner">
            {passwordMessage}
          </div>
        )}

      </section>


      {/* =====================================================
          HISTORIAL DE COMPRAS
      ===================================================== */}

      <OrderHistory />

    </div>
  )
}