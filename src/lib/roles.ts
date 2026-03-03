/**
 * Role-based access control definitions for AgriCapital CRM
 * 
 * Hierarchy:
 * - super_admin: Full access to everything
 * - directeur_tc: Almost full access, manages teams & commercial strategy
 * - responsable_commercial_zone (RCom): Regional commercial manager
 * - chef_equipe: Team leader (future role)
 * - comptable: Financial operations only
 * - commercial: Field agent - souscriptions, plantations
 * - service_client: Customer support - tickets, payments
 * - operations: Operations team - plantations, technical
 * - user: Basic authenticated user (souscripteur on portal)
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  DIRECTEUR_TC: 'directeur_tc',
  RESPONSABLE_ZONE: 'responsable_zone',
  CHEF_EQUIPE: 'chef_equipe',
  COMPTABLE: 'comptable',
  COMMERCIAL: 'commercial',
  SERVICE_CLIENT: 'service_client',
  OPERATIONS: 'operations',
  USER: 'user',
} as const;

export type AppRole = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  directeur_tc: 'Directeur Technico-Commercial',
  responsable_zone: 'RCom - Responsable Commercial de Zone',
  chef_equipe: "Chef d'Équipe",
  comptable: 'Comptable',
  commercial: 'Commercial',
  service_client: 'Service Client',
  operations: 'Opérations',
  user: 'Utilisateur',
};

export const ROLE_SHORT_LABELS: Record<string, string> = {
  super_admin: 'Admin',
  directeur_tc: 'DTC',
  responsable_zone: 'RCom',
  chef_equipe: 'CE',
  comptable: 'Comptable',
  commercial: 'Commercial',
  service_client: 'SC',
  operations: 'Ops',
  user: 'User',
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800',
  directeur_tc: 'bg-purple-100 text-purple-800',
  responsable_zone: 'bg-blue-100 text-blue-800',
  chef_equipe: 'bg-indigo-100 text-indigo-800',
  comptable: 'bg-amber-100 text-amber-800',
  commercial: 'bg-green-100 text-green-800',
  service_client: 'bg-cyan-100 text-cyan-800',
  operations: 'bg-orange-100 text-orange-800',
  user: 'bg-gray-100 text-gray-800',
};

// Permission matrix
export const PERMISSIONS = {
  // Navigation visibility
  VIEW_DASHBOARD: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.CHEF_EQUIPE, ROLES.COMPTABLE, ROLES.COMMERCIAL, ROLES.SERVICE_CLIENT, ROLES.OPERATIONS],
  VIEW_SOUSCRIPTIONS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.CHEF_EQUIPE, ROLES.COMMERCIAL, ROLES.SERVICE_CLIENT],
  VIEW_PLANTATIONS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.CHEF_EQUIPE, ROLES.COMMERCIAL, ROLES.OPERATIONS],
  VIEW_PAIEMENTS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.COMPTABLE, ROLES.SERVICE_CLIENT],
  VIEW_COMMISSIONS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.COMPTABLE],
  VIEW_PORTEFEUILLES: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.COMPTABLE],
  VIEW_RAPPORTS_TECHNIQUES: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.OPERATIONS],
  VIEW_RAPPORTS_FINANCIERS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.COMPTABLE],
  VIEW_TICKETS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.RESPONSABLE_ZONE, ROLES.SERVICE_CLIENT, ROLES.OPERATIONS],
  VIEW_PARAMETRES: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC],

  // Actions
  MANAGE_USERS: [ROLES.SUPER_ADMIN],
  MANAGE_TEAMS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC],
  MANAGE_OFFERS: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC],
  MANAGE_GEO: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC],
  MANAGE_ROLES: [ROLES.SUPER_ADMIN],
  MANAGE_SYSTEM: [ROLES.SUPER_ADMIN],
  VALIDATE_PAYMENTS: [ROLES.SUPER_ADMIN, ROLES.COMPTABLE, ROLES.SERVICE_CLIENT],
  CREATE_SOUSCRIPTION: [ROLES.SUPER_ADMIN, ROLES.DIRECTEUR_TC, ROLES.COMMERCIAL],
  DELETE_DATA: [ROLES.SUPER_ADMIN],
} as const;

/**
 * Check if any of the user's roles has the required permission
 */
export function hasPermission(userRoles: string[], permission: readonly string[]): boolean {
  return userRoles.some(role => permission.includes(role));
}
