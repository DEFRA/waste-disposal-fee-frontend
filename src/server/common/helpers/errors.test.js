import { vi } from 'vitest'

import { catchAll } from './errors.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    expect(result).toEqual(
      expect.stringContaining('Page not found | waste-disposal-fee-frontend')
    )
    expect(result).toEqual(
      expect.stringContaining('<h1 class="govuk-heading-l">Page not found</h1>')
    )
    expect(statusCode).toBe(statusCodes.notFound)
  })
})

describe('#catchAll', () => {
  const mockErrorLogger = vi.fn()
  const mockStack = 'Mock error stack'
  const errorPage = 'error/index'
  const mockRequest = (statusCode) => ({
    response: {
      isBoom: true,
      stack: mockStack,
      output: {
        statusCode
      }
    },
    logger: { error: mockErrorLogger }
  })
  const mockToolkitView = vi.fn()
  const mockToolkitCode = vi.fn()
  const mockToolkit = {
    view: mockToolkitView.mockReturnThis(),
    code: mockToolkitCode.mockReturnThis()
  }

  const pageNotFound = {
    pageTitle: 'Page not found',
    heading: 'Page not found',
    paragraphs: [
      'If you typed the web address, check it is correct.',
      'If you pasted the web address, check you copied the entire address.'
    ]
  }
  const problemWithTheService = {
    pageTitle: 'Sorry, there is a problem with the service',
    heading: 'Sorry, there is a problem with the service',
    paragraphs: ['Try again later.']
  }

  test('Should provide the "Page not found" page', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, pageNotFound)
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide the "Service unavailable" page and log the error', () => {
    catchAll(mockRequest(statusCodes.serviceUnavailable), mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Sorry, the service is unavailable',
      heading: 'Sorry, the service is unavailable',
      paragraphs: ['You will be able to use the service later.']
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.serviceUnavailable)
  })

  test('Should provide the "Problem with the service" page and log the error for internalServerError', () => {
    catchAll(mockRequest(statusCodes.internalServerError), mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      problemWithTheService
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
  })

  test.each([
    statusCodes.badRequest,
    statusCodes.unauthorized,
    statusCodes.forbidden,
    statusCodes.imATeapot
  ])(
    'Should provide the "Problem with the service" page for %i, without logging it',
    (statusCode) => {
      catchAll(mockRequest(statusCode), mockToolkit)

      expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
      expect(mockToolkitView).toHaveBeenCalledWith(
        errorPage,
        problemWithTheService
      )
      expect(mockToolkitCode).toHaveBeenCalledWith(statusCode)
    }
  )
})
