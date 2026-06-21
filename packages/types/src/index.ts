export type UserRole = 'admin' | 'agent' | 'comptable' | 'lecture_seule';

export interface UserPermissions {
  pages: string[];
  tabs: {
    comptabilite?: string[];
    proprietaires?: string[];
    parametres?: string[];
  };
}

export interface User {
  id: string;
  nom: string;
  email: string;
  role: UserRole;
  actif: boolean;
  permissions?: UserPermissions;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  nom: string;
  url: string;
  type: string; // e.g. 'pdf', 'image'
  entiteType: 'proprietaire' | 'locataire' | 'bien' | 'chantier';
  entiteId: string;
  createdAt?: string;
}

export interface Proprietaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  cinPasseport?: string;
  documents?: Document[];
  biens?: Bien[];
  retraits?: Retrait[];
  createdAt?: string;
}

export interface Locataire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  employeur?: string;
  garant?: string;
  statut: 'actif' | 'ancien' | 'liste_attente';
  documents?: Document[];
  contrats?: Contrat[];
  createdAt?: string;
}

export interface Bien {
  id: string;
  adresse: string;
  ville: string;
  type: 'appartement' | 'villa' | 'bureau' | 'terrain' | 'magasin';
  surface: number;
  etage?: number;
  nbPieces?: number;
  statut: 'disponible' | 'loué' | 'en_travaux' | 'en_vente';
  proprietaireId: string;
  proprietaire?: Proprietaire;
  loyer?: number;
  caution?: number;
  photos: string[]; // URLs or local paths
  charges: string[]; // JSON list or description of charges
  contrats?: Contrat[];
  chantiers?: Chantier[];
  personnelsAssignes?: Personnel[];
  createdAt?: string;
}

export interface Contrat {
  id: string;
  bienId: string;
  bien?: Bien;
  locataireId: string;
  locataire?: Locataire;
  dateDebut: string;
  dateFin: string;
  montantLoyer: number;
  depot: number;
  paiements?: Paiement[];
  actif: boolean;
  createdAt?: string;
}

export interface Paiement {
  id: string;
  contratId: string;
  contrat?: Contrat;
  montant: number;
  datePaiement: string;
  statut: 'payé' | 'en_retard' | 'partiel';
  type: 'loyer' | 'charges' | 'caution';
  createdAt?: string;
}

export interface Prestataire {
  nom: string;
  specialite: string;
  contact: string;
  montant: number;
}

export interface Chantier {
  id: string;
  bienId: string;
  bien?: Bien;
  titre: string;
  budget: number;
  avancement: number; // 0 to 100
  statut: 'planifié' | 'en_cours' | 'terminé' | 'suspendu';
  dateDebut: string;
  dateFin: string;
  prestataires: Prestataire[];
  documents?: Document[];
  createdAt?: string;
}

export interface AbsenceConge {
  id: string;
  dateDebut: string;
  dateFin: string;
  motif: string;
  statut: 'en_attente' | 'validé' | 'refusé';
}

export interface Personnel {
  id: string;
  nom: string;
  poste: string;
  email: string;
  telephone: string;
  salaire: number;
  dateEmbauche: string;
  biensAssignes: string[]; // IDs of assigned biens
  absences?: AbsenceConge[];
  planning?: Record<string, string>; // e.g. { "Lundi": "9h-17h", ... }
  permissions?: UserPermissions;
  createdAt?: string;
}

export interface EnterpriseProfile {
  nom: string;
  logo: string;
  adresse: string;
  siret: string;
  telephone?: string;
  email?: string;
}

export interface MailModel {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface AppSettings {
  enterprise: EnterpriseProfile;
  mailModels: MailModel[];
  notifications: {
    alertLatePayment: boolean;
    alertContractExpiry: boolean;
    alertBudgetOverrun: boolean;
  };
}

export interface Retrait {
  id: string;
  montant: number;
  dateRetrait: string;
  motif: string;
  proprietaireId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Depense {
  id: string;
  categorie: string;
  description: string;
  montant: number;
  date: string;
  enregistrePar: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vente {
  id: string;
  bienId: string;
  bien?: Bien;
  clientNom: string;
  prixVente: number;
  commissionRate: number;
  dateVente: string;
  agentId?: string;
  agent?: Personnel;
  createdAt?: string;
  updatedAt?: string;
}

export interface RevenuManuel {
  id: string;
  type: 'frais_dossier' | 'honoraires_gestion' | 'autres';
  description: string;
  montant: number;
  date: string;
  clientNom?: string;
  createdAt?: string;
  updatedAt?: string;
}
