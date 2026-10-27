import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, Field, TextField, useKit } from "@shared/ui";
import { Chip, Elegible } from "../components/Elegible";
import {
  BLOQUES_DE_HORAS,
  CALIDEZ_ETIQUETAS,
  CALIDEZ_MAX,
  CALIDEZ_MIN,
  DESCRIPCION_MAX,
  DIAS,
  EMOJIS,
  FRASES_SUGERIDAS_PROHIBIDAS,
  LARGOS,
  MOTIVOS_DE_ESCALAR,
  NOMBRE_AGENTE_MAX,
  OPCIONES_QUE_VENDE,
  PRESETS_DE_DIAS,
  TIPOS_DE_NEGOCIO,
  TONOS,
  agregarFrase,
  type EstadoDelAsistente,
  type HorarioElegido,
  type MotivoDeEscalar,
} from "../logica";

type Cambiar = (cambios: Partial<EstadoDelAsistente>) => void;
type PropsDePaso = {
  estado: EstadoDelAsistente;
  cambiar: Cambiar;
  error?: string;
};

const ICONOS_DE_TIPO = {
  ventas: "storefront",
  agenda: "event",
  cobranza: "payments",
  suscripciones: "autorenew",
} as const;

function Mensaje({ texto }: { texto?: string }) {
  const { tonos } = useKit();
  if (!texto) return null;
  return (
    <Text
      style={[shType.body, { color: tonos.danger.fg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {texto}
    </Text>
  );
}

/** Paso 1: a qué se dedica el negocio, en tarjetas, y cómo se llama el agente. */
export function PasoNegocio({ estado, cambiar, error }: PropsDePaso) {
  const { c } = useKit();
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  return (
    <View style={styles.paso}>
      <View
        style={styles.grupo}
        accessibilityRole="radiogroup"
        accessibilityLabel="¿A qué se dedica tu negocio?"
      >
        <Text style={[shType.label, { color: c.text }]}>
          ¿A qué se dedica tu negocio?
        </Text>
        {TIPOS_DE_NEGOCIO.map((t) => (
          <Elegible
            key={t.id}
            testID={`onb-tipo-${t.id}`}
            titulo={t.titulo}
            ayuda={t.ayuda}
            icono={ICONOS_DE_TIPO[t.id]}
            elegido={estado.tipo === t.id}
            onPress={() => cambiar({ tipo: t.id })}
          />
        ))}
        {estado.tipo ? (
          <Text
            testID="onb-tipo-activara"
            style={[shType.body, { color: c.textMuted }]}
          >
            Al terminar activaremos por ti lo que ese tipo de negocio necesita.
            Podrás configurarlo después en Habilidades.
          </Text>
        ) : null}
      </View>

      {estado.tipo === "ventas" ? (
        <View
          style={styles.grupo}
          accessibilityRole="radiogroup"
          accessibilityLabel="¿Qué vendes?"
        >
          <Text style={[shType.label, { color: c.text }]}>¿Qué vendes?</Text>
          {OPCIONES_QUE_VENDE.map((o) => (
            <Elegible
              key={o.id}
              testID={`onb-vende-${o.id}`}
              titulo={o.titulo}
              ayuda={o.ayuda}
              elegido={estado.queVende === o.id}
              onPress={() => cambiar({ queVende: o.id })}
            />
          ))}
        </View>
      ) : null}

      <Field label="Nombre de tu negocio" hint="Así se presenta tu agente.">
        <TextField
          testID="onb-negocio"
          value={estado.negocio}
          maxLength={80}
          onChangeText={(negocio) => cambiar({ negocio })}
        />
      </Field>
      <Field
        label="Cuéntanos en una frase a qué se dedica"
        hint="Por ejemplo: vendemos ropa deportiva con envíos a todo el país."
        required
      >
        <TextField
          testID="onb-descripcion"
          value={estado.descripcion}
          maxLength={DESCRIPCION_MAX}
          multiline
          onChangeText={(descripcion) => cambiar({ descripcion })}
        />
      </Field>
      <Field label="Nombre de tu agente" required>
        <TextField
          testID="onb-nombre"
          value={estado.nombreDelAgente}
          maxLength={NOMBRE_AGENTE_MAX}
          onChangeText={(nombreDelAgente) => cambiar({ nombreDelAgente })}
        />
      </Field>
      {tipo ? (
        <View style={styles.chips} accessibilityLabel="Nombres sugeridos">
          {tipo.nombres.map((n) => (
            <Chip
              key={n}
              testID={`onb-sugerido-${n}`}
              titulo={n}
              rol="radio"
              elegido={estado.nombreDelAgente === n}
              onPress={() => cambiar({ nombreDelAgente: n })}
            />
          ))}
        </View>
      ) : null}
      <Mensaje texto={error} />
    </View>
  );
}

/** Paso 2: cómo habla; todo por clics, con la burbuja de ejemplo en la tarjeta del agente. */
export function PasoVoz({ estado, cambiar }: PropsDePaso) {
  const { c } = useKit();
  return (
    <View style={styles.paso}>
      <View
        style={styles.grupo}
        accessibilityRole="radiogroup"
        accessibilityLabel="Tono"
      >
        <Text style={[shType.label, { color: c.text }]}>Tono</Text>
        {TONOS.map((t) => (
          <Elegible
            key={t.id}
            testID={`onb-tono-${t.id}`}
            titulo={t.titulo}
            ayuda={t.muestra}
            elegido={estado.tono === t.id}
            onPress={() => cambiar({ tono: t.id })}
          />
        ))}
      </View>
      <View
        style={styles.grupo}
        accessibilityRole="radiogroup"
        accessibilityLabel="Calidez"
      >
        <Text style={[shType.label, { color: c.text }]}>Calidez</Text>
        <View style={styles.chips}>
          {Array.from(
            { length: CALIDEZ_MAX - CALIDEZ_MIN + 1 },
            (_, i) => CALIDEZ_MIN + i,
          ).map((n) => (
            <Chip
              key={n}
              testID={`onb-calidez-${n}`}
              titulo={CALIDEZ_ETIQUETAS[n - 1]}
              rol="radio"
              elegido={estado.calidez === n}
              onPress={() => cambiar({ calidez: n })}
            />
          ))}
        </View>
      </View>
      <View
        style={styles.grupo}
        accessibilityRole="radiogroup"
        accessibilityLabel="Emojis"
      >
        <Text style={[shType.label, { color: c.text }]}>Emojis</Text>
        <View style={styles.chips}>
          {EMOJIS.map((e) => (
            <Chip
              key={e.id}
              testID={`onb-emojis-${e.id}`}
              titulo={e.titulo}
              rol="radio"
              elegido={estado.emojis === e.id}
              onPress={() => cambiar({ emojis: e.id })}
            />
          ))}
        </View>
      </View>
      <View
        style={styles.grupo}
        accessibilityRole="radiogroup"
        accessibilityLabel="Largo de las respuestas"
      >
        <Text style={[shType.label, { color: c.text }]}>
          Largo de las respuestas
        </Text>
        {LARGOS.map((l) => (
          <Elegible
            key={l.id}
            testID={`onb-largo-${l.id}`}
            titulo={l.titulo}
            ayuda={l.ayuda}
            elegido={estado.largo === l.id}
            onPress={() => cambiar({ largo: l.id })}
          />
        ))}
      </View>
    </View>
  );
}

/** Paso 3: horario del equipo (el agente responde 24/7), cuándo pasa a una persona y qué no debe decir. */
export function PasoReglas({ estado, cambiar, error }: PropsDePaso) {
  const { c } = useKit();
  const [escrita, setEscrita] = useState("");
  const horario: HorarioElegido = estado.horario ?? { dias: [], bloque: null };

  function ponerHorario(cambios: Partial<HorarioElegido>) {
    cambiar({ horario: { ...horario, ...cambios } });
  }
  function alternarDia(d: number) {
    const dias = horario.dias.includes(d)
      ? horario.dias.filter((x) => x !== d)
      : [...horario.dias, d];
    ponerHorario({ dias });
  }
  function alternarMotivo(id: MotivoDeEscalar) {
    cambiar({
      motivos: estado.motivos.includes(id)
        ? estado.motivos.filter((m) => m !== id)
        : [...estado.motivos, id],
    });
  }
  function alternarFrase(f: string) {
    cambiar({
      prohibidas: estado.prohibidas.includes(f)
        ? estado.prohibidas.filter((x) => x !== f)
        : agregarFrase(estado.prohibidas, f),
    });
  }
  function agregarPropia() {
    cambiar({ prohibidas: agregarFrase(estado.prohibidas, escrita) });
    setEscrita("");
  }

  const dias = [...horario.dias].sort((a, b) => a - b);
  const sugeridas = [
    ...FRASES_SUGERIDAS_PROHIBIDAS,
    ...estado.prohibidas.filter(
      (f) => !(FRASES_SUGERIDAS_PROHIBIDAS as readonly string[]).includes(f),
    ),
  ];

  return (
    <View style={styles.paso}>
      <View style={styles.grupo}>
        <Text style={[shType.label, { color: c.text }]}>
          ¿Cuándo atiende tu equipo?
        </Text>
        <Text style={[shType.caption, { color: c.textMuted }]}>
          Tu agente responde las 24 horas. Este horario es para que sepa cuándo
          te pueden atender.
        </Text>
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel="Días"
        >
          {PRESETS_DE_DIAS.map((p) => (
            <Chip
              key={p.id}
              testID={`onb-dias-${p.id}`}
              titulo={p.titulo}
              rol="radio"
              elegido={
                p.dias.length === dias.length &&
                p.dias.every((d, i) => d === dias[i])
              }
              onPress={() => ponerHorario({ dias: p.dias })}
            />
          ))}
        </View>
        <View style={styles.chips}>
          {DIAS.map((nombre, d) => (
            <Chip
              key={nombre}
              testID={`onb-dia-${d}`}
              titulo={nombre}
              elegido={horario.dias.includes(d)}
              onPress={() => alternarDia(d)}
            />
          ))}
        </View>
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel="Horas"
        >
          {BLOQUES_DE_HORAS.map((b) => (
            <Chip
              key={b.id}
              testID={`onb-bloque-${b.id}`}
              titulo={b.titulo}
              rol="radio"
              elegido={horario.bloque === b.id}
              onPress={() => ponerHorario({ bloque: b.id })}
            />
          ))}
        </View>
        <Mensaje texto={error} />
      </View>

      <View style={styles.grupo}>
        <Text style={[shType.label, { color: c.text }]}>
          ¿Cuándo pasa a una persona?
        </Text>
        <View style={styles.chips}>
          {MOTIVOS_DE_ESCALAR.map((m) => (
            <Chip
              key={m.id}
              testID={`onb-motivo-${m.id}`}
              titulo={m.titulo}
              elegido={estado.motivos.includes(m.id)}
              onPress={() => alternarMotivo(m.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.grupo}>
        <Text style={[shType.label, { color: c.text }]}>
          ¿Qué nunca debe decir?
        </Text>
        <View style={styles.chips}>
          {sugeridas.map((f) => (
            <Chip
              key={f}
              testID={`onb-frase-${f}`}
              titulo={`«${f}»`}
              elegido={estado.prohibidas.includes(f)}
              onPress={() => alternarFrase(f)}
            />
          ))}
        </View>
        <Field label="Añadir otra frase">
          <TextField
            testID="onb-frase-nueva"
            value={escrita}
            maxLength={60}
            returnKeyType="done"
            onChangeText={setEscrita}
            onSubmitEditing={agregarPropia}
          />
        </Field>
        <Button
          variant="secondary"
          size="sm"
          onPress={agregarPropia}
          disabled={!escrita.trim()}
        >
          Añadir frase
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paso: { gap: shSpace[6] },
  grupo: { gap: shSpace[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
});
