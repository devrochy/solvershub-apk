import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { shSpace, shType } from "@core/theme/tokens";
import type { RegistroDePrueba } from "@shared/carga-de-datos/carga";
import { sugerenciasDePrueba } from "@shared/carga-de-datos/carga";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { PasoProbar } from "@shared/prueba/PasoProbar";
import {
  ESTACIONES_DE_LA_BIENVENIDA,
  cambiosFrenteARecomendado,
  siglasDe,
  textoDeGuardarYSeguir,
  tipoDeLaPlantilla,
  type EstacionDeLaRuta,
} from "@shared/ruta-de-lanzamiento";
import { useAvisoVisible } from "@shared/ruta/aviso-visible";
import type { EstacionDelAgente, EstacionDelAgenteId, GuardarEstacion } from "@shared/ruta/estacion-del-agente";
import {
  BarraRecomendado,
  Button,
  EncabezadoEscenario,
  PildoraDelAgente,
  ResumenDeEstaciones,
  TarjetaDelEscenario,
  useKit,
} from "@shared/ui";
import { ChatDeVistaPrevia } from "@shared/vista-previa/ChatDeVistaPrevia";
import {
  avanzar,
  cargarAgente,
  cargarRecorrido,
  crearDesdeGuion,
  dejarListo,
  finalizar,
  guardarIdentidad,
  omitir,
  renombrarAgente,
} from "../api";
import { LogoHorizontal } from "../components/LogoHorizontal";
import { useOnboarding } from "../contexto";
import {
  BAJADA_DEL_PASO,
  DESCRIPCION_MIN,
  ESTADO_INICIAL,
  FALTA_PARA_TERMINAR,
  FRASES_DE_PRUEBA,
  PASOS,
  TIPO_RECOMENDADO,
  TIPOS_DE_NEGOCIO,
  TOTAL_PASOS,
  cambiosDelPaso1,
  conLoRecomendado,
  conTipo,
  errorDelPaso1,
  estadoDesdeIdentidad,
  pasoDeCinco,
  plantillaDe,
  respuestasDeCreacion,
  textosDeSeguirDespues,
  tituloDelPaso,
  valoresDelPaso1,
  type EstadoDelAsistente,
  type IdentitySettings,
  type Recorrido,
  type TipoDeNegocio,
} from "../logica";
import { PasoNegocio } from "./Pasos";

const MENSAJE_DE_RED = "Se cortó la conexión. Lo que elegiste sigue aquí: vuelve a intentarlo.";

/** Borrador local: lo de la estación 1 que todavía no está en el servidor (el tipo vive solo aquí hasta crear el agente). */
type Borrador = Partial<Pick<EstadoDelAsistente, "tipo" | "negocio" | "descripcion" | "nombreDelAgente">>;

const claveDeBorrador = (negocioId: string | null) => `sh-onboarding:${negocioId ?? "sin-negocio"}`;

/** La estación (2 a 4) de cada paso de la bienvenida que escribe sobre el agente. */
const ESTACION_DEL_PASO: Record<number, EstacionDelAgenteId> = { 2: "habilidades", 3: "datos-cliente", 4: "datos-probar" };

/** La estación de la ruta de cada paso (para el chat simulado y el texto de los botones). */
function estacionDe(paso: number): EstacionDeLaRuta {
  return ESTACIONES_DE_LA_BIENVENIDA[paso - 1]?.id ?? "negocio";
}

/** «a», «a y b», «a, b y c». */
function enLista(partes: string[]): string {
  return partes.length < 2 ? partes.join("") : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/**
 * Bienvenida de primer uso en 5 estaciones (HU-APP-23, SPEC-49; la misma ruta que el panel, HU-UX-25), a
 * pantalla completa: franja del escenario arriba con el logo, mini ruta de 5 puntos y pie fijo con la acción
 * principal. 1 «Tu negocio» escribe en la identidad y, al salir, crea el agente y lo deja listo para probar; 2 a 4
 * escriben sobre el agente (las pone el módulo `agentes`, por `estacionDelAgente`); 5 repasa lo hecho, prueba el
 * chat real por la conexión de pruebas y publica (`dejar-listo` + `finalizar`).
 */
export function RecorridoScreen({ estacionDelAgente }: { estacionDelAgente?: EstacionDelAgente }) {
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const { c, tonos } = useKit();
  const insets = useSafeAreaInsets();
  const { cerrar, actualizar } = useOnboarding();
  const negocioId = sesion?.tenantId ?? null;
  const nombreDelNegocio = sesion?.tenantName?.trim() ?? "";

  const [recorrido, setRecorrido] = useState<Recorrido | null>(null);
  const [estado, setEstado] = useState<EstadoDelAsistente>(ESTADO_INICIAL);
  const [tipoFijo, setTipoFijo] = useState<TipoDeNegocio | null>(null);
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [revision, setRevision] = useState(false);
  const [probado, setProbado] = useState(false);
  const [cargados, setCargados] = useState<RegistroDePrueba[]>([]);
  const [resumenes, setResumenes] = useState<Partial<Record<EstacionDelAgenteId, string>>>({});
  const guardarEstacion = useRef<GuardarEstacion | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  const guardarBorrador = useCallback(
    (e: EstadoDelAsistente) => {
      const b: Borrador = { tipo: e.tipo, negocio: e.negocio, descripcion: e.descripcion, nombreDelAgente: e.nombreDelAgente };
      void secureSet(claveDeBorrador(negocioId), JSON.stringify(b)).catch(() => undefined);
    },
    [negocioId],
  );

  const cambiar = useCallback(
    (cambios: Partial<EstadoDelAsistente>) => {
      setError(null);
      setEstado((e) => {
        const nuevo = { ...e, ...cambios };
        guardarBorrador(nuevo);
        return nuevo;
      });
    },
    [guardarBorrador],
  );

  // Carga lo guardado: el recorrido, la identidad, el borrador local y, si ya hay agente, su tipo.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [r, ajustes, guardado] = await Promise.all([
          cargarRecorrido(api),
          api.get<{ identity: IdentitySettings }>("/admin/settings"),
          secureGet(claveDeBorrador(negocioId)).catch(() => null),
        ]);
        if (!vivo || !r) return;
        let borrador: Borrador = {};
        try {
          borrador = guardado ? (JSON.parse(guardado) as Borrador) : {};
        } catch {
          borrador = {};
        }
        const agente = r.agente_id ? await cargarAgente(api, r.agente_id).catch(() => null) : null;
        const delAgente = tipoDeLaPlantilla(agente?.key);
        const tipo = delAgente ?? borrador.tipo ?? TIPO_RECOMENDADO;
        const base = estadoDesdeIdentidad(ajustes.identity, conLoRecomendado({ ...ESTADO_INICIAL, negocio: nombreDelNegocio }, tipo));
        const conBorrador: EstadoDelAsistente = {
          ...base,
          tipo,
          negocio: borrador.negocio ?? base.negocio,
          descripcion: borrador.descripcion ?? base.descripcion,
          nombreDelAgente: agente?.name?.trim() || borrador.nombreDelAgente || base.nombreDelAgente,
        };
        if (!vivo) return;
        setEstado(conBorrador);
        setTipoFijo(delAgente);
        // Sin agente no hay estaciones 2 a 5: se vuelve a «Tu negocio».
        const retomado = r.agente_id ? Math.max(pasoDeCinco(r), 1) : 1;
        setPaso(retomado);
        setRecorrido(r);
        if (r.estado !== "en_curso") {
          const empezado = await avanzar(api, Math.max(pasoDeCinco(r), 1)).catch(() => null);
          if (vivo && empezado) {
            setRecorrido(empezado);
            actualizar(empezado);
          }
        }
      } catch {
        if (vivo) setError("No pudimos cargar tu progreso. Revisa tu conexión e inténtalo de nuevo.");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [api, negocioId, nombreDelNegocio, actualizar]);

  // Lo recomendado depende solo del tipo fijo (con el agente creado, el suyo); el negocio no se compara.
  const recomendado = useMemo(() => conLoRecomendado(ESTADO_INICIAL, tipoFijo ?? TIPO_RECOMENDADO), [tipoFijo]);

  const irAlPaso = useCallback(
    async (destino: number, guardarEnServidor: boolean) => {
      setPaso(destino);
      setError(null);
      guardarEstacion.current = null;
      scroll.current?.scrollTo({ y: 0, animated: false });
      if (!guardarEnServidor) return;
      const r = await avanzar(api, destino).catch(() => null);
      if (r) {
        setRecorrido(r);
        actualizar(r);
      }
    },
    [api, actualizar],
  );

  /** Deja el agente listo con lo último configurado (idempotente). Devuelve el error, si hubo. */
  async function prepararPrueba(agente: string): Promise<string | null> {
    try {
      const listo = await dejarListo(api, agente);
      setRevision(!listo.listo);
      setRecorrido(listo.recorrido);
      actualizar(listo.recorrido);
      return null;
    } catch (e) {
      if (e instanceof AdminApiError) {
        return e.code === "canal_en_vivo"
          ? "Ya tienes un chat web en vivo. Para no tocarlo, termina estos pasos más tarde o pausa ese chat."
          : e.message;
      }
      return MENSAJE_DE_RED;
    }
  }

  /** Sale de «Tu negocio»: guarda la identidad, crea el agente (o lo renombra) y lo deja listo para probar. */
  async function salirDelPaso1() {
    const problema = errorDelPaso1(estado);
    if (problema) {
      setError(problema);
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await guardarIdentidad(api, cambiosDelPaso1(estado));
      let agente = recorrido?.agente_id ?? null;
      if (agente) {
        await renombrarAgente(api, agente, estado.nombreDelAgente.trim());
      } else {
        try {
          const creado = await crearDesdeGuion(api, {
            template_key: plantillaDe(estado.tipo ?? TIPO_RECOMENDADO),
            answers: respuestasDeCreacion(estado),
            name: estado.nombreDelAgente.trim(),
          });
          agente = creado.agent.id;
        } catch (e) {
          // Ya existía uno de este tipo (reintento tras un corte): se sigue con ese en vez de duplicarlo.
          if (e instanceof AdminApiError && e.code === "key_taken" && e.fields?.agent_id) agente = e.fields.agent_id;
          else throw e;
        }
      }
      setTipoFijo(estado.tipo);
      const fallo = await prepararPrueba(agente);
      if (fallo) {
        setError(fallo);
        return;
      }
      // Sigue en «Habilidades», o donde iba si volvió desde una estación posterior.
      await irAlPaso(Math.max(2, recorrido ? pasoDeCinco(recorrido) : 2), true);
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : MENSAJE_DE_RED);
    } finally {
      setOcupado(false);
    }
  }

  /** «Guardar y seguir» en las estaciones 2 a 4: guarda la estación y, antes de la 5, deja listo con lo último. */
  async function salirDeEstacion() {
    const agente = recorrido?.agente_id;
    if (!agente) return;
    setOcupado(true);
    setError(null);
    try {
      const guardar = guardarEstacion.current;
      if (guardar && !(await guardar())) return;
      const destino = paso + 1;
      if (destino === TOTAL_PASOS) {
        const fallo = await prepararPrueba(agente);
        if (fallo) {
          setError(fallo);
          return;
        }
      }
      await irAlPaso(destino, true);
    } finally {
      setOcupado(false);
    }
  }

  async function publicar() {
    const agente = recorrido?.agente_id;
    if (!agente) return;
    setOcupado(true);
    setError(null);
    try {
      const fallo = await prepararPrueba(agente);
      if (fallo) {
        setError(fallo);
        return;
      }
      const r = await finalizar(api);
      setRecorrido(r);
      actualizar(r);
      setTerminado(true);
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "faltan_pasos") {
        // El 409 no trae el detalle en la APK: lo que suele faltar es la prueba por la conexión.
        setError(FALTA_PARA_TERMINAR.prueba);
      } else {
        setError(e instanceof AdminApiError ? e.message : MENSAJE_DE_RED);
      }
    } finally {
      setOcupado(false);
    }
  }

  const pedirOmitir = useCallback(() => {
    const textos = textosDeSeguirDespues(estado.nombreDelAgente);
    Alert.alert(textos.titulo, textos.detalle, [
      { text: "Seguir ahora", style: "cancel" },
      {
        text: "Seguir después",
        onPress: () => {
          void omitir(api)
            .then((r) => actualizar(r))
            .catch(() => undefined)
            .finally(cerrar);
        },
      },
    ]);
  }, [api, actualizar, cerrar, estado.nombreDelAgente]);

  // Atrás de Android: vuelve una estación; en la primera no sale (se omite con «Seguir después»).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (terminado) cerrar();
      else if (paso > 1 && !ocupado) void irAlPaso(paso - 1, false);
      return true;
    });
    return () => sub.remove();
  }, [paso, ocupado, terminado, irAlPaso, cerrar]);

  const registrarGuardar = useCallback((g: GuardarEstacion | null) => {
    guardarEstacion.current = g;
  }, []);
  const alResumir = useCallback((id: EstacionDelAgenteId, resumen: string) => {
    setResumenes((r) => (r[id] === resumen ? r : { ...r, [id]: resumen }));
  }, []);
  // «Seguir sin datos» de la estación 4 hace lo mismo que el pie, con lo vigente al tocarlo.
  const salir = useRef(salirDeEstacion);
  useEffect(() => {
    salir.current = salirDeEstacion;
  });
  const seguirSinDatos = useCallback(() => void salir.current(), []);
  // Los avisos de error quedan debajo de la estación y del chat, lejos del pie: se traen a la vista al aparecer.
  const yDeLaEstacion = useRef(0);
  const desplazarA = useCallback((y: number) => {
    scroll.current?.scrollTo({ y: Math.max(0, y - shSpace[4]), animated: true });
  }, []);
  const mostrarAvisoDeEstacion = useCallback((y: number) => desplazarA(yDeLaEstacion.current + y), [desplazarA]);
  const alMedirError = useAvisoVisible(paso > 1 ? error : null, desplazarA);

  if (cargando) {
    return (
      <View style={[styles.pantalla, styles.centro, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const nombre = estado.nombreDelAgente.trim();
  const quien = nombre || "Tu agente";

  if (terminado) {
    return (
      <View
        testID="onboarding-final"
        style={[styles.pantalla, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <View style={styles.final}>
          <LogoHorizontal ancho={260} />
          <Text accessibilityRole="header" style={[shType.h1, { color: c.text }]}>
            {quien} ya puede atender
          </Text>
          <Text style={[shType.body, { color: c.textMuted }]}>
            Responde las 24 horas y sabe cuándo atiende tu equipo. Ya puedes conectar tu WhatsApp para atender a tus
            clientes.
          </Text>
          <Button
            testID="onb-final-whatsapp"
            fullWidth
            onPress={() => {
              emitirNavegacion({ tab: "configuracion" });
              cerrar();
            }}
          >
            Conectar mi WhatsApp
          </Button>
          <Button testID="onb-final-resumen" variant="secondary" fullWidth onPress={cerrar}>
            Ir al Resumen
          </Button>
        </View>
      </View>
    );
  }

  const agenteId = recorrido?.agente_id ?? null;
  const conexionId = recorrido?.conexion_id ?? null;
  const tipo = estado.tipo;
  const negocio = estado.negocio.trim() || nombreDelNegocio;
  const pasoActual = PASOS[paso - 1];
  const estacion = estacionDe(paso);
  const cambios = cambiosFrenteARecomendado(valoresDelPaso1(estado), valoresDelPaso1(recomendado));
  const tipoDelNegocio = TIPOS_DE_NEGOCIO.find((t) => t.id === tipo);
  const tieneFrase = estado.descripcion.trim().length >= DESCRIPCION_MIN;

  // El escenario de la estación 1: lo que el agente ya sabe del negocio (n/4).
  const sabe = [Boolean(nombre), Boolean(estado.negocio.trim()), Boolean(tipoDelNegocio), tieneFrase].filter(Boolean).length;
  const faltan = [
    !nombre && "su nombre",
    !estado.negocio.trim() && "el nombre del negocio",
    !tipoDelNegocio && "a qué se dedica",
    !tieneFrase && "cómo presentarse",
  ].filter((x): x is string => Boolean(x));
  const tituloDelEscenario =
    paso === 1
      ? faltan.length === 0
        ? `${quien} ya puede saludar`
        : `${quien} ya sabe ${sabe} de 4 cosas`
      : quien;
  const detalleDelEscenario =
    paso === 1
      ? faltan.length === 0
        ? "Sabe quién es y cómo presentarse."
        : `Falta ${enLista(faltan)}.`
      : `${tipoDelNegocio?.titulo ?? ""}${negocio ? ` · ${negocio}` : ""}`;

  const estacionDelPaso = ESTACION_DEL_PASO[paso];
  const Estacion = estacionDelAgente;
  const textoPrincipal =
    paso === 1
      ? agenteId
        ? "Guardar y seguir"
        : nombre
          ? `Crear a ${nombre} y seguir`
          : "Crear mi agente y seguir"
      : paso === TOTAL_PASOS
        ? `Publicar a ${quien}`
        : textoDeGuardarYSeguir(estacion);

  return (
    <KeyboardAvoidingView
      style={[styles.pantalla, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      testID="onboarding-recorrido"
    >
      <EncabezadoEscenario
        testID="onb-escenario"
        insetSuperior={insets.top}
        marca={<LogoHorizontal ancho={120} sobreOscuro />}
        extremo={<SeguirDespues onPress={pedirOmitir} deshabilitado={ocupado} />}
        estaciones={ESTACIONES_DE_LA_BIENVENIDA}
        actual={paso - 1}
      >
        <PildoraDelAgente siglas={siglasDe(quien)} nombre={tituloDelEscenario} detalle={detalleDelEscenario} />
        {paso === 1 ? (
          <View style={styles.tarjetas}>
            <TarjetaDelEscenario etiqueta="Negocio" valor={estado.negocio.trim() || "Falta"} hecha={Boolean(estado.negocio.trim())} />
            <TarjetaDelEscenario etiqueta="Se dedica a" valor={tipoDelNegocio?.titulo ?? "Elige"} hecha={Boolean(tipoDelNegocio)} />
          </View>
        ) : null}
      </EncabezadoEscenario>

      <ScrollView ref={scroll} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[shType.hero, { color: c.text }]} testID="onb-titulo">
          {tituloDelPaso(pasoActual.id, quien, tipo)}
        </Text>
        <Text style={[shType.body, { color: c.textMuted }]}>{BAJADA_DEL_PASO[pasoActual.id].replace("tu agente", quien)}</Text>

        {paso === 1 ? (
          <>
            <BarraRecomendado
              testID="onb-recomendado"
              cambios={cambios.length}
              onUsar={() =>
                cambiar({
                  tipo: recomendado.tipo,
                  nombreDelAgente: recomendado.nombreDelAgente,
                  descripcion: recomendado.descripcion,
                })
              }
            />
            <PasoNegocio
              estado={estado}
              cambiar={cambiar}
              elegirTipo={(t) => {
                setError(null);
                setEstado((e) => {
                  const nuevo = conTipo(e, t);
                  guardarBorrador(nuevo);
                  return nuevo;
                });
              }}
              tipoFijo={tipoFijo}
              error={error ?? undefined}
            />
          </>
        ) : null}

        {estacionDelPaso && agenteId && Estacion ? (
          <View testID="onb-estacion" onLayout={(e) => (yDeLaEstacion.current = e.nativeEvent.layout.y)}>
            <Estacion
              estacion={estacionDelPaso}
              agenteId={agenteId}
              tipo={tipo}
              nombre={quien}
              negocio={negocio}
              registrarGuardar={registrarGuardar}
              onResumen={alResumir}
              onCargados={setCargados}
              onSeguir={seguirSinDatos}
              mostrarAviso={mostrarAvisoDeEstacion}
            />
          </View>
        ) : null}

        {paso === TOTAL_PASOS && agenteId ? (
          <View style={styles.bloque}>
            <ResumenDeEstaciones
              testID="onb-resumen"
              estaciones={[
                {
                  id: "1",
                  titulo: "Tu negocio",
                  resumen: [negocio, tipoDelNegocio?.titulo, nombre ? `Atiende como ${nombre}` : ""].filter(Boolean).join(" · "),
                },
                { id: "2", titulo: "Habilidades", resumen: resumenes.habilidades ?? "" },
                { id: "3", titulo: "Datos del cliente", resumen: resumenes["datos-cliente"] ?? "" },
                {
                  id: "4",
                  titulo: "Datos para probar",
                  resumen:
                    resumenes["datos-probar"] ??
                    (cargados.length > 0
                      ? `${cargados.length} ${cargados.length === 1 ? "registro cargado" : "registros cargados"}`
                      : "Sin datos de prueba"),
                },
              ]}
              onEditar={(id) => void irAlPaso(Number(id), false)}
            />
            <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
              Última prueba: qué le escribes
            </Text>
            {revision ? (
              <Text style={[shType.body, { color: tonos.warning.fg }]} accessibilityRole="alert">
                Tu agente quedó creado, pero una persona de SolversHub debe revisarlo antes de que puedas probarlo. Te
                avisamos cuando esté listo.
              </Text>
            ) : conexionId ? (
              <PasoProbar
                destino={{ connection_id: conexionId }}
                nombre={quien}
                prefijo="onb"
                sugerencias={sugerenciasConLoCargado(cargados, FRASES_DE_PRUEBA[tipo ?? TIPO_RECOMENDADO])}
                alRecibir={() => setProbado(true)}
              />
            ) : null}
            {!probado && !recorrido?.probado_en ? (
              <Text style={[shType.body, { color: tonos.warning.fg }]} accessibilityLiveRegion="polite" testID="onb-falta-prueba">
                Para publicar a {quien}, envíale al menos una frase aquí.
              </Text>
            ) : null}
            <Text style={[shType.caption, { color: c.textMuted }]}>
              Queda listo en tu chat de pruebas, cerrado al público. Cómo habla, su horario y su flujo los ajustas después
              en Personalizar; cuando conectes tu WhatsApp, lo activas desde Conexiones.
            </Text>
          </View>
        ) : null}

        {tipo && paso < TOTAL_PASOS ? (
          <ChatDeVistaPrevia
            key={`${tipo}:${estacion}:${quien}`}
            tipo={tipo}
            estacion={estacion}
            agente={quien}
            negocio={negocio}
            cargados={cargados}
          />
        ) : null}

        {error && paso > 1 ? (
          <Text
            style={[shType.body, { color: tonos.danger.fg }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            onLayout={alMedirError}
            testID="onb-error"
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.pie, { borderTopColor: c.border, backgroundColor: c.surface, paddingBottom: insets.bottom + shSpace[2] }]}>
        {paso === 1 && !error ? (
          <Text style={[shType.caption, styles.queSigue, { color: c.textMuted }]}>Sigue: {PASOS[1].corto}.</Text>
        ) : null}
        <View style={styles.acciones}>
          {paso > 1 ? (
            <Button variant="secondary" onPress={() => void irAlPaso(paso - 1, false)} disabled={ocupado} testID="onb-atras" style={styles.alto}>
              Atrás
            </Button>
          ) : null}
          <Button
            testID={paso === TOTAL_PASOS ? "onb-publicar" : "onb-siguiente"}
            onPress={() => void (paso === 1 ? salirDelPaso1() : paso === TOTAL_PASOS ? publicar() : salirDeEstacion())}
            loading={ocupado}
            disabled={paso === TOTAL_PASOS && (revision || !conexionId)}
            fullWidth
            style={[styles.principal, styles.alto]}
          >
            {textoPrincipal}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** «Seguir después», en la franja del escenario. */
function SeguirDespues({ onPress, deshabilitado }: { onPress: () => void; deshabilitado: boolean }) {
  const { escenario } = useKit();
  return (
    <Pressable
      testID="onb-omitir"
      accessibilityRole="button"
      onPress={onPress}
      disabled={deshabilitado}
      style={styles.seguirDespues}
    >
      <Text style={[shType.label, { color: escenario.acento }]}>Seguir después</Text>
    </Pressable>
  );
}

/** Frases con lo cargado primero y después las del tipo de negocio, sin repetir. */
function sugerenciasConLoCargado(cargados: RegistroDePrueba[], delTipo: readonly string[]): string[] {
  const propias = sugerenciasDePrueba(cargados);
  return [...new Set([...propias, ...delTipo])].slice(0, 6);
}

const styles = StyleSheet.create({
  pantalla: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10 },
  centro: { alignItems: "center", justifyContent: "center" },
  contenido: { gap: shSpace[4], padding: shSpace[4], paddingBottom: shSpace[8] },
  bloque: { gap: shSpace[3] },
  tarjetas: { flexDirection: "row", gap: shSpace[2] },
  pie: { gap: shSpace[2], paddingHorizontal: shSpace[4], paddingTop: shSpace[3], borderTopWidth: 1 },
  queSigue: { textAlign: "center" },
  acciones: { flexDirection: "row", gap: shSpace[2], alignItems: "center" },
  principal: { flex: 1 },
  /** La acción principal del pie mide 54 dp (tableros `rb1`–`rb5`). */
  alto: { minHeight: 54 },
  seguirDespues: { minHeight: 48, justifyContent: "center", paddingHorizontal: shSpace[1] },
  final: { flex: 1, gap: shSpace[4], padding: shSpace[4], justifyContent: "center" },
});
