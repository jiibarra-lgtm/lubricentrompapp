import { supabase } from "./supabaseClient.js";

const VAPID_PUBLIC_KEY = "BBAKm24zDxL6VZDgU-aeHxaZq740ix8ZkQCbmnfbdDtZWqq6D8f6un-9T1UxZpYhqpA9ik-hM3bG0CklCyfk__A";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// se llama apenas se encuentra un vehículo en la búsqueda; si el permiso de
// notificaciones ya está concedido (se pide en el gate de instalación),
// esto suscribe el dispositivo SIN pedirle nada más a la persona
export async function activarNotificacionesPush(clienteId) {
  if (!clienteId) return { ok: false, motivo: "sin-cliente" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return { ok: false, motivo: "sin-soporte" };
  if (Notification.permission !== "granted") return { ok: false, motivo: "sin-permiso" };

  try {
    const registro = await navigator.serviceWorker.ready;
    let suscripcion = await registro.pushManager.getSubscription();
    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = suscripcion.toJSON();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        cliente_id: clienteId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: "endpoint" }
    );

    if (error) return { ok: false, motivo: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}
