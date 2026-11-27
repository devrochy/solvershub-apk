import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { useTheme } from "@core/theme/theme-context";
import { Icono } from "@shared/ui";

import { DIAS_FRANJA, erroresDeFranjas, type Franja } from "../horarioAtencion";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
const SEMANA_POR_DEFECTO: Franja[] = [
  ...[0, 1, 2, 3, 4].map((day) => ({ day, from: "08:00", to: "18:00" })),
  { day: 5, from: "08:00", to: "13:00" },
];

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

function aHHMM(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

function sumar(hhmm: string, minutos: number): string | null {
  const base = aMinutos(hhmm);
  if (base === null) return null;
  const total = base + minutos;
  return total < 24 * 60 ? aHHMM(total) : null;
}

function aDate(hhmm: string): Date {
  const [horas, minutos] = hhmm.split(":").map(Number);
  const fecha = new Date(2000, 0, 1, 0, 0, 0, 0);
  fecha.setHours(horas || 0, minutos || 0, 0, 0);
  return fecha;
}

function etiquetaHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${sufijo}`;
}

function diasLegibles(dias: number[]): string {
  if (dias.length === 7) return "Todos los días";
  const tramos: number[][] = [];
  for (const dia of dias) {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && dia === ultimo[ultimo.length - 1] + 1) ultimo.push(dia);
    else tramos.push([dia]);
  }
  return tramos
    .map((t) =>
      t.length === 1
        ? DIAS_FRANJA[t[0]]
        : t.length === 2
          ? `${DIAS_FRANJA[t[0]]} y ${DIAS_FRANJA[t[1]]}`
          : `${DIAS_FRANJA[t[0]]} a ${DIAS_FRANJA[t[t.length - 1]]}`,
    )
    .join(", ");
}

function resumenSemana(franjas: Franja[], errorPorDia: Map<number, string>): string {
  if (franjas.length === 0) return "Siempre abierto, sin horario.";

  const grupos: { clave: string; dias: number[]; franjas: Franja[] }[] = [];
  for (let day = 0; day < 7; day++) {
    const delDia = franjas
      .filter((f) => f.day === day)
      .sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
    const clave = errorPorDia.has(day)
      ? "error"
      : delDia.length
        ? delDia.map((f) => `${f.from}-${f.to}`).join("|")
        : "cerrado";
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.clave === clave) ultimo.dias.push(day);
    else grupos.push({ clave, dias: [day], franjas: delDia });
  }

  return grupos
    .map(({ clave, dias, franjas: delGrupo }) => {
      if (clave === "error") return `${diasLegibles(dias)}, revisar`;
      if (clave === "cerrado") return `${dias.length === 7 ? "Todos los días" : diasLegibles(dias)} cerrado`;
      const horas = delGrupo.map((f) => `${etiquetaHora(f.from)} – ${etiquetaHora(f.to)}`).join(" y ");
      return `${diasLegibles(dias)}, ${horas}`;
    })
    .join(" · ");
}

function resumenDia(franjas: Franja[], error?: string): string {
  if (!franjas.length) return "Cerrado";
  if (error) return "Revisa el horario";
  return franjas.map((f) => `${etiquetaHora(f.from)} – ${etiquetaHora(f.to)}`).join(", ");
}

function horasSemana(franjas: Franja[]): string {
  const minutos = franjas.reduce((total, f) => {
    const desde = aMinutos(f.from) ?? 0;
    const hasta = aMinutos(f.to) ?? 0;
    return total + Math.max(0, hasta - desde);
  }, 0);
  const horas = minutos / 60;
  return `${Number.isInteger(horas) ? horas : horas.toFixed(1)} h`;
}

function SelectorHora({
  label,
  valor,
  onChange,
  disabled,
  testID,
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const { colores } = useTheme();
  const [abierto, setAbierto] = useState(false);

  function abrir() {
    if (disabled) return;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: aDate(valor),
        mode: "time",
        is24Hour: false,
        onChange: (evento, fecha) => {
          if (evento.type === "set" && fecha) onChange(aHHMM(fecha.getHours() * 60 + fecha.getMinutes()));
        },
      });
      return;
    }
    setAbierto((v) => !v);
  }

  return (
    <View style={styles.selector}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${etiquetaHora(valor)}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={abrir}
        style={[
          styles.hora,
          {
            borderColor: colores.borde,
            backgroundColor: colores.tarjeta,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Icono name="schedule" size={16} color={colores.textoSuave} />
        <Text style={[shType.body, styles.horaTexto, { color: colores.texto }]} numberOfLines={1}>
          {etiquetaHora(valor)}
        </Text>
        <Icono name="expand-more" size={16} color={colores.textoSuave} />
      </Pressable>
      {abierto && Platform.OS === "ios" ? (
        <View style={[styles.ios, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
          <DateTimePicker
            value={aDate(valor)}
            mode="time"
            display="spinner"
            locale="es-CO"
            onChange={(_, fecha) => {
              if (fecha) onChange(aHHMM(fecha.getHours() * 60 + fecha.getMinutes()));
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setAbierto(false)}
            style={styles.listo}
          >
            <Text style={[shType.label, { color: colores.acento }]}>Listo</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Horario de atención minimalista de Ajustes (CFG-01): la semana es una lista de siete días y solo
 * el día abierto muestra los selectores de hora. El resumen y la barra de 24 h se actualizan al
 * instante. Los índices son los del backend (0 = lunes).
 */
export function HorarioSemanal({
  id,
  franjas,
  onChange,
  modoInformativo = false,
  disabled = false,
}: {
  id: string;
  franjas: Franja[];
  onChange: (franjas: Franja[]) => void;
  /** `business_hours_mode=informativo`: el asistente atiende siempre y el horario solo se informa. */
  modoInformativo?: boolean;
  disabled?: boolean;
}) {
  const { colores } = useTheme();
  const [diaAbierto, setDiaAbierto] = useState<number | null>(() => erroresDeFranjas(franjas)[0]?.day ?? null);
  const [copiaAnterior, setCopiaAnterior] = useState<Franja[] | null>(null);
  const ultimas = useRef<Franja[]>(SEMANA_POR_DEFECTO);

  const errores = erroresDeFranjas(franjas);
  const errorPorDia = new Map(errores.map((error) => [error.day, error.message]));
  const siempre = franjas.length === 0;
  const diasAbiertos = new Set(franjas.map((f) => f.day)).size;

  function actualizar(nuevas: Franja[]) {
    setCopiaAnterior(null);
    onChange(nuevas);
  }

  function setSiempre(abierto: boolean) {
    if (abierto) {
      if (franjas.length) ultimas.current = franjas;
      onChange([]);
      setDiaAbierto(null);
      setCopiaAnterior(null);
      return;
    }
    onChange(ultimas.current.length ? ultimas.current : SEMANA_POR_DEFECTO);
  }

  function abrirDia(day: number, abierto: boolean) {
    if (abierto) {
      actualizar([...franjas, { day, from: "08:00", to: "18:00" }]);
      setDiaAbierto(day);
      return;
    }
    if (!modoInformativo && diasAbiertos <= 1) return;
    actualizar(franjas.filter((f) => f.day !== day));
    if (diaAbierto === day) setDiaAbierto(null);
  }

  function cambiarFranja(indice: number, cambio: Partial<Franja>) {
    actualizar(franjas.map((f, i) => (i === indice ? { ...f, ...cambio } : f)));
  }

  function quitarFranja(indice: number) {
    actualizar(franjas.filter((_, i) => i !== indice));
  }

  function puedeAgregar(day: number): boolean {
    const delDia = franjas
      .filter((f) => f.day === day)
      .sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
    const ultima = delDia[delDia.length - 1];
    if (!ultima) return false;
    const inicio = sumar(ultima.to, (aMinutos(ultima.to) ?? 0) < 13 * 60 ? 120 : 60);
    return inicio !== null && (aMinutos(inicio) ?? 0) < 23 * 60;
  }

  function agregarFranja(day: number) {
    const delDia = franjas
      .filter((f) => f.day === day)
      .sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
    const ultima = delDia[delDia.length - 1];
    if (!ultima) return;
    const inicio = sumar(ultima.to, (aMinutos(ultima.to) ?? 0) < 13 * 60 ? 120 : 60);
    if (!inicio || (aMinutos(inicio) ?? 0) >= 23 * 60) return;
    const fin = sumar(inicio, 4 * 60) ?? "23:30";
    actualizar([...franjas, { day, from: inicio, to: fin }]);
  }

  function copiarLunes() {
    const lunes = franjas.filter((f) => f.day === 0);
    if (!lunes.length) return;
    const antes = franjas;
    const resto = franjas.filter((f) => f.day < 1 || f.day > 4);
    const nuevas = [...resto, ...[1, 2, 3, 4].flatMap((day) => lunes.map((f) => ({ ...f, day })))];
    setCopiaAnterior(antes);
    onChange(nuevas);
  }

  function deshacerCopia() {
    if (!copiaAnterior) return;
    onChange(copiaAnterior);
    setCopiaAnterior(null);
  }

  const resumen = siempre && modoInformativo ? "Sin horario para informar." : resumenSemana(franjas, errorPorDia);

  return (
    <View style={styles.contenedor}>
      <View style={styles.cabecera}>
        <Text style={[shType.caption, { color: colores.textoSuave }]}>Así queda tu semana</Text>
        {modoInformativo ? (
          <Text style={[shType.caption, { color: colores.textoSuave }]}>El asistente responde siempre</Text>
        ) : (
          <View style={styles.siempre}>
            <Text style={[shType.caption, { color: colores.texto }]}>Atiende siempre</Text>
            <Switch
              testID={`${id}-siempre`}
              value={siempre}
              disabled={disabled}
              onValueChange={setSiempre}
              accessibilityLabel="Atiende siempre"
              trackColor={{ false: colores.borde, true: colores.acento }}
              thumbColor={colores.tarjeta}
            />
          </View>
        )}
      </View>

      <View style={styles.resumenFila}>
        <Text
          accessibilityLiveRegion="polite"
          style={[shType.body, styles.resumen, { color: colores.texto }]}
        >
          {resumen}
        </Text>
        {!siempre ? (
          <Text style={[shType.caption, { color: colores.textoSuave }]}>{horasSemana(franjas)}</Text>
        ) : null}
      </View>

      {siempre ? (
        modoInformativo ? (
          <View style={[styles.nota, { borderColor: colores.borde, backgroundColor: colores.activoSuave }]}>
            <Text style={[shType.caption, styles.notaTexto, { color: colores.textoSuave }]}>
              El asistente responde siempre. No hay horario para informar a tus clientes.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={() => onChange(SEMANA_POR_DEFECTO)}
              style={styles.accion}
            >
              <Text style={[shType.label, { color: colores.acento }]}>Definir horario</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[shType.caption, styles.notaTexto, { color: colores.textoSuave }]}>
            El asistente responde a toda hora. Para definir franjas, apaga «Atiende siempre».
          </Text>
        )
      ) : (
        <>
          {modoInformativo ? (
            <Text style={[shType.caption, styles.notaTexto, { color: colores.textoSuave }]}>
              El asistente responde siempre; este horario se usa para informar a tus clientes.
            </Text>
          ) : null}

          <View
            style={styles.semana}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View style={styles.ticksFila}>
              <View style={styles.diaEtiqueta} />
              <View style={styles.ticks}>
                {["0", "6", "12", "18", "24"].map((tick) => (
                  <Text key={tick} style={[styles.tick, { color: colores.textoSuave }]}>
                    {tick}
                  </Text>
                ))}
              </View>
            </View>
            {DIAS.map((nombre, day) => {
              const delDia = franjas.filter((f) => f.day === day);
              const error = errorPorDia.get(day);
              return (
                <View key={day} style={styles.semanaFila}>
                  <Text style={[styles.diaEtiqueta, styles.diaCorto, { color: colores.textoSuave }]}>
                    {DIAS_FRANJA[day]}
                  </Text>
                  <View style={[styles.pista, { backgroundColor: colores.activoSuave }]}>
                    {error ? (
                      <View style={[styles.invalido, { borderColor: colores.peligro }]}>
                        <Text style={[styles.pistaTexto, { color: colores.peligro }]}>Revisa</Text>
                      </View>
                    ) : delDia.length === 0 ? (
                      <View style={styles.cerrado}>
                        <Text style={[styles.pistaTexto, { color: colores.textoSuave }]}>Cerrado</Text>
                      </View>
                    ) : (
                      delDia.map((f, i) => {
                        const desde = aMinutos(f.from) ?? 0;
                        const hasta = aMinutos(f.to) ?? desde;
                        return (
                          <View
                            key={`${nombre}-${i}`}
                            style={[
                              styles.bloque,
                              {
                                left: `${(desde / (24 * 60)) * 100}%`,
                                width: `${Math.max(0.5, ((hasta - desde) / (24 * 60)) * 100)}%`,
                                borderColor: colores.acento,
                                backgroundColor: colores.acento,
                              },
                            ]}
                          />
                        );
                      })
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.lista}>
            {DIAS.map((nombre, day) => {
              const delDia = franjas
                .map((f, i) => ({ ...f, i }))
                .filter((f) => f.day === day)
                .sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
              const abierto = delDia.length > 0;
              const error = errorPorDia.get(day);
              const texto = resumenDia(delDia, error);
              const ultimoAbierto = !modoInformativo && abierto && diasAbiertos === 1;
              return (
                <View key={day}>
                  <View
                    style={[
                      styles.diaFila,
                      { borderColor: colores.borde },
                      abierto && diaAbierto === day && { backgroundColor: colores.activoSuave },
                    ]}
                  >
                    {abierto ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${nombre}: ${texto}; Editar el horario`}
                        accessibilityState={{ expanded: diaAbierto === day, disabled }}
                        disabled={disabled}
                        onPress={() => setDiaAbierto(diaAbierto === day ? null : day)}
                        style={({ pressed }) => [styles.diaBoton, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={[styles.diaNombre, { color: colores.texto }]}>{nombre}</Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.diaResumen,
                            { color: error ? colores.peligro : colores.textoSuave },
                          ]}
                        >
                          {texto}
                        </Text>
                        <Icono
                          name={diaAbierto === day ? "expand-less" : "expand-more"}
                          size={18}
                          color={colores.textoSuave}
                        />
                      </Pressable>
                    ) : (
                      <View style={styles.diaBoton}>
                        <Text style={[styles.diaNombre, { color: colores.texto }]}>{nombre}</Text>
                        <Text style={[styles.diaResumen, { color: colores.textoSuave }]}>Cerrado</Text>
                        <View style={styles.chevronVacio} />
                      </View>
                    )}
                    <Switch
                      testID={`${id}-${day}-abierto`}
                      value={abierto}
                      disabled={disabled || ultimoAbierto}
                      onValueChange={(valor) => abrirDia(day, valor)}
                      accessibilityLabel={`Abierto el ${nombre.toLowerCase()}`}
                      trackColor={{ false: colores.borde, true: colores.acento }}
                      thumbColor={colores.tarjeta}
                    />
                  </View>

                  {abierto && diaAbierto === day ? (
                    <View style={[styles.editor, { backgroundColor: colores.activoSuave, borderColor: colores.borde }]}>
                      {delDia.map((franja, k) => (
                        <View key={franja.i} style={styles.franjaFila}>
                          <SelectorHora
                            label={`${nombre}: abre`}
                            valor={franja.from}
                            disabled={disabled}
                            testID={`${id}-${day}-${franja.i}-desde`}
                            onChange={(valor) => cambiarFranja(franja.i, { from: valor })}
                          />
                          <Text style={{ color: colores.textoSuave }}>–</Text>
                          <SelectorHora
                            label={`${nombre}: cierra`}
                            valor={franja.to}
                            disabled={disabled}
                            testID={`${id}-${day}-${franja.i}-hasta`}
                            onChange={(valor) => cambiarFranja(franja.i, { to: valor })}
                          />
                          {k > 0 ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Quitar la franja ${k + 1} del ${nombre.toLowerCase()}`}
                              disabled={disabled}
                              onPress={() => quitarFranja(franja.i)}
                              style={styles.quitar}
                            >
                              <Icono name="close" size={18} color={colores.textoSuave} />
                            </Pressable>
                          ) : null}
                        </View>
                      ))}

                      <View style={styles.acciones}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={disabled || !puedeAgregar(day)}
                          onPress={() => agregarFranja(day)}
                          style={styles.accion}
                        >
                          <Icono name="add" size={16} color={colores.acento} />
                          <Text style={[shType.caption, { color: colores.acento }]}>Otra franja</Text>
                        </Pressable>
                        {day === 0 ? (
                          <Pressable
                            accessibilityRole="button"
                            disabled={disabled}
                            onPress={copiarLunes}
                            style={styles.accion}
                          >
                            <Text style={[shType.caption, { color: colores.acento }]}>
                              Copiar a martes–viernes
                            </Text>
                          </Pressable>
                        ) : null}
                        {day === 0 && copiaAnterior ? (
                          <Pressable
                            accessibilityRole="button"
                            disabled={disabled}
                            onPress={deshacerCopia}
                            style={styles.accion}
                          >
                            <Text style={[shType.caption, { color: colores.acento }]}>Deshacer</Text>
                          </Pressable>
                        ) : null}
                      </View>

                      {error ? (
                        <Text accessibilityRole="alert" style={[shType.caption, { color: colores.peligro }]}>
                          {error}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {!modoInformativo && diasAbiertos === 1 && !disabled ? (
            <Text style={[shType.caption, { color: colores.textoSuave }]}>
              Deja al menos un día abierto. Para no tener horario, activa «Atiende siempre».
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[3] },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: shSpace[2],
  },
  siempre: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  resumenFila: { flexDirection: "row", alignItems: "baseline", gap: shSpace[2] },
  resumen: { flex: 1 },
  semana: { gap: 2 },
  ticksFila: { flexDirection: "row", alignItems: "center", gap: shSpace[2], marginBottom: 2 },
  ticks: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  tick: { fontFamily: shType.mono.fontFamily, fontSize: 9 },
  semanaFila: { flexDirection: "row", alignItems: "center", gap: shSpace[2], minHeight: 18 },
  diaEtiqueta: { width: 32 },
  diaCorto: { fontFamily: shType.label.fontFamily, fontSize: 10, fontWeight: "600" },
  pista: {
    flex: 1,
    height: 10,
    borderRadius: 3,
    overflow: "hidden",
  },
  bloque: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderWidth: 1,
    borderRadius: 2,
    opacity: 0.35,
  },
  cerrado: { flex: 1, justifyContent: "center", paddingLeft: 6 },
  invalido: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 6,
    borderWidth: 1,
    borderRadius: 3,
  },
  pistaTexto: { fontSize: 8 },
  lista: { borderTopWidth: StyleSheet.hairlineWidth },
  diaFila: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: shDensity.controlLg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  diaBoton: {
    flex: 1,
    minHeight: shDensity.controlLg,
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    paddingHorizontal: shSpace[3],
  },
  diaNombre: { width: 80, fontSize: 13, fontWeight: "600" },
  diaResumen: { flex: 1, fontSize: 13 },
  chevronVacio: { width: 18 },
  editor: {
    paddingHorizontal: shSpace[3],
    paddingBottom: shSpace[3],
    paddingTop: shSpace[2],
    gap: shSpace[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  franjaFila: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[2] },
  selector: { flex: 1, gap: 4 },
  hora: {
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.sm,
    paddingHorizontal: shSpace[2],
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
  },
  horaTexto: { flex: 1, fontSize: 13 },
  ios: {
    borderWidth: 1,
    borderRadius: shRadius.sm,
    padding: shSpace[2],
    gap: shSpace[2],
    alignItems: "flex-end",
  },
  listo: { minHeight: 44, justifyContent: "center", paddingHorizontal: shSpace[2] },
  quitar: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  acciones: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: shSpace[3] },
  accion: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 },
  nota: {
    borderWidth: 1,
    borderRadius: shRadius.sm,
    padding: shSpace[3],
    gap: shSpace[2],
  },
  notaTexto: { lineHeight: 18 },
});
