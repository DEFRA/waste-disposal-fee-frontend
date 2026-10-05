import crumb from '@hapi/crumb'

import { config } from '#/config/config.js'

/**
 * CSRF protection. Checks every POST, PUT, PATCH and DELETE has the `crumb`
 * token from its cookie. Forms add it with the appCsrfField component.
 * Turn it off for a route with `options: { plugins: { crumb: false } }`.
 */
export const csrf = {
  plugin: crumb,
  options: {
    // Without this, crumb still sets its cookie on routes with crumb: false
    skip: (request) => request.route.settings.plugins.crumb === false,
    cookieOptions: {
      isSecure: config.get('session.cookie.secure'),
      isHttpOnly: true,
      isSameSite: 'Strict'
    }
  }
}
