# cerveau-dashboard

Mod Claude Code : un dashboard rétractable qui affiche

- la consommation de la fenêtre de **5 h** de tokens (barre + temps avant reset) ;
- une **mini-carte du second cerveau Obsidian** (notes, liens, notes les plus reliées).

## Installation

Dans Claude Code :

```
/plugin install cerveau-dashboard --marketplace danielpietrzyk1911-eng/cerveau-dashboard
```

Puis dans `/config`, règle **vaultPath** sur le chemin absolu de ton coffre Obsidian
(le dossier qui contient `.obsidian`).

## Utilisation

- `/dashboard` : afficher / masquer le dashboard
- **▾ Replier** : réduit à une ligne (barre 5 h)
- **✕ Masquer** : ferme le panneau
