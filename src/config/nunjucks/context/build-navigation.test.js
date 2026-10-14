import { buildNavigation } from './build-navigation.js'

describe('#buildNavigation', () => {
  test('Should have no links, the service name links to the dashboard', () => {
    expect(buildNavigation({ path: '/' })).toEqual([])
  })
})
