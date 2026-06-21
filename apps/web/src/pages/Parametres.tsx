import React, { useState, useEffect } from 'react';
import { 
  Building, Shield, Mail, Bell, Database, 
  Save, Download, Plus, AlertCircle, ToggleLeft, ToggleRight, CheckCircle2, X
} from 'lucide-react';
import { Card, Button, Input, Table, Badge, Modal, Select, Skeleton } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { fetchWithRetry } from '../utils/api';

interface Enterprise {
  nom: string;
  logo: string;
  adresse: string;
  siret: string;
  telephone: string;
  email: string;
}

interface User {
  id: string;
  nom: string;
  email: string;
  role: 'admin' | 'agent' | 'comptable' | 'lecture_seule';
  actif: boolean;
}

export const Parametres: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'emails' | 'notifications' | 'db'>('profile');

  const allTabs = [
    { id: 'profile', label: 'Profil Entreprise', icon: <Building size={16} /> },
    { id: 'users', label: 'Utilisateurs & Rôles', icon: <Shield size={16} /> },
    { id: 'emails', label: 'Modèles de Mails', icon: <Mail size={16} /> },
    { id: 'notifications', label: 'Alertes', icon: <Bell size={16} /> },
    { id: 'db', label: 'Sauvegarde', icon: <Database size={16} /> },
  ];

  const allowedTabs = allTabs.filter(tab => {
    if (user?.role === 'admin') return true;
    if (user?.permissions?.tabs?.parametres) {
      return user.permissions.tabs.parametres.includes(tab.id);
    }
    return true;
  });

  useEffect(() => {
    if (allowedTabs.length > 0) {
      const isAllowed = allowedTabs.some(t => t.id === activeTab);
      if (!isAllowed) {
        setActiveTab(allowedTabs[0].id as any);
      }
    }
  }, [user, allowedTabs, activeTab]);
  const [enterprise, setEnterprise] = useState<Enterprise>({
    nom: "Habitia Real Estate Group",
    logo: "",
    adresse: "Avenue Léopold Sédar Senghor, Dakar, Sénégal",
    siret: "SN-DKR-2026-B-12345",
    telephone: "+221 33 824 00 00",
    email: "contact@habitia.com"
  });

  const [users, setUsers] = useState<User[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'agent' | 'comptable' | 'lecture_seule'>('lecture_seule');

  // Email Templates
  const [templates, setTemplates] = useState<any[]>([
    {
      id: 'quittance',
      name: "Envoi de Quittance de Loyer",
      subject: "Votre quittance de loyer pour [Période]",
      body: "Bonjour [Locataire],\n\nVeuillez trouver ci-joint votre quittance de loyer pour la période de [Période] d'un montant de [Montant] FCFA.\n\nCordialement,\nL'équipe Habitia"
    },
    {
      id: 'relance',
      name: "Rappel de Loyer Impayé",
      subject: "Rappel : Loyer en retard pour le bien [Bien]",
      body: "Bonjour [Locataire],\n\nSauf erreur de notre part, nous n'avons pas encore reçu votre loyer de [Montant] FCFA pour le mois de [Mois].\n\nMerci de régulariser la situation dans les plus brefs délais.\n\nCordialement,\nL'équipe Habitia"
    }
  ]);

  // Notifications Toggles
  const [notifs, setNotifs] = useState({
    alertLatePayment: true,
    alertContractExpiry: true,
    alertBudgetOverrun: true
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load Settings
  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settingsRes = await fetchWithRetry('/api/settings');
      const usersRes = await fetchWithRetry('/api/settings/users');

      if (settingsRes.ok) {
        const setts = await settingsRes.json();
        setEnterprise(setts.enterprise);
        setTemplates(setts.mailModels || templates);
        setNotifs(setts.notifications);
      }
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn("Using offline mode for Settings.");
      // Fallback
      setUsers([
        { id: 'u-admin', nom: 'Sadio Diallo', email: 'admin@habitia.com', role: 'admin', actif: true },
        { id: 'u-agent', nom: 'Fatou Diop', email: 'agent@habitia.com', role: 'agent', actif: true },
        { id: 'u-compta', nom: 'Amath Sow', email: 'compta@habitia.com', role: 'comptable', actif: true },
        { id: 'u-read', nom: 'Jean Dupont', email: 'lecture@habitia.com', role: 'lecture_seule', actif: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save Company settings
  const handleSaveProfile = async () => {
    try {
      const response = await fetchWithRetry('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ enterprise })
      });
      if (response.ok) {
        alert("Profil entreprise mis à jour avec succès !");
      }
    } catch (e) {
      alert("Profil mis à jour en mode démo !");
    }
  };

  // Create User
  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail) return;
    try {
      const response = await fetchWithRetry('/api/settings/users', {
        method: 'POST',
        body: JSON.stringify({ nom: newUserName, email: newUserEmail, role: newUserRole, password: 'password123' })
      });
      if (response.ok) {
        setIsAddUserOpen(false);
        setNewUserName(''); setNewUserEmail('');
        loadSettings();
      }
    } catch (e) {
      // Offline fallback creation
      const newU: User = {
        id: 'u-' + (users.length + 1),
        nom: newUserName,
        email: newUserEmail,
        role: newUserRole,
        actif: true
      };
      setUsers([...users, newU]);
      setIsAddUserOpen(false);
      setNewUserName(''); setNewUserEmail('');
    }
  };

  // Toggle user state active/inactive
  const handleToggleUserActive = async (id: string, active: boolean) => {
    try {
      const response = await fetchWithRetry(`/api/settings/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ actif: !active })
      });
      if (response.ok) {
        loadSettings();
      }
    } catch (e) {
      setUsers(users.map(u => u.id === id ? { ...u, actif: !active } : u));
    }
  };

  // Backup download
  const handleBackupDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ enterprise, users, templates, notifs }));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", `habitia_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Paramètres
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Configurez les informations d'entreprise, gérez les habilitations de l'équipe et personnalisez vos courriels.
          </p>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-200/60 dark:border-slate-800 gap-4">
        {allowedTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === tab.id ? 'border-primary-500 text-primary-500' : 'border-transparent text-slate-400'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TABS CONTENT */}
      {isLoading ? (
        <Card className="space-y-4 max-w-xl">
          <Skeleton className="h-6 w-1/3 animate-pulse" />
          <Skeleton className="h-10 w-full animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full animate-pulse" />
            <Skeleton className="h-10 w-full animate-pulse" />
          </div>
          <Skeleton className="h-16 w-full animate-pulse" />
        </Card>
      ) : (
        <div className="space-y-4">
          
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <Card className="space-y-4 max-w-xl">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Identité de l'entreprise</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Logo de l'entreprise
                </label>
                <div className="flex items-center gap-4">
                  {enterprise.logo ? (
                    <div className="relative h-16 w-16 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={enterprise.logo} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setEnterprise({ ...enterprise, logo: '' })}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-danger-500 text-white rounded-full hover:bg-danger-600 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                      <Building size={24} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEnterprise({ ...enterprise, logo: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-slate-800 dark:file:text-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              <Input 
                label="Nom Commercial" 
                value={enterprise.nom} 
                onChange={(e) => setEnterprise({ ...enterprise, nom: e.target.value })} 
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Numéro SIRET / Réf SN" 
                  value={enterprise.siret} 
                  onChange={(e) => setEnterprise({ ...enterprise, siret: e.target.value })} 
                />
                <Input 
                  label="Téléphone" 
                  value={enterprise.telephone} 
                  onChange={(e) => setEnterprise({ ...enterprise, telephone: e.target.value })} 
                />
              </div>
              <Input 
                label="Adresse du Siège" 
                value={enterprise.adresse} 
                onChange={(e) => setEnterprise({ ...enterprise, adresse: e.target.value })} 
              />
              <Input 
                label="Email Principal de l'agence" 
                value={enterprise.email} 
                onChange={(e) => setEnterprise({ ...enterprise, email: e.target.value })} 
              />
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button onClick={handleSaveProfile} className="flex items-center gap-1.5">
                  <Save size={16} /> Enregistrer
                </Button>
              </div>
            </Card>
          )}

          {/* TAB 2: USERS & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Habilitations Équipe</span>
                <Button size="sm" onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-1">
                  <Plus size={14} /> Créer Utilisateur
                </Button>
              </div>
              
              <Table headers={['Nom', 'Email professionnel', 'Niveau de Rôle', 'Statut Accès', 'Actions']}>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                      {u.nom}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                      {u.email}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold capitalize text-primary-500 dark:text-primary-400">
                      {u.role.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={u.actif ? 'success' : 'neutral'}>
                        {u.actif ? 'Actif' : 'Bloqué / Inactif'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <button 
                        onClick={() => handleToggleUserActive(u.id, u.actif)}
                        className="text-2xs text-slate-400 hover:text-primary-500 font-bold underline"
                      >
                        {u.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          )}

          {/* TAB 3: EMAIL TEMPLATES */}
          {activeTab === 'emails' && (
            <div className="space-y-6 max-w-2xl">
              {templates.map((temp, index) => (
                <Card key={temp.id} className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 block uppercase">Modèle {index+1} : {temp.name}</span>
                  <Input 
                    label="Objet du mail" 
                    value={temp.subject}
                    onChange={(e) => {
                      const newT = [...templates];
                      newT[index].subject = e.target.value;
                      setTemplates(newT);
                    }}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Corps du message</label>
                    <textarea 
                      rows={5}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                      value={temp.body}
                      onChange={(e) => {
                        const newT = [...templates];
                        newT[index].body = e.target.value;
                        setTemplates(newT);
                      }}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={() => alert("Modèle d'email enregistré !")} className="flex items-center gap-1.5">
                      <Save size={14} /> Sauvegarder
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS ALERTS */}
          {activeTab === 'notifications' && (
            <Card className="space-y-4 max-w-md">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Seuils et Déclencheurs d'Alertes</h3>
              
              <div className="space-y-4 pt-2">
                
                {/* Alert 1 */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Alerte Loyers en Retard</span>
                    <span className="text-2xs text-slate-400">Notifier lorsque le loyer n'est pas reçu après le 5 du mois</span>
                  </div>
                  <button onClick={() => setNotifs({ ...notifs, alertLatePayment: !notifs.alertLatePayment })}>
                    {notifs.alertLatePayment ? <ToggleRight className="text-primary-500 h-8 w-8" /> : <ToggleLeft className="text-slate-300 h-8 w-8" />}
                  </button>
                </div>

                {/* Alert 2 */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Alerte Fin de Contrat</span>
                    <span className="text-2xs text-slate-400">Notifier 30 jours avant le terme d'un bail d'habitation</span>
                  </div>
                  <button onClick={() => setNotifs({ ...notifs, alertContractExpiry: !notifs.alertContractExpiry })}>
                    {notifs.alertContractExpiry ? <ToggleRight className="text-primary-500 h-8 w-8" /> : <ToggleLeft className="text-slate-300 h-8 w-8" />}
                  </button>
                </div>

                {/* Alert 3 */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Dépassement Budget Chantier</span>
                    <span className="text-2xs text-slate-400">Déclencher une alerte dès que le devis dépasse le budget prévisionnel</span>
                  </div>
                  <button onClick={() => setNotifs({ ...notifs, alertBudgetOverrun: !notifs.alertBudgetOverrun })}>
                    {notifs.alertBudgetOverrun ? <ToggleRight className="text-primary-500 h-8 w-8" /> : <ToggleLeft className="text-slate-300 h-8 w-8" />}
                  </button>
                </div>

              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button onClick={() => alert("Préférences de notifications appliquées !")} className="flex items-center gap-1.5">
                  <Save size={16} /> Enregistrer
                </Button>
              </div>
            </Card>
          )}

          {/* TAB 5: BACKUP */}
          {activeTab === 'db' && (
            <Card className="space-y-4 max-w-md">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Sauvegarde & Export Base de Données</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Téléchargez l'intégralité de la configuration, des utilisateurs, et des structures d'alertes au format JSON pour archivage de sécurité.
              </p>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button onClick={handleBackupDownload} className="flex items-center gap-1.5">
                  <Download size={16} /> Télécharger l'archive JSON
                </Button>
              </div>
            </Card>
          )}

        </div>
      )}

      {/* CREATE USER MODAL */}
      <Modal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} title="Créer un Nouvel Utilisateur">
        <div className="space-y-4">
          <Input label="Nom Complet" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
          <Input label="Adresse Email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
          <Select 
            label="Rôle"
            value={newUserRole}
            onChange={(e: any) => setNewUserRole(e.target.value)}
            options={[
              { value: 'admin', label: 'Administrateur (Accès Total)' },
              { value: 'agent', label: 'Agent Immobilier' },
              { value: 'comptable', label: 'Comptable' },
              { value: 'lecture_seule', label: 'Lecture Seule' }
            ]}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsAddUserOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateUser}>Créer</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
export default Parametres;
