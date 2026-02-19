import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default [

  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  js.configs.recommended,

  ...vue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': 'error',
      'vue/no-unused-vars': 'error',
    },
  },

  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'error',
     'no-console': 'error',
      'no-undef': 'error',
    },
  },
]
