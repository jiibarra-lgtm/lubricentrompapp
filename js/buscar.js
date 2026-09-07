import { supabase } from "./supabaseClient.js";

const NOMBRES_FILTRO = {
  filtro_aceite: "Filtro de aceite",
  filtro_aire: "Filtro de aire",
  filtro_aire_acondicionado: "Filtro de aire acondicionado",
};

const CLAVE_ULTIMO_ACCESO = "mi-auto-ultimo-acceso";

document.getElementById("whatsapp-float").href = "https://wa.me/541151656144";

const inputPatente = document.getElementById("input-patente");
const inputTelefono = document.getElementById("input-telefono");

// 182: autocompletado en vivo — mayúsculas y sin espacios mientras escribe
inputPatente.addEventListener("input", () => {
  const cursor = inputPatente.selectionStart;
  inputPatente.value = inputPatente.value.toUpperCase().replace(/\s/g, "");
  inputPatente.setSelectionRange(cursor, cursor);
});

// 183: recordar el último ingreso para no tener que retipear cada vez
try {
  const ultimo = JSON.parse(localStorage.getItem(CLAVE_ULTIMO_ACCESO) || "null");
  if (ultimo?.patente) inputPatente.value = ultimo.patente;
  if (ultimo?.telefono) inputTelefono.value = ultimo.telefono;
} catch {
  /* si el dato guardado está corrupto, seguimos con el form vacío */
}

// 176: búsqueda por voz de la patente (si el navegador la soporta)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const btnVoz = document.createElement("button");
  btnVoz.type = "button";
  btnVoz.className = "btn-voz";
  btnVoz.setAttribute("aria-label", "Dictar la patente por voz");
  btnVoz.textContent = "🎤";
  inputPatente.insertAdjacentElement("afterend", btnVoz);

  btnVoz.addEventListener("click", () => {
    const reconocimiento = new SpeechRecognition();
    reconocimiento.lang = "es-AR";
    reconocimiento.start();
    btnVoz.classList.add("escuchando");
    reconocimiento.onresult = (e) => {
      const texto = e.results[0][0].transcript.toUpperCase().replace(/[^A-Z0-9]/g, "");
      inputPatente.value = texto;
    };
    reconocimiento.onend = () => btnVoz.classList.remove("escuchando");
  });
}

document.getElementById("form-buscar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensajeError = document.getElementById("mensaje-error");
  const resultado = document.getElementById("resultado");
  mensajeError.textContent = "";
  resultado.hidden = true;

  const patente = inputPatente.value.trim().toUpperCase().replace(/\s/g, "");
  const telefono = inputTelefono.value.trim().replace(/\D/g, "");

  const { data: vehiculo, error } = await supabase
    .from("vehiculos")
    .select("id, patente, marca, modelo, anio, km_ultimo_service, tipo_combustible, cliente_id, clientes ( nombre, telefono )")
    .eq("patente", patente)
    .maybeSingle();

  if (error || !vehiculo) {
    mensajeError.textContent = "No encontramos un auto con esa patente. ¿Ya lo registraste?";
    mensajeError.focus?.();
    return;
  }

  const telefonoGuardado = (vehiculo.clientes?.telefono || "").replace(/\D/g, "");
  if (!telefonoGuardado.includes(telefono) && !telefono.includes(telefonoGuardado)) {
    mensajeError.textContent = "El teléfono no coincide con el registrado para esta patente.";
    return;
  }

  localStorage.setItem(CLAVE_ULTIMO_ACCESO, JSON.stringify({ patente, telefono: inputTelefono.value.trim() }));

  // 181: si el cliente tiene más de un auto, los traemos todos para armar las pestañas
  const { data: todosLosAutos } = await supabase
    .from("vehiculos")
    .select("id, patente, marca, modelo, anio, km_ultimo_service, tipo_combustible, cliente_id, clientes ( nombre, telefono )")
    .eq("cliente_id", vehiculo.cliente_id);

  await mostrarAutos(todosLosAutos?.length ? todosLosAutos : [vehiculo], vehiculo.id);
});

async function mostrarAutos(autos, idSeleccionado) {
  const resultado = document.getElementById("resultado");

  if (autos.length > 1) {
    resultado.innerHTML = `
      <div class="tabs-autos" role="tablist" aria-label="Mis vehículos"></div>
      <div id="ficha-auto-actual"></div>
    `;
    const tabs = resultado.querySelector(".tabs-autos");
    autos.forEach((v) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab-auto" + (v.id === idSeleccionado ? " activo" : "");
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", v.id === idSeleccionado ? "true" : "false");
      tab.textContent = `${v.marca || v.patente}`;
      tab.addEventListener("click", async () => {
        tabs.querySelectorAll(".tab-auto").forEach((t) => t.classList.remove("activo"));
        tab.classList.add("activo");
        await cargarFichaDeVehiculo(v);
      });
      tabs.appendChild(tab);
    });
  } else {
    resultado.innerHTML = `<div id="ficha-auto-actual"></div>`;
  }

  resultado.hidden = false;
  const seleccionado = autos.find((v) => v.id === idSeleccionado) || autos[0];
  await cargarFichaDeVehiculo(seleccionado);
  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function cargarFichaDeVehiculo(vehiculo) {
  const { data: historialCompleto } = await supabase
    .from("historial_service")
    .select("*")
    .eq("vehiculo_id", vehiculo.id)
    .order("fecha", { ascending: false });

  const { data: config } = await supabase.from("config_alertas").select("*").eq("id", 1).maybeSingle();

  renderResultado(vehiculo, historialCompleto?.[0], config, historialCompleto || []);
}

function calcularSemaforo(kmActual, proximoServiceKm, config) {
  if (!config?.semaforo_activo || !kmActual || !proximoServiceKm) return null;
  const restante = proximoServiceKm - kmActual;
  if (restante <= 0) return { color: "rojo", texto: "Service vencido" };
  if (restante <= 1500) return { color: "amarillo", texto: "Se acerca tu próximo service" };
  return { color: "verde", texto: "Al día" };
}

export function renderResultado(vehiculo, ultimoService, config = null, historialCompleto = []) {
  // se usa tanto desde la búsqueda (con ficha-auto-actual) como desde el
  // registro nuevo (donde ese contenedor todavía no existe)
  const cont = document.getElementById("ficha-auto-actual") || document.getElementById("resultado");

  const nombreFiltroCombustible = vehiculo.tipo_combustible === "gasoil" ? "Filtro de gasoil" : "Filtro de nafta";

  const itemsRealizados = [];
  if (ultimoService?.cambio_aceite) itemsRealizados.push("Cambio de aceite");
  for (const [campo, nombre] of Object.entries(NOMBRES_FILTRO)) {
    if (ultimoService?.[campo]) itemsRealizados.push(nombre);
  }
  if (ultimoService?.filtro_combustible) itemsRealizados.push(nombreFiltroCombustible);

  const kmActual = ultimoService?.km || vehiculo.km_ultimo_service;
  const proximoServiceKm = ultimoService?.proximo_service_km || (kmActual ? kmActual + 10000 : null);
  const semaforo = calcularSemaforo(kmActual, proximoServiceKm, config);

  const conKm = historialCompleto.filter((h) => h.km).slice(0, 6).reverse();
  const maxKm = Math.max(...conKm.map((h) => h.km), 1);

  cont.innerHTML = `
    <div class="auto-card" role="region" aria-label="Ficha de ${vehiculo.marca || ""} ${vehiculo.modelo || ""}">
      <h2>Mi auto</h2>
      <p class="auto-modelo">${vehiculo.marca || ""} ${vehiculo.modelo || ""} ${vehiculo.anio || ""}</p>
      <p class="auto-patente">${vehiculo.patente}</p>

      ${semaforo ? `<div class="semaforo semaforo-${semaforo.color}" role="status">● ${semaforo.texto}</div>` : ""}

      <div class="dato-fila">
        <span title="Kilometraje registrado en tu último service o el que cargaste al registrarte">Kilometraje actual</span>
        <strong>${kmActual ? kmActual.toLocaleString("es-AR") + " km" : "Sin registrar"}</strong>
      </div>

      <h3>Servicio realizado</h3>
      ${
        itemsRealizados.length
          ? `<ul class="checklist">${itemsRealizados.map((i) => `<li>✅ ${i}</li>`).join("")}</ul>`
          : `<p class="sin-datos">Todavía no hay un service registrado para este auto. Cuando vengas a Lubricentro MP, lo vamos a cargar acá.</p>`
      }

      ${ultimoService?.fecha ? `<p class="fecha-service">Realizado el ${new Date(ultimoService.fecha).toLocaleDateString("es-AR")}</p>` : ""}

      ${ultimoService?.recomendaciones ? `<div class="recomendaciones-box">💡 ${ultimoService.recomendaciones}</div>` : ""}

      <div class="proximo-service">
        <span title="Se calcula sumando 10.000km desde tu último service, salvo que el taller haya fijado otro número">Próximo service</span>
        <strong>${proximoServiceKm ? proximoServiceKm.toLocaleString("es-AR") + " km" : "A confirmar"}</strong>
      </div>

      ${
        conKm.length > 1
          ? `
        <h3>Kilometraje a lo largo del tiempo</h3>
        <div class="grafico-km">
          ${conKm.map((h) => `
            <div class="grafico-km-fila">
              <span>${new Date(h.fecha).toLocaleDateString("es-AR", { month: "short", year: "2-digit" })}</span>
              <div class="grafico-km-track"><div class="grafico-km-fill" style="width:${(h.km / maxKm) * 100}%"></div></div>
              <span>${h.km.toLocaleString("es-AR")}</span>
            </div>`).join("")}
        </div>`
          : ""
      }

      <a href="https://wa.me/541151656144" target="_blank" class="btn-primario" style="display:block; text-align:center; margin-top:1.2rem; text-decoration:none;">
        Consultar por WhatsApp
      </a>
    </div>
  `;
  cont.hidden = false;
}
