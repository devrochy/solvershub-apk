import 'react-native-gesture-handler';

import * as SplashScreen from 'expo-splash-screen';
import { registerRootComponent } from 'expo';

import App from './App';

// El splash nativo se queda hasta que las fuentes y el flag del intro estén
// listos; así no aparece un frame en blanco entre el logo y la app.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
