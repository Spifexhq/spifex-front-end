export type JournalIdentity = {
  id: string;
  entry_number?: string;
  posting_date?: string;
};

/**
 * A compact, stable journal identifier for UI labels.
 * Prefers the stored entry number and otherwise derives `JE-YYYYMMDD-XXXX`
 * from the posting date and a short suffix of the journal identifier.
 */
export function journalDisplayId(journal: JournalIdentity): string {
  const stored = (journal.entry_number || "").trim();
  if (stored) return stored;
  const date = (journal.posting_date || "").replace(/\D/g, "").slice(0, 8) || "00000000";
  const suffix = (journal.id || "").replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase() || "0000";
  return `JE-${date}-${suffix}`;
}
