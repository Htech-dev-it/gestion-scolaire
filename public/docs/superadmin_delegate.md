# Guide pour l'Administrateur Délégué

Bienvenue dans le guide du portail de supervision. Ce document vous explique comment utiliser les fonctionnalités qui vous sont accessibles en tant qu'administrateur délégué pour gérer la plateforme.

---

## Tableau de Bord et Statistiques
À votre arrivée, vous voyez des statistiques clés qui vous donnent une vue d'ensemble de l'activité sur votre plateforme :
- **Instances Totales** : Le nombre total d'écoles créées.
- **Instances Actives** : Le nombre d'écoles actuellement actives.
- **Utilisateurs** : Le nombre total de comptes (admins, professeurs, etc.) sur la plateforme.
- **Élèves Actifs** : Le nombre total d'élèves actifs dans toutes les écoles.

---

## Onglet Instances

C'est ici que vous gérez le cycle de vie de chaque établissement scolaire.

### Créer une Nouvelle Instance
1.  Sur la droite, remplissez le formulaire "Créer une Nouvelle Instance".
2.  Indiquez le **Nom de l'école**, l'**Email de l'Admin Principal**, et optionnellement l'adresse et le téléphone.
3.  Cliquez sur **"Créer l'Instance"**.
4.  Une fenêtre apparaîtra avec le **nom d'utilisateur (`admin`)** et un **mot de passe temporaire**. Vous devez communiquer ces identifiants de manière sécurisée à l'administrateur de la nouvelle école.

### Gérer une Instance Existante
Pour chaque instance listée, vous disposez de plusieurs outils :
- **Statut (Actif/Suspendu)** : Le bouton à bascule vous permet d'activer ou de suspendre manuellement l'accès à une école.
- **Planifier** : Ouvre une fenêtre où vous pouvez définir une date et une heure d'expiration précises. Une fois cette date passée, l'instance sera automatiquement suspendue.
- **Modifier** : Permet de mettre à jour les informations de contact de l'instance.
- **Réinitialiser MDP** : Pour chaque administrateur listé, ce bouton vous permet de générer un nouveau mot de passe temporaire en cas d'oubli de leur part.

---

## Onglet Annonces

Cet outil vous permet de communiquer des informations importantes.
1.  **Créer une Annonce** : Utilisez le formulaire pour rédiger un titre et un contenu.
2.  **Cibler l'Annonce** :
    - Laissez le champ "Cibler une instance" sur **"Annonce Globale"** pour que le message soit visible par les administrateurs de **toutes les écoles**.
    - Sélectionnez une école spécifique dans la liste pour que l'annonce ne soit visible que par les administrateurs de cette école.
3.  **Gérer les Annonces** : Vous pouvez activer, désactiver, modifier ou supprimer les annonces existantes à tout moment.

---

## Onglet Support

C'est votre centre de communication intégré pour le support technique.
- **Informations de Contact** : Définissez ici l'email et le téléphone que les administrateurs d'école verront sur leur page "Contact & Support".
- **Messages des Instances** :
  - La liste de toutes les écoles s'affiche.
  - Un **badge rouge** vous indique le nombre de messages non lus pour chaque école.
  - Cliquez sur une école pour ouvrir une **fenêtre de discussion**. Vous pouvez y lire l'historique et répondre directement.

---

## Onglet Sauvegarde

Cet onglet vous permet de sécuriser les données de toute la plateforme.
- **Sauvegarde SQL** : Télécharge un fichier `.sql` contenant les données pour **toutes les instances**.
- **Sauvegarde des Fichiers** : Télécharge une archive `.zip` contenant les fichiers téléversés de **toutes les instances**.
- **Sauvegarde Complète** : L'option recommandée. Elle combine la base de données et les fichiers dans une seule archive `.zip`.

---

## Onglet Journal

Cet onglet vous permet de consulter le journal d'activité de tous les administrateurs de la plateforme. Vous avez un accès en lecture seule à ces informations pour garantir la traçabilité des actions.

---

## Onglet Sécurité

Utilisez cet onglet pour changer votre propre mot de passe. Il est recommandé de le faire régulièrement pour maintenir la sécurité de votre compte.
