import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { AdminApiError } from "@core/api/admin";
import { editarCamposDelPack, type CampoEditable, type FichaDelCliente } from "../api";
import {
  CAMPOS_DE_PERDIDA,
  CLAVE_DE_ETAPA,
  CLAVE_DE_MOTIVO,
  CLAVE_DE_VALOR,
  ETAPA_PERDIDA,
  MENSAJE_VALOR_INVALIDO,
  valorEstimadoValido,
} from "../etapas";

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
  const [erroresDeCampo, setErroresDeCampo] = useState<Record<string, string>>({});

  // Perder un lead pide motivo (HU-CRM-23): el motivo y la nota solo existen mientras la etapa es «perdido».
  const esPerdido = valores[CLAVE_DE_ETAPA] === ETAPA_PERDIDA;
  const visibles = campos.filter((c) => esPerdido || !CAMPOS_DE_PERDIDA.includes(c.key));
  const cambios = Object.fromEntries(
    Object.entries(valores)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([k, v]) => v !== (inicial[k] ?? "").trim() && (esPerdido || !CAMPOS_DE_PERDIDA.includes(k))),
  );
  const hayCambios = Object.keys(cambios).length > 0;

  /** Errores que se ven sin ir al servidor; vacío si se puede enviar. */
  const revisar = (): Record<string, string> => {
    const problemas: Record<string, string> = {};
    const pasaAPerdido = esPerdido && inicial[CLAVE_DE_ETAPA] !== ETAPA_PERDIDA;
    if (pasaAPerdido && campos.some((c) => c.key === CLAVE_DE_MOTIVO) && !(valores[CLAVE_DE_MOTIVO] ?? "").trim()) {
      problemas[CLAVE_DE_MOTIVO] = "Elige el motivo de la pérdida para marcar el lead como perdido.";
    }
    if (CLAVE_DE_VALOR in cambios && !valorEstimadoValido(valores[CLAVE_DE_VALOR] ?? "")) {
      problemas[CLAVE_DE_VALOR] = MENSAJE_VALOR_INVALIDO;
    }
    return problemas;
  };

  const guardar = async () => {
    if (!hayCambios) return;
    const problemas = revisar();
    setErroresDeCampo(problemas);
    if (Object.keys(problemas).length > 0) return;
    setGuardando(true);
    try {
      onGuardado(await editarCamposDelPack(api, clienteId, pluginId, cambios));
      setError(null);
    } catch (err) {
      // Un rechazo del servidor trae su motivo (p. ej. falta el motivo de la pérdida); lo demás es la red.
      setError(
        err instanceof AdminApiError && err.status >= 400 && err.status < 500
          ? err.message
          : "No se pudieron guardar los cambios.",
      );
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
      {visibles.map((c) => (
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
              keyboardType={c.tipo === "numero" ? "decimal-pad" : undefined}
              accessibilityLabel={c.label}
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
            />
          )}
          {c.tipo === "numero" ? (
            <Text style={{ color: colores.textoSuave, fontSize: 12, marginTop: 4 }}>
              Solo números, sin puntos de miles ni símbolos (por ejemplo 250000).
            </Text>
          ) : null}
          {erroresDeCampo[c.key] ? (
            <Text
              testID={`pack-${c.key}-error`}
              accessibilityRole="alert"
              style={{ color: colores.peligro, fontSize: 13, marginTop: 4 }}
            >
              {erroresDeCampo[c.key]}
            </Text>
          ) : null}
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
