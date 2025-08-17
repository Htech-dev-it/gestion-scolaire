# Guide pour l'Administrateur

Bienvenue dans le guide complet du portail d'administration. Ce document vous explique, étape par étape, comment maîtriser toutes les fonctionnalités à votre disposition.

## Comprendre Votre Interface

Votre interface est conçue pour être simple et efficace, organisée autour de deux points d'entrée principaux :

1.  **Le Tableau de Bord** : C'est votre page d'accueil. Elle contient des cartes d'accès rapide pour les **opérations quotidiennes** (Gestion des élèves, des bulletins, etc.).
2.  **Le Lien "Administration"** : Dans le menu du haut, ce lien vous mène aux **paramètres de fond** de l'école (années scolaires, matières, etc.).

---

## Tâches Opérationnelles (via le Tableau de Bord)

### `Gérer les Élèves`
C'est le module central pour toute la gestion des dossiers élèves.

1.  **Accès** : Allez sur **Tableau de Bord > Gestion des Élèves**.
2.  **Ajouter un élève** : Utilisez le formulaire sur la gauche pour créer un profil. Si vous cochez **"Inscrire cet élève..."**, il sera immédiatement ajouté à une classe pour l'année en cours.
    > **Note :** Le Montant à Payer (MPPA) de base est défini automatiquement selon la classe choisie. Il est géré dans l'onglet "Frais Scolaire" de l'Administration ou via la modification des paiements sur la page de la classe.
3.  **Modifier un élève** : Double-cliquez sur un élève dans la liste pour charger ses informations dans le formulaire. Modifiez, puis cliquez sur **"Mettre à jour"**.
4.  **Inscrire un élève existant** : Pour un élève qui a un profil mais n'est pas inscrit pour l'année en cours, trouvez-le dans la liste et cliquez sur le bouton **"Inscrire"**.
5.  **Actions en masse (Archiver, Supprimer, Changer de classe)** : Cochez les cases à côté des noms des élèves. Des boutons d'action apparaîtront en haut du tableau pour appliquer une action à toute votre sélection.

### `Gérer les Paiements`
Les paiements se gèrent par classe.

1.  **Accès** : Depuis le **Tableau de Bord**, cliquez sur une classe dans la section **"Accès Rapide aux Paiements"**.
2.  **Modifier une fiche** : Double-cliquez sur un élève dans la liste. Sa fiche de paiement s'ouvre à gauche.
3.  **Saisir un paiement** : Entrez le montant dans l'un des champs "Versement". La date est ajoutée automatiquement.
4.  **Imprimer un reçu** : Cliquez sur l'icône d'imprimante sur la fiche de paiement.

### `Gérer les Professeurs`
1.  **Accès** : Allez sur **Tableau de Bord > Gestion des Professeurs**.
2.  **Ajouter un professeur** : Créez son profil. Le système génère un nom d'utilisateur et un mot de passe temporaire. **Communiquez-les-lui.**
3.  **Assigner des cours** : Cliquez sur **"Gérer les assignations"** pour un professeur. Cochez les matières qu'il enseignera dans chaque classe.

### `Gérer l'Emploi du Temps`
1.  **Accès** : Allez sur **Tableau de Bord > Gestion Emploi du temps**.
2.  **Ajouter des salles** : Utilisez le panneau de gauche pour lister toutes les salles disponibles.
3.  **Créer un créneau** : Cliquez sur une case vide de la grille. Dans la fenêtre qui s'ouvre, choisissez l'assignation (un cours, donné par un professeur, à une classe), l'heure et la salle.

### `Gérer les Bulletins`
1.  **Accès** : Allez sur **Tableau de Bord > Gestion des Bulletins**.
2.  **Choisissez** parmi 9 modèles de bulletins, du plus formel au plus créatif.
3.  **Sélectionnez** une classe et une période, puis cochez les élèves concernés.
4.  Cliquez sur **"Générer les Bulletins"** pour ouvrir l'aperçu avant impression.
5.  **Modifiez les appréciations** directement sur l'aperçu si nécessaire, puis imprimez.

---

## Paramètres de l'École (via le lien "Administration")

### `Gérer les Utilisateurs et les Rôles`
1.  **Accès** : Allez dans **Administration > Gérer les utilisateurs**.
2.  **Créer un utilisateur** : Ajoutez un compte pour un membre du personnel (non-professeur).
3.  **Gérer les rôles** : Cliquez sur **"Gérer les Rôles"** pour un utilisateur. Cochez les rôles que vous voulez lui assigner (ex: "Comptable"). Les permissions s'appliqueront instantanément.
4.  **Créer un rôle personnalisé** : Allez dans **Administration > Rôles & Permissions**.
    - Utilisez un modèle pour commencer rapidement.
    - Donnez un nom au rôle et cochez les permissions exactes que vous souhaitez accorder.

### `Configurer l'Année Académique`
Il est crucial de suivre cet ordre :
1.  **Administration > Années** : Créez l'année scolaire (ex: `2024-2025`) et définissez-la comme **"Actuelle"**.
2.  **Administration > Périodes** : Sélectionnez la bonne année et ajoutez les périodes (ex: `Trimestre 1`).
3.  **Administration > Matières** : Assurez-vous que toutes les matières sont listées.
4.  **Administration > Programme** : Pour **chaque classe**, assignez les matières qui y seront enseignées et leur note maximale (souvent `100`).

---

### `Gérer le Portail Élève`
1.  **Accès** : Cliquez sur **"Portail Élève"** dans le menu du haut.
2.  **Créer les comptes en masse** : Sélectionnez une classe et cliquez sur **"Créer les comptes..."**. Une fiche d'identifiants est générée à imprimer et distribuer.
3.  **Gérer un compte individuel** : Utilisez la liste en bas pour réinitialiser un mot de passe ou supprimer un compte.