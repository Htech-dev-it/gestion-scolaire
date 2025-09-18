# ScolaLink : Plateforme de Gestion Scolaire Multi-Instances

Ce document sert de guide complet pour l'installation, l'utilisation, l'architecture et la maintenance de la plateforme de gestion scolaire.

## Table des Matières
1. [🌟 Vision et Objectif](#1--vision-et-objectif)
2. [🛠️ Technologies Utilisées](#2--technologies-utilisées)
3. [🚀 Guide d'Installation et de Lancement](#3--guide-dinstallation-et-de-lancement)
4. [⚙️ Guide de Configuration Initiale (pour l'Admin)](#4--guide-de-configuration-initiale-pour-ladmin)
5. [🏛️ Description des Portails Utilisateurs](#5--description-des-portails-utilisateurs)
6. [🛡️ Sécurité des Données et Niveaux d'Accès](#6--sécurité-des-données-et-niveaux-daccès)
7. [⚡ Performance et Optimisation](#7--performance-et-optimisation)
8. [💾 Stratégie de Sauvegarde et de Restauration](#8--stratégie-de-sauvegarde-et-de-restauration)
9. [🔮 Évolutions Futures et Vision du Projet](#9--évolutions-futures-et-vision-du-projet)

---

## 1. 🌟 Vision et Objectif

Ce projet a évolué d'une simple application à une **plateforme SaaS (Software as a Service) multi-instances**, complète et moderne. Elle est conçue pour offrir une solution de gestion centralisée à un ensemble d'établissements scolaires, tout en garantissant une séparation et une sécurité totales de leurs données.

L'objectif est de fournir un outil puissant et évolutif pour :
- **Un Contrôle Centralisé** : Permettre à un Super Administrateur de déployer, gérer et superviser plusieurs écoles depuis un unique tableau de bord.
- **L'Autonomie des Établissements** : Offrir à chaque école (instance) une application de gestion complète, personnalisable et indépendante.
- **Révolutionner la Communication et le Support** : Intégrer un canal de communication direct entre les administrateurs des écoles et le support de la plateforme.
- **Garantir Performance et Scalabilité** : Assurer que la plateforme reste rapide et fiable à mesure que le nombre d'écoles et d'utilisateurs augmente.

---

## 2. 🛠️ Technologies Utilisées

L'application est construite sur une architecture **Full-Stack robuste et moderne**, utilisant des technologies reconnues pour leur fiabilité et leur performance.

- **Frontend (Interface Utilisateur)**
  - **React** & **TypeScript** : Pour des interfaces utilisateur sûres, réactives et maintenables.
  - **TailwindCSS** : Pour un design moderne et une interface esthétique.
  - **React Router** : Pour une navigation fluide au sein de l'application.
  - **Progressive Web App (PWA)** : Capacités hors ligne complètes avec Service Workers, Cache API, et IndexedDB.

- **Backend (Serveur)**
  - **Node.js** & **Express.js** : Pour une API serveur rapide, efficace et scalable.
  - **PostgreSQL** : Système de gestion de base de données relationnelle puissant, reconnu pour sa robustesse et sa capacité à gérer des relations de données complexes.

- **Sécurité**
  - **JWT (JSON Web Tokens)** : Pour une authentification sécurisée.
  - **bcrypt.js** : Pour un hachage robuste des mots de passe.
  - **Cloisonnement des Données** : Chaque donnée en base est strictement associée à une `instance_id`, garantissant une séparation hermétique entre les écoles.

---

## 3. 🚀 Guide d'Installation et de Lancement

Suivez ces étapes pour mettre en place l'environnement de développement local.

### ✅ Étape 1 : Prérequis

Assurez-vous que les logiciels suivants sont installés sur votre machine :

1.  **Node.js** : Essentiel pour faire fonctionner le frontend et le backend. [Télécharger Node.js](https://nodejs.org/).
2.  **PostgreSQL** : Le système de gestion de base de données. [Télécharger PostgreSQL](https://www.postgresql.org/download/).
    - Durant l'installation, notez bien le mot de passe que vous définissez pour l'utilisateur `postgres`.
3.  **(Optionnel mais recommandé) pgAdmin** : Une interface graphique pour gérer votre base de données, généralement incluse avec l'installateur de PostgreSQL.

### ⚙️ Étape 2 : Configuration de la Base de Données

1.  Ouvrez `pgAdmin` ou `psql`.
2.  Créez une nouvelle base de données. Nommez-la `arawak`.
3.  Créez un nouveau fichier `.env` dans le dossier `backend/` avec le contenu suivant, en remplaçant par vos informations :
    ```env
    # --- Configuration Base de Données ---
    PGHOST=localhost
    PGPORT=5432
    PGDATABASE=arawak
    PGUSER=postgres
    PGPASSWORD=votre_mot_de_passe_postgres

    # --- Configuration Email (Brevo) ---
    # Récupéré depuis votre compte Brevo > SMTP & API
    BREVO_SMTP_LOGIN="94e0f0001@smtp-brevo.com"
    BREVO_SMTP_KEY="f2RmsXSYA9dzLqWP"
    EMAIL_FROM="votre_adresse_email_validée_sur_brevo@exemple.com"
    ```

### ⭐️ Étape 3 : Configuration du PATH pour `pg_dump` (TRÈS IMPORTANT)

Pour que la fonctionnalité de sauvegarde fonctionne, le serveur Node.js doit pouvoir exécuter la commande `pg_dump`. Pour cela, vous devez ajouter le dossier des outils PostgreSQL à la variable d'environnement `PATH` de votre système.

1.  **Trouvez le dossier `bin` de PostgreSQL** :
    - Il se trouve généralement dans `C:\Program Files\PostgreSQL\<version>\bin`.
    - Par exemple : `C:\Program Files\PostgreSQL\16\bin`.
    - Vérifiez que ce dossier contient bien `pg_dump.exe`.

2.  **Ajoutez ce chemin au PATH de Windows** :
    - Appuyez sur la touche `Windows` et tapez `env`.
    - Cliquez sur **"Modifier les variables d'environnement système"**.
    - Dans la fenêtre qui s'ouvre, cliquez sur le bouton **"Variables d'environnement..."**.
    - Dans la section "Variables système", trouvez la variable `Path` et cliquez sur **"Modifier..."**.
    - Cliquez sur **"Nouveau"** et collez le chemin complet que vous avez trouvé à l'étape 1 (ex: `C:\Program Files\PostgreSQL\16\bin`).
    - Cliquez sur **OK** sur toutes les fenêtres pour valider.

3.  **Redémarrez votre terminal** :
    - **Fermez et rouvrez TOUS vos terminaux** (y compris celui intégré à VS Code). C'est la seule façon pour que le nouveau `PATH` soit pris en compte.

### 📦 Étape 4 : Installation des Dépendances

1.  **Dépendances du Frontend :** Ouvrez un terminal à la **racine du projet** et exécutez : `npm install`
2.  **Dépendances du Backend :** Naviguez vers le dossier `backend` et répétez l'opération : `cd backend && npm install`

### 🏁 Étape 5 : Lancement de l'Application

1.  **Lancer le Serveur Backend :**
    - Ouvrez un terminal dans le dossier `backend`.
    - Exécutez : `npm start`
    - Laissez ce terminal ouvert. Le script d'initialisation créera la structure de la base de données, l'instance par défaut et les comptes par défaut.

2.  **Lancer l'Interface Utilisateur (Frontend) :**
    - Ouvrez un **nouveau terminal** à la **racine du projet**.
    - Exécutez : `npm run dev`
    - Le site web sera accessible à l'URL affichée (généralement `http://localhost:5173`).

> **Action de sécurité cruciale :**
> 1.  Connectez-vous avec chaque compte et changez immédiatement le mot de passe par défaut via l'onglet **Sécurité** de leur tableau de bord respectif.

---

## 4. ⚙️ Guide de Configuration Initiale (pour l'Admin)

Ce guide accompagne l'administrateur d'une instance dans les premières étapes de configuration pour une nouvelle année scolaire. Il est recommandé de suivre ces étapes dans l'ordre pour une mise en place cohérente.

Toutes ces actions se déroulent principalement depuis le **panneau d'Administration**.

1.  **Créer la Nouvelle Année Scolaire** (Onglet "Années").
2.  **Définir les Périodes Académiques** pour cette année (Onglet "Périodes").
3.  **Gérer la Liste des Matières** de l'établissement (Onglet "Matières").
4.  **Définir le Programme Scolaire** en liant les matières aux classes (Onglet "Programme").
5.  **Gérer les Professeurs** en créant leurs profils depuis la page **"Gestion des Professeurs"** (accessible via le tableau de bord).
6.  **Assigner les Cours aux Professeurs** via le bouton "Gérer les assignations" sur la page de gestion des professeurs.

---

## 5. 🏛️ Description des Portails Utilisateurs

L'application est structurée autour de portails distincts, chacun offrant une expérience et des outils adaptés.

-   **Portail Super Administrateur (`Super Admin` & `Délégué`)** : Le poste de pilotage de la plateforme pour une supervision globale et une gestion centralisée.
-   **Portail d'Administration d'Instance (`Admin` & `Standard`)** : Le centre de commande d'une école, avec des accès définis par un système de permissions granulaires.
-   **Portail des Professeurs (`Teacher`)** : L'espace de travail numérique du professeur, axé sur la gestion de classe.
-   **Portail des Élèves (`Student`)** : Un hub d'information clair et facile à utiliser pour les élèves.

---

## 6. 🛡️ Sécurité des Données et Niveaux d'Accès

La sécurité est une priorité fondamentale de la plateforme, assurée par un système de **Contrôle d'Accès Basé sur les Rôles (RBAC)** et un cloisonnement strict des données.

- **Isolation des Données (Cloisonnement Multi-Instances)** via un `instance_id`.
- **Rôles Hiérarchiques** :
    - `Super Admin` : Contrôle total sur la plateforme.
    - `Super Admin Délégué` : Permissions étendues mais restreintes sur les actions destructives.
    - `Admin` (Administrateur d'Instance) : Accès total aux données de son instance.
    - `Standard` : Rôle de base pour le personnel, dont les accès sont définis par des permissions granulaires assignées via des **rôles personnalisés** (ex: Comptable, Secrétaire).
    - `Teacher` & `Student` : Accès limités à leurs données pertinentes.
- **Journal d'Activité (`Audit Log`)** : Traçabilité des actions critiques.

---

## 7. ⚡ Performance et Optimisation

- **Indexation Avancée** de la base de données pour des requêtes rapides.
- **Pagination Côté Serveur** pour gérer de grands volumes de données.
- **Stockage Externe des Fichiers** pour une base de données allégée.
- **Chargement Différé (`Lazy Loading`)** pour un chargement initial plus rapide.
- **Capacités Hors Ligne (PWA)** : Grâce à un Service Worker, l'application met en cache les données et l'interface, permettant une utilisation fluide même sans connexion. Les modifications effectuées hors ligne sont sauvegardées et synchronisées automatiquement dès que la connexion est rétablie.

---

## 8. 💾 Stratégie de Sauvegarde et de Restauration

La fonctionnalité de sauvegarde est intégrée dans l'interface du **Super Administrateur** (onglet "Sauvegarde").
- **Sauvegarde SQL** : Fichier `.sql` contenant les données de toutes les instances.
- **Sauvegarde des Fichiers** : Fichier `.zip` contenant les fichiers téléversés.
- **Sauvegarde Complète** : `.zip` combinant la base de données et les fichiers.

---

## 9. 🔮 Évolutions Futures et Vision du Projet

- **Stockage Cloud** : Migrer le stockage des fichiers vers un service cloud (Firebase Storage, AWS S3).
- **Portail des Parents** : Créer un portail dédié aux parents pour le suivi scolaire.
- **Améliorations du Module Financier** : Gestion de frais multiples et intégration du paiement en ligne.
- **Module de Communication Interne** au sein de chaque école.