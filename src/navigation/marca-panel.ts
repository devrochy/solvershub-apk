import type { ImageSourcePropType } from "react-native";
import type { Tema } from "@core/theme/theme";

/** Logo horizontal (isotipo + wordmark) del cajón, en la tinta de cada tema. */
export const LOGO_PANEL: Record<Tema, ImageSourcePropType> = {
  claro: require("../../assets/logo-horizontal-claro.png"),
  oscuro: require("../../assets/logo-horizontal-oscuro.png"),
};
