import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { SeccionResumen } from "./SeccionResumen";

describe("SeccionResumen", () => {
  it("lleva un título de sección, la frase de apoyo y su contenido", async () => {
    await render(
      <SeccionResumen titulo="Agente general" apoyo="Todo el negocio, últimos 7 días.">
        <Text>contenido</Text>
      </SeccionResumen>,
    );
    expect(screen.getByRole("header", { name: "Agente general" })).toBeTruthy();
    expect(screen.getByText("Todo el negocio, últimos 7 días.")).toBeTruthy();
    expect(screen.getByText("contenido")).toBeTruthy();
  });

  it("la frase de apoyo es opcional", async () => {
    await render(
      <SeccionResumen titulo="Agentes">
        <Text>x</Text>
      </SeccionResumen>,
    );
    expect(screen.getByRole("header", { name: "Agentes" })).toBeTruthy();
  });
});
