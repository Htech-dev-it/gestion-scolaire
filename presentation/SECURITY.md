# Sécurité des Données et Niveaux d'Accès

La sécurité est une priorité fondamentale de la plateforme. Une architecture robuste a été mise en place pour protéger les données sensibles et garantir une séparation hermétique entre les différentes instances scolaires.

## 1. Technologies de Sécurité

- **Authentification par JWT (JSON Web Tokens)**
  - Chaque connexion génère un token sécurisé, requis pour chaque requête au serveur.
  - Les tokens ont une durée de vie limitée (8 heures) pour minimiser les risques.

- **Hachage des Mots de Passe avec `bcrypt`**
  - **Aucun mot de passe n'est jamais stocké en clair**. Ils sont transformés en "hashs" irréversibles.

## 2. Isolation des Données (Cloisonnement Multi-Instances)

Le principe de sécurité le plus important de cette architecture est la **séparation stricte des données**.
- **`instance_id`** : Chaque information dans la base de données (élève, professeur, note, etc.) est obligatoirement liée à un `instance_id` qui identifie l'école à laquelle elle appartient.
- **Requêtes Sécurisées** : Toutes les requêtes effectuées par un utilisateur (admin, professeur, élève) sont automatiquement et systématiquement filtrées par l'`instance_id` associée à son compte.
- **Conséquence** : Il est **techniquement impossible** pour un utilisateur de l'école A d'accéder, même accidentellement, à une quelconque information de l'école B.

## 3. Contrôle d'Accès Basé sur les Rôles (RBAC)

L'application utilise un système de rôles stricts pour compartimenter l'accès aux fonctionnalités.

### a) Rôles de Supervision (Niveau Plateforme)

-   **`Super Admin`** : Le rôle le plus élevé, avec un contrôle total sur l'ensemble de la plateforme. Non lié à une instance. **Seul ce rôle peut supprimer des instances ou gérer les autres Super Admins.**
-   **`Super Admin Délégué`** : Un rôle de supervision avec des permissions étendues (créer/gérer des instances, support, annonces) mais **sans accès aux actions les plus destructives** (suppression d'instance, gestion des autres super admins, suppression des journaux d'activité).

### b) Rôles d'Instance (Niveau École)

-   **`Admin` (Administrateur Principal d'Instance)** : Accès total aux données et aux paramètres de son instance, mais confiné à celle-ci. Ce rôle est implicitement accordé à l'utilisateur `admin` intégré et à tout utilisateur ayant le rôle personnalisé "Administrateur Principal".
-   **`Standard`** : Rôle de base pour le personnel administratif. Ce rôle n'a aucune permission par défaut. Son accès est entièrement défini par les **rôles personnalisés** (ex: Comptable, Secrétaire) qui lui sont assignés par un `Admin`.
-   **`Teacher` (Professeur)** : L'accès est **strictement limité aux classes et matières qui lui sont assignées**.
-   **`Student` (Élève)** : L'accès est **limité à ses données personnelles**.

## 4. Rôles Personnalisés et Permissions Granulaires

L'administrateur de chaque instance peut créer des rôles sur mesure (ex: "Comptable") et leur assigner des permissions très spécifiques (ex: "Mettre à jour les paiements", "Voir les rapports financiers"). Cela permet d'appliquer le **principe de sécurité du moindre privilège** et de s'adapter parfaitement à l'organisation de chaque école.

## 5. Journal d'Activité (`Audit Log`)

Les actions critiques des `Super Admins` et des `Admins` sont enregistrées, fournissant une traçabilité complète des opérations sur la plateforme et au sein de chaque instance.
