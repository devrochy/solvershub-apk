import { useEffect, useMemo, useRef } from "react";
import { shRadius } from "@core/theme/tokens";
import { useKit } from "@shared/ui";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export interface MapaPinProps {
  latitud: number;
  longitud: number;
  onChange(latitud: number, longitud: number): void;
  alto?: number;
  testID?: string;
}

function htmlMapaPin(latitud: number, longitud: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;}</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map').setView([${latitud}, ${longitud}], 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  var marker = L.marker([${latitud}, ${longitud}], { draggable: true }).addTo(map);
  function enviar() {
    var pos = marker.getLatLng();
    window.ReactNativeWebView.postMessage(JSON.stringify({ latitud: pos.lat, longitud: pos.lng }));
  }
  marker.on('dragend', enviar);
  function mover(lat, lng) {
    if (marker) marker.setLatLng([lat, lng]);
  }
</script>
</body>
</html>`;
}

/**
 * Mapa táctil con pin arrastrable (edición de ubicación del cliente): WebView
 * con Leaflet + OpenStreetMap y un marker draggable que notifica las nuevas
 * coordenadas a React Native por el bridge postMessage. Los campos numéricos
 * de lat/lng se sincronizan con el pin. El HTML se genera una sola vez (evita
 * recargar el mapa al cambiar coordenadas); los cambios externos de lat/lng
 * mueven el marker vía injectJavaScript.
 */
export function MapaPin({
  latitud,
  longitud,
  onChange,
  alto = 180,
  testID = "mapa-pin",
}: MapaPinProps) {
  const { c } = useKit();
  const html = useMemo(() => htmlMapaPin(latitud, longitud), [latitud, longitud]);
  const webviewRef = useRef<InstanceType<typeof WebView> | null>(null);
  const primerRender = useRef(true);

  useEffect(() => {
    // Ignorar el primer render: el marker ya nace en las coords iniciales.
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    webviewRef.current?.injectJavaScript(
      `if (typeof mover === 'function') { mover(${latitud}, ${longitud}); } true;`,
    );
  }, [latitud, longitud]);

  return (
    <View style={[styles.contenedor, { height: alto, borderColor: c.border }]} testID={testID}>
      <WebView
        ref={webviewRef}
        testID={`${testID}-webview`}
        source={{ html }}
        javaScriptEnabled
        originWhitelist={["*"]}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as {
              latitud: number;
              longitud: number;
            };
            if (
              typeof data.latitud === "number" &&
              typeof data.longitud === "number"
            ) {
              onChange(data.latitud, data.longitud);
            }
          } catch {
            // mensaje malformado del puente: se ignora
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    borderRadius: shRadius.md,
    overflow: "hidden",
    borderWidth: 1,
  },
});