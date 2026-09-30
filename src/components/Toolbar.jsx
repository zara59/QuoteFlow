import SearchField from './SearchField'

function FilterSelect({ value, onChange, options, label }) {
  return (
    <select
      className="qf-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** Filter row: search on the left, selects + result count on the right. */
export default function Toolbar({
  search,
  onSearch,
  searchPlaceholder,
  searchLabel = 'Search',
  filters = [],
  count,
}) {
  return (
    <div className="qf-toolbar">
      <div className="qf-toolbar__search">
        <SearchField
          value={search}
          onChange={onSearch}
          placeholder={searchPlaceholder}
          label={searchLabel}
        />
      </div>

      {filters.length > 0 && (
        <div className="qf-toolbar__filters">
          {filters.map((filter) => (
            <FilterSelect
              key={filter.label}
              label={filter.label}
              value={filter.value}
              onChange={filter.onChange}
              options={filter.options}
            />
          ))}
        </div>
      )}

      {count && <span className="qf-toolbar__count">{count}</span>}
    </div>
  )
}
