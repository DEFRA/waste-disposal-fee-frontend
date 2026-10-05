import { hapiAuthOidcPlugin } from '@defra/hapi-auth-oidc'

import { config } from '#/config/config.js'
import { auditSignOut, signOutReasons } from '#/server/auth/audit.js'
import {
  USER_SESSION_KEY,
  authPaths,
  entraIdAuthProvider,
  entraIdDiscoveryUri,
  entraIdScopes,
  getUserSession,
  isEntraIdConfigured,
  isSafeReturnUrl,
  missingEntraIdSettings,
  updateUserSession,
  RETURN_URL_KEY
} from '#/server/auth/entra-id.js'

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000

const publicPaths = new Set([
  '/health',
  '/check-api-connection',
  '/favicon.ico',
  authPaths.signIn,
  authPaths.callback,
  authPaths.signedOut
])

function isPublicPath(path) {
  const assetPath = config.get('assetPath')
  return publicPaths.has(path) || path.startsWith(`${assetPath}/`)
}

function redirectToSignIn(request, h) {
  const returnUrl = `${request.path}${request.url.search}`
  if (isSafeReturnUrl(returnUrl)) {
    request.yar.set(RETURN_URL_KEY, returnUrl)
  }

  return h.redirect(authPaths.signIn).takeover()
}

/**
 * Every page needs a signed-in user. Refreshes the user's access token
 * shortly before it expires, so controllers can always use it.
 */
async function requireSignedInUser(request, h) {
  if (isPublicPath(request.path)) {
    return h.continue
  }

  const session = getUserSession(request)
  if (!session) {
    return redirectToSignIn(request, h)
  }

  try {
    const { token, refreshed } = await request.ensureValidToken(session)
    if (refreshed) {
      request.yar.set(USER_SESSION_KEY, updateUserSession(session, token))
    }
  } catch (error) {
    request.logger.warn(error, 'Signing user out, token refresh failed')
    auditSignOut(session, signOutReasons.tokenRefreshFailed)
    request.yar.reset()
    return redirectToSignIn(request, h)
  }

  return h.continue
}

/**
 * Signs users in with Entra ID using CDP's @defra/hapi-auth-oidc, and requires
 * a signed-in user on every page except those in publicPaths.
 *
 * It makes every request to Entra ID with fetch, so on CDP they go through the
 * proxy (NODE_USE_ENV_PROXY).
 */
export const auth = {
  plugin: {
    name: 'auth',
    async register(server) {
      server.ext('onPreAuth', requireSignedInUser)

      if (!isEntraIdConfigured()) {
        server.logger.warn(
          `Entra ID is not configured, sign-in will not work until these are set: ${missingEntraIdSettings().join(', ')}`
        )
        return
      }

      await server.register({
        plugin: hapiAuthOidcPlugin,
        options: {
          oidc: {
            discoveryUri: entraIdDiscoveryUri(),
            clientId: config.get('entraId.clientId'),
            authProvider: entraIdAuthProvider(),
            scope: entraIdScopes().join(' '),
            loginCallbackUri: authPaths.callback,
            // Entra ID redirects back with a GET, which sends the Lax state cookie
            responseMode: 'query',
            externalBaseUrl: config.get('appBaseUrl'),
            earlyRefreshMs: REFRESH_BEFORE_EXPIRY_MS,
            // In seconds, for every request to Entra ID
            discoveryRequestOptions: {
              timeout: Math.ceil(config.get('outboundRequestTimeout') / 1000)
            }
          },
          cookieOptions: {
            password: config.get('session.cookie.password'),
            isSecure: config.get('session.cookie.secure'),
            isSameSite: 'Lax'
          }
        }
      })
    }
  }
}
