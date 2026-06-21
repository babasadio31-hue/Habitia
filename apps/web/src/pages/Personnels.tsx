import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Eye, Edit2, Trash2, Calendar, 
  Phone, Mail, Briefcase, Award, Clock, AlertCircle, Check, X
} from 'lucide-react';
import { Card, Button, Input, Table, Badge, Modal, EmptyState, Select, customConfirm, TableSkeleton } from '../components/ui';
import { fetchWithRetry } from '../utils/api';

// Validation Schema
const staffSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  poste: z.string().min(2, "Le poste doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  telephone: z.string().min(8, "Numéro de téléphone invalide"),
  salaire: z.coerce.number().min(100, "Le salaire doit être supérieur"),
  dateEmbauche: z.string().min(10, "La date d'embauche est requise"),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface Absence {
  id: string;
  dateDebut: string;
  dateFin: string;
  motif: string;
  statut: 'en_attente' | 'validé' | 'refusé';
}

interface Staff {
  id: string;
  nom: string;
  poste: string;
  email: string;
  telephone: string;
  salaire: number;
  dateEmbauche: string;
  biensAssignes: string[];
  absences?: Absence[];
  planning?: Record<string, string>;
  permissions?: any;
}

const pagesList = [
  { name: 'Tableau de bord', path: '/dashboard' },
  { name: 'Propriétaires', path: '/proprietaires' },
  { name: 'Locataires', path: '/locataires' },
  { name: 'Biens immobiliers', path: '/biens' },
  { name: 'Construction', path: '/construction' },
  { name: 'Comptabilité', path: '/comptabilite' },
  { name: 'Personnels', path: '/personnels' },
  { name: 'Paramètres', path: '/parametres' },
];

const comptaTabsList = [
  { id: 'dashboard', name: 'Tableau de bord' },
  { id: 'revenus', name: 'Entrées / Revenus' },
  { id: 'depenses', name: 'Dépenses' },
  { id: 'commissions', name: 'Commissions' },
  { id: 'tresorerie', name: 'Trésorerie' },
  { id: 'creances', name: 'Créances & Dûs' },
  { id: 'rapports', name: 'Rapports & Exports' },
];

const proprietairesTabsList = [
  { id: 'info', name: 'Informations' },
  { id: 'biens', name: 'Biens possédés' },
  { id: 'locataires', name: 'Locataires logés' },
  { id: 'retrait', name: 'Retrait de Loyer' },
  { id: 'fonds', name: 'Bilan Financier' },
];

const parametresTabsList = [
  { id: 'profile', name: 'Profil Entreprise' },
  { id: 'users', name: 'Utilisateurs & Rôles' },
  { id: 'emails', name: 'Modèles de Mails' },
  { id: 'notifications', name: 'Alertes' },
  { id: 'db', name: 'Sauvegarde' },
];

export const Personnels: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);

  // Leave Form
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveMotif, setLeaveMotif] = useState('');

  // Permissions state
  const [selectedPages, setSelectedPages] = useState<string[]>(['/dashboard', '/proprietaires', '/locataires', '/biens', '/construction', '/comptabilite', '/personnels']);
  const [selectedComptaTabs, setSelectedComptaTabs] = useState<string[]>(['dashboard', 'revenus', 'depenses', 'commissions', 'tresorerie', 'creances', 'rapports']);
  const [selectedProprietairesTabs, setSelectedProprietairesTabs] = useState<string[]>(['info', 'biens', 'locataires', 'retrait', 'fonds']);
  const [selectedParametresTabs, setSelectedParametresTabs] = useState<string[]>(['profile', 'users', 'emails', 'notifications', 'db']);

  const handlePageToggle = (path: string) => {
    if (selectedPages.includes(path)) {
      setSelectedPages(selectedPages.filter(p => p !== path));
    } else {
      setSelectedPages([...selectedPages, path]);
    }
  };

  const handleComptaTabToggle = (id: string) => {
    if (selectedComptaTabs.includes(id)) {
      setSelectedComptaTabs(selectedComptaTabs.filter(t => t !== id));
    } else {
      setSelectedComptaTabs([...selectedComptaTabs, id]);
    }
  };

  const handleProprietairesTabToggle = (id: string) => {
    if (selectedProprietairesTabs.includes(id)) {
      setSelectedProprietairesTabs(selectedProprietairesTabs.filter(t => t !== id));
    } else {
      setSelectedProprietairesTabs([...selectedProprietairesTabs, id]);
    }
  };

  const handleParametresTabToggle = (id: string) => {
    if (selectedParametresTabs.includes(id)) {
      setSelectedParametresTabs(selectedParametresTabs.filter(t => t !== id));
    } else {
      setSelectedParametresTabs([...selectedParametresTabs, id]);
    }
  };

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema)
  });

  // Load Staff
  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithRetry('/api/personnels');
      if (response.ok) {
        setStaffList(await response.json());
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn("Using offline mode for Personnels.");
      // Fallback
      setStaffList([
        {
          id: 'pers-1',
          nom: 'Goudiaby Lamine',
          poste: 'Gestionnaire de Biens',
          email: 'goudiaby@habitia.com',
          telephone: '+221 77 412 33 22',
          salaire: 450000,
          dateEmbauche: '2024-01-15',
          biensAssignes: ['Villa Almadies', 'Appartement Mermoz', 'Bureau Plateau'],
          absences: [
            { id: 'abs-1', dateDebut: '2026-08-10', dateFin: '2026-08-24', motif: 'Congés Annuels', statut: 'validé' },
            { id: 'abs-2', dateDebut: '2026-06-25', dateFin: '2026-06-28', motif: 'Urgence Familiale', statut: 'en_attente' }
          ],
          planning: {
            'Lundi': '08:00 - 17:00',
            'Mardi': '08:00 - 17:00',
            'Mercredi': '08:00 - 17:00',
            'Jeudi': '08:00 - 17:00',
            'Vendredi': '08:00 - 16:00',
            'Samedi': 'Repos',
            'Dimanche': 'Repos'
          }
        },
        {
          id: 'pers-2',
          nom: 'Diallo Oumar',
          poste: 'Technicien de Maintenance',
          email: 'diallo.maint@habitia.com',
          telephone: '+221 78 555 66 77',
          salaire: 350000,
          dateEmbauche: '2025-06-01',
          biensAssignes: ['Chantier Ngor', 'Terrain Lac Rose'],
          absences: [],
          planning: {
            'Lundi': '08:30 - 17:30',
            'Mardi': '08:30 - 17:30',
            'Mercredi': '08:30 - 17:30',
            'Jeudi': '08:30 - 17:30',
            'Vendredi': '08:30 - 17:30',
            'Samedi': '09:00 - 13:00',
            'Dimanche': 'Repos'
          }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Submit Create
  const onCreateSubmit = async (data: StaffFormValues) => {
    const payload = {
      ...data,
      permissions: {
        pages: selectedPages,
        tabs: { 
          comptabilite: selectedComptaTabs,
          proprietaires: selectedProprietairesTabs,
          parametres: selectedParametresTabs
        }
      }
    };
    try {
      const response = await fetchWithRetry('/api/personnels', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setIsCreateOpen(false);
        reset();
        loadStaff();
      } else {
        throw new Error();
      }
    } catch (e) {
      // Offline fallback
      const newS: Staff = {
        id: 'pers-' + (staffList.length + 1),
        ...data,
        permissions: payload.permissions,
        biensAssignes: [],
        absences: [],
        planning: {
          'Lundi': '09:00 - 17:00', 'Mardi': '09:00 - 17:00', 'Mercredi': '09:00 - 17:00',
          'Jeudi': '09:00 - 17:00', 'Vendredi': '09:00 - 17:00', 'Samedi': 'Repos', 'Dimanche': 'Repos'
        }
      };
      setStaffList([...staffList, newS]);
      setIsCreateOpen(false);
      reset();
    }
  };

  // Setup Edit
  const handleEditClick = (s: Staff) => {
    setEditingStaff(s);
    setValue('nom', s.nom);
    setValue('poste', s.poste);
    setValue('email', s.email);
    setValue('telephone', s.telephone);
    setValue('salaire', s.salaire);
    setValue('dateEmbauche', s.dateEmbauche);
    
    // Initialize permissions selection
    const perms = s.permissions || {
      pages: ['/dashboard', '/proprietaires', '/locataires', '/biens', '/construction', '/comptabilite', '/personnels'],
      tabs: { 
        comptabilite: ['dashboard', 'revenus', 'depenses', 'commissions', 'tresorerie', 'creances', 'rapports'],
        proprietaires: ['info', 'biens', 'locataires', 'retrait', 'fonds'],
        parametres: ['profile', 'users', 'emails', 'notifications', 'db']
      }
    };
    setSelectedPages(perms.pages || []);
    setSelectedComptaTabs(perms.tabs?.comptabilite || []);
    setSelectedProprietairesTabs(perms.tabs?.proprietaires || []);
    setSelectedParametresTabs(perms.tabs?.parametres || []);
  };

  // Submit Edit
  const onEditSubmit = async (data: StaffFormValues) => {
    if (!editingStaff) return;
    const payload = {
      ...data,
      permissions: {
        pages: selectedPages,
        tabs: { 
          comptabilite: selectedComptaTabs,
          proprietaires: selectedProprietairesTabs,
          parametres: selectedParametresTabs
        }
      }
    };
    try {
      const response = await fetchWithRetry(`/api/personnels/${editingStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setEditingStaff(null);
        reset();
        loadStaff();
      } else {
        throw new Error();
      }
    } catch (e) {
      setStaffList(staffList.map(s => s.id === editingStaff.id ? { ...s, ...data, permissions: payload.permissions } : s));
      setEditingStaff(null);
      reset();
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!await customConfirm("Voulez-vous supprimer cet employé ?")) return;
    try {
      const response = await fetchWithRetry(`/api/personnels/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadStaff();
      } else {
        const err = await response.json();
        alert(err.error || "Erreur lors de la suppression du personnel.");
      }
    } catch (e) {
      alert("Erreur réseau. Impossible de supprimer le personnel.");
    }
  };

  // Request absence/leave local mock
  const handleRequestLeave = async (staffId: string) => {
    if (!leaveStart || !leaveEnd || !leaveMotif) {
      alert("Voulez-vous remplir tous les champs de congé ?");
      return;
    }
    
    try {
      const response = await fetchWithRetry(`/api/personnels/${staffId}/absences`, {
        method: 'POST',
        body: JSON.stringify({ dateDebut: leaveStart, dateFin: leaveEnd, motif: leaveMotif })
      });
      if (response.ok) {
        alert("Demande de congé enregistrée !");
        setLeaveStart(''); setLeaveEnd(''); setLeaveMotif('');
        loadStaff();
        setViewingStaff(null);
      } else {
        throw new Error();
      }
    } catch (e) {
      // Offline fallback
      const updatedList = staffList.map(s => {
        if (s.id === staffId) {
          const newAbs: Absence = {
            id: 'abs-' + ((s.absences?.length || 0) + 1),
            dateDebut: leaveStart,
            dateFin: leaveEnd,
            motif: leaveMotif,
            statut: 'en_attente'
          };
          return {
            ...s,
            absences: [...(s.absences || []), newAbs]
          };
        }
        return s;
      });
      setStaffList(updatedList);
      alert("Demande de congé soumise en mode démo !");
      setLeaveStart(''); setLeaveEnd(''); setLeaveMotif('');
      setViewingStaff(null);
    }
  };

  // Validate Leave local mock
  const handleValidateLeave = async (staffId: string, absId: string, isApproved: boolean) => {
    const status = isApproved ? 'validé' : 'refusé';
    try {
      const response = await fetchWithRetry(`/api/personnels/${staffId}/absences/${absId}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: status })
      });
      if (response.ok) {
        loadStaff();
        setViewingStaff(null);
      } else {
        throw new Error();
      }
    } catch (e) {
      // Offline
      setStaffList(staffList.map(s => {
        if (s.id === staffId && s.absences) {
          return {
            ...s,
            absences: s.absences.map(a => a.id === absId ? { ...a, statut: status } : a)
          };
        }
        return s;
      }));
      setViewingStaff(null);
    }
  };

  const getAbsenceBadge = (status: string) => {
    switch (status) {
      case 'validé': return <Badge variant="success">Validé</Badge>;
      case 'refusé': return <Badge variant="danger">Refusé</Badge>;
      case 'en_attente': return <Badge variant="warning">En attente</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Ressources Humaines & Plannings
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Administrez vos agents commerciaux, techniciens de maintenance et congés.
          </p>
        </div>
        <div>
          <Button onClick={() => { 
            reset(); 
            setSelectedPages(['/dashboard', '/proprietaires', '/locataires', '/biens', '/construction', '/comptabilite', '/personnels']);
            setSelectedComptaTabs(['dashboard', 'revenus', 'depenses', 'commissions', 'tresorerie', 'creances', 'rapports']);
            setSelectedProprietairesTabs(['info', 'biens', 'locataires', 'retrait', 'fonds']);
            setSelectedParametresTabs(['profile', 'users', 'emails', 'notifications', 'db']);
            setIsCreateOpen(true); 
          }} className="flex items-center gap-2">
            <Plus size={18} />
            Embaucher un Personnel
          </Button>
        </div>
      </div>

      {/* STAFF LIST TABLE */}
      {isLoading ? (
        <TableSkeleton rows={4} cols={6} />
      ) : staffList.length === 0 ? (
        <EmptyState
          title="Aucun personnel embauché"
          description="Créez des fiches pour vos collaborateurs pour leur assigner des biens à gérer."
          ctaText="Créer un employé"
          onCtaClick={() => setIsCreateOpen(true)}
        />
      ) : (
        <Table headers={['Employé', 'Poste / Rôle', 'Téléphone', 'Salaire (Mensuel)', 'Biens Assignés', 'Actions']}>
          {staffList.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                {s.nom}
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 capitalize">
                {s.poste}
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                {s.telephone}
              </td>
              <td className="px-5 py-4 text-sm font-extrabold text-slate-900 dark:text-white">
                {s.salaire.toLocaleString('fr-FR')} FCFA
              </td>
              <td className="px-5 py-4 text-sm">
                <Badge variant="primary">{s.biensAssignes.length} biens</Badge>
              </td>
              <td className="px-5 py-4 text-sm flex items-center gap-2">
                <button
                  onClick={() => setViewingStaff(s)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg"
                  title="Fiche & Planning"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleEditClick(s)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-500 rounded-lg"
                  title="Modifier"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-danger-500 rounded-lg"
                  title="Licencier / Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Créer une Fiche Personnel">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <Input label="Nom Complet" error={errors.nom?.message} {...register('nom')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Poste / Titre" error={errors.poste?.message} {...register('poste')} />
            <Input label="Email professionnel" type="email" error={errors.email?.message} {...register('email')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Téléphone" error={errors.telephone?.message} {...register('telephone')} />
            <Input label="Salaire de base (FCFA/mois)" type="number" error={errors.salaire?.message} {...register('salaire')} />
          </div>
          <Input label="Date d'embauche" type="date" error={errors.dateEmbauche?.message} {...register('dateEmbauche')} />

          {/* Permissions section */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Accès aux Pages / Modules de l'Application
            </h4>
            <div className="grid grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              {pagesList.map(p => (
                <label key={p.path} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(p.path)}
                    onChange={() => handlePageToggle(p.path)}
                    className="rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          {selectedPages.includes('/comptabilite') && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Onglets autorisés dans Comptabilité
              </h4>
              <div className="grid grid-cols-2 gap-2 bg-emerald-50/20 dark:bg-emerald-950/5 p-3 rounded-lg border border-emerald-100/50 dark:border-emerald-900/20">
                {comptaTabsList.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedComptaTabs.includes(t.id)}
                      onChange={() => handleComptaTabToggle(t.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedPages.includes('/proprietaires') && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Onglets autorisés dans Propriétaires
              </h4>
              <div className="grid grid-cols-2 gap-2 bg-indigo-50/20 dark:bg-indigo-950/5 p-3 rounded-lg border border-indigo-100/50 dark:border-indigo-900/20">
                {proprietairesTabsList.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedProprietairesTabs.includes(t.id)}
                      onChange={() => handleProprietairesTabToggle(t.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedPages.includes('/parametres') && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Onglets autorisés dans Paramètres
              </h4>
              <div className="grid grid-cols-2 gap-2 bg-slate-100/40 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                {parametresTabsList.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedParametresTabs.includes(t.id)}
                      onChange={() => handleParametresTabToggle(t.id)}
                      className="rounded text-slate-600 focus:ring-slate-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={editingStaff !== null} onClose={() => setEditingStaff(null)} title="Modifier la Fiche">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <Input label="Nom" error={errors.nom?.message} {...register('nom')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Poste" error={errors.poste?.message} {...register('poste')} />
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Téléphone" error={errors.telephone?.message} {...register('telephone')} />
            <Input label="Salaire (FCFA)" type="number" error={errors.salaire?.message} {...register('salaire')} />
          </div>
          <Input label="Date d'embauche" type="date" error={errors.dateEmbauche?.message} {...register('dateEmbauche')} />

          {/* Permissions section */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Accès aux Pages / Modules de l'Application
            </h4>
            <div className="grid grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              {pagesList.map(p => (
                <label key={p.path} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(p.path)}
                    onChange={() => handlePageToggle(p.path)}
                    className="rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          {selectedPages.includes('/comptabilite') && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Onglets autorisés dans Comptabilité
              </h4>
              <div className="grid grid-cols-2 gap-2 bg-emerald-50/20 dark:bg-emerald-950/5 p-3 rounded-lg border border-emerald-100/50 dark:border-emerald-900/20">
                {comptaTabsList.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedComptaTabs.includes(t.id)}
                      onChange={() => handleComptaTabToggle(t.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedPages.includes('/proprietaires') && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Onglets autorisés dans Propriétaires
              </h4>
              <div className="grid grid-cols-2 gap-2 bg-indigo-50/20 dark:bg-indigo-950/5 p-3 rounded-lg border border-indigo-100/50 dark:border-indigo-900/20">
                {proprietairesTabsList.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedProprietairesTabs.includes(t.id)}
                      onChange={() => handleProprietairesTabToggle(t.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedPages.includes('/parametres') && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Onglets autorisés dans Paramètres
              </h4>
              <div className="grid grid-cols-2 gap-2 bg-slate-100/40 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                {parametresTabsList.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedParametresTabs.includes(t.id)}
                      onChange={() => handleParametresTabToggle(t.id)}
                      className="rounded text-slate-600 focus:ring-slate-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setEditingStaff(null)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL VIEW: PLANNINGS & ABSENCES */}
      <Modal isOpen={viewingStaff !== null} onClose={() => setViewingStaff(null)} title="Planning & Absences Employé">
        {viewingStaff && (
          <div className="space-y-6">
            
            {/* Planning hebdomadaire 7 jours */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock size={14} /> Planning Hebdomadaire Simple (7 Jours)
              </h4>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => {
                  const hours = viewingStaff.planning ? viewingStaff.planning[day] : 'Repos';
                  return (
                    <div key={day} className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                      <span className="text-3xs font-bold text-slate-400 block mb-1">{day.substring(0,3)}</span>
                      <span className="text-3xs font-extrabold text-slate-700 dark:text-slate-300 block leading-tight">{hours}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Congés & absences validation area */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                Suivi des demandes d'absence
              </h4>
              {viewingStaff.absences && viewingStaff.absences.length > 0 ? (
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {viewingStaff.absences.map((a) => (
                    <div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">{a.motif}</span>
                        <span className="text-3xs text-slate-400">Du {a.dateDebut} au {a.dateFin}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getAbsenceBadge(a.statut)}
                        {a.statut === 'en_attente' && (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleValidateLeave(viewingStaff.id, a.id, true)} 
                              className="p-1 bg-success-50 hover:bg-success-100 dark:bg-success-950/20 text-success-500 rounded-lg"
                              title="Valider"
                            >
                              <Check size={12} />
                            </button>
                            <button 
                              onClick={() => handleValidateLeave(viewingStaff.id, a.id, false)} 
                              className="p-1 bg-danger-50 hover:bg-danger-100 dark:bg-danger-950/20 text-danger-500 rounded-lg"
                              title="Refuser"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed">Aucune absence enregistrée.</p>
              )}
            </div>

            {/* Demander un congé (Form) */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Déposer une nouvelle demande d'absence
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="date" 
                  value={leaveStart} 
                  onChange={(e) => setLeaveStart(e.target.value)} 
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg" 
                  placeholder="Date début"
                />
                <input 
                  type="date" 
                  value={leaveEnd} 
                  onChange={(e) => setLeaveEnd(e.target.value)} 
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg" 
                  placeholder="Date fin"
                />
              </div>
              <input 
                type="text" 
                value={leaveMotif} 
                onChange={(e) => setLeaveMotif(e.target.value)} 
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg" 
                placeholder="Motif de l'absence..."
              />
              <Button size="sm" className="w-full text-xs h-9" onClick={() => handleRequestLeave(viewingStaff.id)}>
                Soumettre la demande
              </Button>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => setViewingStaff(null)}>Fermer</Button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};
export default Personnels;
