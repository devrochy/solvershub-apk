import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@core/theme/theme-context";
import type { LoginResult } from "@shared/types/auth";
import { useAdminSession } from "@core/session/admin-session-context";
import { ApiAuthError, apiGestorToken, apiTenantsAdmin } from "@core/api/auth-admin";
import { esCodigoDeEquipo } from "@shared/acceso-evento";
import type { TenantAdmin } from "@core/session/types";

export interface SeleccionNegocioAdminProps {
  /** Sesión de campo lista (exchange OK) para el negocio elegido. */
  onAutenticado(result: LoginResult): Promise<void>;
  /** Entra al panel solo con la sesión admin (negocio sin acceso de campo). */
  onEntrarPanel(): void;
  onCancelar(): void;
}

/**
 * Selector de negocio del login unificado (HU-APP-03): el admin con varios
 * negocios elige uno; se intenta el exchange a campo y, si el negocio no tiene
 * acceso de campo, se entra al panel con la sesión admin (el `X-Tenant-Id` se
 * fija con `seleccionarNegocio` del contexto admin).
 */
export function SeleccionNegocioAdminScreen({
  onAutenticado,
  onEntrarPanel,
  onCancelar,
}: SeleccionNegocioAdminProps) {
  const { colores } = useTheme();
  const { sesion, seleccionarNegocio, logout } = useAdminSession();
  const [negocios, setNegocios] = useState<TenantAdmin[] | null>(null);
  const [cargandoId, setCargandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    if (!sesion) {
      return;
    }
    apiTenantsAdmin(sesion.token)
      .then((lista) => {
        if (activo) {
          setNegocios(lista.filter((n) => n.active));
        }
      })
      .catch(() => {
        if (activo) {
          setError("No pudimos cargar tus negocios. Intenta de nuevo.");
        }
      });
    return () => {
      activo = false;
    };
  }, [sesion]);

  const elegir = useCallback(
    async (negocio: TenantAdmin) => {
      if (!sesion) {
        return;
      }
      setCargandoId(negocio.id);
      setError(null);
      try {
        await seleccionarNegocio(negocio.id);
        const campo = await apiGestorToken(sesion.token, negocio.id);
        await onAutenticado(campo);
      } catch (err) {
        if (err instanceof ApiAuthError && esCodigoDeEquipo(err.code)) {
          // Equipo pendiente o bloqueado (ADR-0174): la raíz de la app muestra su pantalla.
          return;
        }
        if (err instanceof ApiAuthError && err.status === 403 && err.code === "sin_acceso_campo") {
          // Sin acceso de campo en este negocio (ADR-0094): la sesión admin ya quedó con el
          // negocio elegido → panel.
          onEntrarPanel();
          return;
        }
        setError("No pudimos entrar a ese negocio. Intenta de nuevo.");
      } finally {
        setCargandoId(null);
      }
    },
    [sesion, seleccionarNegocio, onAutenticado, onEntrarPanel],
  );

  return (
    <SafeAreaView
      testID="selector-negocio-admin"
      edges={["top", "left", "right", "bottom"]}
      style={[styles.contenedor, { backgroundColor: colores.fondo }]}
    >
      <Text style={[styles.titulo, { color: colores.texto }]}>Elige tu negocio</Text>

      {negocios === null && !error ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          testID="selector-negocios"
          data={negocios ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              testID={`negocio-${item.id}`}
              disabled={cargandoId !== null}
              onPress={() => void elegir(item)}
              style={({ pressed }) => [
                styles.item,
                { borderColor: colores.borde, backgroundColor: colores.tarjeta },
                pressed && styles.presionado,
              ]}
            >
              <Text style={[styles.itemNombre, { color: colores.texto }]}>{item.name}</Text>
              <Text style={[styles.itemRol, { color: colores.textoSuave }]}>{item.role}</Text>
              {cargandoId === item.id ? <ActivityIndicator size="small" /> : null}
            </Pressable>
          )}
        />
      )}

      {error ? (
        <Text testID="selector-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}

      <Pressable
        testID="selector-cancelar"
        onPress={() => {
          void logout();
          onCancelar();
        }}
      >
        <Text style={[styles.cancelar, { color: colores.acento }]}>Cerrar sesión</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: "center", padding: 28, gap: 14 },
  titulo: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemNombre: { fontSize: 16, fontWeight: "600", flex: 1 },
  itemRol: { fontSize: 13 },
  presionado: { opacity: 0.85 },
  error: { fontSize: 13 },
  cancelar: { textAlign: "center", fontSize: 14 },
});
