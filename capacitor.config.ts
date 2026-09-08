import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'ControlTaxi',
  webDir: 'build', // <-- Cambia 'dist' por la carpeta real (ej: 'build', 'www', etc.)
};

export default config;