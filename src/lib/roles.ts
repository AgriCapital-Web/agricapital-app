/**
 * Role-based access control definitions for AgriCapital CRM
 * 
 * Hierarchy:
 * - super_admin: Full access to everything
 * - directeur_tc: Almost full access, manages teams & commercial strategy
 * - superviseur_tc (STC/RTC): Superviseur Technico-Commercial de Zone
 * - chef_equipe: Team leader
 * - comptable: Financial operations only
 * - commercial: Field agent - souscriptions, recouvrement
 * - technicien: Field agent - plantations, suivi agronomique
 * - service_client: Customer support - tickets, payments
 * - operations: Operations team - plantations, technical
 * - user: Basic authenticated user (souscripteur on portal)
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  DIRECTEUR_TC: 'directeur_tc',
  SUPERVISEUR_TC: 'superviseur_tc',
  CHEF_EQUIPE: 'chef_equipe',
  COMPTABLE: 'comptable',
  COMMERCIAL: 'commercial',
  TECHNICIEN: 'technicien',
  SERVICE_CLIENT: 'service_client',
  OPERATIONS: 'operations',
  USER: 'user',
  RESPONSABLE_COMMERCIAL: 'responsable_commercial',
  RESPONSABLE_TECHNIQUE_AGRO: 'responsable_technique_agronomique',
  CHEF_EQUIPE_COMMERCIAL: 'chef_equipe_commercial',
  CHEF_EQUIPE_TECHNIQUE: 'chef_equipe_technique',
  RESPONSABLE_ZONE: 'responsable_zone',
} as const;

export type AppRole = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  directeur_tc: 'Directeur Technico-Commercial',
  superviseur_tc: 'Superviseur Technico-Commercial',
  chef_equipe: "Chef d'Équipe",
  comptable: 'Comptable',
  commercial: 'Commercial',
  technicien: 'Technicien',
  service_client: 'Service Client',
  operations: 'Opérations',
  user: 'Utilisateur',
};

// Extend labels for new roles
Object.assign(ROLE_LABELS, {
  responsable_commercial: 'Responsable Commercial',
  responsable_technique_agronomique: 'Responsable Technique et Agronomique',
  chef_equipe_commercial: "Chef d'Équipe Commercial",
  chef_equipe_technique: "Chef d'Équipe Technique",
  responsable_zone: 'Responsable de Zone',
});

export const ROLE_SHORT_LABELS: Record<string, string> = {
  super_admin: 'Admin',
  directeur_tc: 'DTC',
  superviseur_tc: 'STC',
  chef_equipe: 'CE',
  comptable: 'Comptable',
  commercial: 'Commercial',
  technicien: 'Technicien',
  service_client: 'SC',
  operations: 'Ops',
  user: 'User',
};

Object.assign(ROLE_SHORT_LABELS, {
  responsable_commercial: 'RCom',
  responsable_technique_agronomique: 'RTA',
  chef_equipe_commercial: 'CEC',
  chef_equipe_technique: 'CET',
  commercial: 'Comm',
  technicien: 'Tech',
});

Object.assign(ROLE_SHORT_LABELS, { responsable_zone: 'RZ' });

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800',
  directeur_tc: 'bg-purple-100 text-purple-800',
  superviseur_tc: 'bg-blue-100 text-blue-800',
  chef_equipe: 'bg-indigo-100 text-indigo-800',
  comptable: 'bg-amber-100 text-amber-800',
  commercial: 'bg-green-100 text-green-800',
  technicien: 'bg-teal-100 text-teal-800',
  service_client: 'bg-cyan-100 text-cyan-800',
  operations: 'bg-orange-100 text-orange-800',
  user: 'bg-gray-100 text-gray-800',
};

Object.assign(ROLE_COLORS, {
  responsable_commercial: 'bg-purple-100 text-purple-800',
  responsable_technique_agronomique: 'bg-blue-100 text-blue-800',
  chef_equipe_commercial: 'bg-indigo-100 text-indigo-800',
  chef_equipe_technique: 'bg-teal-100 text-teal-800',
  responsable_zone: 'bg-blue-100 text-blue-800',
});

// Permission matrix
export const PERMISSIONS = {
  // Navigation visibility
  VIEW_DASHBOARD: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.SUPERVISEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.CHEF_EQUIPE, ROLES.COMPTABLE, ROLES.COMMERCIAL, ROLES.TECHNICIEN, ROLES.SERVICE_CLIENT, ROLES.OPERATIONS, ROLES.RESPONSABLE_COMMERCIAL, ROLES.RESPONSABLE_TECHNIQUE_AGRO, ROLES.CHEF_EQUIPE_COMMERCIAL, ROLES.CHEF_EQUIPE_TECHNIQUE],
  VIEW_SOUSCRIPTIONS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.SUPERVISEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.CHEF_EQUIPE, ROLES.COMMERCIAL, ROLES.SERVICE_CLIENT, ROLES.RESPONSABLE_COMMERCIAL, ROLES.CHEF_EQUIPE_COMMERCIAL],
  VIEW_LEADS: Object.values(ROLES),
  VIEW_PLANTATIONS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.SUPERVISEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.CHEF_EQUIPE, ROLES.COMMERCIAL, ROLES.TECHNICIEN, ROLES.OPERATIONS, ROLES.RESPONSABLE_TECHNIQUE_AGRO, ROLES.CHEF_EQUIPE_TECHNIQUE],
  VIEW_PAIEMENTS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.SUPERVISEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.COMPTABLE, ROLES.SERVICE_CLIENT, ROLES.RESPONSABLE_COMMERCIAL],
  VIEW_COMMISSIONS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.COMPTABLE, ROLES.RESPONSABLE_COMMERCIAL, ROLES.CHEF_EQUIPE_COMMERCIAL, ROLES.COMMERCIAL],
  VIEW_PORTEFEUILLES: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.COMPTABLE],
  VIEW_RAPPORTS_TECHNIQUES: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.SUPERVISEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.TECHNICIEN, ROLES.OPERATIONS, ROLES.RESPONSABLE_TECHNIQUE_AGRO, ROLES.CHEF_EQUIPE_TECHNIQUE],
  VIEW_RAPPORTS_FINANCIERS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.COMPTABLE, ROLES.RESPONSABLE_COMMERCIAL],
  VIEW_TICKETS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.SUPERVISEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.SERVICE_CLIENT, ROLES.TECHNICIEN, ROLES.OPERATIONS, ROLES.RESPONSABLE_TECHNIQUE_AGRO],
  VIEW_PARAMETRES: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC],
  VIEW_EQUIPES: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.SUPERVISEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.CHEF_EQUIPE, ROLES.RESPONSABLE_COMMERCIAL, ROLES.RESPONSABLE_TECHNIQUE_AGRO, ROLES.CHEF_EQUIPE_COMMERCIAL, ROLES.CHEF_EQUIPE_TECHNIQUE],

  // Actions
  MANAGE_USERS: [ROLES.SUPER_ADMIN],
  MANAGE_TEAMS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.SUPERVISEUR_TC, ROLES.RESPONSABLE_ZONE],
  MANAGE_OFFERS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC],
  MANAGE_GEO: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC],
  MANAGE_ROLES: [ROLES.SUPER_ADMIN],
  MANAGE_SYSTEM: [ROLES.SUPER_ADMIN],
  VALIDATE_PAYMENTS: [ROLES.SUPER_ADMIN, ROLES.COMPTABLE, ROLES.SERVICE_CLIENT],
  CREATE_SOUSCRIPTION: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.RESPONSABLE_COMMERCIAL, ROLES.CHEF_EQUIPE_COMMERCIAL, ROLES.COMMERCIAL],
  DELETE_DATA: [ROLES.SUPER_ADMIN],
} as const;

/**
 * Check if any of the user's roles has the required permission
 */
export function hasPermission(userRoles: string[], permission: readonly string[]): boolean {
  return userRoles.some(role => permission.includes(role));
}
