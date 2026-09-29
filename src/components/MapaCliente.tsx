import { StyleSheet, View } from "react-native";
import { shColor } from "../theme/tokens";
import { WebView } from "react-native-webview";

export interface MapaClienteProps {
  latitud: number;
  longitud: number;
  nombre: string;
  alto?: number;
}

function htmlMapa(latitud: number, longitud: number, nombre: string): string {
  const titulo = nombre.replace(/["\\]/g, "");
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
  var map = L.map('map').setView([${latitud}, ${longitud}], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  L.marker([${latitud}, ${longitud}]).addTo(map).bindPopup('${titulo}').openPopup();
</script>
</body>
</html>`;
}

/**
 * Mapa de la ubicación del cliente (A6): WebView con Leaflet + OpenStreetMap,
 * marker en la ubicación del cliente. Botones de navegación externa se mantienen
 * en la pantalla Cliente.
 */
export function MapaCliente({ latitud, longitud, nombre, alto = 220 }: MapaClienteProps) {
  return (
    <View style={[styles.contenedor, { height: alto }]} testID="mapa-cliente">
      <WebView
        testID="mapa-cliente-webview"
        source={{ html: htmlMapa(latitud, longitud, nombre) }}
        javaScriptEnabled
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: shColor.mist,
  },
});