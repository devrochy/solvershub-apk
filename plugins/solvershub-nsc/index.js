/**
 * Config plugin `solvershub-nsc` (HU-APP-16, ADR-APP-05): certificate pinning
 * de la API (solvershub.site) vía network_security_config en Android.
 *
 * - Pins de CA (no de hoja): el intermedio vigente (Let's Encrypt YE2) y la
 *   raíz ISRG Root X2 → las renovaciones de la hoja (~90 días) NO rompen la
 *   app. Runbook de rotación en docs/seguridad.md.
 * - `cleartext`: por defecto OFF (base-config). Los builds de desarrollo
 *   pasan `SOLVERSHUB_CLEARTEXT=1` (env de EAS del perfil) para poder usar la
 *   API local por http. Expo Go no aplica NSC (solo builds propias).
 * - iOS queda documentado (TrustKit) como deuda en docs/seguridad.md.
 */
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PIN_INTERMEDIO = "s/tdAOmUzd8syaTuqfgGvFcn6DzA5Cmb+Vby1ST+U3Y="; // LE YE2
const PIN_RAIZ = "diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI="; // ISRG Root X2

function contenidoXml(permitirCleartext) {
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="${permitirCleartext ? "true" : "false"}">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">solvershub.site</domain>
    <pin-set expiration="2029-12-31">
      <pin digest="SHA-256">${PIN_INTERMEDIO}</pin>
      <pin digest="SHA-256">${PIN_RAIZ}</pin>
    </pin-set>
  </domain-config>
</network-security-config>
`;
}

module.exports = function solvershubNsc(config, props = {}) {
  const permitirCleartext =
    props.cleartext === true || process.env.SOLVERSHUB_CLEARTEXT === "1";

  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const app = manifest.application && manifest.application[0];
    if (app) {
      app.$ = app.$ || {};
      app.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    }
    return c;
  });

  config = withDangerousMod(config, [
    "android",
    (c) => {
      const dir = path.join(
        c.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml",
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "network_security_config.xml"),
        contenidoXml(permitirCleartext),
      );
      return c;
    },
  ]);

  return config;
};
