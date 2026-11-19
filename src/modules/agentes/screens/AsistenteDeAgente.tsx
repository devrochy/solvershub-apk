import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminApiError } from "@core/api/admin";
import { secureGet, secureSet } from "@core/secure-kv";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { sugerenciasDePrueba, type RegistroDePrueba } from "@shared/carga-de-datos/carga";
import { PasoProbar } from "@shared/prueba/PasoProbar";
import {
  cambiosFrenteARecomendado,
  ideasDeNombre,
  inicialDe,
  siglasDe,
  textoDeGuardarYSeguir,
  tipoDeLaPlantilla,
  type EstacionDeLaRuta,
} from "@shared/ruta-de-lanzamiento";
import type { EstacionDelAgenteId, GuardarEstacion } from "@shared/ruta/estacion-del-agente";
import {
  BarraRecomendado,
  Button,
  Chip,
  Elegible,
  EncabezadoEscenario,
  PildoraDelAgente,
  ResumenDeEstaciones,
  TextField,
  useKit,
  type IconName,
} from "@shared/ui";
import { ChatDeVistaPrevia } from "@shared/vista-previa/ChatDeVistaPrevia";
import {
  activarVersion,
  cargarAgente,
  cargarDestinos,
  cargarPlantillas,
  crearDesdeGuion,
  desarchivarAgente,
  publicarAgente,
  renombrarAgente,
  type DestinoDePublicacion,
  type PlantillaAgente,
} from "../api";
import {
  ESTACIONES,
  NOMBRE_MAX,
  ayudaDeLaPlantilla,
  cambiarTipo,
  claveDeNuevoAgente,
  cuerpoDeCreacion,
  errorDeLaEstacion1,
  estadoRecomendado,
  leerBorradorDeNuevoAgente,
  nombreSugeridoDe,
  ocupadoDe,
  preguntasDelGuion,
  respuestasPorDefecto,
  sePuedeElegir,
  textoDeOcupado,
  textoDeRespuesta,
  valoresDeLaEstacion1,
  type AgenteDelNegocio,
  type EstadoDelAsistente,
  type Ocupado,
} from "../asistente";
import { EstacionDelAgente } from "../ruta/EstacionDelAgente";

const MENSAJE_DE_RED = "Se cortó la conexión. Lo que elegiste sigue aquí: vuelve a intentarlo.";

const ICONO_DEL_TIPO: Record<string, IconName> = {
  ventas: "storefront",
  agenda: "event",
  cobranza: "payments",
  suscripciones: "autorenew",
};

const ESTACION_DEL_NUMERO: Record<number, EstacionDelAgenteId> = { 2: "habilidades", 3: "datos-cliente", 4: "datos-probar" };

const PREGUNTA: Record<number, string> = {
  1: "¿Qué quieres que haga tu agente?",
  2: "¿Qué sabe hacer {nombre}?",
  3: "¿Qué datos pide {nombre}?",
  4: "¿Con qué datos probamos a {nombre}?",
  5: "Revisa y publica a {nombre}",
};

const BAJADA: Record<number, string> = {
  1: "Viene con lo recomendado por SolversHub: revisa y sigue, o cambia lo que quieras.",
  2: "Viene con lo recomendado para su tipo. Cambia lo que quieras.",
  3: "Lo que le pregunta a cada cliente para atenderlo. Viene con lo justo.",
  4: "Datos de ejemplo para probar cómo responde en el chat. Puedes seguir sin cargar nada.",
  5: "Pruébalo una vez como cliente, elige dónde atiende y publícalo.",
};

/** El título de la estación con el nombre; «Datos para probar» va por tipo (tablero `rn4`). */
function preguntaDe(numero: number, nombre: string, key: string | null): string {
  if (numero === 4 && key === "ventas") return `Dale a ${nombre} algo que vender`;
  if (numero === 4 && key === "agenda") return `¿Qué citas agenda ${nombre}?`;
  return (PREGUNTA[numero] ?? "").replace("{nombre}", nombre);
}

/**
 * Nuevo agente en 5 estaciones a pantalla completa (HU-APP-23, SPEC-49; la misma ruta que el panel, HU-AOS-86):
 * franja con ✕ («Cerrar») y «Nuevo agente · N de 5», mini ruta y pie fijo. 1 Tipo llega con lo recomendado (el
 * primer tipo libre, su guion y su nombre sugerido) y avisa los tipos ocupados antes de crear; al salir nace el
 * borrador (`from-script`) y se recuerda su `agent_id` para retomarlo sin duplicarlo. 2 a 4 escriben sobre él y 5
 * lo prueba (chat real del borrador), elige dónde atiende y lo publica, o lo deja como borrador.
 */
export function AsistenteDeAgente({
  agentes = [],
  onTerminar,
  onAbrirAgente,
}: {
  /** Los agentes del negocio (`/admin/agents/overview`), para saber qué tipos están ocupados. */
  agentes?: readonly AgenteDelNegocio[];
  onTerminar: (agenteId?: string) => void;
  /** Abre la ficha de un agente (el que ocupa el tipo, el desarchivado o el recién publicado). */
  onAbrirAgente?: (agenteId: string) => void;
}) {
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const { c, tonos } = useKit();
  const insets = useSafeAreaInsets();
  const negocioId = sesion?.tenantId ?? null;
  const negocio = sesion?.tenantName?.trim() ?? "";
  const scroll = useRef<ScrollViewInstance>(null);

  const [plantillas, setPlantillas] = useState<PlantillaAgente[] | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [agenteId, setAgenteId] = useState<string | null>(null);
  const [nombreGuardado, setNombreGuardado] = useState("");
  const [numero, setNumero] = useState(1);
  const [estado, setEstado] = useState<EstadoDelAsistente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existente, setExistente] = useState<{ texto: string; ocupado: Ocupado | null } | null>(null);
  const [ocupadoEnCurso, setOcupadoEnCurso] = useState(false);
  const [cargados, setCargados] = useState<RegistroDePrueba[]>([]);
  const [resumenes, setResumenes] = useState<Partial<Record<EstacionDelAgenteId, string>>>({});
  const [destinos, setDestinos] = useState<DestinoDePublicacion[] | null>(null);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [notas, setNotas] = useState("");
  const [publicado, setPublicado] = useState<string | null>(null);
  const guardarEstacion = useRef<GuardarEstacion | null>(null);

  // Carga los tipos y, si quedó un borrador de esta ruta sin publicar, lo retoma por su `agent_id`.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [lista, crudo] = await Promise.all([
          cargarPlantillas(api),
          secureGet(claveDeNuevoAgente(negocioId)).catch(() => null),
        ]);
        if (!vivo) return;
        const borrador = leerBorradorDeNuevoAgente(crudo);
        const agente = borrador ? await cargarAgente(api, borrador.agentId).catch(() => null) : null;
        if (!vivo) return;
        const plantilla = agente ? lista.find((p) => p.key === agente.key) : undefined;
        if (borrador && agente && plantilla && agente.latest_version === null && agente.status !== "archived") {
          setAgenteId(agente.id);
          setNombreGuardado(agente.name);
          setEstado({ plantilla: plantilla.key, respuestas: respuestasPorDefecto(plantilla), nombre: agente.name });
          setNumero(borrador.estacion);
        } else if (borrador) {
          void secureSet(claveDeNuevoAgente(negocioId), "").catch(() => undefined);
        }
        setPlantillas(lista);
      } catch {
        if (vivo) setErrorDeCarga("No pudimos cargar los tipos de agente. Revisa tu conexión.");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [api, negocioId]);

  const recomendado = useMemo(
    () => (plantillas ? estadoRecomendado(plantillas, agentes, agenteId) : null),
    [plantillas, agentes, agenteId],
  );
  const actual: EstadoDelAsistente | null = estado ?? recomendado;
  const plantilla = plantillas?.find((p) => p.key === actual?.plantilla) ?? null;
  const key = plantilla?.key ?? null;
  const tipo = tipoDeLaPlantilla(key);
  const nombre = actual?.nombre.trim() ?? "";
  const quien = nombre || "tu agente";

  const recordar = useCallback(
    (id: string, estacion: number) => {
      void secureSet(claveDeNuevoAgente(negocioId), JSON.stringify({ agentId: id, estacion })).catch(() => undefined);
    },
    [negocioId],
  );

  const ir = useCallback(
    (destino: number) => {
      setNumero(destino);
      setError(null);
      guardarEstacion.current = null;
      scroll.current?.scrollTo({ y: 0, animated: false });
      if (agenteId && destino >= 2) recordar(agenteId, destino);
    },
    [agenteId, recordar],
  );

  // Al llegar a «Revisar y publicar», «Dónde atiende» llega con lo recomendado: la primera conexión que sirve.
  useEffect(() => {
    if (numero !== 5 || !agenteId || destinos) return;
    let vivo = true;
    cargarDestinos(api, agenteId)
      .then((d) => {
        if (!vivo) return;
        setDestinos(d);
        const propias = d.filter((x) => x.covers_skills && (x.installed || d.length === 1)).map((x) => x.connection_id);
        const primera = d.find((x) => x.covers_skills);
        setElegidas(propias.length > 0 ? propias : primera ? [primera.connection_id] : []);
      })
      .catch(() => vivo && setDestinos([]));
    return () => {
      vivo = false;
    };
  }, [api, numero, agenteId, destinos]);

  function cambiar(cambios: Partial<EstadoDelAsistente>) {
    if (!actual) return;
    setError(null);
    setEstado({ ...actual, ...cambios });
  }

  function elegir(p: PlantillaAgente) {
    if (!actual || !sePuedeElegir(p, agentes, agenteId)) return;
    // Un agente no cambia de tipo: con el borrador creado, el tipo queda fijo.
    if (agenteId && p.key !== actual.plantilla) return;
    setEstado(cambiarTipo(actual, plantilla, p));
    setError(null);
    setExistente(null);
  }

  /** Sale de «Tipo»: crea el borrador (o lo renombra si ya existe) y sigue en Habilidades. */
  async function salirDeTipo() {
    if (!actual) return;
    const problema = errorDeLaEstacion1(actual, plantilla);
    setError(problema ?? null);
    if (problema || !plantilla) return;
    setOcupadoEnCurso(true);
    setExistente(null);
    try {
      let id = agenteId;
      if (id) {
        if (nombre !== nombreGuardado.trim()) {
          await renombrarAgente(api, id, nombre);
          setNombreGuardado(nombre);
        }
      } else {
        const creado = await crearDesdeGuion(api, cuerpoDeCreacion(actual, plantilla));
        id = creado.agent.id;
        setAgenteId(id);
        setNombreGuardado(nombre);
        setEstado(actual);
      }
      recordar(id, 2);
      setNumero(2);
      setError(null);
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "key_taken") {
        // Red de seguridad: otro usuario creó el tipo mientras tanto. Va el mismo aviso de la tarjeta.
        const otro = e.fields?.agent_id;
        const delNegocio = otro ? agentes.find((a) => a.id === otro) : undefined;
        const ocupado: Ocupado | null = otro
          ? { id: otro, nombre: delNegocio?.name || plantilla.name, archivado: delNegocio?.status === "archived" }
          : null;
        setExistente({ texto: textoDeOcupado(plantilla.name, ocupado?.archivado ?? false), ocupado });
      } else if (e instanceof AdminApiError) {
        setError(Object.entries(e.fields ?? {}).find(([k]) => k !== "agent_id")?.[1] ?? e.message);
      } else {
        setError(MENSAJE_DE_RED);
      }
    } finally {
      setOcupadoEnCurso(false);
    }
  }

  /** «Guardar y seguir» en las estaciones 2 a 4. */
  async function salirDeEstacion() {
    setOcupadoEnCurso(true);
    try {
      const guardar = guardarEstacion.current;
      if (guardar && !(await guardar())) return;
      ir(numero + 1);
    } finally {
      setOcupadoEnCurso(false);
    }
  }
  const salir = useRef(salirDeEstacion);
  useEffect(() => {
    salir.current = salirDeEstacion;
  });
  const seguirSinDatos = useCallback(() => void salir.current(), []);

  async function publicar() {
    if (!agenteId) return;
    if (elegidas.length === 0) {
      setError("Elige al menos una conexión donde atienda.");
      return;
    }
    setOcupadoEnCurso(true);
    setError(null);
    try {
      const hecho = await publicarAgente(api, agenteId, elegidas, notas.trim());
      // Al crear, «Publicar» ya es la decisión del dueño: se activa enseguida donde atiende (D-SPEC-49-9).
      const listas = hecho.connections.filter((x) => x.release_id && !x.error);
      const fallidas: string[] = [];
      for (const x of listas) {
        try {
          await activarVersion(api, x.connection_id, x.release_id as string);
        } catch {
          const d = destinos?.find((y) => y.connection_id === x.connection_id);
          fallidas.push(d?.label || d?.channel || "una conexión");
        }
      }
      void secureSet(claveDeNuevoAgente(negocioId), "").catch(() => undefined);
      const n = nombre || "Tu agente";
      setPublicado(
        listas.length === 0
          ? `${n} quedó publicado, pero ninguna conexión quedó lista para activarlo: revísalo en el panel web.`
          : fallidas.length > 0
            ? `${n} quedó publicado, pero no se activó en ${fallidas.join(", ")}: actívalo desde Conexiones.`
            : `${n} quedó publicado y ya atiende.`,
      );
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : MENSAJE_DE_RED);
    } finally {
      setOcupadoEnCurso(false);
    }
  }

  function desarchivar(ocupado: Ocupado) {
    Alert.alert(`¿Desarchivar a ${ocupado.nombre}?`, "Vuelve a poder editarse y publicarse. Para que atienda, agrégalo a una conexión.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desarchivar",
        onPress: () => {
          void desarchivarAgente(api, ocupado.id)
            .then(() => (onAbrirAgente ? onAbrirAgente(ocupado.id) : onTerminar(ocupado.id)))
            .catch((e: unknown) => setError(e instanceof AdminApiError ? e.message : "No se pudo desarchivar el agente."));
        },
      },
    ]);
  }

  function accionDeOcupado(ocupado: Ocupado, testID: string) {
    return ocupado.archivado ? (
      <Button variant="link" size="sm" onPress={() => desarchivar(ocupado)} testID={`${testID}-desarchivar`}>
        Desarchívalo
      </Button>
    ) : (
      <Button
        variant="link"
        size="sm"
        onPress={() => (onAbrirAgente ? onAbrirAgente(ocupado.id) : onTerminar(ocupado.id))}
        testID={`${testID}-editar`}
      >
        {`Editar a ${ocupado.nombre}`}
      </Button>
    );
  }

  const cerrar = () => onTerminar(agenteId ?? undefined);
  const atras = () => {
    if (numero > 1 && !ocupadoEnCurso && !publicado) ir(numero - 1);
    else cerrar();
  };

  const registrarGuardar = useCallback((g: GuardarEstacion | null) => {
    guardarEstacion.current = g;
  }, []);
  const alResumir = useCallback((id: EstacionDelAgenteId, resumen: string) => {
    setResumenes((r) => (r[id] === resumen ? r : { ...r, [id]: resumen }));
  }, []);

  let cuerpo: ReactNode;
  if (errorDeCarga) {
    cuerpo = (
      <View style={styles.centro}>
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
          {errorDeCarga}
        </Text>
        <Button variant="secondary" onPress={() => onTerminar()}>
          Volver
        </Button>
      </View>
    );
  } else if (!plantillas || !actual) {
    cuerpo = (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
      </View>
    );
  } else if (publicado && agenteId) {
    cuerpo = (
      <View style={[styles.centro, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="asistente-publicado">
        <Text style={[shType.h1, { color: c.text }]} accessibilityRole="header">
          {nombre || "Tu agente"} ya está publicado
        </Text>
        <Text style={[shType.body, { color: c.textMuted }]}>{publicado}</Text>
        <Button onPress={() => (onAbrirAgente ? onAbrirAgente(agenteId) : onTerminar(agenteId))} fullWidth>
          {`Ver a ${nombre || "tu agente"}`}
        </Button>
        <Button variant="secondary" onPress={() => onTerminar(agenteId)} fullWidth>
          Listo
        </Button>
      </View>
    );
  } else {
    const valores = valoresDeLaEstacion1(actual);
    const cambios = recomendado ? cambiosFrenteARecomendado(valores, valoresDeLaEstacion1(recomendado)).length : 0;
    const estacion: EstacionDeLaRuta = ESTACIONES[numero - 1].id;
    const estacionDelAgente = ESTACION_DEL_NUMERO[numero];
    const preguntas = preguntasDelGuion(plantilla);
    const sugerido = plantilla ? nombreSugeridoDe(plantilla) : "";
    const textoPrincipal =
      numero === 1
        ? agenteId
          ? "Guardar y seguir"
          : nombre
            ? `Crear a ${nombre} y seguir`
            : "Crear y seguir"
        : numero === 5
          ? `Publicar a ${nombre || "tu agente"}`
          : textoDeGuardarYSeguir(estacion);
    cuerpo = (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <EncabezadoEscenario
          testID="asistente-escenario"
          insetSuperior={insets.top}
          onCerrar={cerrar}
          titulo={`Nuevo agente · ${numero} de 5`}
          estaciones={ESTACIONES}
          actual={numero - 1}
        >
          <PildoraDelAgente
            siglas={siglasDe(nombre || "?")}
            nombre={nombre || "Sin nombre"}
            detalle={[plantilla?.name ?? "Elige un tipo", "Borrador"].join(" · ")}
          />
        </EncabezadoEscenario>

        <ScrollView ref={scroll} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" testID="asistente-contenido">
          <Text accessibilityRole="header" style={[shType.hero, { color: c.text }]} testID="asistente-titulo">
            {preguntaDe(numero, quien, key)}
          </Text>
          <Text style={[shType.body, { color: c.textMuted }]}>{BAJADA[numero]}</Text>

          {numero === 1 ? (
            <View style={styles.estacion}>
              <BarraRecomendado testID="asistente-recomendado" cambios={cambios} onUsar={() => recomendado && setEstado(recomendado)} />
              <View style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel="Tipo de agente">
                {plantillas.map((p) => {
                  const ocupado = ocupadoDe(p.key, agentes, agenteId);
                  const otroTipo = Boolean(agenteId) && p.key !== actual.plantilla;
                  const nota = ocupado
                    ? textoDeOcupado(p.name, ocupado.archivado)
                    : !p.available
                      ? ayudaDeLaPlantilla(p)
                      : otroTipo
                        ? "Tu agente ya está creado con otro tipo."
                        : undefined;
                  return (
                    <Elegible
                      key={p.key}
                      testID={`asistente-tipo-${p.key}`}
                      titulo={p.name}
                      ayuda={p.available ? p.description : undefined}
                      icono={ICONO_DEL_TIPO[p.key] ?? "smart-toy"}
                      elegido={actual.plantilla === p.key}
                      etiqueta={p.key === recomendado?.plantilla ? "Recomendado" : undefined}
                      deshabilitado={Boolean(nota)}
                      nota={nota}
                      accion={ocupado ? accionDeOcupado(ocupado, `asistente-tipo-${p.key}`) : undefined}
                      onPress={() => elegir(p)}
                    />
                  );
                })}
              </View>
              {plantilla ? (
                <View style={styles.grupo}>
                  <View style={styles.fila}>
                    <Text style={[shType.label, { color: c.text }]}>Nombre del agente</Text>
                    {nombre === sugerido ? <Marca texto="Sugerido" /> : null}
                  </View>
                  <TextField
                    testID="asistente-nombre"
                    accessibilityLabel="Nombre del agente"
                    value={actual.nombre}
                    maxLength={NOMBRE_MAX}
                    onChangeText={(n) => cambiar({ nombre: n })}
                  />
                  <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Ideas de nombre">
                    {ideasDeNombre(sugerido, tipo, 3).map((n) => (
                      <Chip
                        key={n}
                        testID={`asistente-idea-${n}`}
                        titulo={n}
                        rol="radio"
                        inicial={inicialDe(n)}
                        elegido={nombre === n}
                        onPress={() => cambiar({ nombre: n })}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
              {preguntas.length > 0 ? (
                <View style={[styles.guion, { borderColor: c.border, backgroundColor: c.surface }]} testID="asistente-guion">
                  <View style={styles.fila}>
                    <Text style={[shType.label, { color: c.text }]}>Su guion</Text>
                    {preguntas.every((q) => actual.respuestas[q.id] === q.default) ? <Marca texto="Recomendado" /> : null}
                  </View>
                  {preguntas.map((q) => (
                    <View key={q.id} style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel={q.text}>
                      <Text style={[shType.dense, { color: c.textMuted }]}>{q.text}</Text>
                      {q.options.map((o) => (
                        <Elegible
                          key={o.id}
                          testID={`asistente-${q.id}-${o.id}`}
                          titulo={o.text}
                          ayuda={o.help || undefined}
                          etiqueta={o.id === q.default ? "Recomendado" : undefined}
                          elegido={actual.respuestas[q.id] === o.id}
                          onPress={() => cambiar({ respuestas: { ...actual.respuestas, [q.id]: o.id } })}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}
              {existente ? (
                <View style={styles.grupo} accessibilityRole="alert" testID="asistente-existente">
                  <Text style={[shType.body, { color: tonos.warning.fg }]}>{existente.texto}</Text>
                  {existente.ocupado ? accionDeOcupado(existente.ocupado, "asistente-existente") : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {estacionDelAgente && agenteId ? (
            <EstacionDelAgente
              estacion={estacionDelAgente}
              agenteId={agenteId}
              tipo={tipo}
              nombre={quien}
              negocio={negocio}
              registrarGuardar={registrarGuardar}
              onResumen={alResumir}
              onCargados={setCargados}
              onSeguir={seguirSinDatos}
            />
          ) : null}

          {numero === 5 && agenteId ? (
            <View style={styles.estacion}>
              <ResumenDeEstaciones
                testID="asistente-resumen"
                estaciones={[
                  {
                    id: "1",
                    titulo: "Tipo",
                    resumen: [plantilla?.name, ...preguntas.map((q) => textoDeRespuesta(q, actual))].filter(Boolean).join(" · "),
                  },
                  { id: "2", titulo: "Habilidades", resumen: resumenes.habilidades ?? "" },
                  { id: "3", titulo: "Datos del cliente", resumen: resumenes["datos-cliente"] ?? "" },
                  { id: "4", titulo: "Datos para probar", resumen: resumenes["datos-probar"] ?? "Sin datos de prueba" },
                ]}
                onEditar={(id) => ir(Number(id))}
              />
              <View style={styles.fila}>
                <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
                  Última prueba
                </Text>
                <Marca texto="Recomendado" />
              </View>
              <PasoProbar
                destino={{ agent_id: agenteId }}
                nombre={quien}
                prefijo="asistente"
                sugerencias={sugerenciasDePrueba(cargados)}
              />
              <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
                Dónde atiende
              </Text>
              {destinos === null ? (
                <ActivityIndicator />
              ) : destinos.length === 0 ? (
                <Text style={[shType.body, { color: c.textMuted }]} testID="asistente-sin-conexiones">
                  No tienes conexiones listas para agentes. Conecta un canal en Conexiones; mientras tanto, guárdalo como
                  borrador.
                </Text>
              ) : (
                <View style={styles.grupo} accessibilityLabel="Conexiones donde atiende">
                  {destinos.map((d, i) => (
                    <Elegible
                      key={d.connection_id}
                      testID={`asistente-conexion-${d.connection_id}`}
                      rol="checkbox"
                      icono="forum"
                      titulo={d.label || d.channel}
                      ayuda={d.covers_skills ? undefined : "Le faltan habilidades para este agente."}
                      etiqueta={i === destinos.findIndex((x) => x.covers_skills) ? "Recomendado" : undefined}
                      deshabilitado={!d.covers_skills}
                      elegido={elegidas.includes(d.connection_id)}
                      onPress={() =>
                        setElegidas((e) =>
                          e.includes(d.connection_id) ? e.filter((x) => x !== d.connection_id) : [...e, d.connection_id],
                        )
                      }
                    />
                  ))}
                </View>
              )}
              <TextField
                testID="asistente-notas"
                accessibilityLabel="Nota de versión"
                placeholder="Nota de versión (opcional)"
                value={notas}
                maxLength={500}
                onChangeText={setNotas}
              />
              <Text style={[shType.caption, { color: c.textMuted }]}>Tus clientes la ven cuando la actives.</Text>
            </View>
          ) : null}

          {tipo && numero < 5 ? (
            <ChatDeVistaPrevia
              key={`${tipo}:${estacion}:${quien}`}
              tipo={tipo}
              estacion={estacion}
              agente={quien}
              negocio={negocio}
              cargados={cargados}
              testID="asistente-vista-previa"
            />
          ) : null}

          {error ? (
            <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert" testID="asistente-aviso">
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={[styles.pie, { borderTopColor: c.border, backgroundColor: c.surface, paddingBottom: insets.bottom + shSpace[2] }]}>
          <View style={styles.acciones}>
            {numero > 1 ? (
              <Button variant="secondary" onPress={atras} disabled={ocupadoEnCurso} testID="asistente-atras" style={styles.alto}>
                Atrás
              </Button>
            ) : null}
            <Button
              testID={numero === 5 ? "asistente-publicar" : "asistente-siguiente"}
              onPress={() => void (numero === 1 ? salirDeTipo() : numero === 5 ? publicar() : salirDeEstacion())}
              loading={ocupadoEnCurso}
              disabled={ocupadoEnCurso || (numero === 5 && (destinos?.length ?? 0) === 0)}
              fullWidth
              style={[styles.principal, styles.alto]}
            >
              {textoPrincipal}
            </Button>
          </View>
          {numero === 5 ? (
            <Button variant="ghost" onPress={() => onTerminar(agenteId ?? undefined)} disabled={ocupadoEnCurso} testID="asistente-borrador">
              Guardar como borrador
            </Button>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={atras} statusBarTranslucent testID="asistente-agente">
      <View style={[styles.flex, { backgroundColor: c.bg }]}>{cuerpo}</View>
    </Modal>
  );
}

function Marca({ texto }: { texto: string }) {
  const { c } = useKit();
  return (
    <View style={[styles.marca, { borderColor: c.link }]}>
      <Text style={[shType.caption, { color: c.link }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centro: { flex: 1, padding: shSpace[6], gap: shSpace[4], justifyContent: "center" },
  contenido: { gap: shSpace[4], padding: shSpace[4], paddingBottom: shSpace[8] },
  estacion: { gap: shSpace[4] },
  grupo: { gap: shSpace[3] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2], flexWrap: "wrap" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  guion: { gap: shSpace[3], padding: shSpace[3], borderWidth: 1, borderRadius: shRadius.md },
  marca: { borderWidth: 1, borderRadius: shRadius.pill, paddingHorizontal: shSpace[2] },
  pie: { gap: shSpace[1], paddingHorizontal: shSpace[4], paddingTop: shSpace[3], borderTopWidth: 1 },
  acciones: { flexDirection: "row", gap: shSpace[2], alignItems: "center" },
  principal: { flex: 1 },
  /** La acción principal del pie mide 54 dp (tableros `rn1`–`rn5`). */
  alto: { minHeight: 54 },
});

