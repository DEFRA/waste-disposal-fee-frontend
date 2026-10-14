import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  ServiceNavigation,
  SkipLink
} from 'govuk-frontend'

import { initAutoSubmit } from './auto-submit.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(ServiceNavigation)
createAll(SkipLink)

initAutoSubmit()
