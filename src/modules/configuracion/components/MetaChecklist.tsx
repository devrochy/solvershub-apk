import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  cargarChecklist,
  correrChecksProduccion,
  guardarPasoChecklist,
  type ChecklistStep,
  type PreflightOut,
  type TipoChecklist,
} from "../api";

/** Cierre de réplica: Requisitos de Meta y lista de Producción (panel: /conexiones/*). */
export function MetaChecklist() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [tipo, setTipo] = useState<TipoChecklist>("requirements");
  const [pasos, setPasos] = useState<ChecklistStep[]>([]);
  const [checks, setChecks] = useState<PreflightOut[]>([]);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [corriendo, setCorriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    (t: TipoChecklist) => {
      setCargando(true);
      setError(null);
      cargarChecklist(api, t)
        .then((res) => {
          setPasos(res.steps);
          setChecks(res.checks ?? []);
          setNotas(Object.fromEntries(res.steps.map((p) => [p.key, p.notes ?? ""])));
        })
        .catch(() => setError("No pudimos cargar la checklist."))
        .finally(() => setCargando(false));
    },
    [api],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el spinner de carga solo se activa al cambiar de pestaña (en el mount cargando ya es true)
    cargar(tipo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga al cambiar de tipo
  }, [tipo]);

  const alternar = (paso: ChecklistStep, done: boolean) => {
    setPasos((previo) => previo.map((p) => (p.key === paso.key ? { ...p, done } : p)));
    guardarPasoChecklist(api, { step_key: paso.key, done, notes: notas[paso.key] ?? "" }).catch(
      () => setError("No se pudo guardar el paso."),
    );
  };

  const editarNota = (clave: string, valor: string) => {
    setNotas((previo) => ({ ...previo, [clave]: valor }));
  };

  const guardarNota = (paso: ChecklistStep) => {
    guardarPasoChecklist(api, {
      step_key: paso.key,
      done: paso.done,
      notes: notas[paso.key] ?? "",
    }).catch(() => setError("No se pudo guardar la nota."));
  };

  const correr = () => {
    setCorriendo(true);
    setError(null);
    correrChecksProduccion(api)
      .then(setChecks)
      .catch(() => setError("No se pudieron correr las comprobaciones."))
      .finally(() => setCorriendo(false));
  };

  const hechos = pasos.filter((p) => p.done).length;

  return (
    <ScrollView
      testID="checklist-meta"
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {([
          { key: "requirements" as TipoChecklist, label: "Requisitos" },
          { key: "production" as TipoChecklist, label: "Producción" },
        ]).map((t) => (
          <Pressable
            key={t.key}
            testID={`checklist-sub-${t.key}`}
            onPress={() => setTipo(t.key)}
            style={[
              styles.pestana,
              tipo === t.key && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={{
                color: tipo === t.key ? colores.texto : colores.textoSuave,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text testID="checklist-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {cargando ? (
        <ActivityIndicator testID="checklist-cargando" style={{ marginTop: 30 }} />
      ) : (
        <>
          <Text testID="checklist-progreso" style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 8 }}>
            {`${hechos} de ${pasos.length} pasos completados${
              tipo === "requirements" ? " · comprobaciones automáticas arriba" : ""
            }`}
          </Text>

          {tipo === "requirements" && checks.length > 0 ? (
            <View testID="checklist-checks" style={{ marginBottom: 12 }}>
              <Text style={{ color: colores.texto, fontWeight: "700", fontSize: 13, marginBottom: 6 }}>
                Comprobaciones automáticas
              </Text>
              {checks.map((c) => (
                <View
                  key={c.key}
                  style={[styles.checkFila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
                >
                  <Text style={{ color: c.ok ? colores.acento : colores.peligro, fontSize: 11, fontWeight: "700" }}>
                    {c.ok ? "ok" : "revisar"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colores.textoSuave, fontSize: 11 }}>{c.key}</Text>
                    {c.detail ? (
                      <Text style={{ color: colores.texto, fontSize: 12 }}>{c.detail}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {tipo === "production" && checks.length > 0 ? (
            <View testID="checklist-checks" style={{ marginBottom: 12 }}>
              <Text style={{ color: colores.texto, fontWeight: "700", fontSize: 13, marginBottom: 6 }}>
                Comprobaciones de producción
              </Text>
              {checks.map((c) => (
                <View
                  key={c.key}
                  style={[styles.checkFila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
                >
                  <Text style={{ color: c.ok ? colores.acento : colores.peligro, fontSize: 11, fontWeight: "700" }}>
                    {c.ok ? "ok" : "revisar"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colores.textoSuave, fontSize: 11 }}>{c.key}</Text>
                    {c.detail ? (
                      <Text style={{ color: colores.texto, fontSize: 12 }}>{c.detail}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            testID="checklist-correr"
            disabled={corriendo}
            onPress={correr}
            style={[styles.boton, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
          >
            <Text style={{ color: colores.texto, fontWeight: "600", fontSize: 12 }}>
              {corriendo
                ? "Corriendo…"
                : tipo === "requirements"
                  ? "Actualizar comprobaciones"
                  : "Ejecutar comprobaciones"}
            </Text>
          </Pressable>

          {pasos.map((p) => (
            <View
              key={p.key}
              testID={`checklist-paso-${p.key}`}
              style={[styles.paso, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: p.done ? colores.textoSuave : colores.texto, fontSize: 13, fontWeight: "600" }}>
                  {p.label}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 11 }}>{p.key}</Text>
              </View>
              <Switch
                testID={`checklist-toggle-${p.key}`}
                value={p.done}
                onValueChange={(v) => alternar(p, v)}
              />
              <TextInput
                testID={`checklist-nota-${p.key}`}
                value={notas[p.key] ?? ""}
                onChangeText={(v) => editarNota(p.key, v)}
                onBlur={() => guardarNota(p)}
                placeholder="Nota"
                placeholderTextColor={colores.textoSuave}
                style={[styles.nota, { borderColor: colores.borde, color: colores.texto }]}
              />
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pestanas: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 10 },
  pestana: { flex: 1, paddingVertical: 10, alignItems: "center" },
  checkFila: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  boton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  paso: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  nota: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
});
