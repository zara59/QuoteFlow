import { IconSearch, IconX } from './Icons'

export default function SearchField({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return (
    <div className="qf-input-wrap">
      <IconSearch size={16} />
      <input
        type="search"
        className="qf-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {value && (
        <button
          type="button"
          className="qf-input-wrap__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <IconX size={15} />
        </button>
      )}
    </div>
  )
}
