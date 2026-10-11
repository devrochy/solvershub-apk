import { fireEvent, render, screen } from "@testing-library/react-native";
import { shType } from "@core/theme/tokens";
import { IconButton } from "./IconButton";
import { PageHeader } from "./PageHeader";

describe("PageHeader (kit)", () => {
  it("título como encabezado (Montserrat), descripción y acciones", async () => {
    await render(
      <PageHeader
        title="Clientes"
        description="128 activos"
        actions={<IconButton icon="search" label="Buscar" />}
      />,
    );
    const titulo = screen.getByRole("header", { name: "Clientes" });
    expect(titulo).toHaveStyle({ fontFamily: shType.h1.fontFamily });
    expect(screen.getByText("128 activos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buscar" })).toBeTruthy();
  });

  it("onBack: botón Volver accesible", async () => {
    const onBack = jest.fn();
    await render(<PageHeader title="Detalle" onBack={onBack} />);
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(onBack).toHaveBeenCalled();
  });
});
