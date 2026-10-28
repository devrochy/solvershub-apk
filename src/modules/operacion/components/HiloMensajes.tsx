import { useEffect, useMemo, useRef } from "react";
import { FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { useKit } from "@shared/ui";
import type { MessageItem } from "../api";
import { formatearDia } from "../presentacion";
import { BurbujaMensaje } from "./BurbujaMensaje";

type Fila =
  | { tipo: "dia"; clave: string; texto: string }
  | { tipo: "mensaje"; clave: string; mensaje: MessageItem };

function claveDeDia(mensaje: MessageItem): string {
  const fecha = new Date(mensaje.created_at);
  return Number.isNaN(fecha.getTime()) ? mensaje.created_at.slice(0, 10) : fecha.toDateString();
}

/** Hilo desplazable con separadores de día y auto-scroll cuando la persona está al final. */
export function HiloMensajes({ mensajes }: { mensajes: MessageItem[] }) {
  const { c } = useKit();
  const listaRef = useRef<FlatList<Fila>>(null);
  const alFondo = useRef(true);

  const filas = useMemo(() => {
    const resultado: Fila[] = [];
    let diaAnterior: string | null = null;
    for (const mensaje of mensajes) {
      const dia = claveDeDia(mensaje);
      if (dia !== diaAnterior) {
        resultado.push({
          tipo: "dia",
          clave: `dia-${dia}`,
          texto: formatearDia(mensaje.created_at),
        });
        diaAnterior = dia;
      }
      resultado.push({ tipo: "mensaje", clave: mensaje.id, mensaje });
    }
    return resultado;
  }, [mensajes]);

  useEffect(() => {
    if (!alFondo.current || filas.length === 0) return;
    const id = requestAnimationFrame(() => listaRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(id);
  }, [filas.length]);

  function alDesplazar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = evento.nativeEvent;
    alFondo.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 96;
  }

  return (
    <FlatList
      ref={listaRef}
      testID="hilo-mensajes"
      data={filas}
      keyExtractor={(fila) => fila.clave}
      contentContainerStyle={styles.hilo}
      keyboardShouldPersistTaps="handled"
      onScroll={alDesplazar}
      scrollEventThrottle={16}
      accessibilityLiveRegion="polite"
      ListEmptyComponent={<Text style={[shType.dense, { color: c.textSoft }]}>Sin mensajes.</Text>}
      ItemSeparatorComponent={() => <View style={{ height: shSpace[2] }} />}
      renderItem={({ item }) =>
        item.tipo === "dia" ? (
          <View style={styles.dia}>
            <View style={[styles.linea, { backgroundColor: c.borderSoft }]} />
            <Text style={[shType.caption, styles.diaTexto, { color: c.textSoft }]}>{item.texto}</Text>
            <View style={[styles.linea, { backgroundColor: c.borderSoft }]} />
          </View>
        ) : (
          <BurbujaMensaje mensaje={item.mensaje} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  hilo: { paddingHorizontal: shSpace[4], paddingVertical: shSpace[4], flexGrow: 1 },
  dia: { flexDirection: "row", alignItems: "center", gap: shSpace[2], marginVertical: shSpace[1] },
  linea: { flex: 1, height: 1 },
  diaTexto: { textTransform: "capitalize" },
});
