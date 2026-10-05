import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getCalculatorRuns,
  getRelativeYears
} from '#/server/services/calculator-api.js'
import { signIn } from '#/test-helpers/sign-in.js'
import { fakeAccessToken } from '#/test-helpers/fake-entra-id.js'

vi.mock('#/server/services/calculator-api.js')

describe('#dashboardController', () => {
  let server
  let cookie
  let accessToken

  beforeAll(async () => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-10-01T12:00:00Z')
    })
    server = await createServer()
    await server.initialize()
    accessToken = fakeAccessToken()
    ;({ cookie } = await signIn(server, { accessToken }))
  })

  beforeEach(() => {
    getRelativeYears.mockResolvedValue([2024, 2025, 2026])
    getCalculatorRuns.mockResolvedValue([])
  })

  afterAll(async () => {
    vi.useRealTimers()
    await server.stop({ timeout: 0 })
  })

  test("Should show the current year's runs using the user's access token", async () => {
    getCalculatorRuns.mockResolvedValue([
      {
        runId: 42,
        runName: 'October run',
        runClassification: 4,
        createdAt: '2026-10-01T11:03:00',
        createdBy: 'Jo Bloggs',
        billingRunStatus: 'None'
      }
    ])

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(getRelativeYears).toHaveBeenCalledWith(accessToken)
    expect(getCalculatorRuns).toHaveBeenCalledWith(2026, accessToken)
    expect(result).toEqual(expect.stringContaining('Waste Disposal Fee |'))
    expect(result).toEqual(expect.stringContaining('govuk-phase-banner'))
    expect(result).toEqual(expect.stringContaining('October run'))
    expect(result).toEqual(expect.stringContaining('Calculation ID: 42'))
    expect(result).toEqual(
      expect.stringContaining('Date: 01 Oct 2026 at 12:03')
    )
    expect(result).toEqual(expect.stringContaining('Run by: Jo Bloggs'))
    expect(result).toEqual(expect.stringContaining('govuk-tag--yellow'))
  })

  test('Should list financial years, current year first', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    const options = [...result.matchAll(/<option value="(\d+)"/g)].map(
      ([, value]) => value
    )
    expect(options).toEqual(['2026', '2025', '2024'])
    expect(result).toEqual(expect.stringContaining('2025-26'))
  })

  test('Should show runs for the chosen year', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/?relativeYear=2024',
      headers: { cookie }
    })

    expect(getCalculatorRuns).toHaveBeenCalledWith(2024, accessToken)
    expect(result).toEqual(
      expect.stringContaining('<option value="2024" selected>')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'There are no calculations for the 2024-25 financial year.'
      )
    )
  })

  test('Should ignore a year that cannot be chosen', async () => {
    await server.inject({
      method: 'GET',
      url: '/?relativeYear=2030',
      headers: { cookie }
    })

    expect(getCalculatorRuns).toHaveBeenCalledWith(2026, accessToken)
  })

  test('Should show the problem with the service page when the Calculator API call fails', async () => {
    getRelativeYears.mockRejectedValue(
      new Error('Calculator API GET /v1/RelativeYears failed (403 Forbidden)')
    )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toEqual(
      expect.stringContaining(
        '<h1 class="govuk-heading-l">Sorry, there is a problem with the service</h1>'
      )
    )
    expect(result).toEqual(expect.stringContaining('Try again later.'))
    expect(result).not.toEqual(expect.stringContaining('403 Forbidden'))
  })

  test("Should show the signed-in user's name and sign out in the service navigation", async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    expect(result).toEqual(
      expect.stringMatching(
        /<span class="govuk-service-navigation__text">\s*Jo Bloggs\s*<\/span>/
      )
    )
    expect(result).toEqual(
      expect.stringContaining('govuk-service-navigation__inlining-container')
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<a class="govuk-service-navigation__link" href="/auth/sign-out">Sign out</a>'
      )
    )
  })
})
