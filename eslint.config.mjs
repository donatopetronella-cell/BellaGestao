import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'src/generated/**',
      'next-env.d.ts',
      'coverage/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The seed is a CLI script: printing progress is the point.
    files: ['prisma/seed.ts', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
]

export default config
