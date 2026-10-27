import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DestinoMenu } from "./menu-panel";

/** Destino dentro del panel: un módulo, su pestaña interna y la entrada del cajón. */
export type DestinoPanel = DestinoMenu;

export interface MenuPanelValue {
  abierto: boolean;
  abrir(): void;
  cerrar(): void;
  /** Último destino al que se navegó (resalta el ítem del cajón y titula el header). */
  activo: DestinoPanel | null;
  /** Grupos desplegados; el cajón arranca con todos plegados. */
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
  return new Set();
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

  const abrir = useCallback(() => {
    // Cada apertura parte del menú plegado: solo el grupo activo queda abierto
    // (lo decide el cajón con `contieneActiva`).
    setGruposAbiertos(gruposAbiertosPorDefecto());
    setAbierto(true);
  }, []);
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
