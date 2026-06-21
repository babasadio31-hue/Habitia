import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Search, Edit2, Trash2, Eye, ShoppingCart,
  MapPin, DollarSign, Home, Hammer, CheckCircle, Info, Landmark, Layers, HelpCircle
} from 'lucide-react';
import L from 'leaflet';
import { Card, Button, Input, Table, Badge, Modal, EmptyState, Select, customConfirm, TableSkeleton } from '../components/ui';
import { fetchWithRetry } from '../utils/api';
import { toast } from 'sonner';

// Schema Validation
const bienSchema = z.object({
  adresse: z.string().min(5, "L'adresse doit faire au moins 5 caractères"),
  ville: z.string().min(2, "La ville doit faire au moins 2 caractères"),
  type: z.enum(['appartement', 'villa', 'bureau', 'terrain', 'magasin']),
  surface: z.coerce.number().min(1, "La surface doit être positive"),
  etage: z.coerce.number().optional(),
  nbPieces: z.coerce.number().optional(),
  statut: z.enum(['disponible', 'loué', 'en_travaux', 'en_vente']),
  proprietaireId: z.string().min(1, "Le propriétaire est requis"),
  loyer: z.coerce.number().min(0).optional(),
  caution: z.coerce.number().min(0).optional(),
});

type BienFormValues = z.infer<typeof bienSchema>;

interface Bien {
  id: string;
  adresse: string;
  ville: string;
  type: 'appartement' | 'villa' | 'bureau' | 'terrain';
  surface: number;
  etage?: number;
  nbPieces?: number;
  statut: 'disponible' | 'loué' | 'en_travaux' | 'en_vente';
  proprietaireId: string;
  proprietaireName?: string;
  loyer?: number;
  caution?: number;
  photos: string[];
  charges: string[];
}

export const Biens: React.FC = () => {
  const [biens, setBiens] = useState<Bien[]>([]);
  const [owners, setOwners] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sale States
  const [sellingBien, setSellingBien] = useState<Bien | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [saleClient, setSaleClient] = useState('');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [saleComm, setSaleComm] = useState<number>(5);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleAgent, setSaleAgent] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBien, setEditingBien] = useState<Bien | null>(null);
  const [viewingBien, setViewingBien] = useState<Bien | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BienFormValues>({
    resolver: zodResolver(bienSchema)
  });

  // Load properties
  const loadBiens = async () => {
    setIsLoading(true);
    try {
      // Fetch owners first for dropdowns
      const ownersRes = await fetchWithRetry('/api/proprietaires');
      if (ownersRes.ok) {
        const ownerData = await ownersRes.json();
        setOwners(ownerData.data || []);
      }

      // Fetch agents
      const agentsRes = await fetchWithRetry('/api/personnels');
      if (agentsRes.ok) {
        setAgents(await agentsRes.json());
      }

      // Fetch biens
      let url = '/api/biens?';
      if (filterType) url += `type=${filterType}&`;
      if (filterStatut) url += `statut=${filterStatut}&`;

      const response = await fetchWithRetry(url);
      if (response.ok) {
        const result = await response.json();
        setBiens(result || []);
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error("Error loading properties or owners:", e);
      setBiens([]);
      setOwners([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBiens();
  }, [filterType, filterStatut]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (viewingBien) {
      // Small timeout to allow Modal animation to finish and container to layout
      const timer = setTimeout(() => {
        const container = document.getElementById('leaflet-map-container');
        if (container) {
          // Clean previous map
          if (mapRef.current) {
            mapRef.current.remove();
          }

          // Dakar GPS coords by default, adding small variations for demonstration
          const lat = 14.7167 + (Math.random() - 0.5) * 0.05;
          const lng = -17.4677 + (Math.random() - 0.5) * 0.05;

          const map = L.map('leaflet-map-container').setView([lat, lng], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          L.marker([lat, lng]).addTo(map)
            .bindPopup(`<b>${viewingBien.adresse}</b><br/>${viewingBien.ville}`)
            .openPopup();

          mapRef.current = map;
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }
  }, [viewingBien]);

  // Create Submit
  const onCreateSubmit = async (data: BienFormValues) => {
    try {
      const response = await fetchWithRetry('/api/biens', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setIsCreateOpen(false);
        reset();
        loadBiens();
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible d'ajouter le bien.");
    }
  };

  // Setup Edit
  const handleEditClick = (bien: Bien) => {
    setEditingBien(bien);
    setValue('adresse', bien.adresse);
    setValue('ville', bien.ville);
    setValue('type', bien.type);
    setValue('surface', bien.surface);
    setValue('etage', bien.etage || 0);
    setValue('nbPieces', bien.nbPieces || 0);
    setValue('statut', bien.statut);
    setValue('proprietaireId', bien.proprietaireId);
    setValue('loyer', bien.loyer || 0);
    setValue('caution', bien.caution || 0);
  };

  // Submit Edit
  const onEditSubmit = async (data: BienFormValues) => {
    if (!editingBien) return;
    try {
      const response = await fetchWithRetry(`/api/biens/${editingBien.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setEditingBien(null);
        reset();
        loadBiens();
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible de modifier le bien.");
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!await customConfirm("Voulez-vous vraiment supprimer ce bien ?")) return;
    try {
      const response = await fetchWithRetry(`/api/biens/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadBiens();
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible de supprimer le bien.");
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingBien) return;
    try {
      const response = await fetchWithRetry('/api/ventes', {
        method: 'POST',
        body: JSON.stringify({
          bienId: sellingBien.id,
          clientNom: saleClient,
          prixVente: salePrice,
          commissionRate: saleComm,
          dateVente: saleDate,
          agentId: saleAgent || null
        })
      });
      if (response.ok) {
        toast.success("Vente enregistrée avec succès !");
        setSellingBien(null);
        setSaleClient('');
        setSalePrice(0);
        setSaleAgent('');
        loadBiens();
      } else {
        const err = await response.json();
        alert(err.error || "Erreur lors de l'enregistrement de la vente.");
      }
    } catch (err) {
      alert("Erreur réseau.");
    }
  };

  const getStatutBadge = (status: string) => {
    switch (status) {
      case 'disponible': return <Badge variant="success">Disponible</Badge>;
      case 'loué': return <Badge variant="primary">Loué</Badge>;
      case 'en_travaux': return <Badge variant="warning">En travaux</Badge>;
      case 'en_vente': return <Badge variant="danger">En vente</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Biens Immobiliers
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Gérez vos appartements, villas, bureaux, et localisez-les sur carte.
          </p>
        </div>
        <div>
          <Button onClick={() => { reset(); setIsCreateOpen(true); }} className="flex items-center gap-2">
            <Plus size={18} />
            Ajouter un Bien
          </Button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <Card className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        <Select
          label="Filtrer par type de bien"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          options={[
            { value: '', label: 'Tous les types' },
            { value: 'appartement', label: 'Appartement' },
            { value: 'villa', label: 'Villa' },
            { value: 'bureau', label: 'Bureau' },
            { value: 'terrain', label: 'Terrain' },
            { value: 'magasin', label: 'Magasin' }
          ]}
        />
        <Select
          label="Filtrer par statut"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          options={[
            { value: '', label: 'Tous les statuts' },
            { value: 'disponible', label: 'Disponible' },
            { value: 'loué', label: 'Loué' },
            { value: 'en_travaux', label: 'En Travaux' },
            { value: 'en_vente', label: 'En Vente' }
          ]}
        />
      </Card>

      {/* PROPERTY TABLE */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : biens.length === 0 ? (
        <EmptyState
          title="Aucun bien trouvé"
          description="Ajustez vos filtres ou créez une nouvelle fiche de bien immobilier."
          ctaText="Ajouter un bien"
          onCtaClick={() => setIsCreateOpen(true)}
        />
      ) : (
        <Table headers={['Type', 'Adresse & Ville', 'Surface', 'Propriétaire', 'Statut', 'Actions']}>
          {biens.map((bien) => (
            <tr key={bien.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {bien.type}
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">{bien.adresse}</span>
                <span className="text-xs">{bien.ville}</span>
              </td>
              <td className="px-5 py-4 text-sm font-mono text-slate-500 dark:text-slate-400">
                <span className="block font-bold">{bien.surface} m²</span>
                <span className="text-xs text-primary-500 font-extrabold">{bien.loyer ? bien.loyer.toLocaleString() + ' FCFA' : '-'}</span>
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                {bien.proprietaireName}
              </td>
              <td className="px-5 py-4 text-sm">
                {getStatutBadge(bien.statut)}
              </td>
              <td className="px-5 py-4 text-sm flex items-center gap-2">
                {bien.statut === 'en_vente' && (
                  <button
                    onClick={() => {
                      setSellingBien(bien);
                      setSalePrice(bien.loyer || 0);
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-success-500 rounded-lg"
                    title="Enregistrer la vente"
                  >
                    <ShoppingCart size={16} />
                  </button>
                )}
                <button
                  onClick={() => setViewingBien(bien)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg"
                  title="Fiche technique & Carte"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleEditClick(bien)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-500 rounded-lg"
                  title="Modifier"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(bien.id)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-danger-500 rounded-lg"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Créer un Bien Immobilier">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <Input label="Adresse exacte" error={errors.adresse?.message} {...register('adresse')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ville" error={errors.ville?.message} {...register('ville')} />
            <Select 
              label="Type de Bien"
              options={[
                { value: 'appartement', label: 'Appartement' },
                { value: 'villa', label: 'Villa' },
                { value: 'bureau', label: 'Bureau' },
                { value: 'terrain', label: 'Terrain' },
                { value: 'magasin', label: 'Magasin' }
              ]}
              error={errors.type?.message}
              {...register('type')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Surface (m²)" type="number" error={errors.surface?.message} {...register('surface')} />
            <Input label="Étage" type="number" error={errors.etage?.message} {...register('etage')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nb Pièces" type="number" error={errors.nbPieces?.message} {...register('nbPieces')} />
            <Select 
              label="Statut Initial"
              options={[
                { value: 'disponible', label: 'Disponible' },
                { value: 'loué', label: 'Loué' },
                { value: 'en_travaux', label: 'En travaux' },
                { value: 'en_vente', label: 'En vente' }
              ]}
              error={errors.statut?.message}
              {...register('statut')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Loyer mensuel (FCFA)" type="number" error={errors.loyer?.message} {...register('loyer')} />
            <Input label="Caution (FCFA)" type="number" error={errors.caution?.message} {...register('caution')} />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Select 
              label="Propriétaire Rattaché"
              options={owners.map(o => ({ value: o.id, label: `${o.prenom} ${o.nom}` }))}
              error={errors.proprietaireId?.message}
              {...register('proprietaireId')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={editingBien !== null} onClose={() => setEditingBien(null)} title="Modifier le Bien">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <Input label="Adresse" error={errors.adresse?.message} {...register('adresse')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ville" error={errors.ville?.message} {...register('ville')} />
            <Select 
              label="Type de Bien"
              options={[
                { value: 'appartement', label: 'Appartement' },
                { value: 'villa', label: 'Villa' },
                { value: 'bureau', label: 'Bureau' },
                { value: 'terrain', label: 'Terrain' },
                { value: 'magasin', label: 'Magasin' }
              ]}
              error={errors.type?.message}
              {...register('type')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Surface (m²)" type="number" error={errors.surface?.message} {...register('surface')} />
            <Input label="Étage" type="number" error={errors.etage?.message} {...register('etage')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nb Pièces" type="number" error={errors.nbPieces?.message} {...register('nbPieces')} />
            <Select 
              label="Statut"
              options={[
                { value: 'disponible', label: 'Disponible' },
                { value: 'loué', label: 'Loué' },
                { value: 'en_travaux', label: 'En travaux' },
                { value: 'en_vente', label: 'En vente' }
              ]}
              error={errors.statut?.message}
              {...register('statut')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Loyer mensuel (FCFA)" type="number" error={errors.loyer?.message} {...register('loyer')} />
            <Input label="Caution (FCFA)" type="number" error={errors.caution?.message} {...register('caution')} />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Select 
              label="Propriétaire"
              options={owners.map(o => ({ value: o.id, label: `${o.prenom} ${o.nom}` }))}
              error={errors.proprietaireId?.message}
              {...register('proprietaireId')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setEditingBien(null)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL WITH LEAFLET */}
      <Modal isOpen={viewingBien !== null} onClose={() => setViewingBien(null)} title="Fiche Technique du Bien">
        {viewingBien && (
          <div className="space-y-5">
            {/* Gallery photo */}
            {viewingBien.photos && viewingBien.photos.length > 0 && (
              <div className="h-44 w-full rounded-xl overflow-hidden relative shadow-inner">
                <img 
                  src={viewingBien.photos[0]} 
                  alt="Property" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  {getStatutBadge(viewingBien.statut)}
                </div>
              </div>
            )}

            {/* General technical sheets */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase block">Adresse</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{viewingBien.adresse}</span>
                <span className="text-2xs text-slate-400 dark:text-slate-500 block font-bold">{viewingBien.ville}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase block">Caractéristiques</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                  {viewingBien.type} • {viewingBien.surface} m²
                </span>
                <span className="text-2xs text-slate-400 dark:text-slate-500 block">
                  {viewingBien.nbPieces ? `${viewingBien.nbPieces} pièces` : ''} 
                  {viewingBien.etage !== undefined ? ` • Étage ${viewingBien.etage}` : ''}
                </span>
                {viewingBien.loyer !== undefined && (
                  <span className="text-2xs text-primary-500 font-extrabold block mt-1">
                    Loyer : {viewingBien.loyer.toLocaleString()} FCFA/mois
                  </span>
                )}
                {viewingBien.caution !== undefined && (
                  <span className="text-2xs text-slate-500 dark:text-slate-400 font-extrabold block mt-0.5">
                    Caution : {viewingBien.caution.toLocaleString()} FCFA
                  </span>
                )}
              </div>
            </div>

            {/* Charges */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Charges & Provisions Associées
              </h4>
              {viewingBien.charges && viewingBien.charges.length > 0 ? (
                <div className="space-y-1.5">
                  {viewingBien.charges.map((c, i) => (
                    <div key={i} className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-100/50">
                      ⚡ {c}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-1 font-medium italic">
                  Aucune charge de copropriété enregistrée pour ce bien.
                </p>
              )}
            </div>

            {/* Map OpenStreetMap */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Géolocalisation du Bien
              </h4>
              <div className="h-[180px] w-full rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
                <div id="leaflet-map-container" className="w-full h-full" style={{ minHeight: '180px' }} />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => setViewingBien(null)}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* RECORD SALE MODAL */}
      <Modal isOpen={sellingBien !== null} onClose={() => setSellingBien(null)} title="Enregistrer la vente de ce bien">
        {sellingBien && (
          <form onSubmit={handleSellSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl mb-2">
              <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase block">Bien à vendre</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{sellingBien.adresse}</span>
              <span className="text-2xs text-slate-400 dark:text-slate-500 block">{sellingBien.ville} • {sellingBien.surface} m²</span>
            </div>
            
            <Input 
              label="Nom complet de l'Acheteur" 
              required
              value={saleClient} 
              onChange={(e) => setSaleClient(e.target.value)} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Prix de vente (FCFA)" 
                type="number"
                required
                value={salePrice || ''} 
                onChange={(e) => setSalePrice(Number(e.target.value))} 
              />
              <Input 
                label="Date de la vente" 
                type="date"
                required
                value={saleDate} 
                onChange={(e) => setSaleDate(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Commission Agence (%)" 
                type="number"
                step="0.1"
                required
                value={saleComm} 
                onChange={(e) => setSaleComm(Number(e.target.value))} 
              />
              <Select
                label="Agent négociateur"
                options={[{ value: '', label: 'Aucun agent' }, ...agents.map(a => ({ value: a.id, label: a.nom }))]}
                value={saleAgent}
                onChange={(e) => setSaleAgent(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" type="button" onClick={() => setSellingBien(null)}>Annuler</Button>
              <Button type="submit">Valider la Vente</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
export default Biens;
