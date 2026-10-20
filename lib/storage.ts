export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-photos/${path}`;
}
