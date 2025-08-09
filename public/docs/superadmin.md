# Guide pour le Super Administrateur

Bienvenue dans le guide du portail Super Administrateur. Ce document vous explique comment gérer l'ensemble de la plateforme et superviser les différentes instances scolaires.

## Tableau de Bord Principal

Votre tableau de bord est le centre de commandement de la plateforme. Il est organisé en plusieurs onglets pour une gestion claire et efficace.

### Tableau de Bord et Statistiques
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
- **Statut (Actif/Suspendu)** : Le bouton à bascule vous permet d'activer ou de suspendre manuellement l'accès à une école. Une école suspendue ne sera plus accessible par ses utilisateurs.
- **Planifier** : Ouvre une fenêtre où vous pouvez définir une date et une heure d'expiration précises. Une fois cette date passée, l'instance sera automatiquement suspendue. C'est idéal pour gérer les abonnements.
- **Modifier** : Permet de mettre à jour les informations de contact de l'instance (nom, adresse, téléphone, email).
- **Réinitialiser MDP** : Pour chaque administrateur listé, ce bouton vous permet de générer un nouveau mot de passe temporaire en cas d'oubli de leur part.
- **Supprimer** : Cette action est extrêmement sensible et est protégée par une double confirmation :
  1.  Vous devrez d'abord taper la phrase `SUPPRIMER DÉFINITIVEMENT`.
  2.  Ensuite, vous devrez confirmer l'action en saisissant **votre propre mot de passe de Super Administrateur**. Cela garantit qu'aucune suppression ne peut être accidentelle ou malveillante.

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
  - Lire les messages marque automatiquement la conversation comme lue et met à jour les notifications.
  - Vous pouvez supprimer des messages individuellement ou **effacer toute la conversation** pour faire du nettoyage.

---

## Onglet Sauvegarde

Cet onglet vous permet de sécuriser les données de toute la plateforme.
- **Sauvegarde SQL** : Télécharge un fichier `.sql` contenant les données et la structure de la base de données pour **toutes les instances**.
- **Sauvegarde des Fichiers** : Télécharge une archive `.zip` contenant les fichiers téléversés (photos, documents) de **toutes les instances**.
- **Sauvegarde Complète** : L'option recommandée. Elle combine la base de données et les fichiers dans une seule archive `.zip` pour une restauration facile.