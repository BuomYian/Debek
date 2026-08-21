import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Rewritten from shadcn's generated useState+useEffect version: that
// version called setState synchronously inside the effect body to seed
// the initial value, which the project's react-hooks lint rule
// (set-state-in-effect) flags as cascading-render risk. useSyncExternalStore
// is the React-recommended pattern for subscribing to external browser
// state like matchMedia anyway, and it sidesteps the issue entirely
// rather than suppressing the rule. If `npx shadcn add sidebar` is run
// again, re-apply this fix.
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
