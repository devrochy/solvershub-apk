import type { LeadCampoPerfil } from "../../api";
import { campoVisible, placeholderDe, validarCampoPerfil, validarPerfilDelCliente } from "./validacion-perfil";

const campo = (key: string, extra: Partial<LeadCampoPerfil> = {}): LeadCampoPerfil => ({
  group: "identidad",
  key,
  label: key,
  tipo: "texto",
  max_length: 120,
  options: [],
  required: false,
  ...extra,
});

describe("validación del perfil del cliente", () => {
  it("exige el nombre y respeta el máximo", () => {
    expect(validarCampoPerfil(campo("name", { required: true }), "  ", {})).toBe(
      "El nombre no puede quedar vacío.",
    );
    expect(validarCampoPerfil(campo("alias", { max_length: 3 }), "Ana María", {})).toBe(
      "Máximo 3 caracteres.",
    );
  });

  it("valida correo, teléfono y opciones", () => {
    expect(validarCampoPerfil(campo("email", { tipo: "email" }), "no-es-correo", {})).toContain("correo válido");
    expect(validarCampoPerfil(campo("phone", { tipo: "telefono" }), "+57 300", {})).toContain("7 a 15");
    expect(validarCampoPerfil(campo("phone", { tipo: "telefono" }), "+57 300 123 4567", {})).toBeNull();
    expect(
      validarCampoPerfil(
        campo("clasificacion", {
          tipo: "opciones",
          options: [{ value: "nuevo", label: "Nuevo" }, { value: "vip", label: "VIP" }],
        }),
        "inventada",
        {},
      ),
    ).toBe("Elige una opción de la lista.");
  });

  it("exige latitud y longitud juntas y dentro de rango", () => {
    expect(validarCampoPerfil(campo("latitud", { tipo: "numero" }), "4.6", { latitud: "4.6" })).toBe(
      "Latitud y longitud van juntas.",
    );
    expect(
      validarCampoPerfil(campo("latitud", { tipo: "numero" }), "120", { latitud: "120", longitud: "-74" }),
    ).toContain("entre -90 y 90");
  });

  it("oculta foto y país de teléfono del formulario y da placeholders", () => {
    expect(campoVisible(campo("avatar_url"))).toBe(false);
    expect(campoVisible(campo("pais_telefono"))).toBe(false);
    expect(campoVisible(campo("name"))).toBe(true);
    expect(placeholderDe(campo("name"))).toBe("Ej. Ana María");
    expect(placeholderDe(campo("email"))).toBe("ana@correo.com");
  });

  it("acumula los errores de todos los campos", () => {
    const campos = [
      campo("name", { required: true }),
      campo("email", { tipo: "email" }),
      campo("latitud", { tipo: "numero" }),
      campo("longitud", { tipo: "numero" }),
    ];
    const errores = validarPerfilDelCliente(campos, {
      name: "",
      email: "mal",
      latitud: "4.6",
      longitud: "-74",
    });
    expect(Object.keys(errores).sort()).toEqual(["email", "name"]);
  });
});
