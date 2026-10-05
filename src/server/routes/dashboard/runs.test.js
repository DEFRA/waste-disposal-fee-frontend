import { formatRunDate, toDashboardRuns } from './runs.js'

function run(overrides) {
  return {
    runId: 1,
    runName: 'Run one',
    runClassification: 4,
    createdAt: '2026-10-01T11:03:00',
    createdBy: 'Jo Bloggs',
    billingRunStatus: 'None',
    ...overrides
  }
}

describe('#runs', () => {
  test.each([
    ['2026-10-01T11:03:00', '01 Oct 2026 at 12:03'],
    ['2026-10-01T11:03:00Z', '01 Oct 2026 at 12:03'],
    ['2026-01-15T09:05:00', '15 Jan 2026 at 9:05'],
    ['2026-06-30T23:30:00.1234567', '01 Jul 2026 at 0:30'],
    ['2026-09-16T11:04:00', '16 Sep 2026 at 12:04']
  ])('Should show UTC %s in London time as %s', (value, expected) => {
    expect(formatRunDate(value)).toBe(expected)
  })

  test('Should map runs for the dashboard', () => {
    expect(toDashboardRuns([run()])).toEqual([
      {
        id: 1,
        name: 'Run one',
        createdAt: '01 Oct 2026 at 12:03',
        createdBy: 'Jo Bloggs',
        status: { text: 'Test run', classes: 'govuk-tag--yellow' }
      }
    ])
  })

  test('Should hide deleted runs', () => {
    expect(toDashboardRuns([run({ runClassification: 6 })])).toEqual([])
  })

  test.each([0, 3, 99])(
    'Should not show a status for classification %i',
    (runClassification) => {
      expect(toDashboardRuns([run({ runClassification })])[0].status).toBe(null)
    }
  )
})
