/**
 * Prettier config
 * Reload window when prettier.config.mjs is updated
 * @see https://prettier.io/docs/options
 * @type {import("prettier").Config}
 */
export default {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false, // only add semicolons when necessary
  singleQuote: true, // use single quotes
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'none', // no trailing commas
  bracketSpacing: true,
  objectWrap: 'preserve',
  bracketSameLine: false,
  arrowParens: 'always',
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
  singleAttributePerLine: false
}
