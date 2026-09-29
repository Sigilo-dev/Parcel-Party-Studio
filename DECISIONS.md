# Decisiones y especificaciones

- Aplicación Windows nativa desde el inicio: Tauri 2 + Rust, Vue 3 + TypeScript + Vite, Konva/vue-konva, Pinia, CSS Modules y Vitest.
- Módulos: editor, templates, assets, procedural, export, persistence, ui. Modelos y lógica no dependen del canvas ni de Tauri.
- Solo dos Markdown mantenidos: README.md (presentación) y DECISIONS.md (este registro).
- Requisitos Windows: Node 22.12+ o 24, Rust MSVC, Visual Studio C++ Build Tools y WebView2. Referencia: https://v2.tauri.app/start/prerequisites/.
- Comandos: `npm ci`; `npm run desktop` (Tauri); `npm run desktop:build` (exe + instalador NSIS); `npm run build`; `npm test`; `npm run check`; `cargo test --manifest-path src-tauri/Cargo.toml`; `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`.
- `npm run dev` es solo inspección del frontend; los archivos locales requieren `npm run desktop`.

## Contratos

- Plantillas ALTO:ANCHO: rectangular 3.4:2.2 (440×680), cuadrada/circular 1:1 (600×600), bold 3:4 (800×600). Cambiar una dimensión conserva proporción; límites 64–4096 px. El canvas recorta los elementos; las guías no se exportan.
- Documento v1 en `project.json`, recursos en `assets/<uuid>.<ext>`. UUID estables; orden del array = de fondo a frente. Selección, zoom y desplazamiento son estado de sesión, no contenido del proyecto.
- Rust valida antes de abrir/guardar; rutas relativas directas dentro de assets, sin traversal ni escapes por enlaces. Escritura temporal con sync + reemplazo; `project.json.bak` conserva la versión anterior. Recuperación manual: copiar el respaldo a `project.json` con la app cerrada.
- Guardado explícito (Ctrl+S); abrir/nuevo/cerrar consulta guardar, descartar o cancelar si hay cambios. Cancelar un diálogo o fallar una escritura nunca marca el documento como guardado. No hay autosave.
- Crear/guardar por primera vez pide una carpeta sin `project.json` ni `assets`. Abrir selecciona `project.json`. Importar copia PNG/JPEG/WebP al proyecto (20 MB/imagen, 100 MB/carpeta, 8192 px por lado); no se descargan gráficos.
- Exportación PNG 1× a tamaño del canvas, con transparencia fuera de la máscara. Reutiliza la configuración de render del editor; excluye selección, guías y fondo de la interfaz.
- Historial de 100 cambios, transacciones por gesto. Bloqueo impide transformar, eliminar, duplicar o reordenar; visibilidad y desbloqueo siguen accesibles. Máximo del formato: 5000 elementos y 500 assets.
- `editor/model.ts`, `store.ts`, `transforms.ts`: datos/lógica; `rendering.ts` y componentes Konva: visualización; `persistence/native.ts`: IPC. Rust separado en `schema.rs`, `persistence.rs`, `assets.rs`, `export.rs`. UI con CSS Modules; tema compartido en `ui/theme.css`.
- Atajos: V selección, H/espacio desplazamiento, R/C/T formas/texto, flechas mueven 1 px (Shift: 10), Ctrl+D duplicar, Supr eliminar, Ctrl+Z deshacer, Ctrl+Shift+Z/Ctrl+Y rehacer, Ctrl+N/O/S/I/E archivos/importar/exportar. No interceptar escritura en inputs.

## Incidencias que no deben repetirse

- `lucide-vue-next` está deprecado: se usa el paquete oficial `@lucide/vue`. Vitest 3 tenía una alerta de mocker: actualizado a 4.1.11; conservar lockfiles.
- Menús heterogéneos necesitaban `disabled?: boolean` explícito para vue-tsc.
- PowerShell 5 lee UTF-8 como ANSI sin `-Encoding utf8`: produjo símbolos corruptos en App.vue; restaurados. Leer/escribir siempre UTF-8 explícitamente.
- Transformer de Konva acumula scale: normalizar a 1 después de convertir el gesto a dimensiones; escalar también fontSize en texto. Límites y normalización en `transforms.ts`.
- Capturar puntero para pan solo sobre canvas, para no bloquear botones flotantes. Biblioteca izquierda con scroll y fila grid restringida para conservar capas en ventanas pequeñas.
- Validar proporciones, identificadores únicos, referencias de assets y rangos también en Rust. No marcar guardado antes de resolver IPC ni reemplazar el proyecto al cancelar.

## Validación de esta fase

- Vitest: 15 pruebas (CRUD, transformaciones/texto, historial, bloqueo, capas, proporciones, fibras deterministas y flujos nativos simulados con cancelación/error).
- Rust: 6 pruebas con archivos temporales reales (guardado/reapertura, backup, assets relativos, propiedades/orden/capas, JSON corrupto y rechazo de versiones/rutas/dimensiones/IDs inválidos).
- `npm run build`, `npm run check`, `cargo fmt -- --check`, Clippy con `-D warnings` y `npm audit`: ejecutados. Compilación Tauri release + instalador NSIS x64 verificada en Windows.
- Ejecutable nativo arrancado con ventana y proceso respondiendo; revisión visual del frontend local realizada. Automatización de diálogos nativos pendiente: el controlador de escritorio no estaba disponible; no confundir los tests del backend/IPC simulado con una prueba end-to-end de los diálogos.
- CI `.github/workflows/windows.yml`: pruebas, formato, Clippy y build Windows; adjunta instalador como artefacto. Binarios locales en `src-tauri/target/release/` y `bundle/nsis/`, excluidos de Git.
