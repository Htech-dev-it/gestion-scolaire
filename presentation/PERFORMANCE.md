# Performance et Optimisation

Une application multi-instances doit être conçue pour la performance dès le départ afin de garantir une expérience fluide pour toutes les écoles, quelle que soit leur taille. Ce document détaille les stratégies clés mises en place.

## 1. Stratégies Backend et Base de Données

### a) Cloisonnement des Données via `instance_id`
- **Problème** : Dans une application multi-instances, il faut éviter qu'une école avec beaucoup de données ne ralentisse les requêtes pour une école plus petite.
- **Solution** : Chaque table principale de la base de données contient une colonne `instance_id`. Nous avons ajouté des **index** sur cette colonne. Chaque requête est automatiquement filtrée par l'`instance_id` de l'utilisateur connecté.
- **Impact** : La base de données peut isoler et accéder aux données d'une école spécifique de manière extrêmement rapide, garantissant des performances constantes pour tous les clients.

### b) Indexation Avancée de la Base de Données
- **Problème** : Les recherches et les filtres peuvent devenir lents sur de grandes tables.
- **Solution** : Des **index** ont été ajoutés sur toutes les colonnes fréquemment utilisées pour les recherches et les tris (noms, dates, etc.). Des **index GIN** spécialisés sont utilisés sur les colonnes `JSONB` pour accélérer les rapports financiers complexes.
- **Impact** : Les requêtes sont quasi instantanées.

### c) Pagination Côté Serveur
- **Problème** : Charger des milliers de lignes de données en une seule fois est inefficace et peut faire planter le navigateur.
- **Solution** : Le serveur ne renvoie jamais de listes complètes. Il envoie des **"pages"** de données (ex: 25 élèves à la fois), que l'interface demande au besoin.
- **Impact** : Temps de chargement initiaux très rapides et consommation de mémoire minimisée. L'application reste réactive quelle que soit la quantité de données.

### d) Stockage Externe des Fichiers Images
- **Problème** : Stocker les images dans la base de données la rend lourde et lente.
- **Solution** : Les images sont sauvegardées sur le système de fichiers du serveur. Seul le **chemin d'accès** est stocké dans la base de données.
- **Impact** : Base de données allégée, sauvegardes plus rapides et chargement des pages plus performant.

### e) Nettoyage Automatique des Journaux (`Log Pruning`)
- **Problème** : Le journal d'activité peut grandir indéfiniment.
- **Solution** : Un processus automatisé supprime chaque jour les journaux de plus de 30 jours.
- **Impact** : La taille de la base de données reste maîtrisée.

---

## 2. Stratégies Frontend

### a) Chargement Différé (`Lazy Loading`)
- **Problème** : Charger tout le code de l'application en une seule fois ralentit le chargement initial.
- **Solution** : Les composants des portails moins critiques sont "lazy loaded" et ne sont téléchargés que lorsque l'utilisateur y accède.
- **Impact** : Temps de chargement initial plus rapide.

### b) Limitation du Rendu
- **Problème** : Afficher des milliers de lignes dans un tableau peut bloquer le navigateur.
- **Solution** : Le frontend n'affiche que de petites quantités de données à la fois, grâce à la pagination côté serveur.
- **Impact** : L'interface reste toujours fluide et réactive.