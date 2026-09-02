import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

const ProtectedLink = ({ to, children, onClick, ...props }) => {
  const { isSignedIn } = useUser()
  const destination = isSignedIn ? to : '/sign-in'

  const handleClick = (e) => {
    if (!isSignedIn) {
      console.warn('Authentication required before opening protected link.')
    }

    if (onClick) {
      onClick(e)
    }
  }

  return (
    <Link to={destination} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}

export default ProtectedLink
