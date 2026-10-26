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

import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ClienteAdmin } from "@core/api/admin";
import { archivarNotificacion, contarNoLeidas, listarNotificaciones, marcarLeidas } from "./feed-api";
import type { NotificacionItem } from "./tipos";
import { useCentro } from "./use-centro";

const api = {} as ClienteAdmin;
const mk = (id: string, read: boolean): NotificacionItem =>
  ({ id, read, title: id, body: "", category: "ventas", severity: "info", created_at: new Date().toISOString() }) as NotificacionItem;

describe("useCentro (ADR-0167)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contarNoLeidas as jest.Mock).mockResolvedValue(2);
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
