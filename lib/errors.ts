// Traduit les erreurs PostgreSQL / PostgREST en messages compréhensibles.
// Les fonctions SQL lèvent déjà des messages en français (codes P0001, 22023,
// 23514, 42501...) : on les relaie tels quels.
interface DbError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export function dbErrorMessage(error: unknown, fallback = "L'opération n'a pas abouti. Réessayez."): string {
  const e = (error ?? {}) as DbError;
  const msg = e.message ?? "";
  if (e.code === "23505" || /duplicate key/i.test(msg)) {
    if (/barcode/i.test(msg)) return "Ce code-barres est déjà attribué à un autre article.";
    if (/reference/i.test(msg)) return "Cette référence interne est déjà utilisée.";
    if (/phone/i.test(msg)) return "Un client utilise déjà ce numéro de téléphone.";
    if (/sku/i.test(msg)) return "Ce SKU est déjà utilisé.";
    if (/categories_name/i.test(msg)) return "Cette catégorie existe déjà.";
    if (/one_open_per_register/i.test(msg)) return "Une session est déjà ouverte sur cette caisse.";
    if (!/[éèàç]/i.test(msg)) return "Cet élément existe déjà.";
  }
  if (e.code === "23503") return "Élément lié introuvable ou encore utilisé ailleurs.";
  if (e.code === "42501" && /permission denied/i.test(msg)) return "Vous n'avez pas les droits nécessaires pour cette opération.";
  if (e.code === "PGRST301" || /JWT/i.test(msg)) return "Votre session a expiré. Reconnectez-vous.";
  if (/fetch failed|network|ECONNREFUSED/i.test(msg)) return "Connexion au serveur impossible. Vérifiez la connexion internet.";
  // Messages métier rédigés en français dans les fonctions SQL.
  if (msg && /[a-zà-ÿ]/i.test(msg) && /[éèàùçêâîôû]|Permission|Stock|Le |La |Les |Une? |Vous|Ce|Aucun|Impossible|Seul|Montant|Quantité|Remise/.test(msg)) {
    return msg;
  }
  return fallback;
}
