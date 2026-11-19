import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { cambiosFrenteARecomendado } from "@shared/ruta-de-lanzamiento";
import type { PropsDeEstacionDelAgente } from "@shared/ruta/estacion-del-agente";
import { BarraRecomendado, Button, Elegible, Field, Icono, RadioGroup, TextField, useKit } from "@shared/ui";
import {
  cargarBorrador,
  cargarCuentasDePago,
  cargarFormasDePago,
  cargarHabilidades,
  cargarMinimoDeFrases,
  cargarSuperpoderes,
  guardarBorrador,
  guardarFormasDePago,
  guardarHabilidad,
  type CuentaDePago,
  type FormasDePago,
  type Superpoder,
} from "../api";
import { PAGOS } from "../habilidades";
import {
  agruparPorDominio,
  conFrase,
  contenidoConHabilidades,
  cuentaDeLaRuta,
  errorDeHabilidades,
  errorDeLaCuenta,
  estadoDesdeBorrador,
  formasConCuenta,
  frasesDistintas,
  habilidadesRecomendadas,
  mismaCuenta,
  resumenDeHabilidades,
  textoDeRecomendadoDelGrupo,
  type CuentaDeLaRuta,
  type EstadoDeHabilidades,
} from "./habilidades";

const NOMBRE_DEL_TIPO: Record<string, string> = {
  ventas: "Ventas",
  agenda: "Agenda",
  cobranza: "Cobranza",
  suscripciones: "Suscripciones",
};

type Cargado = {
  catalogo: Superpoder[];
  contenido: Record<string, unknown>;
  lock: number;
  minFrases: number;
  formas: FormasDePago | null;
  cuentasWompi: CuentaDePago[];
  cuentaWompi: string | null;
};

/**
 * Estación 2, «Habilidades» (HU-APP-23, tableros `rb2`/`rn2`): los superpoderes del enfoque del agente,
 * agrupados y encendidos con lo recomendado (todos), «Al cobrar» con la cuenta de transferencia y la de Pagos en
 * línea (solo Ventas), y las frases mínimas en «Opciones avanzadas». Guarda con «Guardar y seguir»: el borrador
 * (`procedures`), las formas de pago y la habilidad de Pagos en línea, solo si cambiaron.
 */
export function EstacionHabilidades({ agenteId, tipo, nombre, registrarGuardar, onResumen }: PropsDeEstacionDelAgente) {
  const api = useAdminApi();
  const { c, tonos } = useKit();
  const [datos, setDatos] = useState<Cargado | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDeHabilidades>({ activos: [], frases: {} });
  const [cuenta, setCuenta] = useState<CuentaDeLaRuta>({ entidad: "", numero: "" });
  const [cuentaWompi, setCuentaWompi] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avanzadas, setAvanzadas] = useState(false);
  const [escritas, setEscritas] = useState<Record<string, string>>({});

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [catalogo, borrador, minFrases, formas, habilidades, cuentasWompi] = await Promise.all([
          cargarSuperpoderes(api, agenteId),
          cargarBorrador(api, agenteId),
          cargarMinimoDeFrases(api).catch(() => 3),
          tipo === "ventas" ? cargarFormasDePago(api, agenteId).catch(() => null) : Promise.resolve(null),
          tipo === "ventas" ? cargarHabilidades(api, agenteId).catch(() => []) : Promise.resolve([]),
          tipo === "ventas" ? cargarCuentasDePago(api).catch(() => []) : Promise.resolve([]),
        ]);
        if (!vivo) return;
        const pagos = habilidades.find((h) => h.pack_id === PAGOS);
        const elegida = typeof pagos?.config?.["cuenta_id"] === "string" ? (pagos.config["cuenta_id"] as string) : null;
        setDatos({ catalogo, contenido: borrador.content, lock: borrador.lock_version, minFrases, formas, cuentasWompi, cuentaWompi: elegida });
        setEstado(estadoDesdeBorrador(borrador.content));
        setCuenta(cuentaDeLaRuta(formas));
        setCuentaWompi(elegida);
      } catch {
        if (vivo) setErrorDeCarga("No pudimos cargar sus habilidades. Revisa tu conexión e inténtalo de nuevo.");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [api, agenteId, tipo]);

  const catalogo = datos?.catalogo ?? [];

  useEffect(() => {
    if (datos) onResumen("habilidades", resumenDeHabilidades(estado, datos.catalogo));
  }, [datos, estado, onResumen]);

  // «Guardar y seguir» lee siempre lo último que hay en pantalla.
  const actual = useRef({ datos, estado, cuenta, cuentaWompi });
  useEffect(() => {
    actual.current = { datos, estado, cuenta, cuentaWompi };
  });

  const guardar = useCallback(async (): Promise<boolean> => {
    const { datos: d, estado: e, cuenta: cu, cuentaWompi: wompi } = actual.current;
    if (!d) {
      setError("Espera a que carguen sus habilidades.");
      return false;
    }
    const problema = errorDeHabilidades(e, d.catalogo, d.minFrases) ?? (d.formas ? errorDeLaCuenta(cu) : null);
    if (problema) {
      setError(problema);
      return false;
    }
    setError(null);
    try {
      const nuevo = contenidoConHabilidades(d.contenido, e, d.catalogo);
      let lock = d.lock;
      let contenido = d.contenido;
      if (JSON.stringify(nuevo.procedures) !== JSON.stringify(d.contenido.procedures)) {
        const guardado = await guardarBorrador(api, agenteId, nuevo, d.lock);
        lock = guardado.lock_version;
        contenido = guardado.content;
      }
      let formas = d.formas;
      if (d.formas && !mismaCuenta(d.formas, cu)) {
        formas = await guardarFormasDePago(api, agenteId, formasConCuenta(d.formas, cu));
      }
      if (wompi && wompi !== d.cuentaWompi) {
        await guardarHabilidad(api, agenteId, PAGOS, { installed: true, config: { cuenta_id: wompi } });
      }
      setDatos({ ...d, contenido, lock, formas, cuentaWompi: wompi });
      return true;
    } catch (err) {
      setError(
        err instanceof AdminApiError && err.code === "stale_lock_version"
          ? "Otra persona guardó este agente mientras lo editabas. Cierra y vuelve a abrirlo para ver sus cambios."
          : err instanceof AdminApiError
            ? err.message
            : "Se cortó la conexión. Lo que elegiste sigue aquí: vuelve a intentarlo.",
      );
      return false;
    }
  }, [api, agenteId]);

  useEffect(() => {
    registrarGuardar(guardar);
    return () => registrarGuardar(null);
  }, [guardar, registrarGuardar]);

  if (errorDeCarga) {
    return (
      <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
        {errorDeCarga}
      </Text>
    );
  }
  if (!datos) return <ActivityIndicator testID="habilidades-cargando" />;

  const recomendadas = habilidadesRecomendadas(catalogo);
  // Un cambio por interruptor distinto de lo recomendado.
  const cambios = cambiosFrenteARecomendado(
    Object.fromEntries(catalogo.map((p) => [p.id, estado.activos.includes(p.id)])),
    Object.fromEntries(catalogo.map((p) => [p.id, recomendadas.includes(p.id)])),
  ).length;

  function alternar(id: string) {
    setError(null);
    setEstado((e) => ({ ...e, activos: e.activos.includes(id) ? e.activos.filter((x) => x !== id) : [...e.activos, id] }));
  }

  return (
    <View style={styles.estacion} testID="estacion-habilidades">
      <View style={styles.linea}>
        <Icono name="check" size={18} color={tonos.success.fg} />
        <Text style={[shType.dense, styles.flex, { color: c.text }]}>
          <Text style={shType.label}>Solver para {NOMBRE_DEL_TIPO[tipo ?? ""] ?? "tu negocio"}</Text> · activada por el
          tipo, en el paso 1
        </Text>
      </View>
      <BarraRecomendado
        testID="habilidades-recomendado"
        cambios={cambios}
        onUsar={() => setEstado((e) => ({ ...e, activos: recomendadas }))}
      />
      {catalogo.length === 0 ? (
        <Text style={[shType.body, { color: c.textMuted }]}>
          Tu negocio no tiene habilidades con superpoderes activas todavía.
        </Text>
      ) : null}
      {agruparPorDominio(catalogo).map((dominio) => (
        <View key={dominio.key} style={styles.grupo} accessibilityLabel={dominio.label}>
          <View style={styles.fila}>
            <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
              {dominio.label}
            </Text>
            <View style={[styles.marca, { borderColor: c.link }]}>
              <Text style={[shType.caption, { color: c.link }]}>{textoDeRecomendadoDelGrupo(dominio.items.length)}</Text>
            </View>
          </View>
          <View style={styles.grilla}>
            {dominio.items.map((poder) => (
              <Elegible
                key={poder.id}
                testID={`habilidad-${poder.id}`}
                rol="checkbox"
                baldosa
                icono="bolt"
                titulo={poder.title}
                ayuda={poder.description || undefined}
                elegido={estado.activos.includes(poder.id)}
                onPress={() => alternar(poder.id)}
              />
            ))}
          </View>
        </View>
      ))}

      {datos.formas ? (
        <View style={styles.grupo} testID="habilidades-al-cobrar">
          <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
            Al cobrar
          </Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            La cuenta a la que {nombre} pide las transferencias. Las demás formas de pago se ajustan en el panel web.
          </Text>
          <Field label="Entidad">
            <TextField
              testID="habilidades-entidad"
              value={cuenta.entidad}
              placeholder="Bancolombia, Nequi…"
              maxLength={80}
              onChangeText={(entidad) => setCuenta((x) => ({ ...x, entidad }))}
            />
          </Field>
          <Field label="Número de cuenta">
            <TextField
              testID="habilidades-numero"
              value={cuenta.numero}
              keyboardType="number-pad"
              maxLength={40}
              onChangeText={(numero) => setCuenta((x) => ({ ...x, numero }))}
            />
          </Field>
          {datos.cuentasWompi.length > 0 ? (
            <RadioGroup
              label="Cuenta de Pagos en línea"
              testID="habilidades-wompi"
              value={cuentaWompi ?? undefined}
              onValueChange={setCuentaWompi}
              options={datos.cuentasWompi.map((w) => ({ value: w.id, label: w.name, description: w.sandbox ? "De pruebas" : undefined }))}
            />
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: avanzadas }}
        onPress={() => setAvanzadas((v) => !v)}
        style={styles.avanzadas}
        testID="habilidades-avanzadas"
      >
        <Icono name={avanzadas ? "expand-less" : "expand-more"} size={20} color={c.link} />
        <Text style={[shType.label, { color: c.link }]}>Opciones avanzadas</Text>
      </Pressable>
      {avanzadas
        ? catalogo
            .filter((p) => estado.activos.includes(p.id))
            .map((poder) => {
              const propias = estado.frases[poder.id] ?? [];
              const total = frasesDistintas(poder, propias);
              const escrita = escritas[poder.id] ?? "";
              return (
                <View key={poder.id} style={[styles.frases, { borderColor: c.border }]}>
                  <Text style={[shType.label, { color: c.text }]}>{poder.title}</Text>
                  <Text style={[shType.caption, { color: total >= datos.minFrases ? tonos.success.fg : tonos.warning.fg }]}>
                    {total} frases (mínimo {datos.minFrases})
                  </Text>
                  {propias.map((f) => (
                    <Text key={f} style={[shType.dense, { color: c.text }]}>
                      «{f}»
                    </Text>
                  ))}
                  <TextField
                    testID={`habilidad-frase-${poder.id}`}
                    accessibilityLabel={`Otra frase para ${poder.title}`}
                    placeholder="Cómo lo pide un cliente tuyo"
                    value={escrita}
                    onChangeText={(t) => setEscritas((x) => ({ ...x, [poder.id]: t }))}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!escrita.trim()}
                    onPress={() => {
                      setEstado((e) => ({ ...e, frases: { ...e.frases, [poder.id]: conFrase(propias, escrita) } }));
                      setEscritas((x) => ({ ...x, [poder.id]: "" }));
                    }}
                  >
                    Agregar frase
                  </Button>
                </View>
              );
            })
        : null}

      {error ? (
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert" testID="habilidades-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  estacion: { gap: shSpace[4] },
  grupo: { gap: shSpace[2] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2], flexWrap: "wrap" },
  flex: { flexShrink: 1 },
  linea: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[3] },
  marca: { borderWidth: 1, borderRadius: shRadius.pill, paddingHorizontal: shSpace[2] },
  avanzadas: { flexDirection: "row", alignItems: "center", gap: shSpace[1], minHeight: 48 },
  frases: { gap: shSpace[2], padding: shSpace[3], borderWidth: 1, borderRadius: shRadius.md },
});
