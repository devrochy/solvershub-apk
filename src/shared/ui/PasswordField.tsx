import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { shDensity } from "@core/theme/tokens";
import { IconButton } from "./IconButton";
import { TextField, type TextFieldProps } from "./TextField";

export interface PasswordFieldProps extends Omit<TextFieldProps, "secureTextEntry"> {
  /** Qué se oculta, para el nombre accesible del ojo ("Mostrar PIN"). Por defecto, contraseña. */
  etiqueta?: string;
}

/**
 * Campo oculto (contraseña, llave, secreto) con un ojo para verlo. Es un
 * `TextField` —toma de `Field` su nombre, pista y estado inválido— con el
 * botón de visibilidad dentro, a la derecha. El ojo mide 48 × 48 dp y lo
 * anuncia el lector de pantalla como «Mostrar contraseña»/«Ocultar contraseña».
 * Cada campo arranca oculto: no se recuerda la elección entre pantallas.
 */
export function PasswordField({ etiqueta = "contraseña", style, testID, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        testID={testID}
        secureTextEntry={!visible}
        style={[style, styles.conOjo]}
      />
      <View style={styles.ojo}>
        <IconButton
          testID={testID ? `${testID}-ojo` : undefined}
          icon={visible ? "visibility-off" : "visibility"}
          label={visible ? `Ocultar ${etiqueta}` : `Mostrar ${etiqueta}`}
          selected={visible}
          onPress={() => setVisible((v) => !v)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // El texto no pasa por debajo del ojo.
  conOjo: { paddingRight: shDensity.controlLg },
  ojo: { position: "absolute", top: 0, right: 0, bottom: 0, justifyContent: "center" },
});
