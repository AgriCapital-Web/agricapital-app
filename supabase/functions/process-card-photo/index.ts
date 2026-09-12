import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const BUCKET = "cartes-personnel";
const MAX_BYTES = 10 * 1024 * 1024;
const BodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("single"), cardId: z.string().uuid(), sourcePath: z.string().min(3).max(500) }),
  z.object({ mode: z.literal("batch") }),
]);

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function editPortrait(bytes: Uint8Array, mimeType: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("Le service de traitement photo n'est pas configuré.");

  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const imageUrl = `data:${mimeType};base64,${btoa(binary)}`;
  const prompt = [
    "Retouche cette photographie d'identité professionnelle uniquement.",
    "Conserve exactement la personne, son visage, ses traits, son teint, sa coiffure, ses vêtements et son expression.",
    "Ne rajeunis pas, n'embellis pas et ne redessine aucune partie du visage.",
    "Supprime seulement l'arrière-plan et remplace-le par un gris clair uniforme neutre (#E7E7E7), sans ombre ni décor.",
    "Recadre verticalement en portrait 3:4, tête et haut des épaules entièrement visibles, centrés, sans étirement.",
    "Rends une image nette et naturelle en haute définition, sans texte, cadre ni logo.",
  ].join(" ");

  let gatewayResponse: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    gatewayResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ] }],
        modalities: ["image", "text"],
      }),
    });
    if (gatewayResponse.ok) break;
    if (gatewayResponse.status !== 429 && gatewayResponse.status < 500) break;
    if (attempt < 2) {
      const retryAfter = Number(gatewayResponse.headers.get("Retry-After") || 0);
      await gatewayResponse.text();
      await delay(Math.max(retryAfter * 1000, 1000 * (2 ** attempt)));
    }
  }

  if (!gatewayResponse?.ok) {
    const status = gatewayResponse?.status || 500;
    const raw = gatewayResponse ? await gatewayResponse.text() : "";
    let message = "Le traitement automatique de la photo a échoué.";
    try { message = JSON.parse(raw)?.message || JSON.parse(raw)?.error?.message || message; } catch { /* réponse non JSON */ }
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    throw error;
  }

  const payload = await gatewayResponse.json();
  const dataUrl = payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (typeof dataUrl !== "string" || !dataUrl.includes(";base64,")) {
    throw new Error("Le service n'a retourné aucune photo traitée.");
  }
  const [header, encoded] = dataUrl.split(";base64,");
  const outputMime = header.replace("data:", "") || "image/png";
  const decoded = atob(encoded);
  const output = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) output[i] = decoded.charCodeAt(i);
  return { output, outputMime };
}

async function processOne(admin: ReturnType<typeof createClient>, cardId: string, sourcePath: string) {
  if (sourcePath.startsWith("http") || sourcePath.includes("..")) throw new Error("Chemin de photo invalide.");
  const { data: card, error: cardError } = await admin.from("cartes_personnel").select("id, profile_id, photo_url").eq("id", cardId).single();
  if (cardError || !card) throw new Error("Carte introuvable.");

  const { data: source, error: downloadError } = await admin.storage.from(BUCKET).download(sourcePath);
  if (downloadError || !source) throw new Error("Photo source introuvable.");
  if (source.size > MAX_BYTES) throw new Error("La photo dépasse la limite de 10 Mo.");
  if (!source.type.startsWith("image/")) throw new Error("Le fichier source n'est pas une image.");

  const { output, outputMime } = await editPortrait(new Uint8Array(await source.arrayBuffer()), source.type);
  const extension = outputMime.includes("jpeg") ? "jpg" : "png";
  const targetPath = `processed/${card.profile_id}/${Date.now()}.${extension}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(targetPath, output, {
    contentType: outputMime,
    upsert: false,
    cacheControl: "31536000",
  });
  if (uploadError) throw uploadError;

  const { error: updateError } = await admin.from("cartes_personnel").update({ photo_url: targetPath }).eq("id", card.id);
  if (updateError) {
    await admin.storage.from(BUCKET).remove([targetPath]);
    throw updateError;
  }
  return targetPath;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Méthode non autorisée." }, 405);

  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth.user) return response({ error: "Non authentifié." }, 401);
    const { data: allowed } = await admin.rpc("has_role", { _user_id: auth.user.id, _role: "super_admin" });
    const { data: operations } = await admin.rpc("has_role", { _user_id: auth.user.id, _role: "responsable_operations" });
    if (!allowed && !operations) return response({ error: "Accès non autorisé." }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return response({ error: "Demande invalide.", details: parsed.error.flatten().fieldErrors }, 400);

    if (parsed.data.mode === "single") {
      const path = await processOne(admin, parsed.data.cardId, parsed.data.sourcePath);
      return response({ processed: 1, path });
    }

    const { data: cards, error } = await admin.from("cartes_personnel").select("id, photo_url").not("photo_url", "is", null);
    if (error) throw error;
    let processed = 0;
    const failures: string[] = [];
    for (const card of cards || []) {
      if (!card.photo_url || card.photo_url.startsWith("processed/")) continue;
      try {
        await processOne(admin, card.id, card.photo_url);
        processed += 1;
      } catch (error) {
        failures.push(`${card.id}: ${error instanceof Error ? error.message : "échec"}`);
      }
    }
    return response({ processed, failed: failures.length, failures });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return response({ error: error instanceof Error ? error.message : "Erreur interne." }, status);
  }
});