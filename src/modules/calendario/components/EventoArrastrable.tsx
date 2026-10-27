import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { conAlfa } from "@core/theme/alpha";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { useKit } from "@shared/ui";

import { tituloDeEvento, type EventoAgenda } from "../domain/agenda";
import {
  ALTO_HORA,
  moverRango,
  redimensionarRango,
  snapMinutos,
  type RangoDia,
  type VistaEvento,
} from "../domain/layout";
import { aUtcDesdeZona, horaDe } from "../domain/zona";

function isoDeMinutos(dia: string, minutos: number, zona: string): string {
  const [anio, mes, d] = dia.split("-").map(Number);
  return aUtcDesdeZona(anio, mes, d, Math.floor(minutos / 60), minutos % 60, zona);
}

/** Rayado diagonal de los bloqueos, dibujado con vistas (sin gradientes). */
function Rayado({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 14 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.raya,
            {
              backgroundColor: conAlfa(color, 0.18),
              top: i * 28 - 30,
              left: -20,
              transform: [{ rotate: "45deg" }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Cita o bloqueo en la línea del día (HU-CAL-08). Tocar abre la hoja; mantener
 * presionado permite mover y el asa inferior redimensionar. El horario también
 * se puede editar en la hoja (alternativa accesible a los gestos).
 */
export function EventoArrastrable({
  vista,
  dia,
  zona,
  rango,
  serie,
  agendaNombre,
  onAbrir,
  onMover,
  onRedimensionar,
  onBloquearScroll,
}: {
  vista: VistaEvento;
  dia: string;
  zona: string;
  rango: RangoDia;
  serie: 1 | 2 | 3 | 4 | null;
  agendaNombre?: string;
  onAbrir: (evento: EventoAgenda) => void;
  onMover: (evento: EventoAgenda, start: string, end: string) => void;
  onRedimensionar: (evento: EventoAgenda, start: string, end: string) => void;
  onBloquearScroll: (bloqueado: boolean) => void;
}) {
  const { c } = useKit();
  const [modo, setModo] = useState<null | "mover" | "redimensionar">(null);
  const [delta, setDelta] = useState(0);
  const modoRef = useRef<null | "mover" | "redimensionar">(null);
  const deltaRef = useRef(0);
  const movidoRef = useRef(false);
  const largoRef = useRef(false);
  const esBloqueo = vista.evento.kind === "block";
  const color = serie ? [c.dataCat1, c.dataCat2, c.dataCat3, c.dataCat4][serie - 1] : c.borderStrong;

  const fijarModo = useCallback(
    (siguiente: null | "mover" | "redimensionar") => {
      modoRef.current = siguiente;
      setModo(siguiente);
      onBloquearScroll(siguiente !== null);
      if (siguiente === null) {
        deltaRef.current = 0;
        setDelta(0);
      }
    },
    [onBloquearScroll],
  );

  const visual = useMemo(() => {
    if (modo === "mover") return moverRango(vista.inicio, vista.fin, delta, rango);
    if (modo === "redimensionar") return redimensionarRango(vista.inicio, vista.fin, delta, rango);
    return { inicio: vista.inicio, fin: vista.fin };
  }, [modo, delta, vista.inicio, vista.fin, rango]);

  const factor = ALTO_HORA / 60;
  const top = (visual.inicio - rango.inicio) * factor;
  const height = Math.max(18, (visual.fin - visual.inicio) * factor - 2);

  const mover = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- el PanResponder lee refs solo en eventos del gesto
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: () => modoRef.current === "mover",
        onPanResponderMove: (_, gesto) => {
          movidoRef.current = true;
          const siguiente = snapMinutos((gesto.dy / ALTO_HORA) * 60);
          deltaRef.current = siguiente;
          setDelta(siguiente);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          if (modoRef.current === "mover" && movidoRef.current) {
            const nuevo = moverRango(vista.inicio, vista.fin, deltaRef.current, rango);
            onMover(
              vista.evento,
              isoDeMinutos(dia, nuevo.inicio, zona),
              isoDeMinutos(dia, nuevo.fin, zona),
            );
          } else if (modoRef.current === "mover") {
            onAbrir(vista.evento);
          }
          movidoRef.current = false;
          fijarModo(null);
        },
        onPanResponderTerminate: () => {
          movidoRef.current = false;
          fijarModo(null);
        },
      }),
    [vista, rango, dia, zona, onMover, onAbrir, fijarModo],
  );

  const redimensionar = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- el PanResponder lee refs solo en eventos del gesto
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          movidoRef.current = true;
          fijarModo("redimensionar");
        },
        onPanResponderMove: (_, gesto) => {
          const siguiente = snapMinutos((gesto.dy / ALTO_HORA) * 60);
          deltaRef.current = siguiente;
          setDelta(siguiente);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          const nuevo = redimensionarRango(vista.inicio, vista.fin, deltaRef.current, rango);
          onRedimensionar(
            vista.evento,
            isoDeMinutos(dia, nuevo.inicio, zona),
            isoDeMinutos(dia, nuevo.fin, zona),
          );
          movidoRef.current = false;
          fijarModo(null);
        },
        onPanResponderTerminate: () => {
          movidoRef.current = false;
          fijarModo(null);
        },
      }),
    [vista, rango, dia, zona, onRedimensionar, fijarModo],
  );

  const titulo = tituloDeEvento(vista.evento);
  const hora = `${horaDe(vista.evento.start, zona)}–${horaDe(vista.evento.end, zona)}`;
  const detalle = [hora, agendaNombre].filter(Boolean).join(" · ");
  const compacto = height < 38;

  return (
    <View
      testID={`agenda-evento-${vista.evento.id}`}
      {...mover.panHandlers}
      style={[
        styles.contenedor,
        {
          top,
          height,
          left: `${vista.izquierda * 100}%`,
          width: `${vista.ancho * 100}%`,
          zIndex: modo ? 20 : esBloqueo ? 1 : 2,
          elevation: modo ? 10 : 0,
          opacity: modo ? 0.9 : 1,
        },
      ]}
    >
      <Pressable
        testID={`agenda-evento-abrir-${vista.evento.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${esBloqueo ? "Bloqueo" : "Cita"}: ${titulo}. ${detalle}`}
        accessibilityHint="Toca para abrir. Mantén presionado para mover."
        delayLongPress={300}
        onPress={() => {
          if (largoRef.current) {
            largoRef.current = false;
            return;
          }
          onAbrir(vista.evento);
        }}
        onLongPress={() => {
          largoRef.current = true;
          fijarModo("mover");
        }}
        onPressOut={() => {
          // `onPress` puede llegar después de `onPressOut`: se deja pasar el turno
          // para que un toque largo sin arrastre no abra la hoja dos veces.
          setTimeout(() => {
            largoRef.current = false;
          }, 500);
        }}
        style={[
          styles.caja,
          esBloqueo
            ? {
                backgroundColor: c.surface2,
                borderColor: c.borderStrong,
                borderStyle: "dashed",
                borderWidth: 1,
              }
            : {
                backgroundColor: conAlfa(color, 0.16),
                borderLeftColor: color,
                borderLeftWidth: 4,
              },
          modo ? { borderColor: c.focus, borderWidth: 2 } : null,
        ]}
      >
        {esBloqueo ? <Rayado color={c.textMuted} /> : null}
        <Text
          numberOfLines={1}
          style={[shType.caption, styles.titulo, { color: esBloqueo ? c.textMuted : c.text }]}
        >
          {esBloqueo ? `Bloqueo · ${vista.evento.title || "Sin motivo"}` : titulo}
        </Text>
        {!compacto ? (
          <Text numberOfLines={1} style={[shType.caption, styles.detalle, { color: c.textMuted }]}>
            {detalle}
          </Text>
        ) : null}
      </Pressable>

      {!esBloqueo ? (
        <View
          testID={`agenda-resize-${vista.evento.id}`}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
          {...redimensionar.panHandlers}
          style={styles.asa}
        >
          <View style={[styles.asaLinea, { backgroundColor: c.borderStrong }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: "absolute", paddingRight: 2 },
  caja: {
    flex: 1,
    borderRadius: shRadius.sm,
    paddingHorizontal: shSpace[2],
    paddingVertical: 2,
    overflow: "hidden",
    gap: 1,
  },
  titulo: { fontFamily: shType.label.fontFamily, fontSize: 12, lineHeight: 15 },
  detalle: { fontSize: 10, lineHeight: 12 },
  raya: { position: "absolute", width: 90, height: 3, borderRadius: 2 },
  asa: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 18,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  asaLinea: { width: 24, height: 3, borderRadius: 2, marginBottom: 2, opacity: 0.7 },
});
