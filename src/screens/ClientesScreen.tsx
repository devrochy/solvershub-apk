import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { apiErrorStatus } from "../api/client";
import { Avatar } from "../components/Avatar";
import { CargaError } from "../components/CargaError";
import { ColorBadge } from "../components/ColorBadge";
import { MapaPin } from "../components/MapaPin";
import { ModalConFooter } from "../components/ModalConFooter";
import { useEvidenciasCliente, type FuenteEvidencia } from "../features/cliente/use-evidencias-cliente";
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
    campo: "foto_facial" | "documento_frente",
    fuente: FuenteEvidencia,
  ) {
    void evidenciasCliente.agregar(campo, fuente);
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
      setNuevoAbierto(false);
      setNombre("");
      setApellido("");
      setNegocio("");
      setTelefono("");
      setTope("");
      evidenciasCliente.quitar("foto_facial");
      evidenciasCliente.quitar("documento_frente");
      await cargar();
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
        <Pressable
          testID="btn-nuevo-cliente"
          style={styles.botonNuevo}
          onPress={() => {
            setNuevoAbierto(true);
            setMensaje(null);
          }}
        >
          <MaterialIcons name="add" size={18} color="#2563eb" />
          <Text style={styles.botonNuevoTexto}>Cliente</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitulo}>{rutaActiva.rutaNombre}</Text>
          <Text style={styles.headerDetalle}>{clientes.length} clientes</Text>
        </View>
        <View style={styles.headerEspacio} />
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
        <ScrollView contentContainerStyle={styles.form}>
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
          <TextInput
            testID="cliente-telefono"
            style={styles.input}
            placeholder="+591…"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />
          <Text style={styles.label}>Ubicación del negocio</Text>
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
          <Text style={styles.label}>Foto y documento</Text>
          <View style={styles.filaEvidencias}>
            <Pressable
              testID="cliente-evidencia-foto"
              style={styles.botonEvidencia}
              disabled={evidenciasCliente.cargando}
              onPress={() => elegirEvidencia("foto_facial", "libreria")}
            >
              <MaterialIcons name="photo-library" size={16} color="#2563eb" />
              <Text style={styles.botonEvidenciaTexto}>
                {evidenciasCliente.evidencias.find((e) => e.campo === "foto_facial")
                  ? "Foto seleccionada"
                  : "Foto"}
              </Text>
            </Pressable>
            <Pressable
              testID="cliente-evidencia-documento"
              style={styles.botonEvidencia}
              disabled={evidenciasCliente.cargando}
              onPress={() => elegirEvidencia("documento_frente", "libreria")}
            >
              <MaterialIcons name="badge" size={16} color="#2563eb" />
              <Text style={styles.botonEvidenciaTexto}>
                {evidenciasCliente.evidencias.find((e) => e.campo === "documento_frente")
                  ? "Documento seleccionado"
                  : "Documento"}
              </Text>
            </Pressable>
          </View>
          {evidenciasCliente.error ? (
            <Text style={styles.mensajeError}>{evidenciasCliente.error}</Text>
          ) : null}
          {evidenciasCliente.cargando ? <ActivityIndicator color="#2563eb" /> : null}
          {mensaje ? <Text style={styles.mensajeError}>{mensaje}</Text> : null}
        </ScrollView>
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
  botonNuevo: { flexDirection: "row", alignItems: "center", gap: 2, width: 84 },
  botonNuevoTexto: { color: "#2563eb", fontWeight: "700", fontSize: 14 },
  headerInfo: { flex: 1, alignItems: "center" },
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
  filaEvidencias: { flexDirection: "row", gap: 8 },
  botonEvidencia: {
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
  botonEvidenciaTexto: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  mensajeError: { color: "#dc2626", fontSize: 13 },
});