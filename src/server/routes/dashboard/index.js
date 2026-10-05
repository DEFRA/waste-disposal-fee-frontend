import { dashboardController } from './controller.js'

/**
 * Sets up the routes used in the dashboard.
 * These routes are registered in src/server/router.js.
 */
export const dashboard = {
  plugin: {
    name: 'dashboard',
    register(server) {
      server.route({
        method: 'GET',
        path: '/',
        ...dashboardController
      })
    }
  }
}
