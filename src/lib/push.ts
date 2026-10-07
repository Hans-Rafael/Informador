import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PushFailure = 'denied' | 'no-device' | 'error';
export type PushResult = { token: string } | { failure: PushFailure };

// Con la app abierta también mostramos el aviso (por defecto Android lo silenciaría).
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Obtiene el token de notificaciones de Expo.
 * ask=true pide el permiso si aún no se dio; ask=false solo lo usa si ya está concedido.
 */
export async function getPushToken(ask: boolean): Promise<PushResult> {
  // Los emuladores no reciben notificaciones push: hace falta un teléfono real.
  if (!Device.isDevice) return { failure: 'no-device' };
  try {
    if (Platform.OS === 'android') {
      // Desde Android 8 toda notificación necesita un canal; el id debe coincidir con el de push.sql.
      await Notifications.setNotificationChannelAsync('alertas', {
        name: 'Alertas cercanas',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask) status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { failure: 'denied' };

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data };
  } catch {
    // Típico si falta google-services.json (Firebase) en el build, o no hay conexión.
    return { failure: 'error' };
  }
}
