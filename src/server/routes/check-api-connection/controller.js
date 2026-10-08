import { checkHealth } from '#/server/services/calculator-api.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * A plain page, separate from the rest of the app and without sign-in, that
 * calls the Calculator API's anonymous health check to prove the frontend can
 * reach the API.
 */
export const checkApiConnectionController = {
  async handler(_request, h) {
    const result = await checkHealth()

    const rows = [
      ['Result', result.ok ? 'OK' : 'FAILED'],
      ['URL', result.url],
      ['Status', result.status ?? 'No response'],
      ['Response', result.body ?? result.error],
      ['Time taken', `${result.durationMs} ms`]
    ]

    return h
      .response(
        `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Check API connection</title></head>
<body>
<h1>Check API connection</h1>
<table>
${rows.map(([key, value]) => `<tr><th align="left">${key}</th><td>${escapeHtml(value)}</td></tr>`).join('\n')}
</table>
</body>
</html>`
      )
      .type('text/html')
      .header('Cache-Control', 'no-store')
  }
}
