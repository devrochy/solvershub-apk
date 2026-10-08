/**
 * Config del fingerprint de expo-updates (runtimeVersion "fingerprint", HU-APP-17).
 *
 * `google-services.json` llega solo en EAS, como variable de archivo `GOOGLE_SERVICES_JSON`
 * (`../eas-environment-secrets/<hash>`), y entra al fingerprint como archivo externo de la
 * config. En local no existe, así que el runtimeVersion calculado en EAS y en la máquina
 * que publica el OTA no coincidían: el build fallaba y un OTA nunca habría llegado a esos
 * binarios. Se excluye: un OTA solo cambia JS, que no depende de ese archivo; si cambia
 * Firebase, se publica un AAB nuevo de todos modos.
 */
/** @type {import('expo/fingerprint').Config} */
module.exports = {
  ignorePaths: ["../eas-environment-secrets/**"],
};
