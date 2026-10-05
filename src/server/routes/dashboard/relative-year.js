/**
 * The relative year a date falls in. A relative year starts in
 * startingMonth (1-12), e.g. with April, 1 March 2026 is in 2025.
 */
export function currentRelativeYear(date, startingMonth) {
  return date.getMonth() + 1 >= startingMonth
    ? date.getFullYear()
    : date.getFullYear() - 1
}

/**
 * @returns the financial year for a relative year, e.g. 2025 is "2025-26"
 */
export function financialYear(relativeYear) {
  return `${relativeYear}-${String((relativeYear + 1) % 100).padStart(2, '0')}`
}

/**
 * Relative years the user can choose: none after the current one, newest
 * first, and always including the current one.
 */
export function selectableRelativeYears(relativeYears, currentYear) {
  const pastYears = relativeYears
    .filter((year) => year < currentYear)
    .sort((a, b) => b - a)

  return [currentYear, ...new Set(pastYears)]
}
