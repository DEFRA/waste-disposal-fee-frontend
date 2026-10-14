import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { sessionCookie, signIn } from '#/test-helpers/sign-in.js'

describe('#csrf', () => {
  let server
  let cookie

  beforeAll(async () => {
    server = await createServer()
    server.route({
      method: ['GET', 'POST'],
      path: '/test-form',
      handler: (request) => ({ crumb: request.plugins.crumb })
    })
    server.route({
      method: 'GET',
      path: '/test-view',
      handler: (_request, h) =>
        h.view('auth/signed-out', { pageTitle: 'Test', heading: 'Test' })
    })
    await server.initialize()
    ;({ cookie } = await signIn(server))
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function getCrumb() {
    const response = await server.inject({
      method: 'GET',
      url: '/test-form',
      headers: { cookie }
    })
    // The first page after signing in sets the crumb cookie
    return {
      token: response.result.crumb,
      cookie: [cookie, sessionCookie(response)].filter(Boolean).join('; ')
    }
  }

  test('Should accept a POST with the CSRF token', async () => {
    const { token, cookie: cookieWithCrumb } = await getCrumb()

    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/test-form',
      headers: { cookie: cookieWithCrumb },
      payload: { crumb: token }
    })

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should reject a POST without the CSRF token', async () => {
    const { cookie: cookieWithCrumb } = await getCrumb()

    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/test-form',
      headers: { cookie: cookieWithCrumb },
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })

  test('Should not need the CSRF token, or set its cookie, on the sign-in callback', async () => {
    const { response } = await signIn(server)

    expect(response.statusCode).toBe(statusCodes.redirect)
    expect(sessionCookie(response)).not.toContain('crumb=')
  })

  test('Should add the token to views as crumb, for appCsrfField', async () => {
    const { token, cookie: cookieWithCrumb } = await getCrumb()

    const { request } = await server.inject({
      method: 'GET',
      url: '/test-view',
      headers: { cookie: cookieWithCrumb }
    })

    expect(request.response.source.context.crumb).toBe(token)
  })
})
