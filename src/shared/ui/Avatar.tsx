import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { shRadius, shType } from "@core/theme/tokens";
import { useKit } from "./tema";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

export interface AvatarStatus {
  tone: "success" | "warning" | "danger" | "neutral";
  /** Texto del estado ("En ruta"): el punto de color nunca va solo. */
  label: string;
}

export interface AvatarProps {
  /** Nombre de la persona: da las iniciales y el nombre accesible. */
  name: string;
  /** URL ya resuelta de la imagen (el kit no conoce el backend). */
  src?: string | null;
  size?: AvatarSize;
  status?: AvatarStatus;
  testID?: string;
}

const DP: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56 };

/** Iniciales de un nombre: primera letra de las dos primeras palabras. */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  return palabras
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase("es"))
    .join("");
}

/**
 * Avatar genérico del kit: imagen o iniciales (si no hay imagen o falla al
 * cargar). Versión de `shared/ui` del `Avatar` de cobranza; las pantallas de
 * campo migran a este en HU-DS-10.
 */
export function Avatar({ name, src, size = "md", status, testID }: AvatarProps) {
  const { c, tonos } = useKit();
  const [fallo, setFallo] = useState(false);
  const dp = DP[size];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reintenta la imagen cuando cambia la URL
    setFallo(false);
  }, [src]);

  const etiqueta = status ? `${name}, ${status.label}` : name;
  const punto = Math.max(8, Math.round(dp * 0.3));

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={etiqueta}
      style={[styles.circulo, { width: dp, height: dp, borderRadius: dp / 2, backgroundColor: c.surfaceRaised }]}
    >
      {src && !fallo ? (
        <Image
          testID="avatar-imagen"
          source={{ uri: src }}
          onError={() => setFallo(true)}
          style={{ width: dp, height: dp, borderRadius: dp / 2 }}
        />
      ) : (
        <Text
          allowFontScaling={false}
          style={[styles.iniciales, { color: c.text, fontSize: Math.round(dp * 0.4), lineHeight: Math.round(dp * 0.5) }]}
        >
          {iniciales(name)}
        </Text>
      )}
      {status ? (
        <View
          testID="avatar-estado"
          style={[
            styles.estado,
            {
              width: punto,
              height: punto,
              borderRadius: punto / 2,
              backgroundColor: tonos[status.tone].fg,
              borderColor: c.surface,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: { alignItems: "center", justifyContent: "center" },
  // El tamaño de las iniciales sigue al del círculo, no a la escala de fuente.
  iniciales: { fontFamily: shType.h1.fontFamily },
  estado: { position: "absolute", right: 0, bottom: 0, borderWidth: 2, borderRadius: shRadius.pill },
});
