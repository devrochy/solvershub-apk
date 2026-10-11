import { useMemo, useState } from "react";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { useKit, type ColoresKit } from "@shared/ui";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { VentanaCerrarConSwipe } from "../navigation/VentanaCerrarConSwipe";
import type { RootStackParamList } from "../navigation/types";
import { Avatar } from "../components/Avatar";
import { Breadcrumb } from "../components/Breadcrumb";
import { HeaderApp } from "../components/HeaderApp";
import { CampoModal } from "../components/CampoModal";
import { estilosHeader } from "../components/HeaderPantalla";
import { ModalConFooter } from "../components/ModalConFooter";
import { useSession } from "../session/session-context";

const ROL_LABEL: Record<string, string> = {
  gestor: "Gestor",
  propietario: "Propietario",
  admin: "Administrador",
};

function Dato({
  etiqueta,
  valor,
  testID,
}: {
  etiqueta: string;
  valor: string;
  testID?: string;
}) {
  const { c } = useKit();
  const styles = useMemo(() => crearEstilos(c), [c]);
  return (
    <View style={styles.datoFila}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text testID={testID} style={styles.datoValor}>
        {valor}
      </Text>
    </View>
  );
}

/**
 * Perfil del usuario logueado (gestor o propietario): muestra sus datos y permite
 * editarlos (nombre/apellido) desde una acción "Editar" en el header que abre un
 * modal, igual que el resto de las vistas.
 */
export function PerfilScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { gestor, actualizarPerfil } = useSession();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { c, banda } = useKit();
  const styles = useMemo(() => crearEstilos(c), [c]);

  const nombreCompleto =
    `${gestor?.nombre ?? ""} ${gestor?.apellido ?? ""}`.trim() || "Usuario";

  function abrirEdicion() {
    setNombre(gestor?.nombre ?? "");
    setApellido(gestor?.apellido ?? "");
    setError(null);
    setEditando(true);
  }

  async function guardar() {
    if (!nombre.trim() || !apellido.trim()) {
      setError("Nombre y apellido son obligatorios.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await actualizarPerfil({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
      });
      setEditando(false);
    } catch {
      setError("No se pudo guardar el perfil.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <VentanaCerrarConSwipe
      animarSalida={false}
      onCerrar={() => navigation.goBack()}
      style={styles.fill}
    >
    <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
      <HeaderApp
        titulo="Perfil"
        subtitulo="Tus datos de usuario"
        acciones={
          <Pressable
            testID="btn-editar-perfil"
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
            hitSlop={8}
            style={estilosHeader.accionPill}
            onPress={abrirEdicion}
          >
            <MaterialIcons name="edit" size={16} color={banda.texto} />
            <Text style={estilosHeader.accionPillTexto}>Editar</Text>
          </Pressable>
        }
      />

      <Breadcrumb seccion="Perfil" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tarjeta}>
          <View style={styles.avatarFila}>
            <Avatar nombre={nombreCompleto} size={72} />
            <View style={styles.datosBasicos}>
              <Text testID="perfil-nombre" accessibilityRole="header" style={styles.nombre}>
                {nombreCompleto}
              </Text>
              <Text style={styles.usuario}>@{gestor?.usuario ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.lista}>
            <Dato etiqueta="Nombre" valor={gestor?.nombre ?? "—"} />
            <Dato etiqueta="Apellido" valor={gestor?.apellido ?? "—"} />
            <Dato etiqueta="Usuario" valor={gestor?.usuario ?? "—"} />
            <Dato
              testID="perfil-rol"
              etiqueta="Rol"
              valor={gestor ? (ROL_LABEL[gestor.rol] ?? gestor.rol) : "—"}
            />
          </View>
        </View>
      </ScrollView>

      <ModalConFooter
        visible={editando}
        titulo="Editar perfil"
        onCerrar={() => setEditando(false)}
        onCancelar={() => setEditando(false)}
        onConfirmar={guardar}
        confirmando={guardando}
        confirmarTestID="perfil-guardar"
        testID="perfil-form"
      >
        <CampoModal
          testID="perfil-nombre-input"
          label="Nombre"
          value={nombre}
          onChangeText={setNombre}
        />
        <CampoModal
          testID="perfil-apellido-input"
          label="Apellido"
          value={apellido}
          onChangeText={setApellido}
        />
        {error ? (
          <Text testID="perfil-error" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ModalConFooter>
    </SafeAreaView>
    </VentanaCerrarConSwipe>
  );
}

function crearEstilos(c: ColoresKit) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.bg },
    fill: { flex: 1 },
    scroll: { padding: shSpace[4] },
    tarjeta: {
      backgroundColor: c.surface,
      borderRadius: shRadius.md,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: c.border,
      padding: shSpace[4],
      gap: shSpace[4],
    },
    avatarFila: { flexDirection: "row", alignItems: "center", gap: 14 },
    datosBasicos: { flex: 1, gap: 2 },
    nombre: { ...shType.h1, color: c.text },
    usuario: { ...shType.dense, color: c.textMuted },
    lista: { gap: 10 },
    datoFila: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: shSpace[8],
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
      paddingTop: 10,
    },
    datoEtiqueta: { ...shType.label, color: c.textMuted },
    datoValor: { ...shType.label, fontFamily: shType.block.fontFamily, color: c.text },
    error: { ...shType.dense, color: c.statusDangerFg },
  });
}
