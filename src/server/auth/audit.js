import { audit } from '@defra/cdp-auditing'
import { getTraceId } from '@defra/hapi-tracing'

/**
 * Sign-in and sign-out events, written to CDP's audit stream, separate from
 * the application logs. Locally they're printed to the console.
 *
 * Fields follow Elastic Common Schema (ECS), like our logs. trace.id is CDP's
 * request ID, to find the request in the application logs.
 */
function auditEvent(event, user, message) {
  const traceId = getTraceId()

  audit(
    {
      event,
      ...(user && { user: { id: user.id, name: user.name } }),
      ...(traceId && { trace: { id: traceId } })
    },
    message
  )
}

export function auditSignIn(user) {
  auditEvent({ action: 'sign-in', outcome: 'success' }, user, 'User signed in')
}

export function auditSignInFailure(reason) {
  auditEvent(
    { action: 'sign-in', outcome: 'failure', reason },
    undefined,
    'User could not sign in'
  )
}

export const signOutReasons = {
  user: 'user',
  tokenRefreshFailed: 'token refresh failed'
}

/**
 * @param {object} user
 * @param {string} reason - one of signOutReasons: the user chose to, or we signed them out
 */
export function auditSignOut(user, reason) {
  auditEvent(
    { action: 'sign-out', outcome: 'success', reason },
    user,
    reason === signOutReasons.user ? 'User signed out' : 'User was signed out'
  )
}
