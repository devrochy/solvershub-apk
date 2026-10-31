import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { apiErrorStatus, esErrorDeRed } from "@core/api/client";
import { Avatar } from "../components/Avatar";
import { CampoTelefono, MapaPin } from "@shared/ui";
import { CargaError } from "../components/CargaError";
import { CampoModal } from "../components/CampoModal";
import { HeaderApp } from "../components/HeaderApp";
import { Breadcrumb } from "../components/Breadcrumb";
import { ModalConFooter } from "../components/ModalConFooter";
import {
  ETIQUETAS_TIPO_DOCUMENTO,
  TIPOS_DOCUMENTO,
  validarNumeroDocumento,
  type TipoDocumento,
} from "@shared/domain/tipo-documento";
import {
  useEvidenciasCliente,
  type CampoEvidenciaCliente,
  type FuenteEvidencia,
} from "../features/cliente/use-evidencias-cliente";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";
import { filtrarClientes, estadoCliente, type FiltroClientes } from "@shared/domain/filtro-clientes";
import { filtrarPorTexto } from "@shared/domain/busqueda-clientes";
import { enlaceWhatsApp } from "../features/estado-cuenta/estado-cuenta";
import { useSession } from "../session/session-context";
import { useCarteraActiva } from "../session/cartera-activa-context";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  ListItem,
  TextField,
  useKit,
  type IconName,
  type KitTema,
  type TonoEstado,
} from "@shared/ui";
import { bordeDeEstado, colorDeEstado } from "../components/ColorBadge";

import type { ClienteGestorPublic } from "@shared/types/gestor";

const COORD_DEFAULT = { lat: -17.78, lng: -63.18 };

export interface ClientesScreenProps {
  filtro?: FiltroClientes;
  onFiltroChange?(filtro: FiltroClientes): void;
}

const FILTROS: { key: FiltroClientes; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "al_dia", label: "Al día" },
  { key: "en_mora", label: "En mora" },
  { key: "sin_prestamos", label: "Sin préstamos" },
];

/**
 * Estado del cliente en el kit (HU-DS-10): clave de color de `ColorBadge`
 * (sólidos y pasteles) y el `Badge` de estado con ícono, para que el color
 * nunca vaya solo.
 */
const ESTADO_CLIENTE: Record<
  Exclude<FiltroClientes, "todos">,
  { color: string; etiqueta: string; tono: TonoEstado | "neutral"; icono: IconName }
> = {
  al_dia: { color: "verde", etiqueta: "Al día", tono: "success", icono: "check-circle" },
  en_mora: { color: "rojo", etiqueta: "En mora", tono: "danger", icono: "warning" },
  sin_prestamos: { color: "blanco", etiqueta: "Sin préstamos", tono: "neutral", icono: "money-off" },
};

export function ClientesScreen({
  filtro = "todos",
  onFiltroChange,
}: ClientesScreenProps = {}) {
  const { carteraActiva } = useCarteraActiva();
  const { api, logout } = useSession();
  const { abrir } = usePantallaActiva();
  const insets = useSafeAreaInsets();
  const [clientes, setClientes] = useState<ClienteGestorPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [negocio, setNegocio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [latitud, setLatitud] = useState(String(COORD_DEFAULT.lat));
  const [longitud, setLongitud] = useState(String(COORD_DEFAULT.lng));
  const [latitudDomicilio, setLatitudDomicilio] = useState("");
  const [longitudDomicilio, setLongitudDomicilio] = useState("");
  const [ubicacionCampo, setUbicacionCampo] = useState<"negocio" | "domicilio">(
    "negocio",
  );
  const [tope, setTope] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("ci");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [ubicandoGps, setUbicandoGps] = useState(false);
  const [creadoOk, setCreadoOk] = useState(false);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Modal de fuente de evidencia (galería/cámara) — compartido por foto y documentos.
  const [fuenteAbierta, setFuenteAbierta] = useState(false);
  const [fuenteCampo, setFuenteCampo] = useState<CampoEvidenciaCliente>("foto_facial");
  const evidenciasCliente = useEvidenciasCliente();
  const kit = useKit();
  const { c } = kit;
  const styles = useMemo(() => crearEstilos(kit), [kit]);
  /** Relleno del chip de filtro activo (sólido del tema claro: AA con texto blanco). */
  const rellenoFiltro = (f: FiltroClientes) =>
    f === "todos" ? kit.relleno.primario : colorDeEstado(ESTADO_CLIENTE[f].color);
  /** Borde y texto del chip inactivo (tono de estado del tema activo). */
  const tintaFiltro = (f: FiltroClientes) =>
    f === "todos" ? c.link : colorDeEstado(ESTADO_CLIENTE[f].color, kit.tema);

  const esDomicilio = ubicacionCampo === "domicilio";
  const latActual = esDomicilio ? latitudDomicilio : latitud;
  const lngActual = esDomicilio ? longitudDomicilio : longitud;
  const setLatActual = esDomicilio ? setLatitudDomicilio : setLatitud;
  const setLngActual = esDomicilio ? setLongitudDomicilio : setLongitud;

  const cargar = useCallback(async () => {
    if (!carteraActiva) {
      return;
    }
    setError(null);
    try {
      setClientes(await api.listarClientesDeCartera(carteraActiva.carteraId));
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudieron cargar los clientes.");
      }
    }
  }, [api, logout, carteraActiva]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  // Auto-cierra el modal tras mostrar el check verde de éxito (con cleanup).
  useEffect(() => {
    if (!creadoOk) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setNuevoAbierto(false);
      setCreadoOk(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [creadoOk]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  function abrirFuente(campo: CampoEvidenciaCliente) {
    setFuenteCampo(campo);
    setFuenteAbierta(true);
    setMensaje(null);
  }

  function elegirEvidencia(
    campo: CampoEvidenciaCliente,
    fuente: FuenteEvidencia,
  ) {
    setFuenteAbierta(false);
    void evidenciasCliente.agregar(campo, fuente);
  }

  async function abrirNuevoCliente() {
    setMensaje(null);
    setCreadoOk(false);
    setNombre("");
    setApellido("");
    setNegocio("");
    setTelefono("");
    setTope(
      carteraActiva && carteraActiva.config.cupoDefault > 0
        ? String(carteraActiva.config.cupoDefault)
        : "",
    );
    setDireccion("");
    setLatitudDomicilio("");
    setLongitudDomicilio("");
    setUbicacionCampo("negocio");
    evidenciasCliente.quitar("foto_facial");
    evidenciasCliente.quitar("documento_frente");
    evidenciasCliente.quitar("documento_reverso");
    setLatitud(String(COORD_DEFAULT.lat));
    setLongitud(String(COORD_DEFAULT.lng));
    setNuevoAbierto(true);
    void ubicarGpsActual();
  }

  async function ubicarGpsActual() {
    setUbicandoGps(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitud(String(pos.coords.latitude));
      setLongitud(String(pos.coords.longitude));
    } catch {
      // Sin GPS: se deja la coordenada por defecto (el gestor puede mover el pin).
    } finally {
      setUbicandoGps(false);
    }
  }

  async function buscarDireccion() {
    if (!direccion.trim()) {
      setMensaje("Escribe una dirección para buscar.");
      return;
    }
    setBuscandoDireccion(true);
    setMensaje(null);
    try {
      const resultados = await Location.geocodeAsync(direccion.trim());
      if (resultados.length === 0) {
        setMensaje("No se encontró la dirección.");
        return;
      }
      const mejor = resultados[0];
      setLatActual(String(mejor.latitude));
      setLngActual(String(mejor.longitude));
    } catch {
      setMensaje("No se pudo buscar la dirección.");
    } finally {
      setBuscandoDireccion(false);
    }
  }

  async function guardarNuevoCliente() {
    if (!carteraActiva) {
      return;
    }
    const lat = Number(latitud);
    const lng = Number(longitud);
    const digitosTelefono = telefono.replace(/\D/g, "");
    if (!nombre.trim() || !apellido.trim() || digitosTelefono.length < 7) {
      console.log("[crear-cliente] bloqueado: campos obligatorios", {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        digitosTelefono: digitosTelefono.length,
      });
      setMensaje("Nombre, apellido y un teléfono válido son obligatorios.");
      return;
    }
    if (
      latitud.trim() === "" ||
      longitud.trim() === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat === 0 ||
      lng === 0
    ) {
      console.log("[crear-cliente] bloqueado: coordenadas inválidas", { latitud, longitud });
      setMensaje("Las coordenadas no son válidas.");
      return;
    }
    const latD = Number(latitudDomicilio);
    const lngD = Number(longitudDomicilio);
    const tieneDomicilio =
      latitudDomicilio.trim() !== "" || longitudDomicilio.trim() !== "";
    if (
      tieneDomicilio &&
      (latitudDomicilio.trim() === "" ||
        longitudDomicilio.trim() === "" ||
        !Number.isFinite(latD) ||
        !Number.isFinite(lngD) ||
        latD === 0 ||
        lngD === 0)
    ) {
      setMensaje("La ubicación del domicilio no es válida.");
      return;
    }
    if (tope.trim() !== "" && (!Number.isFinite(Number(tope)) || Number(tope) < 0)) {
      console.log("[crear-cliente] bloqueado: tope inválido", { tope });
      setMensaje("El tope de deuda debe ser un número válido.");
      return;
    }
    if (!validarNumeroDocumento(tipoDocumento, numeroDocumento)) {
      console.log("[crear-cliente] bloqueado: documento inválido", {
        tipoDocumento,
        numeroDocumento,
      });
      setMensaje("El número de documento no es válido para el tipo seleccionado.");
      return;
    }
    const camposEvidencia = new Set(
      evidenciasCliente.evidencias.map((e) => e.campo),
    );
    if (
      carteraActiva.config.reconocimientoFacialActivo &&
      !camposEvidencia.has("foto_facial")
    ) {
      console.log("[crear-cliente] bloqueado: falta foto_facial");
      setMensaje("Esta cartera exige la foto del cliente (foto facial).");
      return;
    }
    if (
      carteraActiva.config.registroDocumentoCliente &&
      !camposEvidencia.has("documento_frente")
    ) {
      console.log("[crear-cliente] bloqueado: falta documento_frente");
      setMensaje("Esta cartera exige el documento (frente).");
      return;
    }
    const input = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      ...(negocio.trim() ? { negocio: negocio.trim() } : {}),
      telefonoWhatsapp: telefono.trim(),
      latitud: lat,
      longitud: lng,
      ...(tope.trim() ? { topeMaximoDeuda: Number(tope) } : {}),
      ...(tieneDomicilio
        ? { latitudDomicilio: latD, longitudDomicilio: lngD }
        : {}),
      tipoDocumento,
      numeroDocumento: numeroDocumento.trim(),
    };
    setCreando(true);
    setMensaje(null);
    try {
      console.log("[crear-cliente] enviando", {
        carteraId: carteraActiva.carteraId,
        nombre: input.nombre,
        telefonoWhatsapp: input.telefonoWhatsapp,
        lat,
        lng,
        evidencias: evidenciasCliente.evidencias.map((e) => ({
          campo: e.campo,
          tipo: e.type,
          uri: e.uri.slice(0, 60),
        })),
      });
      await api.crearCliente(carteraActiva.carteraId, input, evidenciasCliente.evidencias);
      console.log("[crear-cliente] creado OK");
      setCreadoOk(true);
      setNombre("");
      setApellido("");
      setNegocio("");
      setTelefono("");
      setTope("");
      setNumeroDocumento("");
      setLatitudDomicilio("");
      setLongitudDomicilio("");
      setUbicacionCampo("negocio");
      setDireccion("");
      evidenciasCliente.quitar("foto_facial");
      evidenciasCliente.quitar("documento_frente");
      evidenciasCliente.quitar("documento_reverso");
      await cargar();
    } catch (err) {
      console.error("[crear-cliente] error", {
        name: err instanceof Error ? err.name : typeof err,
        message: err instanceof Error ? err.message : String(err),
        status: apiErrorStatus(err),
        esErrorDeRed: esErrorDeRed(err),
      });
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (apiErrorStatus(err) === 413) {
        setMensaje("Las fotos son demasiado grandes (máx. 15MB cada una).");
      } else if (err instanceof Error && err.message && err.message.startsWith("{")) {
        try {
          const cuerpo = JSON.parse(err.message) as {
            message?: string | string[];
          };
          if (Array.isArray(cuerpo.message)) {
            setMensaje(cuerpo.message.join(", "));
          } else {
            setMensaje(cuerpo.message ?? "No se pudo crear el cliente.");
          }
        } catch {
          setMensaje("No se pudo crear el cliente.");
        }
      } else {
        setMensaje("No se pudo crear el cliente.");
      }
    } finally {
      setCreando(false);
    }
  }

  if (!carteraActiva) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.vacio}>Selecciona una cartera para ver sus clientes.</Text>
      </View>
    );
  }

  if (!clientes) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  const clientesFiltrados = filtrarPorTexto(
    filtrarClientes(clientes, filtro),
    busqueda,
  );

  const nombreCompleto = (c: ClienteGestorPublic) =>
    `${c.nombre} ${c.apellido}`.trim();

  const estadoDe = (cliente: ClienteGestorPublic) => ESTADO_CLIENTE[estadoCliente(cliente)];

  function badgeEstado(cliente: ClienteGestorPublic) {
    const { tono, icono, etiqueta } = estadoDe(cliente);
    const testID = `cliente-estado-${cliente.id}`;
    return tono === "neutral" ? (
      <Badge testID={testID} tone="neutral" icon={icono} label={etiqueta} />
    ) : (
      <Badge testID={testID} tone={tono} icon={icono} label={etiqueta} />
    );
  }

  function llamarCliente(telefono: string) {
    void Linking.openURL(`tel:${telefono}`);
  }

  function mensajearCliente(nombre: string, telefono: string) {
    void Linking.openURL(enlaceWhatsApp(telefono, `Hola ${nombre}`));
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
      <HeaderApp
        titulo={carteraActiva.carteraNombre}
        subtitulo={`${clientesFiltrados.length} clientes`}
      />

      <Breadcrumb seccion="Clientes" />

      <View style={styles.busqueda}>
        <MaterialIcons name="search" size={20} color={c.textMuted} />
        <TextInput
          testID="busqueda-clientes"
          accessibilityLabel="Buscar cliente"
          style={styles.busquedaInput}
          placeholder="Buscar cliente"
          placeholderTextColor={c.textSoft}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {busqueda ? (
          <IconButton
            testID="busqueda-limpiar"
            icon="close"
            label="Limpiar búsqueda"
            size="sm"
            onPress={() => setBusqueda("")}
          />
        ) : null}
      </View>

      <View style={styles.chipsFiltro} accessibilityRole="tablist">
        {FILTROS.map((f) => (
          <Pressable
            key={f.key}
            testID={`filtro-chip-${f.key}`}
            accessibilityRole="tab"
            accessibilityLabel={f.label}
            accessibilityState={{ selected: filtro === f.key }}
            android_ripple={{ color: filtro === f.key ? kit.ripple.relleno : kit.ripple.superficie }}
            style={[
              styles.chipFiltro,
              { borderColor: tintaFiltro(f.key) },
              filtro === f.key && {
                backgroundColor: rellenoFiltro(f.key),
                borderColor: rellenoFiltro(f.key),
              },
            ]}
            onPress={() => onFiltroChange?.(f.key)}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={
                filtro === f.key
                  ? styles.chipFiltroTextoActivo
                  : [styles.chipFiltroTexto, { color: tintaFiltro(f.key) }]
              }
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[c.link]} tintColor={c.link} />
        }
        ListEmptyComponent={
          busqueda ? (
            <EmptyState
              icon="search-off"
              title="Esta cartera no tiene clientes."
              description={`No hay clientes que coincidan con «${busqueda}».`}
              action={{ label: "Limpiar búsqueda", onPress: () => setBusqueda("") }}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title="Esta cartera no tiene clientes."
              action={{ label: "Registrar cliente", onPress: () => void abrirNuevoCliente() }}
            />
          )
        }
        ListHeaderComponent={
          error ? (
            <Text testID="aviso-refresco" style={styles.mensajeError}>
              {error}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <ListItem
            testID={`cliente-${item.id}`}
            title={nombreCompleto(item)}
            subtitle={item.negocio ?? undefined}
            meta={item.telefonoWhatsapp}
            accessibilityLabel={[nombreCompleto(item), item.negocio, estadoDe(item).etiqueta]
              .filter(Boolean)
              .join(", ")}
            accessibilityHint="Abre la ficha del cliente"
            showChevron={false}
            leading={<Avatar nombre={nombreCompleto(item)} fotoUrl={item.fotoUrl} />}
            badge={badgeEstado(item)}
            trailing={
              <View style={styles.accionesCliente}>
                <IconButton
                  testID={`cliente-llamar-${item.id}`}
                  icon="call"
                  label={`Llamar a ${nombreCompleto(item)}`}
                  tone="accent"
                  size="sm"
                  onPress={() => llamarCliente(item.telefonoWhatsapp)}
                />
                <IconButton
                  testID={`cliente-mensaje-${item.id}`}
                  icon="chat"
                  label={`Mensaje a ${nombreCompleto(item)}`}
                  tone="accent"
                  size="sm"
                  onPress={() => mensajearCliente(nombreCompleto(item), item.telefonoWhatsapp)}
                />
              </View>
            }
            style={[
              styles.tarjeta,
              {
                borderColor: bordeDeEstado(estadoDe(item).color, kit.tema),
                borderLeftColor: colorDeEstado(estadoDe(item).color, kit.tema),
              },
            ]}
            onPress={() =>
              abrir({
                tipo: "cliente",
                carteraId: item.carteraId,
                clienteId: item.id,
                nombre: nombreCompleto(item),
                latitud: item.latitud,
                longitud: item.longitud,
                latitudDomicilio: item.latitudDomicilio ?? undefined,
                longitudDomicilio: item.longitudDomicilio ?? undefined,
              })
            }
          />
        )}
      />

      <Pressable
        testID="btn-nuevo-cliente"
        accessibilityRole="button"
        accessibilityLabel="Nuevo cliente"
        style={[
          styles.fab,
          { backgroundColor: kit.relleno.primario, bottom: insets.bottom + shSpace[4], boxShadow: c.elev2 },
        ]}
        onPress={abrirNuevoCliente}
      >
        <MaterialIcons name="add" size={30} color={kit.relleno.sobrePrimario} />
      </Pressable>

      <ModalConFooter
        visible={nuevoAbierto}
        titulo="Nuevo cliente"
        onCerrar={() => setNuevoAbierto(false)}
        onCancelar={() => setNuevoAbierto(false)}
        onConfirmar={guardarNuevoCliente}
        confirmando={creando}
        confirmarTestID="cliente-guardar"
        testID="nuevo-cliente-modal"
      >
        {creadoOk ? (
          <View style={styles.exito} testID="cliente-creado-ok">
            <MaterialIcons name="check-circle" size={48} color={c.statusSuccessFg} />
            <Text style={styles.exitoTexto}>Cliente registrado correctamente</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {/* Foto + documento frente/reverso: un toque por campo abre la fuente */}
            <View style={styles.filaSuperior}>
              <View style={styles.avatarEditable}>
                <Pressable
                  testID="cliente-avatar-btn"
                  disabled={evidenciasCliente.cargando}
                  onPress={() => abrirFuente("foto_facial")}
                >
                  {(() => {
                    const foto = evidenciasCliente.evidencias.find(
                      (e) => e.campo === "foto_facial",
                    );
                    if (foto) {
                      return (
                        <Image
                          testID="cliente-avatar-preview"
                          source={{ uri: foto.uri }}
                          style={styles.avatarImagen}
                        />
                      );
                    }
                    return (
                      <Avatar nombre={nombre || apellido || "?"} fotoUrl={null} size={72} />
                    );
                  })()}
                </Pressable>
                <Text style={styles.avatarEtiqueta}>
                  {evidenciasCliente.evidencias.find((e) => e.campo === "foto_facial")
                    ? "Foto ✓"
                    : "Foto"}
                </Text>
              </View>

              <View style={styles.documentoNuevo}>
                <Text style={styles.documentoNuevoTitulo}>Documento</Text>
                <View style={styles.documentoNuevoFilas}>
                  <Button
                    testID="cliente-doc-frente"
                    variant="secondary"
                    size="sm"
                    iconLeft="badge"
                    style={styles.botonDoc}
                    disabled={evidenciasCliente.cargando}
                    onPress={() => abrirFuente("documento_frente")}
                  >
                    {evidenciasCliente.evidencias.find((e) => e.campo === "documento_frente")
                      ? "Frente ✓"
                      : "Frente"}
                  </Button>
                  <Button
                    testID="cliente-doc-reverso"
                    variant="secondary"
                    size="sm"
                    iconLeft="badge"
                    style={styles.botonDoc}
                    disabled={evidenciasCliente.cargando}
                    onPress={() => abrirFuente("documento_reverso")}
                  >
                    {evidenciasCliente.evidencias.find((e) => e.campo === "documento_reverso")
                      ? "Reverso ✓"
                      : "Reverso"}
                  </Button>
                </View>
              </View>
            </View>
            {evidenciasCliente.cargando ? (
              <ActivityIndicator color={c.link} />
            ) : null}

            <CampoModal
              testID="cliente-nombre"
              label="Nombre"
              placeholder="Nombre"
              value={nombre}
              onChangeText={setNombre}
            />
            <CampoModal
              testID="cliente-apellido"
              label="Apellido"
              placeholder="Apellido"
              value={apellido}
              onChangeText={setApellido}
            />
            <CampoModal
              testID="cliente-negocio"
              label="Negocio (opcional)"
              placeholder="Negocio"
              value={negocio}
              onChangeText={setNegocio}
            />
            <Text style={styles.label}>Teléfono WhatsApp</Text>
            <CampoTelefono
              valor={telefono}
              onChange={setTelefono}
              testID="cliente-telefono"
              placeholder="Número de WhatsApp"
            />

            <Text style={styles.label}>Tipo de documento</Text>
            <View style={styles.chips}>
              {TIPOS_DOCUMENTO.map((tipo) => (
                <Pressable
                  key={tipo}
                  testID={`cliente-doc-tipo-${tipo}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: tipoDocumento === tipo }}
                  hitSlop={4}
                  style={[styles.chip, tipoDocumento === tipo && styles.chipActivo]}
                  onPress={() => setTipoDocumento(tipo)}
                >
                  <Text
                    style={
                      tipoDocumento === tipo
                        ? styles.chipTextoActivo
                        : styles.chipTexto
                    }
                  >
                    {ETIQUETAS_TIPO_DOCUMENTO[tipo]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <CampoModal
              testID="cliente-doc-numero"
              label="Número de documento"
              placeholder="Número de documento"
              autoCapitalize="characters"
              value={numeroDocumento}
              onChangeText={setNumeroDocumento}
            />

            <Text style={styles.label}>Ubicación</Text>
            <View style={styles.chips}>
              <Pressable
                testID="cliente-ubicacion-negocio"
                accessibilityRole="radio"
                accessibilityState={{ selected: !esDomicilio }}
                hitSlop={4}
                style={[styles.chip, !esDomicilio && styles.chipActivo]}
                onPress={() => setUbicacionCampo("negocio")}
              >
                <Text
                  style={!esDomicilio ? styles.chipTextoActivo : styles.chipTexto}
                >
                  Negocio
                </Text>
              </Pressable>
              <Pressable
                testID="cliente-ubicacion-domicilio"
                accessibilityRole="radio"
                accessibilityState={{ selected: esDomicilio }}
                hitSlop={4}
                style={[styles.chip, esDomicilio && styles.chipActivo]}
                onPress={() => setUbicacionCampo("domicilio")}
              >
                <Text
                  style={esDomicilio ? styles.chipTextoActivo : styles.chipTexto}
                >
                  Domicilio (opcional)
                </Text>
              </Pressable>
            </View>
            <View style={styles.filaBusqueda}>
              <TextField
                testID="cliente-direccion"
                accessibilityLabel="Buscar por dirección"
                style={styles.inputBusqueda}
                placeholder="Buscar por dirección"
                value={direccion}
                onChangeText={setDireccion}
              />
              <Pressable
                testID="cliente-buscar"
                accessibilityRole="button"
                accessibilityLabel="Buscar dirección"
                accessibilityState={{ disabled: buscandoDireccion, busy: buscandoDireccion }}
                android_ripple={{ color: kit.ripple.relleno }}
                style={styles.botonBuscar}
                disabled={buscandoDireccion}
                onPress={() => void buscarDireccion()}
              >
                {buscandoDireccion ? (
                  <ActivityIndicator color={kit.relleno.sobrePrimario} size="small" />
                ) : (
                  <MaterialIcons name="search" size={20} color={kit.relleno.sobrePrimario} />
                )}
              </Pressable>
            </View>
            {ubicandoGps ? (
              <Text style={styles.gpsTexto}>
                <ActivityIndicator size="small" color={c.link} /> Ubicando por GPS…
              </Text>
            ) : null}
            <MapaPin
              latitud={Number(latActual) || COORD_DEFAULT.lat}
              longitud={Number(lngActual) || COORD_DEFAULT.lng}
              onChange={(lat, lng) => {
                setLatActual(String(lat));
                setLngActual(String(lng));
              }}
              testID="mapa-pin-cliente"
            />
            <View style={styles.filaCoordenadas}>
              <TextField
                testID="cliente-latitud"
                accessibilityLabel="Latitud"
                style={styles.inputCoordenada}
                placeholder="Latitud"
                keyboardType="decimal-pad"
                value={latActual}
                onChangeText={setLatActual}
              />
              <TextField
                testID="cliente-longitud"
                accessibilityLabel="Longitud"
                style={styles.inputCoordenada}
                placeholder="Longitud"
                keyboardType="decimal-pad"
                value={lngActual}
                onChangeText={setLngActual}
              />
            </View>
            <CampoModal
              testID="cliente-tope"
              label="Tope máximo de deuda (opcional)"
              placeholder="Tope de deuda"
              keyboardType="decimal-pad"
              value={tope}
              onChangeText={setTope}
            />
            {evidenciasCliente.error ? (
              <Text style={styles.mensajeError}>{evidenciasCliente.error}</Text>
            ) : null}
            {mensaje ? <Text style={styles.mensajeError}>{mensaje}</Text> : null}
          </ScrollView>
        )}
      </ModalConFooter>

      {/* Modal de fuente de evidencia: galería o cámara (una sola opción por toque) */}
      <ModalConFooter
        visible={fuenteAbierta}
        titulo={
          fuenteCampo === "foto_facial"
            ? "Foto del cliente"
            : fuenteCampo === "documento_frente"
              ? "Documento — frente"
              : "Documento — reverso"
        }
        onCerrar={() => setFuenteAbierta(false)}
        onCancelar={() => setFuenteAbierta(false)}
        testID="fuente-modal"
      >
        <Button
          testID="fuente-libreria"
          variant="secondary"
          size="lg"
          iconLeft="photo-library"
          fullWidth
          disabled={evidenciasCliente.cargando}
          onPress={() => elegirEvidencia(fuenteCampo, "libreria")}
        >
          Elegir de la galería
        </Button>
        <Button
          testID="fuente-camara"
          variant="secondary"
          size="lg"
          iconLeft="photo-camera"
          fullWidth
          disabled={evidenciasCliente.cargando}
          onPress={() => elegirEvidencia(fuenteCampo, "camara")}
        >
          Tomar foto
        </Button>
        {evidenciasCliente.cargando ? <ActivityIndicator color={c.link} /> : null}
        {evidenciasCliente.error ? (
          <Text style={styles.mensajeError}>{evidenciasCliente.error}</Text>
        ) : null}
      </ModalConFooter>
    </SafeAreaView>
  );
}

function crearEstilos({ c, relleno }: KitTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.bg },
    busqueda: {
      flexDirection: "row",
      alignItems: "center",
      gap: shSpace[2],
      minHeight: shDensity.controlLg,
      marginHorizontal: shSpace[4],
      marginTop: shSpace[3],
      paddingLeft: shSpace[3],
      borderRadius: shRadius.sm,
      borderWidth: 1,
      borderColor: c.controlBorder,
      backgroundColor: c.surface,
    },
    busquedaInput: {
      ...shType.body,
      flex: 1,
      minHeight: shDensity.controlLg,
      paddingVertical: shSpace[2],
      color: c.text,
    },
    chipsFiltro: {
      flexDirection: "row",
      gap: shSpace[2],
      paddingHorizontal: shSpace[4],
      paddingTop: shSpace[3],
    },
    chipFiltro: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: shDensity.controlLg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderRadius: shRadius.pill,
      paddingHorizontal: shSpace[1],
      overflow: "hidden",
    },
    chipFiltroTexto: { ...shType.caption, fontFamily: shType.label.fontFamily },
    chipFiltroTextoActivo: { ...shType.caption, fontFamily: shType.block.fontFamily, color: relleno.sobrePrimario },
    lista: { padding: shSpace[4], gap: 10 },
    fab: {
      position: "absolute",
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    tarjeta: {
      borderWidth: 1,
      borderLeftWidth: 4,
      borderRadius: shRadius.md,
      borderCurve: "continuous",
      overflow: "hidden",
      boxShadow: c.elev1,
    },
    accionesCliente: { flexDirection: "row", alignItems: "center" },
    form: { gap: shSpace[2], paddingBottom: shSpace[2] },
    label: { ...shType.label, color: c.textMuted, marginTop: 2 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    // 40 dp de alto + hitSlop del Pressable = blanco táctil de 48 dp.
    chip: {
      justifyContent: "center",
      minHeight: shDensity.controlMd,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.controlBorder,
      borderRadius: shRadius.pill,
      paddingHorizontal: shSpace[3],
    },
    chipActivo: { backgroundColor: relleno.primario, borderColor: relleno.primario },
    chipTexto: { ...shType.label, color: c.link },
    chipTextoActivo: { ...shType.label, color: relleno.sobrePrimario },
    filaCoordenadas: { flexDirection: "row", gap: shSpace[2] },
    inputCoordenada: { flex: 1 },
    filaSuperior: { flexDirection: "row", gap: shSpace[3], alignItems: "flex-start" },
    avatarEditable: { alignItems: "center", gap: shSpace[1] },
    avatarImagen: { width: 72, height: 72, borderRadius: 36 },
    avatarEtiqueta: { ...shType.caption, fontFamily: shType.label.fontFamily, color: c.link },
    documentoNuevo: { flex: 1, gap: 6 },
    documentoNuevoTitulo: { ...shType.label, color: c.textMuted },
    documentoNuevoFilas: { flexDirection: "row", gap: shSpace[2] },
    botonDoc: { flex: 1, alignSelf: "stretch" },
    filaBusqueda: { flexDirection: "row", gap: shSpace[2] },
    inputBusqueda: { flex: 1 },
    botonBuscar: {
      width: shDensity.controlLg,
      minHeight: shDensity.controlLg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: relleno.primario,
      borderRadius: shRadius.sm,
      overflow: "hidden",
    },
    gpsTexto: { ...shType.caption, color: c.textMuted, flexDirection: "row", alignItems: "center", gap: 6 },
    exito: { alignItems: "center", gap: shSpace[3], paddingVertical: shSpace[6] },
    exitoTexto: { ...shType.block, color: c.statusSuccessFg },
    mensajeError: { ...shType.dense, color: c.statusDangerFg },
    vacio: { ...shType.body, color: c.textMuted, textAlign: "center", marginTop: shSpace[6] },
  });
}
