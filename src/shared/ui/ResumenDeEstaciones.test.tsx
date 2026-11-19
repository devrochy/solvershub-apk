import { fireEvent, render, screen } from "@testing-library/react-native";
import { ResumenDeEstaciones } from "./ResumenDeEstaciones";

describe("ResumenDeEstaciones (kit, HU-APP-23)", () => {
  it("lista lo hecho con «Editar» por estación", async () => {
    const onEditar = jest.fn();
    await render(
      <ResumenDeEstaciones
        estaciones={[
          { id: "1", titulo: "Tipo", resumen: "Agenda" },
          { id: "2", titulo: "Habilidades", resumen: "5 de 5 encendidas" },
        ]}
        onEditar={onEditar}
      />,
    );
    expect(screen.getByLabelText("Habilidades (hecha): 5 de 5 encendidas")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("resumen-estaciones-editar-2"));
    expect(onEditar).toHaveBeenCalledWith("2");
  });
});
