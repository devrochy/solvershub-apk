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
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { Avatar } from "../components/Avatar";
import { CampoTelefono } from "../components/CampoTelefono";
import { CargaError } from "../components/CargaError";
import { CampoModal } from "../components/CampoModal";
import { fondoDeEstado } from "../components/ColorBadge";
import { HeaderPantalla, estilosHeader } from "../components/HeaderPantalla";
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
      rutaActiva.config.reconocimientoFacialActivo &&
      !camposEvidencia.has("foto_facial")
    ) {
      console.log("[crear-cliente] bloqueado: falta foto_facial");
      setMensaje("Esta ruta exige la foto del cliente (foto facial).");
      return;
    }
    if (
      rutaActiva.config.registroDocumentoCliente &&
      !camposEvidencia.has("documento_frente")
    ) {
      console.log("[crear-cliente] bloqueado: falta documento_frente");
      setMensaje("Esta ruta exige el documento (frente).");
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
      tipoDocumento,
      numeroDocumento: numeroDocumento.trim(),
    };
    setCreando(true);
    setMensaje(null);
    try {
      console.log("[crear-cliente] enviando", {
        rutaId: rutaActiva.rutaId,
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
      await api.crearCliente(rutaActiva.rutaId, input, evidenciasCliente.evidencias);
      console.log("[crear-cliente] creado OK");
      setCreadoOk(true);
      setNombre("");
      setApellido("");
      setNegocio("");
      setTelefono("");
      setTope("");
      setNumeroDocumento("");
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
    <SafeAreaView style={styles.contenedor} edges={["left", "right"]}>
      <HeaderPantalla>
        <View style={estilosHeader.fila}>
          <View style={estilosHeader.bloqueTitulo}>
            <Text style={estilosHeader.titulo}>{rutaActiva.rutaNombre}</Text>
            <Text style={estilosHeader.subtitulo}>{clientes.length} clientes</Text>
          </View>
          <Pressable
            testID="btn-nuevo-cliente"
            style={estilosHeader.accionPill}
            onPress={abrirNuevoCliente}
          >
            <Text style={estilosHeader.accionPillTexto}>+ Cliente</Text>
          </Pressable>
        </View>
      </HeaderPantalla>
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
            style={[styles.tarjeta, { backgroundColor: fondoDeEstado(item.colorRiesgo) }]}
            onPress={() =>
              abrir({
                tipo: "cliente",
                rutaId: item.rutaId,
                clienteId: item.id,
                nombre: nombreCompleto(item),
                latitud: item.latitud,
                longitud: item.longitud,
                latitudDomicilio: item.latitudDomicilio ?? undefined,
                longitudDomicilio: item.longitudDomicilio ?? undefined,
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
                    <MaterialIcons name="badge" size={16} color="#172f6c" />
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
                    <MaterialIcons name="badge" size={16} color="#172f6c" />
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
              <ActivityIndicator color="#172f6c" />
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
                <ActivityIndicator size="small" color="#172f6c" /> Ubicando por GPS…
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
          <MaterialIcons name="photo-library" size={20} color="#172f6c" />
          <Text style={styles.botonFuenteModalTexto}>Elegir de la galería</Text>
        </Pressable>
        <Pressable
          testID="fuente-camara"
          style={styles.botonFuenteModal}
          disabled={evidenciasCliente.cargando}
          onPress={() => elegirEvidencia(fuenteCampo, "camara")}
        >
          <MaterialIcons name="photo-camera" size={20} color="#172f6c" />
          <Text style={styles.botonFuenteModalTexto}>Tomar foto</Text>
        </Pressable>
        {evidenciasCliente.cargando ? <ActivityIndicator color="#172f6c" /> : null}
        {evidenciasCliente.error ? (
          <Text style={styles.mensajeError}>{evidenciasCliente.error}</Text>
        ) : null}
      </ModalConFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
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
  label: { fontSize: 13, color: "#64748b", fontWeight: "600", marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActivo: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipTexto: { color: "#172f6c", fontSize: 13 },
  chipTextoActivo: { color: "#ffffff", fontSize: 13 },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#334155",
  },
  filaCoordenadas: { flexDirection: "row", gap: 8 },
  inputCoordenada: { flex: 1 },
  filaSuperior: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatarEditable: { alignItems: "center", gap: 4 },
  avatarImagen: { width: 72, height: 72, borderRadius: 36 },
  avatarEtiqueta: { fontSize: 12, color: "#172f6c", fontWeight: "600" },
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
    borderColor: "#172f6c",
    borderRadius: 8,
    paddingVertical: 8,
  },
  botonDocTexto: { color: "#172f6c", fontWeight: "600", fontSize: 13 },
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
  botonFuenteModalTexto: { color: "#172f6c", fontWeight: "600", fontSize: 15 },
  filaBusqueda: { flexDirection: "row", gap: 8 },
  inputBusqueda: { flex: 1 },
  botonBuscar: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#172f6c",
    borderRadius: 8,
  },
  gpsTexto: { color: "#64748b", fontSize: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  exito: { alignItems: "center", gap: 12, paddingVertical: 24 },
  exitoTexto: { color: "#16a34a", fontSize: 16, fontWeight: "700" },
  mensajeError: { color: "#dc2626", fontSize: 13 },
});