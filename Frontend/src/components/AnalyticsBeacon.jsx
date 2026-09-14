import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getConsent } from '../utils/consent'
import { captureAcquisition, initMarketingPixels, shouldTrackPath, trackPageView } from '../utils/analytics'
import { isAdminHost } from '../config/site'

function AnalyticsBeacon() {
  const location = useLocation()

  useEffect(() => {
    if (isAdminHost()) return
    captureAcquisition()
    const consent = getConsent()
    if (consent?.analytics || consent?.ads) initMarketingPixels()
  }, [])

  useEffect(() => {
    if (isAdminHost()) return
    captureAcquisition()
    if (!shouldTrackPath(location.pathname)) return
    trackPageView(location.pathname)
  }, [location.pathname, location.search])

  return null
}

export default AnalyticsBeacon
