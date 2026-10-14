import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  auditSignIn,
  auditSignInFailure,
  auditSignOut,
  signOutReasons
} from '#/server/auth/audit.js'
import {
  USER_SESSION_KEY,
  RETURN_URL_KEY,
  createUserSession,
  getUserSession,
  isSafeReturnUrl,
  missingEntraIdSettings,
  signOutUrl
} from '#/server/auth/entra-id.js'

/**
 * Sends the user to Entra ID to sign in, with a cookie holding the sign-in
 * state and PKCE verifier for the callback to check.
 */
export const signInController = {
  handler(request, h) {
    return request.login(h)
  }
}

/**
 * Entra ID sends the user back here. @defra/hapi-auth-oidc checks the
 * response against the sign-in cookie, and swaps the code for tokens.
 */
export const callbackController = {
  async handler(request, h) {
    let credentials
    try {
      credentials = await request.callback(h)
    } catch (error) {
      request.logger.warn(error, 'Entra ID sign-in failed')
      auditSignInFailure(error.message)
      return h
        .view('auth/sign-in-failed', {
          pageTitle: 'Sorry, you could not be signed in',
          heading: 'Sorry, you could not be signed in'
        })
        .code(statusCodes.unauthorized)
    }

    const returnUrl = request.yar.get(RETURN_URL_KEY, true)

    // A new session ID, so a session from before sign-in can't be reused after it
    request.yar.reset()
    const session = createUserSession(credentials)
    request.yar.set(USER_SESSION_KEY, session)
    auditSignIn(session)

    return h.redirect(isSafeReturnUrl(returnUrl) ? returnUrl : '/')
  }
}

export const notConfiguredController = {
  handler(_request, h) {
    return h
      .view('auth/not-configured', {
        pageTitle: 'Sign-in is not set up',
        heading: 'Sign-in is not set up',
        missingSettings: missingEntraIdSettings()
      })
      .code(statusCodes.serviceUnavailable)
  }
}

export const signOutController = {
  handler(request, h) {
    auditSignOut(getUserSession(request), signOutReasons.user)
    request.yar.reset()
    return h.redirect(signOutUrl())
  }
}

export const signedOutController = {
  handler(_request, h) {
    return h.view('auth/signed-out', {
      pageTitle: 'You have signed out',
      heading: 'You have signed out'
    })
  }
}
