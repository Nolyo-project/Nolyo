import { Link } from 'react-router-dom'

function Logo({ to = '/', inverted = false, className = '', size = 'md' }) {
  const compact = size === 'sm'
  const classes = `inline-flex items-center ${className}`.trim()
  const label = (
    <span
      className={
        compact
          ? `text-[10px] font-semibold tracking-[0.18em] uppercase ${inverted ? 'text-cream/80' : 'text-ink/55'}`
          : `font-display text-[1.65rem] leading-none tracking-tight sm:text-[1.85rem] ${
              inverted ? 'text-cream' : 'text-moss'
            }`
      }
    >
      Nolyo
    </span>
  )

  if (/^https?:\/\//.test(to)) {
    return (
      <a href={to} className={classes} aria-label="Nolyo">
        {label}
      </a>
    )
  }

  return (
    <Link to={to} className={classes} aria-label="Nolyo">
      {label}
    </Link>
  )
}

export default Logo
