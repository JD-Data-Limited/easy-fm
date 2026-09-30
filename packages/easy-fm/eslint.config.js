import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['**/__test__/**', '**/__mocks__/**'],
    },

    eslint.configs.recommended,

    ...tseslint.configs.recommended,

    {
        files: ['**/*.{ts,tsx}'],

        plugins: {
            '@stylistic': stylistic,
        },

        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },

        rules: {
            // Always use braces.
            curly: ['error', 'all'],

            // Prefer === / !==.
            eqeqeq: ['error', 'always'],

            // Avoid accidental reassignment.
            'prefer-const': 'error',

            // Cleaner modern syntax.
            'object-shorthand': 'error',
            'prefer-template': 'error',

            // Don't leave confusing control flow.
            'no-else-return': 'error',
            'no-lonely-if': 'error',

            // Formatting rules now belong to @stylistic.
            '@stylistic/indent': ['error', 4],

            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/strict-boolean-expressions': 'off',

            '@stylistic/object-curly-spacing': 'off',
            '@stylistic/brace-style': 'off',

            'no-useless-return': 'off',
        },
    },

    {
        files: ['eslint.config.{js,mjs,cjs}'],

        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
);
