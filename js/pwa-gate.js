const gate = document.getElementById("pwa-gate");
const appContenido = document.getElementById("app-contenido");
let promptDeInstalacion = null;

function esStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function esAndroidChrome() {
  return /android/i.test(navigator.userAgent);
}

function actualizarEstadoApp() {
  const instalada = esStandalone();
  const notificacionesOk = "Notification" in window && Notification.permission === "granted";

  if (instalada && notificacionesOk) {
    gate.hidden = true;
    appContenido.hidden = false;
    return;
  }

  gate.hidden = false;
  appContenido.hidden = true;

  document.getElementById("paso-instalar").hidden = instalada;
  document.getElementById("paso-notificaciones").hidden = !instalada;

  if (!instalada) {
    document.getElementById("instalar-android").hidden = !promptDeInstalacion;
    document.getElementById("instalar-ios").hidden = !esIOS();
    document.getElementById("instalar-generico").hidden = esIOS() || !!promptDeInstalacion;
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptDeInstalacion = e;
  actualizarEstadoApp();
});

window.addEventListener("appinstalled", () => {
  promptDeInstalacion = null;
  actualizarEstadoApp();
});

document.getElementById("btn-instalar-android").addEventListener("click", async () => {
  if (!promptDeInstalacion) return;
  promptDeInstalacion.prompt();
  await promptDeInstalacion.userChoice;
  promptDeInstalacion = null;
  actualizarEstadoApp();
});

document.getElementById("btn-activar-notif").addEventListener("click", async () => {
  const status = document.getElementById("notif-status");
  if (!("Notification" in window)) {
    status.textContent = "Tu navegador no soporta notificaciones.";
    return;
  }
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    status.textContent = "Tenés que aceptar las notificaciones para poder usar la app.";
    return;
  }
  status.textContent = "";
  actualizarEstadoApp();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

actualizarEstadoApp();
// en iOS no hay evento para detectar la instalación, así que revisamos cada
// vez que la persona vuelve a esta pestaña (por si ya la instaló y volvió)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") actualizarEstadoApp();
});
