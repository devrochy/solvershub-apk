import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { useAvisoVisible } from "@shared/ruta/aviso-visible";
import type { PropsDeEstacionDelAgente } from "@shared/ruta/estacion-del-agente";
import { Button, useKit } from "@shared/ui";
import { cargarDatosCliente, guardarDatosCliente } from "../api";
import { DatosDelClienteDelAgente } from "../DatosDelClienteDelAgente";
import {
  alPorDefecto,
  conCuantoPregunta,
  conMetodo,
  conNivel,
  cuerpoParaGuardar,
  estadoInicial,
  mensajeDeErrorAlGuardar,
  metodosIniciales,
  restablecida,
  resumenDeDatosCliente,
  tieneVentas,
  TEXTO_SIN_METODOS,
  type AgenteDatos,
  type EstadoDatos,
  type MetodoEntrega,
} from "../datos-cliente";

/** Lo guardado en el servidor: con qué se compara para saber si hay que escribir. */
type Guardado = {
  estado: EstadoDatos;
  herramientas: boolean;
  metodos: MetodoEntrega[];
};

const TEXTO_SIN_CONEXION = "Se cortó la conexión. Lo que elegiste sigue aquí: vuelve a intentarlo.";

/**
 * Errores 422 que dicen que lo cargado quedó viejo (el agente cambió de operaciones o un dato pasó a ser exigido
 * por el sistema): reintentar con lo mismo fallaría siempre, así que se vuelve a cargar lo vigente.
 */
const CODIGOS_DESACTUALIZADOS = new Set(["dato_no_ajustable", "dato_desconocido", "accion_desconocida"]);
const TEXTO_DESACTUALIZADO =
  "Algunos de esos datos cambiaron mientras elegías. Ya cargamos lo vigente: revísalo y vuelve a guardar.";

/**
 * Estación 3, «Datos del cliente» (HU-APP-24, tableros `rb3`/`rn3`), en las dos rutas: carga
 * `GET /admin/agents/{id}/datos-cliente` y, con «Guardar y seguir», escribe `politica`, `herramientas_del_agente`
 * y `metodos_entrega` con un solo `PUT`, solo si algo cambió (igual que «Datos del cliente» del panel). Si el
 * guardado falla, se queda en la estación con el error y «Reintentar» (que vuelve a guardar y sigue).
 */
export function EstacionDatosDelCliente({ agenteId, registrarGuardar, onResumen, onSeguir, mostrarAviso }: PropsDeEstacionDelAgente) {
  const api = useAdminApi();
  const { tonos } = useKit();
  const [politica, setPolitica] = useState<AgenteDatos | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState<EstadoDatos>({});
  const [herramientas, setHerramientas] = useState(false);
  const [metodos, setMetodos] = useState<MetodoEntrega[]>([]);
  const [guardado, setGuardado] = useState<Guardado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDeMetodos, setErrorDeMetodos] = useState<string | null>(null);
  // El error queda al final del contenido, lejos del pie que lo provocó: se trae a la vista y se anuncia.
  const alMedirError = useAvisoVisible(error, mostrarAviso);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const datos = await cargarDatosCliente(api, agenteId);
        if (!vivo) return;
        const inicial = estadoInicial(datos);
        const conHerramientas = datos.herramientas_del_agente ?? false;
        const delServidor = metodosIniciales(datos);
        setPolitica(datos);
        setEstado(inicial);
        setHerramientas(conHerramientas);
        setMetodos(delServidor);
        setGuardado({
          estado: inicial,
          herramientas: conHerramientas,
          metodos: delServidor,
        });
      } catch {
        if (vivo) setErrorDeCarga("No pudimos cargar los datos del cliente. Revisa tu conexión e inténtalo de nuevo.");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [api, agenteId, intento]);

  useEffect(() => {
    onResumen("datos-cliente", resumenDeDatosCliente(politica, estado));
  }, [politica, estado, onResumen]);

  // «Guardar y seguir» lee siempre lo último que hay en pantalla.
  const actual = useRef({ politica, estado, herramientas, metodos, guardado });
  useEffect(() => {
    actual.current = { politica, estado, herramientas, metodos, guardado };
  });

  const guardar = useCallback(async (): Promise<boolean> => {
    const { politica: p, estado: e, herramientas: h, metodos: m, guardado: g } = actual.current;
    // Sin la política no hay nada que guardar ni pantalla donde avisar: la carga muestra su spinner o su error
    // con «Reintentar», y la ruta no avanza.
    if (!p || !g) return false;
    if (tieneVentas(p) && m.length === 0) {
      setErrorDeMetodos(TEXTO_SIN_METODOS);
      return false;
    }
    setError(null);
    setErrorDeMetodos(null);
    const sucio =
      JSON.stringify(e) !== JSON.stringify(g.estado) ||
      h !== g.herramientas ||
      JSON.stringify(m) !== JSON.stringify(g.metodos);
    if (!sucio) return true;
    setGuardando(true);
    try {
      await guardarDatosCliente(api, agenteId, {
        ...cuerpoParaGuardar(p, e),
        herramientas_del_agente: h,
        metodos_entrega: m,
      });
      setGuardado({ estado: e, herramientas: h, metodos: m });
      return true;
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 422 && CODIGOS_DESACTUALIZADOS.has(err.code)) {
        setError(TEXTO_DESACTUALIZADO);
        setPolitica(null);
        setGuardado(null);
        setIntento((n) => n + 1);
        return false;
      }
      if (err instanceof AdminApiError && err.code === "metodos_entrega_vacios") setErrorDeMetodos(TEXTO_SIN_METODOS);
      setError(err instanceof AdminApiError ? mensajeDeErrorAlGuardar(err.status, err.message) : TEXTO_SIN_CONEXION);
      return false;
    } finally {
      setGuardando(false);
    }
  }, [api, agenteId]);

  useEffect(() => {
    registrarGuardar(guardar);
    return () => registrarGuardar(null);
  }, [guardar, registrarGuardar]);

  if (errorDeCarga) {
    return (
      <View style={styles.estacion} testID="estacion-datos-cliente">
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
          {errorDeCarga}
        </Text>
        <Button
          variant="secondary"
          iconLeft="refresh"
          onPress={() => {
            setErrorDeCarga(null);
            setIntento((n) => n + 1);
          }}
          testID="datos-cliente-recargar"
        >
          Reintentar
        </Button>
      </View>
    );
  }
  if (!politica) return <ActivityIndicator testID="datos-cliente-cargando" />;

  function tocar() {
    setError(null);
  }

  return (
    <View style={styles.estacion} testID="estacion-datos-cliente">
      <DatosDelClienteDelAgente
        politica={politica}
        estado={estado}
        herramientas={herramientas}
        metodos={metodos}
        deshabilitado={guardando}
        errorDeMetodos={errorDeMetodos}
        onNivel={(accionId, clave, nivel) => {
          tocar();
          setEstado((e) => conNivel(politica, e, accionId, clave, nivel));
        }}
        onRestablecer={(accionId) => {
          tocar();
          setEstado((e) => restablecida(politica, e, accionId));
        }}
        onCuantoPregunta={(nivel) => {
          tocar();
          setEstado((e) => conCuantoPregunta(politica, e, nivel));
        }}
        onUsarRecomendado={() => {
          tocar();
          setEstado((e) => alPorDefecto(politica, e));
        }}
        onHerramientas={(activo) => {
          tocar();
          setHerramientas(activo);
        }}
        onMetodo={(metodo, activo) => {
          tocar();
          setErrorDeMetodos(null);
          setMetodos((m) => conMetodo(m, metodo, activo));
        }}
      />
      {error ? (
        <View
          style={[
            styles.error,
            {
              borderColor: tonos.danger.border,
              backgroundColor: tonos.danger.bg,
            },
          ]}
          testID="datos-cliente-error"
          accessibilityLiveRegion="assertive"
          onLayout={alMedirError}
        >
          <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
            {error}
          </Text>
          <Button
            variant="secondary"
            iconLeft="refresh"
            onPress={onSeguir}
            disabled={guardando}
            testID="datos-cliente-reintentar"
          >
            Reintentar
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  estacion: { gap: shSpace[4] },
  error: {
    gap: shSpace[3],
    padding: shSpace[4],
    borderWidth: 1,
    borderRadius: shRadius.md,
  },
});
