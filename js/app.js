// Estado global, sesión, enrutado y cableado de eventos.
const App = (() => {
  const LS_TOKEN = "crm_access";
  const LS_REFRESH = "crm_refresh";
  const LS_QUIEN = "crm_quien";
  const LS_TEMA = "crm_tema";

  const estado = {
    quien: localStorage.getItem(LS_QUIEN) || null,
    usuarios: [],
    leads: [],
    leadMail: null,
  };

  // ---------- tema (modo oscuro) ----------
  function aplicarTema(t) {
    document.documentElement.setAttribute("data-theme", t);
    const b = document.getElementById("btn-tema");
    if (b) b.textContent = t === "dark" ? "☀️" : "🌙";
  }
  function temaInicial() {
    const g = localStorage.getItem(LS_TEMA);
    if (g) return g;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }

  // ---------- sesión ----------
  function guardarSesion(r) {
    localStorage.setItem(LS_TOKEN, r.access_token);
    localStorage.setItem(LS_REFRESH, r.refresh_token);
    API.setToken(r.access_token);
  }
  function limpiarSesion() {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_QUIEN);
    estado.quien = null;
    API.setToken(null);
  }

  async function iniciarSesion() {
    const rt = localStorage.getItem(LS_REFRESH);
    if (!rt) { mostrarLogin(); return; }
    try {
      guardarSesion(await API.refrescar(rt));
      await continuar();
    } catch {
      limpiarSesion();
      mostrarLogin();
    }
  }

  async function continuar() {
    try {
      estado.usuarios = await API.listarUsuarios();
    } catch {
      limpiarSesion();
      mostrarLogin();
      return;
    }
    if (!estado.quien) {
      UI.pintarQuien(estado.usuarios);
      UI.mostrarVista("vista-quien");
      return;
    }
    await mostrarDashboard();
  }

  function mostrarLogin() {
    UI.mostrarVista("vista-login");
    document.getElementById("input-pass").focus();
  }

  async function mostrarDashboard() {
    try {
      estado.leads = await API.listarLeads();
    } catch {
      UI.toast("Sesión vencida, entrá de nuevo", false);
      limpiarSesion();
      mostrarLogin();
      return;
    }
    UI.pintarContadores(estado.leads);
    UI.pintarLeads(estado.leads);
    UI.pintarMaterial();
    UI.pintarQuienActivo(estado.quien);
    UI.mostrarVista("vista-dashboard");
  }

  // ---------- acciones ----------
  async function guardarLead(datos) {
    await API.crearLead({ ...datos, creado_por: estado.quien });
    await mostrarDashboard();
  }

  async function setEstado(id, nuevoEstado) {
    await API.cambiarEstado(id, nuevoEstado, estado.quien);
    await mostrarDashboard();
  }

  function abrirMail(id) {
    estado.leadMail = estado.leads.find((l) => String(l.id) === String(id)) || null;
    if (!estado.leadMail) return;
    const u = estado.usuarios.find((x) => x.nombre === estado.quien);
    document.getElementById("mail-para").textContent =
      "Para: " + (estado.leadMail.nombre || "") +
      (estado.leadMail.email ? " (" + estado.leadMail.email + ")" : "");
    document.getElementById("mail-firma").textContent =
      "Sale firmado como: " + (u ? u.firma_mail : (estado.quien + " — Vértice Labs"));
    document.getElementById("mail-asunto").value = "";
    document.getElementById("mail-mensaje").value = "";
    document.getElementById("mail-estado").hidden = true;
    UI.abrirModal("modal-mail");
  }

  async function enviarMailLeady(asunto, mensaje) {
    const l = estado.leadMail;
    await API.enviarMail({
      lead_id: l.id, asunto, mensaje,
      remitente: estado.quien, destinatario: l.email,
    });
    UI.cerrarModales();
    UI.toast("Mail enviado ✓");
  }

  function salir() {
    limpiarSesion();
    mostrarLogin();
  }

  // ---------- eventos ----------
  function init() {
    aplicarTema(temaInicial());
    document.getElementById("btn-tema").addEventListener("click", () => {
      const nuevo = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      localStorage.setItem(LS_TEMA, nuevo);
      aplicarTema(nuevo);
    });

    document.getElementById("form-login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pass = document.getElementById("input-pass").value;
      const err = document.getElementById("login-error");
      err.hidden = true;
      try {
        guardarSesion(await API.login(pass));
        await continuar();
      } catch {
        err.textContent = "Contraseña incorrecta";
        err.hidden = false;
      }
    });

    document.getElementById("lista-quien").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-accion='elegir-quien']");
      if (!b) return;
      estado.quien = b.dataset.nombre;
      localStorage.setItem(LS_QUIEN, estado.quien);
      await mostrarDashboard();
    });

    document.getElementById("btn-nuevo").addEventListener("click", () => {
      document.getElementById("form-nuevo").reset();
      document.getElementById("nuevo-error").hidden = true;
      UI.abrirModal("modal-nuevo");
    });

    document.getElementById("form-nuevo").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("nuevo-error");
      const nombre = document.getElementById("nuevo-nombre").value.trim();
      if (!nombre) return;
      err.hidden = true;
      try {
        await guardarLead({
          nombre,
          telefono: document.getElementById("nuevo-tel").value.trim() || null,
          email: document.getElementById("nuevo-email").value.trim() || null,
          empresa: document.getElementById("nuevo-empresa").value.trim() || null,
        });
        UI.cerrarModales();
        UI.toast("Lead guardado ✓");
      } catch (ex) {
        err.textContent = "No se pudo guardar. " + ex.message;
        err.hidden = false;
      }
    });

    document.getElementById("form-mail").addEventListener("submit", async (e) => {
      e.preventDefault();
      const est = document.getElementById("mail-estado");
      est.hidden = true;
      try {
        await enviarMailLeady(
          document.getElementById("mail-asunto").value.trim(),
          document.getElementById("mail-mensaje").value.trim()
        );
      } catch (ex) {
        est.textContent = "No se pudo enviar. " + ex.message;
        est.hidden = false;
      }
    });

    // Delegación de eventos para acciones dinámicas
    document.addEventListener("click", async (e) => {
      const acc = e.target.closest("[data-accion]");
      if (!acc) return;
      const a = acc.dataset.accion;
      if (a === "estado") {
        await setEstado(acc.dataset.id, acc.dataset.estado);
      } else if (a === "abrir-mail") {
        abrirMail(acc.dataset.id);
      } else if (a === "cerrar-modal") {
        UI.cerrarModales();
      } else if (a === "salir") {
        salir();
      }
    });

    iniciarSesion();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
