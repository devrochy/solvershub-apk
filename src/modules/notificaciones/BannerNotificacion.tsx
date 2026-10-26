import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { curva, duracion, IconButton, Icono, useKit, useReduceMotion } from "@shared/ui";
import { CATEGORIA, SEVERIDAD, categoriaDe, severidadDe } from "./tipos";

/** Un aviso recibido con la app abierta, listo para pintarse. */
export interface AvisoBanner {
  id: string;
  titulo: string;
  cuerpo?: string;
  categoria: string;
  severidad: string;
  datos: Record<string, unknown>;
}

/** Tiempo en pantalla: lo urgente se queda más para dar tiempo a leerlo. */
const MS_NORMAL = 5000;
const MS_URGENTE = 8000;

/**
 * Banner del push con la app abierta (ADR-0167): baja desde arriba con fundido (`dur-slow`,
 * `ease-out`) y sale con el espejo (`dur-base`, `ease-in`), igual que la hoja del centro. Lleva
 * el icono de la CATEGORÍA sobre el color de la SEVERIDAD. Tocarlo navega al destino; se cierra
 * solo, o con la X. El componente sigue montado mientras sale. Con "reducir movimiento" no anima.
 */
export function BannerNotificacion({
  aviso,
  onAbrir,
  onCerrar,
  duracionMs,
}: {
  /** `null` = nada que mostrar (o el aviso actual debe salir). */
  aviso: AvisoBanner | null;
  onAbrir: (aviso: AvisoBanner) => void;
  onCerrar: () => void;
  /** Para pruebas: sobrescribe el tiempo en pantalla. */
  duracionMs?: number;
}) {
  const { c, tonos, ripple } = useKit();
  const insets = useSafeAreaInsets();
  const reducir = useReduceMotion();
  const [entrada] = useState(() => new Animated.Value(0));
  // El que se pinta: sigue mientras sale el anterior aviso.
  const [pintado, setPintado] = useState<AvisoBanner | null>(aviso);
  if (aviso && aviso.id !== pintado?.id) setPintado(aviso);

  // El cierre automático no debe reiniciarse porque el padre pase una función nueva.
  const cerrarRef = useRef(onCerrar);
  useEffect(() => {
    cerrarRef.current = onCerrar;
  });

  const id = aviso?.id ?? null;
  const urgente = aviso?.severidad === "warning" || aviso?.severidad === "critical";
  useEffect(() => {
    if (id !== null) {
      entrada.setValue(0);
      Animated.timing(entrada, {
        toValue: 1,
        duration: duracion("slow", reducir),
        easing: curva("out"),
        useNativeDriver: true,
      }).start();
      const cierre = setTimeout(() => cerrarRef.current(), duracionMs ?? (urgente ? MS_URGENTE : MS_NORMAL));
      return () => clearTimeout(cierre);
    }
    const salida = Animated.timing(entrada, {
      toValue: 0,
      duration: duracion("base", reducir),
      easing: curva("in"),
      useNativeDriver: true,
    });
    salida.start(({ finished }) => {
      if (finished) setPintado(null);
    });
    return () => salida.stop();
  }, [id, urgente, duracionMs, reducir, entrada]);

  if (!pintado) return null;

  const cat = CATEGORIA[categoriaDe(pintado.categoria)];
  const sev = SEVERIDAD[severidadDe(pintado.severidad)];
  const tono = tonos[sev.tono];

  return (
    <View pointerEvents="box-none" style={[styles.capa, { paddingTop: insets.top + shSpace[2] }]}>
      <Animated.View
        testID="banner-notificacion"
        accessibilityLiveRegion="polite"
        style={[
          styles.tarjeta,
          {
            backgroundColor: c.surface,
            borderColor: tono.border,
            boxShadow: c.elev3,
            opacity: entrada,
            transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [-shSpace[12], 0] }) }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${pintado.titulo}. ${cat.label}${urgente ? `. ${sev.label}` : ""}`}
          accessibilityHint="Abre el detalle"
          onPress={() => onAbrir(pintado)}
          android_ripple={{ color: ripple.superficie }}
          style={styles.area}
        >
          <View style={[styles.icono, { backgroundColor: tono.bg, borderColor: tono.border }]}>
            <Icono name={cat.icon} size={20} color={tono.fg} />
          </View>
          <View style={styles.texto}>
            <Text style={[shType.body, { color: c.text, fontWeight: "700" }]} numberOfLines={1}>
              {pintado.titulo}
            </Text>
            {pintado.cuerpo ? (
              <Text style={[shType.dense, { color: c.textMuted }]} numberOfLines={2}>
                {pintado.cuerpo}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <IconButton icon="close" label="Cerrar aviso" onPress={onCerrar} testID="banner-notificacion-cerrar" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: shSpace[3], zIndex: 1000 },
  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: shRadius.lg,
    paddingRight: shSpace[1],
  },
  area: { flex: 1, flexDirection: "row", alignItems: "center", gap: shSpace[3], padding: shSpace[3] },
  icono: {
    width: 40,
    height: 40,
    borderRadius: shRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { flex: 1, gap: 2 },
});
