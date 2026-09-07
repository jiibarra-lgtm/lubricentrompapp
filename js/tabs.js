document.querySelectorAll(".tab-acceso").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-acceso").forEach((b) => b.classList.toggle("activo", b === btn));
    const tab = btn.dataset.tab;
    document.getElementById("panel-ingresar").classList.toggle("activo", tab === "ingresar");
    document.getElementById("panel-registrar").classList.toggle("activo", tab === "registrar");
    document.getElementById("resultado").hidden = true;
  });
});
