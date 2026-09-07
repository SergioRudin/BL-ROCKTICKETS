import { useState } from 'react'

export default function TransferTicketModal({
  open,
  onClose,
  onConfirm
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [transferAccepted, setTransferAccepted] = useState(false)

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!transferAccepted) return

    onConfirm({
      ownerName: name,
      ownerEmail: email
    })
  }

  return (
    <div className="modal-backdrop">
      <div className="transfer-modal">
        <h2>Transferir Ticket</h2>

        <p>
          El nuevo propietario será quien pueda utilizar esta entrada.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Nombre</label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="transfer-warning-box">
            <strong>Importante antes de transferir</strong>

            <p>
              Este ticket solo puede transferirse una vez. Después de completar la transferencia,
              no podrá enviarse nuevamente a otra persona.
            </p>

            <label className="transfer-confirm-check">
              <input
                type="checkbox"
                checked={transferAccepted}
                onChange={(e) => setTransferAccepted(e.target.checked)}
              />
              Entiendo que la transferencia solo puede realizarse una vez.
            </label>
          </div>

          <div className="transfer-buttons">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              className="btn-primary"
              disabled={!transferAccepted}
            >
              Transferir
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}