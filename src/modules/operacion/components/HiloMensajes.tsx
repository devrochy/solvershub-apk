import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, useKit } from "@shared/ui";
import type { MessageItem } from "../api";
import { formatearDia } from "../presentacion";
import { BurbujaMensaje } from "./BurbujaMensaje";

type Fila =
  | { tipo: "dia"; clave: string; texto: string }
  | { tipo: "mensaje"; clave: string; mensaje: MessageItem };

/** Mensajes que se pintan de entrada; los anteriores se suman al llegar arriba. */
export const VENTANA_MENSAJES = 60;

/** Ventana final del hilo: los últimos `ventana` mensajes (pura, para pruebas). */
export function ventanaDeMensajes<T>(mensajes: T[], ventana: number): T[] {
  if (ventana <= 0 || mensajes.length <= ventana) return mensajes;
  return mensajes.slice(mensajes.length - ventana);
}

function claveDeDia(mensaje: MessageItem): string {
  const fecha = new Date(mensaje.created_at);
  return Number.isNaN(fecha.getTime()) ? mensaje.created_at.slice(0, 10) : fecha.toDateString();
}

/** Hilo desplazable con separadores de día, auto-scroll al final y carga de anteriores al llegar arriba. */
export function HiloMensajes({ mensajes }: { mensajes: MessageItem[] }) {
  const { c } = useKit();
  const listaRef = useRef<FlatList<Fila>>(null);
  const alFondo = useRef(true);
  const cargandoAnteriores = useRef(false);
  const [ventana, setVentana] = useState(VENTANA_MENSAJES);

  const visibles = useMemo(() => ventanaDeMensajes(mensajes, ventana), [mensajes, ventana]);
  const hayAnteriores = visibles.length < mensajes.length;
  const ultimoId = mensajes.length ? mensajes[mensajes.length - 1].id : null;

  const filas = useMemo(() => {
    const resultado: Fila[] = [];
    let diaAnterior: string | null = null;
    for (const mensaje of visibles) {
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
  }, [visibles]);

  useEffect(() => {
    if (!alFondo.current || filas.length === 0) return;
    const id = requestAnimationFrame(() => listaRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(id);
  }, [ultimoId, filas.length]);

  function cargarAnteriores() {
    if (!hayAnteriores || cargandoAnteriores.current) return;
    cargandoAnteriores.current = true;
    setVentana((actual) => actual + VENTANA_MENSAJES);
    requestAnimationFrame(() => {
      cargandoAnteriores.current = false;
    });
  }

  function alDesplazar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = evento.nativeEvent;
    alFondo.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 96;
    if (contentOffset.y < 80 && hayAnteriores) cargarAnteriores();
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
      maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 10 }}
      accessibilityLiveRegion="polite"
      ListHeaderComponent={
        hayAnteriores ? (
          <View style={styles.mas}>
            <Button
              variant="link"
              size="sm"
              iconLeft="expand-less"
              onPress={cargarAnteriores}
              testID="hilo-mensajes-anteriores"
            >
              Ver mensajes anteriores
            </Button>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.vacio}>
          <Icono name="forum" size={28} color={c.textSoft} />
          <Text style={[shType.dense, { color: c.textSoft }]}>
            Aún no hay mensajes en esta conversación.
          </Text>
        </View>
      }
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
  mas: { alignItems: "center", paddingBottom: shSpace[2] },
  dia: { flexDirection: "row", alignItems: "center", gap: shSpace[2], marginVertical: shSpace[1] },
  linea: { flex: 1, height: 1 },
  diaTexto: { textTransform: "capitalize" },
  vacio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: shSpace[2],
    paddingVertical: shSpace[6],
  },
});
