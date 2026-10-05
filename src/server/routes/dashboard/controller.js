import { config } from '#/config/config.js'
import { getUserSession } from '#/server/auth/entra-id.js'
import {
  getCalculatorRuns,
  getRelativeYears
} from '#/server/services/calculator-api.js'
import {
  currentRelativeYear,
  financialYear,
  selectableRelativeYears
} from './relative-year.js'
import { toDashboardRuns } from './runs.js'

/**
 * Shows the calculation runs for the chosen financial year. If the API call
 * fails, the error is logged and the user sees "Sorry, there is a problem
 * with the service", see common/helpers/errors.js.
 */
export const dashboardController = {
  async handler(request, h) {
    const { accessToken } = getUserSession(request)
    const currentYear = currentRelativeYear(
      new Date(),
      config.get('relativeYearStartingMonth')
    )

    const relativeYears = selectableRelativeYears(
      await getRelativeYears(accessToken),
      currentYear
    )

    const requestedYear = Number(request.query.relativeYear)
    const relativeYear = relativeYears.includes(requestedYear)
      ? requestedYear
      : currentYear

    const runs = toDashboardRuns(
      await getCalculatorRuns(relativeYear, accessToken)
    )

    return h.view('dashboard/index', {
      pageTitle: 'Waste Disposal Fee',
      heading: 'Calculate packaging payments',
      financialYear: financialYear(relativeYear),
      relativeYearItems: relativeYears.map((year) => ({
        value: year,
        text: financialYear(year),
        selected: year === relativeYear
      })),
      runs
    })
  }
}
