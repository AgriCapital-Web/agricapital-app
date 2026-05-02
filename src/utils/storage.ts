import { supabase } from '@/integrations/supabase/client';

export const uploadFile = async (
  bucket: string,
  file: File,
  path?: string
): Promise<{ url: string; path: string } | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const { data: { user } } = await supabase.auth.getUser();
    const defaultFolder = user?.id || 'public';
    const filePath = path ? `${path}/${fileName}` : `${defaultFolder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: bucketInfo } = await supabase.storage.getBucket(bucket);
    const publicUrl = bucketInfo?.public
      ? supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
      : (await supabase.storage.from(bucket).createSignedUrl(data.path, 60 * 60 * 24 * 365)).data?.signedUrl || data.path;

    return { url: publicUrl, path: data.path };
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};

export const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

export const getFileUrl = (bucket: string, path: string): string => {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return publicUrl;
};
