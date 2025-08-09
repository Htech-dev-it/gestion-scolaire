# Sécurité des Données et Niveaux d'Accès

La sécurité est une priorité fondamentale de la plateforme. Une architecture robuste a été mise en place pour protéger les données sensibles et garantir une séparation hermétique entre les différentes instances scolaires.

## 1. Technologies de Sécurité

- **Authentification par JWT (JSON Web Tokens)**
  - Chaque connexion génère un token sécurisé, requis pour chaque requête au serveur.
  - Les tokens ont une durée de vie limitée (8 heures) pour minimiser les risques.
  - Techniquement, ce "bracelet" (le token JWT) est une chaîne de caractères chiffrée qui contient trois informations clés :
    - Qui vous êtes (votre id d'utilisateur, votre rôle superadmin, et l'ID de l'école instance_id).
    - Ce que vous avez le droit de faire (votre rôle détermine vos permissions).
    - Jusqu'à quand votre accès est valide (la fameuse date d'expiration).

- **Hachage des Mots de Passe avec `bcrypt`**
  - **Aucun mot de passe n'est jamais stocké en clair**. Ils sont transformés en "hashs" irréversibles.

## 2. Isolation des Données (Cloisonnement Multi-Instances)

Le principe de sécurité le plus important de cette architecture est la **séparation stricte des données**.
- **`instance_id`** : Chaque information dans la base de données (élève, professeur, note, etc.) est obligatoirement liée à un `instance_id` qui identifie l'école à laquelle elle appartient.
- **Requêtes Sécurisées** : Toutes les requêtes effectuées par un utilisateur (admin, professeur, élève) sont automatiquement et systématiquement filtrées par l'`instance_id` associée à son compte.
- **Conséquence** : Il est **techniquement impossible** pour un utilisateur de l'école A d'accéder, même accidentellement, à une quelconque information de l'école B.

## 3. Contrôle d'Accès Basé sur les Rôles (RBAC)

L'application utilise un système de rôles stricts pour compartimenter l'accès aux fonctionnalités.

### a) Rôle : `Super Admin`
C'est le rôle le plus élevé, avec un contrôle total sur l'ensemble de la plateforme. Il n'est lié à aucune instance spécifique.

**Permissions Clés :**
- Créer, configurer, suspendre et supprimer des instances (écoles).
- Accéder aux données de n'importe quelle instance à des fins de support.
- Gérer les annonces globales et ciblées.
- Effectuer des sauvegardes complètes de la plateforme.
- Communiquer avec les administrateurs de chaque instance via le système de support.

### b) Rôle : `Admin` (Administrateur d'Instance)
L'administrateur a un accès **total aux données de son instance**, mais est strictement confiné à celle-ci.

**Permissions Clés :**
- Gérer toutes les données de son école (élèves, professeurs, notes, etc.).
- Gérer les comptes utilisateurs de son instance.
- Configurer les paramètres de son école.
- **Ne peut PAS** voir ou interagir avec les données d'une autre instance.

### c) Rôle : `Standard`
Destiné au personnel administratif d'une instance. Il donne un accès large aux fonctionnalités de gestion quotidienne, mais restreint l'accès aux paramètres critiques.

**Permissions Clés :**
- Gérer les élèves et les paiements.
- Générer des bulletins et des rapports.
- **N'a PAS accès** aux paramètres avancés de l'instance (gestion des utilisateurs, configuration des années, etc.).

### d) Rôle : `Teacher` (Professeur)
L'accès est **strictement limité aux classes et matières qui lui sont assignées** au sein de son instance.

### e) Rôle : `Student` (Élève)
L'accès est **limité à ses données personnelles** au sein de son instance.

---

## 4. Journal d'Activité (`Audit Log`)

Les actions critiques des `Super Admins` et des `Admins` sont enregistrées, fournissant une traçabilité complète des opérations sur la plateforme et au sein de chaque instance.