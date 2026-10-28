/**
 * Extiende app.json con lo que depende del entorno de build.
 *
 * Push en Android (HU-APP-05): Expo necesita el `google-services.json` del proyecto de
 * Firebase para obtener el token del dispositivo. No se commitea: EAS lo inyecta como
 * variable de archivo `GOOGLE_SERVICES_JSON` (guía en docs/push-android.md). Sin ella el
 * build sale igual que antes, sin push.
 */
module.exports = ({ config }) => {
  const sinR8 = process.env.SOLVERSHUB_DISABLE_R8 === "1";
  const plugins = (config.plugins ?? []).map((plugin) => {
    if (!sinR8 || !Array.isArray(plugin) || plugin[0] !== "expo-build-properties") {
      return plugin;
    }
    const [nombre, props = {}] = plugin;
    return [
      nombre,
      {
        ...props,
        android: { ...props.android, enableMinifyInReleaseBuilds: false },
      },
    ];
  });

  return {
    ...config,
    android: {
      ...config.android,
      ...(process.env.GOOGLE_SERVICES_JSON
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
        : {}),
    },
    plugins,
  };
};
