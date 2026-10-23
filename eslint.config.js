import neostandard from 'neostandard'

export default [
  // On its own, so ESLint skips gitignored files, such as coverage/ and .public/, entirely
  { ignores: neostandard.resolveIgnoresFromGitignore() },
  ...neostandard({
    env: ['node', 'vitest'],
    noJsx: true,
    noStyle: true
  })
]
