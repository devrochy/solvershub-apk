import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import { AdminApiError } from "@core/api/admin";
import { puedeVerSeccion } from "@core/permisos";
import { usePestanaInicial, type SolicitudPestana } from "@shared/pestana-inicial";
import { formatearFechaHora } from "@shared/domain/formato-clientes";
import { cargarDispositivos, cargarEventos, cargarPolitica, ejecutarAccion } from "../api";
import {
  ESTADOS,
  ETIQUETA_ACCION,
  ETIQUETA_ESTADO,
  ETIQUETA_POLITICA,
  ETIQUETA_SEVERIDAD,
  TEXTO_DE_CONFIRMACION,
  TIPO_EVENTO,
  accionesDeDispositivo,
  contextoDeAcciones,
  mensajeDeAccionRechazada,
  nombreDelEquipo,
  rolDelDispositivo,
  type AccionDispositivo,
  type DispositivoAcceso,
  type EstadoDispositivo,
  type EventoAcceso,
  type PoliticaAcceso,
} from "../reglas";

type Pestana = "dispositivos" | "alertas";
const PESTANAS: readonly Pestana[] = ["dispositivos", "alertas"];

/**
 * Seguridad del negocio en la app (HU-ACC-05, ADR-0174): dispositivos por cuenta con sus
 * acciones y feed de alertas de acceso. La política se cambia en el panel web.
 */
export function SeguridadScreen({ pestanaInicial }: { pestanaInicial?: SolicitudPestana } = {}) {
  const { colores } = useTheme();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions ?? {};
  const visibles = PESTANAS.filter((p) =>
    puedeVerSeccion(permisos, p === "dispositivos" ? "devices" : "access_alerts", esMaster),
  );
  const [pestana, setPestana] = usePestanaInicial<Pestana>(visibles[0] ?? "dispositivos", visibles, pestanaInicial);

  return (
    <View style={[styles.pantalla, { backgroundColor: colores.fondo }]}>
      {visibles.length > 1 ? (
        <View style={[styles.pestanas, { borderColor: colores.borde }]}>
          {visibles.map((p) => (
            <Pressable
              key={p}
              testID={`seguridad-${p}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: pestana === p }}
              onPress={() => setPestana(p)}
              style={[styles.pestana, pestana === p && { borderBottomColor: colores.acento, borderBottomWidth: 2 }]}
            >
              <Text style={{ color: pestana === p ? colores.texto : colores.textoSuave, fontWeight: "600" }}>
                {p === "dispositivos" ? "Dispositivos" : "Alertas de acceso"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {pestana === "dispositivos" ? <Dispositivos /> : <Alertas />}
    </View>
  );
}

function Chips<T extends string>({
  valores,
  etiqueta,
  actual,
  alElegir,
}: {
  valores: readonly T[];
  etiqueta: (v: T) => string;
  actual: T | undefined;
  alElegir: (v: T | undefined) => void;
}) {
  const { colores } = useTheme();
  const items: (T | undefined)[] = [undefined, ...valores];
  return (
    <View style={styles.chips}>
      {items.map((v) => {
        const activo = v === actual;
        return (
          <Pressable
            key={v ?? "todos"}
            testID={`filtro-${v ?? "todos"}`}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            onPress={() => alElegir(v)}
            style={[styles.chip, { borderColor: activo ? colores.acento : colores.borde }]}
          >
            <Text style={{ color: activo ? colores.texto : colores.textoSuave, fontSize: 13 }}>
              {v === undefined ? "Todos" : etiqueta(v)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Dispositivos() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const ctx = useMemo(() => contextoDeAcciones(sesion), [sesion]);
  const [estado, setEstado] = useState<EstadoDispositivo | undefined>(undefined);
  const [filas, setFilas] = useState<DispositivoAcceso[] | null>(null);
  const [politica, setPolitica] = useState<PoliticaAcceso | null>(null);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const pagina = await cargarDispositivos(api, estado);
      setFilas(pagina.items);
      setSiguiente(pagina.next_cursor);
      setError(null);
    } catch {
      setError("No pudimos cargar los dispositivos. Intenta de nuevo.");
    }
  }, [api, estado]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial y al cambiar el filtro
    void cargar();
  }, [cargar]);

  useEffect(() => {
    cargarPolitica(api).then(setPolitica).catch(() => undefined);
  }, [api]);

  const verMas = async () => {
    if (!siguiente) return;
    try {
      const pagina = await cargarDispositivos(api, estado, siguiente);
      setFilas((previas) => [...(previas ?? []), ...pagina.items]);
      setSiguiente(pagina.next_cursor);
    } catch {
      setError("No pudimos cargar más dispositivos.");
    }
  };

  const ejecutar = (d: DispositivoAcceso, accion: AccionDispositivo) => {
    const nombre = `${nombreDelEquipo(d)} de ${d.cuenta?.email ?? "la cuenta"}`;
    Alert.alert(`${ETIQUETA_ACCION[accion]}: ${nombre}`, TEXTO_DE_CONFIRMACION[accion], [
      { text: "Cancelar", style: "cancel" },
      {
        text: ETIQUETA_ACCION[accion],
        style: accion === "bloquear" || accion === "dar-de-baja" ? "destructive" : "default",
        onPress: () => {
          setOcupado(d.id);
          ejecutarAccion(api, d.id, accion, d.estado)
            .catch((err: unknown) => {
              const e = err instanceof AdminApiError ? err : null;
              setError(mensajeDeAccionRechazada(e?.status ?? 0, e?.code ?? ""));
            })
            .finally(() => {
              setOcupado(null);
              void cargar();
            });
        },
      },
    ]);
  };

  return (
    <FlatList
      testID="seguridad-dispositivos"
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={styles.contenido}
      data={filas ?? []}
      keyExtractor={(d) => d.id}
      onEndReached={() => void verMas()}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          {politica ? (
            <View style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <Text style={[styles.titulo, { color: colores.texto }]}>Política de dispositivos</Text>
              <Text testID="seguridad-politica" style={{ color: colores.textoSuave }}>
                Dueño: {ETIQUETA_POLITICA[politica.owner]} · Colaborador: {ETIQUETA_POLITICA[politica.colaborador]} ·
                Gestor: {ETIQUETA_POLITICA[politica.gestor]}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                La política se cambia desde el panel web.
              </Text>
            </View>
          ) : null}
          <Chips valores={ESTADOS} etiqueta={(e) => ETIQUETA_ESTADO[e]} actual={estado} alElegir={setEstado} />
          {error ? (
            <Text testID="seguridad-error" accessibilityRole="alert" style={{ color: colores.peligro }}>
              {error}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        filas === null ? (
          <ActivityIndicator style={styles.centro} />
        ) : (
          <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 24 }}>
            {estado ? "Sin equipos en este estado." : "Todavía no hay equipos. Aparecerán cuando alguien entre desde un teléfono."}
          </Text>
        )
      }
      renderItem={({ item: d }) => {
        const acciones = accionesDeDispositivo(d, ctx);
        return (
          <View
            testID={`dispositivo-${d.id}`}
            style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
          >
            <Text style={[styles.titulo, { color: colores.texto }]}>{d.cuenta?.nombre || d.cuenta?.email || "—"}</Text>
            <Text style={{ color: colores.textoSuave }}>
              {rolDelDispositivo(d)} · {nombreDelEquipo(d)}
              {d.device_id_corto ? ` · …${d.device_id_corto}` : ""}
            </Text>
            <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
              {ETIQUETA_ESTADO[d.estado]}
              {d.bloqueo_equipo ? " (bloqueado para todas las cuentas)" : ""}
              {d.ultimo_uso_at ? ` · último uso ${formatearFechaHora(d.ultimo_uso_at)}` : " · sin usar"}
            </Text>
            {acciones.length > 0 ? (
              <View style={styles.acciones}>
                {acciones.map((a) => (
                  <Pressable
                    key={a}
                    testID={`accion-${a}-${d.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${ETIQUETA_ACCION[a]}: ${nombreDelEquipo(d)}`}
                    disabled={ocupado === d.id}
                    onPress={() => ejecutar(d, a)}
                    style={[styles.boton, { borderColor: colores.borde, opacity: ocupado === d.id ? 0.5 : 1 }]}
                  >
                    <Text style={{ color: colores.texto, fontWeight: "600" }}>{ETIQUETA_ACCION[a]}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

function Alertas() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [severidad, setSeveridad] = useState<EventoAcceso["severidad"] | undefined>(undefined);
  const [filas, setFilas] = useState<EventoAcceso[] | null>(null);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const pagina = await cargarEventos(api, severidad);
      setFilas(pagina.items);
      setSiguiente(pagina.next_cursor);
      setError(null);
    } catch {
      setError("No pudimos cargar las alertas. Intenta de nuevo.");
    }
  }, [api, severidad]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial y al cambiar el filtro
    void cargar();
  }, [cargar]);

  const verMas = async () => {
    if (!siguiente) return;
    try {
      const pagina = await cargarEventos(api, severidad, siguiente);
      setFilas((previas) => [...(previas ?? []), ...pagina.items]);
      setSiguiente(pagina.next_cursor);
    } catch {
      setError("No pudimos cargar más alertas.");
    }
  };

  return (
    <FlatList
      testID="seguridad-alertas"
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={styles.contenido}
      data={filas ?? []}
      keyExtractor={(e) => e.id}
      onEndReached={() => void verMas()}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Chips
            valores={["info", "aviso", "critico"] as const}
            etiqueta={(s) => ETIQUETA_SEVERIDAD[s]}
            actual={severidad}
            alElegir={setSeveridad}
          />
          {error ? (
            <Text testID="seguridad-error" accessibilityRole="alert" style={{ color: colores.peligro }}>
              {error}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        filas === null ? (
          <ActivityIndicator style={styles.centro} />
        ) : (
          <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 24 }}>
            Sin alertas. Cuando una cuenta entre desde un equipo nuevo o falle un acceso, aparecerá aquí.
          </Text>
        )
      }
      renderItem={({ item: e }) => (
        <View
          testID={`evento-${e.id}`}
          style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
        >
          <Text style={[styles.titulo, { color: colores.texto }]}>{TIPO_EVENTO[e.tipo]}</Text>
          <Text style={{ color: e.severidad === "critico" ? colores.peligro : colores.textoSuave }}>
            {ETIQUETA_SEVERIDAD[e.severidad]} · {formatearFechaHora(e.occurred_at)}
          </Text>
          <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
            {e.cuenta?.email ?? "Sin cuenta"}
            {e.device_id_corto ? ` · …${e.device_id_corto}` : ""}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  pestanas: { flexDirection: "row", borderBottomWidth: 1 },
  pestana: { flex: 1, paddingVertical: 12, alignItems: "center" },
  contenido: { padding: 16, paddingBottom: 40, gap: 12 },
  centro: { marginTop: 24 },
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  titulo: { fontSize: 16, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  boton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
});
