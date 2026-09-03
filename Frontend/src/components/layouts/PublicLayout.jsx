import { Outlet } from 'react-router-dom'
import Footer from '../Footer'
import Header from '../Header'

function PublicLayout() {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <Header />
      <Outlet />
      <Footer />
    </div>
  )
}

export default PublicLayout
