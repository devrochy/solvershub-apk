import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { agregarFrase, MAX_LARGO_FRASE } from "../frases";
import { limpiarNumero } from "../numeros";

/** Controles de formulario de Configuración: campo con etiqueta y ayuda, chips y texto. */

export function Campo({
  id,
  label,
  children,
  ayuda,
  error,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  ayuda?: string;
  /** Error del campo (rango o 422 del servidor): reemplaza la ayuda y va en rojo. */
  error?: string;
}) {
  const { colores } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: colores.texto, fontSize: 13, fontWeight: "600", marginBottom: 4 }}>
        {label}
      </Text>
      {children}
      {error ? (
        <Text testID={id ? `${id}-error` : undefined} style={{ color: colores.peligro, fontSize: 11, marginTop: 2 }}>
          {error}
        </Text>
      ) : ayuda ? (
        <Text style={{ color: colores.textoSuave, fontSize: 11, marginTop: 2 }}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

export function Chips({
  id,
  opciones,
  valor,
  onChange,
}: {
  id: string;
  opciones: { value: string; label: string }[];
  valor: string;
  onChange: (v: string) => void;
}) {
  const { colores } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {opciones.map((o) => (
        <Pressable
          key={o.value}
          testID={`${id}-${o.value}`}
          onPress={() => onChange(o.value)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: valor === o.value ? colores.acento : colores.borde,
            backgroundColor: valor === o.value ? colores.acento : colores.tarjeta,
          }}
        >
          <Text
            style={{
              color: valor === o.value ? colores.sobrePrimario : colores.texto,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function InputCampo(props: {
  id: string;
  valor: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  numeric?: boolean;
  /** Con `numeric`: acepta parte decimal (teclado con punto y coma). */
  decimal?: boolean;
  placeholder?: string;
  deshabilitado?: boolean;
}) {
  const { colores } = useTheme();
  return (
    <TextInput
      testID={props.id}
      value={props.valor}
      onChangeText={props.numeric ? (v) => props.onChange(limpiarNumero(v, props.decimal === true)) : props.onChange}
      multiline={props.multiline}
      editable={!props.deshabilitado}
      keyboardType={props.numeric ? (props.decimal ? "decimal-pad" : "number-pad") : undefined}
      placeholder={props.placeholder}
      placeholderTextColor={colores.textoSuave}
      style={[
        styles.input,
        {
          borderColor: colores.borde,
          backgroundColor: colores.tarjeta,
          color: colores.texto,
        },
        props.multiline && { minHeight: 64, textAlignVertical: "top" },
        props.deshabilitado && { opacity: 0.5 },
      ]}
    />
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
  },
} as const;

/**
 * Lista editable de frases: se agrega con el botón o con Enter y se quita con la ✕ de cada una.
 * Acepta espacios y comas dentro de la frase («no, gracias»); ignora las repetidas sin importar
 * mayúsculas ni tildes.
 */
export function ListaDeFrases({
  id,
  frases,
  onChange,
  placeholder,
  max = 100,
  minLargo = 3,
  deshabilitado = false,
}: {
  id: string;
  frases: string[];
  onChange: (frases: string[]) => void;
  placeholder?: string;
  max?: number;
  /** Largo mínimo de cada frase, sin contar los espacios de los bordes. */
  minLargo?: number;
  deshabilitado?: boolean;
}) {
  const { colores } = useTheme();
  const [nueva, setNueva] = useState("");
  const llena = frases.length >= max;
  const puedeAgregar = !deshabilitado && !llena && nueva.trim().length >= minLargo;

  const agregar = () => {
    if (!puedeAgregar) return;
    const lista = agregarFrase(frases, nueva, minLargo, max);
    if (lista) onChange(lista);
    // Una repetida se descarta en silencio y deja el campo limpio, como en el panel.
    setNueva("");
  };

  return (
    <View>
      {frases.length > 0 ? (
        <View testID={`${id}-lista`} style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {frases.map((frase, i) => (
            <View
              key={`${frase}-${i}`}
              testID={`${id}-frase-${i}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingLeft: 10,
                paddingRight: 4,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colores.borde,
                backgroundColor: colores.tarjeta,
                maxWidth: "100%",
              }}
            >
              <Text style={{ color: colores.texto, fontSize: 12, flexShrink: 1 }}>{frase}</Text>
              <Pressable
                testID={`${id}-quitar-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`Quitar «${frase}»`}
                disabled={deshabilitado}
                hitSlop={6}
                onPress={() => onChange(frases.filter((_, j) => j !== i))}
                style={{ paddingHorizontal: 6, paddingVertical: 2, opacity: deshabilitado ? 0.5 : 1 }}
              >
                <Text style={{ color: colores.textoSuave, fontSize: 12, fontWeight: "700" }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
          testID={id}
          value={nueva}
          onChangeText={setNueva}
          onSubmitEditing={agregar}
          submitBehavior="submit"
          returnKeyType="done"
          editable={!deshabilitado}
          maxLength={MAX_LARGO_FRASE}
          placeholder={placeholder ?? "Escribe y pulsa Agregar"}
          placeholderTextColor={colores.textoSuave}
          style={[
            styles.input,
            { flex: 1, borderColor: colores.borde, backgroundColor: colores.tarjeta, color: colores.texto },
            deshabilitado && { opacity: 0.5 },
          ]}
        />
        <Pressable
          testID={`${id}-agregar`}
          accessibilityRole="button"
          disabled={!puedeAgregar}
          onPress={agregar}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: colores.primario,
            opacity: puedeAgregar ? 1 : 0.5,
          }}
        >
          <Text style={{ color: colores.sobrePrimario, fontWeight: "700", fontSize: 12 }}>Agregar</Text>
        </Pressable>
      </View>
      {llena ? (
        <Text style={{ color: colores.textoSuave, fontSize: 11, marginTop: 4 }}>
          Llegaste al máximo de {max}. Quita alguna para agregar otra.
        </Text>
      ) : null}
    </View>
  );
}
