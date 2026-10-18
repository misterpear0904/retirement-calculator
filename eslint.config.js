import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Flat config (ESLint 9). The lint script in package.json was broken before —
// eslint had never actually been installed.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['off'],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.cjs'],
  }
);
