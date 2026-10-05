import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { checkHealth } from '#/server/services/calculator-api.js'

vi.mock('#/server/services/calculator-api.js')

describe('#checkApiConnectionController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should show a working connection without signing in', async () => {
    checkHealth.mockResolvedValue({
      url: 'https://calculator-api.test/admin/health',
      ok: true,
      status: '200 OK',
      body: 'Healthy',
      durationMs: 12
    })

    const { result, statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/check-api-connection'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(headers['set-cookie']).toBeUndefined()
    expect(result).toEqual(expect.stringContaining('<td>OK</td>'))
    expect(result).toEqual(
      expect.stringContaining('https://calculator-api.test/admin/health')
    )
    expect(result).toEqual(expect.stringContaining('12 ms'))
    expect(result).not.toEqual(expect.stringContaining('govuk-'))
  })

  test('Should show why the API could not be reached', async () => {
    checkHealth.mockResolvedValue({
      url: 'https://calculator-api.test/admin/health',
      ok: false,
      error: 'fetch failed: <ECONNREFUSED>',
      durationMs: 3
    })

    const { result } = await server.inject({
      method: 'GET',
      url: '/check-api-connection'
    })

    expect(result).toEqual(expect.stringContaining('<td>FAILED</td>'))
    expect(result).toEqual(expect.stringContaining('No response'))
    expect(result).toEqual(
      expect.stringContaining('fetch failed: &lt;ECONNREFUSED&gt;')
    )
  })
})
