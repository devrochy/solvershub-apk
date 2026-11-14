jest.mock("./feed-api", () => ({
  listarNotificaciones: jest.fn(),
  contarNoLeidas: jest.fn(),
  marcarLeidas: jest.fn(),
  marcarTodasLeidas: jest.fn(),
  archivarNotificacion: jest.fn(),
  leerPreferencias: jest.fn(),
  guardarPushApagado: jest.fn(),
  silenciarPush: jest.fn(),
}));

jest.mock("./agentes", () => ({
  cargarCategoriasDisponibles: jest.fn(),
}));

import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ClienteAdmin } from "@core/api/admin";
import { cargarCategoriasDisponibles } from "./agentes";
import { archivarNotificacion, contarNoLeidas, listarNotificaciones, marcarLeidas } from "./feed-api";
import { CATEGORIAS, type NotificacionItem } from "./tipos";
import { useCentro } from "./use-centro";

const api = {} as ClienteAdmin;
const mk = (id: string, read: boolean): NotificacionItem =>
  ({ id, read, title: id, body: "", category: "ventas", severity: "info", created_at: new Date().toISOString() }) as NotificacionItem;

describe("useCentro (ADR-0167)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contarNoLeidas as jest.Mock).mockResolvedValue(2);
    (cargarCategoriasDisponibles as jest.Mock).mockResolvedValue(CATEGORIAS);
    (listarNotificaciones as jest.Mock).mockResolvedValue({
      items: [mk("a", false), mk("b", false)],
      next_cursor: null,
      unread_count: 2,
    });
  });

  it("cuenta las no leídas aun con la hoja cerrada, sin pedir la lista", async () => {
    const { result } = await renderHook(() => useCentro(api, false));
    await waitFor(() => expect(result.current.noLeidas).toBe(2));
    expect(listarNotificaciones).not.toHaveBeenCalled();
  });

  it("al abrir carga la lista", async () => {
    const { result } = await renderHook(() => useCentro(api, true));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.cargando).toBe(false);
  });

  it("al abrir carga las categorías según los agentes creados", async () => {
    (cargarCategoriasDisponibles as jest.Mock).mockResolvedValue(["conversaciones", "sistema"]);
    const { result } = await renderHook(() => useCentro(api, true));
    await waitFor(() => expect(result.current.categorias).toEqual(["conversaciones", "sistema"]));
  });

  it("si falla la consulta de agentes conserva todas las categorías", async () => {
    (cargarCategoriasDisponibles as jest.Mock).mockRejectedValue(new Error("sin permiso"));
    const { result } = await renderHook(() => useCentro(api, true));
    await waitFor(() => expect(result.current.categorias).toEqual(CATEGORIAS));
  });

  it("si la categoría activa deja de estar disponible vuelve a Todas", async () => {
    let resolver: (valor: readonly string[]) => void = () => undefined;
    (cargarCategoriasDisponibles as jest.Mock).mockReturnValue(
      new Promise<readonly string[]>((resolve) => {
        resolver = resolve;
      }),
    );
    const { result } = await renderHook(() => useCentro(api, true));
    await act(async () => {
      result.current.setCategoria("cobros");
    });
    await act(async () => {
      resolver(["conversaciones", "sistema"]);
    });
    await waitFor(() => expect(result.current.categoria).toBeNull());
  });

  it("marcar leída es optimista y se revierte si falla", async () => {
    (marcarLeidas as jest.Mock).mockRejectedValue(new Error("red"));
    const { result } = await renderHook(() => useCentro(api, true));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    await act(async () => {
      await result.current.marcarLeida("a");
    });
    expect(result.current.items.find((n) => n.id === "a")?.read).toBe(false);
    expect(result.current.noLeidas).toBe(2);
  });

  it("archivar quita la fila", async () => {
    (archivarNotificacion as jest.Mock).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useCentro(api, true));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    await act(async () => {
      await result.current.archivar("a");
    });
    expect(result.current.items.map((n) => n.id)).toEqual(["b"]);
  });
});
