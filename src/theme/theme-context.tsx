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

const CLAVE_TEMA = "cobranza_tema";

interface ThemeValue {
  tema: Tema;
  colores: ColoresTema;
  alternarTema(): void;
}

const DEFAULT: ThemeValue = {
  tema: "claro",
  colores: COLORES.claro,
  alternarTema: () => undefined,
};

const ThemeContext = createContext<ThemeValue>(DEFAULT);

/**
 * Tema claro/oscuro del APK. El modo se persiste en AsyncStorage; el valor por
 * defecto es claro (y el provider expone `colores` según el modo).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>("claro");

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
