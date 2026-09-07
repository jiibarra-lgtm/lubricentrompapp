import { supabase } from "./supabaseClient.js";

const NOMBRES_FILTRO = {
  filtro_aceite: "Filtro de aceite",
  filtro_aire: "Filtro de aire",
  filtro_aire_acondicionado: "Filtro de aire acondicionado",
};

document.getElementById("whatsapp-float").href = "https://wa.me/541151656144";

document.getElementById("form-buscar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensajeError = document.getElementById("mensaje-error");
  const resultado = document.getElementById("resultado");
  mensajeError.textContent = "";
  resultado.hidden = true;

  const patente = document.getElementById("input-patente").value.trim().toUpperCase().replace(/\s/g, "");
  const telefono = document.getElementById("input-telefono").value.trim().replace(/\D/g, "");

  const { data: vehiculo, error } = await supabase
    .from("vehiculos")
    .select("id, patente, marca, modelo, km_ultimo_service, tipo_combustible, cliente_id, clientes ( telefono )")
    .eq("patente", patente)
    .maybeSingle();

  if (error || !vehiculo) {
    mensajeError.textContent = "No encontramos un auto con esa patente.";
    return;
  }

  const telefonoGuardado = (vehiculo.clientes?.telefono || "").replace(/\D/g, "");
  if (!telefonoGuardado.includes(telefono) && !telefono.includes(telefonoGuardado)) {
    mensajeError.textContent = "El teléfono no coincide con el registrado para esta patente.";
    return;
  }

  const { data: historial } = await supabase
    .from("historial_service")
    .select("*")
    .eq("vehiculo_id", vehiculo.id)
    .order("fecha", { ascending: false })
    .limit(1);

  renderResultado(vehiculo, historial?.[0]);
});

function renderResultado(vehiculo, ultimoService) {
  const cont = document.getElementById("resultado");

  const nombreFiltroCombustible = vehiculo.tipo_combustible === "gasoil" ? "Filtro de gasoil" : "Filtro de nafta";

  const itemsRealizados = [];
  if (ultimoService?.cambio_aceite) itemsRealizados.push("Cambio de aceite");
  for (const [campo, nombre] of Object.entries(NOMBRES_FILTRO)) {
    if (ultimoService?.[campo]) itemsRealizados.push(nombre);
  }
  if (ultimoService?.filtro_combustible) itemsRealizados.push(nombreFiltroCombustible);

  const kmActual = ultimoService?.km || vehiculo.km_ultimo_service;
  const proximoServiceKm = ultimoService?.proximo_service_km || (kmActual ? kmActual + 10000 : null);

  cont.innerHTML = `
    <div class="auto-card">
      <h2>Mi auto</h2>
      <p class="auto-modelo">${vehiculo.marca || ""} ${vehiculo.modelo || ""}</p>
      <p class="auto-patente">${vehiculo.patente}</p>

      <div class="dato-fila">
        <span>Kilometraje actual</span>
        <strong>${kmActual ? kmActual.toLocaleString("es-AR") + " km" : "Sin registrar"}</strong>
      </div>

      <h3>Servicio realizado</h3>
      ${
        itemsRealizados.length
          ? `<ul class="checklist">${itemsRealizados.map((i) => `<li>✅ ${i}</li>`).join("")}</ul>`
          : `<p class="sin-datos">Todavía no hay un service registrado para este auto.</p>`
      }

      ${
        ultimoService?.fecha
          ? `<p class="fecha-service">Realizado el ${new Date(ultimoService.fecha).toLocaleDateString("es-AR")}</p>`
          : ""
      }

      <div class="proximo-service">
        <span>Próximo service</span>
        <strong>${proximoServiceKm ? proximoServiceKm.toLocaleString("es-AR") + " km" : "A confirmar"}</strong>
      </div>

      <a href="https://wa.me/541151656144" target="_blank" class="btn-cta grande" style="display:block; text-align:center; margin-top:1.2rem;">
        Consultar por WhatsApp
      </a>
    </div>
  `;
  cont.hidden = false;
}
