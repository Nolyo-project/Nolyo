import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initGoogleAnalytics, shouldTrackPath, trackPageView } from '../utils/analytics'
import { isAdminHost } from '../config/site'

let gaReady = false

function AnalyticsBeacon() {
  const location = useLocation()

  useEffect(() => {
    if (isAdminHost()) return
    if (!gaReady) {
      initGoogleAnalytics()
      gaReady = true
    }
  }, [])

  useEffect(() => {
    if (isAdminHost()) return
    if (!shouldTrackPath(location.pathname)) return
    trackPageView(location.pathname)
  }, [location.pathname, location.search])

  return null
}

export default AnalyticsBeacon
