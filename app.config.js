/**
 * Extiende app.json con lo que depende del entorno de build.
 *
 * Push en Android (HU-APP-05): Expo necesita el `google-services.json` del proyecto de
 * Firebase para obtener el token del dispositivo. No se commitea: EAS lo inyecta como
 * variable de archivo `GOOGLE_SERVICES_JSON` (guía en docs/push-android.md). Sin ella el
 * build sale igual que antes, sin push.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
  },
});
