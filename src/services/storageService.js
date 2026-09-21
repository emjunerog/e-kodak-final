import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Uploads an image file directly to Supabase Storage in the public 'studio-assets' bucket.
 * Returns public URL for instant use in services, gallery, team, or announcements.
 */
export async function uploadDirectImage(file, folder = 'general') {
  if (!file) return { url: null, error: new Error('No file provided') };

  if (!isSupabaseConfigured) {
    // Fallback to local Data URL if Supabase client not initialized
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result, error: null });
      reader.onerror = (err) => resolve({ url: null, error: err });
      reader.readAsDataURL(file);
    });
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    const filePath = `${folder}/${Date.now()}_${cleanName}`;

    const { data, error } = await supabase.storage
      .from('studio-assets')
      .upload(filePath, file, {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type || `image/${ext}`
      });

    if (error) {
      console.warn('Storage upload warning:', error.message);
      // Fallback: if storage upload fails for any reason, generate base64 data URL so user flow is never blocked
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result, error: null, isFallback: true });
        reader.onerror = () => resolve({ url: null, error });
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('studio-assets')
      .getPublicUrl(filePath);

    return { 
      url: publicUrlData?.publicUrl || '', 
      path: filePath, 
      error: null 
    };
  } catch (err) {
    console.error('Direct image upload exception:', err);
    return { url: null, error: err };
  }
}
