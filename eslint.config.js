// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Tests y setup de jest: `jest.mock()` va antes de los imports a propósito
    // (babel-jest lo sube igual) y las factories de los mocks usan `require`, así
    // que esas dos reglas solo daban ruido. Los mocks de componentes son anónimos.
    files: ["**/*.test.{ts,tsx,js}", "jest.setup.ts"],
    languageOptions: { globals: { ...globals.jest } },
    rules: {
      "import/first": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react/display-name": "off",
    },
  },
]);
