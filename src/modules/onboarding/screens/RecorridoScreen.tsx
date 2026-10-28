import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminApiError } from "@core/api/admin";
import { secureGet, secureSet } from "@core/secure-kv";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { Button, Icono, Sheet, TextField, useKit } from "@shared/ui";
import {
  avanzar,
  cargarPrueba,
  cargarRecorrido,
  crearDesdeGuion,
  dejarListo,
  enviarPrueba,
  finalizar,
  guardarIdentidad,
  omitir,
  reiniciarPrueba,
  type TurnoDePrueba,
} from "../api";
import { Chip } from "../components/Elegible";
import {
  cargarDatosDePrueba,
  conteoLegible,
  generarDatosDePrueba,
  MODULOS_DE_PRUEBA,
  resumenDelLote,
  type EstadoDatosDePruebaModulo,
  type ModuloDatosDePrueba,
} from "../../datos-prueba";
import { LogoHorizontal } from "../components/LogoHorizontal";
import { TarjetaDelAgente } from "../components/TarjetaDelAgente";
import { useOnboarding } from "../contexto";
import {
  ESTADO_INICIAL,
  ETIQUETAS_DE_SUBPASO,
  FRASES_DE_PRUEBA,
  MOTIVOS_DE_ESCALAR,
  PASOS,
  TIPOS_DE_NEGOCIO,
  TONOS,
  TOTAL_PASOS,
  cambiosDelPaso,
  errorDelPaso,
  estadoDesdeIdentidad,
  plantillaDe,
  respuestasDeCreacion,
  resumenDeHorario,
  textoDeAvance,
  type EstadoDelAsistente,
  type Recorrido,
  type SubPaso,
} from "../logica";
import { PasoNegocio, PasoReglas, PasoVoz } from "./Pasos";

const MENSAJE_DE_RED =
  "Se cortó la conexión. Lo que elegiste sigue aquí: vuelve a intentarlo.";

/** Borrador local: lo que el servidor no guarda por sí mismo (tipo de negocio, qué vende y nombre comercial). */
type Borrador = Pick<EstadoDelAsistente, "tipo" | "queVende" | "negocio">;

const claveDeBorrador = (negocioId: string | null) =>
  `sh-onboarding:${negocioId ?? "sin-negocio"}`;

/**
 * Asistente de primer uso a pantalla completa (HU-APP-22, SPEC-41): los mismos seis pasos que el panel, uno
 * por pantalla, con la tarjeta «Tu agente, armándose» en una hoja plegable. Cada paso guarda al avanzar y se
 * retoma donde quedó. «Lo hago después» siempre está a la vista y deja el aviso fijo en el header.
 */
export function RecorridoScreen() {
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const { c, tonos } = useKit();
  const insets = useSafeAreaInsets();
  const { cerrar, actualizar } = useOnboarding();
  const negocioId = sesion?.tenantId ?? null;

  const [recorrido, setRecorrido] = useState<Recorrido | null>(null);
  const [estado, setEstado] = useState<EstadoDelAsistente>(ESTADO_INICIAL);
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verTarjeta, setVerTarjeta] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [subpasos, setSubpasos] = useState<SubPaso[]>([]);
  const [fase, setFase] = useState<
    "inactivo" | "creando" | "dejando-listo" | "error" | "listo"
  >("inactivo");
  const [revision, setRevision] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const guardarBorrador = useCallback(
    (e: EstadoDelAsistente) => {
      const b: Borrador = {
        tipo: e.tipo,
        queVende: e.queVende,
        negocio: e.negocio,
      };
      void secureSet(claveDeBorrador(negocioId), JSON.stringify(b)).catch(
        () => undefined,
      );
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

  // Carga lo guardado: el recorrido, la identidad ya elegida y el borrador local; marca el recorrido como empezado.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [r, ajustes, guardado] = await Promise.all([
          cargarRecorrido(api),
          api.get<{ identity: Parameters<typeof estadoDesdeIdentidad>[0] }>(
            "/admin/settings",
          ),
          secureGet(claveDeBorrador(negocioId)).catch(() => null),
        ]);
        if (!vivo || !r) return;
        let borrador: Partial<Borrador> = {};
        try {
          borrador = guardado
            ? (JSON.parse(guardado) as Partial<Borrador>)
            : {};
        } catch {
          borrador = {};
        }
        const base = estadoDesdeIdentidad(ajustes.identity, {
          ...ESTADO_INICIAL,
          ...borrador,
        });
        // Sin tipo de negocio no se puede crear el agente: si el borrador se perdió, se vuelve al paso 1.
        const retomado = Math.min(Math.max(r.paso, 1), TOTAL_PASOS);
        setEstado(base);
        setPaso(!base.tipo && !r.agente_id && retomado > 1 ? 1 : retomado);
        setRecorrido(r);
        if (r.agente_id && r.conexion_id) setFase("listo");
        if (r.estado !== "en_curso") {
          const empezado = await avanzar(api, Math.max(r.paso, 1)).catch(
            () => null,
          );
          if (vivo && empezado) {
            setRecorrido(empezado);
            actualizar(empezado);
          }
        }
      } catch {
        if (vivo)
          setError(
            "No pudimos cargar tu progreso. Revisa tu conexión e inténtalo de nuevo.",
          );
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [api, negocioId, actualizar]);

  const pasoActual = PASOS[paso - 1];

  const irAlPaso = useCallback(
    async (destino: number) => {
      setPaso(destino);
      setError(null);
      scroll.current?.scrollTo({ y: 0, animated: false });
      const r = await avanzar(api, destino).catch(() => null);
      if (r) {
        setRecorrido(r);
        actualizar(r);
      }
    },
    [api, actualizar],
  );

  async function siguiente() {
    const problema = errorDelPaso(pasoActual.id, estado);
    if (problema) {
      setError(problema);
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await guardarIdentidad(api, cambiosDelPaso(pasoActual.id, estado));
      await irAlPaso(paso + 1);
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : MENSAJE_DE_RED);
    } finally {
      setOcupado(false);
    }
  }

  async function crear() {
    if ((!estado.tipo && !recorrido?.agente_id) || ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      let agente = recorrido?.agente_id ?? null;
      if (!agente) {
        setFase("creando");
        try {
          const creado = await crearDesdeGuion(api, {
            template_key: plantillaDe(estado.tipo ?? "ventas"),
            answers: respuestasDeCreacion(estado),
            name: estado.nombreDelAgente.trim(),
          });
          agente = creado.agent.id;
        } catch (e) {
          // Ya existía uno de este tipo (reintento tras un corte): se sigue con ese en vez de duplicarlo.
          if (
            e instanceof AdminApiError &&
            e.code === "key_taken" &&
            e.fields?.agent_id
          )
            agente = e.fields.agent_id;
          else throw e;
        }
      }
      setFase("dejando-listo");
      const listo = await dejarListo(api, agente);
      setSubpasos(listo.pasos);
      setRevision(!listo.listo);
      setRecorrido(listo.recorrido);
      actualizar(listo.recorrido);
      setFase("listo");
    } catch (e) {
      setFase("error");
      if (e instanceof AdminApiError) {
        setError(
          e.code === "canal_en_vivo"
            ? "Ya tienes un chat web en vivo. Para no tocarlo, termina estos pasos más tarde o pausa ese chat."
            : e.message,
        );
      } else {
        setError(MENSAJE_DE_RED);
      }
    } finally {
      setOcupado(false);
    }
  }

  async function terminar() {
    setOcupado(true);
    setError(null);
    try {
      const r = await finalizar(api);
      setRecorrido(r);
      actualizar(r);
      setTerminado(true);
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.code === "faltan_pasos"
          ? "Todavía falta probar a tu agente: escríbele un mensaje."
          : e instanceof AdminApiError
            ? e.message
            : MENSAJE_DE_RED,
      );
    } finally {
      setOcupado(false);
    }
  }

  const pedirOmitir = useCallback(() => {
    Alert.alert(
      "¿Lo haces después?",
      "Tu agente no quedará listo para probar y verás un aviso hasta que termines estos pasos. Lo que ya elegiste se guarda.",
      [
        { text: "Seguir ahora", style: "cancel" },
        {
          text: "Lo hago después",
          onPress: () => {
            void omitir(api)
              .then((r) => actualizar(r))
              .catch(() => undefined)
              .finally(cerrar);
          },
        },
      ],
    );
  }, [api, actualizar, cerrar]);

  // Atrás de Android: vuelve un paso; en el primero no sale (se omite con «Lo hago después»).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (terminado) {
        cerrar();
      } else if (paso > 1 && !ocupado) {
        void irAlPaso(paso - 1);
      }
      return true;
    });
    return () => sub.remove();
  }, [paso, ocupado, terminado, irAlPaso, cerrar]);

  if (cargando) {
    return (
      <View style={[styles.pantalla, styles.centro, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (terminado) {
    return (
      <View
        testID="onboarding-final"
        style={[
          styles.pantalla,
          {
            backgroundColor: c.bg,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.final}>
          <LogoHorizontal ancho={260} />
          <Text
            accessibilityRole="header"
            style={[shType.h1, { color: c.text }]}
          >
            {estado.nombreDelAgente.trim() || "Tu agente"} ya está listo
          </Text>
          <Text style={[shType.body, { color: c.textMuted }]}>
            Responde las 24 horas y sabe cuándo atiende tu equipo. Ya puedes
            conectar tu WhatsApp para atender a tus clientes.
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
          <Button
            testID="onb-final-resumen"
            variant="secondary"
            fullWidth
            onPress={cerrar}
          >
            Ir al Resumen
          </Button>
        </View>
      </View>
    );
  }

  const ultimo = paso === TOTAL_PASOS;
  const agenteId = recorrido?.agente_id ?? null;
  const conexionId = recorrido?.conexion_id ?? null;
  const puedeProbar = Boolean(agenteId && conexionId) && !revision;

  return (
    <KeyboardAvoidingView
      style={[styles.pantalla, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      testID="onboarding-recorrido"
    >
      <View
        style={[
          styles.cabecera,
          {
            paddingTop: insets.top + shSpace[2],
            borderBottomColor: c.border,
            backgroundColor: c.surface,
          },
        ]}
      >
        <LogoHorizontal ancho={168} />
        <View style={styles.avance}>
          <Text
            style={[shType.caption, { color: c.textMuted }]}
            testID="onb-avance"
          >
            {textoDeAvance(paso)}
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: TOTAL_PASOS, now: paso }}
            style={[styles.barra, { backgroundColor: c.border }]}
          >
            <View
              style={[
                styles.relleno,
                {
                  backgroundColor: c.link,
                  width: `${(paso / TOTAL_PASOS) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={[shType.h1, { color: c.text }]}>
          {pasoActual.titulo}
        </Text>

        {pasoActual.id === "negocio" && (
          <PasoNegocio
            estado={estado}
            cambiar={cambiar}
            error={error ?? undefined}
          />
        )}
        {pasoActual.id === "voz" && (
          <PasoVoz estado={estado} cambiar={cambiar} />
        )}
        {pasoActual.id === "reglas" && (
          <PasoReglas
            estado={estado}
            cambiar={cambiar}
            error={error ?? undefined}
          />
        )}
        {pasoActual.id === "conocimiento" && (
          <PasoConocimiento estado={estado} alIr={cerrar} />
        )}
        {pasoActual.id === "crear" && (
          <PasoCrear
            estado={estado}
            fase={fase}
            subpasos={subpasos}
            revision={revision}
          />
        )}
        {pasoActual.id === "probar" && puedeProbar && conexionId && (
          <PasoProbar
            conexionId={conexionId}
            nombre={estado.nombreDelAgente.trim() || "tu agente"}
            sugerencias={FRASES_DE_PRUEBA[estado.tipo ?? "ventas"]}
            alRecibir={(turnos) => {
              if (turnos.length > 0)
                setRecorrido((r) =>
                  r
                    ? {
                        ...r,
                        probado_en: r.probado_en ?? new Date().toISOString(),
                      }
                    : r,
                );
            }}
          />
        )}
        {pasoActual.id === "probar" && !puedeProbar && (
          <Text style={[shType.body, { color: c.textMuted }]}>
            {revision
              ? "Tu agente quedó creado, pero una persona de SolversHub debe revisarlo antes de que puedas probarlo. Te avisamos cuando esté listo."
              : "Primero crea tu agente en el paso anterior."}
          </Text>
        )}

        {error && pasoActual.id !== "negocio" && pasoActual.id !== "reglas" ? (
          <Text
            style={[shType.body, { color: tonos.danger.fg }]}
            accessibilityRole="alert"
            testID="onb-error"
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.pie,
          {
            borderTopColor: c.border,
            backgroundColor: c.surface,
            paddingBottom: insets.bottom + shSpace[2],
          },
        ]}
      >
        <Button
          variant="link"
          iconLeft="expand-less"
          onPress={() => setVerTarjeta(true)}
          testID="onb-ver-agente"
        >
          Ver cómo va tu agente
        </Button>
        <View style={styles.acciones}>
          {paso > 1 ? (
            <Button
              variant="secondary"
              onPress={() => void irAlPaso(paso - 1)}
              disabled={ocupado}
              testID="onb-atras"
            >
              Atrás
            </Button>
          ) : null}
          {pasoActual.id === "crear" ? (
            fase === "listo" ? (
              <Button
                testID="onb-siguiente"
                onPress={() => void irAlPaso(paso + 1)}
                fullWidth
                style={styles.principal}
              >
                Probar mi agente
              </Button>
            ) : (
              <Button
                testID="onb-crear"
                onPress={() => void crear()}
                loading={ocupado}
                disabled={!estado.tipo && !agenteId}
                fullWidth
                style={styles.principal}
              >
                {fase === "error" ? "Reintentar" : "Crear mi agente"}
              </Button>
            )
          ) : ultimo ? (
            <Button
              testID="onb-terminar"
              onPress={() => void terminar()}
              loading={ocupado}
              disabled={!puedeProbar || !recorrido?.probado_en}
              fullWidth
              style={styles.principal}
            >
              Terminar
            </Button>
          ) : (
            <Button
              testID="onb-siguiente"
              onPress={() => void siguiente()}
              loading={ocupado}
              fullWidth
              style={styles.principal}
            >
              Siguiente
            </Button>
          )}
        </View>
        <Button
          variant="ghost"
          onPress={pedirOmitir}
          disabled={ocupado}
          testID="onb-omitir"
        >
          Lo hago después
        </Button>
      </View>

      <Sheet
        visible={verTarjeta}
        onClose={() => setVerTarjeta(false)}
        title="Tu agente, armándose"
      >
        <TarjetaDelAgente estado={estado} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

/** Paso 4: lo que el agente sabe. No duplica formularios: enlaza al módulo que lo resuelve. */
function PasoConocimiento({
  estado,
  alIr,
}: {
  estado: EstadoDelAsistente;
  alIr: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const moduloPrueba: ModuloDatosDePrueba | null =
    tipo?.contenido === "catalogo"
      ? "ventas"
      : tipo?.contenido === "servicios"
        ? "agenda"
        : tipo?.contenido === "cartera"
          ? "cobranza"
          : tipo?.id === "suscripciones"
            ? "suscripciones"
            : null;
  const [prueba, setPrueba] = useState<EstadoDatosDePruebaModulo | null>(null);
  const [generandoPrueba, setGenerandoPrueba] = useState(false);
  const destinos = {
    catalogo: {
      titulo: "Carga tu catálogo",
      texto: "Agrega los productos que tu agente puede ofrecer y cotizar.",
      accion: "Cargar productos",
      tab: "comercio",
    },
    servicios: {
      titulo: "Define tus servicios",
      texto: "Crea los tipos de cita que tus clientes pueden agendar.",
      accion: "Crear servicios",
      tab: "calendario",
    },
    cartera: {
      titulo: "Carga tu cartera",
      texto: "Agrega los clientes que tu agente va a gestionar.",
      accion: "Cargar clientes",
      tab: "cobranza",
    },
  } as const;
  const destino = tipo?.contenido ? destinos[tipo.contenido] : null;

  useEffect(() => {
    let vivo = true;
    if (!moduloPrueba) {
      return;
    }
    cargarDatosDePrueba(api, moduloPrueba)
      .then((estado) => {
        if (vivo) setPrueba(estado);
      })
      .catch(() => {
        if (vivo) setPrueba(null);
      });
    return () => {
      vivo = false;
    };
  }, [api, moduloPrueba]);

  async function generarPrueba() {
    if (!moduloPrueba || !prueba) return;
    if (prueba.falta_descripcion) {
      Alert.alert(
        "Falta la descripción de tu negocio",
        "Escríbela en Configuración › Identidad y vuelve a intentarlo.",
      );
      return;
    }
    setGenerandoPrueba(true);
    try {
      const lote = await generarDatosDePrueba(api, moduloPrueba);
      setPrueba(await cargarDatosDePrueba(api, moduloPrueba));
      Alert.alert("Datos de prueba listos", resumenDelLote(lote));
    } catch (e) {
      Alert.alert(
        "No se pudieron generar los datos",
        e instanceof AdminApiError ? e.message : "Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setGenerandoPrueba(false);
    }
  }

  return (
    <View style={styles.bloque}>
      <Text style={[shType.body, { color: c.text }]}>
        Tu agente responde con lo que tú le cargas. Nunca inventa precios, citas
        ni deudas: si algo falta, lo dice y pasa a una persona.
      </Text>
      {destino ? (
        <View
          style={[
            styles.aviso,
            { borderColor: c.border, backgroundColor: c.surface },
          ]}
        >
          <Text style={[shType.label, { color: c.text }]}>
            {destino.titulo}
          </Text>
          <Text style={[shType.body, { color: c.textMuted }]}>
            {destino.texto}
          </Text>
          <Text style={[shType.caption, { color: c.textSoft }]}>
            Puedes seguir y hacerlo después.
          </Text>
          <Button
            variant="secondary"
            iconRight="open-in-new"
            testID="onb-conocimiento-ir"
            onPress={() => {
              emitirNavegacion({ tab: destino.tab });
              alIr();
            }}
          >
            {destino.accion}
          </Button>
        </View>
      ) : (
        <Text style={[shType.body, { color: c.textMuted }]}>
          Tus clientes ya están en sus planes: tu agente los atiende con esa
          información. Puedes seguir.
        </Text>
      )}
      {prueba?.disponible && moduloPrueba ? (
        <View style={[styles.aviso, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text style={[shType.label, { color: c.text }]}>
            Datos de prueba de {MODULOS_DE_PRUEBA[moduloPrueba].titulo}
          </Text>
          <Text style={[shType.body, { color: c.textMuted }]}>
            {MODULOS_DE_PRUEBA[moduloPrueba].aviso}
          </Text>
          {prueba.lote ? (
            <Text style={[shType.caption, { color: c.textSoft }]}>
              Ya hay {conteoLegible(prueba.lote.conteos)}. Puedes reemplazarlos.
            </Text>
          ) : null}
          <Button
            variant="secondary"
            iconLeft="auto-awesome"
            testID="onb-conocimiento-prueba"
            loading={generandoPrueba}
            disabled={generandoPrueba}
            onPress={() => void generarPrueba()}
          >
            Generar datos de prueba
          </Button>
        </View>
      ) : null}
    </View>
  );
}

/** Paso 5: resumen de lo decidido y el avance de «Crear mi agente». */
function PasoCrear({
  estado,
  fase,
  subpasos,
  revision,
}: {
  estado: EstadoDelAsistente;
  fase: "inactivo" | "creando" | "dejando-listo" | "error" | "listo";
  subpasos: SubPaso[];
  revision: boolean;
}) {
  const { c, tonos } = useKit();
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const filas: [string, string][] = [
    ["Tipo", tipo?.titulo ?? "—"],
    ["Se llama", estado.nombreDelAgente.trim() || "—"],
    ["Tono", TONOS.find((t) => t.id === estado.tono)?.titulo ?? "—"],
    [
      "Atiende tu equipo",
      estado.horario
        ? resumenDeHorario(estado.horario) || "—"
        : "Sin horario definido",
    ],
    [
      "Pasa a una persona si",
      MOTIVOS_DE_ESCALAR.filter((m) => estado.motivos.includes(m.id))
        .map((m) => m.titulo)
        .join(", ") || "—",
    ],
  ];
  const claves = ["conexion", "publicar", "activar"] as const;
  const muestraAvance = fase !== "inactivo" && fase !== "error";
  return (
    <View style={styles.bloque}>
      <View style={styles.bloque}>
        {filas.map(([titulo, valor]) => (
          <View
            key={titulo}
            accessible
            accessibilityLabel={`${titulo}: ${valor}`}
          >
            <Text style={[shType.caption, { color: c.textSoft }]}>
              {titulo}
            </Text>
            <Text style={[shType.body, { color: c.text }]}>{valor}</Text>
          </View>
        ))}
      </View>
      {muestraAvance ? (
        <View
          style={styles.bloque}
          accessibilityLiveRegion="polite"
          testID="onb-avance-crear"
        >
          <Linea
            hecho={fase !== "creando"}
            activo={fase === "creando"}
            texto="Crear tu agente"
          />
          {claves.map((clave) => {
            const sub = subpasos.find((p) => p.clave === clave);
            return (
              <Linea
                key={clave}
                hecho={
                  sub
                    ? sub.estado !== "pendiente_de_revision"
                    : fase === "listo"
                }
                alerta={sub?.estado === "pendiente_de_revision"}
                activo={fase === "dejando-listo" && !sub}
                texto={`${ETIQUETAS_DE_SUBPASO[clave]}${sub?.estado === "pendiente_de_revision" ? " · pendiente de revisión" : ""}`}
              />
            );
          })}
        </View>
      ) : null}
      {revision ? (
        <Text
          style={[shType.body, { color: tonos.warning.fg }]}
          accessibilityRole="alert"
        >
          Tu agente quedó creado, pero una persona de SolversHub debe revisarlo
          antes de que puedas probarlo. Te avisamos cuando esté listo.
        </Text>
      ) : null}
      {fase === "listo" && !revision ? (
        <Text style={[shType.body, { color: c.text }]}>
          Todo listo. Sigue para probar a{" "}
          {estado.nombreDelAgente.trim() || "tu agente"}.
        </Text>
      ) : null}
    </View>
  );
}

function Linea({
  texto,
  hecho,
  activo,
  alerta,
}: {
  texto: string;
  hecho?: boolean;
  activo?: boolean;
  alerta?: boolean;
}) {
  const { c, tonos } = useKit();
  return (
    <View
      style={styles.linea}
      accessible
      accessibilityLabel={`${texto}${hecho ? ", hecho" : activo ? ", en curso" : ", pendiente"}`}
    >
      {alerta ? (
        <Icono name="warning-amber" size={20} color={tonos.warning.fg} />
      ) : hecho ? (
        <Icono name="check-circle" size={20} color={tonos.success.fg} />
      ) : activo ? (
        <ActivityIndicator size="small" />
      ) : (
        <Icono name="radio-button-unchecked" size={20} color={c.textSoft} />
      )}
      <Text style={[shType.body, { color: hecho ? c.text : c.textSoft }]}>
        {texto}
      </Text>
    </View>
  );
}

/** Paso 6: chat de prueba contra el agente publicado en la conexión de pruebas. */
function PasoProbar({
  conexionId,
  nombre,
  sugerencias,
  alRecibir,
}: {
  conexionId: string;
  nombre: string;
  sugerencias: string[];
  alRecibir: (turnos: TurnoDePrueba[]) => void;
}) {
  const api = useAdminApi();
  const { c, tonos } = useKit();
  const [turnos, setTurnos] = useState<TurnoDePrueba[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // El historial del servidor trae solo las respuestas del agente: lo escrito aquí se muestra en su turno.
  const [mios, setMios] = useState<string[]>([]);
  // Respuestas que ya había al abrir el paso: lo escrito aquí empieza después de ellas.
  const [previos, setPrevios] = useState(0);

  useEffect(() => {
    let vivo = true;
    cargarPrueba(api, conexionId)
      .then((t) => {
        if (!vivo) return;
        setPrevios(t.length);
        setTurnos(t);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [api, conexionId]);

  async function enviar(mensaje: string) {
    const limpio = mensaje.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setAviso(null);
    setTexto("");
    setMios((m) => [...m, limpio]);
    try {
      await enviarPrueba(api, conexionId, limpio);
      const t = await cargarPrueba(api, conexionId);
      setTurnos(t);
      // Solo cuenta una respuesta del agente: si pasó a una persona (falló el modelo, p. ej.) no hubo prueba.
      if (t.some((x) => !x.escalated)) alRecibir(t);
    } catch (e) {
      setAviso(
        e instanceof AdminApiError
          ? e.message
          : "No pudimos enviar tu mensaje. Inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.bloque}>
      <Text style={[shType.body, { color: c.textMuted }]}>
        Escríbele a {nombre} como lo haría un cliente. Es un chat de prueba:
        nadie más lo ve.
      </Text>
      <View style={styles.chips}>
        {sugerencias.map((s) => (
          <Chip
            key={s}
            titulo={s}
            rol="button"
            elegido={false}
            onPress={() => void enviar(s)}
            testID={`onb-prueba-${s}`}
          />
        ))}
      </View>
      <View style={styles.bloque} testID="onb-chat">
        {turnos.map((t, i) => (
          <View key={i} style={styles.bloque}>
            {i >= previos && mios[i - previos] ? (
              <View
                style={[styles.burbuja, styles.mia, { borderColor: c.link }]}
                accessible
                accessibilityLabel={`Tú: ${mios[i - previos]}`}
              >
                <Text style={[shType.body, { color: c.text }]}>{mios[i - previos]}</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.burbuja,
                { borderColor: c.border, backgroundColor: c.surface2 },
              ]}
              accessible
              accessibilityLabel={`${nombre}: ${t.text}`}
            >
              <Text style={[shType.body, { color: c.text }]}>{t.text}</Text>
            </View>
          </View>
        ))}
        {enviando ? (
          <ActivityIndicator
            accessibilityLabel={`${nombre} está escribiendo`}
          />
        ) : null}
      </View>
      {aviso ? (
        <Text
          style={[shType.body, { color: tonos.danger.fg }]}
          accessibilityRole="alert"
        >
          {aviso}
        </Text>
      ) : null}
      <TextField
        testID="onb-prueba-texto"
        accessibilityLabel="Mensaje de prueba"
        placeholder="Escribe un mensaje"
        value={texto}
        onChangeText={setTexto}
        returnKeyType="send"
        onSubmitEditing={() => void enviar(texto)}
      />
      <View style={styles.acciones}>
        <Button
          testID="onb-prueba-enviar"
          onPress={() => void enviar(texto)}
          loading={enviando}
          disabled={!texto.trim()}
        >
          Enviar
        </Button>
        <Button
          variant="ghost"
          onPress={() => {
            void reiniciarPrueba(api, conexionId)
              .then(() => {
                setTurnos([]);
                setMios([]);
                setPrevios(0);
              })
              .catch(() => undefined);
          }}
          disabled={enviando || turnos.length === 0}
        >
          Empezar de nuevo
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
  },
  centro: { alignItems: "center", justifyContent: "center" },
  cabecera: {
    gap: shSpace[2],
    paddingHorizontal: shSpace[4],
    paddingBottom: shSpace[3],
    borderBottomWidth: 1,
  },
  avance: { gap: shSpace[1] },
  barra: { height: 6, borderRadius: 3, overflow: "hidden" },
  relleno: { height: 6, borderRadius: 3 },
  contenido: { gap: shSpace[4], padding: shSpace[4] },
  bloque: { gap: shSpace[3] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  pie: {
    gap: shSpace[1],
    paddingHorizontal: shSpace[4],
    paddingTop: shSpace[2],
    borderTopWidth: 1,
  },
  acciones: { flexDirection: "row", gap: shSpace[2], alignItems: "center" },
  principal: { flex: 1 },
  final: {
    flex: 1,
    gap: shSpace[4],
    padding: shSpace[4],
    justifyContent: "center",
  },
  aviso: {
    gap: shSpace[2],
    padding: shSpace[3],
    borderWidth: 1,
    borderRadius: shRadius.md,
  },
  linea: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  mia: { alignSelf: "flex-end", maxWidth: "85%" },
  burbuja: { padding: shSpace[3], borderWidth: 1, borderRadius: shRadius.md },
});
