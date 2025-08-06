// src/lib/location/formatTimezoneLabel.ts
/**
 * Converte "Europe/London" ➜ "London, Europe (GMT +01:00)"
 * - Usa Intl.DateTimeFormat("longOffset") quando disponível.
 * - Faz cálculo manual como fallback (funciona em todos os browsers).
 */
export const formatTimezoneLabel = (iana: string): string => {
  if (!iana) return "";

  const now = new Date();
  let offsetStr: string | undefined;

  /* -------------------- 1. Tenta "longOffset" (OU "shortOffset") -------------------- */
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: iana,
      timeZoneName: "longOffset", // ex.: "GMT+01:00"
    }).formatToParts(now);

    offsetStr = parts.find(p => p.type === "timeZoneName")?.value; // "GMT+01:00"
  } catch {
    // Browser ainda não tem suporte → vai para o fallback
  }

  /* -------------------------- 2. Fallback: cálculo manual --------------------------- */
  if (!offsetStr || !offsetStr.startsWith("GMT")) {
    // Converte “agora” para a zona alvo e para UTC
    const utcDate   = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate    = new Date(now.toLocaleString("en-US", { timeZone: iana }));
    const diffMin   = (tzDate.getTime() - utcDate.getTime()) / 60000; // minutos

    const sign      = diffMin >= 0 ? "+" : "-";
    const absMin    = Math.abs(diffMin);
    const hours     = String(Math.floor(absMin / 60)).padStart(2, "0");
    const minutes   = String(absMin % 60).padStart(2, "0");
    offsetStr       = `GMT ${sign}${hours}:${minutes}`;               // "GMT +01:00"
  }

  /* --------------------------- 3. Monta a label final ------------------------------- */
  const [continent, cityRaw] = iana.split("/");
  const city = cityRaw.replace(/_/g, " ");

  return `${city}, ${continent} (${offsetStr})`;
};
