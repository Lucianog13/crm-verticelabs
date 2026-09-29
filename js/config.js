// Configuración del CRM — valores PÚBLICOS.
// La publishable key es la clave de cliente de Supabase (equivale al rol anon):
// va en el JS del navegador a propósito, NO es un secreto. La service_role va en .env.
(function (root) {
  root.CONFIG = {
    SUPABASE_URL: "https://yxjohzhsahnydigjqplr.supabase.co",
    PUBLISHABLE_KEY: "sb_publishable_Vcumhq9kuEBJF3WblRv2ZQ_Kqvl1nm6",
    EMAIL_LOGIN: "crm@verticelabs.com.ar",
  };
})(typeof window !== "undefined" ? window : globalThis);
