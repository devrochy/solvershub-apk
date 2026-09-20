import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  /** Color del punto a la izquierda (si se define, en vez del icono). */
  color?: string;
  onPress?(): void;
  activo?: boolean;
  /** Ítems anidados: si existen, el ítem se despliega en vez de ejecutarse. */
  subItems?: MenuItem[];
}

export interface MenuLateralValue {
  abierto: boolean;
  abrir(): void;
  cerrar(): void;
  alternar(): void;
  /** Ítems contextuales (secciones de la cartera, filtros, etc.). */
  itemsExtra: MenuItem[];
  setItemsExtra(items: MenuItem[]): void;
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
  itemsExtra: [],
  setItemsExtra: NOOP,
});

export function MenuLateralProvider({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [itemsExtra, setItemsExtra] = useState<MenuItem[]>([]);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alternar = useCallback(() => setAbierto((valor) => !valor), []);

  const value = useMemo(
    () => ({ abierto, abrir, cerrar, alternar, itemsExtra, setItemsExtra }),
    [abierto, abrir, cerrar, alternar, itemsExtra],
  );

  return <MenuLateralContext.Provider value={value}>{children}</MenuLateralContext.Provider>;
}

export function useMenuLateral(): MenuLateralValue {
  return useContext(MenuLateralContext);
}
