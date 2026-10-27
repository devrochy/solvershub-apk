/** Configuración de Jest para app-cobranza-apk (Expo + TypeScript). */
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|jose))",
  ],
  setupFiles: ["<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Suites de pantalla flaky bajo la carga del runner de CI (timeouts de 5 s
  // documentados en el backlog): margen para el render + waitFor.
  testTimeout: 15000,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@data/(.*)$": "<rootDir>/src/data/$1",
  },
};