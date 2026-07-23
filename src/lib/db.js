import { supabase } from "./supabaseClient";

const BUCKET = "qa-captures";

export async function listProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createProject(name) {
  const { data, error } = await supabase
    .from("projects")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listIssues(projectId) {
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .eq("project_id", projectId)
    .order("seq", { ascending: true });
  if (error) throw error;
  return data;
}

export async function nextSeq(projectId) {
  const { count, error } = await supabase
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) throw error;
  return (count || 0) + 1;
}

export async function createIssue(issue) {
  const { data, error } = await supabase
    .from("issues")
    .insert(issue)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIssue(issueId, patch) {
  const { data, error } = await supabase
    .from("issues")
    .update(patch)
    .eq("id", issueId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIssue(issueId) {
  const { error } = await supabase.from("issues").delete().eq("id", issueId);
  if (error) throw error;
}

export async function addHistory(issueId, { status, comment, image_path }) {
  const { error } = await supabase
    .from("issue_history")
    .insert({ issue_id: issueId, status, comment: comment || "", image_path: image_path || null });
  if (error) throw error;
}

export async function listHistory(issueId) {
  const { data, error } = await supabase
    .from("issue_history")
    .select("*")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function uploadCapture(projectId, issueId, blob) {
  const path = `${projectId}/${issueId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

const signedUrlCache = new Map();

export async function getSignedUrl(path) {
  if (!path) return null;
  const cached = signedUrlCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

export function subscribeIssues(projectId, onChange) {
  const channel = supabase
    .channel(`issues-${projectId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "issues", filter: `project_id=eq.${projectId}` },
      onChange
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
