import { AppState } from "react-native";
import { renderHook } from "@testing-library/react-native";
import type { ConversationSummary, MessageItem } from "./api";
import {
  INTERVALO_HILO_MS,
  cursorDe,
  unirConversaciones,
  unirMensajes,
  usePolling,
} from "./use-en-vivo";

function mensaje(id: string, created_at: string, content = id): MessageItem {
  return {
    id,
    direction: "inbound",
    sender_type: "customer",
    content,
    status: "sent",
    created_at,
    tool_calls: [],
  };
}

function chat(id: string, extra: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id,
    customer_name: id,
    external_id: null,
    channel: "whatsapp",
    status: "open",
    bot_paused: false,
    pending_count: 0,
    started_at: "2026-10-06T00:00:00Z",
    ...extra,
  };
}

describe("use-en-vivo", () => {
  beforeAll(() => {
    Object.defineProperty(AppState, "currentState", { configurable: true, value: "active" });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("deduplica mensajes por id y ordena por fecha", () => {
    const a = mensaje("a", "2026-10-06T10:00:00.000001Z");
    const b = mensaje("b", "2026-10-06T10:00:01.000001Z");
    const bEditado = { ...b, status: "delivered" };
    const c = mensaje("c", "2026-10-06T10:00:00.500000Z");
    const unidos = unirMensajes([a, b], [bEditado, c]);
    expect(unidos.map((m) => m.id)).toEqual(["a", "c", "b"]);
    expect(unidos[2].status).toBe("delivered");
    expect(cursorDe([a, b])).toBe("2026-10-06T10:00:01.000001Z");
    expect(cursorDe([])).toBeNull();
  });

  it("une la primera página sin duplicar y respeta los filtros", () => {
    const actuales = [chat("a"), chat("b", { status: "escalated" })];
    const nuevas = [chat("a", { status: "closed" }), chat("c")];
    const unidas = unirConversaciones(actuales, nuevas, { status: "open" });
    expect(unidas.map((c) => c.id)).toEqual(["c"]);
  });

  it("ordena por llegada al unir la lista", () => {
    const viejo = chat("a", { last_message_at: "2026-10-06T10:00:00Z" });
    const nuevo = chat("b", { last_message_at: "2026-10-06T11:00:00Z" });
    expect(unirConversaciones([viejo, nuevo], [], {}).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("consulta cada intervalo sin solapar y se detiene al desmontar", async () => {
    jest.useFakeTimers();
    const tarea = jest.fn(async () => undefined);
    const { unmount } = await renderHook(() => usePolling(tarea, INTERVALO_HILO_MS));
    await jest.advanceTimersByTimeAsync(INTERVALO_HILO_MS * 2);
    expect(tarea).toHaveBeenCalledTimes(2);
    await unmount();
    await jest.advanceTimersByTimeAsync(INTERVALO_HILO_MS * 3);
    expect(tarea).toHaveBeenCalledTimes(2);
  });
});
