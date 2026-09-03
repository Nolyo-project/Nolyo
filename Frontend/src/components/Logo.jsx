import { Link } from 'react-router-dom'
import nolioLogo from '../assets/nolio-logo.png'

function Logo({ to = '/', inverted = false }) {
  return (
    <Link to={to} className="inline-flex items-center" aria-label="Nolio">
      <img
        src={nolioLogo}
        alt="Nolio"
        className={`h-8 w-auto sm:h-9 ${inverted ? 'brightness-0 invert' : ''}`}
      />
    </Link>
  )
}

export default Logo
