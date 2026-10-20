// Miroir de public.role_default_permissions : sert UNIQUEMENT à l'affichage
// (masquer les menus). L'autorisation réelle est vérifiée en base (RLS et
// fonctions) et dans chaque action serveur.
export type Role = "admin" | "cashier" | "stock_manager" | "employee";

export const PERMISSIONS = [
  "dashboard.view", "reports.view", "products.view", "products.manage", "stock.manage", "stock.adjust",
  "purchases.manage", "suppliers.manage", "sales.create", "sales.discount", "sales.view_all", "sales.cancel",
  "credit.sell", "returns.manage", "cash.operate", "cash.close", "cash.correct", "customers.view",
  "customers.manage", "expenses.manage", "users.manage", "settings.manage", "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_DEFAULTS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  cashier: ["products.view", "sales.create", "sales.discount", "cash.operate", "cash.close", "customers.view", "customers.manage"],
  stock_manager: ["products.view", "products.manage", "stock.manage", "stock.adjust", "purchases.manage", "suppliers.manage"],
  employee: ["products.view"],
};

export function effectivePermissions(role: Role, extra: readonly string[] = []): Set<string> {
  return new Set<string>([...ROLE_DEFAULTS[role], ...extra]);
}

export function can(perms: Set<string> | readonly string[], ...required: Permission[]): boolean {
  const set = perms instanceof Set ? perms : new Set(perms);
  return required.some((p) => set.has(p));
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  any: Permission[];
  mobile?: boolean;
  group: "Boutique" | "Gestion" | "Pilotage" | "Administration";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: "LayoutDashboard", any: ["dashboard.view"], mobile: true, group: "Boutique" },
  { href: "/caisse", label: "Caisse", icon: "ScanBarcode", any: ["sales.create"], mobile: true, group: "Boutique" },
  { href: "/ventes", label: "Ventes", icon: "Receipt", any: ["sales.create", "sales.view_all", "returns.manage"], mobile: true, group: "Boutique" },
  { href: "/sessions-caisse", label: "Sessions de caisse", icon: "Wallet", any: ["cash.operate", "cash.close", "reports.view"], group: "Boutique" },
  { href: "/clients", label: "Clients", icon: "Users", any: ["customers.view"], group: "Boutique" },
  { href: "/produits", label: "Produits", icon: "Shirt", any: ["products.view"], mobile: true, group: "Gestion" },
  { href: "/stock", label: "Stock", icon: "Boxes", any: ["stock.manage", "stock.adjust", "products.manage"], group: "Gestion" },
  { href: "/achats", label: "Achats", icon: "Truck", any: ["purchases.manage"], group: "Gestion" },
  { href: "/fournisseurs", label: "Fournisseurs", icon: "Building2", any: ["suppliers.manage", "purchases.manage"], group: "Gestion" },
  { href: "/depenses", label: "Dépenses", icon: "HandCoins", any: ["expenses.manage"], group: "Gestion" },
  { href: "/rapports", label: "Rapports", icon: "ChartColumn", any: ["reports.view"], group: "Pilotage" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: "UserCog", any: ["users.manage"], group: "Administration" },
  { href: "/journal", label: "Journal d'activité", icon: "ScrollText", any: ["audit.view"], group: "Administration" },
  { href: "/parametres", label: "Réglages", icon: "Settings", any: ["settings.manage"], group: "Administration" },
];

/** Première page accessible après connexion. */
export function homeFor(perms: Set<string>): string {
  return NAV_ITEMS.find((i) => can(perms, ...i.any))?.href ?? "/compte";
}
