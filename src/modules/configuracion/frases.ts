/** Listas de frases (frases prohibidas, palabras de escalamiento y de baja): reglas de alta y duplicados. */

export const MAX_LARGO_FRASE = 300;

/** Para comparar: sin tildes, mayúsculas ni signos, con espacios simples. «No, gracias» = «no gracias». */
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

/** Resultado de intentar agregar una frase: la lista nueva, o `null` si no cambia (corta, repetida o llena). */
export function agregarFrase(frases: string[], escrita: string, minLargo: number, max: number): string[] | null {
  const texto = escrita.trim();
  if (texto.length < minLargo || frases.length >= max) return null;
  const clave = normalizarFrase(texto);
  if (frases.some((f) => normalizarFrase(f) === clave)) return null;
  return [...frases, texto.slice(0, MAX_LARGO_FRASE)];
}
