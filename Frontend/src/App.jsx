import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AuthLayout from './components/layouts/AuthLayout'
import PublicLayout from './components/layouts/PublicLayout'
import { GuestOnly, ProtectedRoute } from './components/ProtectedRoute'
import DashboardLayout from './Pages/dashboard/DashboardLayout'
import Appointments from './Pages/dashboard/Appointments'
import Absences from './Pages/dashboard/Absences'
import Clients from './Pages/dashboard/Clients'
import Finances from './Pages/dashboard/Finances'
import Journal from './Pages/dashboard/Journal'
import Notes from './Pages/dashboard/Notes'
import Overview from './Pages/dashboard/Overview'
import Prospects from './Pages/dashboard/Prospects'
import Reminders from './Pages/dashboard/Reminders'
import Settings from './Pages/dashboard/Settings'
import Subscription from './Pages/dashboard/Subscription'
import Stats from './Pages/dashboard/Stats'
import QrCodePage from './Pages/dashboard/QrCode'
import Page from './Pages/dashboard/Page'
import Home from './Pages/Home'
import Login from './Pages/Login'
import PresidentDashboard from './Pages/PresidentDashboard'
import PublicProfile from './Pages/PublicProfile'
import PublicAbout from './Pages/PublicAbout'
import PublicBooking from './Pages/PublicBooking'
import FounderBooking from './Pages/FounderBooking'
import DemoDashboard from './Pages/DemoDashboard'
import Register from './Pages/Register'
import Onboarding from './Pages/Onboarding'
import Subscribe from './Pages/Subscribe'
import BillingLock from './Pages/BillingLock'
import Cgv from './Pages/legal/Cgv'
import MentionsLegales from './Pages/legal/MentionsLegales'
import PolitiqueConfidentialite from './Pages/legal/PolitiqueConfidentialite'
import PreviewExpiryWatcher from './components/PreviewExpiryWatcher'
import IdleSessionWatcher from './components/IdleSessionWatcher'
import AnalyticsBeacon from './components/AnalyticsBeacon'
import ConsentBanner from './components/ConsentBanner'
import { canVisitModule } from './data/workspace'
import { isAdminHost, siteOrigin } from './config/site'
import SiteStatusGate from './components/SiteStatusGate'
import PageLoader from './components/PageLoader'

function ModuleRoute({ id, children }) {
  const { user } = useAuth()
  if (!user || canVisitModule(user, id)) return children
  return <Navigate to="/dashboard" replace />
}

function AdminGate({ children }) {
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (loading || !user || user.role === 'president') return
    logout()
    window.location.replace(siteOrigin())
  }, [user, loading, logout])

  if (loading) return <PageLoader />
  if (user && user.role !== 'president') return <PageLoader />
  return children
}

function AdminApp() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
      </Route>
      <Route
        path="/"
        element={
          <ProtectedRoute requirePresident>
            <PresidentDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PublicApp() {
  return (
    <SiteStatusGate>
    <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/rdv" element={<FounderBooking />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/cgv" element={<Cgv />} />
            <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
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
            path="/facture"
            element={
              <ProtectedRoute>
                <BillingLock />
              </ProtectedRoute>
            }
          />

          <Route
            path="/president"
            element={
              <ProtectedRoute requirePresident>
                <PresidentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireSubscription>
                <Onboarding />
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
            <Route
              path="taches"
              element={
                <ModuleRoute id="tasks">
                  <Journal />
                </ModuleRoute>
              }
            />
            <Route path="journal" element={<Navigate to="/dashboard/taches" replace />} />
            <Route path="clients" element={<Clients />} />
            <Route
              path="prospects"
              element={
                <ModuleRoute id="prospects">
                  <Prospects />
                </ModuleRoute>
              }
            />
            <Route
              path="notes"
              element={
                <ModuleRoute id="notes">
                  <Notes />
                </ModuleRoute>
              }
            />
            <Route
              path="rdv"
              element={
                <ModuleRoute id="appointments">
                  <Appointments />
                </ModuleRoute>
              }
            />
            <Route path="conges" element={<Absences />} />
            <Route
              path="finances"
              element={
                <ModuleRoute id="finances">
                  <Finances />
                </ModuleRoute>
              }
            />
            <Route
              path="relances"
              element={
                <ModuleRoute id="reminders">
                  <Reminders />
                </ModuleRoute>
              }
            />
            <Route path="inbox" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="statistiques"
              element={
                <ModuleRoute id="stats">
                  <Stats />
                </ModuleRoute>
              }
            />
            <Route path="automatisation" element={<Navigate to="/dashboard" replace />} />
            <Route path="parametres" element={<Settings />} />
            <Route path="abonnement" element={<Subscription />} />
            <Route
              path="page"
              element={
                <ModuleRoute id="page">
                  <Page />
                </ModuleRoute>
              }
            />
            <Route
              path="qr-code"
              element={
                <ModuleRoute id="qr">
                  <QrCodePage />
                </ModuleRoute>
              }
            />
          </Route>

          <Route path="/p/:slug" element={<PublicProfile />} />
          <Route path="/p/:slug/a-propos" element={<PublicAbout />} />
          <Route path="/p/:slug/reserver" element={<PublicBooking />} />
          <Route path="/apercu/dashboard" element={<DemoDashboard />} />

          <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </SiteStatusGate>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <PreviewExpiryWatcher />
          <IdleSessionWatcher />
          <AnalyticsBeacon />
          <ConsentBanner />
          {isAdminHost() ? (
            <AdminGate>
              <AdminApp />
            </AdminGate>
          ) : (
            <PublicApp />
          )}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
