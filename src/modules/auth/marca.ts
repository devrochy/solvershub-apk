import { Image, type ImageSourcePropType } from "react-native";
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

/**
 * Fuente del logo lista para pintar. En Android el asset local (`require`)
 * impone su tamaño intrínseco sobre el estilo del `Image`; resolviéndolo a
 * `uri` manda el `width`/`height` del componente. Si no hay `uri` (tests),
 * devuelve el asset tal cual.
 */
export function fuenteLogo(tema: Tema): ImageSourcePropType {
  const asset = LOGO_POR_TEMA[tema];
  const resuelto = Image.resolveAssetSource(asset);
  return resuelto?.uri ? { uri: resuelto.uri } : asset;
}
