import inert from '@hapi/inert'

import { dashboard } from '../routes/dashboard/index.js'
import { auth } from '../routes/auth/index.js'
import { checkApiConnection } from '../routes/check-api-connection/index.js'
import { health } from '../routes/health/index.js'
import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#/config/config.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([auth, dashboard, checkApiConnection])

      // Static assets
      if (!config.get('isProduction') && !config.get('isTest')) {
        const createViteServer = (await import('vite')).createServer
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'custom'
        })

        await server.register({
          plugin: (await import('@defra/hapi-connect')).default,
          options: {
            path: '/public',
            middleware: [vite.middlewares]
          }
        })
      } else {
        await server.register(serveStaticFiles)
      }
    }
  }
}
