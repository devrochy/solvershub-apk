import type { ImageSourcePropType } from "react-native";
import type { Tema } from "@core/theme/theme";

/**
 * Logo vertical definitivo de SolversHub (isotipo + SOLVERS / — HUB —) para el
 * login, en la tinta que corresponde a cada tema (`brand/logo-definitivo`).
 * Los PNG se derivan del set de marca; no se editan a mano.
 */
export const LOGO_POR_TEMA: Record<Tema, ImageSourcePropType> = {
  claro: require("../../../assets/logo-login-claro.png"),
  oscuro: require("../../../assets/logo-login-oscuro.png"),
};
