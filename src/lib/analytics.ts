import mixpanel from 'mixpanel-browser'

const MIXPANEL_TOKEN = '8027a413c8faa5f25e441f2c6c38669c'

let initialized = false

export function init() {
  if (typeof window === 'undefined' || initialized) return
  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: false,
    persistence: 'localStorage',
  })
  initialized = true
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (!initialized) return
  mixpanel.identify(userId)
  if (props) mixpanel.people.set(props)
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized) return
  mixpanel.track(event, props)
}

export function reset() {
  if (!initialized) return
  mixpanel.reset()
}

export const analytics = { init, identify, track, reset }
