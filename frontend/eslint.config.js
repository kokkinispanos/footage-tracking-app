import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // This config has no eslint-plugin-react, so a component used ONLY inside JSX
      // (`icon: Icon` then `<Icon />`) reads as unused. Capitalised names are therefore
      // ignored as variables AND as destructured props.
      // `ignoreRestSiblings` allows the "strip this field" idiom: const { password, ...safe } = record.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        args: 'after-used',
        argsIgnorePattern: '^[A-Z_]|^_',
        ignoreRestSiblings: true,
      }],
      // A context file exporting its own hook is deliberate, and costs a full reload at
      // most during development. Worth knowing about, not worth failing the build.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
