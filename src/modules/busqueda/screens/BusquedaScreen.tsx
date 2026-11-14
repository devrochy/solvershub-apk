import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { emitirNavegacion, type DestinoNavegacion } from "@shared/navegacion-evento";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { baseActual } from "@data/bootstrap";
import { buscarEnCache } from "@data/busqueda-cache";
import { buscar, type SeccionResultados } from "../api";

/** Módulo y pestaña interna a los que lleva cada tipo de resultado (HU-APP-21). */
export const DESTINO_POR_ENTIDAD: Record<string, DestinoNavegacion> = {
  cliente: { tab: "cobranza", pestana: "clientes" },
  prestamo: { tab: "cobranza", pestana: "clientes" },
  promesa: { tab: "cobranza", pestana: "promesas" },
  producto: { tab: "comercio", pestana: "productos" },
  pedido: { tab: "comercio", pestana: "pedidos" },
  categoria: { tab: "comercio", pestana: "categorias" },
  cita: { tab: "calendario", pestana: "semana" },
  conversacion: { tab: "conversaciones", pestana: "conversaciones" },
  lead: { tab: "conversaciones", pestana: "leads" },
  conexion: { tab: "configuracion", pestana: "conexiones" },
  colaborador: { tab: "configuracion", pestana: "colaboradores" },
};

export function BusquedaScreen() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [texto, setTexto] = useState("");
  const [secciones, setSecciones] = useState<SeccionResultados[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setSecciones([]);
        return;
      }
      setBuscando(true);
      setError(null);
      try {
        setSecciones(await buscar(api, q.trim()));
      } catch {
        // Sin red: búsqueda local sobre la caché del sync (ADR-0097).
        const db = baseActual();
        if (db) {
          try {
            const locales = await buscarEnCache(db, q.trim());
            if (locales.length > 0) {
              setSecciones([
                {
                  seccion: "local",
                  label: "Resultados guardados en tu teléfono",
                  items: locales.map((l) => ({
                    id: l.id,
                    tipo: l.entidad,
                    titulo: l.id,
                    subtitulo: l.entidad,
                    extra: {},
                  })),
                },
              ]);
              return;
            }
          } catch {
            // cae al mensaje de error
          }
        }
        setError("No pudimos buscar. Revisa tu conexión.");
      } finally {
        setBuscando(false);
      }
    },
    [api],
  );

  useEffect(() => {
    const temporizador = setTimeout(() => void consultar(texto), 350);
    return () => clearTimeout(temporizador);
  }, [texto, consultar]);

  const filas = secciones.flatMap((s) =>
    s.items.map((i) => ({ key: `${s.seccion}-${i.id}`, seccion: s.label, item: i })),
  );

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <TextInput
        testID="busqueda-campo"
        value={texto}
        onChangeText={setTexto}
        placeholder="Buscar clientes, conversaciones, pedidos, citas…"
        placeholderTextColor={colores.textoSuave}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
      />

      {error ? (
        <Text testID="busqueda-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {buscando ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}

      <FlatList
        testID="busqueda-resultados"
        data={filas}
        keyExtractor={(f) => f.key}
        ListEmptyComponent={
          !buscando && texto.trim().length >= 2 ? (
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin resultados para “{texto.trim()}”.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`busqueda-item-${item.item.tipo}-${item.item.id}`}
            onPress={() => {
              // El shell cambia de módulo; Búsqueda es un módulo más, no un stack.
              emitirNavegacion(DESTINO_POR_ENTIDAD[item.item.tipo] ?? { tab: "inicio" });
            }}
            style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colores.texto, fontWeight: "600" }} numberOfLines={1}>
                {item.item.titulo}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }} numberOfLines={1}>
                {item.seccion} · {item.item.subtitulo}
              </Text>
            </View>
            <Text style={{ color: colores.acento, fontSize: 11 }}>{item.item.tipo}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 12 },
  campo: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
});
