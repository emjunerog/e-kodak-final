import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ── Announcements ─────────────────────────────────────────────────────────────
export async function getAnnouncements() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  return { data, error };
}

export async function createAnnouncement(payload) {
  if (!isSupabaseConfigured) return { error: null };
  const record = {
    text: payload.text || payload.content || payload.title || '',
    cta_text: payload.cta_text || null,
    cta_link: payload.cta_link || null,
    type: payload.type || 'info',
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    sort_order: payload.sort_order || 0
  };
  const { error } = await supabase.from('announcements').insert([record]);
  return { error };
}

export async function updateAnnouncement(id, payload) {
  if (!isSupabaseConfigured) return { error: null };
  const record = { ...payload };
  if (record.content && !record.text) record.text = record.content;
  if (record.title && !record.text) record.text = record.title;
  delete record.content;
  delete record.title;
  const { error } = await supabase.from('announcements').update(record).eq('id', id);
  return { error };
}

export async function deleteAnnouncement(id) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  return { error };
}

// ── FAQs ──────────────────────────────────────────────────────────────────────
export async function getFaqs() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  const { data, error } = await supabase.from('faqs').select('*').order('sort_order', { ascending: true });
  return { data, error };
}

export async function createFaq(payload) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('faqs').insert([payload]);
  return { error };
}

export async function updateFaq(id, payload) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('faqs').update(payload).eq('id', id);
  return { error };
}

export async function deleteFaq(id) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('faqs').delete().eq('id', id);
  return { error };
}

// ── Gallery Items ─────────────────────────────────────────────────────────────
export async function getGalleryItems() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  const { data, error } = await supabase.from('gallery_items').select('*').order('sort_order', { ascending: true });
  return { data, error };
}

export async function createGalleryItem(payload) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('gallery_items').insert([payload]);
  return { error };
}

export async function updateGalleryItem(id, payload) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('gallery_items').update(payload).eq('id', id);
  return { error };
}

export async function incrementGalleryLikes(id, currentLikes = 0) {
  if (!isSupabaseConfigured) return { likes: (currentLikes || 0) + 1, error: null };
  const nextLikes = Number(currentLikes || 0) + 1;
  const { error } = await supabase.from('gallery_items').update({ likes: nextLikes }).eq('id', id);
  return { likes: nextLikes, error };
}

export async function deleteGalleryItem(id) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('gallery_items').delete().eq('id', id);
  return { error };
}

// ── Legal Docs ────────────────────────────────────────────────────────────────
export async function getLegalDocs() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  const { data, error } = await supabase.from('legal_docs').select('*').order('updated_at', { ascending: false });
  return { data, error };
}

export async function createLegalDoc(payload) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('legal_docs').insert([payload]);
  return { error };
}

export async function updateLegalDoc(slug, payload) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('legal_docs').update({
    ...payload,
    updated_at: new Date().toISOString()
  }).eq('slug', slug);
  return { error };
}

export async function deleteLegalDoc(slug) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('legal_docs').delete().eq('slug', slug);
  return { error };
}

// ── Studio Settings ───────────────────────────────────────────────────────────
export async function getStudioSettings() {
  if (!isSupabaseConfigured) return { data: null, error: null };
  const { data, error } = await supabase.from('studio_settings').select('*').limit(1).maybeSingle();
  return { data, error };
}

export async function updateStudioSettings(id, payload) {
  if (!isSupabaseConfigured) return { error: null };
  const updateData = {
    ...payload,
    updated_at: new Date().toISOString()
  };
  if (id) {
    const { data, error } = await supabase.from('studio_settings').update(updateData).eq('id', id).select().single();
    return { data, error };
  } else {
    const { data, error } = await supabase.from('studio_settings').insert([updateData]).select().single();
    return { data, error };
  }
}

export async function createStudioSettings(payload) {
  if (!isSupabaseConfigured) return { error: null };
  const { data, error } = await supabase.from('studio_settings').insert([{
    ...payload,
    updated_at: new Date().toISOString()
  }]).select().single();
  return { data, error };
}

// ── Team Members ──────────────────────────────────────────────────────────────
export async function getTeamMembers() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  const { data, error } = await supabase.from('team_members').select('*').order('sort_order', { ascending: true });
  return { data, error };
}

export async function createTeamMember(payload) {
  if (!isSupabaseConfigured) return { error: null };
  const memberData = {
    ...payload,
    id: payload.id || `member-${Date.now()}`,
    image: payload.image || payload.image_url || null,
  };
  delete memberData.image_url;
  const { error } = await supabase.from('team_members').insert([memberData]);
  return { error };
}

export async function updateTeamMember(id, payload) {
  if (!isSupabaseConfigured) return { error: null };
  const memberData = { ...payload };
  if (memberData.image_url !== undefined && memberData.image === undefined) {
    memberData.image = memberData.image_url;
  }
  delete memberData.image_url;
  const { error } = await supabase.from('team_members').update(memberData).eq('id', id);
  return { error };
}

export async function deleteTeamMember(id) {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.from('team_members').delete().eq('id', id);
  return { error };
}
