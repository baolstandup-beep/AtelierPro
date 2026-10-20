#!/usr/bin/env node
// Création sécurisée du PREMIER administrateur.
// - Aucun mot de passe codé en dur : saisi au clavier (masqué) ou fourni par
//   variable d'environnement le temps de la commande.
// - Refuse de s'exécuter si un administrateur actif existe déjà.
// - Utilise la clé service_role, à exécuter UNIQUEMENT sur un poste de confiance.
//
// Usage :
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run admin:create
//   (ou ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD pour un usage non interactif)
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Définissez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (voir docs/PREMIER-ADMINISTRATEUR.md).");
  process.exit(1);
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : "*".repeat(s.length ? 1 : 0));
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { count, error: countError } = await supabase
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .eq("role", "admin")
  .eq("is_active", true);
if (countError) {
  console.error("Lecture des profils impossible. Les migrations sont-elles appliquées ?", countError.message);
  process.exit(1);
}
if ((count ?? 0) > 0) {
  console.error("Un administrateur actif existe déjà. Créez les autres comptes depuis l'application (Utilisateurs).");
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL ?? (await ask("E-mail de l'administratrice : "))).toLowerCase();
const fullName = process.env.ADMIN_NAME ?? (await ask("Nom complet : "));
const password = process.env.ADMIN_PASSWORD ?? (await ask("Mot de passe (12 caractères minimum) : ", { hidden: true }));

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Adresse e-mail invalide.");
  process.exit(1);
}
if (!fullName) {
  console.error("Nom obligatoire.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Mot de passe trop court (12 caractères minimum).");
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (error || !data.user) {
  console.error("Création du compte impossible :", error?.message);
  process.exit(1);
}

const { error: profileError } = await supabase
  .from("profiles")
  .update({ role: "admin", is_active: true, full_name: fullName })
  .eq("id", data.user.id);
if (profileError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error("Activation du profil impossible, compte supprimé :", profileError.message);
  process.exit(1);
}

await supabase.from("audit_logs").insert({ actor_id: data.user.id, action: "user.create", entity_type: "profile", entity_id: data.user.id, details: { bootstrap: true, role: "admin" } });
console.log(`Administratrice créée : ${email}. Connectez-vous sur l'application.`);
