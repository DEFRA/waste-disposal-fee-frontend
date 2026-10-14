const londonDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: '2-digit',
  month: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23'
})

// Not Intl's short months, which give "Sept" for en-GB
const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

/**
 * Run classifications, as numbers like the API sends them, with the label
 * and tag colour the dashboard shows.
 */
export const runClassifications = {
  0: { name: 'None' },
  2: { name: 'Running', label: 'Running', tag: 'govuk-tag--green' },
  3: { name: 'Unclassified' },
  4: { name: 'Test', label: 'Test run', tag: 'govuk-tag--yellow' },
  5: { name: 'Errored', label: 'Error', tag: 'govuk-tag--red' },
  6: { name: 'Deleted' },
  7: {
    name: 'InitialCompleted',
    label: 'Initial run completed',
    tag: 'govuk-tag--purple'
  },
  8: {
    name: 'Initial',
    label: 'Initial run classified',
    tag: 'govuk-tag--purple'
  },
  9: {
    name: 'Recalculation',
    label: 'Re-calculation run classified',
    tag: 'govuk-tag--purple'
  },
  12: {
    name: 'RecalculationCompleted',
    label: 'Re-calculation run completed',
    tag: 'govuk-tag--purple'
  }
}

const DELETED = 6

/**
 * The API sends UTC times, sometimes without a timezone.
 * @returns e.g. "01 Oct 2026 at 12:03", in London time
 */
export function formatRunDate(value) {
  const utc = /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`
  const parts = Object.fromEntries(
    londonDateTime
      .formatToParts(new Date(utc))
      .map(({ type, value }) => [type, value])
  )

  return `${parts.day} ${months[parts.month - 1]} ${parts.year} at ${parts.hour}:${parts.minute}`
}

/**
 * Runs as the dashboard shows them. Deleted runs are hidden, and runs that
 * aren't classified yet have no status tag.
 */
export function toDashboardRuns(runs) {
  return runs
    .filter((run) => run.runClassification !== DELETED)
    .map((run) => {
      const classification = runClassifications[run.runClassification]

      return {
        id: run.runId,
        name: run.runName,
        createdAt: formatRunDate(run.createdAt),
        createdBy: run.createdBy,
        status: classification?.label
          ? { text: classification.label, classes: classification.tag }
          : null
      }
    })
}
