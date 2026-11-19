import type { CuentaDeTransferencia, FormasDePago, FormasDePagoIn, Superpoder } from "../api";

/**
 * Estación 2 de la ruta, «Habilidades» (HU-APP-23, tableros `rb2`/`rn2`): qué superpoderes tiene encendidos el
 * agente y «Al cobrar». Lógica pura, con las reglas del panel (`lib/agentes-editor.ts`): los superpoderes se
 * guardan como `procedures` del borrador (`{id, version: "^M.0", overrides.examples}`), y cada uno necesita
 * `min_phrases` frases distintas de clientes (las de la habilidad ya cuentan). Lo recomendado es tenerlos todos.
 */
export type EstadoDeHabilidades = {
  /** Ids de los superpoderes encendidos. */
  activos: string[];
  /** Frases propias por superpoder (las de la habilidad no se repiten aquí). */
  frases: Record<string, string[]>;
};

type Ref = { id: string; version: string; overrides?: { examples?: string[]; description?: string | null } };

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

function refs(contenido: Record<string, unknown>): Ref[] {
  return (Array.isArray(contenido.procedures) ? contenido.procedures : []).filter(
    (r): r is Ref => typeof objeto(r).id === "string" && typeof objeto(r).version === "string",
  );
}

/** El estado de la estación desde el borrador (lo que `from-script` dejó o lo ya guardado). */
export function estadoDesdeBorrador(contenido: Record<string, unknown>): EstadoDeHabilidades {
  const declarados = refs(contenido);
  return {
    activos: declarados.map((r) => r.id),
    frases: Object.fromEntries(declarados.map((r) => [r.id, textos(objeto(r.overrides).examples)])),
  };
}

/** Lo recomendado por SolversHub: todos los superpoderes de su enfoque encendidos («Recomendado: las 5»). */
export function habilidadesRecomendadas(catalogo: readonly Superpoder[]): string[] {
  return catalogo.map((p) => p.id);
}

/** Rango compatible `^M.0` de una versión publicada (la regla del core). */
export function rangoCompatible(version: string): string {
  const mayor = version.split(".")[0] || "1";
  return `^${mayor}.0`;
}

/** Minúsculas, sin tildes ni signos, espacios simples (como `textos.normalizar` del core). */
export function normalizarFrase(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/** Frases distintas de un superpoder: las de la habilidad más las propias (una copia no suma). */
export function frasesDistintas(poder: Pick<Superpoder, "phrases">, propias: readonly string[]): number {
  return new Set([...poder.phrases, ...propias].map(normalizarFrase).filter(Boolean)).size;
}

/** Agrega una frase propia sin repetir (normalizada) ni vacías. */
export function conFrase(frases: readonly string[], nueva: string): string[] {
  const limpia = nueva.trim();
  if (!limpia || frases.some((f) => normalizarFrase(f) === normalizarFrase(limpia))) return [...frases];
  return [...frases, limpia];
}

/** El borrador con los superpoderes de la estación; el resto del contenido queda como estaba. */
export function contenidoConHabilidades(
  base: Record<string, unknown>,
  estado: EstadoDeHabilidades,
  catalogo: readonly Superpoder[],
): Record<string, unknown> {
  const anteriores = new Map(refs(base).map((r) => [r.id, r]));
  const orden = [...catalogo.map((p) => p.id), ...[...anteriores.keys()].filter((id) => !catalogo.some((p) => p.id === id))];
  const procedures: Ref[] = [];
  for (const id of orden) {
    if (!estado.activos.includes(id)) continue;
    const anterior = anteriores.get(id);
    const poder = catalogo.find((p) => p.id === id);
    const version = anterior?.version ?? (poder ? rangoCompatible(poder.version) : null);
    if (!version) continue;
    const frases = (estado.frases[id] ?? []).map((f) => f.trim()).filter(Boolean);
    const descripcion = anterior?.overrides?.description;
    const overrides = { ...(frases.length > 0 ? { examples: frases } : {}), ...(descripcion ? { description: descripcion } : {}) };
    procedures.push({ id, version, ...(Object.keys(overrides).length > 0 ? { overrides } : {}) });
  }
  return { ...base, procedures };
}

/** Lo que impide guardar la estación, o `null`. Mismas reglas que `problemas_de_superpoderes` del core. */
export function errorDeHabilidades(estado: EstadoDeHabilidades, catalogo: readonly Superpoder[], minFrases: number): string | null {
  const activos = catalogo.filter((p) => estado.activos.includes(p.id));
  if (activos.length === 0) return "Marca al menos un superpoder para este agente.";
  for (const poder of activos) {
    const total = frasesDistintas(poder, estado.frases[poder.id] ?? []);
    if (total < minFrases) {
      return `«${poder.title}» necesita al menos ${minFrases} frases distintas de clientes: agrega ${minFrases - total} más en Opciones avanzadas.`;
    }
  }
  return null;
}

export type DominioDeSuperpoderes = { key: string; label: string; items: Superpoder[] };

/** Superpoderes agrupados por dominio («Al vender», «Al agendar»…); uno sin dominio va en «Otros», al final. */
export function agruparPorDominio(superpoderes: readonly Superpoder[]): DominioDeSuperpoderes[] {
  const grupos = new Map<string, DominioDeSuperpoderes>();
  for (const poder of superpoderes) {
    const key = poder.group || "otros";
    const label = key === "otros" ? "Otros" : poder.group_label || "Otros";
    if (!grupos.has(key)) grupos.set(key, { key, label, items: [] });
    grupos.get(key)!.items.push(poder);
  }
  const lista = [...grupos.values()];
  return [...lista.filter((g) => g.key !== "otros"), ...lista.filter((g) => g.key === "otros")];
}

/** «Recomendado: las 5» / «Recomendado: la única». */
export function textoDeRecomendadoDelGrupo(cuantas: number): string {
  return cuantas === 1 ? "Recomendado: la única" : `Recomendado: las ${cuantas}`;
}

/** «4 de 5 encendidas», para «Revisar y publicar». */
export function resumenDeHabilidades(estado: EstadoDeHabilidades, catalogo: readonly Superpoder[]): string {
  const encendidas = catalogo.filter((p) => estado.activos.includes(p.id)).length;
  return `${encendidas} de ${catalogo.length} ${catalogo.length === 1 ? "encendida" : "encendidas"}`;
}

// ------------------------------------------------------------------ «Al cobrar» (SPEC-48, solo Ventas)

/** La cuenta de transferencia que se edita en la ruta: entidad y número (lo demás, en el panel web). */
export type CuentaDeLaRuta = { entidad: string; numero: string };

export function cuentaDeLaRuta(formas: FormasDePago | null): CuentaDeLaRuta {
  const primera = formas?.transfer_accounts[0];
  return { entidad: primera?.entity ?? "", numero: primera?.accountNumber ?? "" };
}

/** Qué impide guardar «Al cobrar», o `null`. Una cuenta a medias se marca; sin cuenta se guarda igual. */
export function errorDeLaCuenta(cuenta: CuentaDeLaRuta): string | null {
  const entidad = cuenta.entidad.trim();
  const numero = cuenta.numero.trim();
  if (Boolean(entidad) !== Boolean(numero)) return "La cuenta necesita la entidad y el número.";
  return null;
}

/**
 * El cuerpo de `PUT …/payment-forms` con la cuenta de la ruta: reemplaza la primera cuenta (o la agrega), conserva
 * las demás, y enciende transferencia si hay cuenta. Las otras formas quedan como estaban.
 */
export function formasConCuenta(formas: FormasDePago, cuenta: CuentaDeLaRuta): FormasDePagoIn {
  const entidad = cuenta.entidad.trim();
  const numero = cuenta.numero.trim();
  const [primera, ...resto] = formas.transfer_accounts;
  const nueva: CuentaDeTransferencia | null = entidad
    ? {
        entity: entidad,
        accountNumber: numero,
        accountType: primera?.accountType ?? "",
        holderName: primera?.holderName ?? "",
        holderDocument: primera?.holderDocument ?? "",
      }
    : null;
  const cuentas = nueva ? [nueva, ...resto] : resto;
  return {
    forms: formas.forms.map((f) => ({
      method: f.method,
      instructions: f.instructions,
      enabled: f.method === "transferencia" && nueva ? true : f.enabled,
    })),
    transfer_accounts: cuentas,
    transfer_proof_required: formas.transfer_proof_required,
    transfer_ocr_enabled: formas.transfer_ocr_enabled,
  };
}

/** Si la cuenta en pantalla es la misma que ya está guardada. */
export function mismaCuenta(formas: FormasDePago | null, cuenta: CuentaDeLaRuta): boolean {
  const guardada = cuentaDeLaRuta(formas);
  return guardada.entidad.trim() === cuenta.entidad.trim() && guardada.numero.trim() === cuenta.numero.trim();
}
