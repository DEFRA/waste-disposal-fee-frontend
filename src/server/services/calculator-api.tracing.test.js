import { createServer } from '#/server/server.js'

describe('#calculatorApi tracing', () => {
  let server
  const fetchSpy = vi.spyOn(global, 'fetch')

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    fetchSpy.mockRestore()
    await server.stop({ timeout: 0 })
  })

  test("Should pass the incoming request's x-cdp-request-id to the API", async () => {
    fetchSpy.mockResolvedValueOnce(new Response('Healthy'))

    await server.inject({
      method: 'GET',
      url: '/check-api-connection',
      headers: { 'x-cdp-request-id': 'request-abc' }
    })

    expect(fetchSpy.mock.calls[0][1].headers).toEqual({
      'x-cdp-request-id': 'request-abc'
    })
  })
})
