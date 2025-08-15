# Guide pour le Super Administrateur

Bienvenue dans le guide du portail Super Administrateur. Ce document vous explique, étape par étape, comment gérer l'ensemble de la plateforme et superviser les différentes instances scolaires.

## Tableau de Bord et Navigation

Votre tableau de bord affiche des statistiques clés (instances, utilisateurs, etc.). Utilisez les onglets en haut pour naviguer entre les différentes sections de gestion.

---

## `Onglet Instances` : Gérer les Écoles

C'est ici que vous gérez le cycle de vie de chaque établissement scolaire.

### Créer une Nouvelle Instance
1.  Sur la droite, remplissez le formulaire **"Créer une Nouvelle Instance"**.
2.  Indiquez le **Nom de l'école**, l'**Email de l'Admin Principal**, et les informations de contact.
3.  Cliquez sur **"Créer l'Instance"**.
4.  Une fenêtre apparaîtra avec les **identifiants temporaires** (`admin` + mot de passe). **Copiez-les et communiquez-les de manière sécurisée** à l'administrateur de la nouvelle école.

### Gérer une Instance Existante
Dans la liste de gauche, chaque instance dispose de plusieurs outils :
-   **Modifier les informations** : Cliquez sur le bouton **"Modifier"** pour mettre à jour les détails (adresse, téléphone, etc.).
-   **Changer le Statut (Actif/Suspendu)** : Utilisez le bouton à bascule pour activer ou suspendre manuellement l'accès à une école.
-   **Planifier une expiration** : Cliquez sur **"Planifier"** pour définir une date de fin d'abonnement. L'instance sera suspendue automatiquement à cette date.
-   **Réinitialiser le mot de passe Admin** : Cliquez sur **"Réinitialiser MDP"** pour générer un nouveau mot de passe temporaire pour un administrateur d'école.
-   **Supprimer une Instance (Action critique)** :
    1.  Cliquez sur le bouton **"Supprimer"**.
    2.  Dans la première fenêtre, vous devrez taper la phrase `SUPPRIMER DÉFINITIVEMENT` pour confirmer votre intention.
    3.  Dans la seconde fenêtre, vous devrez saisir **votre propre mot de passe de Super Administrateur** pour valider cette action irréversible.

---

## `Onglet Annonces` : Communiquer avec les Écoles

1.  **Créez une annonce** en remplissant le formulaire en haut de la page.
2.  **Ciblez l'annonce** :
    -   Laissez sur **"Annonce Globale"** pour qu'elle soit visible par toutes les écoles.
    -   Sélectionnez une école spécifique dans la liste déroulante pour une annonce ciblée.
3.  **Gérez les annonces** : Utilisez les boutons à côté de chaque annonce pour l'activer, la désactiver, la modifier ou la supprimer.

---

## `Onglet Support` : Gérer les Communications

1.  **Définissez les infos de contact** du support pour que les administrateurs d'école puissent vous joindre.
2.  **Consultez les messages** : La liste des instances s'affiche. Un **badge rouge** indique un message non lu.
3.  **Répondez** : Cliquez sur une instance pour ouvrir la conversation et envoyer votre réponse.

---

## `Onglet Super Admins` : Gérer les Délégués

En tant que Super Administrateur principal, vous pouvez déléguer certaines tâches.
1.  **Ajoutez un Super Admin Délégué** en créant un compte avec un nom d'utilisateur et un mot de passe.
2.  **Gérez les comptes** : Réinitialisez le mot de passe ou supprimez les comptes des administrateurs délégués si nécessaire.

---

## `Onglet Sauvegarde` : Sécuriser les Données

-   **Sauvegarde SQL** : Sauvegarde uniquement la base de données.
-   **Sauvegarde des Fichiers** : Crée une archive `.zip` de tous les fichiers téléversés.
-   **Sauvegarde Complète** : L'option recommandée. Elle combine la base de données et les fichiers dans une seule archive `.zip`.

---

## Autres Onglets
-   **Journal** : Consultez le journal d'activité pour suivre toutes les actions importantes effectuées par les Super Admins.
-   **Sécurité** : Changez votre propre mot de passe.
