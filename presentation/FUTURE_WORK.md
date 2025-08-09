# Évolutions Futures et Vision du Projet

Une application réussie est une application qui évolue. Ce document présente une feuille de route de fonctionnalités et d'améliorations potentielles qui pourraient être implémentées à l'avenir pour enrichir la plateforme et répondre à de nouveaux besoins.

---

## 1. Priorité Haute : Évolution du Stockage vers une Solution Cloud

L'application a déjà franchi une étape majeure en externalisant les images de la base de données vers le système de fichiers du serveur. La prochaine évolution logique est de migrer ce stockage vers un service cloud dédié pour atteindre une scalabilité et une robustesse de niveau supérieur.

- **Objectif** : Rendre l'application "stateless" en déplaçant le stockage des fichiers du disque local du serveur vers un service d'objets cloud (comme **Firebase Storage**, **AWS S3**, ou **Cloudinary**).
- **Implémentation** : Modifier le backend pour que les fichiers téléversés soient envoyés directement au service cloud, qui renverra une URL à stocker dans la base de données.
- **Bénéfices** :
  - **Scalabilité Horizontale** : Permet de déployer l'application sur plusieurs serveurs sans problème de synchronisation des fichiers.
  - **Durabilité et Fiabilité** : Profiter de la redondance et de la robustesse des fournisseurs de services cloud.
  - **Performance Améliorée** : Les fichiers sont servis via des Réseaux de Diffusion de Contenu (CDN), accélérant le chargement pour les utilisateurs du monde entier.
  - **Séparation des Préoccupations** : La gestion des fichiers est déléguée à un service spécialisé.

---

## 2. Portail des Parents

Créer un quatrième type de rôle et un portail dédié aux parents/tuteurs.

- **Objectif** : Impliquer davantage les parents dans le suivi de la scolarité de leurs enfants.
- **Implémentation** :
  - Lier les comptes parents aux profils des élèves.
  - Créer une interface simple et sécurisée.
- **Fonctionnalités Potentielles** :
  - **Consultation des Notes et des Absences** : Un aperçu en temps réel de la performance académique et de l'assiduité de leur(s) enfant(s).
  - **Communication** : Un système de messagerie simple pour communiquer avec l'administration ou les professeurs.
  - **Informations Financières** : Consultation de la balance des frais de scolarité et historique des paiements.
  - **Notifications** : Alertes par email ou sur le portail pour les absences, les notes importantes ou les communications de l'école.

---

## 3. Améliorations du Module Financier

Enrichir le module de gestion des paiements.

- **Objectif** : Offrir des outils de comptabilité plus avancés et une meilleure visibilité.
- **Fonctionnalités Potentielles** :
  - **Catégorisation des Frais** : Permettre de définir différents types de frais (scolarité, cantine, transport, livres) au lieu d'un simple MPPA.
  - **Génération de Factures** : Créer des factures PDF détaillées pour chaque paiement ou pour des périodes définies.
  - **Tableau de Bord Financier** : Graphiques plus détaillés sur les revenus, les retards de paiement, et projections.
  - **Intégration de Paiement en Ligne** : Permettre aux parents de payer les frais de scolarité directement via le portail.

---

## 4. Gestion des Salles et des Ressources Matérielles

Étendre la fonctionnalité de l'emploi du temps.

- **Objectif** : Gérer non seulement les salles de classe, mais aussi les équipements.
- **Fonctionnalités Potentielles** :
  - **Calendrier de Réservation de Salles** : Permettre aux professeurs de réserver des salles spécifiques (salle informatique, laboratoire, bibliothèque) pour leurs cours.
  - **Inventaire Matériel** : Suivi du matériel disponible (projecteurs, ordinateurs, etc.) et de son assignation.

---

## 5. Module de Communication Interne

Créer un centre de notifications et d'annonces.

- **Objectif** : Faciliter la communication de l'administration vers les professeurs, les élèves et les parents.
- **Fonctionnalités Potentielles** :
  - **Système d'Annonces** : L'administration peut publier des annonces visibles sur la page d'accueil de chaque portail.
  - **Messagerie Interne** : Un système de messagerie sécurisé entre les différents types d'utilisateurs.
