import type { CollaboratorItem } from "../api";
import {
  accesoLabel,
  esLimiteDePlan,
  mensajeDeAlta,
  puedeActuarSobre,
  resumenEquipo,
  rolLabel,
  seccionLabel,
  seccionesOtorgables,
  validarEmail,
  validarPassword,
  validarUsername,
  vinculoLegible,
} from "./dominio";

function cuenta(cambios: Partial<CollaboratorItem> = {}): CollaboratorItem {
  return {
    id: "a-1",
    email: "ana@demo.test",
    username: "ana",
    nombre: "Ana",
    telefono: "+57 300 000 0000",
    avatar_url: null,
    role: "colaborador",
    active: true,
    is_self: false,
    is_platform_master: false,
    permissions: [],
    links: [],
    ...cambios,
  };
}

describe("dominio de Equipo", () => {
  it("etiqueta roles y secciones en español", () => {
    expect(rolLabel("owner")).toBe("Dueño");
    expect(rolLabel("colaborador")).toBe("Colaborador");
    expect(rolLabel("otro")).toBe("Otro");
    expect(seccionLabel("pack_cobranza:carteras")).toBe("Cobranza · Carteras");
    expect(seccionLabel("pack_calendar:tipos")).toBe("Calendario · Tipos de cita");
    expect(accesoLabel("write")).toBe("escritura");
    expect(accesoLabel("none")).toBe("sin acceso");
    expect(vinculoLegible({ name: "Tienda", role: "owner" })).toBe("Tienda · Dueño");
  });

  it("deja al master actuar sobre todas y al dueño no tocar plataforma ni otros dueños", () => {
    expect(puedeActuarSobre(cuenta({ is_platform_master: true }), true)).toBe(true);
    expect(puedeActuarSobre(cuenta({ is_platform_master: true }), false)).toBe(false);
    expect(puedeActuarSobre(cuenta({ role: "tester" }), false)).toBe(false);
    expect(puedeActuarSobre(cuenta({ role: "owner" }), false)).toBe(false);
    expect(
      puedeActuarSobre(cuenta({ links: [{ slug: "t", name: "T", role: "owner" }] }), false),
    ).toBe(false);
    expect(puedeActuarSobre(cuenta(), false)).toBe(true);
    expect(puedeActuarSobre(cuenta({ is_self: true }), false)).toBe(true);
  });

  it("excluye las secciones prohibidas para un dueño", () => {
    const permisos = {
      collaborators: "write",
      connections: "write",
      qa: "read",
      settings: "write",
      tenants: "read",
    };
    expect(seccionesOtorgables(permisos, false)).toEqual([
      "connections",
      "settings",
    ]);
    expect(seccionesOtorgables(permisos, true)).toEqual([
      "collaborators",
      "connections",
      "qa",
      "settings",
      "tenants",
    ]);
  });

  it("resume cuentas e invitaciones", () => {
    expect(
      resumenEquipo(
        [cuenta({ id: "1", active: true }), cuenta({ id: "2", active: false })],
        [{ id: "i-1", email: "x@x.com", rol: "colaborador", creadaEn: null }],
      ),
    ).toEqual({ total: 2, activas: 1, pendientes: 1 });
  });

  it("valida correo, usuario y contraseña con mensajes en español", () => {
    expect(validarEmail("")).toBe("Escribe el correo del colaborador.");
    expect(validarEmail("ana@")).toContain("correo válido");
    expect(validarEmail("ana@correo.com")).toBeNull();
    expect(validarUsername("ab")).toContain("Mínimo 3");
    expect(validarUsername("ana perez")).toContain("Solo letras");
    expect(validarUsername("ana.perez")).toBeNull();
    expect(validarPassword("1234567")).toBe("Mínimo 8 caracteres.");
    expect(validarPassword("12345678")).toBeNull();
    expect(esLimiteDePlan("plan_limit_colaboradores")).toBe(true);
    expect(mensajeDeAlta("invitado")).toContain("invitación");
    expect(mensajeDeAlta("creado")).toContain("Cuenta creada");
  });
});
