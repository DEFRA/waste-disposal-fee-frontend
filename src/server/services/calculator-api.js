import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'

function apiUrl(path) {
  return new URL(path, config.get('calculatorApi.baseUrl'))
}

/**
 * Gives up on the API before CDP's load balancer does, so the user sees our
 * error page rather than the platform's.
 */
function timeoutSignal() {
  return AbortSignal.timeout(config.get('outboundRequestTimeout'))
}

/**
 * fetch only says "fetch failed" when it can't connect, the reason
 * (e.g. ECONNREFUSED, DEPTH_ZERO_SELF_SIGNED_CERT) is in its cause.
 */
function describeFetchError(error) {
  if (error.name === 'TimeoutError') {
    return `no response within ${config.get('outboundRequestTimeout')} ms`
  }

  const cause = error.cause?.code ?? error.cause?.message
  return cause ? `${error.message}: ${cause}` : error.message
}

/**
 * Passes on CDP's request ID (x-cdp-request-id), so a request can be traced
 * from this frontend into the API's logs.
 */
function tracingHeaders(headers = {}) {
  return withTraceId(config.get('tracing.header'), headers)
}

async function fetchApi(url, options) {
  try {
    return await fetch(url, { ...options, signal: timeoutSignal() })
  } catch (error) {
    throw new Error(
      `Calculator API ${url.pathname} could not be reached (${describeFetchError(error)})`,
      { cause: error }
    )
  }
}

/**
 * Calls the Calculator API as the signed-in user. The API records who made
 * each change from the user's access token.
 */
async function get(path, accessToken) {
  const url = apiUrl(path)
  const response = await fetchApi(url, {
    headers: tracingHeaders({
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    })
  })

  if (!response.ok) {
    throw new Error(
      `Calculator API GET ${url.pathname} failed (${response.status} ${response.statusText})`
    )
  }

  return response.json()
}

/**
 * @returns the relative years that have runs, e.g. [2024, 2025]
 */
export function getRelativeYears(accessToken) {
  return get('v1/RelativeYears', accessToken)
}

/**
 * @returns the calculation runs for the relative year, newest first
 */
export function getCalculatorRuns(relativeYear, accessToken) {
  return get(`v1/calculatorRuns?relativeYear=${relativeYear}`, accessToken)
}

/**
 * Calls the API's anonymous health check, to prove the frontend can reach it.
 * Never throws, the result says what happened.
 */
export async function checkHealth() {
  const url = apiUrl('admin/health')
  const started = Date.now()

  try {
    const response = await fetch(url, {
      headers: tracingHeaders(),
      signal: timeoutSignal()
    })
    return {
      url: url.href,
      ok: response.ok,
      status: `${response.status} ${response.statusText}`.trim(),
      body: await response.text(),
      durationMs: Date.now() - started
    }
  } catch (error) {
    return {
      url: url.href,
      ok: false,
      error: describeFetchError(error),
      durationMs: Date.now() - started
    }
  }
}
