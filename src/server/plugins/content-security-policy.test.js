import { createServer } from '#/server/server.js'

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })

  test('Should let forms redirect to Entra ID to sign in', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    // ENTRA_ID_AUTHORITY is https://login.test/tenant-id in vitest.config.js
    expect(resp.headers['content-security-policy']).toContain(
      "form-action 'self' https://login.test;"
    )
  })

  test('Should allow WebSocket connections by scheme', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(resp.headers['content-security-policy']).toContain(
      "connect-src 'self' wss: data:;"
    )
  })
})
