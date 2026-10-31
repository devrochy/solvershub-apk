import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, kitDeTema } from "@shared/ui";

const VIDEO = require("../../../../assets/video/presentacion.mp4");
const LOGO = require("../../../../assets/logo-transparente.png");

/** El video dura 10 s; el margen cubre una carga lenta sin dejar la app colgada. */
const DURACION_MAXIMA_MS = 15000;
/** El logo del póster se ve al menos este tiempo antes de dejar paso al video. */
const POSTER_MINIMO_MS = 1200;

export interface PresentacionScreenProps {
  onTerminar(): void;
}

/**
 * Intro a pantalla completa después del splash nativo (que no admite video).
 * Se muestra una sola vez, sin sesión, y siempre se puede saltar.
 */
export function PresentacionScreen({ onTerminar }: PresentacionScreenProps) {
  const kit = kitDeTema("oscuro");
  const insets = useSafeAreaInsets();
  const [primerFrame, setPrimerFrame] = useState(false);
  const [posterMinimo, setPosterMinimo] = useState(false);
  const [conSonido, setConSonido] = useState(false);
  const terminado = useRef(false);

  const terminar = useCallback(() => {
    if (terminado.current) return;
    terminado.current = true;
    onTerminar();
  }, [onTerminar]);

  const player = useVideoPlayer(VIDEO, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEventListener(player, "playToEnd", terminar);
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") terminar();
  });

  useEffect(() => {
    const timer = setTimeout(terminar, DURACION_MAXIMA_MS);
    return () => clearTimeout(timer);
  }, [terminar]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") terminar();
    });
    return () => sub.remove();
  }, [terminar]);

  useEffect(() => {
    const timer = setTimeout(() => setPosterMinimo(true), POSTER_MINIMO_MS);
    return () => clearTimeout(timer);
  }, []);

  const alternarSonido = () => {
    const siguiente = !conSonido;
    setConSonido(siguiente);
    // eslint-disable-next-line react-hooks/immutability -- el player de expo-video se controla mutando sus propiedades
    player.muted = !siguiente;
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: kit.c.bgDeep }]}>
      <VideoView
        accessibilityLabel="Presentación de SolversHub"
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="contain"
        surfaceType="textureView"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        onFirstFrameRender={() => setPrimerFrame(true)}
      />

      {!primerFrame || !posterMinimo ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.poster,
            { backgroundColor: kit.c.bg },
          ]}
        >
          <Image
            accessibilityLabel="SolversHub"
            source={LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      ) : null}

      <Pressable
        testID="presentacion-saltar"
        accessibilityRole="button"
        accessibilityLabel="Saltar presentación"
        onPress={terminar}
        android_ripple={{ color: kit.ripple.superficie }}
        style={[
          styles.saltar,
          {
            top: insets.top + shSpace[3],
            backgroundColor: kit.c.surface,
            borderColor: kit.c.controlBorder,
          },
        ]}
      >
        <Text style={[shType.label, { color: kit.c.text }]}>Saltar</Text>
      </Pressable>

      <Pressable
        testID="presentacion-sonido"
        accessibilityRole="button"
        accessibilityLabel={
          conSonido ? "Silenciar presentación" : "Activar sonido de la presentación"
        }
        onPress={alternarSonido}
        android_ripple={{ color: kit.ripple.superficie }}
        style={[
          styles.sonido,
          {
            bottom: insets.bottom + shSpace[6],
            backgroundColor: kit.c.surface,
            borderColor: kit.c.controlBorder,
          },
        ]}
      >
        <Icono name={conSonido ? "volume-up" : "volume-off"} size={22} color={kit.c.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  poster: { alignItems: "center", justifyContent: "center" },
  logo: { width: 220, height: 220 },
  saltar: {
    position: "absolute",
    right: shSpace[4],
    minHeight: 48,
    paddingHorizontal: shSpace[4],
    borderRadius: shRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sonido: {
    position: "absolute",
    right: shSpace[4],
    width: 48,
    height: 48,
    borderRadius: shRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
