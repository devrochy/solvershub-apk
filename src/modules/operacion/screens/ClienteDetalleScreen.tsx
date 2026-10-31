import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import { abrirPestanaAjena } from "@shared/pestana-inicial";
import {
  Badge,
  Button,
  CampoTelefono,
  Card,
  EmptyState,
  Field,
  Icono,
  MapaCliente,
  MapaPin,
  RadioGroup,
  Sheet,
  Switch,
  TextField,
  useKit,
  useToast,
} from "@shared/ui";
import {
  CLASIFICACION_LABEL,
  etiquetaCanal,
  etiquetaTipoDocumento,
  formatearFecha,
  telefonoVisible,
} from "@shared/domain/formato-clientes";
import { paisDesdeTelefono } from "@shared/domain/paises-telefono";
import {
  agruparCamposDelPerfil,
  agruparEditablesPorPack,
  alternarAgenteDelCliente,
  corregirPerfilDelCliente,
  datosFueraDelPerfil,
  esClaveDelPerfil,
  etiquetaDelDato,
  fichaDelCliente,
  geocodificarCliente,
  geocodificarInverso,
  origenDelDato,
  textoDelDato,
  valoresInicialesDelPerfil,
  type FichaDelCliente,
  type LeadCampoPerfil,
  type LeadGeocodificacionInversa,
  type LeadPerfil,
} from "../api";
import type { OperacionStackParamList } from "../navigation";
import { AgentIcon, ChannelIcon } from "../components/iconos-clientes";
import { ConsentimientoDelCliente } from "../components/ConsentimientoDelCliente";
import { AvatarDelCliente } from "../components/AvatarDelCliente";
import { BadgeDeClasificacion, metaDeClasificacion } from "../components/ClienteCard";
import {
  campoVisible,
  placeholderDe,
  validarPerfilDelCliente,
} from "../features/cliente/validacion-perfil";
import { LeadDeVenta } from "./LeadDeVenta";
import { NotasYHistoria } from "./NotasYHistoria";

type Props = NativeStackScreenProps<OperacionStackParamList, "ClienteDetalle">;

const TIPO_DOCUMENTO_OPCIONES = [
  { value: "cc", label: "Cédula de ciudadanía" },
  { value: "ce", label: "Cédula de extranjería" },
  { value: "nit", label: "NIT" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "otro", label: "Otro" },
];

/** Campos de respaldo si el backend todavía no manda `campos_perfil`. */
const CAMPOS_BASE: LeadCampoPerfil[] = [
  { group: "identidad", key: "name", label: "Nombre", tipo: "texto", max_length: 120, options: [], required: true },
  { group: "identidad", key: "apellido", label: "Apellido", tipo: "texto", max_length: 120, options: [], required: false },
  { group: "identidad", key: "alias", label: "Alias", tipo: "texto", max_length: 120, options: [], required: false },
  { group: "contacto", key: "phone", label: "Teléfono", tipo: "telefono", max_length: 40, options: [], required: false },
  { group: "contacto", key: "email", label: "Correo", tipo: "email", max_length: 254, options: [], required: false },
  {
    group: "identidad",
    key: "tipo_documento",
    label: "Tipo de documento",
    tipo: "opciones",
    max_length: 20,
    options: TIPO_DOCUMENTO_OPCIONES,
    required: false,
  },
  { group: "identidad", key: "id_document", label: "Número de documento", tipo: "texto", max_length: 40, options: [], required: false },
  { group: "ubicacion", key: "address", label: "Dirección", tipo: "texto", max_length: 300, options: [], required: false },
  { group: "ubicacion", key: "municipio", label: "Municipio", tipo: "texto", max_length: 120, options: [], required: false },
  { group: "ubicacion", key: "departamento", label: "Departamento", tipo: "texto", max_length: 120, options: [], required: false },
  { group: "ubicacion", key: "pais", label: "País", tipo: "texto", max_length: 60, options: [], required: false },
  { group: "ubicacion", key: "latitud", label: "Latitud", tipo: "numero", max_length: 20, options: [], required: false },
  { group: "ubicacion", key: "longitud", label: "Longitud", tipo: "numero", max_length: 20, options: [], required: false },
  {
    group: "clasificacion",
    key: "clasificacion",
    label: "Clasificación",
    tipo: "opciones",
    max_length: 30,
    options: Object.entries(CLASIFICACION_LABEL).map(([value, label]) => ({ value, label })),
    required: false,
  },
];

const GRUPOS: Record<string, string> = {
  identidad: "Identidad",
  contacto: "Contacto",
  ubicacion: "Ubicación",
  clasificacion: "Clasificación",
};

const ENLACE_DEL_AGENTE: Record<string, { tab: string; pestana: string; label: string }> = {
  ventas: { tab: "comercio", pestana: "pedidos", label: "Pedidos" },
  cobranza: { tab: "cobranza", pestana: "clientes", label: "Clientes" },
  agenda: { tab: "calendario", pestana: "agenda", label: "Agenda" },
};

/**
 * Ficha del cliente (HU-CRM-02 + tanda 1A): perfil base editable, lo que cada
 * agente sabe de él, pausa del agente, geocodificación, consentimiento, notas e
 * historia. Misma API que la ficha del panel.
 */
export function ClienteDetalleScreen({ route, navigation }: Props) {
  const { c, tonos } = useKit();
  const api = useAdminApi();
  const toast = useToast();
  const { sesion } = useAdminSession();
  const { id } = route.params;
  const puedeEscribir = sesion?.role === "master" || sesion?.permissions?.leads === "write";

  const [ficha, setFicha] = useState<FichaDelCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("general");
  const [editando, setEditando] = useState(Boolean(route.params.editar));
  const [geocodificando, setGeocodificando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setFicha(await fichaDelCliente(api, id));
      setError(null);
    } catch (err) {
      // HU-CRM-20: un aviso viejo o un enlace guardado apunta a un cliente que ya no está.
      if (err instanceof AdminApiError && err.status === 404) {
        toast.error("Ese cliente ya no está");
        navigation.goBack();
        return;
      }
      setError("No pudimos cargar el cliente.");
    }
  }, [api, id, navigation, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const perfil = useMemo(() => (ficha ? perfilDe(ficha) : null), [ficha]);

  // Llegando desde un aviso el título no se conoce: se pone el nombre al cargar la ficha.
  const tituloDeLaFicha = perfil?.nombre_visible || ficha?.cliente || null;
  useEffect(() => {
    if (tituloDeLaFicha) navigation.setOptions({ title: tituloDeLaFicha });
  }, [navigation, tituloDeLaFicha]);
  const tabs = useMemo(
    () => [
      { key: "general", label: "General" },
      ...((ficha?.agentes ?? [])
        .filter((agente) => agente.key !== "general")
        .map((agente) => ({ key: agente.key, label: agente.name }))),
    ],
    [ficha?.agentes],
  );
  const agente = ficha?.agentes?.find((a) => a.key === tab) ?? null;

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.link} />
      </View>
    );
  }
  if (!ficha || !perfil) {
    return (
      <View style={[styles.centro, { backgroundColor: c.bg }]}>
        <EmptyState
          icon="person-off"
          title="No pudimos abrir el cliente"
          description={error ?? "Intenta de nuevo."}
          action={{ label: "Reintentar", onPress: () => void cargar() }}
        />
      </View>
    );
  }

  const clasificacion = metaDeClasificacion(perfil.clasificacion, perfil.clasificacion_label);
  const colorClasificacion =
    tonos[clasificacion.tone === "accent" ? "accent" : clasificacion.tone].border;
  const nombre = perfil.nombre_visible || ficha.cliente || "Cliente";
  const alias = perfil.alias && perfil.alias !== nombre ? perfil.alias : null;

  const alternar = async () => {
    if (!puedeEscribir) return;
    const antes = ficha.bot_paused;
    setFicha({ ...ficha, bot_paused: !antes });
    try {
      const pausado = await alternarAgenteDelCliente(api, id);
      setFicha((actual) => (actual ? { ...actual, bot_paused: pausado } : actual));
      setError(null);
    } catch {
      setFicha((actual) => (actual ? { ...actual, bot_paused: antes } : actual));
      setError("No se pudo cambiar el agente para este cliente.");
    }
  };

  const geocodificar = async () => {
    setGeocodificando(true);
    setMensaje(null);
    try {
      const resultado = await geocodificarCliente(api, id);
      setFicha((actual) => (actual ? { ...actual, perfil: resultado.perfil } : actual));
      setMensaje("Dirección ubicada en el mapa.");
      setError(null);
    } catch (err) {
      const detalle = err instanceof AdminApiError ? err.message : null;
      setError(detalle ?? "No se pudo ubicar la dirección. Revisa la dirección e intenta de nuevo.");
    } finally {
      setGeocodificando(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.contenedor}>
      {error ? (
        <Text testID="cliente-error" style={[styles.error, { color: c.statusDangerFg }]}>
          {error}
        </Text>
      ) : null}
      {mensaje ? (
        <Text testID="cliente-mensaje" style={[styles.error, { color: c.statusSuccessFg }]}>
          {mensaje}
        </Text>
      ) : null}

      <Card testID="cliente-cabecera" accentColor={colorClasificacion}>
        <View style={styles.hero}>
          <AvatarDelCliente
            id={ficha.id}
            nombre={nombre}
            avatarUrl={perfil.avatar_url}
            puedeEscribir={puedeEscribir}
            onCambio={setFicha}
            onQuitado={() => void cargar()}
          />
          <View style={styles.heroTexto}>
            <Text style={[styles.nombre, { color: c.text }]}>{nombre}</Text>
            {alias ? <Text style={[styles.alias, { color: c.textMuted }]}>Alias: {alias}</Text> : null}
            <BadgeDeClasificacion
              tone={clasificacion.tone}
              icon={clasificacion.icon}
              label={clasificacion.etiqueta}
              testID="cliente-clasificacion"
            />
            <View style={styles.canal}>
              <ChannelIcon canal={ficha.canal} size={24} />
              <Text style={[styles.canalTexto, { color: c.textMuted }]}>
                {etiquetaCanal(ficha.canal)} · {ficha.identificador}
              </Text>
            </View>
          </View>
        </View>

        <Switch
          testID="cliente-agente"
          label="Agente"
          description={
            ficha.bot_paused
              ? "Pausado solo para este cliente"
              : "Atiende a este cliente en todas sus conversaciones"
          }
          value={!ficha.bot_paused}
          disabled={!puedeEscribir}
          onValueChange={() => void alternar()}
        />

        <View style={styles.datosCabecera}>
          <Linea
            icon="link"
            etiqueta="Conexiones"
            valor={ficha.conexiones.map((conexion) => conexion.label).join(", ") || "—"}
          />
          <Linea icon="event" etiqueta="Cliente desde" valor={formatearFecha(ficha.alta)} />
        </View>

        {ficha.ultima_conversacion_id ? (
          <Button
            testID="cliente-abrir-conversacion"
            variant="link"
            size="sm"
            onPress={() =>
              navigation.navigate("ConversacionDetalle", {
                id: ficha.ultima_conversacion_id as string,
                titulo: nombre,
              })
            }
          >
            Abrir su última conversación
          </Button>
        ) : null}
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {tabs.map((item) => {
          const activa = tab === item.key;
          return (
            <Pressable
              key={item.key}
              testID={`cliente-tab-${item.key}`}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: activa }}
              onPress={() => {
                setTab(item.key);
                if (item.key !== "general") setEditando(false);
              }}
              style={[
                styles.tab,
                {
                  borderColor: activa ? c.link : c.controlBorder,
                  backgroundColor: activa ? c.surfaceRaised : c.surface,
                },
              ]}
            >
              {item.key !== "general" ? <AgentIcon agentKey={item.key} size={22} /> : null}
              <Text style={[styles.tabTexto, { color: activa ? c.text : c.textMuted }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === "general" ? (
        <View style={styles.seccion}>
          <View style={styles.cabeceraSeccion}>
            <Text style={[styles.tituloSeccion, { color: c.text }]}>Datos del cliente</Text>
            {!editando && puedeEscribir ? (
              <View style={styles.accionesSeccion}>
                <Button
                  testID="cliente-geocodificar"
                  variant="secondary"
                  size="sm"
                  loading={geocodificando}
                  onPress={() => void geocodificar()}
                >
                  {perfil.latitud && perfil.longitud ? "Recalcular ubicación" : "Geocodificar"}
                </Button>
                <Button testID="cliente-editar" variant="secondary" size="sm" onPress={() => setEditando(true)}>
                  Editar datos
                </Button>
              </View>
            ) : null}
          </View>

          <PerfilResumen
            perfil={perfil}
            onUbicar={() => setEditando(true)}
            puedeEditar={puedeEscribir}
          />

          {editando ? (
            <Sheet
              visible
              onClose={() => setEditando(false)}
              title="Editar cliente"
              description="Los cambios quedan como dato de una persona y el agente los usa desde ya."
              testID="cliente-editar-sheet"
            >
              <PerfilForm
                ficha={ficha}
                perfil={perfil}
                onCancelar={() => setEditando(false)}
                onListo={(siguiente) => {
                  setFicha(siguiente);
                  setEditando(false);
                  setError(null);
                }}
              />
            </Sheet>
          ) : null}

          {puedeEscribir && !(ficha.agentes && ficha.agentes.length > 0)
            ? agruparEditablesPorPack(ficha.editables).map(([pluginId, campos]) => (
                <LeadDeVenta
                  key={pluginId}
                  clienteId={ficha.id}
                  pluginId={pluginId}
                  campos={campos}
                  onGuardado={setFicha}
                />
              ))
            : null}

          {datosFueraDelPerfil(ficha.datos).length > 0 ? (
            <View style={styles.seccion}>
              <Text style={[styles.tituloSeccion, { color: c.text }]}>
                Otros datos que guardó el agente
              </Text>
              {datosFueraDelPerfil(ficha.datos).map((dato) => (
                <View
                  key={`${dato.namespace}:${dato.key}`}
                  testID={`cliente-otro-${dato.key}`}
                  style={[styles.dato, { borderColor: c.borderSoft, backgroundColor: c.surface }]}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.etiqueta, { color: c.textMuted }]}>
                      {etiquetaDelDato(dato.key)}
                    </Text>
                    <Text style={{ color: c.text }}>{textoDelDato(dato.value)}</Text>
                  </View>
                  <View style={styles.derecha}>
                    <Badge
                      size="sm"
                      tone={dato.source === "human" ? "accent" : "neutral"}
                      label={origenDelDato(dato.source)}
                    />
                    <Text style={[styles.fecha, { color: c.textMuted }]}>
                      {formatearFecha(dato.valid_from)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {ficha.canal === "whatsapp" && puedeEscribir ? (
            <ConsentimientoDelCliente leadId={ficha.id} />
          ) : null}

          <NotasYHistoria
            leadId={ficha.id}
            onAbrirConversacion={(conversacionId) =>
              navigation.navigate("ConversacionDetalle", { id: conversacionId, titulo: nombre })
            }
          />
        </View>
      ) : agente ? (
        <AgenteTab
          ficha={ficha}
          agente={agente}
          puedeEscribir={puedeEscribir}
          onGuardado={setFicha}
          onVolver={() => setTab("general")}
        />
      ) : null}
    </ScrollView>
  );
}

function AgenteTab({
  ficha,
  agente,
  puedeEscribir,
  onGuardado,
  onVolver,
}: {
  ficha: FichaDelCliente;
  agente: NonNullable<FichaDelCliente["agentes"]>[number];
  puedeEscribir: boolean;
  onGuardado: (ficha: FichaDelCliente) => void;
  onVolver: () => void;
}) {
  const { c } = useKit();
  const porPack = agruparEditablesPorPack(agente.editables);
  const enlace = ENLACE_DEL_AGENTE[agente.key];

  if (agente.columns.length === 0 && porPack.length === 0) {
    return (
      <EmptyState
        icon="smart-toy"
        title={`${agente.name} todavía no tiene datos de este cliente`}
        description="Cuando el agente atienda a este cliente en su área, sus datos aparecerán aquí."
        action={{ label: "Volver a General", onPress: onVolver }}
      />
    );
  }

  return (
    <View style={styles.seccion}>
      {enlace ? (
        <Button
          testID={`cliente-abrir-${agente.key}`}
          variant="secondary"
          size="sm"
          onPress={() => abrirPestanaAjena(enlace)}
        >
          {`Abrir en ${agente.name}`}
        </Button>
      ) : null}

      {agente.columns.length > 0 ? (
        <View style={styles.seccion}>
          <Text style={[styles.tituloSeccion, { color: c.text }]}>Datos de {agente.name}</Text>
          {agente.columns.map((columna) => (
            <View key={columna.key} style={styles.lineaVertical}>
              <Text style={[styles.etiqueta, { color: c.textMuted }]}>{columna.label}</Text>
              <Text style={{ color: c.text }}>{textoDelDato(columna.value)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {puedeEscribir
        ? porPack.map(([pluginId, campos]) => (
            <LeadDeVenta
              key={pluginId}
              clienteId={ficha.id}
              pluginId={pluginId}
              campos={campos}
              onGuardado={onGuardado}
            />
          ))
        : null}
    </View>
  );
}

function PerfilResumen({
  perfil,
  onUbicar,
  puedeEditar,
}: {
  perfil: LeadPerfil;
  onUbicar: () => void;
  puedeEditar: boolean;
}) {
  const { c } = useKit();
  const clasificacion = metaDeClasificacion(perfil.clasificacion, perfil.clasificacion_label);
  const telefono = telefonoVisible(perfil);
  const paisTelefono = paisDesdeTelefono(perfil.phone_e164 ?? perfil.phone ?? "");
  return (
    <View style={styles.resumen}>
      <Text style={[styles.grupoTitulo, { color: c.textMuted }]}>Identidad</Text>
      <View style={styles.filaPar}>
        <CampoResumen label="Nombre" valor={perfil.name} />
        <CampoResumen label="Apellido" valor={perfil.apellido} />
      </View>
      <CampoResumen label="Alias" valor={perfil.alias} />
      <View style={styles.filaPar}>
        <CampoResumen
          label="Tipo de documento"
          valor={perfil.tipo_documento ? etiquetaTipoDocumento(perfil.tipo_documento) : null}
        />
        <CampoResumen label="Número de documento" valor={perfil.id_document} />
      </View>

      <Text style={[styles.grupoTitulo, { color: c.textMuted }]}>Contacto</Text>
      <View style={styles.filaPar}>
        <CampoResumen
          label="Teléfono"
          valor={telefono === "—" ? null : `${paisTelefono?.bandera ?? ""} ${telefono}`.trim()}
        />
        <CampoResumen label="Correo" valor={perfil.email} />
      </View>

      <Text style={[styles.grupoTitulo, { color: c.textMuted }]}>Ubicación</Text>
      <CampoResumen label="Dirección" valor={perfil.address} />
      <View style={styles.filaPar}>
        <CampoResumen label="Municipio" valor={perfil.municipio} />
        <CampoResumen label="Departamento" valor={perfil.departamento} />
      </View>
      <View style={styles.filaPar}>
        <CampoResumen label="País" valor={perfil.pais} />
        {perfil.direccion_normalizada ? (
          <CampoResumen label="Dirección normalizada" valor={perfil.direccion_normalizada} />
        ) : (
          <View style={styles.campoResumen} />
        )}
      </View>
      <MapaDeLaFicha perfil={perfil} onUbicar={onUbicar} puedeEditar={puedeEditar} />

      <Text style={[styles.grupoTitulo, { color: c.textMuted }]}>Clasificación</Text>
      <BadgeDeClasificacion
        tone={clasificacion.tone}
        icon={clasificacion.icon}
        label={clasificacion.etiqueta}
        testID="cliente-clasificacion-resumen"
      />
    </View>
  );
}

function CampoResumen({ label, valor }: { label: string; valor: string | null | undefined }) {
  const { c } = useKit();
  const texto = valor?.trim() ? valor : "Sin dato";
  return (
    <View style={styles.campoResumen}>
      <Text style={[styles.etiqueta, { color: c.textMuted }]}>{label}</Text>
      <Text style={{ color: valor?.trim() ? c.text : c.textSoft }}>{texto}</Text>
    </View>
  );
}

function MapaDeLaFicha({
  perfil,
  onUbicar,
  puedeEditar,
}: {
  perfil: LeadPerfil;
  onUbicar: () => void;
  puedeEditar: boolean;
}) {
  const { c } = useKit();
  const tieneCoordenadas =
    typeof perfil.latitud === "number" && typeof perfil.longitud === "number";
  return (
    <View style={styles.mapaSeccion}>
      <View style={styles.cabeceraSeccion}>
        <Text style={[styles.tituloSeccion, { color: c.text }]}>Ubicación en el mapa</Text>
        {perfil.mapa_url ? (
          <Pressable
            testID="cliente-mapa"
            accessibilityRole="link"
            accessibilityLabel={`Abrir el mapa de ${perfil.nombre_visible}`}
            onPress={() => void Linking.openURL(perfil.mapa_url as string).catch(() => undefined)}
          >
            <Text style={{ color: c.link }}>Abrir en Maps</Text>
          </Pressable>
        ) : null}
      </View>
      {tieneCoordenadas ? (
        <MapaCliente
          latitud={perfil.latitud as number}
          longitud={perfil.longitud as number}
          nombre={perfil.nombre_visible}
          alto={200}
        />
      ) : (
        <View style={[styles.mapaVacio, { borderColor: c.borderSoft, backgroundColor: c.surface2 }]}>
          <Icono name="place" size={24} color={c.textMuted} />
          <Text style={{ color: c.textMuted }}>Todavía no hay una ubicación en el mapa.</Text>
          {puedeEditar ? (
            <Button size="sm" variant="secondary" onPress={onUbicar}>
              Ubicar en el mapa
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}

function PerfilForm({
  ficha,
  perfil,
  onCancelar,
  onListo,
}: {
  ficha: FichaDelCliente;
  perfil: LeadPerfil;
  onCancelar: () => void;
  onListo: (ficha: FichaDelCliente) => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const campos = ficha.campos_perfil?.length ? ficha.campos_perfil : CAMPOS_BASE;
  const visibles = useMemo(() => campos.filter(campoVisible), [campos]);
  const grupos = useMemo(() => agruparCamposDelPerfil(visibles), [visibles]);
  const inicial = useMemo(() => valoresInicialesDelPerfil(perfil), [perfil]);
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [enviado, setEnviado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [otraClave, setOtraClave] = useState("");
  const [otroValor, setOtroValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<LeadGeocodificacionInversa | null>(null);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [errorMapa, setErrorMapa] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const errores = useMemo(() => validarPerfilDelCliente(campos, valores), [campos, valores]);
  const errorDe = (clave: string) =>
    erroresServidor[clave] ?? ((enviado || tocados[clave]) ? errores[clave] : undefined);

  const cambiar = (clave: string, valor: string) => {
    setValores((previos) => ({ ...previos, [clave]: valor }));
    setErroresServidor((previos) => {
      if (!(clave in previos)) return previos;
      const resto = { ...previos };
      delete resto[clave];
      return resto;
    });
  };

  const marcarTocado = (clave: string) => {
    setTocados((previos) => ({ ...previos, [clave]: true }));
  };

  const valoresCoordenadas = () => {
    const latitud = valores.latitud?.trim() ?? "";
    const longitud = valores.longitud?.trim() ?? "";
    const lat = Number(latitud);
    const lng = Number(longitud);
    return latitud && longitud && Number.isFinite(lat) && Number.isFinite(lng)
      ? { latitud: lat, longitud: lng }
      : null;
  };

  const buscarDireccion = async (latitud: number, longitud: number) => {
    setBuscandoDireccion(true);
    setErrorMapa(null);
    try {
      setPropuesta(await geocodificarInverso(api, ficha.id, latitud, longitud));
    } catch {
      setPropuesta(null);
      setErrorMapa("No pudimos leer la dirección en ese punto. Puedes guardar las coordenadas igual.");
    } finally {
      setBuscandoDireccion(false);
    }
  };

  const moverPin = (latitud: number, longitud: number) => {
    setValores((previos) => ({
      ...previos,
      latitud: String(latitud),
      longitud: String(longitud),
    }));
    marcarTocado("latitud");
    marcarTocado("longitud");
    setErrorMapa(null);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void buscarDireccion(latitud, longitud), 600);
  };

  const usarPropuesta = () => {
    if (!propuesta) return;
    setValores((previos) => ({
      ...previos,
      ...(propuesta.direccion ? { address: propuesta.direccion } : {}),
      ...(propuesta.municipio ? { municipio: propuesta.municipio } : {}),
      ...(propuesta.departamento ? { departamento: propuesta.departamento } : {}),
      ...(propuesta.pais ? { pais: propuesta.pais } : {}),
    }));
    setPropuesta(null);
    setErrorMapa(null);
  };

  const quitarUbicacion = () => {
    setValores((previos) => ({ ...previos, latitud: "", longitud: "" }));
    setPropuesta(null);
    setErrorMapa(null);
  };

  const guardar = async () => {
    const erroresActuales = validarPerfilDelCliente(campos, valores);
    if (Object.keys(erroresActuales).length > 0) {
      setEnviado(true);
      setError("Revisa los campos marcados antes de guardar.");
      return;
    }
    const cambios = Object.fromEntries(
      Object.entries(valores).filter(([clave, valor]) => valor.trim() !== (inicial[clave] ?? "").trim()),
    );
    const clave = normalizarClave(otraClave);
    if (otraClave.trim() && !clave) {
      setErroresServidor({ otro: "Escribe un nombre para el dato." });
      return;
    }
    if (clave && (campos.some((campo) => campo.key === clave) || esClaveDelPerfil(clave))) {
      setErroresServidor({ otro: "Ese dato ya se edita en los campos de arriba." });
      return;
    }
    const otros = clave && otroValor.trim() ? { [clave]: otroValor.trim() } : {};
    if (Object.keys(cambios).length === 0 && Object.keys(otros).length === 0) {
      onCancelar();
      return;
    }
    setGuardando(true);
    setErroresServidor({});
    setError(null);
    const tocaDireccion = ["address", "municipio", "departamento"].some((k) => k in cambios);
    const tocaCoordenadas = "latitud" in cambios || "longitud" in cambios;
    try {
      const siguiente = await corregirPerfilDelCliente(api, ficha.id, cambios, otros);
      if (tocaDireccion && !tocaCoordenadas) {
        await geocodificarCliente(api, ficha.id)
          .then((resultado) => {
            siguiente.perfil = resultado.perfil;
          })
          .catch(() => undefined);
      }
      onListo(siguiente);
    } catch (err) {
      if (err instanceof AdminApiError) {
        if (err.fields) setErroresServidor(err.fields);
        setError(err.message);
      } else {
        setError("No se pudieron guardar los datos.");
      }
    } finally {
      setGuardando(false);
    }
  };

  const coordenadas = valoresCoordenadas();
  const centro = coordenadas ?? { latitud: 4.65, longitud: -74.1 };

  return (
    <View style={styles.formulario}>
      {grupos.map(({ grupo, campos: camposDelGrupo }) => (
        <View key={grupo} style={[styles.grupo, { borderColor: c.borderSoft }]}>
          <Text style={[styles.grupoTitulo, { color: c.textMuted }]}>{GRUPOS[grupo] ?? grupo}</Text>
          {camposDelGrupo.map((campo) => (
            <Field
              key={campo.key}
              label={campo.label}
              required={campo.required}
              hint={campo.help ?? undefined}
              error={errorDe(campo.key)}
            >
              {campo.key === "phone" ? (
                <CampoTelefono
                  testID="perfil-phone"
                  valor={valores.phone ?? ""}
                  placeholder={placeholderDe(campo)}
                  onChange={(valor) => {
                    cambiar("phone", valor);
                    marcarTocado("phone");
                  }}
                />
              ) : campo.tipo === "opciones" && campo.options.length > 0 ? (
                <RadioGroup
                  testID={`perfil-${campo.key}`}
                  label={campo.label}
                  options={campo.options.map((opcion) => ({ value: opcion.value, label: opcion.label }))}
                  value={valores[campo.key] ?? ""}
                  onValueChange={(valor) => {
                    cambiar(campo.key, valor);
                    marcarTocado(campo.key);
                  }}
                />
              ) : (
                <TextField
                  testID={`perfil-${campo.key}`}
                  value={valores[campo.key] ?? ""}
                  placeholder={placeholderDe(campo)}
                  onChangeText={(texto) => cambiar(campo.key, texto)}
                  onBlur={() => marcarTocado(campo.key)}
                  maxLength={campo.max_length}
                  keyboardType={tecladoDe(campo.tipo)}
                  autoCapitalize={campo.tipo === "email" || campo.tipo === "url" ? "none" : "sentences"}
                />
              )}
            </Field>
          ))}
          {grupo === "ubicacion" ? (
            <View style={styles.mapaEdicion}>
              <Text style={[styles.etiqueta, { color: c.textMuted }]}>
                Arrastra el pin o toca el mapa para ubicar al cliente
              </Text>
              <MapaPin
                testID="cliente-mapa-pin"
                latitud={centro.latitud}
                longitud={centro.longitud}
                onChange={moverPin}
                alto={200}
              />
              {buscandoDireccion ? (
                <Text style={{ color: c.textMuted }}>Buscando la dirección del punto…</Text>
              ) : null}
              {errorMapa ? (
                <Text style={{ color: c.statusDangerFg }} accessibilityLiveRegion="polite">
                  {errorMapa}
                </Text>
              ) : null}
              {propuesta ? (
                <View style={[styles.propuesta, { borderColor: c.borderSoft, backgroundColor: c.surface2 }]}>
                  <Text style={[styles.grupoTitulo, { color: c.text }]}>Dirección propuesta</Text>
                  <Text style={{ color: c.text }}>{propuesta.direccion ?? "Sin dirección exacta"}</Text>
                  <Text style={{ color: c.textMuted }}>
                    {[propuesta.municipio, propuesta.departamento, propuesta.pais].filter(Boolean).join(", ") ||
                      "Sin más datos"}
                  </Text>
                  <View style={styles.accionesMapa}>
                    <Button size="sm" onPress={usarPropuesta}>
                      Usar estos datos
                    </Button>
                    <Button size="sm" variant="secondary" onPress={() => setPropuesta(null)}>
                      Descartar
                    </Button>
                  </View>
                </View>
              ) : null}
              {coordenadas ? (
                <Button size="sm" variant="ghost" testID="cliente-quitar-ubicacion" onPress={quitarUbicacion}>
                  Quitar ubicación
                </Button>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}

      <View style={[styles.grupo, { borderColor: c.borderSoft }]}>
        <Text style={[styles.grupoTitulo, { color: c.textMuted }]}>Agregar otro dato</Text>
        <Field label="Dato" hint="Por ejemplo: Empresa, Preferencia de entrega" error={erroresServidor.otro}>
          <TextField
            testID="perfil-otro-clave"
            value={otraClave}
            onChangeText={setOtraClave}
            maxLength={80}
            placeholder="Ej. Empresa"
          />
        </Field>
        <Field label="Valor">
          <TextField
            testID="perfil-otro-valor"
            value={otroValor}
            onChangeText={setOtroValor}
            maxLength={500}
            placeholder="Ej. Distribuidora El Sol"
          />
        </Field>
      </View>

      {error ? (
        <Text testID="perfil-error" style={[styles.error, { color: c.statusDangerFg }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.accionesFormulario}>
        <Button variant="secondary" onPress={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button testID="perfil-guardar" loading={guardando} onPress={() => void guardar()}>
          Guardar
        </Button>
      </View>
    </View>
  );
}

function Linea({ icon, etiqueta, valor }: { icon: Parameters<typeof Icono>[0]["name"]; etiqueta: string; valor: string }) {
  const { c } = useKit();
  return (
    <View style={styles.linea}>
      <Icono name={icon} size={16} color={c.textMuted} />
      <Text style={[styles.etiqueta, { color: c.textMuted, width: 108 }]}>{etiqueta}</Text>
      <Text style={[styles.valor, { color: c.text }]}>{valor}</Text>
    </View>
  );
}

function perfilDe(ficha: FichaDelCliente): LeadPerfil {
  if (ficha.perfil) return ficha.perfil;
  const hechos = new Map(
    ficha.datos
      .filter((dato) => dato.namespace === "perfil")
      .map((dato) => [dato.key, dato.value] as const),
  );
  const texto = (clave: string) => {
    const valor = hechos.get(clave);
    return valor === null || valor === undefined ? null : String(valor);
  };
  const numero = (clave: string) => {
    const crudo = texto(clave);
    if (!crudo) return null;
    const valor = Number(crudo);
    return Number.isFinite(valor) ? valor : null;
  };
  return {
    nombre_visible: ficha.cliente,
    name: ficha.nombre ?? texto("name"),
    phone: ficha.telefono ?? texto("phone"),
    email: texto("email"),
    alias: texto("alias"),
    avatar_url: texto("avatar_url") ?? texto("foto"),
    address: texto("address") ?? texto("direccion"),
    municipio: texto("municipio"),
    departamento: texto("departamento"),
    pais: texto("pais"),
    tipo_documento: texto("tipo_documento"),
    id_document: texto("id_document") ?? texto("documento"),
    latitud: numero("latitud"),
    longitud: numero("longitud"),
    clasificacion: texto("clasificacion") ?? (typeof ficha.extras.clasificacion === "string" ? ficha.extras.clasificacion : null),
  };
}

function tecladoDe(tipo: LeadCampoPerfil["tipo"]): "default" | "email-address" | "phone-pad" | "number-pad" | "url" {
  if (tipo === "email") return "email-address";
  if (tipo === "telefono") return "phone-pad";
  if (tipo === "numero") return "number-pad";
  if (tipo === "url") return "url";
  return "default";
}

function normalizarClave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenedor: { padding: 16, gap: 12, paddingBottom: 40 },
  error: { fontSize: 13 },
  hero: { alignItems: "center", gap: 12, paddingVertical: 8 },
  heroTexto: { alignItems: "center", gap: 4 },
  nombre: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  alias: { fontSize: 12, lineHeight: 16 },
  canal: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  canalTexto: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  datosCabecera: { gap: 2, marginTop: 4 },
  linea: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 28 },
  etiqueta: { fontSize: 13, lineHeight: 18 },
  valor: { flex: 1, fontSize: 14, lineHeight: 20 },
  enlace: { paddingVertical: 6 },
  tabs: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
  },
  tabTexto: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  seccion: { gap: 8 },
  cabeceraSeccion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  tituloSeccion: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  accionesSeccion: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  resumen: { gap: 10 },
  filaPar: { flexDirection: "row", gap: 16 },
  campoResumen: { flex: 1, gap: 2, minWidth: 0 },
  formulario: { gap: 12 },
  ayuda: { fontSize: 13, lineHeight: 18 },
  grupo: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  grupoTitulo: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  accionesFormulario: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  mapaSeccion: { gap: 8, marginTop: 4 },
  mapaVacio: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: "center", gap: 8 },
  mapaEdicion: { gap: 8, marginTop: 4 },
  propuesta: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  accionesMapa: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  dato: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  flex: { flex: 1 },
  derecha: { alignItems: "flex-end", gap: 2 },
  fecha: { fontSize: 11, lineHeight: 14 },
  lineaVertical: { gap: 2, paddingVertical: 4 },
});
