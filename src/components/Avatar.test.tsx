import { fireEvent, render } from "@testing-library/react-native";
import { Avatar } from "./Avatar";

beforeEach(() => jest.clearAllMocks());

describe("Avatar", () => {
  it("muestra la foto si fotoUrl está presente", async () => {
    const { getByTestId, queryByTestId } = await render(
      <Avatar nombre="Laura" fotoUrl="https://cdn.test/f.jpg" />,
    );
    expect(getByTestId("avatar-foto")).toBeTruthy();
    expect(queryByTestId("avatar-icono")).toBeNull();
  });

  it("muestra el icono person si no hay foto", async () => {
    const { getByTestId, getByText } = await render(<Avatar nombre="Laura Martínez" />);
    expect(getByTestId("avatar-icono")).toBeTruthy();
    expect(getByText("person")).toBeTruthy();
  });

  it("muestra el icono person si la foto falla al cargar (onError)", async () => {
    const { getByTestId, queryByTestId } = await render(
      <Avatar nombre="Laura" fotoUrl="https://cdn.test/rota.jpg" />,
    );
    const foto = queryByTestId("avatar-foto");
    if (foto) {
      await fireEvent(foto, "error");
    }
    expect(getByTestId("avatar-icono")).toBeTruthy();
    expect(queryByTestId("avatar-foto")).toBeNull();
  });

  it("usa los colores opcionales en el fallback (fondo e icono)", async () => {
    const { getByTestId } = await render(
      <Avatar nombre="Laura" fondo="#123456" colorIcono="#abcdef" />,
    );
    expect(getByTestId("avatar-icono")).toHaveStyle({ backgroundColor: "#123456" });
    expect(getByTestId("icono-person")).toHaveStyle({ color: "#abcdef" });
  });

  it("aplica el anillo opcional (bordeColor) al fallback y a la foto", async () => {
    const { getByTestId, rerender } = await render(
      <Avatar nombre="Laura" bordeColor="rgba(255,255,255,0.35)" />,
    );
    expect(getByTestId("avatar-icono")).toHaveStyle({
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.35)",
    });

    await rerender(
      <Avatar nombre="Laura" fotoUrl="https://cdn.test/f.jpg" bordeColor="#000000" />,
    );
    expect(getByTestId("avatar-foto")).toHaveStyle({
      borderWidth: 2,
      borderColor: "#000000",
    });
  });

  it("reintenta la foto nueva cuando cambia fotoUrl tras un error", async () => {
    const { getByTestId, rerender } = await render(
      <Avatar nombre="Laura" fotoUrl="https://cdn.test/rota.jpg" />,
    );
    const foto = getByTestId("avatar-foto");
    await fireEvent(foto, "error");
    expect(getByTestId("avatar-icono")).toBeTruthy();

    await rerender(<Avatar nombre="Laura" fotoUrl="https://cdn.test/nueva.jpg" />);
    expect(getByTestId("avatar-foto")).toBeTruthy();
  });
});