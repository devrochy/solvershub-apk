import { useEffect, useMemo, useRef, useState } from "react";
import { shRadius } from "@core/theme/tokens";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useKit } from "./tema";

export interface MapaPinProps {
  latitud: number;
  longitud: number;
  onChange(latitud: number, longitud: number): void;
  /** Solo muestra el pin; no deja arrastrarlo ni moverlo con un toque. */
  soloLectura?: boolean;
  alto?: number;
  testID?: string;
}

function htmlMapaPin(latitud: number, longitud: number, soloLectura: boolean): string {
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
  var soloLectura = ${soloLectura ? "true" : "false"};
  var map = L.map('map').setView([${latitud}, ${longitud}], 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  var marker = L.marker([${latitud}, ${longitud}], { draggable: !soloLectura }).addTo(map);
  function enviar() {
    var pos = marker.getLatLng();
    window.ReactNativeWebView.postMessage(JSON.stringify({ latitud: pos.lat, longitud: pos.lng }));
  }
  if (!soloLectura) {
    marker.on('dragend', enviar);
    map.on('click', function (evento) {
      marker.setLatLng(evento.latlng);
      enviar();
    });
  }
  function mover(lat, lng) {
    if (marker) marker.setLatLng([lat, lng]);
  }
</script>
</body>
</html>`;
}

/**
 * Mapa táctil con pin arrastrable (edición de ubicación del cliente): WebView
 * con Leaflet + OpenStreetMap y un marker que notifica las nuevas coordenadas a
 * React Native por el bridge postMessage. Un toque en el mapa también mueve el
 * pin. Los cambios externos de lat/lng se reflejan con injectJavaScript; en
 * `soloLectura` el mapa no permite moverlo.
 */
export function MapaPin({
  latitud,
  longitud,
  onChange,
  soloLectura = false,
  alto = 180,
  testID = "mapa-pin",
}: MapaPinProps) {
  const { c } = useKit();
  const [inicial] = useState({ latitud, longitud });
  const actual = useRef({ latitud, longitud });
  const html = useMemo(
    () => htmlMapaPin(inicial.latitud, inicial.longitud, soloLectura),
    [inicial, soloLectura],
  );
  const webviewRef = useRef<WebView | null>(null);
  const primerRender = useRef(true);

  useEffect(() => {
    actual.current = { latitud, longitud };
  }, [latitud, longitud]);

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
        onLoadEnd={() => {
          webviewRef.current?.injectJavaScript(
            `if (typeof mover === 'function') { mover(${actual.current.latitud}, ${actual.current.longitud}); } true;`,
          );
        }}
        onMessage={(event) => {
          if (soloLectura) return;
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
