import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Eye, Edit2, Trash2, Hammer, Calendar, 
  DollarSign, FileText, AlertTriangle, UserCheck, HardHat, TrendingUp,
  Upload
} from 'lucide-react';
import { Card, Button, Input, Table, Badge, Modal, EmptyState, Select, customConfirm, TableSkeleton } from '../components/ui';
import { fetchWithRetry } from '../utils/api';

// Validation Schema
const chantierSchema = z.object({
  titre: z.string().min(5, "Le titre doit faire au moins 5 caractères"),
  bienId: z.string().min(1, "Le bien associé est requis"),
  budget: z.coerce.number().min(1, "Le budget doit être supérieur à 0"),
  dateDebut: z.string().min(10, "Date de début requise"),
  dateFin: z.string().min(10, "Date de fin requise"),
  statut: z.enum(['planifié', 'en_cours', 'terminé', 'suspendu']),
  avancement: z.coerce.number().min(0).max(100, "L'avancement doit être entre 0 et 100"),
});

type ChantierFormValues = z.infer<typeof chantierSchema>;

interface Prestataire {
  nom: string;
  specialite: string;
  contact: string;
  montant: number;
}

interface Chantier {
  id: string;
  bienId: string;
  bienAdresse?: string;
  titre: string;
  budget: number;
  avancement: number;
  statut: 'planifié' | 'en_cours' | 'terminé' | 'suspendu';
  dateDebut: string;
  dateFin: string;
  prestataires: Prestataire[];
}

export const Construction: React.FC = () => {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [biens, setBiens] = useState<{ id: string; adresse: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChantier, setEditingChantier] = useState<Chantier | null>(null);
  const [viewingChantier, setViewingChantier] = useState<Chantier | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ChantierFormValues>({
    resolver: zodResolver(chantierSchema)
  });

  // Load Chantiers & Properties
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load properties for link select
      const biensRes = await fetchWithRetry('/api/biens');
      if (biensRes.ok) {
        const biensData = await biensRes.json();
        setBiens(biensData || []);
      }

      // Load construction projects
      const response = await fetchWithRetry('/api/chantiers');
      if (response.ok) {
        const result = await response.json();
        setChantiers(result || []);
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn("Using offline mode for Construction.");
      // Fallback local list
      setBiens([
        { id: 'bien-1', adresse: 'Almadies, Face Clinique des Grès' },
        { id: 'bien-2', adresse: 'Mermoz, Rue MZ-102' },
        { id: 'bien-4', adresse: 'Ngor, Virage Est' },
        { id: 'bien-5', adresse: 'Lac Rose, Secteur 3' }
      ]);
      setChantiers([
        {
          id: 'chan-1',
          bienId: 'bien-4',
          bienAdresse: 'Ngor, Virage Est',
          titre: 'Rénovation Complète Plomberie et Peinture',
          budget: 4500000,
          avancement: 65,
          statut: 'en_cours',
          dateDebut: '2026-05-10',
          dateFin: '2026-07-15',
          prestataires: [
            { nom: 'ETS Bati-Pro', specialite: 'Peinture & Enduits', contact: '+221 77 600 11 22', montant: 3000000 },
            { nom: 'Sene-Plomberie', specialite: 'Plomberie sanitaire', contact: '+221 78 500 44 88', montant: 1800000 } // Total: 4.8M vs budget 4.5M (overrun!)
          ]
        },
        {
          id: 'chan-2',
          bienId: 'bien-5',
          bienAdresse: 'Lac Rose, Secteur 3',
          titre: 'Clôture du terrain Lac Rose',
          budget: 2000000,
          avancement: 100,
          statut: 'terminé',
          dateDebut: '2026-02-01',
          dateFin: '2026-03-05',
          prestataires: [
            { nom: 'Maçonnerie du Rail', specialite: 'Clôture & Maçonnerie', contact: '+221 76 999 88 77', montant: 2000000 }
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Submit Create
  const onCreateSubmit = async (data: ChantierFormValues) => {
    try {
      const response = await fetchWithRetry('/api/chantiers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setIsCreateOpen(false);
        reset();
        loadData();
      } else {
        throw new Error();
      }
    } catch (e) {
      // Offline fallback
      const targetBien = biens.find(b => b.id === data.bienId);
      const newChan: Chantier = {
        id: 'chan-' + (chantiers.length + 1),
        ...data,
        bienAdresse: targetBien ? targetBien.adresse : 'Inconnu',
        prestataires: []
      };
      setChantiers([...chantiers, newChan]);
      setIsCreateOpen(false);
      reset();
    }
  };

  // Setup Edit
  const handleEditClick = (c: Chantier) => {
    setEditingChantier(c);
    setValue('titre', c.titre);
    setValue('bienId', c.bienId);
    setValue('budget', c.budget);
    setValue('dateDebut', c.dateDebut.split('T')[0]);
    setValue('dateFin', c.dateFin.split('T')[0]);
    setValue('statut', c.statut);
    setValue('avancement', c.avancement);
  };

  // Submit Edit
  const onEditSubmit = async (data: ChantierFormValues) => {
    if (!editingChantier) return;
    try {
      const response = await fetchWithRetry(`/api/chantiers/${editingChantier.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setEditingChantier(null);
        reset();
        loadData();
      } else {
        throw new Error();
      }
    } catch (e) {
      // Offline edit
      const targetBien = biens.find(b => b.id === data.bienId);
      setChantiers(chantiers.map(c => c.id === editingChantier.id ? { 
        ...c, 
        ...data,
        bienAdresse: targetBien ? targetBien.adresse : 'Inconnu'
      } : c));
      setEditingChantier(null);
      reset();
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!await customConfirm("Voulez-vous supprimer ce suivi de chantier ?")) return;
    try {
      const response = await fetchWithRetry(`/api/chantiers/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadData();
      } else {
        const err = await response.json();
        alert(err.error || "Erreur lors de la suppression du chantier.");
      }
    } catch (e) {
      alert("Erreur réseau. Impossible de supprimer le chantier.");
    }
  };

  const formatFCFA = (val: number) => {
    return val.toLocaleString('fr-FR') + ' FCFA';
  };

  const getStatutBadge = (status: string) => {
    switch (status) {
      case 'planifié': return <Badge variant="neutral">Planifié</Badge>;
      case 'en_cours': return <Badge variant="warning">En Cours</Badge>;
      case 'terminé': return <Badge variant="success">Terminé</Badge>;
      case 'suspendu': return <Badge variant="danger">Suspendu</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Calculate cumulative costs and budget checks
  const getContractorsTotal = (p: Prestataire[]) => p.reduce((sum, item) => sum + item.montant, 0);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Suivi des Chantiers
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Suivez l'avancement des travaux de rénovation et contrôlez vos budgets.
          </p>
        </div>
        <div>
          <Button onClick={() => { reset(); setIsCreateOpen(true); }} className="flex items-center gap-2">
            <Plus size={18} />
            Lancer un Chantier
          </Button>
        </div>
      </div>

      {/* CHANTIERS DASHBOARD / TABLE */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : chantiers.length === 0 ? (
        <EmptyState
          title="Aucun chantier en cours"
          description="Planifiez des travaux pour rénover, valoriser ou entretenir vos biens immobiliers."
          ctaText="Créer un chantier"
          onCtaClick={() => setIsCreateOpen(true)}
        />
      ) : (
        <Table headers={['Chantier & Bien', 'Budget', 'Prestataires', 'Avancement', 'Statut', 'Actions']}>
          {chantiers.map((c) => {
            const sumPrestataires = getContractorsTotal(c.prestataires);
            const isOverrun = sumPrestataires > c.budget;
            return (
              <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="px-5 py-4">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{c.titre}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Bien : {c.bienAdresse}</span>
                </td>
                <td className="px-5 py-4 text-sm font-semibold">
                  <span className="text-slate-900 dark:text-white block">{formatFCFA(c.budget)}</span>
                  {isOverrun && (
                    <span className="text-3xs text-danger-500 font-bold flex items-center gap-0.5 mt-0.5">
                      <AlertTriangle size={10} /> Dépassement (+{Math.round(((sumPrestataires - c.budget) / c.budget) * 100)}%)
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                  <Badge variant="neutral">{c.prestataires.length} assignés</Badge>
                </td>
                <td className="px-5 py-4 text-sm">
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary-500 h-full rounded-full" style={{ width: `${c.avancement}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.avancement}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm">
                  {getStatutBadge(c.statut)}
                </td>
                <td className="px-5 py-4 text-sm flex items-center gap-2">
                  <button
                    onClick={() => setViewingChantier(c)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg"
                    title="Voir les prestataires"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleEditClick(c)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-500 rounded-lg"
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-danger-500 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Lancer un Projet de Rénovation">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <Input label="Titre des travaux" error={errors.titre?.message} {...register('titre')} />
          <Select 
            label="Bien immobilier concerné"
            options={biens.map(b => ({ value: b.id, label: b.adresse }))}
            error={errors.bienId?.message}
            {...register('bienId')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Budget prévisionnel (FCFA)" type="number" error={errors.budget?.message} {...register('budget')} />
            <Select 
              label="Statut initial"
              options={[
                { value: 'planifié', label: 'Planifié' },
                { value: 'en_cours', label: 'En Cours' },
                { value: 'terminé', label: 'Terminé' },
                { value: 'suspendu', label: 'Suspendu' }
              ]}
              error={errors.statut?.message}
              {...register('statut')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date Début Prévue" type="date" error={errors.dateDebut?.message} {...register('dateDebut')} />
            <Input label="Date Fin Estimée" type="date" error={errors.dateFin?.message} {...register('dateFin')} />
          </div>
          <Input label="Avancement actuel (%)" type="number" error={errors.avancement?.message} {...register('avancement')} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={editingChantier !== null} onClose={() => setEditingChantier(null)} title="Modifier le Projet">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <Input label="Titre" error={errors.titre?.message} {...register('titre')} />
          <Select 
            label="Bien"
            options={biens.map(b => ({ value: b.id, label: b.adresse }))}
            error={errors.bienId?.message}
            {...register('bienId')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Budget (FCFA)" type="number" error={errors.budget?.message} {...register('budget')} />
            <Select 
              label="Statut"
              options={[
                { value: 'planifié', label: 'Planifié' },
                { value: 'en_cours', label: 'En Cours' },
                { value: 'terminé', label: 'Terminé' },
                { value: 'suspendu', label: 'Suspendu' }
              ]}
              error={errors.statut?.message}
              {...register('statut')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date Début" type="date" error={errors.dateDebut?.message} {...register('dateDebut')} />
            <Input label="Date Fin" type="date" error={errors.dateFin?.message} {...register('dateFin')} />
          </div>
          <Input label="Avancement (%)" type="number" error={errors.avancement?.message} {...register('avancement')} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setEditingChantier(null)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* VIEW PANEL / PRESTATAIRES LIST */}
      <Modal isOpen={viewingChantier !== null} onClose={() => setViewingChantier(null)} title="Suivi Prestataires de Chantier">
        {viewingChantier && (
          <div className="space-y-6">
            
            {/* Header info */}
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {viewingChantier.titre}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Bien associé : {viewingChantier.bienAdresse}
              </p>
            </div>

            {/* Budget Box */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Budget Alloué</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-white">{formatFCFA(viewingChantier.budget)}</span>
              </div>
              <div>
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Coût Devis Engagé</span>
                <span className={`text-base font-extrabold block ${
                  getContractorsTotal(viewingChantier.prestataires) > viewingChantier.budget ? 'text-danger-500' : 'text-success-500'
                }`}>
                  {formatFCFA(getContractorsTotal(viewingChantier.prestataires))}
                </span>
              </div>
            </div>

            {/* Alert if overrun */}
            {getContractorsTotal(viewingChantier.prestataires) > viewingChantier.budget && (
              <div className="p-3 bg-danger-50 border border-danger-100 dark:bg-danger-950/20 dark:border-danger-900/30 text-danger-600 dark:text-danger-400 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>Attention : Le coût cumulé des prestataires dépasse le budget initial alloué !</span>
              </div>
            )}

            {/* Contractors details */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <HardHat size={14} /> Liste des Artisans / Prestataires
              </h4>
              {viewingChantier.prestataires && viewingChantier.prestataires.length > 0 ? (
                <div className="space-y-3">
                  {viewingChantier.prestataires.map((p, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">{p.nom}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 block">{p.specialite} ({p.contact})</span>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {formatFCFA(p.montant)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200/50">
                  Aucun prestataire assigné à ce chantier pour le moment.
                </p>
              )}
            </div>

            {/* Documents section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText size={14} /> Factures & Devis téléversés
              </h4>
              <p className="text-2xs text-slate-400 dark:text-slate-500">
                Gérez vos documents liés aux travaux directement.
              </p>
              <Button size="sm" variant="secondary" className="mt-3 text-xs flex items-center gap-1" onClick={() => alert("Simulation upload devis PDF réussie !")}>
                <Upload size={12} /> Téléverser un Devis/Facture (PDF)
              </Button>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => setViewingChantier(null)}>Fermer</Button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};
export default Construction;
