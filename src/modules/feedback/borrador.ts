import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { TipoReporte } from "./api";
import type { ImagenPreparada } from "./imagenes";

const PREFIJO = "feedback_borrador";

/**
 * Borrador del formulario «Reportar un problema» con su `Idempotency-Key` (HU-FB-07). La clave
 * nace al abrir el formulario y vive con el borrador mientras el envío esté pendiente: si la red
 * se corta, el reintento repite la misma clave y el backend devuelve el reporte original (200)
 * en vez de crear otro. Se borra solo tras un 201 o un 200.
 *
 * Las imágenes guardan la URI de caché que dejó el manipulador: si el sistema limpia la caché,
 * al restaurar se descartan las que ya no existen y se conservan el texto y la clave.
 */
export interface BorradorReporte {
  idempotencyKey: string;
  tipo: TipoReporte | null;
  area: string | null;
  titulo: string;
  descripcion: string;
  imagenes: ImagenPreparada[];
}

/** Por negocio y usuario: dos cuentas en el mismo celular no comparten borrador. */
export function claveDelBorrador(tenantId: string | null, adminId: string): string {
  return `${PREFIJO}_${tenantId ?? "sin-negocio"}_${adminId}`;
}

export function borradorNuevo(): BorradorReporte {
  return {
    idempotencyKey: Crypto.randomUUID(),
    tipo: null,
    area: null,
    titulo: "",
    descripcion: "",
    imagenes: [],
  };
}

function esBorrador(valor: unknown): valor is BorradorReporte {
  const b = valor as Partial<BorradorReporte> | null;
  return (
    !!b &&
    typeof b.idempotencyKey === "string" &&
    b.idempotencyKey.length >= 8 &&
    typeof b.titulo === "string" &&
    typeof b.descripcion === "string" &&
    Array.isArray(b.imagenes)
  );
}

/** El borrador pendiente, o uno nuevo con su clave recién generada. */
export async function abrirBorrador(clave: string): Promise<BorradorReporte> {
  try {
    const raw = await AsyncStorage.getItem(clave);
    const datos: unknown = raw ? JSON.parse(raw) : null;
    if (esBorrador(datos)) return datos;
  } catch {
    // Sin almacenamiento o JSON roto: se arranca uno nuevo.
  }
  const nuevo = borradorNuevo();
  await guardarBorrador(clave, nuevo);
  return nuevo;
}

export async function guardarBorrador(clave: string, borrador: BorradorReporte): Promise<void> {
  try {
    await AsyncStorage.setItem(clave, JSON.stringify(borrador));
  } catch {
    // Sin persistencia la clave sigue viva en memoria mientras la pantalla esté abierta.
  }
}

export async function borrarBorrador(clave: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(clave);
  } catch {
    // Nada que limpiar.
  }
}
