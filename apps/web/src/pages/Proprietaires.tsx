import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Search, Edit2, Trash2, Eye, 
  FileText, Upload, X, Phone, Mail, MapPin, CreditCard, Printer,
  RefreshCw
} from 'lucide-react';
import { Card, Button, Input, Table, Badge, Modal, EmptyState, Select, customConfirm, TableSkeleton } from '../components/ui';
import { fetchWithRetry } from '../utils/api';
import { useAuthStore } from '../store/useAuthStore';

// Validation Schema with optional first property fields
const ownerSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  telephone: z.string().min(8, "Numéro de téléphone invalide"),
  adresse: z.string().min(5, "L'adresse doit faire au moins 5 caractères"),
  cinPasseport: z.string().min(4, "Le CIN/Passeport est requis"),
  bienAdresse: z.string().optional(),
  bienVille: z.string().optional(),
  bienType: z.string().optional(),
  bienSurface: z.string().optional(),
  bienLoyer: z.string().optional(),
  bienCaution: z.string().optional(),
});

type OwnerFormValues = z.infer<typeof ownerSchema>;

interface Owner {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  cinPasseport: string;
  biensCount?: number;
  documents?: { id: string; nom: string; url: string; type: string }[];
}

export const Proprietaires: React.FC = () => {
  const { user } = useAuthStore();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  const allOwnerTabs = [
    { id: 'info', label: '👤 Informations' },
    { id: 'biens', label: '🏠 Biens possédés' },
    { id: 'locataires', label: '👥 Locataires logés' },
    { id: 'retrait', label: '📊 Retrait de Loyer' },
    { id: 'fonds', label: '💰 Bilan Financier' },
  ];

  const allowedOwnerTabs = allOwnerTabs.filter(tab => {
    if (user?.role === 'admin') return true;
    if (user?.permissions?.tabs?.proprietaires) {
      return user.permissions.tabs.proprietaires.includes(tab.id);
    }
    return true;
  });

  const loadSettings = async () => {
    try {
      const res = await fetchWithRetry('/api/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (e) {
      console.warn("Failed to load settings in Proprietaires page");
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [isAddBienOpen, setIsAddBienOpen] = useState(false);
  const [newBienForm, setNewBienForm] = useState({
    adresse: '',
    ville: 'Dakar',
    type: 'appartement',
    surface: '',
    loyer: '',
    caution: '',
    etage: '',
    nbPieces: '',
    statut: 'disponible'
  });
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawInputAmount, setWithdrawInputAmount] = useState('');
  const [withdrawInputDate, setWithdrawInputDate] = useState('');
  const [withdrawInputMotif, setWithdrawInputMotif] = useState('');
  
  // Details inline sub-pages state
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [selectedOwnerTab, setSelectedOwnerTab] = useState<'info' | 'biens' | 'locataires' | 'retrait' | 'fonds'>('info');

  useEffect(() => {
    if (allowedOwnerTabs.length > 0) {
      const isAllowed = allowedOwnerTabs.some(t => t.id === selectedOwnerTab);
      if (!isAllowed) {
        setSelectedOwnerTab(allowedOwnerTabs[0].id as any);
      }
    }
  }, [user, allowedOwnerTabs, selectedOwnerTab]);
  const [withdrawDataMap, setWithdrawDataMap] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem('habitia_withdraw_data_react');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
  });

  useEffect(() => {
    localStorage.setItem('habitia_withdraw_data_react', JSON.stringify(withdrawDataMap));
  }, [withdrawDataMap]);
  const [allBiens, setAllBiens] = useState<any[]>([]);
  const [allLocataires, setAllLocataires] = useState<any[]>([]);
  const [fondsFilter, setFondsFilter] = useState('');

  // Form hooks
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerSchema)
  });

  const getHeaders = () => ['Nom & Prénom', 'Email', 'Téléphone', 'Biens Rattachés', 'CIN/Passeport', 'Actions'];

  // Load Owners
  const loadOwners = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithRetry(`/api/proprietaires?search=${search}`);
      if (response.ok) {
        const result = await response.json();
        setOwners(result.data || []);
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error("Error loading owners:", e);
      setOwners([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
  }, [search]);

  // Load properties and tenants for detail sheets offline/online
  const loadAllBiensAndLocataires = async () => {
    try {
      const [resBiens, resLocs] = await Promise.all([
        fetchWithRetry('/api/biens'),
        fetchWithRetry('/api/locataires')
      ]);
      if (resBiens.ok) {
        const data = await resBiens.json();
        setAllBiens(Array.isArray(data) ? data : (data.data || []));
      }
      if (resLocs.ok) {
        const data = await resLocs.json();
        setAllLocataires(data.data || []);
      }
    } catch (e) {
      console.error("Error loading properties and tenants:", e);
      setAllBiens([]);
      setAllLocataires([]);
    }
  };

  useEffect(() => {
    loadAllBiensAndLocataires();
  }, []);

  const loadWithdrawalsForOwner = async (ownerId: string) => {
    try {
      const response = await fetchWithRetry(`/api/proprietaires/${ownerId}/retraits`);
      if (response.ok) {
        const retraitsList = await response.json();
        setWithdrawDataMap(prev => {
          const current = prev[ownerId] || {};
          return {
            ...prev,
            [ownerId]: {
              ...current,
              withdrawals: retraitsList
            }
          };
        });
      }
    } catch (e) {
      console.error("Error loading withdrawals from API:", e);
    }
  };

  useEffect(() => {
    if (selectedOwner) {
      initWithdrawDataForOwner(selectedOwner);
      loadWithdrawalsForOwner(selectedOwner.id);
    }
  }, [selectedOwner]);

  // Initialize statement details dynamically
  const initWithdrawDataForOwner = (owner: Owner) => {
    if (withdrawDataMap[owner.id]) return;

    const isCheikh = owner.id === 'prop-1' || owner.nom.toLowerCase().includes('ndiaye');
    const lines = isCheikh ? [
      { locataireName: "Mr Soumaila", loyerMensuel: 25000, moisActuel: "janv-26", montantPaye: 25000, reliquat: 0, statut: "En avance" },
      { locataireName: "Mr Mohamed Mouktar Salem", loyerMensuel: 150000, moisActuel: "janv-26", montantPaye: 125000, reliquat: 25000, statut: "À jour" },
      { locataireName: "Mr Diarra", loyerMensuel: 150000, moisActuel: "janv-26", montantPaye: 100000, reliquat: 50000, statut: "En retard" }
    ] : [
      { locataireName: "Sékou Traoré", loyerMensuel: 800000, moisActuel: "juin-26", montantPaye: 800000, reliquat: 0, statut: "À jour" }
    ];

    const companyInfoStr = settings?.enterprise 
      ? `${settings.enterprise.nom}\n${settings.enterprise.adresse}\nSIRET : ${settings.enterprise.siret}\nTél : ${settings.enterprise.telephone || ''}\nEmail : ${settings.enterprise.email || ''}`
      : "LA SOCIETE IMMOBILIERE HAMET SEMEGA\nvde Nioro du Sahel et Associés SARL\nSise à Baco-djicoroni Golf Non loin de L'Hôtel MICASA\nTél : (+223) 78-26-60-09 / 65-10-81-44\nNuméro d'identification fiscale N° 085145669 E.";

    const logoUrlStr = settings?.enterprise?.logo || "https://i.ibb.co/L5VbXhC/hamet-logo.png";

    const defaultData = {
      companyInfo: companyInfoStr,
      logoUrl: logoUrlStr,
      date: new Date().toLocaleDateString('fr-FR'),
      title: "RETRAIT DE LOYER",
      ownerText: `Monsieur ${owner.prenom} ${owner.nom}, propriétaire d'un immeuble sis au ${isCheikh ? 'GOLF' : 'Plateau'} (${isCheikh ? 'Immeuble I : appartements et magasin' : 'Avenue Pompidou Office Block'})`,
      subText: "Nous vous informons que nous débitons votre compte des opérations suivantes :",
      fraisRate: 10,
      gerantName: "Mr Amadou Semega",
      beneficiaireName: `${owner.prenom} ${owner.nom}`,
      lines: lines
    };

    setWithdrawDataMap(prev => ({ ...prev, [owner.id]: defaultData }));
  };

  const updateWithdrawField = (ownerId: string, field: string, value: any) => {
    setWithdrawDataMap(prev => {
      const current = prev[ownerId];
      if (!current) return prev;
      return {
        ...prev,
        [ownerId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const getDefaultMonthStr = () => {
    const date = new Date();
    const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${year}`;
  };

  const updateWithdrawLine = (ownerId: string, index: number, fieldOrUpdates: string | Record<string, any>, value?: any) => {
    setWithdrawDataMap(prev => {
      const current = prev[ownerId];
      if (!current) return prev;
      const updatedLines = [...current.lines];
      if (typeof fieldOrUpdates === 'string') {
        updatedLines[index] = {
          ...updatedLines[index],
          [fieldOrUpdates]: value
        };
      } else {
        updatedLines[index] = {
          ...updatedLines[index],
          ...fieldOrUpdates
        };
      }
      return {
        ...prev,
        [ownerId]: {
          ...current,
          lines: updatedLines
        }
      };
    });
  };

  const addWithdrawLine = (ownerId: string) => {
    setWithdrawDataMap(prev => {
      const current = prev[ownerId];
      if (!current) return prev;
      return {
        ...prev,
        [ownerId]: {
          ...current,
          lines: [
            ...current.lines,
            {
              locataireName: "",
              loyerMensuel: 0,
              moisActuel: "",
              montantPaye: 0,
              reliquat: 0,
              statut: "En retard"
            }
          ]
        }
      };
    });
  };

  const deleteWithdrawLine = (ownerId: string, index: number) => {
    setWithdrawDataMap(prev => {
      const current = prev[ownerId];
      if (!current) return prev;
      const updatedLines = current.lines.filter((_: any, i: number) => i !== index);
      return {
        ...prev,
        [ownerId]: {
          ...current,
          lines: updatedLines
        }
      };
    });
  };

  // Create Owner
  const onCreateSubmit = async (data: OwnerFormValues) => {
    try {
      const response = await fetchWithRetry('/api/proprietaires', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setIsCreateOpen(false);
        reset();
        loadOwners();
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible de créer le propriétaire.");
    }
  };

  // Submit Edit
  const onEditSubmit = async (data: OwnerFormValues) => {
    if (!editingOwner) return;
    try {
      const response = await fetchWithRetry(`/api/proprietaires/${editingOwner.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setEditingOwner(null);
        reset();
        loadOwners();
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible de modifier le propriétaire.");
    }
  };

  // Archive / Delete Owner
  const handleDelete = async (id: string) => {
    if (!await customConfirm("Voulez-vous vraiment archiver ce propriétaire ?")) return;
    try {
      const response = await fetchWithRetry(`/api/proprietaires/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadOwners();
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible d'archiver le propriétaire.");
    }
  };

  const handleCreateBienForOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;
    try {
      const response = await fetchWithRetry('/api/biens', {
        method: 'POST',
        body: JSON.stringify({
          ...newBienForm,
          surface: parseFloat(newBienForm.surface) || 0,
          loyer: parseFloat(newBienForm.loyer) || 0,
          caution: parseFloat(newBienForm.caution) || 0,
          etage: newBienForm.etage ? parseInt(newBienForm.etage) : undefined,
          nbPieces: newBienForm.nbPieces ? parseInt(newBienForm.nbPieces) : undefined,
          proprietaireId: selectedOwner.id
        })
      });
      if (response.ok) {
        setIsAddBienOpen(false);
        setNewBienForm({
          adresse: '',
          ville: 'Dakar',
          type: 'appartement',
          surface: '',
          loyer: '',
          caution: '',
          etage: '',
          nbPieces: '',
          statut: 'disponible'
        });
        await loadAllBiensAndLocataires();
        alert("Le bien a été ajouté avec succès !");
      } else {
        alert("Erreur lors de la création du bien.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;
    const w = withdrawDataMap[selectedOwner.id];
    if (!w) return;

    const amountToWithdraw = parseFloat(withdrawInputAmount);
    if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
      alert("Veuillez saisir un montant valide supérieur à 0.");
      return;
    }
    
    let totalPaye = 0;
    w.lines.forEach((l: any) => {
      totalPaye += parseFloat(l.montantPaye) || 0;
    });
    const managementFees = Math.round(totalPaye * (w.fraisRate / 100));
    const netAmount = totalPaye - managementFees;
    
    const cumulativeNet = (parseFloat(w.historicalNet) || 0) + netAmount;
    
    const currentWithdrawals = w.withdrawals || [];
    const currentWithdrawnAmount = currentWithdrawals.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
    const remainingBalance = cumulativeNet - currentWithdrawnAmount;

    if (amountToWithdraw > remainingBalance) {
      alert("Le montant saisi dépasse le solde disponible.");
      return;
    }

    const dateVal = withdrawInputDate || new Date().toISOString().split('T')[0];
    const motifVal = withdrawInputMotif || 'Retrait de loyers';

    try {
      const response = await fetchWithRetry(`/api/proprietaires/${selectedOwner.id}/retraits`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amountToWithdraw,
          date: dateVal,
          motif: motifVal
        })
      });

      if (response.ok) {
        const savedRetrait = await response.json();
        const updatedWithdrawals = [...currentWithdrawals, savedRetrait];
        const newWithdrawnTotal = currentWithdrawnAmount + amountToWithdraw;

        setWithdrawDataMap(prev => ({
          ...prev,
          [selectedOwner.id]: {
            ...prev[selectedOwner.id],
            withdrawnAmount: newWithdrawnTotal,
            withdrawals: updatedWithdrawals
          }
        }));

        setIsWithdrawOpen(false);
        alert(`Retrait de ${amountToWithdraw.toLocaleString()} FCFA effectué avec succès !`);
      } else {
        alert("Erreur lors de l'enregistrement du retrait sur le serveur.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau. Impossible d'enregistrer le retrait.");
    }
  };

  // View Sub-tabs Renderer Helpers
  const renderPersonalInfoTab = (owner: Owner) => {
    const handleSaveInfo = () => {
      const prenom = (document.getElementById('edit-prenom') as HTMLInputElement).value;
      const nom = (document.getElementById('edit-nom') as HTMLInputElement).value;
      const email = (document.getElementById('edit-email') as HTMLInputElement).value;
      const telephone = (document.getElementById('edit-telephone') as HTMLInputElement).value;
      const adresse = (document.getElementById('edit-adresse') as HTMLInputElement).value;
      const cin = (document.getElementById('edit-cin') as HTMLInputElement).value;

      setOwners(prev => prev.map(o => o.id === owner.id ? { ...o, prenom, nom, email, telephone, adresse, cinPasseport: cin } : o));
      setSelectedOwner(prev => prev ? { ...prev, prenom, nom, email, telephone, adresse, cinPasseport: cin } : null);
      alert("Informations enregistrées avec succès !");
    };

    const handleAddDoc = () => {
      const docName = prompt("Entrez le nom du document (ex: Titre_De_Propriete.pdf) :");
      if (docName) {
        setOwners(prev => prev.map(o => {
          if (o.id === owner.id) {
            const documents = o.documents || [];
            return {
              ...o,
              documents: [...documents, { id: 'doc-' + (documents.length + 1), nom: docName, url: '#', type: 'pdf' }]
            };
          }
          return o;
        }));
        setSelectedOwner(prev => {
          if (!prev) return null;
          const documents = prev.documents || [];
          return {
            ...prev,
            documents: [...documents, { id: 'doc-' + (documents.length + 1), nom: docName, url: '#', type: 'pdf' }]
          };
        });
      }
    };

    const handleRemoveDoc = async (docId: string) => {
      if (await customConfirm("Voulez-vous détacher ce document ?")) {
        setOwners(prev => prev.map(o => o.id === owner.id ? { ...o, documents: (o.documents || []).filter(d => d.id !== docId) } : o));
        setSelectedOwner(prev => prev ? { ...prev, documents: (prev.documents || []).filter(d => d.id !== docId) } : null);
      }
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Détails personnels</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input id="edit-prenom" label="Prénom" defaultValue={owner.prenom} />
            <Input id="edit-nom" label="Nom" defaultValue={owner.nom} />
          </div>
          <Input id="edit-email" label="Email" type="email" defaultValue={owner.email} />
          <Input id="edit-telephone" label="Téléphone" defaultValue={owner.telephone} />
          <Input id="edit-adresse" label="Adresse" defaultValue={owner.adresse} />
          <Input id="edit-cin" label="CIN / Passeport" defaultValue={owner.cinPasseport} />
          <Button onClick={handleSaveInfo} className="w-full">Enregistrer les modifications</Button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents Mandats & Identité</h3>
            <Button onClick={handleAddDoc} size="sm" variant="secondary">📎 Rattacher</Button>
          </div>
          <div className="space-y-2">
            {owner.documents && owner.documents.length > 0 ? (
              owner.documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <FileText size={16} className="text-primary-500" />
                    <span>{d.nom}</span>
                  </div>
                  <button onClick={() => handleRemoveDoc(d.id)} className="text-danger-500 font-bold hover:underline text-xs">Retirer</button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center border border-dashed rounded-xl text-slate-400 text-xs">Aucun document téléversé.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBiensTab = (owner: Owner) => {
    const pBiens = allBiens.filter(b => b.proprietaireId === owner.id);

    const handleAddBien = () => {
      setIsAddBienOpen(true);
    };

    const handleDeleteBien = async (bienId: string) => {
      if (await customConfirm("Voulez-vous vraiment supprimer ce bien ?")) {
        try {
          const response = await fetchWithRetry(`/api/biens/${bienId}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            await loadAllBiensAndLocataires();
          } else {
            alert("Erreur lors de la suppression du bien.");
          }
        } catch (e) {
          console.error(e);
          alert("Erreur réseau.");
        }
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biens gérés pour ce bailleur</h3>
          <Button onClick={handleAddBien} size="sm" variant="secondary" className="flex items-center gap-1.5 border border-primary-200 dark:border-primary-900 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40">
            <Plus size={14} /> Ajouter un bien
          </Button>
        </div>
        {pBiens.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pBiens.map(b => (
              <Card key={b.id} className="overflow-hidden flex flex-col justify-between p-0 border border-slate-100 dark:border-slate-800 relative group">
                <div className="h-32 bg-slate-200">
                  <img src={b.photos?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&auto=format&fit=crop'} className="w-full h-full object-cover" />
                </div>
                <button onClick={() => handleDeleteBien(b.id)} className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-slate-900/80 hover:bg-danger-100 dark:hover:bg-danger-900/50 text-danger-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <Trash2 size={16} />
                </button>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" className="uppercase">{b.type}</Badge>
                    <Badge variant="success" className="uppercase">{b.statut}</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">{b.adresse}</h4>
                  <p className="text-3xs text-slate-400">{b.ville} • {b.surface} m² • {b.loyer ? b.loyer.toLocaleString() + ' FCFA/mois' : 'Pas de loyer défini'}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed rounded-xl text-slate-400 text-xs">Aucun bien rattaché à ce propriétaire.</div>
        )}
      </div>
    );
  };

  const renderLocatairesTab = (owner: Owner) => {
    const ownerBiens = allBiens.filter(b => b.proprietaireId === owner.id);
    const ownerBienAddresses = ownerBiens.map(b => b.adresse.trim().toLowerCase());
    const pLocataires = allLocataires.filter(l => {
      const addr = (l.bienAdresse || l.bien || '').trim().toLowerCase();
      return ownerBienAddresses.includes(addr);
    });

    return (
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Locataires en cours de bail</h3>
        {pLocataires.length > 0 ? (
          <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <Table headers={['Locataire', 'Bien loué', 'Téléphone', 'Employeur / Garant', 'Statut']}>
              {pLocataires.map(l => (
                <tr key={l.id}>
                  <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 text-xs">{l.prenom} {l.nom}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{l.bienAdresse || l.bien}</td>
                  <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{l.telephone}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{l.employeur} / {l.garant}</td>
                  <td className="px-5 py-3.5 text-xs">
                    <Badge variant="success" className="uppercase">{l.statut}</Badge>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed rounded-xl text-slate-400 text-xs font-semibold">Aucun locataire hébergé.</div>
        )}
      </div>
    );
  };

  const renderRetraitTab = (owner: Owner) => {
    const w = withdrawDataMap[owner.id];
    if (!w) return null;

    const ownerBiens = allBiens.filter(b => b.proprietaireId === owner.id);
    const ownerBienAddresses = ownerBiens.map(b => b.adresse.trim().toLowerCase());
    const pLocataires = allLocataires.filter(l => {
      const addr = (l.bienAdresse || l.bien || '').trim().toLowerCase();
      return ownerBienAddresses.includes(addr);
    });

    let totalPaye = 0;
    let totalReliquats = 0;
    w.lines.forEach((l: any) => {
      totalPaye += parseFloat(l.montantPaye) || 0;
      const rel = (parseFloat(l.loyerMensuel) || 0) - (parseFloat(l.montantPaye) || 0);
      if (rel > 0) {
        totalReliquats += rel;
      }
    });
    const managementFees = Math.round(totalPaye * (w.fraisRate / 100));
    const netAmount = totalPaye - managementFees;

    const handleNewMonth = async () => {
      const confirmReset = await customConfirm(
        "Voulez-vous vraiment clore ce mois et passer au mois suivant ? " +
        "Cela va archiver le montant net de ce mois dans votre solde cumulé et réinitialiser les paiements des locataires dans le tableau."
      );
      if (!confirmReset) return;

      const currentTotalPaye = totalPaye;
      const currentManagementFees = managementFees;
      const currentNetAmount = netAmount;

      setWithdrawDataMap(prev => {
        const current = prev[owner.id];
        if (!current) return prev;

        return {
          ...prev,
          [owner.id]: {
            ...current,
            historicalBrut: (parseFloat(current.historicalBrut) || 0) + currentTotalPaye,
            historicalFrais: (parseFloat(current.historicalFrais) || 0) + currentManagementFees,
            historicalNet: (parseFloat(current.historicalNet) || 0) + currentNetAmount,
            lines: []
          }
        };
      });

      alert("Le nouveau mois a été initialisé ! Le solde cumulé a été mis à jour.");
    };

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            updateWithdrawField(owner.id, 'logoUrl', event.target.result);
          }
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    };

    const handleSaveCommissionToCompta = async () => {
      const today = new Date().toISOString().split('T')[0];
      const ownerName = `${owner.prenom} ${owner.nom}`;
      try {
        const response = await fetchWithRetry('/api/compta/revenus', {
          method: 'POST',
          body: JSON.stringify({
            type: 'honoraires_gestion',
            description: `Commission de gérance - ${ownerName}`,
            montant: managementFees,
            date: today,
            clientNom: ownerName
          })
        });
        if (response.ok) {
          const cleanName = (name: string) => name.toLowerCase().replace(/^(mr|mme|mlle|monsieur|madame)\.?\s+/i, '').trim();
          const linesToSave = (w.lines || []).filter((l: any) => l.locataireName && (parseFloat(l.montantPaye) >= 0));
          let successPayments = 0;
          let failedPayments = 0;

          for (const l of linesToSave) {
            const cleanLName = cleanName(l.locataireName);
            const matchedLoc = allLocataires.find((loc: any) => {
              const locFullName = `${loc.prenom} ${loc.nom}`;
              return cleanName(locFullName) === cleanLName || locFullName.toLowerCase().includes(cleanLName) || cleanLName.includes(locFullName.toLowerCase());
            });

            if (matchedLoc && matchedLoc.contratId) {
              let apiStatut = 'payé';
              const reliquat = (parseFloat(l.loyerMensuel) || 0) - (parseFloat(l.montantPaye) || 0);
              if (reliquat <= 0) {
                apiStatut = 'payé';
              } else if (parseFloat(l.montantPaye) > 0) {
                apiStatut = 'partiel';
              } else {
                apiStatut = 'en_retard';
              }

              let datePaiement = today;
              if (w.date) {
                const parts = w.date.split('/');
                if (parts.length === 3) {
                  const day = parts[0].trim();
                  const month = parts[1].trim();
                  const year = parts[2].trim();
                  if (day.length <= 2 && month.length <= 2 && year.length === 4) {
                    datePaiement = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  }
                }
              }

              const payResponse = await fetchWithRetry('/api/compta/transactions', {
                method: 'POST',
                body: JSON.stringify({
                  contratId: matchedLoc.contratId,
                  montant: parseFloat(l.montantPaye) || 0,
                  datePaiement,
                  statut: apiStatut,
                  type: 'loyer'
                })
              });

              if (payResponse.ok) {
                successPayments++;
              } else {
                failedPayments++;
              }
            } else {
              failedPayments++;
            }
          }

          let msg = 'Commission de gérance enregistrée avec succès dans la comptabilité.';
          if (linesToSave.length > 0) {
            msg += ` Règlements enregistrés : ${successPayments}/${linesToSave.length}.`;
          }
          alert(msg);
          await loadAllBiensAndLocataires();
        } else {
          const err = await response.json();
          alert(`Erreur lors de l'enregistrement de la commission : ${err.error || 'Erreur inconnue'}`);
        }
      } catch (error) {
        console.error(error);
        alert("Erreur réseau lors de l'enregistrement de la commission ou des règlements.");
      }
    };

    const handlePrint = () => {
      const printHtml = `
        <div style="font-family: Arial, sans-serif; color: black; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div style="border: 1px solid black; padding: 10px; font-size: 10px; line-height: 1.4; max-width: 350px; white-space: pre-line;">
              ${w.companyInfo}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${w.logoUrl || 'https://i.ibb.co/L5VbXhC/hamet-logo.png'}" style="max-height: 80px;" />
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid black; border-bottom: 1px solid black; padding: 8px 0; margin: 15px 0; font-size: 11px; font-weight: bold;">
            <span>${w.title}</span>
            <span>Bamako le : ${w.date}</span>
          </div>
          <div style="font-size: 11px; margin-bottom: 15px; line-height: 1.5;">
            <p>Monsieur <strong style="text-decoration: underline;">${w.ownerText}</strong></p>
            <p style="color: #555; font-style: italic; margin-top: 5px;">${w.subText}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 10px;">
            <thead>
              <tr style="background-color: #1d4ed8; color: white; font-weight: bold; text-align: left;">
                <th style="padding: 6px; border-right: 1px solid black; border-bottom: 1px solid black;">Locataires</th>
                <th style="padding: 6px; border-right: 1px solid black; border-bottom: 1px solid black; text-align: right;">Loyer Mensuel</th>
                <th style="padding: 6px; border-right: 1px solid black; border-bottom: 1px solid black; text-align: center;">Mois Actuel</th>
                <th style="padding: 6px; border-right: 1px solid black; border-bottom: 1px solid black; text-align: right;">Montant payé</th>
                <th style="padding: 6px; border-right: 1px solid black; border-bottom: 1px solid black; text-align: right;">Reliquats</th>
                <th style="padding: 6px; text-align: center; border-bottom: 1px solid black;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${w.lines.map((l: any) => {
                const reliquat = (parseFloat(l.loyerMensuel) || 0) - (parseFloat(l.montantPaye) || 0);
                return `
                  <tr style="border-bottom: 1px solid #ccc;">
                    <td style="padding: 6px; border-right: 1px solid black; font-weight: bold;">${l.locataireName}</td>
                    <td style="padding: 6px; border-right: 1px solid black; text-align: right;">${l.loyerMensuel.toLocaleString()} FCFA</td>
                    <td style="padding: 6px; border-right: 1px solid black; text-align: center;">${l.moisActuel}</td>
                    <td style="padding: 6px; border-right: 1px solid black; text-align: right; font-weight: bold;">${l.montantPaye.toLocaleString()} FCFA</td>
                    <td style="padding: 6px; border-right: 1px solid black; text-align: right; font-weight: bold; color: ${reliquat > 0 ? 'red' : 'black'};">${reliquat > 0 ? reliquat.toLocaleString() + ' FCFA' : '- FCFA'}</td>
                    <td style="padding: 6px; text-align: center; font-weight: bold; font-size: 8px;">
                      <span style="padding: 2px 6px; border-radius: 4px; ${
                        l.statut === 'En avance' ? 'background:#10b981;color:white;' :
                        l.statut === 'À jour' ? 'background:#eab308;color:white;' :
                        'background:#ef4444;color:white;'
                      }">${l.statut}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div style="display: flex; justify-content: flex-start; margin-top: 15px;">
            <table style="width: 250px; font-size: 10px; border: 1px solid black; padding: 8px; background-color: #f9f9f9; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 4px; font-weight: bold; color: #555;">TOTAL COLLECTÉ :</td>
                <td style="padding: 4px; text-align: right; font-weight: bold;">${totalPaye.toLocaleString()} FCFA</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 4px; font-weight: bold; color: #555;">Frais de gérance (${w.fraisRate}%) :</td>
                <td style="padding: 4px; text-align: right; font-weight: bold;">${managementFees.toLocaleString()} FCFA</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 4px; font-weight: bold; color: #555;">Reliquats restants :</td>
                <td style="padding: 4px; text-align: right; font-weight: bold; color: red;">${totalReliquats.toLocaleString()} FCFA</td>
              </tr>
              <tr style="font-size: 11px; font-weight: bold; color: #1d4ed8;">
                <td style="padding: 6px 4px 4px 4px;">NET À REVERSER :</td>
                <td style="padding: 6px 4px 4px 4px; text-align: right; font-size: 12px; font-weight: 900;">${netAmount.toLocaleString()} FCFA</td>
              </tr>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px dashed black; text-align: center; font-size: 10px;">
            <div style="width: 200px;">
              <span style="font-weight: bold; display: block; text-transform: uppercase; color: #777; margin-bottom: 50px;">Le Bénéficiaire</span>
              <strong style="text-decoration: underline; font-size: 11px;">${w.beneficiaireName}</strong>
            </div>
            <div style="width: 200px;">
              <span style="font-weight: bold; display: block; text-transform: uppercase; color: #777; margin-bottom: 50px;">Le Gérant</span>
              <strong style="text-decoration: underline; font-size: 11px;">${w.gerantName}</strong>
            </div>
          </div>
        </div>
      `;

      const originalBody = document.body.innerHTML;
      document.body.innerHTML = printHtml;
      setTimeout(() => {
        window.print();
        document.body.innerHTML = originalBody;
        window.location.reload();
      }, 250);
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-750">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Frais de gérance (%) :</span>
            <input 
              type="number" 
              value={w.fraisRate} 
              onChange={(e) => updateWithdrawField(owner.id, 'fraisRate', parseFloat(e.target.value) || 0)} 
              className="w-14 px-2 py-1 text-center border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveCommissionToCompta} variant="success" className="flex items-center gap-1.5 shadow-md shadow-success-500/10">
              💾 Enregistrer
            </Button>
            <Button onClick={handleNewMonth} variant="secondary" className="flex items-center gap-1.5 border border-primary-200 dark:border-primary-900 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40">
              <RefreshCw size={14} /> Nouveau Mois
            </Button>
            <Button onClick={handlePrint} className="flex items-center gap-1.5 shadow-md shadow-primary-500/10">
              🖨️ Imprimer / PDF
            </Button>
          </div>
        </div>

        <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-6 text-slate-900 dark:text-slate-100 shadow-inner overflow-x-auto">
          <div className="min-w-[720px] space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 max-w-[320px] space-y-1 text-left">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Informations Agence (Modifiable)</span>
                <textarea 
                  value={w.companyInfo}
                  onChange={(e) => updateWithdrawField(owner.id, 'companyInfo', e.target.value)}
                  className="w-full text-[10px] leading-tight border border-slate-250 dark:border-slate-700 p-2 font-mono bg-slate-50/50 dark:bg-slate-800 focus:outline-none focus:border-primary-500 rounded-lg text-slate-800 dark:text-slate-200"
                  rows={5}
                />
              </div>

              <div className="flex flex-col items-center">
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5 text-right w-full">Logo (Cliquez pour changer)</span>
                <div 
                  onClick={() => document.getElementById('react-withdraw-logo-file')?.click()}
                  className="cursor-pointer border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 min-w-[120px] max-w-[250px] hover:border-primary-500 transition-colors"
                >
                  <img src={w.logoUrl} className="max-h-20 object-contain" />
                </div>
                <input 
                  type="file" 
                  id="react-withdraw-logo-file" 
                  className="hidden" 
                  onChange={handleLogoFileChange}
                />
              </div>
            </div>

            <div className="flex justify-between items-center border-y border-slate-355 dark:border-slate-700 py-2.5 my-2 text-[11px] font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Objet :</span>
                <input 
                  type="text" 
                  value={w.title}
                  onChange={(e) => updateWithdrawField(owner.id, 'title', e.target.value)}
                  className="font-extrabold uppercase border-b border-transparent hover:border-slate-300 focus:border-primary-500 bg-transparent px-1 focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex items-center gap-1.5 text-slate-850 dark:text-slate-200">
                <span>Bamako le :</span>
                <input 
                  type="text" 
                  value={w.date}
                  onChange={(e) => updateWithdrawField(owner.id, 'date', e.target.value)}
                  className="font-bold border-b border-transparent hover:border-slate-300 focus:border-primary-500 bg-transparent px-1 focus:outline-none w-28 text-right"
                />
              </div>
            </div>

            <div className="text-[11px] font-semibold space-y-2 text-left text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0">Description Propriétaire/Immeuble :</span>
                <input 
                  type="text" 
                  value={w.ownerText}
                  onChange={(e) => updateWithdrawField(owner.id, 'ownerText', e.target.value)}
                  className="w-full border-b border-transparent hover:border-slate-300 focus:border-primary-500 bg-transparent py-0.5 focus:outline-none font-bold underline"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="shrink-0">Texte introductif :</span>
                <input 
                  type="text" 
                  value={w.subText}
                  onChange={(e) => updateWithdrawField(owner.id, 'subText', e.target.value)}
                  className="w-full border-b border-transparent hover:border-slate-300 focus:border-primary-500 bg-transparent py-0.5 focus:outline-none text-slate-500"
                />
              </div>
            </div>

            <table className="w-full text-left border-collapse border border-slate-300 dark:border-slate-700 text-[10px] leading-tight">
              <thead>
                <tr className="bg-primary-600 text-white font-bold border-b">
                  <th className="p-2 border-r border-slate-300">Locataires</th>
                  <th className="p-2 border-r border-slate-300 w-28 text-right">Loyer Mensuel</th>
                  <th className="p-2 border-r border-slate-300 w-24 text-center">Mois Actuel</th>
                  <th className="p-2 border-r border-slate-300 w-28 text-right">Montant payé</th>
                  <th className="p-2 border-r border-slate-300 w-28 text-right">Reliquats</th>
                  <th className="p-2 w-28 text-center">Statut</th>
                  <th className="p-1.5 text-center w-10">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {w.lines.map((l: any, index: number) => {
                  const reliquat = (parseFloat(l.loyerMensuel) || 0) - (parseFloat(l.montantPaye) || 0);
                  return (
                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                        <select 
                          value={l.locataireName}
                          onChange={(e) => {
                            const name = e.target.value;
                            const matchedLoc = allLocataires.find(loc => `${loc.prenom} ${loc.nom}` === name);
                            const rent = matchedLoc ? (matchedLoc.loyer || 0) : 0;
                            updateWithdrawLine(owner.id, index, {
                              locataireName: name,
                              loyerMensuel: rent,
                              moisActuel: l.moisActuel || getDefaultMonthStr()
                            });
                          }}
                          className="w-full p-1 border border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none rounded bg-transparent font-bold text-slate-805 dark:text-slate-200"
                        >
                          <option value="">Sélectionner un locataire</option>
                          {pLocataires.map((loc) => {
                            const fullName = `${loc.prenom} ${loc.nom}`;
                            return (
                              <option key={loc.id} value={fullName}>
                                {fullName}
                              </option>
                            );
                          })}
                          {l.locataireName && !pLocataires.some(loc => `${loc.prenom} ${loc.nom}` === l.locataireName) && (
                            <option value={l.locataireName}>{l.locataireName}</option>
                          )}
                        </select>
                      </td>
                      <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                        <input 
                          type="number" 
                          value={l.loyerMensuel === 0 ? '' : l.loyerMensuel}
                          onChange={(e) => updateWithdrawLine(owner.id, index, 'loyerMensuel', parseFloat(e.target.value) || 0)}
                          className="w-full p-1 border border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none rounded bg-transparent font-mono text-right text-slate-850 dark:text-slate-255"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                        <input 
                          type="text" 
                          value={l.moisActuel}
                          onChange={(e) => updateWithdrawLine(owner.id, index, 'moisActuel', e.target.value)}
                          className="w-full p-1 border border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none rounded bg-transparent text-center text-slate-850 dark:text-slate-255"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 dark:border-slate-800">
                        <input 
                          type="number" 
                          value={l.montantPaye === 0 ? '' : l.montantPaye}
                          onChange={(e) => updateWithdrawLine(owner.id, index, 'montantPaye', parseFloat(e.target.value) || 0)}
                          className="w-full p-1 border border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none rounded bg-transparent font-mono text-right font-bold text-slate-850 dark:text-slate-255"
                        />
                      </td>
                      <td className="p-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-slate-850 dark:text-slate-250">
                        {reliquat > 0 ? <span className="text-danger-500">{reliquat.toLocaleString()} FCFA</span> : <span className="text-slate-400">- FCFA</span>}
                      </td>
                      <td className="p-1 border-r border-slate-200 dark:border-slate-800 text-center">
                        <select 
                          value={l.statut}
                          onChange={(e) => updateWithdrawLine(owner.id, index, 'statut', e.target.value)}
                          className="w-full p-0.5 border border-transparent hover:border-slate-300 focus:outline-none rounded font-bold text-center text-[9px]"
                          style={{
                            backgroundColor: l.statut === 'En avance' ? '#10b981' : l.statut === 'À jour' ? '#eab308' : '#ef4444',
                            color: 'white'
                          }}
                        >
                          <option value="En avance">En avance</option>
                          <option value="À jour">À jour</option>
                          <option value="En retard">En retard</option>
                        </select>
                      </td>
                      <td className="p-1 text-center">
                        <button onClick={() => deleteWithdrawLine(owner.id, index)} className="text-danger-500 hover:text-danger-600 font-bold hover:scale-110">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-start">
              <Button onClick={() => addWithdrawLine(owner.id)} variant="ghost" size="sm" className="border border-dashed border-primary-500 text-primary-500 text-[10px] font-bold">
                + Ajouter une ligne de retrait
              </Button>
            </div>

            <div className="flex justify-start pt-3">
              <div className="w-[260px] text-[11px] space-y-1.5 border p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border-slate-300 dark:border-slate-700 text-slate-850 dark:text-slate-200 leading-relaxed text-left">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">TOTAL COLLECTÉ :</span>
                  <span className="font-black">{totalPaye.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1">
                  <span className="font-bold text-slate-500">Frais de gérance ({w.fraisRate}%) :</span>
                  <span className="font-black">{managementFees.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1">
                  <span className="font-bold text-slate-500">Reliquats restants :</span>
                  <span className="font-black text-danger-500">{totalReliquats.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1.5 font-bold text-primary-500 text-xs">
                  <span>NET À REVERSER :</span>
                  <span className="font-black">{netAmount.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 text-center text-[10px] pt-6 mt-6 border-t border-dashed border-slate-300 dark:border-slate-750">
              <div className="space-y-8">
                <div>
                  <span className="font-black block uppercase text-slate-400 tracking-wider">Le Bénéficiaire</span>
                  <span className="text-[8px] text-slate-400 block font-normal">(Signature et nom ci-dessous)</span>
                </div>
                <input 
                  type="text" 
                  value={w.beneficiaireName}
                  onChange={(e) => updateWithdrawField(owner.id, 'beneficiaireName', e.target.value)}
                  className="w-48 text-center font-bold underline border-b border-transparent hover:border-slate-300 focus:border-primary-500 bg-transparent px-1 focus:outline-none mx-auto block text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="space-y-8">
                <div>
                  <span className="font-black block uppercase text-slate-400 tracking-wider">Le Gérant</span>
                  <span className="text-[8px] text-slate-400 block font-normal">(Signature et nom ci-dessous)</span>
                </div>
                <input 
                  type="text" 
                  value={w.gerantName}
                  onChange={(e) => updateWithdrawField(owner.id, 'gerantName', e.target.value)}
                  className="w-48 text-center font-bold underline border-b border-transparent hover:border-slate-300 focus:border-primary-500 bg-transparent px-1 focus:outline-none mx-auto block text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderFondsTab = (owner: Owner) => {
    const w = withdrawDataMap[owner.id];
    if (!w) return (
      <div className="p-12 text-center border border-dashed rounded-xl text-slate-400 text-xs font-semibold">
        Veuillez d'abord initialiser l'onglet "Retrait de Loyer" pour visualiser le bilan.
      </div>
    );

    let currentTotalPaye = 0;
    w.lines.forEach((l: any) => {
      currentTotalPaye += parseFloat(l.montantPaye) || 0;
    });
    const currentManagementFees = Math.round(currentTotalPaye * (w.fraisRate / 100));
    const currentNetAmount = currentTotalPaye - currentManagementFees;

    const cumulativeBrut = (parseFloat(w.historicalBrut) || 0) + currentTotalPaye;
    const cumulativeFrais = (parseFloat(w.historicalFrais) || 0) + currentManagementFees;
    const cumulativeNet = (parseFloat(w.historicalNet) || 0) + currentNetAmount;

    const withdrawals = w.withdrawals || [];
    
    // Filter withdrawals list by motif or date
    const filteredWithdrawals = withdrawals.filter((item: any) => {
      if (!fondsFilter) return true;
      const motifMatch = (item.motif || '').toLowerCase().includes(fondsFilter.toLowerCase());
      const dateStr = new Date(item.date).toLocaleDateString('fr-FR');
      const dateMatch = dateStr.includes(fondsFilter);
      return motifMatch || dateMatch;
    });

    const withdrawnAmount = withdrawals.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
    const remainingBalance = cumulativeNet - withdrawnAmount;

    const handleDeleteWithdrawal = async (retraitId: string) => {
      if (!await customConfirm("Voulez-vous vraiment supprimer ce retrait ?")) return;
      try {
        const response = await fetchWithRetry(`/api/proprietaires/${owner.id}/retraits/${retraitId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          const updatedWithdrawals = withdrawals.filter((item: any) => item.id !== retraitId);
          setWithdrawDataMap(prev => ({
            ...prev,
            [owner.id]: {
              ...prev[owner.id],
              withdrawals: updatedWithdrawals
            }
          }));
          alert("Le retrait a été supprimé avec succès !");
        } else {
          alert("Erreur lors de la suppression du retrait.");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur réseau. Impossible de supprimer le retrait.");
      }
    };

    const handleResetBilan = async () => {
      if (!await customConfirm("Voulez-vous vraiment effacer toutes les informations financières accumulées (historique brut, frais, solde et liste des retraits) de ce propriétaire ? cette action est irréversible.")) return;
      try {
        const response = await fetchWithRetry(`/api/proprietaires/${owner.id}/retraits/all`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setWithdrawDataMap(prev => ({
            ...prev,
            [owner.id]: {
              ...prev[owner.id],
              historicalBrut: 0,
              historicalFrais: 0,
              historicalNet: 0,
              withdrawals: [],
              withdrawnAmount: 0
            }
          }));
          alert("Le bilan financier a été réinitialisé avec succès !");
        } else {
          alert("Erreur lors du reset du bilan sur le serveur.");
        }
      } catch (err) {
        console.error("API reset failed:", err);
        alert("Erreur réseau. Impossible de réinitialiser le bilan.");
      }
    };

    const handleWithdrawClick = () => {
      if (remainingBalance <= 0) {
        alert("Aucun fonds disponible pour le retrait.");
        return;
      }
      setWithdrawInputAmount(remainingBalance.toString());
      setWithdrawInputDate(new Date().toISOString().split('T')[0]);
      setWithdrawInputMotif('Retrait de loyers');
      setIsWithdrawOpen(true);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bilan Financier & Fonds Collectés</h3>
          <Button onClick={handleResetBilan} variant="secondary" className="border border-danger-200 dark:border-danger-900 text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 hover:bg-danger-100 dark:hover:bg-danger-900/40 text-xs">
            🗑️ Réinitialiser le Bilan
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <Card className="p-6 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-xs font-bold text-slate-500 block mb-1">Total Brut Collecté</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{cumulativeBrut.toLocaleString()} FCFA</span>
          </Card>
          <Card className="p-6 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-xs font-bold text-slate-500 block mb-1">Frais de Gérance ({w.fraisRate}%)</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{cumulativeFrais.toLocaleString()} FCFA</span>
          </Card>
          <Card className="p-6 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-xs font-bold text-slate-500 block mb-1">Fonds Déjà Retirés</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{withdrawnAmount.toLocaleString()} FCFA</span>
          </Card>
          <Card className="p-6 border border-primary-200 dark:border-primary-900 bg-primary-50 dark:bg-primary-900/20">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400 block mb-1">Solde Net Disponible</span>
            <span className="text-2xl font-black text-primary-700 dark:text-primary-300">{remainingBalance.toLocaleString()} FCFA</span>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button onClick={handleWithdrawClick} className="bg-success-600 hover:bg-success-700 text-white flex items-center gap-2 py-6 px-8 text-sm shadow-xl shadow-success-500/20 transition-transform active:scale-95">
            💰 Retirer les fonds disponibles
          </Button>
        </div>

        {/* Historique des retraits */}
        <div className="space-y-4 pt-4 border-t border-slate-150 dark:border-slate-850">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Historique des retraits effectués
            </h4>
            
            {/* Filter Input */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Filtrer par motif ou date..."
                value={fondsFilter}
                onChange={(e) => setFondsFilter(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 transition-colors"
              />
              {fondsFilter && (
                <button 
                  onClick={() => setFondsFilter('')}
                  className="px-2 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 rounded-lg transition-colors"
                  title="Effacer le filtre"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {filteredWithdrawals.length > 0 ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <Table headers={['Date', 'Motif', 'Montant Retiré', 'Actions']}>
                {filteredWithdrawals.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">
                      {new Date(item.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      {item.motif}
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-danger-500 text-xs">
                      {parseFloat(item.amount).toLocaleString()} FCFA
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <button 
                        onClick={() => handleDeleteWithdrawal(item.id)}
                        className="p-1 hover:bg-danger-50 dark:hover:bg-danger-900/30 text-danger-500 rounded transition-colors"
                        title="Supprimer ce retrait"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-1 italic font-medium">
              Aucun retrait ne correspond aux critères de filtrage.
            </p>
          )}
        </div>
      </div>
    );
  };

  // Render Sub-page if an owner is selected
  if (selectedOwner) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button 
            variant="secondary" 
            onClick={() => setSelectedOwner(null)}
            className="flex items-center gap-1.5 w-fit"
            size="sm"
          >
            ← Retour à la liste
          </Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
              {selectedOwner.prenom} {selectedOwner.nom}
            </h1>
            <p className="text-xs text-primary-500 font-semibold uppercase tracking-wider block">
              Fiche Propriétaire
            </p>
          </div>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex border-b border-slate-100 dark:border-slate-800 gap-4 text-xs font-semibold">
            {allowedOwnerTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedOwnerTab(tab.id as any)}
                className={`pb-2.5 transition-all focus:outline-none ${selectedOwnerTab === tab.id ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[350px]">
            {selectedOwnerTab === 'info' && renderPersonalInfoTab(selectedOwner)}
            {selectedOwnerTab === 'biens' && renderBiensTab(selectedOwner)}
            {selectedOwnerTab === 'locataires' && renderLocatairesTab(selectedOwner)}
            {selectedOwnerTab === 'retrait' && renderRetraitTab(selectedOwner)}
            {selectedOwnerTab === 'fonds' && renderFondsTab(selectedOwner)}
          </div>
        </Card>

        {/* MODAL POUR RETIRER LES FONDS */}
        <Modal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} title="Retrait de fonds">
          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Propriétaire :</span>
                <span className="font-black text-slate-850 dark:text-slate-200">{selectedOwner.prenom} {selectedOwner.nom}</span>
              </div>
              {(() => {
                const w = withdrawDataMap[selectedOwner.id];
                if (!w) return null;
                let currentTotalPaye = 0;
                w.lines.forEach((l: any) => {
                  currentTotalPaye += parseFloat(l.montantPaye) || 0;
                });
                const currentManagementFees = Math.round(currentTotalPaye * (w.fraisRate / 100));
                const currentNetAmount = currentTotalPaye - currentManagementFees;
                const cumulativeNet = (parseFloat(w.historicalNet) || 0) + currentNetAmount;
                const currentWithdrawals = w.withdrawals || [];
                const withdrawnAmount = currentWithdrawals.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
                const remainingBalance = cumulativeNet - withdrawnAmount;
                return (
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-bold text-primary-500">
                    <span>Solde disponible :</span>
                    <span>{remainingBalance.toLocaleString()} FCFA</span>
                  </div>
                );
              })()}
            </div>
            <Input 
              label="Montant à retirer (FCFA)" 
              type="number"
              value={withdrawInputAmount}
              onChange={(e) => setWithdrawInputAmount(e.target.value)}
              required
              min="1"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Date du retrait" 
                type="date"
                value={withdrawInputDate}
                onChange={(e) => setWithdrawInputDate(e.target.value)}
                required
              />
              <Input 
                label="Motif du retrait" 
                type="text"
                value={withdrawInputMotif}
                onChange={(e) => setWithdrawInputMotif(e.target.value)}
                required
                placeholder="Ex: Retrait de loyers"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" type="button" onClick={() => setIsWithdrawOpen(false)}>Annuler</Button>
              <Button type="submit" variant="success">Confirmer le retrait</Button>
            </div>
          </form>
        </Modal>

        {/* MODAL POUR AJOUTER UN BIEN DIRECTEMENT DANS L'ONGLET PROPRIETAIRE */}
        <Modal isOpen={isAddBienOpen} onClose={() => setIsAddBienOpen(false)} title="Ajouter un Bien Possédé">
          <form onSubmit={handleCreateBienForOwner} className="space-y-4">
            <Input 
              label="Adresse exacte" 
              value={newBienForm.adresse}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, adresse: e.target.value }))}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Ville" 
                value={newBienForm.ville}
                onChange={(e) => setNewBienForm(prev => ({ ...prev, ville: e.target.value }))}
                required
              />
              <Select 
                label="Type de Bien"
                value={newBienForm.type}
                onChange={(e) => setNewBienForm(prev => ({ ...prev, type: e.target.value }))}
                options={[
                  { value: 'appartement', label: 'Appartement' },
                  { value: 'villa', label: 'Villa' },
                  { value: 'bureau', label: 'Bureau' },
                  { value: 'terrain', label: 'Terrain' },
                  { value: 'magasin', label: 'Magasin' }
                ]}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input 
                label="Surface (m²)" 
                type="number"
                value={newBienForm.surface}
                onChange={(e) => setNewBienForm(prev => ({ ...prev, surface: e.target.value }))}
                required
              />
              <Input 
                label="Loyer mensuel (FCFA)" 
                type="number"
                value={newBienForm.loyer}
                onChange={(e) => setNewBienForm(prev => ({ ...prev, loyer: e.target.value }))}
                required
              />
              <Input 
                label="Caution (FCFA)" 
                type="number"
                value={newBienForm.caution}
                onChange={(e) => setNewBienForm(prev => ({ ...prev, caution: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Étage" 
                type="number"
                value={newBienForm.etage}
                onChange={(e) => setNewBienForm(prev => ({ ...prev, etage: e.target.value }))}
              />
              <Input 
                label="Nb Pièces" 
                type="number"
                value={newBienForm.nbPieces}
                onChange={(e) => setNewBienForm(prev => ({ ...prev, nbPieces: e.target.value }))}
              />
            </div>
            <Select 
              label="Statut Initial"
              value={newBienForm.statut}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, statut: e.target.value }))}
              options={[
                { value: 'disponible', label: 'Disponible' },
                { value: 'loué', label: 'Loué' },
                { value: 'en_travaux', label: 'En travaux' },
                { value: 'en_vente', label: 'En vente' }
              ]}
              required
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" type="button" onClick={() => setIsAddBienOpen(false)}>Annuler</Button>
              <Button type="submit">Valider</Button>
            </div>
          </form>
        </Modal>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Propriétaires
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Gérez vos clients bailleurs et mandat de gestion.
          </p>
        </div>
        <div>
          <Button 
            onClick={() => { reset(); setSelectedOwner(null); setIsCreateOpen(true); }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Ajouter un Propriétaire
          </Button>
        </div>
      </div>

      <Card className="py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, email ou téléphone..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : owners.length === 0 ? (
        <EmptyState
          title="Aucun propriétaire trouvé"
          description="Essayez de modifier votre recherche ou ajoutez un nouveau profil bailleur."
          ctaText="Créer un propriétaire"
          onCtaClick={() => setIsCreateOpen(true)}
        />
      ) : (
        <Table headers={getHeaders()}>
          {owners.map((owner) => (
            <tr key={owner.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <td className="px-5 py-4 font-semibold">
                <button 
                  onClick={() => { setSelectedOwner(owner); setSelectedOwnerTab('info'); initWithdrawDataForOwner(owner); }}
                  className="font-semibold text-primary-500 hover:text-primary-600 hover:underline text-left transition-all"
                >
                  {owner.prenom} {owner.nom}
                </button>
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                {owner.email}
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                {owner.telephone}
              </td>
              <td className="px-5 py-4 text-sm">
                <Badge variant="primary">{owner.biensCount || 0} biens</Badge>
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                {owner.cinPasseport}
              </td>
              <td className="px-5 py-4 text-sm flex items-center gap-2">
                <button
                  onClick={() => { setSelectedOwner(owner); setSelectedOwnerTab('info'); initWithdrawDataForOwner(owner); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg"
                  title="Voir la fiche"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => setEditingOwner(owner)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-500 rounded-lg"
                  title="Modifier"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(owner.id)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-danger-500 rounded-lg"
                  title="Archiver"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Créer un Propriétaire">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informations Personnelles</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nom" error={errors.nom?.message} {...register('nom')} />
              <Input label="Prénom" error={errors.prenom?.message} {...register('prenom')} />
            </div>
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Téléphone" error={errors.telephone?.message} {...register('telephone')} />
            <Input label="Adresse" error={errors.adresse?.message} {...register('adresse')} />
            <Input label="Numéro CIN / Passeport" error={errors.cinPasseport?.message} {...register('cinPasseport')} />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rattacher un premier bien (Optionnel)</h4>
            <Input label="Adresse du bien" {...register('bienAdresse')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Ville" {...register('bienVille')} />
              <Select 
                label="Type de Bien"
                options={[
                  { value: 'appartement', label: 'Appartement' },
                  { value: 'villa', label: 'Villa' },
                  { value: 'bureau', label: 'Bureau' },
                  { value: 'terrain', label: 'Terrain' },
                  { value: 'magasin', label: 'Magasin' }
                ]}
                {...register('bienType')}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Surface (m²)" type="number" {...register('bienSurface')} />
              <Input label="Loyer mensuel (FCFA)" type="number" {...register('bienLoyer')} />
              <Input label="Caution (FCFA)" type="number" {...register('bienCaution')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editingOwner !== null} onClose={() => setEditingOwner(null)} title="Modifier le Propriétaire">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom" error={errors.nom?.message} {...register('nom')} />
            <Input label="Prénom" error={errors.prenom?.message} {...register('prenom')} />
          </div>
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Téléphone" error={errors.telephone?.message} {...register('telephone')} />
          <Input label="Adresse" error={errors.adresse?.message} {...register('adresse')} />
          <Input label="Numéro CIN / Passeport" error={errors.cinPasseport?.message} {...register('cinPasseport')} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setEditingOwner(null)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL POUR AJOUTER UN BIEN DIRECTEMENT */}
      <Modal isOpen={isAddBienOpen} onClose={() => setIsAddBienOpen(false)} title="Ajouter un Bien Possédé">
        <form onSubmit={handleCreateBienForOwner} className="space-y-4">
          <Input 
            label="Adresse exacte" 
            value={newBienForm.adresse}
            onChange={(e) => setNewBienForm(prev => ({ ...prev, adresse: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Ville" 
              value={newBienForm.ville}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, ville: e.target.value }))}
              required
            />
            <Select 
              label="Type de Bien"
              value={newBienForm.type}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, type: e.target.value }))}
              options={[
                { value: 'appartement', label: 'Appartement' },
                { value: 'villa', label: 'Villa' },
                { value: 'bureau', label: 'Bureau' },
                { value: 'terrain', label: 'Terrain' },
                { value: 'magasin', label: 'Magasin' }
              ]}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input 
              label="Surface (m²)" 
              type="number"
              value={newBienForm.surface}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, surface: e.target.value }))}
              required
            />
            <Input 
              label="Loyer mensuel (FCFA)" 
              type="number"
              value={newBienForm.loyer}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, loyer: e.target.value }))}
              required
            />
            <Input 
              label="Caution (FCFA)" 
              type="number"
              value={newBienForm.caution}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, caution: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Étage" 
              type="number"
              value={newBienForm.etage}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, etage: e.target.value }))}
            />
            <Input 
              label="Nb Pièces" 
              type="number"
              value={newBienForm.nbPieces}
              onChange={(e) => setNewBienForm(prev => ({ ...prev, nbPieces: e.target.value }))}
            />
          </div>
          <Select 
            label="Statut Initial"
            value={newBienForm.statut}
            onChange={(e) => setNewBienForm(prev => ({ ...prev, statut: e.target.value }))}
            options={[
              { value: 'disponible', label: 'Disponible' },
              { value: 'loué', label: 'Loué' },
              { value: 'en_travaux', label: 'En travaux' },
              { value: 'en_vente', label: 'En vente' }
            ]}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsAddBienOpen(false)}>Annuler</Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>



    </div>
  );
};
export default Proprietaires;
