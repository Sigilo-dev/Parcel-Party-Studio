# Decisiones y especificaciones

- Aplicación Windows nativa desde el inicio: Tauri 2 + Rust, Vue 3 + TypeScript + Vite, Konva/vue-konva, Pinia, CSS Modules y Vitest.
- Módulos: editor, templates, assets, procedural, export, persistence, ui. Modelos y lógica no dependen del canvas ni de Tauri.
- Solo dos Markdown mantenidos: README.md (presentación) y DECISIONS.md (este registro).
- Requisitos Windows: Node 22.12+ o 24, Rust MSVC, Visual Studio C++ Build Tools y WebView2. Referencia: https://v2.tauri.app/start/prerequisites/.
- Comandos: `npm ci`; `npm run desktop` (Tauri); `npm run desktop:build` (exe + instalador NSIS); `npm run build`; `npm test`; `npm run check`; `cargo test --manifest-path src-tauri/Cargo.toml`; `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`.
- `npm run dev` es solo inspección del frontend; los archivos locales requieren `npm run desktop`.
