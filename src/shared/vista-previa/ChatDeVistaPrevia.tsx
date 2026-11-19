import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Chip, Icono, useKit, useReduceMotion } from "@shared/ui";
import type { EstacionDeLaRuta, TipoDeNegocio } from "../ruta-de-lanzamiento";
import {
  LEYENDA_DEL_CHAT,
  respuestaDePrueba,
  rotuloDePruebas,
  saludoDePrueba,
  sugerenciasPorEstacion,
  type CargadoDeVistaPrevia,
  type MensajeDeVistaPrevia,
} from "./guion";

export interface ChatDeVistaPreviaProps {
  tipo: TipoDeNegocio;
  estacion: EstacionDeLaRuta;
  agente: string;
  negocio: string;
  cargados?: readonly CargadoDeVistaPrevia[];
  testID?: string;
}

/** Lo que tarda «escribiendo…» antes de la respuesta fija (sin animación si se pidió quitarlas). */
const ESPERA_MS = 700;

/**
 * Chat de vista previa de las estaciones 1 a 4 (HU-APP-23, D-SPEC-49-4): mensajes de prueba que se tocan y
 * respuestas fijas, sin red ni modelo. Lo dice su leyenda; la prueba real va en la estación 5 (`PasoProbar`).
 */
export function ChatDeVistaPrevia({ tipo, estacion, agente, negocio, cargados = [], testID = "vista-previa" }: ChatDeVistaPreviaProps) {
  const { c, tonos } = useKit();
  const reducir = useReduceMotion();
  const [mensajes, setMensajes] = useState<MensajeDeVistaPrevia[]>([]);
  const [escribiendo, setEscribiendo] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
    },
    [],
  );

  const sugerencias = sugerenciasPorEstacion(tipo, estacion, cargados);
  const saludo = saludoDePrueba(tipo, agente, negocio);

  function tocar(id: string, texto: string) {
    if (escribiendo) return;
    const respuesta = respuestaDePrueba(tipo, estacion, id, { agente, negocio, cargados });
    const conCliente = (previos: MensajeDeVistaPrevia[]) => [...previos, { tipo: "cliente" as const, texto }].slice(-6);
    if (reducir) {
      setMensajes((m) => [...conCliente(m), ...respuesta].slice(-8));
      return;
    }
    setMensajes(conCliente);
    setEscribiendo(true);
    espera.current = setTimeout(() => {
      setEscribiendo(false);
      setMensajes((m) => [...m, ...respuesta].slice(-8));
    }, ESPERA_MS);
  }

  return (
    <View style={[styles.telefono, { borderColor: c.border, backgroundColor: c.surface2 }]} testID={testID}>
      <View style={styles.fila}>
        <Icono name="chat" size={18} color={c.textMuted} />
        <Text style={[shType.label, { color: c.text }]}>Así respondería {agente || "tu agente"}</Text>
      </View>
      <Burbuja mensaje={saludo} agente={agente} />
      {mensajes.map((m, i) => (
        <Burbuja key={i} mensaje={m} agente={agente} />
      ))}
      {escribiendo ? (
        <Text style={[shType.caption, { color: c.textMuted }]} accessibilityLiveRegion="polite" testID={`${testID}-escribiendo`}>
          {agente || "Tu agente"} está escribiendo…
        </Text>
      ) : null}
      <Text style={[shType.caption, { color: c.textMuted }]}>{rotuloDePruebas(estacion)}</Text>
      <View style={styles.chips}>
        {sugerencias.map((s) => (
          <Chip
            key={s.id}
            titulo={s.texto}
            rol="button"
            elegido={false}
            onPress={() => tocar(s.id, s.texto)}
            testID={`${testID}-${s.id}`}
          />
        ))}
      </View>
      <View style={styles.fila}>
        <Icono name="lock" size={14} color={tonos.neutral.fg} />
        <Text style={[shType.caption, { color: tonos.neutral.fg }]}>{LEYENDA_DEL_CHAT}</Text>
      </View>
    </View>
  );
}

function Burbuja({ mensaje, agente }: { mensaje: MensajeDeVistaPrevia; agente: string }) {
  const { c } = useKit();
  const delCliente = mensaje.tipo === "cliente";
  const quien = delCliente ? "Cliente" : agente || "Tu agente";
  return (
    <View
      accessible
      accessibilityLabel={`${quien}: ${mensaje.texto}${mensaje.tipo === "tarjeta" ? `. ${mensaje.filas.map((f) => [f.nombre, f.detalle].filter(Boolean).join(", ")).join(". ")}` : ""}`}
      style={[
        styles.burbuja,
        delCliente ? styles.delCliente : null,
        { backgroundColor: delCliente ? c.surface : c.bg, borderColor: delCliente ? c.link : c.border },
      ]}
    >
      <Text style={[mensaje.tipo === "tarjeta" ? shType.label : shType.dense, { color: c.text }]}>{mensaje.texto}</Text>
      {mensaje.tipo === "tarjeta"
        ? mensaje.filas.map((f) => (
            <Text key={f.nombre} style={[shType.dense, { color: c.text }]}>
              {f.nombre}
              {f.detalle ? <Text style={{ color: c.textMuted }}> · {f.detalle}</Text> : null}
            </Text>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  telefono: { gap: shSpace[2], padding: shSpace[3], borderWidth: 1, borderRadius: shRadius.md },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  burbuja: { alignSelf: "flex-start", maxWidth: "88%", gap: shSpace[1], padding: shSpace[2], borderWidth: 1, borderRadius: shRadius.md },
  delCliente: { alignSelf: "flex-end" },
});
