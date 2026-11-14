import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { useKit } from "@shared/ui";

import { serieDeEvento, type Borrador, type ColorPor, type EventoAgenda, type LeyendaAgenda } from "../domain/agenda";
import { ALTO_HORA, rangoDelDia, snapMinutos, vistaDelDia } from "../domain/layout";
import { aUtcDesdeZona, claveDia, hoyEnZona, minutosAHora, minutosDelDia } from "../domain/zona";
import { EventoArrastrable } from "./EventoArrastrable";

const ANCHO_HORAS = 50;
const DURACION_NUEVA = 30;

function isoDeMinutos(dia: string, minutos: number, zona: string): string {
  const [anio, mes, d] = dia.split("-").map(Number);
  return aUtcDesdeZona(anio, mes, d, Math.floor(minutos / 60), minutos % 60, zona);
}

/** Línea del día: horas, citas y bloqueos con arrastre y redimensionado. */
export function LineaDelDia({
  dia,
  eventos,
  zona,
  colorPor,
  agendas,
  onAbrir,
  onHueco,
  onMover,
  onRedimensionar,
}: {
  dia: string;
  eventos: EventoAgenda[];
  zona: string;
  colorPor: ColorPor;
  agendas: LeyendaAgenda[];
  onAbrir: (evento: EventoAgenda) => void;
  onHueco: (borrador: Borrador) => void;
  onMover: (evento: EventoAgenda, start: string, end: string) => void;
  onRedimensionar: (evento: EventoAgenda, start: string, end: string) => void;
}) {
  const { c } = useKit();
  const scroll = useRef<ScrollViewInstance>(null);
  const [gesto, setGesto] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());
  const delDia = eventos.filter((evento) => {
    const inicio = claveDia(evento.start, zona);
    const finMenosUnMinuto = new Date(new Date(evento.end).getTime() - 60_000).toISOString();
    return inicio <= dia && claveDia(finMenosUnMinuto, zona) >= dia;
  });
  const rango = rangoDelDia(delDia, zona);
  const vista = vistaDelDia(delDia, zona, rango);
  const factor = ALTO_HORA / 60;
  const alto = Math.max(ALTO_HORA, (rango.fin - rango.inicio) * factor);
  const horas = Array.from(
    { length: Math.max(1, Math.ceil((rango.fin - rango.inicio) / 60) + 1) },
    (_, i) => rango.inicio + i * 60,
  ).filter((minuto) => minuto <= rango.fin);

  useEffect(() => {
    const objetivo = Math.max(0, (8 * 60 - rango.inicio) * factor);
    const id = setTimeout(() => scroll.current?.scrollTo({ y: objetivo, animated: false }), 0);
    return () => clearTimeout(id);
  }, [dia, rango.inicio, factor]);

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  function crearEn(y: number) {
    const bruto = rango.inicio + y / factor;
    const inicio = Math.min(
      Math.max(rango.inicio, snapMinutos(bruto)),
      Math.max(rango.inicio, rango.fin - DURACION_NUEVA),
    );
    const fin = Math.min(1440, inicio + DURACION_NUEVA);
    onHueco({ start: isoDeMinutos(dia, inicio, zona), end: isoDeMinutos(dia, fin, zona) });
  }

  const esHoy = dia === hoyEnZona(zona);
  const ahoraMin = esHoy ? minutosDelDia(ahora, zona) : null;
  const ahoraTop = ahoraMin !== null ? (ahoraMin - rango.inicio) * factor : 0;

  return (
    <ScrollView
      ref={scroll}
      testID="agenda-linea"
      scrollEnabled={!gesto}
      style={styles.scroll}
      contentContainerStyle={styles.contenido}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.fila, { height: alto }]}>
        <View style={styles.horas}>
          {horas.map((minuto) => (
            <Text
              key={minuto}
              style={[
                shType.caption,
                styles.hora,
                { top: (minuto - rango.inicio) * factor - 7, color: c.textMuted },
              ]}
            >
              {minutosAHora(minuto)}
            </Text>
          ))}
        </View>

        <View style={styles.pista}>
          <Pressable
            testID="agenda-hueco"
            accessibilityLabel="Hueco de la agenda"
            accessibilityHint="Toca un hueco para crear una cita o un bloqueo."
            onPress={(evento) => {
              if (!gesto) crearEn(evento.nativeEvent.locationY);
            }}
            style={StyleSheet.absoluteFill}
          >
            {horas.map((minuto) => (
              <View
                key={minuto}
                style={[
                  styles.lineaHora,
                  {
                    top: (minuto - rango.inicio) * factor,
                    backgroundColor: c.borderSoft,
                  },
                ]}
              />
            ))}
            {horas.slice(0, -1).map((minuto) => (
              <View
                key={`media-${minuto}`}
                style={[
                  styles.lineaMedia,
                  {
                    top: (minuto - rango.inicio) * factor + ALTO_HORA / 2,
                    backgroundColor: c.borderSoft,
                  },
                ]}
              />
            ))}
          </Pressable>

          {vista.bloques.map((bloque) => (
            <EventoArrastrable
              key={bloque.evento.id}
              vista={bloque}
              dia={dia}
              zona={zona}
              rango={rango}
              serie={null}
              onAbrir={onAbrir}
              onMover={onMover}
              onRedimensionar={onRedimensionar}
              onBloquearScroll={setGesto}
            />
          ))}

          {vista.citas.map((cita) => {
            const agenda = agendas.find((a) => a.id === cita.evento.calendar_id);
            return (
              <EventoArrastrable
                key={cita.evento.id}
                vista={cita}
                dia={dia}
                zona={zona}
                rango={rango}
                serie={serieDeEvento(cita.evento, colorPor)}
                agendaNombre={colorPor === "agenda" ? agenda?.name : undefined}
                onAbrir={onAbrir}
                onMover={onMover}
                onRedimensionar={onRedimensionar}
                onBloquearScroll={setGesto}
              />
            );
          })}

          {ahoraMin !== null && ahoraMin >= rango.inicio && ahoraMin <= rango.fin ? (
            <View pointerEvents="none" style={[styles.ahora, { top: ahoraTop }]}>
              <View style={[styles.ahoraPunto, { backgroundColor: c.statusDangerFg }]} />
              <View style={[styles.ahoraLinea, { backgroundColor: c.statusDangerFg }]} />
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  contenido: { paddingBottom: shSpace[8] },
  fila: { flexDirection: "row" },
  horas: { width: ANCHO_HORAS },
  hora: { position: "absolute", right: shSpace[2] },
  pista: { flex: 1, position: "relative" },
  lineaHora: { position: "absolute", left: 0, right: 0, height: 1, opacity: 0.7 },
  lineaMedia: { position: "absolute", left: 0, right: 0, height: 1, opacity: 0.35 },
  ahora: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center" },
  ahoraPunto: { width: 8, height: 8, borderRadius: 4, marginLeft: -4 },
  ahoraLinea: { flex: 1, height: 2 },
});
