import 'dotenv/config'

Object.assign(process.env, {
  NODE_ENV: process.env.NODE_ENV ?? 'test',
  AUTH_SECRET:
    process.env.AUTH_SECRET ?? 'test-secret-test-secret-test-secret-1234',
})

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required to run the test suite (see README > Testes).',
  )
}
