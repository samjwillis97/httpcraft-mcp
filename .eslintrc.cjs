module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'prettier/prettier': 'error',
  },
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    'dist/', 
    'node_modules/', 
    '*.js',
    'src/httpcraft/cli.ts',
    'src/httpcraft/config.ts', 
    'src/httpcraft/parser.ts',
    'src/utils/process.ts'
  ],
};