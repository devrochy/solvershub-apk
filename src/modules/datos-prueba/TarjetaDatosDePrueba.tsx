import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AdminApiError, type ClienteAdmin } from "@core/api/admin";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, useKit } from "@shared/ui";
import {
  borrarDatosDePrueba,
  cargarDatosDePrueba,
  conteoLegible,
  generarDatosDePrueba,
  MODULOS_DE_PRUEBA,
  resumenDelLote,
  type EstadoDatosDePruebaModulo,
  type ModuloDatosDePrueba,
} from "./api";

/**
 * Aviso y acciones de datos de prueba dentro de un módulo (HU-QA-10).
 * La API responde 404 fuera del entorno de test, así que la tarjeta se oculta sola.
 */
export function TarjetaDatosDePrueba({
  api,
  modulo,
  onCambio,
  testID = "datos-prueba",
}: {
  api: ClienteAdmin;
  modulo: ModuloDatosDePrueba;
  onCambio?: () => void;
  testID?: string;
}) {
  const { c } = useKit();
  const [estado, setEstado] = useState<EstadoDatosDePruebaModulo | null>(null);
  const [trabajando, setTrabajando] = useState<"generar" | "borrar" | null>(null);
  const copia = MODULOS_DE_PRUEBA[modulo];

  const cargar = useCallback(async () => {
    try {
      setEstado(await cargarDatosDePrueba(api, modulo));
    } catch {
      setEstado(null);
    }
  }, [api, modulo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: el setState llega después del await
    void cargar();
  }, [cargar]);

  async function generar() {
    if (!estado) return;
    if (estado.falta_descripcion) {
      Alert.alert(
        "Falta la descripción de tu negocio",
        "Los datos de prueba se generan a partir de lo que hace tu negocio. Escríbela en Configuración › Identidad y vuelve a intentarlo.",
      );
      return;
    }
    if (estado.lote) {
      const reemplazar = await new Promise<boolean>((resolve) => {
        Alert.alert(
          `¿Generar datos de prueba nuevos para ${copia.titulo}?`,
          `Se reemplazan los datos anteriores (${conteoLegible(estado.lote!.conteos)}). Lo que creaste a mano no cambia.`,
          [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Generar de nuevo", onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      });
      if (!reemplazar) return;
    }
    setTrabajando("generar");
    try {
      const lote = await generarDatosDePrueba(api, modulo);
      await cargar();
      onCambio?.();
      Alert.alert("Datos de prueba listos", resumenDelLote(lote));
    } catch (e) {
      Alert.alert(
        "No se pudieron generar los datos",
        e instanceof AdminApiError ? e.message : "Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setTrabajando(null);
    }
  }

  async function borrar() {
    if (!estado?.lote) return;
    const confirmado = await new Promise<boolean>((resolve) => {
      Alert.alert(
        `¿Borrar los datos de prueba de ${copia.titulo}?`,
        `Se retiran ${conteoLegible(estado.lote!.conteos)}. Lo que creaste a mano no cambia.`,
        [
          { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
          { text: "Borrar", style: "destructive", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmado) return;
    setTrabajando("borrar");
    try {
      await borrarDatosDePrueba(api, modulo);
      await cargar();
      onCambio?.();
      Alert.alert("Datos de prueba borrados", "El módulo quedó como estaba antes.");
    } catch (e) {
      Alert.alert(
        "No se pudieron borrar los datos",
        e instanceof AdminApiError ? e.message : "Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setTrabajando(null);
    }
  }

  if (!estado?.disponible) return null;

  return (
    <View
      testID={testID}
      style={[styles.tarjeta, { borderColor: c.border, backgroundColor: c.surface }]}
    >
      <View style={styles.cabecera}>
        <Icono name="auto-awesome" size={20} color={c.link} />
        <Text style={[shType.label, { color: c.text, flex: 1 }]}>
          Datos de prueba de {copia.titulo}
        </Text>
      </View>
      <Text style={[shType.body, { color: c.textMuted }]}>{copia.descripcion}</Text>
      <Text style={[shType.caption, { color: c.textSoft }]}>{copia.aviso}</Text>
      {estado.lote ? (
        <Text style={[shType.caption, { color: c.textSoft }]}>
          Último lote: {conteoLegible(estado.lote.conteos)}.
        </Text>
      ) : null}
      <View style={styles.acciones}>
        {estado.lote ? (
          <Button
            variant="ghost"
            size="sm"
            iconLeft="delete-outline"
            onPress={() => void borrar()}
            loading={trabajando === "borrar"}
            disabled={trabajando !== null}
            testID={`${testID}-borrar`}
          >
            Borrar datos de prueba
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          iconLeft="auto-awesome"
          onPress={() => void generar()}
          loading={trabajando === "generar"}
          disabled={trabajando !== null}
          testID={`${testID}-generar`}
        >
          {trabajando === "generar" ? "Generando…" : "Generar datos de prueba"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[3],
    gap: shSpace[2],
  },
  cabecera: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
});
