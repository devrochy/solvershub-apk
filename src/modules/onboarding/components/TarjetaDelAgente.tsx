import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit, type IconName } from "@shared/ui";
import {
  MOTIVOS_DE_ESCALAR,
  TIPOS_DE_NEGOCIO,
  TONOS,
  muestraDeVoz,
  resumenDeHorario,
  type EstadoDelAsistente,
} from "../logica";

/**
 * «Tu agente, armándose» (HU-APP-22): lo decidido hasta ahora. Lo vacío se dibuja con línea punteada y
 * lo elegido, sólida. La burbuja muestra cómo sonaría la primera respuesta con la voz elegida (texto
 * fijo, sin modelo).
 */
export function TarjetaDelAgente({ estado }: { estado: EstadoDelAsistente }) {
  const { c } = useKit();
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const nombre = estado.nombreDelAgente.trim();
  const tono = TONOS.find((t) => t.id === estado.tono)?.titulo;
  const horario = estado.horario ? resumenDeHorario(estado.horario) : "";
  const escalar = MOTIVOS_DE_ESCALAR.filter((m) =>
    estado.motivos.includes(m.id),
  )
    .map((m) => m.titulo)
    .join(", ");
  const prohibidas = estado.prohibidas.map((f) => `«${f}»`).join(", ");

  return (
    <View
      testID="tarjeta-agente"
      style={styles.tarjeta}
      accessibilityLabel="Tu agente, armándose"
    >
      <View style={styles.cabecera}>
        <View
          style={[
            styles.avatar,
            nombre
              ? { backgroundColor: c.link }
              : {
                  borderColor: c.controlBorder,
                  borderStyle: "dashed",
                  borderWidth: 1,
                },
          ]}
        >
          {nombre ? (
            <Text style={[shType.h1, { color: c.bg }]}>
              {nombre.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Icono name="person-outline" size={22} color={c.textSoft} />
          )}
        </View>
        <View style={styles.textos}>
          <Text
            style={[shType.h1, { color: nombre ? c.text : c.textSoft }]}
            numberOfLines={1}
          >
            {nombre || "Tu agente"}
          </Text>
          <Text
            style={[shType.caption, { color: c.textMuted }]}
            numberOfLines={1}
          >
            {tipo
              ? `${tipo.titulo}${tono ? ` · ${tono}` : ""}`
              : "Aún sin tipo"}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.burbuja,
          { borderColor: c.border, backgroundColor: c.surface2 },
        ]}
        accessibilityLiveRegion="polite"
      >
        <Text style={[shType.body, { color: c.text }]}>
          {muestraDeVoz(estado, nombre, estado.negocio)}
        </Text>
      </View>

      <Linea
        icono="schedule"
        titulo="Atiende tu equipo"
        valor={horario}
        vacio="Sin horario definido"
      />
      <Linea
        icono="support-agent"
        titulo="Pasa a una persona si"
        valor={escalar}
        vacio="Aún sin reglas"
      />
      <Linea
        icono="block"
        titulo="Nunca dirá"
        valor={prohibidas}
        vacio="Sin frases prohibidas"
      />

      <Text style={[shType.caption, { color: c.textSoft }]}>
        Responde las 24 horas. El horario es el de tu equipo: el agente lo
        conoce para avisar cuándo te pueden atender.
      </Text>
    </View>
  );
}

function Linea({
  icono,
  titulo,
  valor,
  vacio,
}: {
  icono: IconName;
  titulo: string;
  valor: string;
  vacio: string;
}): ReactNode {
  const { c } = useKit();
  return (
    <View
      accessible
      accessibilityLabel={`${titulo}: ${valor || vacio}`}
      style={[
        styles.linea,
        valor
          ? null
          : {
              borderColor: c.controlBorder,
              borderStyle: "dashed",
              borderWidth: 1,
            },
      ]}
    >
      <Icono name={icono} size={18} color={valor ? c.link : c.textSoft} />
      <View style={styles.textos}>
        <Text style={[shType.caption, { color: c.textSoft }]}>{titulo}</Text>
        <Text style={[shType.body, { color: valor ? c.text : c.textSoft }]}>
          {valor || vacio}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { gap: shSpace[3] },
  cabecera: { flexDirection: "row", alignItems: "center", gap: shSpace[3] },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  textos: { flex: 1, gap: 2 },
  burbuja: {
    padding: shSpace[3],
    borderWidth: 1,
    borderRadius: shRadius.md,
    borderTopLeftRadius: 0,
  },
  linea: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: shSpace[2],
    padding: shSpace[2],
    borderRadius: shRadius.sm,
  },
});
