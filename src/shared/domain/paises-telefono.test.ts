import {
  PAISES_TELEFONO,
  PAIS_DEFECTO_TELEFONO,
  paisDesdeTelefono,
} from "./paises-telefono";

describe("paises-telefono", () => {
  it("incluye Bolivia y Colombia con sus prefijos y bandera", () => {
    const bolivia = PAISES_TELEFONO.find((p) => p.codigo === "BO");
    const colombia = PAISES_TELEFONO.find((p) => p.codigo === "CO");
    expect(bolivia).toMatchObject({ prefijo: "+591", bandera: "🇧🇴" });
    expect(colombia).toMatchObject({ prefijo: "+57", bandera: "🇨🇴" });
  });

  it("infiere el país desde un número internacional", () => {
    expect(paisDesdeTelefono("+5917000111")).toMatchObject({ codigo: "BO" });
    expect(paisDesdeTelefono("+573184935933")).toMatchObject({ codigo: "CO" });
  });

  it("devuelve null para números sin prefijo internacional", () => {
    expect(paisDesdeTelefono("7000111")).toBeNull();
    expect(paisDesdeTelefono("")).toBeNull();
  });

  it("resuelve el prefijo compartido +1 a Estados Unidos (orden del catálogo)", () => {
    expect(paisDesdeTelefono("+12125551234")).toMatchObject({ codigo: "US" });
  });

  it("usa Bolivia como país por defecto", () => {
    expect(PAIS_DEFECTO_TELEFONO.codigo).toBe("BO");
  });
});