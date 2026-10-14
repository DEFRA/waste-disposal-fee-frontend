import fs from 'node:fs'
import path from 'path'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'

import { router } from './plugins/router.js'
import { config } from '#/config/config.js'
import { pulse } from './plugins/pulse.js'
import { catchAll } from './common/helpers/errors.js'
import { nunjucksConfig } from '#/config/nunjucks/nunjucks.js'
import { requestTracing } from './plugins/request-tracing.js'
import { requestLogger } from './plugins/request-logger.js'
import { sessionCache } from './plugins/session-cache.js'
import { auth } from './plugins/auth.js'
import { csrf } from './plugins/crumb.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { metrics } from '@defra/cdp-metrics'
import { getDevelopmentTls } from './common/helpers/development-tls.js'

export async function createServer() {
  const isDevelopment = config.get('isDevelopment')
  const certsDir = path.resolve(config.get('root'), 'certs')

  const server = hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    // Local HTTPS when certs/ has a cert, see `npm run setup:certs`
    tls: getDevelopmentTls({ isDevelopment, certsDir, fs }),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(config.get('session.cache.engine'))
      }
    ],
    state: {
      strictHeader: false
    }
  })
  await server.register([
    requestLogger,
    requestTracing,
    metrics,
    secureContext,
    pulse,
    sessionCache,
    csrf,
    auth,
    nunjucksConfig,
    Scooter,
    contentSecurityPolicy,
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  server.ext('onPreResponse', catchAll)

  return server
}
