import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { ClienteAdmin } from "@core/api/admin";
import { shSpace, shType } from "@core/theme/tokens";
import { useKit } from "@shared/ui";
import { cargarRegistros, sugerenciasDePrueba, type RegistroDePrueba } from "./carga";

const TIPO: Record<string, string> = {
  producto: "Producto",
  categoria: "Categoría",
  tipo: "Tipo de cita",
  cita: "Cita",
  cartera: "Cartera",
  cliente: "Cliente",
  prestamo: "Préstamo",
  plan: "Plan",
};

/**
 * «Lo que quedó cargado» (SPEC-45): la lista de lo generado o importado y frases para probar el agente. En test
 * sale de la API de registros; en producción (donde esa API no existe), de lo que se acaba de importar.
 */
export function PasoLoCargado({
  api,
  agenteId,
  locales,
  resumen,
  onRegistros,
}: {
  api: ClienteAdmin;
  agenteId: string;
  locales: RegistroDePrueba[];
  resumen: string | null;
  /** Avisa qué se muestra (la bienvenida lo usa para sugerir frases al probar). */
  onRegistros?: (registros: RegistroDePrueba[]) => void;
}) {
  const { c } = useKit();
  const [registros, setRegistros] = useState<RegistroDePrueba[] | null>(null);

  useEffect(() => {
    let vivo = true;
    cargarRegistros(api, agenteId).then((r) => {
      if (!vivo) return;
      const lista = r && r.registros.length > 0 ? r.registros : locales;
      setRegistros(lista);
      onRegistros?.(lista);
    });
    return () => {
      vivo = false;
    };
    // `onRegistros` es un aviso: no vuelve a pedir la lista si cambia la función.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, agenteId, locales]);

  if (registros === null) return <ActivityIndicator testID="cargado-cargando" />;
  const frases = sugerenciasDePrueba(registros);

  return (
    <View style={styles.bloque} testID="paso-cargado">
      {resumen ? <Text style={[shType.body, { color: c.text }]}>{resumen}</Text> : null}
      {registros.length === 0 ? (
        <Text style={[shType.body, { color: c.textMuted }]}>
          No cargaste datos todavía. Puedes publicar igual y cargarlos después desde el panel web.
        </Text>
      ) : (
        <View style={[styles.lista, { borderColor: c.border }]} accessibilityLabel="Lo que quedó cargado">
          {registros.map((r, i) => (
            <View key={`${r.tipo}-${r.nombre}-${i}`} style={styles.item}>
              <Text style={[shType.caption, { color: c.textMuted }]}>{TIPO[r.tipo] ?? r.tipo}</Text>
              <Text style={[shType.body, { color: c.text }]}>{r.nombre}</Text>
              {r.detalle ? <Text style={[shType.caption, { color: c.textMuted }]}>{r.detalle}</Text> : null}
            </View>
          ))}
        </View>
      )}
      {frases.length > 0 ? (
        <View style={styles.bloque}>
          <Text style={[shType.block, { color: c.text }]}>Para probarlo, pregúntale por ejemplo:</Text>
          {frases.map((f) => (
            <Text key={f} style={[shType.body, { color: c.textMuted }]}>
              «{f}»
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: shSpace["2"] },
  lista: { borderWidth: 1, borderRadius: 8 },
  item: { paddingHorizontal: shSpace["3"], paddingVertical: shSpace["2"], gap: 2 },
});
