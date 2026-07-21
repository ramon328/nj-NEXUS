import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'wouter';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user, clientId } = useAuth();
  const [, navigate] = useLocation();

  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Detect support
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      !!VAPID_PUBLIC_KEY;
    setIsSupported(supported);

    if (!supported) {
      setIsLoading(false);
      return;
    }

    setPermissionState(Notification.permission);

    // Check existing subscription
    navigator.serviceWorker.ready.then((registration) => {
      swRegistrationRef.current = registration;
      return registration.pushManager.getSubscription();
    }).then((subscription) => {
      setIsSubscribed(!!subscription);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const saveSubscription = useCallback(async (subscriptionJSON: PushSubscriptionJSON) => {
    if (!user?.id || !clientId) return;

    const { endpoint, keys } = subscriptionJSON;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return;

    await supabase.from('push_subscriptions').upsert(
      {
        user_auth_id: user.id,
        client_id: clientId,
        endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
        is_active: true,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'endpoint' }
    );
  }, [user, clientId]);

  // Listen for SW messages
  useEffect(() => {
    if (!isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, url, subscription } = event.data || {};

      if (type === 'NOTIFICATION_CLICK' && url) {
        navigate(url);
      }

      if (type === 'PUSH_SUBSCRIPTION_CHANGE' && subscription) {
        saveSubscription(subscription);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [isSupported, navigate, saveSubscription]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !swRegistrationRef.current) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') return false;

      const subscription = await swRegistrationRef.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await saveSubscription(subscription.toJSON());
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Push subscribe error:', error);
      return false;
    }
  }, [isSupported, saveSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistrationRef.current) return false;

    try {
      const subscription = await swRegistrationRef.current.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Delete from Supabase
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      return false;
    }
  }, []);

  const sendTest = useCallback(async () => {
    if (!clientId || !user?.id) throw new Error('No auth');

    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        type: 'test',
        clientId,
        targetAuthId: user.id,
      },
    });

    if (error) throw error;
    return data;
  }, [clientId, user]);

  return {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
