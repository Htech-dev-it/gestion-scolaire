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
    PGHOST=localhost
    PGPORT=5432
    PGDATABASE=arawak
    PGUSER=postgres
    PGPASSWORD=votre_mot_de_passe_postgres
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

Ce guide vous accompagne dans les premières étapes cruciales de la configuration de l'application pour une nouvelle année scolaire. Il est recommandé de suivre ces étapes dans l'ordre pour une mise en place cohérente.

Toutes ces actions se déroulent dans le **Tableau de Bord Admin**.

### Étape 1 : Créer la Nouvelle Année Scolaire

C'est la toute première chose à faire.
1.  Allez dans l'onglet **"Années"**.
2.  Dans le champ "Ajouter une année scolaire", entrez la nouvelle année au format `AAAA-AAAA` (par exemple, `2024-2025`).
3.  Cliquez sur **"Ajouter"**.
4.  La nouvelle année apparaît dans la liste. Cliquez sur **"Définir comme actuelle"** à côté d'elle. Le bandeau vert "Actuelle" confirme votre choix.

> **Pourquoi c'est important ?** Toutes les données (inscriptions, notes, etc.) sont liées à l'année scolaire "actuelle".

### Étape 2 : Définir les Périodes Académiques

Une fois l'année créée, vous devez la diviser en périodes (trimestres, semestres, etc.).
1.  Allez dans l'onglet **"Périodes"**.
2.  Assurez-vous que la nouvelle année scolaire est bien sélectionnée dans la liste déroulante.
3.  Dans le champ "Ajouter une période", entrez le nom de la première période (par exemple, `Trimestre 1`).
4.  Cliquez sur **"Ajouter"**.
5.  Répétez l'opération pour toutes les périodes de l'année (ex: `Trimestre 2`, `Trimestre 3`).

### Étape 3 : Gérer la Liste des Matières

Assurez-vous que toutes les matières enseignées dans l'école sont présentes dans le système.
1.  Allez dans l'onglet **"Matières"**.
2.  Consultez la liste. Si une matière manque, ajoutez-la en utilisant le formulaire en haut.
3.  Vous pouvez également corriger ou supprimer des matières existantes.

### Étape 4 : Définir le Programme Scolaire

C'est une étape cruciale où vous liez les matières aux classes.
1.  Allez dans l'onglet **"Programme"**.
2.  Sélectionnez une classe dans la liste déroulante (par exemple, `7AF`).
3.  Assignez les matières qui sont enseignées dans cette classe pour l'année en cours.
4.  Une fois une matière assignée, définissez sa **note maximale** pour la période (généralement `100`).
5.  Répétez l'opération pour **chaque classe**.

### Étape 5 : Gérer les Professeurs et leurs Assignations

1.  Allez dans l'onglet **"Professeurs"**.
2.  Créez les profils pour tous les professeurs si ce n'est pas déjà fait.
3.  Pour chaque professeur, cliquez sur **"Gérer les assignations"**.
4.  Cochez les cases correspondant aux cours que ce professeur enseignera pour l'année en cours.
5.  Cliquez sur **"Sauvegarder"**.

---

## 5. 🏛️ Description des Portails Utilisateurs

L'application est structurée autour de portails distincts, chacun offrant une expérience et des outils adaptés.

### 5.1. Portail Super Administrateur (`Super Admin`)
Le poste de pilotage de toute la plateforme pour une supervision globale et une gestion centralisée.
- **Tableau de Bord Global** : Statistiques clés (nombre d'instances, utilisateurs, etc.).
- **Gestion des Instances** : Créer, activer/suspendre, et modifier les détails de chaque école.
- **Centre de Support Intégré** : Hub de messagerie pour répondre aux demandes des administrateurs d'école.
- **Système d'Annonces** : Publication d'annonces globales ou ciblées.
- **Maintenance** : Outils de sauvegarde de la plateforme.

### 5.2. Portail d'Administration d'Instance (`Admin` & `Standard`)
Le centre de commande d'une école spécifique.
- **Gestion Complète** : Élèves, inscriptions, finances, bulletins, professeurs, emploi du temps, etc.
- **Configuration Académique** : Années, périodes, matières, programme.
- **Contact & Support** : Canal de communication direct avec le Super Administrateur.

### 5.3. Portail des Professeurs (`Teacher`)
L'espace de travail numérique du professeur, axé sur la gestion de classe.
- **Tableau de Bord** : Vue des cours assignés et de l'emploi du temps personnel.
- **Gestion de Classe** : Outils pour faire l'appel, gérer le carnet de notes et partager des ressources pédagogiques.

### 5.4. Portail des Élèves (`Student`)
Un hub d'information clair et facile à utiliser pour les élèves.
- **Consultation** : Notes, emploi du temps et ressources pédagogiques.
- **Sécurité** : Chaque élève peut changer son propre mot de passe.

---

## 6. 🛡️ Sécurité des Données et Niveaux d'Accès

La sécurité est une priorité fondamentale de la plateforme.

### 6.1. Isolation des Données (Cloisonnement Multi-Instances)
- **`instance_id`** : Chaque information dans la base de données (élève, professeur, note, etc.) est obligatoirement liée à un `instance_id`.
- **Requêtes Sécurisées** : Toutes les requêtes sont automatiquement filtrées par l'`instance_id` de l'utilisateur connecté.
- **Conséquence** : Il est **techniquement impossible** pour un utilisateur de l'école A d'accéder aux informations de l'école B.

### 6.2. Contrôle d'Accès Basé sur les Rôles (RBAC)
- **`Super Admin`** : Contrôle total sur l'ensemble de la plateforme. Non lié à une instance.
- **`Admin` (Administrateur d'Instance)** : Accès total aux données de son instance, mais confiné à celle-ci.
- **`Standard`** : Personnel administratif d'une instance avec accès aux fonctionnalités de gestion quotidienne.
- **`Teacher`** : Accès limité aux classes et matières qui lui sont assignées.
- **`Student`** : Accès limité à ses données personnelles.

### 6.3. Journal d'Activité (`Audit Log`)
Les actions critiques des `Super Admins` et des `Admins` sont enregistrées, fournissant une traçabilité complète.

---

## 7. ⚡ Performance et Optimisation

### 7.1. Stratégies Backend et Base de Données
- **Indexation Avancée** : Des index sur l'`instance_id` et les colonnes fréquemment utilisées garantissent des requêtes quasi instantanées.
- **Pagination Côté Serveur** : Le serveur ne renvoie que des "pages" de données (ex: 25 élèves à la fois), évitant de surcharger le navigateur.
- **Stockage Externe des Fichiers** : Les images sont sauvegardées sur le système de fichiers, allégeant la base de données.
- **Nettoyage Automatique des Journaux** : Un processus automatisé supprime les journaux de plus de 30 jours pour maîtriser la taille de la base de données.

### 7.2. Stratégies Frontend
- **Chargement Différé (`Lazy Loading`)** : Les composants des portails sont téléchargés uniquement lorsque l'utilisateur y accède, accélérant le chargement initial.
- **Limitation du Rendu** : L'interface n'affiche que de petites quantités de données à la fois, garantissant une fluidité constante.

---

## 8. 💾 Stratégie de Sauvegarde et de Restauration

La fonctionnalité de sauvegarde est intégrée dans l'interface du **Super Administrateur** (onglet "Sauvegarde").
- **Sauvegarde SQL** : Fichier `.sql` contenant les données de toutes les instances.
- **Sauvegarde des Fichiers** : Fichier `.zip` contenant les fichiers téléversés.
- **Sauvegarde Complète** : `.zip` combinant la base de données et les fichiers.

### Procédure de Restauration des Données
- **Restauration d'une Sauvegarde SQL (.sql)**
  ```bash
  psql -h localhost -U postgres -d arawak < chemin\vers\votre\backup.sql
  ```
- **Restauration d'une Sauvegarde Complète (.zip)**
  1.  **Fichiers** : Décompressez le `.zip` et copiez `uploads` dans `backend/uploads/`.
  2.  **Base de Données** :
      ```bash
      pg_restore -h localhost -U postgres -d arawak --clean "chemin\vers\votre\database.dump"
      ```

---

## 9. 🔮 Évolutions Futures et Vision du Projet

- **Stockage Cloud** : Migrer le stockage des fichiers vers un service cloud (Firebase Storage, AWS S3) pour une scalabilité et une fiabilité accrues.
- **Portail des Parents** : Créer un portail dédié aux parents pour le suivi des notes, des absences et la communication.
- **Améliorations du Module Financier** : Gestion de frais multiples (cantine, transport), génération de factures et intégration du paiement en ligne.
<<<<<<< HEAD
- **Module de Communication Interne** : Un centre de notifications et d'annonces pour faciliter la communication au sein de chaque école.
=======
- **Module de Communication Interne** : Un centre de notifications et d'annonces pour faciliter la communication au sein de chaque école.
>>>>>>> 0b416be (Ajout des nouvelles modifications)
