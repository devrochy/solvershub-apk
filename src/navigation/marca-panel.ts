import type { ImageSourcePropType } from "react-native";
import type { Tema } from "@core/theme/theme";

/** Wordmark de una línea (sin isotipo) de los menús, en la tinta de cada tema. */
export const LOGO_PANEL: Record<Tema, ImageSourcePropType> = {
  claro: require("../../assets/marca/wordmark-1-linea-tema-claro.png"),
  oscuro: require("../../assets/marca/wordmark-1-linea-tema-oscuro.png"),
};

/** Relación ancho/alto de los PNG del wordmark (640 × 94). */
export const PROPORCION_WORDMARK = 640 / 94;

/** Medida del wordmark en los menús: centrado y con presencia, sin pasar el cajón. */
export const ANCHO_WORDMARK = 232;
export const ALTO_WORDMARK = Math.round(ANCHO_WORDMARK / PROPORCION_WORDMARK);
