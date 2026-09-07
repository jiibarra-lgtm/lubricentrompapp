import { supabase } from "./supabaseClient.js";
import { renderResultado } from "./buscar.js";

const REGEX_PATENTE = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;

document.getElementById("form-registrar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensajeError = document.getElementById("mensaje-error-reg");
  mensajeError.textContent = "";

  const nombre = document.getElementById("reg-nombre").value.trim();
  const telefono = document.getElementById("reg-telefono").value.trim().replace(/\D/g, "");
  const patente = document.getElementById("reg-patente").value.trim().toUpperCase().replace(/\s/g, "");
  const marca = document.getElementById("reg-marca").value.trim();
  const modelo = document.getElementById("reg-modelo").value.trim();
  const anio = Number(document.getElementById("reg-anio").value) || null;
  const km = Number(document.getElementById("reg-km").value) || null;
  const tipo_combustible = document.getElementById("reg-combustible").value;

  if (!REGEX_PATENTE.test(patente)) {
    mensajeError.textContent = "La patente no tiene un formato válido (ej: AB123CD o ABC123).";
    return;
  }

  // primero verificamos que esa patente no esté ya registrada
  const { data: existente } = await supabase.from("vehiculos").select("id").eq("patente", patente).maybeSingle();
  if (existente) {
    mensajeError.textContent = "Esa patente ya está registrada. Probá con 'Ya tengo mi auto cargado'.";
    return;
  }

  // cliente: buscar por teléfono o crear
  let { data: cliente } = await supabase.from("clientes").select("id").eq("telefono", telefono).maybeSingle();
  if (!cliente) {
    const { data: nuevo, error } = await supabase.from("clientes").insert({ nombre, telefono }).select("id").single();
    if (error) { mensajeError.textContent = "No se pudo registrar: " + error.message; return; }
    cliente = nuevo;
  }

  const { data: vehiculo, error: errVehiculo } = await supabase
    .from("vehiculos")
    .insert({ cliente_id: cliente.id, patente, marca, modelo, anio, km_ultimo_service: km, tipo_combustible })
    .select("id, patente, marca, modelo, anio, km_ultimo_service, tipo_combustible")
    .single();

  if (errVehiculo) {
    mensajeError.textContent = "No se pudo registrar el vehículo: " + errVehiculo.message;
    return;
  }

  document.getElementById("form-registrar").reset();
  renderResultado(
    { ...vehiculo, clientes: { nombre, telefono } },
    null,
    null,
    []
  );
  document.getElementById("resultado").querySelector(".auto-card")?.insertAdjacentHTML(
    "afterbegin",
    `<div class="banner-exito">✅ ¡Listo! Tu auto ya está registrado. La próxima vez que vengas a hacerte un service, va a quedar reflejado acá.</div>`
  );
});
