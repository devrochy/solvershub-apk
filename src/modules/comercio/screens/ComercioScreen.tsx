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
import {
  alternarPromocion,
  cambiarEstadoPedido,
  cargarCategorias,
  cargarPedidos,
  cargarProductos,
  cargarPromociones,
  ESTADOS_PEDIDO,
  type CategoryOut,
  type OrderOut,
  type ProductOut,
  type PromotionOut,
} from "../api";

type Pestana = "pedidos" | "productos" | "promociones" | "categorias";

export function ComercioScreen() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [pestana, setPestana] = useState<Pestana>("pedidos");
  const [pedidos, setPedidos] = useState<OrderOut[]>([]);
  const [productos, setProductos] = useState<ProductOut[]>([]);
  const [promos, setPromos] = useState<PromotionOut[]>([]);
  const [categorias, setCategorias] = useState<CategoryOut[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [p, pr, pm, c] = await Promise.all([
        cargarPedidos(api),
        cargarProductos(api),
        cargarPromociones(api),
        cargarCategorias(api),
      ]);
      setError(null);
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
            void cambiarEstadoPedido(api, pedido.id, estado)
              .then(cargar)
              .catch(() => setError("No se pudo cambiar el estado del pedido."));
          },
        })),
        { text: "Cancelar", style: "cancel" as const },
      ],
    );
  };

  const alternarPromo = (promo: PromotionOut) => {
    void alternarPromocion(api, promo.id)
      .then(cargar)
      .catch(() => setError("No se pudo cambiar la promoción."));
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {(["pedidos", "productos", "promociones", "categorias"] as Pestana[]).map((p) => (
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
              {p === "pedidos"
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

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
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
});
