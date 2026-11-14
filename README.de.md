# KeyEd

[English](README.md) | [Русский](README.ru.md) | Deutsch | [Français](README.fr.md) | [Español](README.es.md)

Eine kostenlose Desktop-App, mit der du das Zehnfingersystem lernst. Sie bringt dir die Layouts Englisch QWERTY, Russisch ЙЦУКЕН, Deutsch QWERTZ, Französisch AZERTY und Spanisch QWERTY bei.

**Download:** [urands.github.io/keyed](https://urands.github.io/keyed/) oder die [Release-Seite](https://github.com/urands/keyed/releases/latest).

Alle Phasen des [Umsetzungsplans](docs/implementation-plan.md) sind abgeschlossen. KeyEd ist ein vollständiger Kurs für jedes Layout: Buchstaben, Großbuchstaben mit Shift auf der anderen Hand, Satzzeichen, Ziffern und freies Üben mit ganzen Sätzen. Neue Tasten werden freigeschaltet, sobald du die bisherigen beherrschst. Außerdem gibt es:

- einen Einrichtungsassistenten beim ersten Start, ANSI- und ISO-Tastaturen und den optionalen Buchstaben «ё»;
- Tottasten für Buchstaben mit Akzent (´, dann e ergibt é) wie auf echten europäischen Tastaturen;
- eine Kursübersicht, in der du jede Taste gezielt üben kannst, und Statistiken;
- ein Tagesziel, Serien von Übungstagen, Erfolge, Erinnerungen und Töne;
- ein helles und ein dunkles Design;
- die Oberfläche auf Englisch, Russisch, Deutsch, Französisch und Spanisch;
- Export, Import und Zurücksetzen der Daten;
- automatische Updates.

## Voraussetzungen für die Entwicklung

- Node.js 22.13 oder neuer und pnpm 12.
- [rustup](https://rustup.rs/). Es installiert die benötigte Rust-Version aus `src-tauri/rust-toolchain.toml` selbst.
- Die Systemabhängigkeiten von Tauri für dein Betriebssystem: [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/).

## Befehle

| Befehl               | Was er tut                                                          |
| -------------------- | ------------------------------------------------------------------- |
| `pnpm install`       | Installiert die Abhängigkeiten                                      |
| `pnpm tauri dev`     | Startet die App in einem Fenster mit Hot Reload                     |
| `pnpm dev`           | Startet nur die Oberfläche im Browser unter `http://localhost:1420` |
| `pnpm lint`          | Prüft den Code mit dem Linter                                       |
| `pnpm typecheck`     | Prüft die Typen                                                     |
| `pnpm test`          | Führt die Tests aus                                                 |
| `pnpm format`        | Formatiert den Code                                                 |
| `pnpm tauri build`   | Baut ein Installationsprogramm für das aktuelle Betriebssystem      |
| `pnpm content:build` | Baut die Wörterbücher der Lektionen aus `tools/sources/` neu        |

Der erste Build der Rust-Hülle dauert einige Minuten und belegt etwa 2 GB in `src-tauri/target/`.

Im normalen Browser (`pnpm dev`) werden die Daten in `localStorage` gespeichert, in der Desktop-App in SQLite.

Um lokal ein Installationsprogramm mit Update-Dateien zu bauen, brauchst du den Signaturschlüssel für Updates (`TAURI_SIGNING_PRIVATE_KEY`). Um nur zu prüfen, ob sich die App bauen lässt, reicht `pnpm tauri build --no-bundle`: Das erzeugt die ausführbare Datei ohne Installationsprogramm.

## Eine Version veröffentlichen

Erhöhe die Version in `package.json`, committe und pushe einen Tag `vX.Y.Z` mit derselben Version. GitHub Actions baut die Installationsprogramme für Windows, macOS und Linux und legt einen Release-Entwurf an; veröffentliche ihn nach der Prüfung. Details stehen im [Architekturdokument](docs/architecture.md#как-выпустить-версию).

## Dokumentation

Produktbeschreibung, Lernmethode, Bildschirme, Architektur und Plan liegen im Ordner [docs](docs/README.md) (auf Russisch). Die Projektstruktur ist im [Architekturdokument](docs/architecture.md) beschrieben.

## Lizenz

Der Code steht unter der [MIT-Lizenz](LICENSE). Die Wörterbücher der Lektionen basieren auf [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Hermit Dave, OpenSubtitles 2018) und werden unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) verbreitet. Die Quellen sind in `tools/sources/README.md` aufgeführt.
