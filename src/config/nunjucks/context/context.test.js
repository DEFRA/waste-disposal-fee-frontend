import { vi } from 'vitest'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('node:fs', async () => {
  const nodeFs = await import('node:fs')

  return {
    ...nodeFs,
    readFileSync: () => mockReadFileSync()
  }
})
vi.mock('../../../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))
vi.mock(import('#/config/config.js'), async (importOriginal) => {
  const originalModule = await importOriginal()
  return {
    config: {
      get(key) {
        if (key === 'isProduction') return true
        return originalModule.config.get(key)
      }
    }
  }
})

// The shape of Vite's .vite/manifest.json
const viteManifest = JSON.stringify({
  'src/client/javascripts/application.js': {
    file: 'assets/application-CfXi9zJh.js'
  }
})

describe('#context', () => {
  const mockRequest = { path: '/' }

  // context.js caches the manifest, so each test imports a fresh copy
  async function importContext() {
    vi.resetModules()
    return import('./context.js')
  }

  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    mockReadFileSync.mockReturnValue(viteManifest)
  })

  test('Should provide expected context', async () => {
    const { context } = await importContext()

    expect(context(mockRequest)).toEqual({
      assetPath: '/public/assets',
      breadcrumbs: [],
      getAssetPath: expect.any(Function),
      navigation: [],
      serviceName: 'waste-disposal-fee-frontend',
      serviceUrl: '/',
      signOutUrl: '/auth/sign-out',
      userName: undefined
    })
  })

  test("Should give a built asset's path from the Vite manifest", async () => {
    const { context } = await importContext()

    expect(
      context(mockRequest).getAssetPath('src/client/javascripts/application.js')
    ).toBe('/public/assets/application-CfXi9zJh.js')
  })

  test('Should give the asset path as it is for an asset not in the manifest', async () => {
    const { context } = await importContext()

    expect(context(mockRequest).getAssetPath('an-image.png')).toBe(
      '/public/an-image.png'
    )
  })

  test('Should read the Vite manifest once, then use the cache', async () => {
    const { context } = await importContext()

    context(mockRequest)
    context(mockRequest)

    expect(mockReadFileSync).toHaveBeenCalledTimes(1)
  })

  test('Should log that the Vite manifest is not available', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    const { context } = await importContext()

    context(mockRequest)

    expect(mockLoggerError).toHaveBeenCalledWith('Vite manifest.json not found')
  })
})
