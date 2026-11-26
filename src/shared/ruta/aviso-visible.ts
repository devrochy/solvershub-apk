import { useCallback, useEffect, useRef } from "react";
import { AccessibilityInfo, Platform, type LayoutChangeEvent } from "react-native";

/**
 * Lo que hace visible un aviso de error que aparece lejos del botón que lo provocó (el pie fijo de la ruta): al
 * medirse pide al contenedor del scroll que lo traiga a la vista, una vez por texto, y en iOS lo anuncia (en Android
 * lo anuncia la región viva `accessibilityLiveRegion` del nodo, igual que el Toast).
 *
 * `mostrar` recibe la `y` del aviso dentro de su padre; quien lo use lo pinta como hijo directo de la raíz de la
 * estación (o del contenido del scroll).
 */
export function useAvisoVisible(texto: string | null, mostrar?: (y: number) => void) {
  const mostradoPara = useRef<string | null>(null);

  useEffect(() => {
    if (!texto) {
      mostradoPara.current = null;
      return;
    }
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(texto);
  }, [texto]);

  return useCallback(
    (e: LayoutChangeEvent) => {
      if (!texto || mostradoPara.current === texto) return;
      mostradoPara.current = texto;
      mostrar?.(e.nativeEvent.layout.y);
    },
    [texto, mostrar],
  );
}
