import { vi } from 'vitest'

import { authPaths } from '#/server/auth/entra-id.js'
import { fakeEntraIdFetch } from './fake-entra-id.js'

/**
 * Signs a user in through the real sign-in flow, with fetch answered by a
 * fake Entra ID. If the test already spies on fetch, it's left as it was,
 * except that calls from signing in are cleared if it had no implementation.
 * @param {object} server
 * @param {object} [options] - fakeEntraIdFetch's options, and cookie: cookies to send
 * @returns the session cookie to send with later requests, and the callback response
 */
export async function signIn(server, { cookie, ...entraId } = {}) {
  const fetchWasMocked = vi.isMockFunction(globalThis.fetch)
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  const previousFetch = fetchSpy.getMockImplementation()
  fetchSpy.mockImplementation(fakeEntraIdFetch(entraId))

  try {
    const signInResponse = await server.inject({
      method: 'GET',
      url: authPaths.signIn,
      headers: cookie ? { cookie } : {}
    })
    const authorizeUrl = new URL(signInResponse.headers.location)
    const state = authorizeUrl.searchParams.get('state')
    // Entra ID puts the nonce from the sign-in request in the ID token
    fetchSpy.mockImplementation(
      fakeEntraIdFetch({
        ...entraId,
        claims: {
          nonce: authorizeUrl.searchParams.get('nonce'),
          ...entraId.claims
        }
      })
    )
    const signInCookie = mergeCookies(cookie, sessionCookie(signInResponse))

    const response = await server.inject({
      method: 'GET',
      url: `${authPaths.callback}?code=auth-code&state=${state}`,
      headers: { cookie: signInCookie }
    })

    return {
      cookie: mergeCookies(signInCookie, sessionCookie(response)),
      response
    }
  } finally {
    if (!fetchWasMocked) {
      fetchSpy.mockRestore()
    } else if (previousFetch) {
      fetchSpy.mockImplementation(previousFetch)
    } else {
      fetchSpy.mockReset()
    }
  }
}

/**
 * @returns the cookies a response sets, as a cookie header
 */
export function sessionCookie(response) {
  return [response.headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((setCookie) => setCookie.split(';')[0])
    .join('; ')
}

/**
 * Combines cookie headers. Later cookies replace earlier ones with the same
 * name, and cleared cookies are dropped.
 */
export function mergeCookies(...headers) {
  const cookies = new Map()

  for (const header of headers.filter(Boolean)) {
    for (const cookie of header.split('; ')) {
      const [name, value] = cookie.split(/=(.*)/s)
      if (value) {
        cookies.set(name, value)
      } else {
        cookies.delete(name)
      }
    }
  }

  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
}
