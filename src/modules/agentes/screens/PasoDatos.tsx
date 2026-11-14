import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AdminApiError, type ClienteAdmin } from "@core/api/admin";
import { useAdminSession } from "@core/session/admin-session-context";
import { shSpace, shType } from "@core/theme/tokens";
import { prepararFotoDeProducto } from "@shared/media/preparar-foto-producto";
import { Badge, Button, Field, IconButton, RadioGroup, TextField, useKit } from "@shared/ui";
import {
  MAX_FOTOS,
  ErrorDeFoto,
  cargarEstadoDeImportacion,
  cargarEstadoDePrueba,
  columnasVisibles,
  confirmarPrecarga,
  conteoLegible,
  cotizarFotos,
  editarCelda,
  erroresDeLaFila,
  filaDesdeFoto,
  generarDatosDePrueba,
  quitarFila,
  registrosDesdeFilas,
  siguienteNumero,
  subirFoto,
  textoDeCotizacion,
  validarPrecarga,
  type CotizacionFotos,
  type EstadoDatosDePrueba,
  type EstadoImportacion,
  type FilaEditable,
  type RegistroDePrueba,
  type VistaPrevia,
} from "../carga";

/** Lo que el paso le entrega a «Lo cargado»: la lista local, por si la API de registros no existe (producción). */
export interface Cargado {
  registros: RegistroDePrueba[];
  resumen: string;
}

type Modo = "generar" | "fotos" | null;
type Elegida = ImagePicker.ImagePickerAsset;

/**
 * Paso «Datos» del asistente en la app (SPEC-45, HU-AOS-73): generar datos de prueba (solo en test) o cargar el
 * catálogo desde fotos de la cámara o la galería, una foto por producto, cotizando los créditos antes. El CSV se
 * importa desde el panel web. Cada opción aparece solo si la API la ofrece para este agente.
 */
export function PasoDatos({
  api,
  agenteId,
  onCargado,
}: {
  api: ClienteAdmin;
  agenteId: string;
  onCargado: (c: Cargado) => void;
}) {
  const { c, tonos } = useKit();
  const { sesion } = useAdminSession();
  const [prueba, setPrueba] = useState<EstadoDatosDePrueba | null>(null);
  const [importacion, setImportacion] = useState<EstadoImportacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState<Modo>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Elegida[]>([]);
  const [cotizacion, setCotizacion] = useState<CotizacionFotos | null>(null);
  const [avance, setAvance] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaEditable[]>([]);
  const [vista, setVista] = useState<VistaPrevia | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([cargarEstadoDePrueba(api, agenteId), cargarEstadoDeImportacion(api, agenteId)]).then(([p, i]) => {
      if (!vivo) return;
      setPrueba(p?.disponible ? p : null);
      setImportacion(i?.disponible && i.plantilla ? i : null);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [api, agenteId]);

  const plantilla = importacion?.plantilla ?? null;
  const conFotos = Boolean(plantilla?.importa_fotos);

  if (cargando) {
    return <ActivityIndicator testID="datos-cargando" />;
  }

  const opciones = [
    ...(prueba
      ? [{ value: "generar", label: "Generar datos de prueba", description: "La IA crea datos de ejemplo según la descripción de tu negocio. Solo en el entorno de pruebas." }]
      : []),
    ...(conFotos
      ? [{ value: "fotos", label: "Cargar desde fotos", description: "Una foto por producto: la IA propone nombre, categoría y precio si se ve. Cuesta créditos y te decimos cuántos antes." }]
      : []),
  ];

  async function generar() {
    setError(null);
    setTrabajando(true);
    try {
      const lote = await generarDatosDePrueba(api, agenteId);
      onCargado({ registros: [], resumen: `Listo: ${conteoLegible(lote.conteos)}.` });
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.code === "descripcion_requerida"
          ? "Falta la descripción de tu negocio: escríbela en Configuración › Identidad y vuelve a intentarlo."
          : e instanceof AdminApiError
            ? e.message
            : "Se cortó la conexión. Vuelve a intentarlo.",
      );
    } finally {
      setTrabajando(false);
    }
  }

  async function agregar(origen: "camara" | "galeria") {
    setError(null);
    const permiso =
      origen === "camara"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError(origen === "camara" ? "Se necesita permiso para usar la cámara." : "Se necesita permiso para acceder a tus fotos.");
      return;
    }
    const resultado =
      origen === "camara"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            selectionLimit: MAX_FOTOS,
            quality: 0.8,
          });
    if (resultado.canceled) return;
    const todas = [...fotos, ...resultado.assets].slice(0, MAX_FOTOS);
    if (fotos.length + resultado.assets.length > MAX_FOTOS) setError(`Se toman las primeras ${MAX_FOTOS} fotos de esta tanda.`);
    setFotos(todas);
    setCotizacion(null);
    try {
      setCotizacion(await cotizarFotos(api, agenteId, todas.length));
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : "No pudimos calcular cuántos créditos cuesta.");
    }
  }

  async function reconocer() {
    if (!sesion) return;
    setError(null);
    setTrabajando(true);
    setVista(null);
    let actuales = filas;
    let hechas = 0;
    for (const [i, foto] of fotos.entries()) {
      setAvance(`Reconociendo ${i + 1} de ${fotos.length}…`);
      try {
        const archivo = await prepararFotoDeProducto(foto, i);
        const fila = await subirFoto(sesion, agenteId, archivo);
        actuales = [...actuales, filaDesdeFoto(fila, siguienteNumero(actuales))];
        hechas += 1;
        setFilas(actuales);
      } catch (e) {
        if (e instanceof ErrorDeFoto && e.code === "plan_limit_creditos") {
          setError(`No te alcanza el crédito del mes: se reconocieron ${hechas} de ${fotos.length} fotos. Puedes confirmar las que ya están.`);
          break;
        }
        setError(e instanceof Error ? `Foto ${i + 1}: ${e.message}` : `No pudimos reconocer la foto ${i + 1}.`);
      }
    }
    setFotos([]);
    setCotizacion(null);
    setAvance(null);
    setTrabajando(false);
  }

  function cambiar(nuevas: FilaEditable[]) {
    setFilas(nuevas);
    setVista(null);
  }

  async function revisar() {
    setError(null);
    setTrabajando(true);
    try {
      setVista(await validarPrecarga(api, agenteId, filas));
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : "Se cortó la conexión. Vuelve a intentarlo.");
    } finally {
      setTrabajando(false);
    }
  }

  async function confirmar(soloValidas: boolean) {
    setError(null);
    setTrabajando(true);
    try {
      const hecha = await confirmarPrecarga(api, agenteId, filas, soloValidas);
      const partes = [`Listo: ${hecha.creadas} ${hecha.creadas === 1 ? "producto importado" : "productos importados"}`];
      if (hecha.existentes > 0) partes.push(`${hecha.existentes} ya ${hecha.existentes === 1 ? "existía" : "existían"}`);
      onCargado({ registros: registrosDesdeFilas(filas), resumen: `${partes.join("; ")}.` });
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : "Se cortó la conexión. Vuelve a intentarlo.");
    } finally {
      setTrabajando(false);
    }
  }

  const columnas = plantilla ? columnasVisibles(plantilla) : [];
  const obligatorias = new Set(plantilla?.columnas.filter((col) => col.obligatoria).map((col) => col.nombre) ?? []);
  const hayErrores = (vista?.errores_total ?? 0) > 0;
  const nuevas = vista?.nuevas ?? 0;

  return (
    <View style={styles.bloque} testID="paso-datos">
      <Text style={[shType.body, { color: c.textMuted }]}>
        Tu agente quedó creado como borrador. Cárgale datos para probarlo, o sigue sin cargar nada y lo haces después.
      </Text>

      {opciones.length > 0 ? (
        <RadioGroup
          label="Cómo cargar los datos"
          testID="datos-modo"
          value={modo ?? undefined}
          disabled={trabajando}
          onValueChange={(v) => {
            setModo(v as Modo);
            setError(null);
          }}
          options={opciones}
        />
      ) : (
        <Text style={[shType.body, { color: c.textMuted }]}>Este agente no tiene datos para cargar desde la app.</Text>
      )}
      {plantilla ? (
        <Text style={[shType.caption, { color: c.textMuted }]}>
          ¿Tienes tu lista en Excel o CSV? Impórtala desde el panel web: reconocemos tus columnas.
        </Text>
      ) : null}

      {modo === "generar" && prueba && (
        <View style={styles.bloque}>
          {prueba.lote ? (
            <Text style={[shType.caption, { color: c.textMuted }]}>Ya tenía datos de prueba: se reemplazan por los nuevos.</Text>
          ) : null}
          <Button onPress={generar} loading={trabajando} disabled={trabajando} testID="datos-generar">
            Generar datos de prueba
          </Button>
        </View>
      )}

      {modo === "fotos" && plantilla && (
        <View style={styles.bloque}>
          <View style={styles.fila}>
            <Button variant="secondary" onPress={() => agregar("camara")} disabled={trabajando} testID="fotos-camara">
              Tomar foto
            </Button>
            <Button variant="secondary" onPress={() => agregar("galeria")} disabled={trabajando} testID="fotos-galeria">
              Elegir de la galería
            </Button>
          </View>
          {fotos.length > 0 && (
            <View style={[styles.caja, { borderColor: c.border }]} testID="fotos-cotizacion">
              <Text style={[shType.body, { color: c.text }]}>
                {fotos.length} {fotos.length === 1 ? "foto elegida" : "fotos elegidas"}
              </Text>
              {cotizacion ? (
                <>
                  <Text style={[shType.body, { color: c.textMuted }]}>{textoDeCotizacion(cotizacion)}</Text>
                  {!cotizacion.alcanza ? (
                    <Text style={[shType.body, { color: tonos.warning.fg }]}>
                      No te alcanza el crédito del mes para todas. Quita fotos o revisa tu plan y consumo.
                    </Text>
                  ) : null}
                </>
              ) : (
                <ActivityIndicator />
              )}
              <Button
                onPress={reconocer}
                loading={trabajando}
                disabled={trabajando || !cotizacion || !cotizacion.alcanza}
                testID="fotos-reconocer"
              >
                {cotizacion
                  ? `Reconocer ${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"} por ${cotizacion.creditos} ${cotizacion.creditos === 1 ? "crédito" : "créditos"}`
                  : "Reconocer fotos"}
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  setFotos([]);
                  setCotizacion(null);
                }}
                disabled={trabajando}
              >
                Quitar las fotos
              </Button>
            </View>
          )}
          {avance ? <Text style={[shType.caption, { color: c.textMuted }]}>{avance}</Text> : null}
        </View>
      )}

      {error ? (
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert" testID="datos-error">
          {error}
        </Text>
      ) : null}

      {filas.length > 0 && (
        <View style={styles.bloque} testID="precarga">
          {filas.map((f) => {
            const errores = erroresDeLaFila(vista, f.fila);
            return (
              <View key={f.fila} style={[styles.caja, { borderColor: errores.length ? tonos.danger.border : c.border }]}>
                <View style={styles.fila}>
                  {f.imagenUrl ? (
                    <Image
                      source={{ uri: f.imagenUrl }}
                      style={styles.miniatura}
                      accessibilityLabel={`Foto de ${f.valores.nombre || "producto"}`}
                    />
                  ) : null}
                  <Text style={[shType.caption, { color: c.textMuted, flex: 1 }]}>Producto {f.fila - 1}</Text>
                  <IconButton
                    icon="delete-outline"
                    label={`Quitar el producto ${f.fila - 1}`}
                    onPress={() => cambiar(quitarFila(filas, f.fila))}
                    disabled={trabajando}
                  />
                </View>
                {columnas.map((col) => {
                  const errorCelda = errores.find((e) => e.columna === col);
                  return (
                    <Field
                      key={col}
                      label={`${col}${obligatorias.has(col) ? " *" : ""}`}
                      error={errorCelda?.mensaje}
                    >
                      <TextField
                        testID={`precarga-${f.fila}-${col}`}
                        value={f.valores[col] ?? ""}
                        disabled={trabajando}
                        onChangeText={(v) => cambiar(editarCelda(filas, f.fila, col, v))}
                      />
                      {f.inferidas.includes(col) ? <Badge label="IA" tone="accent" /> : null}
                    </Field>
                  );
                })}
                {errores
                  .filter((e) => !e.columna || !columnas.includes(e.columna))
                  .map((e, i) => (
                    <Text key={i} style={[shType.caption, { color: tonos.danger.fg }]}>
                      {e.mensaje}
                    </Text>
                  ))}
              </View>
            );
          })}
          {vista ? (
            <Text style={[shType.body, { color: c.textMuted }]} testID="precarga-resumen">
              {`${vista.total_filas} ${vista.total_filas === 1 ? "producto" : "productos"}: ${vista.nuevas} nuevos, ${vista.existentes} ya existían y ${vista.con_errores} con errores.`}
            </Text>
          ) : null}
          {!vista ? (
            <Button onPress={revisar} loading={trabajando} disabled={trabajando} testID="precarga-revisar">
              {`Revisar ${filas.length} ${filas.length === 1 ? "producto" : "productos"}`}
            </Button>
          ) : hayErrores ? (
            <Button onPress={() => confirmar(true)} loading={trabajando} disabled={trabajando || nuevas === 0} testID="precarga-confirmar">
              {`Importar solo los ${nuevas} válidos`}
            </Button>
          ) : (
            <Button onPress={() => confirmar(false)} loading={trabajando} disabled={trabajando || nuevas === 0} testID="precarga-confirmar">
              {nuevas === 0 ? "No hay productos nuevos" : `Confirmar e importar ${nuevas}`}
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: shSpace["3"] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace["2"], flexWrap: "wrap" },
  caja: { borderWidth: 1, borderRadius: 8, padding: shSpace["3"], gap: shSpace["2"] },
  miniatura: { width: 56, height: 56, borderRadius: 6 },
});
