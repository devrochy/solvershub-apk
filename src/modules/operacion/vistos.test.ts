import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  CLAVE_VISTOS,
  actividadDelChat,
  estaVisto,
  guardarVistos,
  leerVistos,
  marcarVisto,
  podarVistos,
} from "./vistos";

const chat = (id: string, last_message_at: string | null, started_at = "2026-10-09T14:00:00Z") => ({
  id,
  last_message_at,
  started_at,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("vistos de la bandeja", () => {
  it("usa el último mensaje como actividad (o el inicio si no hay)", () => {
    expect(actividadDelChat(chat("a", "2026-10-09T15:00:00Z"))).toBe("2026-10-09T15:00:00Z");
    expect(actividadDelChat(chat("a", null))).toBe("2026-10-09T14:00:00Z");
  });

  it("marca y considera visto el chat hasta que llegue actividad nueva", () => {
    const marca = marcarVisto({}, "a", "2026-10-09T15:00:00Z");
    expect(estaVisto(marca, chat("a", "2026-10-09T15:00:00Z"))).toBe(true);
    expect(estaVisto(marca, chat("a", "2026-10-09T16:00:00Z"))).toBe(false);
  });

  it("no retrocede la marca a una actividad más vieja", () => {
    const marca = marcarVisto({}, "a", "2026-10-09T16:00:00Z");
    expect(marcarVisto(marca, "a", "2026-10-09T15:00:00Z")).toBe(marca);
  });

  it("poda a las marcas más recientes", () => {
    const vistos = podarVistos(
      {
        a: "2026-10-09T15:00:00Z",
        b: "2026-10-09T17:00:00Z",
        c: "2026-10-09T16:00:00Z",
      },
      2,
    );
    expect(Object.keys(vistos).sort()).toEqual(["b", "c"]);
  });

  it("lee lo guardado y tolera un valor corrupto", async () => {
    await guardarVistos({ a: "2026-10-09T15:00:00Z" });
    expect(await leerVistos()).toEqual({ a: "2026-10-09T15:00:00Z" });

    await AsyncStorage.setItem(CLAVE_VISTOS, "{no-es-json");
    expect(await leerVistos()).toEqual({});
  });
});
