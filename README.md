# Your Car Your Way - PoC Chat Temps Réel

[![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-black.svg)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

> Preuve de concept démontrant l'architecture temps réel pour le support client de l'application Your Car Your Way (location de véhicules internationale).

## 📋 Vue d'ensemble

Ce PoC implémente un système de chat temps réel entre clients et agents de support, utilisant une architecture événementielle basée sur Socket.IO. Il valide les choix architecturaux documentés dans l'Architecture Definition Document.

**Fonctionnalités démontrées :**
- Communication bidirectionnelle temps réel (WebSocket)
- Authentification JWT avec vérification au handshake Socket.IO
- File d'attente des demandes clients
- Attribution automatique des agents disponibles
- Persistance des conversations en base de données PostgreSQL
- Gestion propre des connexions/déconnexions
- Interface client et agent séparées

## 🏗️ Architecture technique

```
┌─────────────┐         WebSocket/REST           ┌─────────────┐
│   Frontend  │ ←──────────────────────────────→ │   Backend   │
│     React   │           Socket.IO              │  Node.js    │
│     Vite    │                                  │  Express    │
└─────────────┘                                  └──────┬──────┘
                                                        │
                                                        │ pg
                                                        ▼
                                                 ┌─────────────┐
                                                 │ PostgreSQL  │
                                                 └─────────────┘
```

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (version LTS recommandée, 18+ minimum)
- **npm** (généralement inclus avec Node.js)
- **PostgreSQL** (18+ recommandé)
- **Git** (pour cloner le dépôt)

Vérification des versions installées :
```bash
node --version   # v22.x.x ou supérieur
npm --version    # 9.x.x ou supérieur
psql --version   # PostgreSQL 18+
```

## 🚀 Installation et démarrage

### 1️⃣ Cloner le dépôt

```bash
git clone <URL_DU_DEPOT>
cd <NOM_DU_DEPOT>
```

### 2️⃣ Configuration de la base de données PostgreSQL

**Créer la base de données et l'utilisateur :**

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer l'utilisateur et la base de données (exemple)
CREATE USER ycyw WITH PASSWORD 'ycyw';
CREATE DATABASE ycyw OWNER ycyw;

# Se connecter à la nouvelle base
\c ycyw

# Sortir de psql
\q
```

**Initialiser le schéma :**

```bash
# Importer le schéma de base de données
psql -U ycyw -d ycyw -f database.sql
```

Vérification :
```bash
psql -U ycyw -d ycyw -c "\dt"
# Doit afficher 13 tables : countries, users, password_reset_tokens,
# agencies, vehicle_categories, vehicles, pricing_rules, bookings,
# conversations, messages, video_sessions, notifications
```

### 3️⃣ Installation des dépendances

**Backend :**
```bash
cd back
npm install
```

**Frontend :**
```bash
cd ../front
npm install
```

### 4️⃣ Configuration des variables d'environnement

Copier le fichier `.env.example` dans le dossier `back/` en `back/.env`:
Le fichier `back/.env` est déjà configuré avec les valeurs par défaut (sauf SECRET et PASSWORD) :

```env
SECRET=
DB_HOST=127.0.0.1
DB_NAME=ycyw
DB_USER=ycyw
DB_PASSWORD=
```

⚠️ **Important** : Pour un environnement de production, modifiez :
- `SECRET` : Générez un nouveau secret cryptographique fort
- `DB_PASSWORD` : Utilisez le mot de passe sécurisé de votre utilisateur PostgreSQL

Génération d'un nouveau secret avec OpenSSL (optionnel) :
```bash
openssl rand -hex 32
```

### 5️⃣ Démarrage de l'application

**Terminal 1 - Backend :**
```bash
cd back
npm run dev
```

Sortie attendue :
```
[nodemon] starting `node ./bin/www`
Server listening on port 3000
```

**Terminal 2 - Frontend :**
```bash
cd front
npm run dev
```

Sortie attendue :
```
VITE v7.2.2  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 6️⃣ Accès à l'application

Ouvrez votre navigateur :
- **Interface client** : http://localhost:5173/
- **Backend API** : http://localhost:3000/

## 🧪 Tester le PoC

### Scénario de test complet

**1. Créer des comptes :**

Le schéma de base de données inclut 2 utilisateurs de démonstration :

- **Agent** (is_support = true)
- **Client** (is_support = false)

**2. Tester le chat :**

a) **Connexion client** :
   - Ouvrez http://localhost:5173/ dans une fenêtre de navigation privée
   - Connectez-vous en tant que client
   - Cliquez sur "Démarrer une conversation"

b) **Connexion agent** :
   - Ouvrez http://localhost:5173/ dans une autre fenêtre/navigateur
   - Connectez-vous en tant que agent
   - La conversation du client devrait apparaître dans la file d'attente
   - Cliquez sur "Rejoindre" pour accepter la conversation

c) **Échanger des messages** :
   - Envoyez des messages depuis les deux interfaces

d) **Clôturer la conversation** :
   - L'agent peut cliquer sur "Terminer" pour clôturer la session
   - Vérifiez que les deux parties sont notifiées

## 🔧 Scripts disponibles

### Backend (`back/`)

| Script        | Commande      | Description                                       |
|---------------|---------------|---------------------------------------------------|
| Développement | `npm run dev` | Lance le serveur avec nodemon (rechargement auto) |
| Production    | `npm start`   | Lance le serveur en mode production               |

### Frontend (`front/`)

| Script           | Commande          | Description                            |
|------------------|-------------------|----------------------------------------|
| Développement    | `npm run dev`     | Lance le serveur Vite (HMR activé)     |
| Build production | `npm run build`   | Compile l'application pour production  |
| Preview build    | `npm run preview` | Prévisualise le build de production    |
| Lint             | `npm run lint`    | Vérifie la qualité du code avec ESLint |

## 🛠️ Technologies utilisées

### Frontend
- **React 19.2.0** - Bibliothèque UI avec dernières fonctionnalités
- **Vite 7.2.2** - Build tool ultra-rapide avec HMR
- **Socket.IO Client 4.8.1** - Client WebSocket avec fallback

### Backend
- **Node.js** - Runtime JavaScript serveur
- **Express 4.21.2** - Framework web minimaliste
- **Socket.IO 4.8.1** - WebSocket avec reconnexion automatique
- **jsonwebtoken 9.0.2** - Authentification JWT
- **pg 8.16.3** - Client PostgreSQL natif
- **bcrypt** - Hashage sécurisé des mots de passe
- **cors 2.8.5** - Gestion CORS pour API
- **dotenv 17.2.3** - Variables d'environnement

### Base de données
- **PostgreSQL** - Base relationnelle avec support JSONB

**Note** : Ce PoC démontre la faisabilité technique de l'architecture temps réel. Pour une application production, des fonctionnalités supplémentaires seraient nécessaires (rate limiting, monitoring, tests automatisés, CI/CD, etc.).
