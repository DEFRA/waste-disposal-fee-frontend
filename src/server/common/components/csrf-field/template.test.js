import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('CSRF field Component', () => {
  test('Should render a hidden crumb field with the token', () => {
    const $field = renderComponent('csrf-field', { token: 'abc123' })
    const $input = $field('[data-testid="app-csrf-field"]')

    expect($input.attr('type')).toBe('hidden')
    expect($input.attr('name')).toBe('crumb')
    expect($input.attr('value')).toBe('abc123')
  })
})
