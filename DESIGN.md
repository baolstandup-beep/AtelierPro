# AtelierPro Design System

## North star

AtelierPro is a precise, calm workshop-management tool for professional tailors. Product screens favour clarity, density, and trust. A fine dashed “stitch” divider may be used as a restrained brand signature; marketing-scale heroes, neon surfaces, and oversized dark cards do not belong in the authenticated product.

## Runtime source of truth

The semantic CSS variables in `app/globals.css` are the runtime source of truth. Shared components and product screens consume those variables through Tailwind arbitrary values.

## Palette

- Application: `#F7F7F4`
- Surface: `#FFFFFF`
- Secondary surface: `#F2F4F2`
- Primary: `#0F4C3A`; hover `#0B3D30`; subtle `#EAF2EE`
- Text: `#18221E`; secondary `#66736D`; tertiary `#8A9690`
- Border: `#E4E8E5`
- Accent: `#A3E635`, reserved for small indicators
- Success `#15803D`, warning `#D97706`, danger `#DC2626`

## Product typography and shape

Plus Jakarta Sans is the product face. Serif is reserved for marketing. Page titles are 28–32px, section titles 18–20px, body 14–15px, captions 12–13px, KPIs 28–34px. Product cards use 14px radii, a one-pixel border, and little or no shadow. Controls are 40–44px high with 8–10px radii.

## Layout

Desktop uses a 256px sidebar and a fluid main area. Product content is capped at 1500px with 32px desktop, 24px tablet, and 16px mobile padding. Below 1024px the desktop sidebar becomes a drawer and a compact top bar remains visible.

## Interaction

Hover and focus are subtle and consistent. All actions use native buttons or links, keyboard focus stays visible, and loading must preserve component geometry. Data remains the sole source for KPIs, subscription status, profiles, and pricing.
