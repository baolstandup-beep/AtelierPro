import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET_NAME = 'atelierpro-media';

export type MediaCategory = 'fabrics' | 'models' | 'measurements' | 'receipts' | 'avatars';

/**
 * Upload a file securely to Supabase Storage organized by workshop
 */
export async function uploadMediaFile(
  workshopId: string,
  category: MediaCategory,
  file: File | Blob,
  fileName?: string
): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    // If Supabase is not configured (demo/local mode), create a local Object URL
    return URL.createObjectURL(file);
  }

  const cleanExt = (file instanceof File ? file.name.split('.').pop() : 'jpg') || 'jpg';
  const uniqueName = fileName || `${Date.now()}-${Math.random().toString(36).slice(2)}.${cleanExt}`;
  const filePath = `workshops/${workshopId}/${category}/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.warn('[Storage Upload Warning]', error.message);
    // Fallback to Object URL if bucket is not yet provisioned in Supabase
    return URL.createObjectURL(file);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
