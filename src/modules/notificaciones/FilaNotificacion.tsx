import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, curva, duracion, IconButton, Icono, useKit, useReduceMotion } from "@shared/ui";
import {
  CATEGORIA,
  SEVERIDAD,
  categoriaDe,
  severidadDe,
  tiempoRelativo,
  type NotificacionItem,
} from "./tipos";

/**
 * Una notificación: icono de CATEGORÍA sobre el color de la SEVERIDAD; lo urgente lleva
 * etiqueta de texto y lo no leído, punto y negrita. El área principal marca leída y navega;
 * archivar es un botón aparte. Las que llegan con el centro abierto entran con un fundido corto.
 */
export function FilaNotificacion({
  item,
  ahora,
  nueva = false,
  onAbrir,
  onArchivar,
}: {
  item: NotificacionItem;
  ahora: Date;
  nueva?: boolean;
  onAbrir: (item: NotificacionItem) => void;
  onArchivar: (item: NotificacionItem) => void;
}) {
  const { c, tonos, ripple } = useKit();
  const reducir = useReduceMotion();
  const [entrada] = useState(() => new Animated.Value(nueva ? 0 : 1));
  useEffect(() => {
    if (!nueva) return;
    Animated.timing(entrada, {
      toValue: 1,
      duration: duracion("base", reducir),
      easing: curva("out"),
      useNativeDriver: true,
    }).start();
  }, [nueva, reducir, entrada]);

  const cat = CATEGORIA[categoriaDe(item.category)];
  const sev = SEVERIDAD[severidadDe(item.severity)];
  const tono = tonos[sev.tono];
  const urgente = item.severity === "warning" || item.severity === "critical";

  return (
    <Animated.View
      testID={`notificacion-${item.id}`}
      style={[
        styles.fila,
        { backgroundColor: item.read ? "transparent" : c.surface2, opacity: entrada },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.read ? "" : "No leída. "}${item.title}. ${cat.label}. ${tiempoRelativo(item.created_at, ahora)}${urgente ? `. ${sev.label}` : ""}`}
        accessibilityHint="Abre el detalle"
        onPress={() => onAbrir(item)}
        android_ripple={{ color: ripple.superficie }}
        style={styles.area}
      >
        <View style={[styles.icono, { backgroundColor: tono.bg, borderColor: tono.border }]}>
          <Icono name={cat.icon} size={20} color={tono.fg} />
        </View>
        <View style={styles.texto}>
          <View style={styles.titular}>
            <Text
              style={[shType.body, { color: c.text, flex: 1, fontWeight: item.read ? "400" : "700" }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {!item.read ? <View style={[styles.punto, { backgroundColor: c.link }]} /> : null}
          </View>
          {item.body ? (
            <Text style={[shType.dense, { color: c.textMuted }]} numberOfLines={3}>
              {item.body}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <Text style={[shType.caption, { color: c.textMuted }]}>
              {cat.label} · {tiempoRelativo(item.created_at, ahora)}
            </Text>
            {urgente ? <Badge tone={sev.tono} icon={sev.icon} label={sev.label} /> : null}
          </View>
        </View>
      </Pressable>
      <IconButton
        icon="archive"
        size="sm"
        label={`Archivar: ${item.title}`}
        onPress={() => onArchivar(item)}
        testID={`archivar-${item.id}`}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "flex-start", borderRadius: shRadius.md },
  area: { flex: 1, flexDirection: "row", gap: shSpace[3], padding: shSpace[3], borderRadius: shRadius.md },
  icono: {
    width: 40,
    height: 40,
    borderRadius: shRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { flex: 1, gap: shSpace[1] },
  titular: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[2] },
  punto: { width: 8, height: 8, borderRadius: shRadius.pill, marginTop: 6 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: shSpace[2] },
});
