import {
  currentRelativeYear,
  financialYear,
  selectableRelativeYears
} from './relative-year.js'

describe('#relativeYear', () => {
  test.each([
    ['2026-03-31', 2025],
    ['2026-04-01', 2026],
    ['2026-12-31', 2026]
  ])('On %s the relative year is %i', (date, expected) => {
    expect(currentRelativeYear(new Date(`${date}T12:00:00Z`), 4)).toBe(expected)
  })

  test.each([
    [2025, '2025-26'],
    [2099, '2099-00'],
    [2008, '2008-09']
  ])('%i is financial year %s', (year, expected) => {
    expect(financialYear(year)).toBe(expected)
  })

  test('Should put the current year first, then past years newest first', () => {
    expect(selectableRelativeYears([2023, 2027, 2025, 2024], 2025)).toEqual([
      2025, 2024, 2023
    ])
  })

  test('Should include the current year when it has no runs', () => {
    expect(selectableRelativeYears([], 2026)).toEqual([2026])
  })
})
