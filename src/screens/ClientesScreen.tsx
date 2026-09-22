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
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { Avatar } from "../components/Avatar";
import { CampoTelefono } from "../components/CampoTelefono";
import { CargaError } from "../components/CargaError";
import { CampoModal } from "../components/CampoModal";
import { HeaderApp } from "../components/HeaderApp";
import { Breadcrumb } from "../components/Breadcrumb";
import { MapaPin } from "../components/MapaPin";
import { ModalConFooter } from "../components/ModalConFooter";
import {
  ETIQUETAS_TIPO_DOCUMENTO,
  TIPOS_DOCUMENTO,
  validarNumeroDocumento,
  type TipoDocumento,
} from "../domain/tipo-documento";
import {
  useEvidenciasCliente,
  type CampoEvidenciaCliente,
  type FuenteEvidencia,
} from "../features/cliente/use-evidencias-cliente";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";
import { filtrarClientes, estadoCliente, type FiltroClientes } from "../domain/filtro-clientes";
import { filtrarPorTexto } from "../domain/busqueda-clientes";
import { enlaceWhatsApp } from "../features/estado-cuenta/estado-cuenta";
import { useSession } from "../session/session-context";
import { useCarteraActiva } from "../session/cartera-activa-context";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";
import type { ClienteGestorPublic } from "../types/gestor";

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

/** Color semántico de cada filtro (activo = sólido; inactivo = borde/texto). */
const COLOR_FILTRO: Record<FiltroClientes, string> = {
  todos: "#172f6c",
  al_dia: "#16a34a",
  en_mora: "#dc2626",
  sin_prestamos: "#64748b",
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
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

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

  const colorCliente = (c: ClienteGestorPublic) => COLOR_FILTRO[estadoCliente(c)];

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
        <MaterialIcons name="search" size={18} color={colores.textoSuave} />
        <TextInput
          testID="busqueda-clientes"
          style={styles.busquedaInput}
          placeholder="Buscar cliente"
          placeholderTextColor={colores.textoSuave}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {busqueda ? (
          <Pressable
            testID="busqueda-limpiar"
            accessibilityLabel="Limpiar búsqueda"
            hitSlop={8}
            onPress={() => setBusqueda("")}
          >
            <MaterialIcons name="close" size={18} color={colores.textoSuave} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipsFiltro}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.key}
            testID={`filtro-chip-${f.key}`}
            style={[
              styles.chipFiltro,
              { borderColor: COLOR_FILTRO[f.key] },
              filtro === f.key && { backgroundColor: COLOR_FILTRO[f.key] },
            ]}
            onPress={() => onFiltroChange?.(f.key)}
          >
            <Text
              numberOfLines={1}
              style={
                filtro === f.key
                  ? styles.chipFiltroTextoActivo
                  : [styles.chipFiltroTexto, { color: COLOR_FILTRO[f.key] }]
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
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} />
        }
        ListEmptyComponent={
          <Text style={styles.vacio}>Esta cartera no tiene clientes.</Text>
        }
        ListHeaderComponent={
          error ? (
            <Text testID="aviso-refresco" style={styles.mensajeError}>
              {error}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`cliente-${item.id}`}
            style={[styles.tarjeta, { borderColor: colorCliente(item) }]}
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
          >
            <View
              testID={`cliente-acento-${item.id}`}
              style={[styles.acento, { backgroundColor: colorCliente(item) }]}
            />
            <View style={styles.tarjetaContenido}>
              <Avatar nombre={nombreCompleto(item)} fotoUrl={item.fotoUrl} />
              <View style={styles.tarjetaInfo}>
                <Text style={styles.clienteNombre}>{nombreCompleto(item)}</Text>
                {item.negocio ? (
                  <Text style={styles.clienteDetalle}>{item.negocio}</Text>
                ) : null}
                <Text style={styles.clienteTelefono}>{item.telefonoWhatsapp}</Text>
              </View>
              <View style={styles.accionesCliente}>
                <Pressable
                  testID={`cliente-llamar-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Llamar a ${nombreCompleto(item)}`}
                  hitSlop={8}
                  style={styles.accionBoton}
                  onPress={() => llamarCliente(item.telefonoWhatsapp)}
                >
                  <MaterialIcons name="call" size={18} color={colores.acento} />
                </Pressable>
                <Pressable
                  testID={`cliente-mensaje-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Mensaje a ${nombreCompleto(item)}`}
                  hitSlop={8}
                  style={styles.accionBoton}
                  onPress={() =>
                    mensajearCliente(nombreCompleto(item), item.telefonoWhatsapp)
                  }
                >
                  <MaterialIcons name="chat" size={18} color={colores.acento} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        testID="btn-nuevo-cliente"
        accessibilityRole="button"
        accessibilityLabel="Nuevo cliente"
        style={[
          styles.fab,
          { backgroundColor: colores.primario, bottom: insets.bottom + 16 },
        ]}
        onPress={abrirNuevoCliente}
      >
        <MaterialIcons name="add" size={30} color="#ffffff" />
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
            <MaterialIcons name="check-circle" size={48} color="#16a34a" />
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
                  <Pressable
                    testID="cliente-doc-frente"
                    style={styles.botonDoc}
                    disabled={evidenciasCliente.cargando}
                    onPress={() => abrirFuente("documento_frente")}
                  >
                    <MaterialIcons name="badge" size={16} color={colores.acento} />
                    <Text style={styles.botonDocTexto}>
                      {evidenciasCliente.evidencias.find((e) => e.campo === "documento_frente")
                        ? "Frente ✓"
                        : "Frente"}
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="cliente-doc-reverso"
                    style={styles.botonDoc}
                    disabled={evidenciasCliente.cargando}
                    onPress={() => abrirFuente("documento_reverso")}
                  >
                    <MaterialIcons name="badge" size={16} color={colores.acento} />
                    <Text style={styles.botonDocTexto}>
                      {evidenciasCliente.evidencias.find((e) => e.campo === "documento_reverso")
                        ? "Reverso ✓"
                        : "Reverso"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
            {evidenciasCliente.cargando ? (
              <ActivityIndicator color={colores.acento} />
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
              <TextInput
                testID="cliente-direccion"
                style={[styles.input, styles.inputBusqueda]}
                placeholder="Buscar por dirección"
                value={direccion}
                onChangeText={setDireccion}
              />
              <Pressable
                testID="cliente-buscar"
                style={styles.botonBuscar}
                disabled={buscandoDireccion}
                onPress={() => void buscarDireccion()}
              >
                {buscandoDireccion ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <MaterialIcons name="search" size={18} color="#ffffff" />
                )}
              </Pressable>
            </View>
            {ubicandoGps ? (
              <Text style={styles.gpsTexto}>
                <ActivityIndicator size="small" color={colores.acento} /> Ubicando por GPS…
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
              <TextInput
                testID="cliente-latitud"
                style={[styles.input, styles.inputCoordenada]}
                placeholder="Latitud"
                keyboardType="decimal-pad"
                value={latActual}
                onChangeText={setLatActual}
              />
              <TextInput
                testID="cliente-longitud"
                style={[styles.input, styles.inputCoordenada]}
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
        <Pressable
          testID="fuente-libreria"
          style={styles.botonFuenteModal}
          disabled={evidenciasCliente.cargando}
          onPress={() => elegirEvidencia(fuenteCampo, "libreria")}
        >
          <MaterialIcons name="photo-library" size={20} color={colores.acento} />
          <Text style={styles.botonFuenteModalTexto}>Elegir de la galería</Text>
        </Pressable>
        <Pressable
          testID="fuente-camara"
          style={styles.botonFuenteModal}
          disabled={evidenciasCliente.cargando}
          onPress={() => elegirEvidencia(fuenteCampo, "camara")}
        >
          <MaterialIcons name="photo-camera" size={20} color={colores.acento} />
          <Text style={styles.botonFuenteModalTexto}>Tomar foto</Text>
        </Pressable>
        {evidenciasCliente.cargando ? <ActivityIndicator color={colores.acento} /> : null}
        {evidenciasCliente.error ? (
          <Text style={styles.mensajeError}>{evidenciasCliente.error}</Text>
        ) : null}
      </ModalConFooter>
    </SafeAreaView>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.fondo },
    busqueda: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.tarjeta,
    },
    busquedaInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 15,
      color: c.texto,
    },
    chipsFiltro: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    chipFiltro: {
      flex: 1,
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    chipFiltroTexto: { fontSize: 11, fontFamily: "Roboto_500Medium" },
    chipFiltroTextoActivo: { color: "#ffffff", fontSize: 11, fontFamily: "Roboto_600SemiBold" },
    lista: { padding: 16, gap: 10 },
    fab: {
      position: "absolute",
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 10px rgba(15, 23, 42, 0.25)",
    },
    vacio: { color: c.textoSuave, textAlign: "center", marginTop: 24 },
    tarjeta: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: c.tarjeta,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 12,
      borderCurve: "continuous",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    },
    acento: { width: 4 },
    tarjetaContenido: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
    },
    tarjetaInfo: { flex: 1 },
    accionesCliente: { flexDirection: "row", alignItems: "center", gap: 8 },
    accionBoton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.activoSuave,
    },
    clienteNombre: { fontSize: 16, fontWeight: "600", color: c.texto },
    clienteDetalle: { color: c.textoSuave, fontSize: 13, marginTop: 2 },
    clienteTelefono: { color: c.textoSuave, fontSize: 12, marginTop: 2 },
    form: { gap: 8, paddingBottom: 8 },
    label: { fontSize: 13, color: c.textoSuave, fontWeight: "600", marginTop: 2 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      backgroundColor: c.activoSuave,
      borderWidth: 1,
      borderColor: "#c7d2fe",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipActivo: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
    chipTexto: { color: c.acento, fontSize: 13 },
    chipTextoActivo: { color: "#ffffff", fontSize: 13 },
    input: {
      backgroundColor: c.tarjeta,
      borderWidth: 1,
      borderColor: "#dbeafe",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.texto,
    },
    filaCoordenadas: { flexDirection: "row", gap: 8 },
    inputCoordenada: { flex: 1 },
    filaSuperior: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    avatarEditable: { alignItems: "center", gap: 4 },
    avatarImagen: { width: 72, height: 72, borderRadius: 36 },
    avatarEtiqueta: { fontSize: 12, color: c.acento, fontWeight: "600" },
    documentoNuevo: { flex: 1, gap: 6 },
    documentoNuevoTitulo: { fontSize: 13, color: c.textoSuave, fontWeight: "600" },
    documentoNuevoFilas: { flexDirection: "row", gap: 8 },
    botonDoc: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: c.primario,
      borderRadius: 8,
      paddingVertical: 8,
    },
    botonDocTexto: { color: c.acento, fontWeight: "600", fontSize: 13 },
    botonFuenteModal: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: "#bfdbfe",
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: "#eff6ff",
    },
    botonFuenteModalTexto: { color: c.acento, fontWeight: "600", fontSize: 15 },
    filaBusqueda: { flexDirection: "row", gap: 8 },
    inputBusqueda: { flex: 1 },
    botonBuscar: {
      width: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primario,
      borderRadius: 8,
    },
    gpsTexto: { color: c.textoSuave, fontSize: 12, flexDirection: "row", alignItems: "center", gap: 6 },
    exito: { alignItems: "center", gap: 12, paddingVertical: 24 },
    exitoTexto: { color: "#16a34a", fontSize: 16, fontWeight: "700" },
    mensajeError: { color: c.peligro, fontSize: 13 },
  });
}