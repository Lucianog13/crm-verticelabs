// Render de vistas (solo DOM). Sin lógica de negocio.
const UI = (() => {
  const ESTADOS = {
    nuevo:      { label: "Nuevo",      clase: "estado-nuevo" },
    en_proceso: { label: "En proceso", clase: "estado-proceso" },
    cerrado:    { label: "Cerrado",    clase: "estado-cerrado" },
    descarte:   { label: "Descarte",   clase: "estado-descarte" },
  };

  const MATERIAL = [
    { img: "marketing/vertice-general.png", titulo: "Servicios generales" },
    { img: "marketing/vertice-turnos.png",  titulo: "Turnos por WhatsApp" },
    { img: "marketing/vertice-pedidos.png", titulo: "Pedidos por WhatsApp" },
  ];

  function esc(t) {
    return String(t ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatFecha(iso) {
    const s = String(iso ?? "");
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function mostrarVista(id) {
    document.querySelectorAll(".vista").forEach((v) => (v.hidden = true));
    const el = document.getElementById(id);
    if (el) el.hidden = false;
    document.getElementById("topbar").hidden = (id !== "vista-dashboard");
  }

  function pintarContadores(leads) {
    const porEstado = { nuevo: 0, en_proceso: 0, cerrado: 0, descarte: 0 };
    leads.forEach((l) => { porEstado[l.estado] = (porEstado[l.estado] || 0) + 1; });
    const items = [
      ["Total", leads.length, ""],
      ["Nuevos", porEstado.nuevo, "c-nuevo"],
      ["En proceso", porEstado.en_proceso, "c-proceso"],
      ["Cerrados", porEstado.cerrado, "c-cerrado"],
    ];
    document.getElementById("contadores").innerHTML = items
      .map(([t, n, c]) => `<div class="contador ${c}"><span class="contador__num">${n}</span><span class="contador__txt">${t}</span></div>`)
      .join("");
  }

  function pintarLeads(leads) {
    const cont = document.getElementById("lista-leads");
    document.getElementById("leads-vacio").hidden = leads.length > 0;
    cont.innerHTML = leads.map((l) => {
      const e = ESTADOS[l.estado] || ESTADOS.nuevo;
      const tel = l.telefono ? `<a class="lead__tel" href="tel:${esc(l.telefono)}">${esc(l.telefono)}</a>` : "";
      const mail = l.email ? `<span class="lead__mail">${esc(l.email)}</span>` : "";
      const emp = l.empresa ? `<span class="lead__empresa">${esc(l.empresa)}</span>` : "";
      const meta = [l.creado_por ? "por " + esc(l.creado_por) : "", l.creado_en ? formatFecha(l.creado_en) : ""]
        .filter(Boolean).join(" · ");
      const botonMail = l.email
        ? `<button class="btn btn-mail" data-accion="abrir-mail" data-id="${l.id}">✉️ Mail</button>`
        : "";
      return `
        <article class="lead" data-id="${l.id}">
          <div class="lead__cabeza">
            <span class="lead__nombre">${esc(l.nombre)}</span>
            <span class="estado ${e.clase}">${e.label}</span>
          </div>
          <div class="lead__datos">${tel}${mail}${emp}</div>
          <div class="lead__meta">${meta}</div>
          <div class="lead__acciones">
            <button class="btn btn-estado" data-accion="estado" data-id="${l.id}" data-estado="cerrado">✅ Cerrado</button>
            <button class="btn btn-estado" data-accion="estado" data-id="${l.id}" data-estado="en_proceso">⏳ Proceso</button>
            <button class="btn btn-estado" data-accion="estado" data-id="${l.id}" data-estado="descarte">❌ Descarte</button>
            ${botonMail}
          </div>
        </article>`;
    }).join("");
  }

  function pintarMaterial() {
    document.getElementById("material").innerHTML = MATERIAL
      .map((m) => `
        <a class="mat" href="${m.img}" target="_blank" rel="noopener">
          <img class="mat__img" src="${m.img}" alt="${esc(m.titulo)}" loading="lazy" />
          <span class="mat__titulo">${esc(m.titulo)}</span>
        </a>`)
      .join("");
  }

  function gcalLink(ev) {
    const t = encodeURIComponent(ev.titulo);
    if (!ev.hora) {
      const d = String(ev.fecha).replace(/-/g, "");
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${d}/${d}`;
    }
    const inicio = new Date(`${ev.fecha}T${ev.hora}:00`);
    const fin = new Date(inicio.getTime() + 3600000);
    const fmt = (x) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${fmt(inicio)}/${fmt(fin)}`;
  }

  function pintarEventos(eventos) {
    document.getElementById("eventos-vacio").hidden = eventos.length > 0;
    document.getElementById("lista-eventos").innerHTML = eventos.map((ev) => {
      const h = ev.hora ? " · " + String(ev.hora).slice(0, 5) + " hs" : "";
      const notas = ev.notas ? `<span class="evento__notas">${esc(ev.notas)}</span>` : "";
      return `
        <article class="evento">
          <div class="evento__info">
            <span class="evento__titulo">${esc(ev.titulo)}</span>
            <span class="evento__meta">📅 ${formatFecha(ev.fecha)}${h}</span>
            ${notas}
          </div>
          <div class="evento__acciones">
            <a class="btn btn-gcal" href="${gcalLink(ev)}" target="_blank" rel="noopener">📲 Celular</a>
            <button class="btn btn-del" data-accion="borrar-evento" data-id="${ev.id}" title="Borrar">🗑️</button>
          </div>
        </article>`;
    }).join("");
  }

  function pintarQuien(usuarios) {
    document.getElementById("lista-quien").innerHTML = usuarios
      .map((u) => `<button class="btn-quien" data-accion="elegir-quien" data-nombre="${esc(u.nombre)}">
        <span class="btn-quien__nombre">${esc(u.nombre)}</span>
        <span class="btn-quien__firma">${esc(u.firma_mail)}</span>
      </button>`)
      .join("");
  }

  function pintarQuienActivo(nombre) {
    document.getElementById("quien-activo").textContent = nombre ? nombre + " ·" : "";
  }

  function toast(msg, ok = true) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast " + (ok ? "toast--ok" : "toast--error");
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 3200);
  }

  function abrirModal(id) { document.getElementById(id).hidden = false; }
  function cerrarModales() {
    document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
  }

  return {
    ESTADOS, esc, formatFecha, mostrarVista, pintarContadores, pintarLeads,
    pintarMaterial, pintarEventos, pintarQuien, pintarQuienActivo, toast, abrirModal, cerrarModales,
  };
})();
