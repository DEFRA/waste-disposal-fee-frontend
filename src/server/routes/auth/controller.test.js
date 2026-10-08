import { audit } from '@defra/cdp-auditing'

import { config } from '#/config/config.js'
import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getCalculatorRuns,
  getRelativeYears
} from '#/server/services/calculator-api.js'
import { sessionCookie, signIn } from '#/test-helpers/sign-in.js'
import {
  entraIdUrls,
  fakeAccessToken,
  fakeEntraIdFetch
} from '#/test-helpers/fake-entra-id.js'

vi.mock('#/server/services/calculator-api.js')
vi.mock('@defra/cdp-auditing')

function tokenRequests(fetchSpy) {
  return fetchSpy.mock.calls
    .filter(([url]) => String(url) === entraIdUrls.token)
    .map(([, request]) => Object.fromEntries(request.body))
}

describe('#auth', () => {
  let server
  const fetchSpy = vi.spyOn(global, 'fetch')

  // Entra ID settings come from the env in vitest.config.js
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    fetchSpy.mockReset()
    fetchSpy.mockImplementation(fakeEntraIdFetch())
    getRelativeYears.mockResolvedValue([])
    getCalculatorRuns.mockResolvedValue([])
  })

  afterAll(async () => {
    fetchSpy.mockRestore()
    await server.stop({ timeout: 0 })
  })

  test('Should send a user who is not signed in to sign in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/auth/sign-in')
  })

  test('Should not need sign in for the health check', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should redirect to Entra ID with PKCE and the API scope', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in'
    })

    expect(statusCode).toBe(statusCodes.redirect)

    const location = new URL(headers.location)
    expect(`${location.origin}${location.pathname}`).toBe(entraIdUrls.authorize)
    expect(location.searchParams.get('client_id')).toBe('frontend-client-id')
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/signin-oidc'
    )
    expect(location.searchParams.get('scope')).toBe(
      'openid profile offline_access api://calculator-api/.default'
    )
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.get('nonce')).toEqual(expect.any(String))
    expect(location.searchParams.get('response_mode')).toBe('query')
  })

  // On CDP, fetch goes through the proxy (NODE_USE_ENV_PROXY). Other HTTP clients may not.
  test('Should call Entra ID with fetch', async () => {
    await signIn(server)

    expect(fetchSpy).toHaveBeenCalledWith(
      entraIdUrls.discovery,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(tokenRequests(fetchSpy)).toEqual([
      expect.objectContaining({
        grant_type: 'authorization_code',
        code: 'auth-code',
        client_id: 'frontend-client-id',
        client_secret: 'frontend-client-secret'
      })
    ])
  })

  test('Should return the user to the page they asked for after sign in', async () => {
    const firstVisit = await server.inject({
      method: 'GET',
      url: '/?relativeYear=2025'
    })

    const { response } = await signIn(server, {
      cookie: sessionCookie(firstVisit)
    })

    expect(response.statusCode).toBe(statusCodes.redirect)
    expect(response.headers.location).toBe('/?relativeYear=2025')
  })

  test('Should start a new session at sign in, so the one from before is no use', async () => {
    const firstVisit = await server.inject({
      method: 'GET',
      url: '/'
    })
    const sessionBeforeSignIn = sessionCookie(firstVisit)

    await signIn(server, { cookie: sessionBeforeSignIn })

    const { headers } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie: sessionBeforeSignIn }
    })
    expect(headers.location).toBe('/auth/sign-in')
  })

  test('Should audit signing in', async () => {
    await signIn(server)

    expect(audit).toHaveBeenCalledWith(
      {
        event: { action: 'sign-in', outcome: 'success' },
        user: { id: 'user-object-id', name: 'Jo Bloggs' }
      },
      'User signed in'
    )
  })

  test('Should show the sign in failed page, and audit it, when sign in fails', async () => {
    const signInResponse = await server.inject({
      method: 'GET',
      url: '/auth/sign-in'
    })
    const state = new URL(signInResponse.headers.location).searchParams.get(
      'state'
    )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/signin-oidc?error=access_denied&state=${state}`,
      headers: { cookie: sessionCookie(signInResponse) }
    })

    expect(statusCode).toBe(statusCodes.unauthorized)
    expect(result).toEqual(
      expect.stringContaining('Sorry, you could not be signed in')
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<a href="/" class="govuk-link">Try signing in again</a>'
      )
    )
    expect(audit).toHaveBeenCalledWith(
      {
        event: {
          action: 'sign-in',
          outcome: 'failure',
          reason: expect.any(String)
        }
      },
      'User could not sign in'
    )
  })

  test('Should show the sign in failed page when the callback has no sign-in cookie', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/signin-oidc?code=auth-code&state=forged'
    })

    expect(statusCode).toBe(statusCodes.unauthorized)
  })

  test('Should sign the user out of the frontend and Entra ID, and audit it', async () => {
    const { cookie } = await signIn(server)

    const signOut = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      headers: { cookie }
    })

    expect(signOut.statusCode).toBe(statusCodes.redirect)
    expect(signOut.headers.location).toBe(
      'https://login.test/tenant-id/oauth2/v2.0/logout?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fsigned-out'
    )
    expect(audit).toHaveBeenCalledWith(
      {
        event: { action: 'sign-out', outcome: 'success', reason: 'user' },
        user: { id: 'user-object-id', name: 'Jo Bloggs' }
      },
      'User signed out'
    )

    const afterSignOut = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    expect(afterSignOut.headers.location).toBe('/auth/sign-in')
  })

  test('Should show the signed out page without signing in', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/auth/signed-out'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('You have signed out'))
  })

  test('Should refresh an access token that is about to expire', async () => {
    const { cookie } = await signIn(server, {
      accessToken: fakeAccessToken({ expiresIn: 60 })
    })
    const refreshedAccessToken = fakeAccessToken({ name: 'refreshed' })
    fetchSpy.mockClear()
    fetchSpy.mockImplementation(
      fakeEntraIdFetch({
        accessToken: refreshedAccessToken,
        refreshToken: 'refreshed-refresh-token'
      })
    )

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(tokenRequests(fetchSpy)).toEqual([
      expect.objectContaining({
        grant_type: 'refresh_token',
        refresh_token: 'user-refresh-token',
        client_id: 'frontend-client-id',
        client_secret: 'frontend-client-secret',
        scope: 'openid profile offline_access api://calculator-api/.default'
      })
    ])
    expect(getRelativeYears).toHaveBeenCalledWith(refreshedAccessToken)
  })

  test('Should not refresh an access token that is still valid', async () => {
    const { cookie } = await signIn(server)
    fetchSpy.mockClear()

    await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    expect(tokenRequests(fetchSpy)).toEqual([])
  })

  test('Should send the user to sign in again, and audit it, when refresh fails', async () => {
    const { cookie } = await signIn(server, {
      accessToken: fakeAccessToken({ expiresIn: 60 })
    })
    fetchSpy.mockImplementation(
      fakeEntraIdFetch({
        tokenError: Response.json({ error: 'invalid_grant' }, { status: 400 })
      })
    )

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/auth/sign-in')
    expect(getRelativeYears).not.toHaveBeenCalled()
    expect(audit).toHaveBeenCalledWith(
      {
        event: {
          action: 'sign-out',
          outcome: 'success',
          reason: 'token refresh failed'
        },
        user: { id: 'user-object-id', name: 'Jo Bloggs' }
      },
      'User was signed out'
    )
  })
})

describe('#auth when Entra ID is not configured', () => {
  let server

  beforeAll(async () => {
    config.set('entraId.clientSecret', '')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    config.set('entraId.clientSecret', 'frontend-client-secret')
    await server.stop({ timeout: 0 })
  })

  test.each(['/auth/sign-in', '/signin-oidc'])(
    'Should say which settings are missing on %s instead of redirecting',
    async (url) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.serviceUnavailable)
      expect(result).toEqual(expect.stringContaining('Sign-in is not set up'))
      expect(result).toEqual(
        expect.stringContaining('<code>ENTRA_ID_CLIENT_SECRET</code>')
      )
      expect(result).not.toEqual(
        expect.stringContaining('<code>ENTRA_ID_CLIENT_ID</code>')
      )
    }
  )
})
