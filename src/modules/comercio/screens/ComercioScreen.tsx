import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import NetInfo from "@react-native-community/netinfo";
import { Modal, TextInput } from "react-native";
import { baseActual } from "@data/bootstrap";
import { cambiarEstadoPedidoConOffline } from "../offline";
import { crearCategoria, crearProducto, crearPromocion } from "../api";
import {
  alternarPromocion,
  cargarCategorias,
  cargarPedidos,
  cargarProductos,
  cargarPromociones,
  cargarResumenComercio,
  ESTADOS_PEDIDO,
  type KpiComercio,
  type CategoryOut,
  type OrderOut,
  type ProductOut,
  type PromotionOut,
} from "../api";

type Pestana = "resumen" | "pedidos" | "productos" | "promociones" | "categorias";

export function ComercioScreen() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [kpis, setKpis] = useState<KpiComercio | null>(null);
  const [pedidos, setPedidos] = useState<OrderOut[]>([]);
  const [productos, setProductos] = useState<ProductOut[]>([]);
  const [promos, setPromos] = useState<PromotionOut[]>([]);
  const [categorias, setCategorias] = useState<CategoryOut[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalNuevo, setModalNuevo] = useState<"producto" | "categoria" | "promocion" | null>(null);
  const [campoNuevo, setCampoNuevo] = useState("");
  const [campoPrecio, setCampoPrecio] = useState("");
  const [campoTipo, setCampoTipo] = useState("temporada");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [k, p, pr, pm, c] = await Promise.all([
        cargarResumenComercio(api),
        cargarPedidos(api),
        cargarProductos(api),
        cargarPromociones(api),
        cargarCategorias(api),
      ]);
      setError(null);
      setKpis(k);
      setPedidos(p);
      setProductos(pr);
      setPromos(pm);
      setCategorias(c);
    } catch {
      setError("No pudimos cargar el comercio. Revisa tu conexión.");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const cambiarEstado = (pedido: OrderOut) => {
    const opciones = ESTADOS_PEDIDO.filter((e) => e !== pedido.status).slice(0, 3);
    Alert.alert(
      `Pedido ${pedido.public_order_number}`,
      "¿A qué estado lo movemos?",
      [
        ...opciones.map((estado) => ({
          text: estado,
          onPress: () => {
            void (async () => {
              try {
                const red = await NetInfo.fetch();
                const resultado = await cambiarEstadoPedidoConOffline(
                  baseActual(),
                  api,
                  pedido.id,
                  estado,
                  red.isConnected !== false,
                );
                if (resultado === "encolado") {
                  Alert.alert(
                    "Sin conexión",
                    "El cambio quedó encolado y se sincronizará al reconectar.",
                  );
                } else {
                  await cargar();
                }
              } catch {
                setError("No se pudo cambiar el estado del pedido.");
              }
            })();
          },
        })),
        { text: "Cancelar", style: "cancel" as const },
      ],
    );
  };

  const crearNuevo = async () => {
    if (modalNuevo === "producto" && !campoNuevo.trim()) {
      setError("Escribe el nombre del producto.");
      return;
    }
    setEnviando(true);
    try {
      if (modalNuevo === "producto") {
        await crearProducto(api, { name: campoNuevo.trim(), price: Number(campoPrecio) || undefined });
      } else if (modalNuevo === "categoria") {
        await crearCategoria(api, { name: campoNuevo.trim() });
      } else if (modalNuevo === "promocion") {
        await crearPromocion(api, { type: campoTipo });
      }
      setModalNuevo(null);
      setCampoNuevo("");
      setCampoPrecio("");
      await cargar();
    } catch {
      setError("No se pudo crear. Revisa los datos.");
    } finally {
      setEnviando(false);
    }
  };

  const alternarPromo = (promo: PromotionOut) => {
    void alternarPromocion(api, promo.id)
      .then(cargar)
      .catch(() => setError("No se pudo cambiar la promoción."));
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {(["resumen", "pedidos", "productos", "promociones", "categorias"] as Pestana[]).map((p) => (
          <Pressable
            key={p}
            testID={`comercio-${p}`}
            onPress={() => setPestana(p)}
            style={[
              styles.pestana,
              pestana === p && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={{
                color: pestana === p ? colores.texto : colores.textoSuave,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {p === "resumen"
                ? "Resumen"
                : p === "pedidos"
                  ? "Pedidos"
                  : p === "productos"
                    ? "Productos"
                    : p === "promociones"
                      ? "Promos"
                      : "Categorías"}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text testID="comercio-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {pestana === "productos" || pestana === "categorias" || pestana === "promociones" ? (
        <Pressable
          testID="comercio-nuevo"
          onPress={() => {
            setModalNuevo(pestana === "productos" ? "producto" : pestana === "categorias" ? "categoria" : "promocion");
          }}
          style={[styles.fab, { backgroundColor: colores.primario }]}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>+ Nuevo</Text>
        </Pressable>
      ) : null}

      <Modal visible={modalNuevo !== null} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.modalTitulo, { color: colores.texto }]}>
              {modalNuevo === "producto" ? "Nuevo producto" : modalNuevo === "categoria" ? "Nueva categoría" : "Nueva promoción"}
            </Text>
            {modalNuevo === "promocion" ? (
              <View style={styles.chips}>
                {["temporada", "volumen", "campaña"].map((tipo) => (
                  <Pressable key={tipo} onPress={() => setCampoTipo(tipo)} style={[styles.chip, { borderColor: campoTipo === tipo ? colores.acento : colores.borde }]}>
                    <Text style={{ color: campoTipo === tipo ? colores.acento : colores.textoSuave, fontSize: 12 }}>{tipo}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <TextInput testID="modal-nombre" value={campoNuevo} onChangeText={setCampoNuevo}
                  placeholder="Nombre" placeholderTextColor={colores.textoSuave}
                  style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
                {modalNuevo === "producto" ? (
                  <TextInput testID="modal-precio" value={campoPrecio} onChangeText={setCampoPrecio}
                    placeholder="Precio (opcional)" placeholderTextColor={colores.textoSuave} keyboardType="numeric"
                    style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
                ) : null}
              </>
            )}
            <View style={styles.modalBotones}>
              <Pressable onPress={() => setModalNuevo(null)} style={{ padding: 10 }}>
                <Text style={{ color: colores.textoSuave }}>Cancelar</Text>
              </Pressable>
              <Pressable testID="modal-crear" disabled={enviando} onPress={() => void crearNuevo()}
                style={[styles.modalBoton, { backgroundColor: colores.primario }]}>
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Crear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : pestana === "resumen" ? (
        <View style={styles.grid}>
          {[
            { clave: "leads", valor: kpis?.leads ?? 0 },
            { clave: "productos", valor: kpis?.products ?? 0 },
            { clave: "promociones", valor: kpis?.promotions ?? 0 },
            { clave: "pedidos", valor: kpis?.orders ?? 0 },
          ].map((k) => (
            <View key={k.clave} style={[styles.kpi, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <Text testID={`comercio-kpi-${k.clave}`} style={[styles.kpiValor, { color: colores.texto }]}>{k.valor}</Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{k.clave}</Text>
            </View>
          ))}
        </View>
      ) : pestana === "pedidos" ? (
        <FlatList
          testID="comercio-lista-pedidos"
          data={pedidos}
          keyExtractor={(o) => o.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin pedidos por ahora.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`pedido-${item.public_order_number}`}
              onPress={() => cambiarEstado(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>
                  {item.public_order_number} · ${item.total}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.delivery_full_name ?? "Sin destinatario"} · pago {item.payment_status}
                </Text>
              </View>
              <Text style={{ color: colores.acento, fontSize: 12 }}>{item.status} ›</Text>
            </Pressable>
          )}
        />
      ) : pestana === "productos" ? (
        <FlatList
          testID="comercio-lista-productos"
          data={productos}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin productos.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.name}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.category ?? "Sin categoría"}
                  {item.variants?.length ? ` · ${item.variants.length} variantes` : ""}
                </Text>
              </View>
              {item.price != null ? (
                <Text style={{ color: colores.texto }}>${item.price}</Text>
              ) : null}
            </View>
          )}
        />
      ) : pestana === "promociones" ? (
        <FlatList
          testID="comercio-lista-promos"
          data={promos}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin promociones.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => alternarPromo(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.type}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.valid_from ?? "sin inicio"} → {item.valid_to ?? "sin fin"}
                </Text>
              </View>
              <Text style={{ color: item.active ? colores.acento : colores.textoSuave, fontSize: 12 }}>
                {item.active ? "activa" : "inactiva"}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          testID="comercio-lista-categorias"
          data={categorias}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin categorías.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <Text style={{ color: colores.texto, flex: 1 }}>{item.name}</Text>
              <Text style={{ color: item.active ? colores.acento : colores.textoSuave, fontSize: 12 }}>
                {item.active ? "activa" : "inactiva"}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 12 },
  pestanas: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 10 },
  pestana: { flex: 1, paddingVertical: 10, alignItems: "center" },
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  kpi: { borderWidth: 1, borderRadius: 12, padding: 12, minWidth: 140, flexGrow: 1, flexBasis: "45%" },
  kpiValor: { fontSize: 20, fontWeight: "700" },
  fab: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "center", marginTop: 4 },
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCaja: { borderRadius: 14, padding: 18, gap: 10 },
  modalTitulo: { fontSize: 16, fontWeight: "700" },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  modalBotones: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 4 },
  modalBoton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
