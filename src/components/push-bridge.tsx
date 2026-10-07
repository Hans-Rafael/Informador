import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useStore } from '@/lib/store';

/**
 * Abre la alerta cuando el usuario toca una notificación, con la app cerrada, en segundo plano o abierta.
 * No dibuja nada: solo escucha.
 */
export function PushBridge() {
  const router = useRouter();
  const { refreshAlerts } = useStore();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!response) return;
    const alertId = response.notification.request.content.data?.alertId;
    const key = response.notification.request.identifier;
    if (typeof alertId !== 'string' || handled.current === key) return;
    handled.current = key;
    // La alerta puede ser nueva y no estar aún en la lista local: la bajamos antes de abrirla.
    refreshAlerts().finally(() => router.push({ pathname: '/alerta/[id]', params: { id: alertId } }));
  }, [response]);

  return null;
}
