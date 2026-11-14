# KeyEd

[English](README.md) | [Русский](README.ru.md) | [Deutsch](README.de.md) | Français | [Español](README.es.md)

Une application de bureau gratuite pour apprendre à taper à l’aveugle avec les dix doigts. Elle enseigne les dispositions anglaise QWERTY, russe ЙЦУКЕН, allemande QWERTZ, française AZERTY et espagnole QWERTY.

**Téléchargement :** [urands.github.io/keyed](https://urands.github.io/keyed/) ou la [page des versions](https://github.com/urands/keyed/releases/latest).

Toutes les phases du [plan de réalisation](docs/implementation-plan.md) sont terminées. KeyEd est un cours complet pour chaque disposition : lettres, majuscules avec Maj de l’autre main, ponctuation, chiffres et entraînement libre avec des phrases. Les nouvelles touches se débloquent quand vous maîtrisez les précédentes. On y trouve aussi :

- un assistant au premier lancement, les claviers ANSI et ISO et la lettre «ё» en option ;
- les touches mortes pour les lettres accentuées (^, puis e donne ê), comme sur un vrai clavier européen ;
- un écran du parcours pour entraîner n’importe quelle touche, et des statistiques ;
- un objectif quotidien, des séries de jours, des succès, des rappels et des sons ;
- un thème clair et un thème sombre ;
- l’interface en anglais, russe, allemand, français et espagnol ;
- l’export, l’import et la réinitialisation des données ;
- les mises à jour automatiques.

## Prérequis pour le développement

- Node.js 22.13 ou plus récent et pnpm 12.
- [rustup](https://rustup.rs/). Il installe tout seul la version de Rust indiquée dans `src-tauri/rust-toolchain.toml`.
- Les dépendances système de Tauri pour votre OS : [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/).

## Commandes

| Commande             | Ce qu’elle fait                                                             |
| -------------------- | --------------------------------------------------------------------------- |
| `pnpm install`       | Installe les dépendances                                                    |
| `pnpm tauri dev`     | Lance l’application dans une fenêtre avec rechargement à chaud              |
| `pnpm dev`           | Lance seulement l’interface dans le navigateur, sur `http://localhost:1420` |
| `pnpm lint`          | Analyse le code avec le linter                                              |
| `pnpm typecheck`     | Vérifie les types                                                           |
| `pnpm test`          | Lance les tests                                                             |
| `pnpm format`        | Formate le code                                                             |
| `pnpm tauri build`   | Construit un installateur pour l’OS courant                                 |
| `pnpm content:build` | Reconstruit les dictionnaires des leçons depuis `tools/sources/`            |

La première compilation de l’enveloppe Rust prend quelques minutes et environ 2 Go dans `src-tauri/target/`.

Dans un navigateur ordinaire (`pnpm dev`), les données sont stockées dans `localStorage` ; dans l’application de bureau, dans SQLite.

Pour construire localement un installateur avec les fichiers de mise à jour, il faut la clé de signature des mises à jour (`TAURI_SIGNING_PRIVATE_KEY`). Pour vérifier seulement que l’application se compile, `pnpm tauri build --no-bundle` suffit : il produit l’exécutable sans installateur.

## Publier une version

Augmentez la version dans `package.json`, faites un commit et poussez un tag `vX.Y.Z` avec la même version. GitHub Actions construit les installateurs pour Windows, macOS et Linux et crée un brouillon de version ; publiez-le après vérification. Les détails sont dans le [document d’architecture](docs/architecture.md#как-выпустить-версию).

## Documentation

La description du produit, la méthode d’apprentissage, les écrans, l’architecture et le plan sont dans le dossier [docs](docs/README.md) (en russe). La structure du projet est décrite dans le [document d’architecture](docs/architecture.md).

## Licence

Le code est sous [licence MIT](LICENSE). Les dictionnaires des leçons sont fondés sur [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Hermit Dave, OpenSubtitles 2018) et diffusés sous [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Les sources sont listées dans `tools/sources/README.md`.
