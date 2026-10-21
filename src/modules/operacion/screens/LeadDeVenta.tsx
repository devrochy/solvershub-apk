import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { editarCamposDelPack, type CampoEditable, type FichaDelCliente } from "../api";

/** Título de la sección de cada pack; uno sin título propio usa el genérico. */
const TITULO_DEL_PACK: Record<string, string> = { pack_commerce: "Lead de venta" };

/**
 * Campos que un pack deja cambiar desde la ficha (ADR-0149), p. ej. el estado y el interés del lead
 * de venta. Las opciones se eligen con botones; solo se mandan los campos que cambiaron.
 */
export function LeadDeVenta({
  clienteId,
  pluginId,
  campos,
  onGuardado,
}: {
  clienteId: string;
  pluginId: string;
  campos: CampoEditable[];
  onGuardado: (ficha: FichaDelCliente) => void;
}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const inicial: Record<string, string> = Object.fromEntries(campos.map((c) => [c.key, c.value ?? ""]));
  const [valores, setValores] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambios = Object.fromEntries(
    Object.entries(valores)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([k, v]) => v !== (inicial[k] ?? "").trim()),
  );
  const hayCambios = Object.keys(cambios).length > 0;

  const guardar = async () => {
    if (!hayCambios) return;
    setGuardando(true);
    try {
      onGuardado(await editarCamposDelPack(api, clienteId, pluginId, cambios));
      setError(null);
    } catch {
      setError("No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View
      testID={`pack-${pluginId}`}
      style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
    >
      <Text style={[styles.seccion, { color: colores.texto }]}>{TITULO_DEL_PACK[pluginId] ?? "Seguimiento"}</Text>
      {campos.map((c) => (
        <View key={c.key} style={styles.campoGrupo}>
          <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{c.label}</Text>
          {c.tipo === "opciones" ? (
            <View style={styles.opciones}>
              {(c.options ?? []).map((o) => {
                const elegida = valores[c.key] === o.value;
                return (
                  <Pressable
                    key={o.value}
                    testID={`pack-${c.key}-${o.value}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: elegida }}
                    onPress={() => setValores((v) => ({ ...v, [c.key]: o.value }))}
                    style={[
                      styles.opcion,
                      {
                        borderColor: elegida ? colores.primario : colores.borde,
                        backgroundColor: elegida ? colores.primario : "transparent",
                      },
                    ]}
                  >
                    <Text style={{ color: elegida ? colores.sobrePrimario : colores.texto, fontSize: 13 }}>
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              testID={`pack-${c.key}`}
              value={valores[c.key] ?? ""}
              onChangeText={(t) => setValores((v) => ({ ...v, [c.key]: t }))}
              maxLength={c.max_length}
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
            />
          )}
        </View>
      ))}
      {error && <Text style={{ color: colores.peligro, fontSize: 13 }}>{error}</Text>}
      <View style={styles.acciones}>
        <Pressable
          testID={`pack-${pluginId}-guardar`}
          accessibilityRole="button"
          disabled={!hayCambios || guardando}
          onPress={() => void guardar()}
          style={[
            styles.boton,
            { borderColor: colores.primario, backgroundColor: colores.primario, opacity: hayCambios ? 1 : 0.5 },
          ]}
        >
          <Text style={{ color: colores.sobrePrimario, fontWeight: "700" }}>{guardando ? "Guardando…" : "Guardar"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  seccion: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  campoGrupo: { marginBottom: 8 },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  opcion: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 4 },
  acciones: { flexDirection: "row", justifyContent: "flex-end" },
  boton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
});
