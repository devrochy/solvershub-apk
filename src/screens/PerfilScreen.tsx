import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { BotonMenu } from "../components/BotonMenu";
import { CampoModal } from "../components/CampoModal";
import { HeaderPantalla, estilosHeader } from "../components/HeaderPantalla";
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
  const { gestor, actualizarPerfil } = useSession();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <SafeAreaView style={styles.contenedor} edges={["left", "right"]}>
      <HeaderPantalla>
        <View style={estilosHeader.fila} testID="header-perfil">
          <BotonMenu />
          <View style={estilosHeader.bloqueTitulo}>
            <Text style={estilosHeader.titulo}>Perfil</Text>
            <Text style={estilosHeader.subtitulo}>Tus datos de usuario</Text>
          </View>
          <View style={estilosHeader.accionesDerecha}>
            <Pressable
              testID="btn-editar-perfil"
              style={estilosHeader.accionPill}
              onPress={abrirEdicion}
            >
              <MaterialIcons name="edit" size={16} color="#172f6c" />
              <Text style={estilosHeader.accionPillTexto}>Editar</Text>
            </Pressable>
          </View>
        </View>
      </HeaderPantalla>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tarjeta}>
          <View style={styles.avatarFila}>
            <Avatar nombre={nombreCompleto} size={72} />
            <View style={styles.datosBasicos}>
              <Text testID="perfil-nombre" style={styles.nombre}>
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
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 16 },
  tarjeta: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 16,
  },
  avatarFila: { flexDirection: "row", alignItems: "center", gap: 14 },
  datosBasicos: { flex: 1, gap: 2 },
  nombre: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  usuario: { fontSize: 14, color: "#64748b" },
  lista: { gap: 10 },
  datoFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  datoEtiqueta: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  datoValor: { fontSize: 14, color: "#0f172a", fontWeight: "600" },
  error: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
});
