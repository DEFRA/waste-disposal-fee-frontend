import { WebIdentityTokenProvider } from '@defra/hapi-auth-oidc'

import { config } from '#/config/config.js'
import {
  entraIdAuthProvider,
  missingEntraIdSettings
} from '#/server/auth/entra-id.js'

describe('#entraIdAuthProvider', () => {
  afterEach(() => {
    config.set('isProduction', false)
  })

  test('Should use the client secret locally', async () => {
    const provider = entraIdAuthProvider()

    expect(provider.type).toBe('client_secret')
    expect(await provider.getCredentials()).toBe('frontend-client-secret')
  })

  test('Should use a web identity token for the federated credential in production', () => {
    config.set('isProduction', true)

    const provider = entraIdAuthProvider()

    expect(provider).toBeInstanceOf(WebIdentityTokenProvider)
    expect(provider.type).toBe('federated')
    expect(provider.audience).toEqual(['waste-disposal-fee-frontend'])
    expect(provider.earlyRefreshMs).toBe(60 * 1000)
  })
})

describe('#missingEntraIdSettings', () => {
  beforeEach(() => {
    config.set('entraId.clientSecret', '')
  })

  afterEach(() => {
    config.set('entraId.clientSecret', 'frontend-client-secret')
    config.set('isProduction', false)
  })

  test('Should need the client secret locally', () => {
    expect(missingEntraIdSettings()).toEqual(['ENTRA_ID_CLIENT_SECRET'])
  })

  test('Should not need the client secret in production', () => {
    config.set('isProduction', true)

    expect(missingEntraIdSettings()).toEqual([])
  })
})
