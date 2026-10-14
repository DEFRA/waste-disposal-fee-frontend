import { formUrl, initAutoSubmit } from './auto-submit.js'

function fakeForm() {
  const button = { classList: { add: vi.fn() } }
  const select = { addEventListener: vi.fn() }
  const form = {
    action: 'https://localhost:7163/?relativeYear=2025',
    querySelectorAll: (selector) =>
      selector === 'select' ? [select] : [button]
  }
  const root = { querySelectorAll: () => [form] }

  return { root, form, button, select }
}

describe('#initAutoSubmit', () => {
  beforeEach(() => {
    // Tests run in Node, without a DOM. A form's FormData is its fields.
    vi.stubGlobal(
      'FormData',
      class {
        constructor(form) {
          return Object.entries(form.fields ?? {})
        }
      }
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should hide the submit button', () => {
    const { root, button } = fakeForm()

    initAutoSubmit(root, vi.fn())

    expect(button.classList.add).toHaveBeenCalledWith('govuk-!-display-none')
  })

  test("Should go to the form's results when the select changes", () => {
    const { root, form, select } = fakeForm()
    const navigate = vi.fn()

    initAutoSubmit(root, navigate)
    form.fields = { relativeYear: '2026' }
    const [event, onChange] = select.addEventListener.mock.calls[0]
    onChange()

    expect(event).toBe('change')
    expect(navigate).toHaveBeenCalledWith(
      'https://localhost:7163/?relativeYear=2026'
    )
  })

  test("Should replace the action's query string with the form's fields, as a GET form does", () => {
    expect(
      formUrl({
        action: 'https://localhost:7163/runs?relativeYear=2025&other=x',
        fields: { relativeYear: '2026', name: 'a b' }
      })
    ).toBe('https://localhost:7163/runs?relativeYear=2026&name=a+b')
  })
})
