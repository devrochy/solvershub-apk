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
</script>
</body>
</html>`;
}

/**
 * Mapa táctil con pin arrastrable (edición de ubicación del cliente): WebView
 * con Leaflet + OpenStreetMap y un marker draggable que notifica las nuevas
 * coordenadas a React Native por el bridge postMessage. Los campos numéricos
 * de lat/lng se sincronizan con el pin.
 */
export function MapaPin({
  latitud,
  longitud,
  onChange,
  alto = 180,
  testID = "mapa-pin",
}: MapaPinProps) {
  return (
    <View style={[styles.contenedor, { height: alto }]} testID={testID}>
      <WebView
        testID={`${testID}-webview`}
        source={{ html: htmlMapaPin(latitud, longitud) }}
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
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
});