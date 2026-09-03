import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AuthLayout from './components/layouts/AuthLayout'
import PublicLayout from './components/layouts/PublicLayout'
import { GuestOnly, ProtectedRoute } from './components/ProtectedRoute'
import DashboardLayout from './Pages/dashboard/DashboardLayout'
import Appointments from './Pages/dashboard/Appointments'
import Clients from './Pages/dashboard/Clients'
import Finances from './Pages/dashboard/Finances'
import Inbox from './Pages/dashboard/Inbox'
import Journal from './Pages/dashboard/Journal'
import Notes from './Pages/dashboard/Notes'
import Overview from './Pages/dashboard/Overview'
import Prospects from './Pages/dashboard/Prospects'
import Reminders from './Pages/dashboard/Reminders'
import Settings from './Pages/dashboard/Settings'
import Stats from './Pages/dashboard/Stats'
import Home from './Pages/Home'
import Login from './Pages/Login'
import PresidentDashboard from './Pages/PresidentDashboard'
import Register from './Pages/Register'
import Subscribe from './Pages/Subscribe'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="/abonnement" element={<Subscribe />} />
            <Route
              path="/login"
              element={
                <GuestOnly>
                  <Login />
                </GuestOnly>
              }
            />
            <Route
              path="/inscription"
              element={
                <GuestOnly>
                  <Register />
                </GuestOnly>
              }
            />
          </Route>

          <Route
            path="/president"
            element={
              <ProtectedRoute requirePresident>
                <PresidentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireSubscription>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="taches" element={<Journal />} />
            <Route path="journal" element={<Navigate to="/dashboard/taches" replace />} />
            <Route path="clients" element={<Clients />} />
            <Route path="prospects" element={<Prospects />} />
            <Route path="notes" element={<Notes />} />
            <Route path="rdv" element={<Appointments />} />
            <Route path="finances" element={<Finances />} />
            <Route path="relances" element={<Reminders />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="statistiques" element={<Stats />} />
            <Route path="automatisation" element={<Navigate to="/dashboard/inbox" replace />} />
            <Route path="parametres" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
