import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { apiErrorStatus } from "../api/client";
import { Avatar } from "../components/Avatar";
import { CampoTelefono } from "../components/CampoTelefono";
import { CargaError } from "../components/CargaError";
import { ColorBadge } from "../components/ColorBadge";
import { MapaPin } from "../components/MapaPin";
import { ModalConFooter } from "../components/ModalConFooter";
import {
  useEvidenciasCliente,
  type CampoEvidenciaCliente,
  type FuenteEvidencia,
} from "../features/cliente/use-evidencias-cliente";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type { ClienteCobradorPublic } from "../types/cobrador";

const COORD_DEFAULT = { lat: -17.78, lng: -63.18 };

export function ClientesScreen() {
  const { rutaActiva } = useRutaActiva();
  const { api, logout } = useSession();
  const { abrir } = usePantallaActiva();
  const [clientes, setClientes] = useState<ClienteCobradorPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [negocio, setNegocio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [latitud, setLatitud] = useState(String(COORD_DEFAULT.lat));
  const [longitud, setLongitud] = useState(String(COORD_DEFAULT.lng));
  const [tope, setTope] = useState("");
  const [direccion, setDireccion] = useState("");
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [ubicandoGps, setUbicandoGps] = useState(false);
  const [creadoOk, setCreadoOk] = useState(false);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const evidenciasCliente = useEvidenciasCliente();

  const cargar = useCallback(async () => {
    if (!rutaActiva) {
      return;
    }
    setError(null);
    try {
      setClientes(await api.listarClientesDeRuta(rutaActiva.rutaId));
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudieron cargar los clientes.");
      }
    }
  }, [api, logout, rutaActiva]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  function elegirEvidencia(
    campo: CampoEvidenciaCliente,
    fuente: FuenteEvidencia,
  ) {
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
      rutaActiva && rutaActiva.config.cupoDefault > 0
        ? String(rutaActiva.config.cupoDefault)
        : "",
    );
    setDireccion("");
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
      // Sin GPS: se deja la coordenada por defecto (el cobrador puede mover el pin).
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
      setLatitud(String(mejor.latitude));
      setLongitud(String(mejor.longitude));
    } catch {
      setMensaje("No se pudo buscar la dirección.");
    } finally {
      setBuscandoDireccion(false);
    }
  }

  async function guardarNuevoCliente() {
    if (!rutaActiva) {
      return;
    }
    const lat = Number(latitud);
    const lng = Number(longitud);
    if (!nombre.trim() || !apellido.trim() || !telefono.trim()) {
      setMensaje("Nombre, apellido y teléfono son obligatorios.");
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
      setMensaje("Las coordenadas no son válidas.");
      return;
    }
    if (tope.trim() !== "" && (!Number.isFinite(Number(tope)) || Number(tope) < 0)) {
      setMensaje("El tope de deuda debe ser un número válido.");
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
    };
    setCreando(true);
    setMensaje(null);
    try {
      await api.crearCliente(rutaActiva.rutaId, input, evidenciasCliente.evidencias);
      setCreadoOk(true);
      setNombre("");
      setApellido("");
      setNegocio("");
      setTelefono("");
      setTope("");
      setDireccion("");
      evidenciasCliente.quitar("foto_facial");
      evidenciasCliente.quitar("documento_frente");
      evidenciasCliente.quitar("documento_reverso");
      await cargar();
      setTimeout(() => {
        setNuevoAbierto(false);
        setCreadoOk(false);
      }, 1200);
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setMensaje("No se pudo crear el cliente.");
      }
    } finally {
      setCreando(false);
    }
  }

  if (!rutaActiva) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.vacio}>Selecciona una ruta para ver sus clientes.</Text>
      </View>
    );
  }

  if (!clientes) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  const nombreCompleto = (c: ClienteCobradorPublic) =>
    `${c.nombre} ${c.apellido}`.trim();

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitulo}>{rutaActiva.rutaNombre}</Text>
          <Text style={styles.headerDetalle}>{clientes.length} clientes</Text>
        </View>
        <Pressable
          testID="btn-nuevo-cliente"
          style={styles.botonNuevo}
          onPress={abrirNuevoCliente}
        >
          <Text style={styles.botonNuevoTexto}>+ Cliente</Text>
        </Pressable>
      </View>
      <FlatList
        data={clientes}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} />
        }
        ListEmptyComponent={
          <Text style={styles.vacio}>Esta ruta no tiene clientes.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`cliente-${item.id}`}
            style={styles.tarjeta}
            onPress={() =>
              abrir({
                tipo: "cliente",
                rutaId: item.rutaId,
                clienteId: item.id,
                nombre: nombreCompleto(item),
                latitud: item.latitud,
                longitud: item.longitud,
              })
            }
          >
            <Avatar nombre={nombreCompleto(item)} fotoUrl={item.fotoUrl} />
            <View style={styles.tarjetaInfo}>
              <Text style={styles.clienteNombre}>{nombreCompleto(item)}</Text>
              {item.negocio ? (
                <Text style={styles.clienteDetalle}>{item.negocio}</Text>
              ) : null}
              <Text style={styles.clienteTelefono}>{item.telefonoWhatsapp}</Text>
            </View>
            <ColorBadge color={item.colorRiesgo} />
          </Pressable>
        )}
      />

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
            {/* Avatar editable + documento frente/reverso en la misma fila */}
            <View style={styles.filaSuperior}>
              <Pressable
                testID="cliente-avatar-btn"
                style={styles.avatarEditable}
                disabled={evidenciasCliente.cargando}
                onPress={() => elegirEvidencia("foto_facial", "libreria")}
              >
                <Avatar nombre={nombre || apellido || "?"} fotoUrl={null} size={72} />
                <View style={styles.avatarOverlay}>
                  <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
                </View>
                <Text style={styles.avatarEtiqueta}>
                  {evidenciasCliente.evidencias.find((e) => e.campo === "foto_facial")
                    ? "Foto ✓"
                    : "Foto"}
                </Text>
              </Pressable>

              <View style={styles.documentoNuevo}>
                <Text style={styles.documentoNuevoTitulo}>Documento</Text>
                <View style={styles.documentoNuevoFilas}>
                  <Pressable
                    testID="cliente-doc-frente"
                    style={styles.botonDoc}
                    disabled={evidenciasCliente.cargando}
                    onPress={() => elegirEvidencia("documento_frente", "libreria")}
                  >
                    <MaterialIcons name="badge" size={16} color="#2563eb" />
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
                    onPress={() => elegirEvidencia("documento_reverso", "libreria")}
                  >
                    <MaterialIcons name="badge" size={16} color="#2563eb" />
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
              <ActivityIndicator color="#2563eb" />
            ) : null}

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              testID="cliente-nombre"
              style={styles.input}
              placeholder="Nombre"
              value={nombre}
              onChangeText={setNombre}
            />
            <Text style={styles.label}>Apellido</Text>
            <TextInput
              testID="cliente-apellido"
              style={styles.input}
              placeholder="Apellido"
              value={apellido}
              onChangeText={setApellido}
            />
            <Text style={styles.label}>Negocio (opcional)</Text>
            <TextInput
              testID="cliente-negocio"
              style={styles.input}
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

            <Text style={styles.label}>Ubicación del negocio</Text>
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
                <ActivityIndicator size="small" color="#2563eb" /> Ubicando por GPS…
              </Text>
            ) : null}
            <MapaPin
              latitud={Number(latitud) || COORD_DEFAULT.lat}
              longitud={Number(longitud) || COORD_DEFAULT.lng}
              onChange={(lat, lng) => {
                setLatitud(String(lat));
                setLongitud(String(lng));
              }}
              testID="mapa-pin-cliente"
            />
            <View style={styles.filaCoordenadas}>
              <TextInput
                testID="cliente-latitud"
                style={[styles.input, styles.inputCoordenada]}
                placeholder="Latitud"
                keyboardType="decimal-pad"
                value={latitud}
                onChangeText={setLatitud}
              />
              <TextInput
                testID="cliente-longitud"
                style={[styles.input, styles.inputCoordenada]}
                placeholder="Longitud"
                keyboardType="decimal-pad"
                value={longitud}
                onChangeText={setLongitud}
              />
            </View>
            <Text style={styles.label}>Tope máximo de deuda (opcional)</Text>
            <TextInput
              testID="cliente-tope"
              style={styles.input}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  botonNuevo: { flexDirection: "row", alignItems: "center", gap: 2 },
  botonNuevoTexto: { color: "#2563eb", fontWeight: "700", fontSize: 14 },
  headerInfo: { flex: 1 },
  headerTitulo: { fontSize: 18, fontWeight: "700", color: "#334155" },
  headerDetalle: { color: "#64748b", fontSize: 13 },
  headerEspacio: { width: 84 },
  lista: { padding: 16, gap: 10 },
  vacio: { color: "#64748b", textAlign: "center", marginTop: 24 },
  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tarjetaInfo: { flex: 1 },
  clienteNombre: { fontSize: 16, fontWeight: "600", color: "#334155" },
  clienteDetalle: { color: "#64748b", fontSize: 13, marginTop: 2 },
  clienteTelefono: { color: "#475569", fontSize: 12, marginTop: 2 },
  form: { gap: 8, paddingBottom: 8 },
  label: { fontSize: 13, color: "#475569", fontWeight: "600", marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  filaCoordenadas: { flexDirection: "row", gap: 8 },
  inputCoordenada: { flex: 1 },
  filaSuperior: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatarEditable: { alignItems: "center", gap: 4 },
  avatarOverlay: {
    position: "absolute",
    bottom: 6,
    right: 0,
    backgroundColor: "#2563eb",
    borderRadius: 999,
    padding: 5,
  },
  avatarEtiqueta: { fontSize: 12, color: "#2563eb", fontWeight: "600" },
  documentoNuevo: { flex: 1, gap: 6 },
  documentoNuevoTitulo: { fontSize: 13, color: "#475569", fontWeight: "600" },
  documentoNuevoFilas: { flexDirection: "row", gap: 8 },
  botonDoc: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 8,
  },
  botonDocTexto: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  filaBusqueda: { flexDirection: "row", gap: 8 },
  inputBusqueda: { flex: 1 },
  botonBuscar: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
  },
  gpsTexto: { color: "#64748b", fontSize: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  exito: { alignItems: "center", gap: 12, paddingVertical: 24 },
  exitoTexto: { color: "#16a34a", fontSize: 16, fontWeight: "700" },
  mensajeError: { color: "#dc2626", fontSize: 13 },
});