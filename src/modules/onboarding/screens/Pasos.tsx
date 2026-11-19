import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { inicialDe } from "@shared/ruta-de-lanzamiento";
import { Chip, Elegible, Field, TextField, useKit, type IconName } from "@shared/ui";
import {
  DESCRIPCION_MAX,
  NOMBRE_AGENTE_MAX,
  NOMBRE_SUGERIDO_DE_LA_BIENVENIDA,
  TIPO_RECOMENDADO,
  TIPOS_DE_NEGOCIO,
  fraseDelTipo,
  ideasDeLaBienvenida,
  type EstadoDelAsistente,
  type TipoDeNegocio,
} from "../logica";

export const ICONOS_DE_TIPO: Record<TipoDeNegocio, IconName> = {
  ventas: "storefront",
  agenda: "event",
  cobranza: "payments",
  suscripciones: "autorenew",
};

function Mensaje({ texto }: { texto?: string }) {
  const { tonos } = useKit();
  if (!texto) return null;
  return (
    <Text
      style={[shType.body, { color: tonos.danger.fg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="onb-error"
    >
      {texto}
    </Text>
  );
}

/** «Recomendado» o «Sugerido» junto a una etiqueta de campo: en palabra, no solo color. */
export function Marca({ texto }: { texto: string }) {
  const { c } = useKit();
  return (
    <View style={[styles.marca, { borderColor: c.link }]}>
      <Text style={[shType.caption, { color: c.link }]}>{texto}</Text>
    </View>
  );
}

/**
 * Estación 1 de la bienvenida, «Tu negocio» (HU-APP-23, tablero `rb1`): a qué se dedica (con «Vendo productos»
 * recomendado), el nombre del negocio, el del agente («Laura» sugerida y editable, con ideas) y una frase sugerida
 * por tipo. No pide ningún producto: eso va en «Datos para probar». Con el agente ya creado, su tipo queda fijo.
 */
export function PasoNegocio({
  estado,
  cambiar,
  elegirTipo,
  tipoFijo = null,
  error,
}: {
  estado: EstadoDelAsistente;
  cambiar: (cambios: Partial<EstadoDelAsistente>) => void;
  elegirTipo: (tipo: TipoDeNegocio) => void;
  /** El tipo del agente ya creado: los demás no se eligen (un agente no cambia de tipo). */
  tipoFijo?: TipoDeNegocio | null;
  error?: string;
}) {
  const { c } = useKit();
  const recomendado = TIPOS_DE_NEGOCIO.find((t) => t.id === TIPO_RECOMENDADO);
  const fraseRecomendada = Boolean(estado.tipo) && estado.descripcion === fraseDelTipo(estado.tipo);
  const nombre = estado.nombreDelAgente.trim();
  return (
    <View style={styles.paso}>
      <View style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel="¿A qué se dedica tu negocio?">
        <Text style={[shType.label, { color: c.text }]}>¿A qué se dedica tu negocio?</Text>
        <View style={styles.grilla}>
          {TIPOS_DE_NEGOCIO.map((t) => {
            const otroTipo = tipoFijo !== null && t.id !== tipoFijo;
            return (
              <Elegible
                key={t.id}
                testID={`onb-tipo-${t.id}`}
                titulo={t.titulo}
                ayuda={t.ayuda}
                icono={ICONOS_DE_TIPO[t.id]}
                elegido={estado.tipo === t.id}
                etiqueta={t.id === TIPO_RECOMENDADO ? "Recomendado" : undefined}
                deshabilitado={otroTipo}
                nota={otroTipo ? "Tu agente ya está creado con otro tipo." : undefined}
                baldosa
                onPress={() => elegirTipo(t.id)}
              />
            );
          })}
        </View>
        <Text style={[shType.caption, { color: c.textMuted }]} testID="onb-tipo-ayuda">
          {tipoFijo
            ? `Tu agente ya está creado como «${TIPOS_DE_NEGOCIO.find((t) => t.id === tipoFijo)?.titulo}».`
            : estado.tipo === TIPO_RECOMENDADO
              ? "Recomendado para negocios que venden productos."
              : `Lo recomendado es «${recomendado?.titulo}», para negocios que venden productos.`}
        </Text>
      </View>

      <Field label="Nombre de tu negocio" required>
        <TextField
          testID="onb-negocio"
          value={estado.negocio}
          maxLength={80}
          onChangeText={(negocio) => cambiar({ negocio })}
        />
      </Field>

      <View style={styles.grupo}>
        <View style={styles.etiqueta}>
          <Text style={[shType.label, { color: c.text }]}>Nombre de tu agente</Text>
          {nombre === NOMBRE_SUGERIDO_DE_LA_BIENVENIDA ? <Marca texto="Sugerido" /> : null}
        </View>
        <TextField
          testID="onb-nombre"
          accessibilityLabel="Nombre de tu agente"
          value={estado.nombreDelAgente}
          maxLength={NOMBRE_AGENTE_MAX}
          onChangeText={(nombreDelAgente) => cambiar({ nombreDelAgente })}
        />
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Ideas de nombre">
          {ideasDeLaBienvenida(estado.tipo).map((n) => (
            <Chip
              key={n}
              testID={`onb-sugerido-${n}`}
              titulo={n}
              rol="radio"
              inicial={inicialDe(n)}
              elegido={nombre === n}
              onPress={() => cambiar({ nombreDelAgente: n })}
            />
          ))}
        </View>
      </View>

      <View style={styles.grupo}>
        <View style={styles.etiqueta}>
          <Text style={[shType.label, { color: c.text }]}>Tu negocio en una frase</Text>
          {fraseRecomendada ? <Marca texto="Recomendado" /> : null}
        </View>
        <TextField
          testID="onb-descripcion"
          accessibilityLabel="Tu negocio en una frase"
          value={estado.descripcion}
          maxLength={DESCRIPCION_MAX}
          multiline
          placeholder="Ej.: Pan artesanal y tortas por encargo"
          onChangeText={(descripcion) => cambiar({ descripcion })}
        />
        <Text style={[shType.caption, { color: c.textMuted }]}>
          {fraseRecomendada
            ? `Sugerida para tu tipo de negocio; ajústala a tu zona y horario. ${nombre || "Tu agente"} la usa para presentarse.`
            : `${estado.descripcion.length}/${DESCRIPCION_MAX}. ${nombre || "Tu agente"} la usa para presentarse.`}
        </Text>
      </View>
      <Mensaje texto={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  paso: { gap: shSpace[6] },
  grupo: { gap: shSpace[2] },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[3], paddingTop: shSpace[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  etiqueta: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  marca: { borderWidth: 1, borderRadius: shRadius.pill, paddingHorizontal: shSpace[2] },
});
