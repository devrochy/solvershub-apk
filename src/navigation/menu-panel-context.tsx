import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { MENU_PANEL, type DestinoMenu } from "./menu-panel";

/** Destino dentro del panel: un módulo, su pestaña interna y la entrada del cajón. */
export type DestinoPanel = DestinoMenu;

export interface MenuPanelValue {
  abierto: boolean;
  abrir(): void;
  cerrar(): void;
  /** Último destino al que se navegó (resalta el ítem del cajón y titula el header). */
  activo: DestinoPanel | null;
  /** Grupos desplegados; con el menú v2 (una entrada por tarea) arrancan todos abiertos. */
  gruposAbiertos: ReadonlySet<string>;
  alternarGrupo(id: string): void;
  /** Toca un ítem del cajón: cierra y navega. */
  irA(destino: DestinoPanel): void;
}

const NOOP = () => {};

const MenuPanelContext = createContext<MenuPanelValue>({
  abierto: false,
  abrir: NOOP,
  cerrar: NOOP,
  activo: null,
  gruposAbiertos: new Set(),
  alternarGrupo: NOOP,
  irA: NOOP,
});

function gruposAbiertosPorDefecto(): Set<string> {
  return new Set(MENU_PANEL.map((g) => g.id));
}

export function MenuPanelProvider({
  children,
  activo,
  alNavegar,
}: {
  children: ReactNode;
  activo: DestinoPanel | null;
  alNavegar(destino: DestinoPanel): void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(gruposAbiertosPorDefecto);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alternarGrupo = useCallback((id: string) => {
    setGruposAbiertos((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }, []);
  const irA = useCallback(
    (destino: DestinoPanel) => {
      setAbierto(false);
      alNavegar(destino);
    },
    [alNavegar],
  );

  const value = useMemo(
    () => ({ abierto, abrir, cerrar, activo, gruposAbiertos, alternarGrupo, irA }),
    [abierto, abrir, cerrar, activo, gruposAbiertos, alternarGrupo, irA],
  );

  return <MenuPanelContext.Provider value={value}>{children}</MenuPanelContext.Provider>;
}

export function useMenuPanel(): MenuPanelValue {
  return useContext(MenuPanelContext);
}
