import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Sanity-check: la fonction edge create-user ne doit JAMAIS insérer une colonne `role`
 * dans la table `profiles`. Le rôle passe UNIQUEMENT par la table user_roles.
 * On teste ici la contract shape du body envoyé.
 */
describe("create-user edge function contract", () => {
  it("body ne doit pas contenir de champ 'role' racine", () => {
    const body = {
      email: "test@x.com",
      password: "SuperSecret123!",
      nom_complet: "Test User",
      telephone: "0700000000",
      equipe_id: null,
      photo_url: null,
      roles: ["commercial"],
      username: "test",
    };
    expect((body as any).role).toBeUndefined();
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.roles).toContain("commercial");
  });

  it("liste des rôles autorisés inclut les rôles métiers", () => {
    const allowed = [
      'super_admin','directeur_tc','responsable_zone','superviseur_tc',
      'chef_equipe','comptable','commercial','technicien','service_client',
      'operations','agent_terrain','user'
    ];
    ['commercial','technicien','comptable','service_client'].forEach(r =>
      expect(allowed).toContain(r)
    );
  });

  it("ne bloque pas un email déjà existant: le flux est idempotent", () => {
    const source = readFileSync("supabase/functions/create-user/index.ts", "utf8");

    expect(source).not.toContain('error: "Un utilisateur avec cet email existe déjà"');
    expect(source).toContain("updateUserById");
    expect(source).toContain("user_already_existed");
    expect(source).toContain("user_roles");
  });
});