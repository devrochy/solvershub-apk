import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { AdminApiError } from "@core/api/admin";
import { useAdminSession } from "@core/session/admin-session-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Chip, EmptyState, Field, Icono, PageHeader, TextField, useKit } from "@shared/ui";
import { enviarReporte, type FeedbackCatalogo, type TipoReporte } from "../api";
import {
  abrirBorrador,
  borrarBorrador,
  borradorNuevo,
  claveDelBorrador,
  guardarBorrador,
  type BorradorReporte,
} from "../borrador";
import { useCatalogoFeedback } from "../catalogo";
import { ImagenMuyGrande, imagenesQueExisten, prepararImagen, type ImagenPreparada } from "../imagenes";
import {
  DESCRIPCION_MAX,
  MAX_BYTES_IMAGEN,
  MAX_IMAGENES,
  TIPOS,
  TITULO_MAX,
  mensajeDeEnvio,
  validarTextos,
} from "../textos";

export interface ReportarProblemaScreenProps {
  onBack(): void;
  onVerMisReportes(): void;
}

function limitesDe(catalogo: FeedbackCatalogo) {
  return {
    maxImagenes: catalogo.limites.max_adjuntos || MAX_IMAGENES,
    maxBytes: catalogo.limites.max_bytes_por_archivo || MAX_BYTES_IMAGEN,
  };
}

/**
 * «Reportar un problema» (SPEC-54, HU-FB-07): tipo, área, título, descripción y hasta 5
 * imágenes (solo imágenes: el PDF necesita un módulo nativo y queda para el panel). El borrador y
 * su `Idempotency-Key` se guardan en el celular hasta que el backend confirma (201 o 200).
 */
export function ReportarProblemaScreen({ onBack, onVerMisReportes }: ReportarProblemaScreenProps) {
  const insets = useSafeAreaInsets();
  const { c } = useKit();
  const { sesion } = useAdminSession();
  const catalogo = useCatalogoFeedback();
  const clave = sesion ? claveDelBorrador(sesion.tenantId, sesion.adminId) : null;

  const [borrador, setBorrador] = useState<BorradorReporte | null>(null);
  const [errores, setErrores] = useState<{ tipo?: string; area?: string; titulo?: string; descripcion?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [pendienteDeRed, setPendienteDeRed] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    void abrirBorrador(clave).then((b) => {
      if (!vivo) return;
      const imagenes = imagenesQueExisten(b.imagenes);
      setBorrador(imagenes.length === b.imagenes.length ? b : { ...b, imagenes });
    });
    return () => {
      vivo = false;
    };
  }, [clave]);

  const cambiar = (cambio: Partial<BorradorReporte> | ((actual: BorradorReporte) => Partial<BorradorReporte>)) => {
    setBorrador((actual) => {
      if (!actual) return actual;
      const siguiente = { ...actual, ...(typeof cambio === "function" ? cambio(actual) : cambio) };
      if (clave) void guardarBorrador(clave, siguiente);
      return siguiente;
    });
    setError(null);
  };

  if (!sesion) return null;

  const listo = catalogo.estado === "listo" ? catalogo.catalogo : null;
  const limites = listo ? limitesDe(listo) : { maxImagenes: MAX_IMAGENES, maxBytes: MAX_BYTES_IMAGEN };

  const agregar = async (origen: "camara" | "galeria") => {
    if (!borrador) return;
    setError(null);
    const libres = limites.maxImagenes - borrador.imagenes.length;
    if (libres <= 0) {
      setError(`Puedes adjuntar hasta ${limites.maxImagenes} imágenes.`);
      return;
    }
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
            selectionLimit: libres,
            quality: 0.8,
          });
    if (resultado.canceled) return;
    const elegidas = resultado.assets.slice(0, libres);
    setPreparando(true);
    const nuevas: ImagenPreparada[] = [];
    let grandes = 0;
    for (const [i, asset] of elegidas.entries()) {
      try {
        nuevas.push(await prepararImagen(asset, borrador.imagenes.length + i, limites.maxBytes));
      } catch (e) {
        if (e instanceof ImagenMuyGrande) grandes += 1;
      }
    }
    if (!montado.current) return;
    setPreparando(false);
    cambiar((actual) => ({ imagenes: [...actual.imagenes, ...nuevas] }));
    if (resultado.assets.length > libres) {
      setError(`Se tomaron las primeras ${libres}: el máximo es ${limites.maxImagenes} imágenes.`);
    } else if (grandes > 0) {
      setError(grandes === 1 ? "Una imagen pesa más de 8 MB y no se adjuntó." : `${grandes} imágenes pesan más de 8 MB y no se adjuntaron.`);
    }
  };

  const quitar = (uri: string) => {
    if (!borrador) return;
    cambiar((actual) => ({ imagenes: actual.imagenes.filter((imagen) => imagen.uri !== uri) }));
  };

  const descartar = async () => {
    if (!clave) return;
    await borrarBorrador(clave);
    const nuevo = borradorNuevo();
    await guardarBorrador(clave, nuevo);
    setBorrador(nuevo);
    setErrores({});
    setError(null);
    setPendienteDeRed(false);
  };

  const enviar = async () => {
    if (!borrador || !clave || enviando) return;
    const validacion: typeof errores = { ...validarTextos(borrador.titulo, borrador.descripcion) };
    if (!borrador.tipo) validacion.tipo = "Elige si es un error, una mejora o una idea.";
    if (!borrador.area) validacion.area = "Elige el área del problema.";
    setErrores(validacion);
    if (Object.keys(validacion).length > 0 || !borrador.tipo || !borrador.area) return;

    setEnviando(true);
    setError(null);
    const datos = {
      tipo: borrador.tipo,
      area: borrador.area,
      titulo: borrador.titulo.trim(),
      descripcion: borrador.descripcion.trim(),
    };
    const imagenes = borrador.imagenes.map(({ uri, name, type }) => ({ uri, name, type }));
    let actual = borrador;
    try {
      try {
        await enviarReporte(sesion, datos, imagenes, actual.idempotencyKey);
      } catch (e) {
        // La clave es de un reporte de otra persona (otro usuario en este celular): una nueva y otra vez.
        if (!(e instanceof AdminApiError && e.status === 409 && e.code === "idempotency_key_en_uso")) throw e;
        actual = { ...actual, idempotencyKey: Crypto.randomUUID() };
        await guardarBorrador(clave, actual);
        if (montado.current) setBorrador(actual);
        await enviarReporte(sesion, datos, imagenes, actual.idempotencyKey);
      }
      // 201 o 200 (replay): el reporte existe una sola vez; se olvidan borrador y clave.
      await borrarBorrador(clave);
      if (!montado.current) return;
      setPendienteDeRed(false);
      setEnviado(true);
    } catch (e) {
      if (!montado.current) return;
      const { texto, red } = mensajeDeEnvio(e);
      setPendienteDeRed(red);
      if (e instanceof AdminApiError && e.fields) {
        setErrores((previos) => ({ ...previos, ...e.fields }));
      }
      setError(texto);
    } finally {
      if (montado.current) setEnviando(false);
    }
  };

  const nuevoReporte = async () => {
    if (!clave) return;
    const nuevo = borradorNuevo();
    await guardarBorrador(clave, nuevo);
    setBorrador(nuevo);
    setErrores({});
    setEnviado(false);
  };

  let cuerpo;
  if (enviado) {
    cuerpo = (
      <EmptyState
        testID="reportar-enviado"
        icon="check-circle"
        title="Recibimos tu reporte"
        description="Lo revisamos y te avisamos. Si lo aprobamos, tu negocio recibe créditos de regalo."
        action={{ label: "Ver mis reportes", onPress: onVerMisReportes }}
        secondaryAction={{ label: "Reportar otro", onPress: () => void nuevoReporte() }}
      />
    );
  } else if (catalogo.estado === "apagado") {
    cuerpo = (
      <EmptyState
        testID="reportar-apagado"
        icon="build"
        title="Aún no disponible"
        description="Los reportes todavía no están abiertos para tu negocio."
        secondaryAction={{ label: "Volver", onPress: onBack }}
      />
    );
  } else if (catalogo.estado === "error") {
    cuerpo = (
      <EmptyState
        testID="reportar-sin-red"
        icon="wifi-off"
        title="No pudimos cargar el formulario"
        description="Revisa tu conexión y vuelve a abrirlo."
        secondaryAction={{ label: "Volver", onPress: onBack }}
      />
    );
  } else if (!listo || !borrador) {
    cuerpo = (
      <View style={styles.cargando} testID="reportar-cargando">
        <ActivityIndicator color={c.link} />
      </View>
    );
  } else {
    cuerpo = (
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" testID="reportar-scroll">
        {pendienteDeRed ? (
          <View
            testID="reportar-pendiente"
            style={[styles.aviso, { backgroundColor: c.statusWarningBg, borderColor: c.statusWarningBorder }]}
          >
            <Icono name="cloud-off" size={20} color={c.statusWarningFg} />
            <Text style={[shType.dense, styles.avisoTexto, { color: c.statusWarningFg }]}>
              Tu reporte está guardado en el celular. Al reintentar no se duplica.
            </Text>
          </View>
        ) : null}

        <Field label="¿Qué quieres contarnos?" required error={errores.tipo}>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {TIPOS.map((tipo) => (
              <Chip
                key={tipo.clave}
                testID={`reportar-tipo-${tipo.clave}`}
                rol="radio"
                titulo={tipo.etiqueta}
                elegido={borrador.tipo === tipo.clave}
                onPress={() => {
                  cambiar({ tipo: tipo.clave as TipoReporte });
                  setErrores((e) => ({ ...e, tipo: undefined }));
                }}
              />
            ))}
          </View>
        </Field>

        <Field label="Área" required error={errores.area} hint="La sección de la app donde lo viste.">
          <View style={styles.chips} accessibilityRole="radiogroup">
            {listo.areas.map((area) => (
              <Chip
                key={area.clave}
                testID={`reportar-area-${area.clave}`}
                rol="radio"
                titulo={area.etiqueta}
                elegido={borrador.area === area.clave}
                onPress={() => {
                  cambiar({ area: area.clave });
                  setErrores((e) => ({ ...e, area: undefined }));
                }}
              />
            ))}
          </View>
        </Field>

        <Field label="Título" required error={errores.titulo} hint={`${borrador.titulo.trim().length}/${TITULO_MAX}`}>
          <TextField
            testID="reportar-titulo"
            value={borrador.titulo}
            maxLength={TITULO_MAX}
            placeholder="Ej.: no carga la agenda del martes"
            onChangeText={(titulo) => {
              cambiar({ titulo });
              setErrores((e) => ({ ...e, titulo: undefined }));
            }}
          />
        </Field>

        <Field
          label="Descripción"
          required
          error={errores.descripcion}
          hint={`Qué hiciste, qué esperabas y qué pasó. ${borrador.descripcion.trim().length}/${DESCRIPCION_MAX}`}
        >
          <TextField
            testID="reportar-descripcion"
            value={borrador.descripcion}
            maxLength={DESCRIPCION_MAX}
            multiline
            numberOfLines={5}
            style={styles.descripcion}
            onChangeText={(descripcion) => {
              cambiar({ descripcion });
              setErrores((e) => ({ ...e, descripcion: undefined }));
            }}
          />
        </Field>

        <View style={styles.seccion}>
          <Text style={[shType.label, { color: c.text }]}>Capturas</Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            Opcional. Hasta {limites.maxImagenes} imágenes de 8 MB cada una.
          </Text>
          {borrador.imagenes.length > 0 ? (
            <View style={styles.miniaturas} testID="reportar-imagenes">
              {borrador.imagenes.map((imagen, i) => (
                <View key={imagen.uri} style={[styles.miniatura, { borderColor: c.border }]}>
                  <Image source={{ uri: imagen.uri }} style={styles.miniaturaImagen} accessibilityIgnoresInvertColors />
                  <Pressable
                    testID={`reportar-quitar-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar captura ${i + 1}`}
                    hitSlop={8}
                    onPress={() => quitar(imagen.uri)}
                    style={[styles.quitar, { backgroundColor: c.surface }]}
                  >
                    <Icono name="close" size={16} color={c.text} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.acciones}>
            <Button
              testID="reportar-galeria"
              variant="secondary"
              size="sm"
              iconLeft="photo-library"
              loading={preparando}
              disabled={borrador.imagenes.length >= limites.maxImagenes || enviando}
              onPress={() => void agregar("galeria")}
            >
              Galería
            </Button>
            <Button
              testID="reportar-camara"
              variant="secondary"
              size="sm"
              iconLeft="photo-camera"
              disabled={preparando || borrador.imagenes.length >= limites.maxImagenes || enviando}
              onPress={() => void agregar("camara")}
            >
              Cámara
            </Button>
          </View>
        </View>

        {error ? (
          <Text testID="reportar-error" accessibilityLiveRegion="polite" style={[shType.dense, { color: c.statusDangerFg }]}>
            {error}
          </Text>
        ) : null}

        <Button
          testID="reportar-enviar"
          fullWidth
          iconLeft="send"
          loading={enviando}
          disabled={preparando}
          onPress={() => void enviar()}
        >
          {pendienteDeRed ? "Reintentar envío" : "Enviar reporte"}
        </Button>
        <View style={styles.acciones}>
          <Button testID="reportar-mis-reportes" variant="ghost" size="sm" iconLeft="list" onPress={onVerMisReportes}>
            Mis reportes
          </Button>
          <Button
            testID="reportar-descartar"
            variant="ghost"
            size="sm"
            iconLeft="delete-outline"
            disabled={enviando}
            onPress={() => void descartar()}
          >
            Descartar borrador
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <View testID="reportar-problema" style={[styles.pantalla, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <PageHeader
        testID="reportar-header"
        title="Reportar un problema"
        description="Errores, mejoras o ideas. Si lo aprobamos, tu negocio recibe créditos de regalo."
        onBack={onBack}
      />
      <KeyboardAvoidingView style={styles.cuerpo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {cuerpo}
      </KeyboardAvoidingView>
    </View>
  );
}

const MINIATURA = 76;

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cuerpo: { flex: 1 },
  cargando: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenido: { padding: shSpace[4], gap: shSpace[4], paddingBottom: shSpace[8] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  descripcion: { minHeight: 112, textAlignVertical: "top" },
  seccion: { gap: shSpace[2] },
  miniaturas: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  miniatura: {
    width: MINIATURA,
    height: MINIATURA,
    borderRadius: shRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  miniaturaImagen: { width: "100%", height: "100%" },
  quitar: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  aviso: {
    flexDirection: "row",
    gap: shSpace[2],
    alignItems: "center",
    padding: shSpace[3],
    borderRadius: shRadius.md,
    borderWidth: 1,
  },
  avisoTexto: { flex: 1 },
});
