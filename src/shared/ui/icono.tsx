import type { ComponentProps } from "react";
import { MaterialIcons } from "@expo/vector-icons";

/** Nombre de un ícono del kit (Material Icons de `@expo/vector-icons`). */
export type IconName = ComponentProps<typeof MaterialIcons>["name"];

/**
 * Ícono decorativo del kit: nunca lo lee el lector de pantalla, porque el
 * nombre accesible siempre lo da un texto o el `label` del control.
 */
export function Icono({ name, size, color }: { name: IconName; size: number; color: string }) {
  return (
    <MaterialIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
