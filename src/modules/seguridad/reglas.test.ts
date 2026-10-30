import type { AdminSesion } from "@core/session/types";
import {
  accionesDeDispositivo,
  contextoDeAcciones,
  mensajeDeAccionRechazada,
  nombreDelEquipo,
  rolDelDispositivo,
  TIPO_EVENTO,
  type DispositivoAcceso,
} from "./reglas";

const equipo = (parcial: Partial<DispositivoAcceso> = {}): DispositivoAcceso => ({
  id: "d-1",
  cuenta: { id: "a-1", nombre: "Ana", email: "ana@x.co", rol: "colaborador" },
  device_id_corto: "ab12cd",
  device_label: null,
  plataforma: "android",
  estado: "activo",
  origen: "autoregistro",
  rol_al_registrar: "colaborador",
  bloqueo_equipo: false,
  legacy: false,
  ultimo_uso_at: null,
  ultima_ip: null,
  aprobado_at: null,
  bloqueado_at: null,
  motivo: null,
  created_at: "2026-10-30T10:00:00Z",
  ...parcial,
});

const sesion = (p: Partial<AdminSesion> = {}): AdminSesion => ({
  token: "t",
  adminId: "yo",
  email: "yo@x.co",
  role: "admin",
  tenantId: "t-1",
  tenantName: "T",
  tenantRole: "owner",
  permissions: {},
  ...p,
});

describe("reglas de Seguridad de la app (HU-ACC-05)", () => {
  const dueno = contextoDeAcciones(sesion());
  const colaborador = contextoDeAcciones(sesion({ tenantRole: "colaborador", permissions: { devices: "write" } }));

  it("quién escribe", () => {
    expect(dueno).toMatchObject({ puedeEscribir: true, esDuenoOMaster: true });
    expect(colaborador).toMatchObject({ puedeEscribir: true, esDuenoOMaster: false });
    expect(contextoDeAcciones(sesion({ tenantRole: "colaborador", permissions: { devices: "read" } })).puedeEscribir).toBe(false);
    expect(contextoDeAcciones(null).puedeEscribir).toBe(false);
  });

  it("ofrece solo lo que la API acepta por estado", () => {
    expect(accionesDeDispositivo(equipo({ estado: "pendiente" }), dueno)).toEqual(["aprobar", "dar-de-baja"]);
    expect(accionesDeDispositivo(equipo({ estado: "activo" }), dueno)).toEqual(["bloquear", "dar-de-baja"]);
    expect(accionesDeDispositivo(equipo({ estado: "bloqueado" }), dueno)).toEqual(["reactivar"]);
  });

  it("nadie aprueba ni reactiva su propio equipo y los de un dueño son del dueño", () => {
    const propio = { cuenta: { id: "yo", nombre: null, email: "yo@x.co", rol: "owner" as const } };
    expect(accionesDeDispositivo(equipo({ ...propio, estado: "pendiente" }), dueno)).toEqual(["dar-de-baja"]);
    expect(accionesDeDispositivo(equipo({ ...propio, estado: "bloqueado" }), dueno)).toEqual([]);
    const deDueno = equipo({ cuenta: { id: "o-1", nombre: null, email: "o@x.co", rol: "owner" } });
    expect(accionesDeDispositivo(deDueno, colaborador)).toEqual([]);
  });

  it("etiquetas sin enums crudos", () => {
    expect(nombreDelEquipo({ device_label: " Samsung A14 ", plataforma: "android", legacy: false })).toBe("Samsung A14");
    expect(nombreDelEquipo({ device_label: null, plataforma: "ios", legacy: false })).toBe("iPhone");
    expect(rolDelDispositivo(equipo({ rol_al_registrar: "gestor" }))).toBe("Gestor");
    for (const t of Object.values(TIPO_EVENTO)) expect(t).not.toMatch(/_/);
    expect(mensajeDeAccionRechazada(409, "estado_desactualizado")).toMatch(/cambió mientras lo mirabas/);
    expect(mensajeDeAccionRechazada(500, "x")).toMatch(/Inténtalo de nuevo/);
  });
});
