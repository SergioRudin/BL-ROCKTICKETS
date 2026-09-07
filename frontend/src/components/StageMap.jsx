const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0
  }).format(price)
}

export default function StageMap({ zones = [] }) {
  const getZone = (code) => {
    return zones.find(
      (zone) => zone.code?.toUpperCase() === code.toUpperCase()
    )
  }

  const vipZone = getZone('VIP')
  const generalZone = getZone('GENERAL')

  const getAvailable = (zone) => {
    if (!zone) return 0
    return Number(zone.capacity || 0) - Number(zone.sold || 0)
  }

  return (
    <section className="stage-layout card-blur">
      <div className="stage-roof"></div>

      <div className="stage">
        <span>STAGE</span>
      </div>

      <div className="venue-zones">
        {vipZone && (
          <button className="zone zone-vip">
            <h3>{vipZone.name}</h3>

       <div className="zone-tooltip">
          <h4>{vipZone.name}</h4>
          <strong>{formatPrice(vipZone.price)}</strong>
          <span>{getAvailable(vipZone)} disponibles</span>
        </div>
          </button>
        )}

        {generalZone && (
          <button className="zone zone-general">
            <h3>{generalZone.name}</h3>

        <div className="zone-tooltip">
          <h4>{generalZone.name}</h4>
          <strong>{formatPrice(generalZone.price)}</strong>
          <span>{getAvailable(generalZone)} disponibles</span>
        </div>
          </button>
        )}
      </div>
    </section>
  )
}