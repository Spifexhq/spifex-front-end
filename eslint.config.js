import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', '.preview'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Components are often wrapper identifiers; the rendered DOM is checked
      // by keyboard and screen-reader passes instead.
      'jsx-a11y/no-autofocus': 'off',
    },
  },
  {
    // Pages never pick the brand orange themselves; `primary` (black) is the
    // page-level main action. Components may expose `accent` internally.
    files: [
      'src/pages/**/*.tsx',
      'src/features/**/pages/**/*.tsx',
      'src/products/*/pages/**/*.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="variant"][value.value="accent"]',
          message:
            'Pages use variant="primary" (black). Orange accent is reserved for shared components.',
        },
      ],
    },
  },
)
