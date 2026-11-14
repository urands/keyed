# KeyEd

[English](README.md) | [Русский](README.ru.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | Español

Una aplicación de escritorio gratuita para aprender mecanografía con los diez dedos sin mirar el teclado. Enseña las distribuciones inglesa QWERTY, rusa ЙЦУКЕН, alemana QWERTZ, francesa AZERTY y española QWERTY.

**Descarga:** [urands.github.io/keyed](https://urands.github.io/keyed/) o la [página de versiones](https://github.com/urands/keyed/releases/latest).

Todas las fases del [plan de desarrollo](docs/implementation-plan.md) están terminadas. KeyEd es un curso completo para cada distribución: letras, mayúsculas con la Mayús de la otra mano, signos de puntuación, números y práctica libre con frases. Las teclas nuevas se desbloquean cuando dominas las anteriores. Además incluye:

- un asistente en el primer inicio, teclados ANSI e ISO y la letra «ё» opcional;
- teclas muertas para las letras con tilde (´ y después e da é), como en un teclado europeo real;
- una pantalla del curso para practicar cualquier tecla, y estadísticas;
- un objetivo diario, rachas de días, logros, recordatorios y sonidos;
- tema claro y tema oscuro;
- la interfaz en inglés, ruso, alemán, francés y español;
- exportación, importación y restablecimiento de los datos;
- actualizaciones automáticas.

## Requisitos para el desarrollo

- Node.js 22.13 o posterior y pnpm 12.
- [rustup](https://rustup.rs/). Instala por sí solo la versión de Rust indicada en `src-tauri/rust-toolchain.toml`.
- Las dependencias del sistema de Tauri para tu sistema operativo: [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/).

## Comandos

| Comando              | Qué hace                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| `pnpm install`       | Instala las dependencias                                                  |
| `pnpm tauri dev`     | Abre la aplicación en una ventana con recarga en caliente                 |
| `pnpm dev`           | Abre solo la interfaz en el navegador, en `http://localhost:1420`         |
| `pnpm lint`          | Revisa el código con el linter                                            |
| `pnpm typecheck`     | Comprueba los tipos                                                       |
| `pnpm test`          | Ejecuta las pruebas                                                       |
| `pnpm format`        | Da formato al código                                                      |
| `pnpm tauri build`   | Crea un instalador para el sistema operativo actual                       |
| `pnpm content:build` | Vuelve a generar los diccionarios de las lecciones desde `tools/sources/` |

La primera compilación de la parte de Rust tarda unos minutos y ocupa unos 2 GB en `src-tauri/target/`.

En un navegador normal (`pnpm dev`) los datos se guardan en `localStorage`; en la aplicación de escritorio, en SQLite.

Para crear en local un instalador con los archivos de actualización hace falta la clave de firma de actualizaciones (`TAURI_SIGNING_PRIVATE_KEY`). Para comprobar solo que la aplicación compila basta con `pnpm tauri build --no-bundle`: genera el ejecutable sin instalador.

## Publicar una versión

Sube la versión en `package.json`, haz un commit y envía una etiqueta `vX.Y.Z` con la misma versión. GitHub Actions crea los instaladores para Windows, macOS y Linux y un borrador de la versión; publícalo después de revisarlo. Los detalles están en el [documento de arquitectura](docs/architecture.md#как-выпустить-версию).

## Documentación

La descripción del producto, el método de aprendizaje, las pantallas, la arquitectura y el plan están en la carpeta [docs](docs/README.md) (en ruso). La estructura del proyecto se describe en el [documento de arquitectura](docs/architecture.md).

## Licencia

El código tiene [licencia MIT](LICENSE). Los diccionarios de las lecciones se basan en [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Hermit Dave, OpenSubtitles 2018) y se distribuyen bajo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Las fuentes se indican en `tools/sources/README.md`.
