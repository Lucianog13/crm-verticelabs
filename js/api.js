// Capa de acceso a Supabase (Auth + REST + RPC). Sin SDK, fetch puro.
const API = (() => {
  const { SUPABASE_URL, PUBLISHABLE_KEY, EMAIL_LOGIN } = CONFIG;
  let token = null;

  async function pedir(path, { method = "GET", body, auth = true, prefer } = {}) {
    const headers = {
      apikey: PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    };
    if (auth && token) headers.Authorization = "Bearer " + token;
    if (prefer) headers.Prefer = prefer;

    const res = await fetch(SUPABASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let msg = "HTTP " + res.status;
      try {
        const j = await res.json();
        if (j && j.message) msg = j.message;
      } catch (_) { /* sin cuerpo JSON */ }
      throw new Error(msg);
    }
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
  }

  return {
    setToken(t) { token = t; },

    login(password) {
      return pedir("/auth/v1/token?grant_type=password", {
        method: "POST", auth: false,
        body: { email: EMAIL_LOGIN, password },
      });
    },
    refrescar(refreshToken) {
      return pedir("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", auth: false,
        body: { refresh_token: refreshToken },
      });
    },

    listarLeads() {
      return pedir("/rest/v1/leads_crm?select=*&order=creado_en.desc");
    },
    crearLead(lead) {
      return pedir("/rest/v1/leads_crm?select=*", {
        method: "POST", body: lead, prefer: "return=representation",
      });
    },
    cambiarEstado(id, estado, quien) {
      return pedir("/rest/v1/leads_crm?id=eq." + id, {
        method: "PATCH",
        body: { estado, actualizado_por: quien, actualizado_en: new Date().toISOString() },
        prefer: "return=minimal",
      });
    },
    listarUsuarios() {
      return pedir("/rest/v1/usuarios_crm?select=nombre,firma_mail&order=id");
    },
    enviarMail({ lead_id, asunto, mensaje, remitente, destinatario }) {
      return pedir("/rest/v1/rpc/enviar_mail_lead", {
        method: "POST",
        body: {
          p_lead_id: lead_id, p_asunto: asunto, p_mensaje: mensaje,
          p_remitente: remitente, p_destinatario: destinatario,
        },
      });
    },
  };
})();
