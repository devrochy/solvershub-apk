import { fireEvent, render } from "@testing-library/react-native";

import { HorarioSemanal } from "./HorarioSemanal";
import type { Franja } from "../horarioAtencion";

const semana: Franja[] = [
  ...[0, 1, 2, 3, 4].map((day) => ({ day, from: "08:00", to: "18:00" })),
  { day: 5, from: "08:00", to: "13:00" },
];

describe("HorarioSemanal (variante minimalista)", () => {
  it("muestra la semana y solo abre el día que se pide", async () => {
    const { getByLabelText, getByText, queryByLabelText } = await render(
      <HorarioSemanal id="h" franjas={semana} onChange={() => undefined} />,
    );

    expect(getByText(/Lun a Vie, 8:00 a. m. – 6:00 p. m./)).toBeTruthy();
    expect(queryByLabelText("Lunes: abre: 8:00 a. m.")).toBeNull();

    await fireEvent.press(getByLabelText(/Lunes: .*Editar el horario/));
    expect(getByLabelText("Lunes: abre: 8:00 a. m.")).toBeTruthy();
    expect(queryByLabelText("Martes: abre: 8:00 a. m.")).toBeNull();
  });

  it("«Atiende siempre» vacía la semana", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(<HorarioSemanal id="h" franjas={semana} onChange={onChange} />);

    await fireEvent(getByTestId("h-siempre"), "valueChange", true);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("copiar el lunes solo toca martes a viernes", async () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = await render(
      <HorarioSemanal
        id="h"
        franjas={[
          { day: 0, from: "08:00", to: "18:00" },
          { day: 5, from: "08:00", to: "13:00" },
        ]}
        onChange={onChange}
      />,
    );

    await fireEvent.press(getByLabelText(/Lunes: .*Editar el horario/));
    await fireEvent.press(getByText("Copiar a martes–viernes"));

    const llamada = onChange.mock.calls.at(-1)?.[0] as Franja[];
    expect(llamada.filter((f) => [1, 2, 3, 4].includes(f.day))).toHaveLength(4);
    expect(llamada.filter((f) => f.day === 5)).toEqual([{ day: 5, from: "08:00", to: "13:00" }]);
    expect(llamada.some((f) => f.day === 6)).toBe(false);
  });

  it("abre el día con cierre invertido y muestra el error", async () => {
    const { getByText } = await render(
      <HorarioSemanal
        id="h"
        franjas={[{ day: 2, from: "18:00", to: "08:00" }]}
        onChange={() => undefined}
      />,
    );

    expect(getByText(/cierre del miércoles/)).toBeTruthy();
  });
});
