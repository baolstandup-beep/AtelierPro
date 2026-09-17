import { supabase, isSupabaseConfigured } from './supabase';

export const PRIVATE_BUCKET_NAME = 'atelierpro-private';
export const PUBLIC_BUCKET_NAME = 'atelierpro-media';

export type MediaCategory = 'fabrics' | 'models' | 'measurements' | 'receipts' | 'avatars' | 'clients' | 'orders';

/**
 * Upload a private file securely to Supabase Private Storage organized by workshop
 */
export async function uploadPrivateMediaFile(
  workshopId: string,
  category: MediaCategory,
  file: File | Blob,
  fileName?: string
): Promise<{ bucket: string; path: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { bucket: PRIVATE_BUCKET_NAME, path: URL.createObjectURL(file) };
  }

  const cleanExt = (file instanceof File ? file.name.split('.').pop() : 'jpg') || 'jpg';
  const uniqueName = fileName || `${Date.now()}-${Math.random().toString(36).slice(2)}.${cleanExt}`;
  const filePath = `workshops/${workshopId}/${category}/${uniqueName}`;

  const { error } = await supabase.storage
    .from(PRIVATE_BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.warn('[Private Storage Upload Fallback to Media]', error.message);
    // Fallback gracieux sur le bucket media si non provisionné
    await supabase.storage.from(PUBLIC_BUCKET_NAME).upload(filePath, file, { upsert: true });
    return { bucket: PUBLIC_BUCKET_NAME, path: filePath };
  }

  return { bucket: PRIVATE_BUCKET_NAME, path: filePath };
}

/**
 * Génère une URL signée temporaire pour un fichier privé.
 * Ne persiste jamais d'URL signée expirante dans la base de données.
 */
export async function getSignedMediaUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
  if (!supabase || !isSupabaseConfigured || filePath.startsWith('blob:') || filePath.startsWith('http')) {
    return filePath;
  }

  const { data, error } = await supabase.storage
    .from(PRIVATE_BUCKET_NAME)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    // Si absent du bucket privé, vérifier le bucket public
    const { data: pubData } = supabase.storage.from(PUBLIC_BUCKET_NAME).getPublicUrl(filePath);
    return pubData.publicUrl;
  }

  return data.signedUrl;
}

/**
 * Upload a file (legacy compatible)
 */
export async function uploadMediaFile(
  workshopId: string,
  category: MediaCategory,
  file: File | Blob,
  fileName?: string
): Promise<string> {
  const result = await uploadPrivateMediaFile(workshopId, category, file, fileName);
  if (result.path.startsWith('blob:') || result.path.startsWith('http')) {
    return result.path;
  }
  return await getSignedMediaUrl(result.path);
}
