import { config } from '#/config/config.js'
import { getTraceId } from '@defra/hapi-tracing'
import {
  checkHealth,
  getCalculatorRuns,
  getRelativeYears
} from '#/server/services/calculator-api.js'

vi.mock('@defra/hapi-tracing', async (importOriginal) => {
  const tracing = await importOriginal()
  return {
    ...tracing,
    getTraceId: vi.fn(),
    withTraceId: (name, headers = {}) => {
      const traceId = getTraceId()
      return traceId ? { ...headers, [name]: traceId } : headers
    }
  }
})

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('#calculatorApi', () => {
  const fetchSpy = vi.spyOn(global, 'fetch')

  beforeAll(() => {
    config.set('calculatorApi.baseUrl', 'https://calculator-api.test')
  })

  beforeEach(() => {
    fetchSpy.mockReset()
  })

  afterAll(() => {
    fetchSpy.mockRestore()
  })

  test("Should call the API with the user's access token", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([{ runId: 1 }]))

    const result = await getCalculatorRuns(2025, 'user-token')

    expect(result).toEqual([{ runId: 1 }])

    const [url, request] = fetchSpy.mock.calls[0]
    expect(url.href).toBe(
      'https://calculator-api.test/v1/calculatorRuns?relativeYear=2025'
    )
    expect(request.headers.Authorization).toBe('Bearer user-token')
  })

  test('Should throw when the API call fails', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, 403))

    await expect(getRelativeYears('user-token')).rejects.toThrow(
      'Calculator API GET /v1/RelativeYears failed (403'
    )
  })

  test('Should say why the API could not be reached', async () => {
    fetchSpy.mockRejectedValueOnce(
      new TypeError('fetch failed', {
        cause: { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' }
      })
    )

    await expect(getRelativeYears('user-token')).rejects.toThrow(
      'Calculator API /v1/RelativeYears could not be reached (fetch failed: DEPTH_ZERO_SELF_SIGNED_CERT)'
    )
  })

  describe('When the API is slow', () => {
    // Waits for fetch's signal to abort, like a real request to an API that never answers
    const neverResponds = (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason))
      })

    beforeEach(() => {
      config.set('outboundRequestTimeout', 10)
    })

    afterEach(() => {
      config.set('outboundRequestTimeout', 20000)
    })

    test('Should give up waiting for the API', async () => {
      fetchSpy.mockImplementationOnce(neverResponds)

      await expect(getRelativeYears('user-token')).rejects.toThrow(
        'Calculator API /v1/RelativeYears could not be reached (no response within 10 ms)'
      )
    })

    test('Should give up waiting for the health check', async () => {
      fetchSpy.mockImplementationOnce(neverResponds)

      expect(await checkHealth()).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'no response within 10 ms'
        })
      )
    })
  })

  test('Should report a healthy API', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('Healthy', { status: 200 }))

    const result = await checkHealth()

    expect(fetchSpy.mock.calls[0][0].href).toBe(
      'https://calculator-api.test/admin/health'
    )
    expect(fetchSpy.mock.calls[0][1].headers).toEqual({})
    expect(result).toEqual({
      url: 'https://calculator-api.test/admin/health',
      ok: true,
      status: '200',
      body: 'Healthy',
      durationMs: expect.any(Number)
    })
  })

  test('Should report an API that cannot be reached', async () => {
    fetchSpy.mockRejectedValueOnce(
      new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })
    )

    expect(await checkHealth()).toEqual({
      url: 'https://calculator-api.test/admin/health',
      ok: false,
      error: 'fetch failed: ECONNREFUSED',
      durationMs: expect.any(Number)
    })
  })

  test("Should pass on CDP's request ID", async () => {
    getTraceId.mockReturnValue('trace-123')
    fetchSpy
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(new Response('Healthy'))

    await getRelativeYears('user-token')
    await checkHealth()

    expect(fetchSpy.mock.calls[0][1].headers['x-cdp-request-id']).toBe(
      'trace-123'
    )
    expect(fetchSpy.mock.calls[1][1].headers['x-cdp-request-id']).toBe(
      'trace-123'
    )
  })
})
