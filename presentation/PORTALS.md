# Description des Portails Utilisateurs

L'application est structurée autour de portails distincts, chacun offrant une expérience et des outils adaptés aux besoins spécifiques de ses utilisateurs.

---

## 1. Portail Super Administrateur (`Super Admin` & `Délégué`)

C'est le poste de pilotage de toute la plateforme. Il est conçu pour une supervision globale et une gestion centralisée de toutes les instances scolaires.

### Expérience Utilisateur
L'interface est axée sur l'efficacité et la vue d'ensemble. Le Super Administrateur dispose d'un tableau de bord avec des statistiques clés, d'outils de gestion directe des instances et d'un centre de communication unifié.

### Fonctionnalités Clés
- **Tableau de Bord Global** : Visualisation en temps réel du nombre total d'instances, d'utilisateurs et d'élèves.
- **Gestion des Instances** : Une interface unique pour créer, activer/suspendre, et modifier les détails de chaque école. Le `Super Admin` principal est le seul à pouvoir supprimer une instance.
- **Gestion des Super Admins (`Super Admin` principal uniquement)** : Créer et gérer les comptes des administrateurs délégués.
- **Centre de Support Intégré** : Hub de messagerie pour recevoir et répondre aux demandes de support de tous les administrateurs d'école.
- **Système d'Annonces** : Publication d'annonces globales ou ciblées.
- **Maintenance de la Plateforme** : Outils de sauvegarde flexibles (base de données, fichiers, ou complète).

---

## 2. Portail d'Administration d'Instance (`Admin` & `Standard`)

C'est le centre de commande d'une école spécifique. L'accès aux fonctionnalités est dicté par les permissions de l'utilisateur.

### Expérience Utilisateur
Le **tableau de bord** est le point d'entrée principal, présentant des cartes d'accès rapide aux modules les plus importants (Gestion des Élèves, Professeurs, Emploi du temps, Bulletins, etc.). L'accès à chaque carte est conditionné par les permissions de l'utilisateur.

### Fonctionnalités Clés (selon les permissions)
- **Gestion des Élèves et des Inscriptions**.
- **Gestion Financière et Rapports**.
- **Pages de Gestion Dédiées** : Interfaces claires pour la **Gestion des Professeurs**, la **Gestion de l'Emploi du Temps** et la **Gestion du Portail Élève**.
- **Panneau d'Administration** : Un lien "Administration" mène à une page de paramètres plus profonds (Années, Périodes, Matières, Rôles & Permissions).
- **Contact & Support** : Un onglet dédié pour communiquer directement avec le Super Administrateur.

---

## 3. Portail des Professeurs (`Teacher`)

Cet portail est l'espace de travail numérique du professeur, épuré et axé sur les tâches quotidiennes de gestion de classe.

### Fonctionnalités Clés
- **Tableau de Bord** : Vue des cours assignés ("Mes Cours") et de l'emploi du temps personnel.
- **Gestion de Classe** : Outils pour faire l'appel, gérer le carnet de notes et partager des ressources pédagogiques.
- **Sécurité** : Chaque professeur peut changer son propre mot de passe.

---

## 4. Portail des Élèves (`Student`)

Ce portail est conçu pour être un hub d'information clair et facile à utiliser pour les élèves.

### Fonctionnalités Clés
- **Consultation des Notes et de l'Emploi du Temps**.
- **Accès aux Ressources Pédagogiques** partagées par les professeurs.
- **Sécurité du Compte** avec changement de mot de passe.
