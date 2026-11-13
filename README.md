# KeyEd

English | [Русский](README.ru.md)

A free desktop app for learning touch typing with all ten fingers. The first version teaches the English QWERTY layout and the Russian ЙЦУКЕН layout.

**Download:** [urands.github.io/keyed](https://urands.github.io/keyed/) or the [releases page](https://github.com/urands/keyed/releases/latest).

All phases of the [implementation plan](docs/implementation-plan.md) are done. KeyEd is a full course for the English and Russian layouts: letters, capitals with Shift on the opposite hand, punctuation, digits, and free practice with sentences. New keys unlock as you master the previous ones. It also has:

- a first-run wizard, ANSI and ISO keyboards, and an optional «ё» letter;
- a course screen where you can practise any key, plus statistics;
- a daily goal, day streaks, achievements, reminders and sounds;
- light and dark themes;
- data export, import and reset;
- automatic updates.

## Development requirements

- Node.js 22.13 or newer and pnpm 12.
- [rustup](https://rustup.rs/). It installs the required Rust version from `src-tauri/rust-toolchain.toml` on its own.
- Tauri system dependencies for your OS: [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/).

## Commands

| Command              | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| `pnpm install`       | Installs dependencies                                    |
| `pnpm tauri dev`     | Runs the app in a window with hot reload                 |
| `pnpm dev`           | Runs only the UI in a browser at `http://localhost:1420` |
| `pnpm lint`          | Lints the code                                           |
| `pnpm typecheck`     | Checks types                                             |
| `pnpm test`          | Runs the tests                                           |
| `pnpm format`        | Formats the code                                         |
| `pnpm tauri build`   | Builds an installer for the current OS                   |
| `pnpm content:build` | Rebuilds the lesson dictionaries from `tools/sources/`   |

The first build of the Rust shell takes several minutes and about 2 GB in `src-tauri/target/`.

In a regular browser (`pnpm dev`) data is stored in `localStorage`; in the desktop app it is stored in SQLite.

Building an installer with update files locally requires the update signing key (`TAURI_SIGNING_PRIVATE_KEY`). To check that the app builds, `pnpm tauri build --no-bundle` is enough: it produces the executable without an installer.

## Releasing a version

Bump the version in `package.json`, commit, and push a `vX.Y.Z` tag with the same version. GitHub Actions builds installers for Windows, macOS and Linux and creates a draft release; publish it after checking. See the [architecture document](docs/architecture.md#как-выпустить-версию) for details.

## Documentation

The product description, learning method, screens, architecture and plan are in the [docs](docs/README.md) folder (in Russian). The project structure is described in the [architecture document](docs/architecture.md).

## License

The code is licensed under [MIT](LICENSE). The lesson dictionaries are based on [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Hermit Dave, OpenSubtitles 2018) and are distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The sources are listed in `tools/sources/README.md`.
