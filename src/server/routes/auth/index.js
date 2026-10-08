import { authPaths, isEntraIdConfigured } from '#/server/auth/entra-id.js'
import {
  callbackController,
  notConfiguredController,
  signInController,
  signOutController,
  signedOutController
} from './controller.js'

/**
 * Sets up the sign-in and sign-out routes.
 * These routes are registered in src/server/router.js.
 */
export const auth = {
  plugin: {
    name: 'auth-routes',
    register(server) {
      const isConfigured = isEntraIdConfigured()

      server.route([
        {
          method: 'GET',
          path: authPaths.signIn,
          ...(isConfigured ? signInController : notConfiguredController)
        },
        {
          method: ['GET', 'POST'],
          path: authPaths.callback,
          options: {
            // Entra ID can POST back here, without our CSRF token. The sign-in state cookie protects it instead.
            plugins: { crumb: false }
          },
          ...(isConfigured ? callbackController : notConfiguredController)
        },
        {
          method: 'GET',
          path: authPaths.signOut,
          ...signOutController
        },
        {
          method: 'GET',
          path: authPaths.signedOut,
          ...signedOutController
        }
      ])
    }
  }
}
