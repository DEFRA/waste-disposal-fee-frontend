import { checkApiConnectionController } from './controller.js'

export const checkApiConnectionPath = '/check-api-connection'

/**
 * Sets up the page that checks this frontend can reach the Calculator API.
 * These routes are registered in src/server/router.js.
 */
export const checkApiConnection = {
  plugin: {
    name: 'check-api-connection',
    register(server) {
      server.route({
        method: 'GET',
        path: checkApiConnectionPath,
        options: {
          // No session or CSRF cookie, so the page works even if sign-in or Redis is broken
          plugins: { yar: { skip: true }, crumb: false }
        },
        ...checkApiConnectionController
      })
    }
  }
}
