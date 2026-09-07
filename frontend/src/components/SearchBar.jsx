export default function SearchBar({ value, onChange, category, onCategoryChange }) {
  return (
    <div className="search-panel card-blur">
      <input
        type="text"
        placeholder="Busca por banda, venue o ciudad"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
        <option value="">Todas las categorías</option>
        <option value="Festival">Festival</option>
        <option value="Concierto">Concierto</option>
        <option value="Metal">Metal</option>
      </select>
    </div>
  )
}
