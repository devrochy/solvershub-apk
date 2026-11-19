import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { shSpace } from "@core/theme/tokens";
import type { RegistroDePrueba } from "@shared/carga-de-datos/carga";
import { PasoDatos, type Cargado } from "@shared/carga-de-datos/PasoDatos";
import { PasoLoCargado } from "@shared/carga-de-datos/PasoLoCargado";
import type { PropsDeEstacionDelAgente } from "@shared/ruta/estacion-del-agente";
import { Button } from "@shared/ui";

function resumenDe(registros: readonly RegistroDePrueba[], resumen: string): string {
  if (registros.length > 0) return `${registros.length} ${registros.length === 1 ? "registro cargado" : "registros cargados"}`;
  return resumen || "Sin datos de prueba";
}

/**
 * Estación 4, «Datos para probar» (tableros `rb4`/`rn4`, SPEC-45): generar datos de prueba (solo en test) o el
 * catálogo desde fotos (en Ventas, también fuera de test; el CSV sigue en el panel web). Sin ninguna forma de
 * carga (fuera de test, Agenda, Cobranza y Suscripciones) muestra «Seguir sin datos», que pasa a la estación 5.
 */
export function EstacionDatosParaProbar({ agenteId, registrarGuardar, onResumen, onCargados, onSeguir }: PropsDeEstacionDelAgente) {
  const api = useAdminApi();
  const [cargado, setCargado] = useState<Cargado | null>(null);

  useEffect(() => {
    registrarGuardar(async () => true);
    return () => registrarGuardar(null);
  }, [registrarGuardar]);

  useEffect(() => {
    onResumen("datos-probar", cargado ? resumenDe(cargado.registros, cargado.resumen) : "Sin datos de prueba");
  }, [cargado, onResumen]);

  return (
    <View style={styles.estacion} testID="estacion-datos-probar">
      {cargado ? (
        <>
          <PasoLoCargado
            api={api}
            agenteId={agenteId}
            locales={cargado.registros}
            resumen={cargado.resumen || null}
            onRegistros={onCargados}
          />
          <Button variant="secondary" onPress={() => setCargado(null)} testID="datos-otros">
            Cargar otros datos
          </Button>
        </>
      ) : (
        <PasoDatos
          api={api}
          agenteId={agenteId}
          onCargado={(nuevo) => {
            setCargado(nuevo);
            onCargados(nuevo.registros);
          }}
          onSeguirSinDatos={onSeguir}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ estacion: { gap: shSpace[3] } });
