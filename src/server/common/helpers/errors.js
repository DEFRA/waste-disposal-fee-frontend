import { statusCodes } from '../constants/status-codes.js'

/**
 * Error pages from the GOV.UK Design System's patterns:
 * https://design-system.service.gov.uk/patterns/page-not-found-pages/
 * https://design-system.service.gov.uk/patterns/service-unavailable-pages/
 * https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/
 */
const pageNotFound = {
  heading: 'Page not found',
  paragraphs: [
    'If you typed the web address, check it is correct.',
    'If you pasted the web address, check you copied the entire address.'
  ]
}

const serviceUnavailable = {
  heading: 'Sorry, the service is unavailable',
  paragraphs: ['You will be able to use the service later.']
}

const problemWithTheService = {
  heading: 'Sorry, there is a problem with the service',
  paragraphs: ['Try again later.']
}

function errorPage(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return pageNotFound
    case statusCodes.serviceUnavailable:
      return serviceUnavailable
    default:
      return problemWithTheService
  }
}

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const { heading, paragraphs } = errorPage(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('error/index', {
      pageTitle: heading,
      heading,
      paragraphs
    })
    .code(statusCode)
}
