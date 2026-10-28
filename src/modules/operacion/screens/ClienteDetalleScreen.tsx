import { useCallback, useEffect, useMemo, useState } from "react";
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
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Icono,
  RadioGroup,
  Switch,
  TextField,
  useKit,
} from "@shared/ui";
import {
  CLASIFICACION_LABEL,
  etiquetaCanal,
  formatearFecha,
  telefonoVisible,
  ubicacionVisible,
} from "@shared/domain/formato-clientes";
import {
  agruparCamposDelPerfil,
  agruparEditablesPorPack,
  alternarAgenteDelCliente,
  corregirPerfilDelCliente,
  datosFueraDelPerfil,
  documentoVisible,
  esClaveDelPerfil,
  etiquetaDelDato,
  fichaDelCliente,
  geocodificarCliente,
  origenDelDato,
  textoDelDato,
  valoresInicialesDelPerfil,
  type FichaDelCliente,
  type LeadCampoPerfil,
  type LeadPerfil,
} from "../api";
import type { OperacionStackParamList } from "../navigation";
import { AgentIcon, ChannelIcon } from "../components/iconos-clientes";
import { ConsentimientoDelCliente } from "../components/ConsentimientoDelCliente";
import { BadgeDeClasificacion, metaDeClasificacion } from "../components/ClienteCard";
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
  { group: "contacto", key: "phone", label: "Teléfono", tipo: "telefono", max_length: 30, options: [], required: false },
  { group: "contacto", key: "email", label: "Correo", tipo: "email", max_length: 120, options: [], required: false },
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
  { group: "ubicacion", key: "address", label: "Dirección", tipo: "texto", max_length: 200, options: [], required: false },
  { group: "ubicacion", key: "municipio", label: "Municipio", tipo: "texto", max_length: 80, options: [], required: false },
  { group: "ubicacion", key: "departamento", label: "Departamento", tipo: "texto", max_length: 80, options: [], required: false },
  { group: "ubicacion", key: "pais", label: "País", tipo: "texto", max_length: 80, options: [], required: false },
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
    } catch {
      setError("No pudimos cargar el cliente.");
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const perfil = useMemo(() => (ficha ? perfilDe(ficha) : null), [ficha]);
  const tabs = useMemo(
    () => [
      { key: "general", label: "General" },
      ...((ficha?.agentes ?? []).map((agente) => ({ key: agente.key, label: agente.name }))),
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
  const telefono = telefonoVisible(perfil);

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
        <View style={styles.cabecera}>
          <Avatar name={nombre} src={perfil.avatar_url} size="lg" />
          <View style={styles.cabeceraTexto}>
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
          <Linea icon="call" etiqueta="Teléfono" valor={telefono} />
          <Linea
            icon="link"
            etiqueta="Conexiones"
            valor={ficha.conexiones.map((conexion) => conexion.label).join(", ") || "—"}
          />
          <Linea icon="event" etiqueta="Cliente desde" valor={formatearFecha(ficha.alta)} />
          <Linea icon="place" etiqueta="Ubicación" valor={ubicacionVisible(perfil)} />
          {perfil.mapa_url ? (
            <Pressable
              testID="cliente-mapa"
              accessibilityRole="link"
              accessibilityLabel={`Abrir el mapa de ${nombre}`}
              onPress={() => void Linking.openURL(perfil.mapa_url as string).catch(() => undefined)}
              style={styles.enlace}
            >
              <Text style={{ color: c.link, fontFamily: "Inter_500Medium" }}>Ver en el mapa</Text>
            </Pressable>
          ) : null}
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

          {editando ? (
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
          ) : (
            <PerfilResumen perfil={perfil} />
          )}

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

function PerfilResumen({ perfil }: { perfil: LeadPerfil }) {
  const { c } = useKit();
  const clasificacion = metaDeClasificacion(perfil.clasificacion, perfil.clasificacion_label);
  return (
    <View style={styles.resumen}>
      <Linea icon="person" etiqueta="Nombre" valor={perfil.name ?? "—"} />
      <Linea icon="person-outline" etiqueta="Apellido" valor={perfil.apellido ?? "—"} />
      <Linea icon="label" etiqueta="Alias" valor={perfil.alias ?? "—"} />
      <Linea icon="call" etiqueta="Teléfono" valor={telefonoVisible(perfil)} />
      <Linea icon="mail" etiqueta="Correo" valor={perfil.email ?? "—"} />
      <Linea icon="badge" etiqueta="Documento" valor={documentoVisible(perfil)} />
      <Linea icon="home" etiqueta="Dirección" valor={perfil.address ?? "—"} />
      {perfil.direccion_normalizada ? (
        <Linea icon="check" etiqueta="Dirección normalizada" valor={perfil.direccion_normalizada} />
      ) : null}
      <Linea icon="place" etiqueta="Ubicación" valor={ubicacionVisible(perfil)} />
      <Linea icon="public" etiqueta="País" valor={perfil.pais ?? "—"} />
      {perfil.geocodificacion_precision ? (
        <Linea
          icon="my-location"
          etiqueta="Geocodificación"
          valor={`${perfil.geocodificacion_precision}${perfil.geocodificado_en ? ` · ${formatearFecha(perfil.geocodificado_en)}` : ""}`}
        />
      ) : null}
      <View style={styles.linea}>
        <Text style={[styles.etiqueta, { color: c.textMuted, width: 116 }]}>Clasificación</Text>
        <BadgeDeClasificacion
          tone={clasificacion.tone}
          icon={clasificacion.icon}
          label={clasificacion.etiqueta}
          testID="cliente-clasificacion-resumen"
        />
      </View>
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
  const grupos = agruparCamposDelPerfil(campos);
  const inicial = useMemo(() => valoresInicialesDelPerfil(perfil), [perfil]);
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [otraClave, setOtraClave] = useState("");
  const [otroValor, setOtroValor] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const cambios = Object.fromEntries(
      Object.entries(valores).filter(([clave, valor]) => valor.trim() !== (inicial[clave] ?? "").trim()),
    );
    const clave = normalizarClave(otraClave);
    if (otraClave.trim() && !clave) {
      setErrores({ otro: "Escribe un nombre para el dato." });
      return;
    }
    if (clave && (campos.some((campo) => campo.key === clave) || esClaveDelPerfil(clave))) {
      setErrores({ otro: "Ese dato ya se edita en los campos de arriba." });
      return;
    }
    const otros = clave && otroValor.trim() ? { [clave]: otroValor.trim() } : {};
    if (Object.keys(cambios).length === 0 && Object.keys(otros).length === 0) {
      onCancelar();
      return;
    }
    setGuardando(true);
    setErrores({});
    setError(null);
    const tocaDireccion = ["address", "municipio", "departamento"].some((k) => k in cambios);
    try {
      const siguiente = await corregirPerfilDelCliente(api, ficha.id, cambios, otros);
      if (tocaDireccion) {
        await geocodificarCliente(api, ficha.id)
          .then((resultado) => {
            siguiente.perfil = resultado.perfil;
          })
          .catch(() => undefined);
      }
      onListo(siguiente);
    } catch (err) {
      if (err instanceof AdminApiError) {
        if (err.fields) setErrores(err.fields);
        setError(err.message);
      } else {
        setError("No se pudieron guardar los datos.");
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.formulario}>
      <Text style={[styles.ayuda, { color: c.textMuted }]}>
        Lo que corrijas queda como dato de una persona y el agente lo usa en la siguiente conversación.
      </Text>

      {grupos.map(({ grupo, campos: camposDelGrupo }) => (
        <View key={grupo} style={[styles.grupo, { borderColor: c.borderSoft }]}>
          <Text style={[styles.grupoTitulo, { color: c.textMuted }]}>{GRUPOS[grupo] ?? grupo}</Text>
          {camposDelGrupo.map((campo) => (
            <Field
              key={campo.key}
              label={campo.label}
              required={campo.required}
              hint={campo.help ?? undefined}
              error={errores[campo.key]}
            >
              {campo.tipo === "opciones" && campo.options.length > 0 ? (
                <RadioGroup
                  testID={`perfil-${campo.key}`}
                  label={campo.label}
                  options={campo.options.map((opcion) => ({ value: opcion.value, label: opcion.label }))}
                  value={valores[campo.key] ?? ""}
                  onValueChange={(valor) => setValores((previos) => ({ ...previos, [campo.key]: valor }))}
                />
              ) : (
                <TextField
                  testID={`perfil-${campo.key}`}
                  value={valores[campo.key] ?? ""}
                  onChangeText={(texto) => setValores((previos) => ({ ...previos, [campo.key]: texto }))}
                  maxLength={campo.max_length}
                  keyboardType={tecladoDe(campo.tipo)}
                  autoCapitalize={campo.tipo === "email" || campo.tipo === "url" ? "none" : "sentences"}
                />
              )}
            </Field>
          ))}
        </View>
      ))}

      <View style={[styles.grupo, { borderColor: c.borderSoft }]}>
        <Text style={[styles.grupoTitulo, { color: c.textMuted }]}>Agregar otro dato</Text>
        <Field label="Dato" hint="Por ejemplo: Empresa, Preferencia de entrega" error={errores.otro}>
          <TextField
            testID="perfil-otro-clave"
            value={otraClave}
            onChangeText={setOtraClave}
            maxLength={80}
          />
        </Field>
        <Field label="Valor">
          <TextField
            testID="perfil-otro-valor"
            value={otroValor}
            onChangeText={setOtroValor}
            maxLength={500}
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
        <Button
          testID="perfil-guardar"
          loading={guardando}
          onPress={() => void guardar()}
        >
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
  return {
    nombre_visible: ficha.cliente,
    name: ficha.nombre ?? texto("name"),
    phone: ficha.telefono ?? texto("phone"),
    email: texto("email"),
    alias: texto("alias"),
    address: texto("address") ?? texto("direccion"),
    municipio: texto("municipio"),
    departamento: texto("departamento"),
    pais: texto("pais"),
    tipo_documento: texto("tipo_documento"),
    id_document: texto("id_document") ?? texto("documento"),
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
  cabecera: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cabeceraTexto: { flex: 1, gap: 4, alignItems: "flex-start" },
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
  resumen: { gap: 2 },
  formulario: { gap: 12 },
  ayuda: { fontSize: 13, lineHeight: 18 },
  grupo: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  grupoTitulo: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  accionesFormulario: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  dato: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  flex: { flex: 1 },
  derecha: { alignItems: "flex-end", gap: 2 },
  fecha: { fontSize: 11, lineHeight: 14 },
  lineaVertical: { gap: 2, paddingVertical: 4 },
});
