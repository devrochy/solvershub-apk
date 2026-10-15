import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORES, type ColoresTema, type Tema } from "./theme";

/** Clave de AsyncStorage con la preferencia del usuario (`null` = nunca eligió). */
export const CLAVE_TEMA = "cobranza_tema";

/**
 * Oscuro por defecto en toda la app, como el panel web (`DEFAULT_THEME = "sh-dark"`,
 * manual de marca §5.5; decisión del dueño del 2026-10-14, D-34). El campo de
 * cobranza conserva sus vistas y su flujo: solo arranca en oscuro.
 */
export const TEMA_POR_DEFECTO: Tema = "oscuro";

interface ThemeValue {
  tema: Tema;
  colores: ColoresTema;
  alternarTema(): void;
}

// Valor del contexto SIN provider: solo lo ven los tests que renderizan una
// pantalla suelta (afirman `COLORES.claro`). En la app siempre hay `ThemeProvider`.
const DEFAULT: ThemeValue = {
  tema: "claro",
  colores: COLORES.claro,
  alternarTema: () => undefined,
};

const ThemeContext = createContext<ThemeValue>(DEFAULT);

/**
 * Tema claro/oscuro del APK. Arranca en `TEMA_POR_DEFECTO` (oscuro) y al hidratar
 * respeta lo que el usuario eligió antes con el toggle (persistido en
 * AsyncStorage). Si nunca eligió, no se escribe nada: así quien ya tenía
 * «claro» lo conserva y quien nunca tocó el toggle pasa a oscuro.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(TEMA_POR_DEFECTO);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_TEMA)
      .then((valor) => {
        if (valor === "oscuro" || valor === "claro") {
          setTema(valor);
        }
      })
      .catch(() => undefined);
  }, []);

  const alternarTema = useCallback(() => {
    setTema((actual) => {
      const siguiente: Tema = actual === "claro" ? "oscuro" : "claro";
      void AsyncStorage.setItem(CLAVE_TEMA, siguiente);
      return siguiente;
    });
  }, []);

  const value = useMemo(
    () => ({ tema, colores: COLORES[tema], alternarTema }),
    [tema, alternarTema],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
