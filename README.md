# Habitia - Système de Gestion Immobilière Premium

Habitia est une solution SaaS moderne de gestion de parc immobilier destinée aux agences immobilières, administrateurs de biens, propriétaires, et comptables.

---

## 🚀 Stack Technique

- **Monorepo** : Workspaces npm
- **Frontend** : React 18 + TypeScript + Vite + TailwindCSS + Zustand + React Query + React Hook Form + Zod + Recharts + Leaflet (OpenStreetMap)
- **Backend** : Node.js + Express + JWT + bcrypt + PDFKit + Multer
- **Base de données / ORM** : Prisma ORM (configurable pour Supabase / PostgreSQL)
- **Shared Types** : `@habitia/types`

---

## 📂 Structure du Monorepo

```text
/
├── apps/
│   ├── api/            # API Express Backend
│   └── web/            # Application React Frontend
├── packages/
│   └── types/          # Types TypeScript partagés
├── package.json        # Configuration npm Workspaces
└── README.md           # Documentation
```

---

## 🛠️ Démarrage Local

### Prérequis
Vous devez avoir **Node.js (v18+)** et **npm** installés sur votre machine.

### 1. Installation des dépendances
À la racine du projet, lancez :
```bash
npm install
```

### 2. Configuration du Backend
1. Naviguez dans `apps/api/` et configurez votre fichier `.env` :
   ```env
   PORT=5000
   DATABASE_URL="votre_url_supabase_ou_postgresql"
   JWT_SECRET="une_cle_secrete_ultra_securisee"
   FRONTEND_URL="http://localhost:5173"
   ```
2. (Facultatif) Si vous connectez une base de données PostgreSQL réelle, générez et appliquez le schéma Prisma :
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

### 3. Lancement des serveurs de développement
À la racine du projet, vous pouvez lancer les deux serveurs en parallèle :
```bash
npm run dev
```

Ou les démarrer individuellement :
- **Backend API** (sur `http://localhost:5000`) :
  ```bash
  npm run dev:api
  ```
- **Frontend Web** (sur `http://localhost:5173`) :
  ```bash
  npm run dev:web
  ```

---

## 🔑 Identifiants de Démo (Mode Hors-ligne / En-ligne)
L'application possède un mode de secours en mémoire si le serveur API est éteint. Vous pouvez vous connecter avec les identifiants de test suivants :

- **Rôle Administrateur** :
  - **Email** : `admin@habitia.com`
  - **Mot de passe** : `admin123`
- **Rôle Agent** :
  - **Email** : `agent@habitia.com`
  - **Mot de passe** : `agent123`
