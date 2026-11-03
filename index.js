import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import './src/lib/locationTask'; // registra la tarea de segundo plano al arrancar
import App from './App';
registerRootComponent(App);
