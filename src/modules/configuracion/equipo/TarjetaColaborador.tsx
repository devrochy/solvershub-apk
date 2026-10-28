import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Avatar, Badge, Icono, useKit } from "@shared/ui";
import type { CollaboratorItem } from "../api";
import { rolLabel } from "./dominio";

function contador(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/**
 * Tarjeta de contacto del equipo (D-SPEC-34/ADK). Muestra lo esencial de la
 * cuenta y abre la ficha completa; ninguna acción destructiva vive aquí. Todo
 * el bloque es el blanco táctil (mínimo 48 dp) y se anuncia como botón.
 */
export function TarjetaColaborador({
  colaborador,
  onPress,
  testID,
}: {
  colaborador: CollaboratorItem;
  onPress: () => void;
  testID?: string;
}) {
  const { c, ripple } = useKit();
  const nombre = colaborador.nombre || colaborador.email;
  const secundario = colaborador.nombre
    ? colaborador.email
    : colaborador.username
      ? `@${colaborador.username}`
      : "Sin usuario";
  const rol = colaborador.is_platform_master ? "Master" : rolLabel(colaborador.role);
  const permisos = colaborador.permissions.length;

  const etiqueta = [
    nombre,
    secundario,
    rol,
    colaborador.active ? "activa" : "inactiva",
    permisos === 0 ? "permisos del rol" : contador(permisos, "permiso", "permisos"),
    contador(colaborador.links.length, "negocio", "negocios"),
  ].join(", ");

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Abre la ficha para ver permisos, negocios y cuenta."
      onPress={onPress}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [
        styles.tarjeta,
        { backgroundColor: c.surface, borderColor: c.borderSoft },
        pressed && Platform.OS === "ios" && { backgroundColor: c.hover },
      ]}
    >
      <View style={styles.fila}>
        <Avatar
          name={nombre}
          src={colaborador.avatar_url}
          size="lg"
          status={{
            tone: colaborador.active ? "success" : "neutral",
            label: colaborador.active ? "Activa" : "Inactiva",
          }}
        />
        <View style={styles.textos}>
          <View style={styles.nombreFila}>
            <Text style={[shType.block, styles.nombre, { color: c.text }]} numberOfLines={1}>
              {nombre}
            </Text>
            {colaborador.is_self ? <Badge label="tú" tone="neutral" /> : null}
          </View>
          <Text style={[shType.dense, { color: c.textMuted }]} numberOfLines={1}>
            {secundario}
          </Text>
          <View style={styles.badges}>
            <Badge
              label={rol}
              tone={colaborador.is_platform_master ? "accent" : "neutral"}
              testID={testID ? `${testID}-rol` : undefined}
            />
            <Badge
              label={colaborador.active ? "Activa" : "Inactiva"}
              tone={colaborador.active ? "success" : "neutral"}
              icon={colaborador.active ? "check-circle" : "block"}
              testID={testID ? `${testID}-estado` : undefined}
            />
          </View>
        </View>
        <Icono name="chevron-right" size={24} color={c.textSoft} />
      </View>

      <View style={[styles.meta, { borderTopColor: c.borderSoft }]}>
        {colaborador.telefono ? (
          <View style={styles.metaItem}>
            <Icono name="phone" size={16} color={c.textMuted} />
            <Text style={[shType.caption, styles.metaTexto, { color: c.textMuted }]} numberOfLines={1}>
              {colaborador.telefono}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Icono name="shield" size={16} color={c.textMuted} />
          <Text style={[shType.caption, styles.metaTexto, { color: c.textMuted }]}>
            {permisos === 0 ? "Permisos del rol" : contador(permisos, "permiso", "permisos")}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Icono name="business" size={16} color={c.textMuted} />
          <Text style={[shType.caption, styles.metaTexto, { color: c.textMuted }]}>
            {contador(colaborador.links.length, "negocio", "negocios")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[4],
    gap: shSpace[3],
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
  },
  textos: { flex: 1, gap: shSpace[1] },
  nombreFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
  },
  nombre: { flexShrink: 1 },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: shSpace[1],
    marginTop: shSpace[1],
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: shSpace[3],
    borderTopWidth: 1,
    paddingTop: shSpace[3],
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
  },
  metaTexto: { fontVariant: ["tabular-nums"] },
});
