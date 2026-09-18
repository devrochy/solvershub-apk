import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export interface MenuLateralValue {
  abierto: boolean;
  abrir(): void;
  cerrar(): void;
  alternar(): void;
}

const NOOP = () => {};

/**
 * Estado del menú lateral (hamburguesa). El valor por defecto es no-op para que
 * las pantallas puedan renderizarse (p. ej. en tests) sin el provider.
 */
const MenuLateralContext = createContext<MenuLateralValue>({
  abierto: false,
  abrir: NOOP,
  cerrar: NOOP,
  alternar: NOOP,
});

export function MenuLateralProvider({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alternar = useCallback(() => setAbierto((valor) => !valor), []);

  const value = useMemo(
    () => ({ abierto, abrir, cerrar, alternar }),
    [abierto, abrir, cerrar, alternar],
  );

  return <MenuLateralContext.Provider value={value}>{children}</MenuLateralContext.Provider>;
}

export function useMenuLateral(): MenuLateralValue {
  return useContext(MenuLateralContext);
}
