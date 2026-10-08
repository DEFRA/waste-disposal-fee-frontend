import { WebIdentityTokenProvider } from '@defra/hapi-auth-oidc'

import { config } from '#/config/config.js'

const WEB_IDENTITY_TOKEN_EARLY_REFRESH_MS = 60 * 1000

export const USER_SESSION_KEY = 'user'
export const RETURN_URL_KEY = 'authReturnUrl'

export const authPaths = {
  signIn: '/auth/sign-in',
  callback: '/signin-oidc',
  signOut: '/auth/sign-out',
  signedOut: '/auth/signed-out'
}

export const entraIdSettings = {
  authority: 'ENTRA_ID_AUTHORITY',
  clientId: 'ENTRA_ID_CLIENT_ID',
  clientSecret: 'ENTRA_ID_CLIENT_SECRET',
  apiScope: 'ENTRA_ID_API_SCOPE'
}

// There's no AWS identity to federate locally, so local development uses a client secret
function usesFederatedCredential() {
  return config.get('isProduction')
}

/**
 * @returns the environment variables still needed to sign users in
 */
export function missingEntraIdSettings() {
  const entraId = config.get('entraId')
  return Object.entries(entraIdSettings)
    .filter(([key]) => key !== 'clientSecret' || !usesFederatedCredential())
    .filter(([key]) => !entraId[key])
    .map(([, envVar]) => envVar)
}

/**
 * How the app proves who it is to Entra ID: in production, with a token from
 * AWS STS that the app registration's federated credential trusts
 */
export function entraIdAuthProvider() {
  if (usesFederatedCredential()) {
    return new WebIdentityTokenProvider({
      audience: [config.get('entraId.federatedCredentialsAudience')],
      earlyRefreshMs: WEB_IDENTITY_TOKEN_EARLY_REFRESH_MS
    })
  }

  return {
    type: 'client_secret',
    getCredentials: async (_logger) => config.get('entraId.clientSecret')
  }
}

export function isEntraIdConfigured() {
  return missingEntraIdSettings().length === 0
}

/**
 * @returns Entra ID's origin, e.g. https://login.microsoftonline.com, or null if not configured
 */
export function entraIdOrigin() {
  const authority = config.get('entraId.authority')
  return authority ? new URL(authority).origin : null
}

/**
 * Where @defra/hapi-auth-oidc finds Entra ID's endpoints and settings
 */
export function entraIdDiscoveryUri() {
  return `${config.get('entraId.authority')}/v2.0/.well-known/openid-configuration`
}

/**
 * openid/profile give us an ID token with the user's name, offline_access a
 * refresh token, and the API scope an access token the Calculator API accepts.
 */
export function entraIdScopes() {
  return ['openid', 'profile', 'offline_access', config.get('entraId.apiScope')]
}

/**
 * Builds the session from the tokens @defra/hapi-auth-oidc returns after
 * sign-in. id is the user's Entra ID object ID.
 */
export function createUserSession({ accessToken, refreshToken, claims }) {
  return {
    id: claims.oid,
    name: claims.name ?? claims.preferred_username,
    accessToken,
    refreshToken
  }
}

/**
 * Entra ID may not send a new refresh token, so keep the old one.
 */
export function updateUserSession(session, token) {
  return {
    ...session,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? session.refreshToken
  }
}

/**
 * yar only loads the session on routes that exist, so there's none on 404 pages.
 */
export function getUserSession(request) {
  return request?.yar?.id ? request.yar.get(USER_SESSION_KEY) : undefined
}

export function isSafeReturnUrl(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')
}

export function signOutUrl() {
  const url = new URL(`${config.get('entraId.authority')}/oauth2/v2.0/logout`)
  url.searchParams.set(
    'post_logout_redirect_uri',
    `${config.get('appBaseUrl')}${authPaths.signedOut}`
  )
  return url.href
}
