import { createNativeStackNavigator } from "@react-navigation/native-stack";

export type AuthStackParamList = {
  LoginUnificado: undefined;
  SeleccionNegocioAdmin: undefined;
  RecuperarContrasena: undefined;
};

export const AuthStack = createNativeStackNavigator<AuthStackParamList>();
