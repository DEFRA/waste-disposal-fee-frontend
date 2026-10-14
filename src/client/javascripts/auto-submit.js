/**
 * Goes to a GET form's results as soon as one of its selects changes, and
 * hides the form's submit button, which is only needed without JavaScript.
 * Use with data-module="app-auto-submit" on the form.
 *
 * It navigates to the URL the form would submit to, rather than submitting
 * the form. If the session has expired, that URL redirects to Entra ID to sign
 * in again. Browsers apply the Content-Security-Policy's form-action to every
 * redirect after a form submission, which blocks Microsoft's sign-in pages,
 * but not to a plain navigation.
 */
export function initAutoSubmit(
  root = document,
  navigate = (url) => window.location.assign(url)
) {
  root
    .querySelectorAll('form[data-module="app-auto-submit"]')
    .forEach((form) => {
      // Not the hidden attribute, .govuk-button's display overrides it
      form.querySelectorAll('[data-auto-submit-button]').forEach((button) => {
        button.classList.add('govuk-!-display-none')
      })

      form.querySelectorAll('select').forEach((select) => {
        select.addEventListener('change', () => navigate(formUrl(form)))
      })
    })
}

/**
 * @returns the URL a GET form submits to: its action, with its fields as the query string
 */
export function formUrl(form) {
  const url = new URL(form.action)
  url.search = new URLSearchParams(new FormData(form)).toString()
  return url.href
}
