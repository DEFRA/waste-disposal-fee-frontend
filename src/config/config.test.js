describe('#config', () => {
  // config.js reads NODE_ENV when it's imported, so each test imports a fresh copy
  async function importConfig() {
    vi.resetModules()
    return import('./config.js')
  }

  // Settings production must have, as CDP would set them
  const productionSettings = {
    SESSION_COOKIE_PASSWORD: 'a-production-password-of-32-characters-or-more',
    APP_BASE_URL: 'https://waste-disposal-fee-frontend.dev.cdp-int.defra.cloud',
    CALCULATOR_API_BASE_URL: 'https://devrwdwebwa9422.azurewebsites.net'
  }

  function stubProduction(settings) {
    vi.stubEnv('NODE_ENV', 'production')
    for (const [name, value] of Object.entries(settings)) {
      vi.stubEnv(name, value)
    }
  }

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('Should use the settings production is given', async () => {
    stubProduction(productionSettings)

    const { config } = await importConfig()

    expect(config.get('session.cookie.password')).toBe(
      productionSettings.SESSION_COOKIE_PASSWORD
    )
    expect(config.get('appBaseUrl')).toBe(productionSettings.APP_BASE_URL)
    expect(config.get('calculatorApi.baseUrl')).toBe(
      productionSettings.CALCULATOR_API_BASE_URL
    )
  })

  test.each([
    ['SESSION_COOKIE_PASSWORD', 'session.cookie.password'],
    ['APP_BASE_URL', 'appBaseUrl'],
    ['CALCULATOR_API_BASE_URL', 'calculatorApi.baseUrl']
  ])('Should need %s in production', async (envVar, setting) => {
    stubProduction({ ...productionSettings, [envVar]: undefined })

    await expect(importConfig()).rejects.toThrow(
      `${setting}: must be of type String`
    )
  })

  test('Should have development defaults outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    for (const name of Object.keys(productionSettings)) {
      vi.stubEnv(name, undefined)
    }

    const { config } = await importConfig()

    expect(config.get('session.cookie.password')).toHaveLength(48)
    expect(config.get('appBaseUrl')).toBe('http://localhost:3000')
    expect(config.get('calculatorApi.baseUrl')).toBe('https://localhost:7265')
  })
})
