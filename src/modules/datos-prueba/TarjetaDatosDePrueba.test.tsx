import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { TarjetaDatosDePrueba } from "./TarjetaDatosDePrueba";

const estado = {
  modulo: "ventas" as const,
  titulo: "Ventas",
  disponible: true,
  motivo: null,
  falta_descripcion: false,
  lote: null,
};

function cliente(respuestas: Record<string, unknown> = {}) {
  return {
    get: jest.fn().mockResolvedValue(estado),
    post: jest.fn().mockResolvedValue({
      lote_id: "l1",
      modo: "catalogo",
      origen: "llm",
      creado_en: "2026-10-28T00:00:00Z",
      conteos: { producto: 3 },
      motivo_plantilla: null,
      retirados: 0,
    }),
    del: jest.fn().mockResolvedValue({ retirados: 3 }),
    put: jest.fn(),
    patch: jest.fn(),
    ...respuestas,
  };
}

describe("TarjetaDatosDePrueba (HU-QA-10)", () => {
  it("muestra el aviso y genera desde el módulo", async () => {
    const api = cliente();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { getByText, getByTestId } = await render(
      <TarjetaDatosDePrueba api={api as never} modulo="ventas" />,
    );
    await waitFor(() => expect(getByText("Datos de prueba de Ventas")).toBeTruthy());
    await fireEvent.press(getByTestId("datos-prueba-generar"));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/admin/datos-de-prueba/ventas"),
    );
  });

  it("se oculta sin la API de test", async () => {
    const api = cliente({ get: jest.fn().mockRejectedValue(new Error("404")) });
    const { queryByText } = await render(
      <TarjetaDatosDePrueba api={api as never} modulo="ventas" />,
    );
    await waitFor(() => expect(queryByText("Datos de prueba de Ventas")).toBeNull());
  });
});
