import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
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
