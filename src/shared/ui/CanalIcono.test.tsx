import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { conAlfa } from "@core/theme/alpha";
import { CanalIcono, marcaDelCanal } from "./CanalIcono";
import { kitDeTema } from "./tema";

describe("marcaDelCanal", () => {
  it("usa el logo oficial para las redes y un icono genérico para el resto", () => {
    expect(marcaDelCanal("whatsapp_cloud")).toEqual({ logo: "whatsapp" });
    expect(marcaDelCanal("whatsapp_waweb")).toEqual({ logo: "whatsapp" });
    expect(marcaDelCanal("instagram")).toEqual({ logo: "instagram" });
    expect(marcaDelCanal("facebook")).toEqual({ logo: "messenger" });
    expect(marcaDelCanal("webchat")).toEqual({ icono: "language" });
    expect(marcaDelCanal(null)).toEqual({ icono: "chat-bubble-outline" });
  });
});

describe("CanalIcono (kit)", () => {
  it("va enmarcado y desvanecido en el tono de la marca, y es decorativo", async () => {
    await render(<CanalIcono canal="instagram" size={24} testID="canal" />);
    const caja = screen.getByTestId("canal", { includeHiddenElements: true });
    const estilo = StyleSheet.flatten(caja.props.style);
    // El tono es el `link` del tema activo (cian en oscuro, azul en claro).
    const link = [kitDeTema("oscuro").c.link, kitDeTema("claro").c.link].find(
      (l) => estilo.backgroundColor === conAlfa(l, 0.14),
    );
    expect(link).toBeDefined();
    expect(estilo.borderColor).toBe(conAlfa(link as string, 0.3));
    expect(caja.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
