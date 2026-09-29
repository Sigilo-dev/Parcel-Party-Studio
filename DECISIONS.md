# Decisiones y especificaciones

- Aplicación Windows nativa desde el inicio: Tauri 2 + Rust, Vue 3 + TypeScript + Vite, Konva/vue-konva, Pinia, CSS Modules y Vitest.
- Módulos: editor, templates, assets, procedural, export, persistence, ui. Modelos y lógica no dependen del canvas ni de Tauri.
- Solo dos Markdown mantenidos: README.md (presentación) y DECISIONS.md (este registro).
- Requisitos Windows: Node 22.12+ o 24, Rust MSVC, Visual Studio C++ Build Tools y WebView2. Referencia: https://v2.tauri.app/start/prerequisites/.
- Comandos: `npm ci`; `npm run desktop` (Tauri); `npm run desktop:build` (exe + instalador NSIS); `npm run build`; `npm test`; `npm run check`; `cargo test --manifest-path src-tauri/Cargo.toml`; `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`.
- `npm run dev` es solo inspección del frontend; los archivos locales requieren `npm run desktop`.

## Contratos

- Plantillas ALTO:ANCHO: rectangular 3.4:2.2 (440×680), cuadrada/circular 1:1 (600×600), bold 3:4 (800×600). Cambiar una dimensión conserva proporción; límites 64–4096 px. El canvas recorta los elementos; las guías no se exportan.
- Documento v2 en `project.json`, recursos importados en `assets/<uuid>.<ext>`. UUID estables; orden del array = de fondo a frente. Selección, zoom y desplazamiento son estado de sesión, no contenido del proyecto. v1 se migra preservando geometría y color sólido; guardar confirma la migración.
- Rust valida antes de abrir/guardar; rutas relativas directas dentro de assets, sin traversal ni escapes por enlaces. Escritura temporal con sync + reemplazo; `project.json.bak` conserva la versión anterior. Recuperación manual: copiar el respaldo a `project.json` con la app cerrada.
- Guardado explícito (Ctrl+S); abrir/nuevo/cerrar consulta guardar, descartar o cancelar si hay cambios. Cancelar un diálogo o fallar una escritura nunca marca el documento como guardado. No hay autosave.
- Crear/guardar por primera vez pide una carpeta sin `project.json` ni `assets`. Abrir selecciona `project.json`. Importar copia PNG/JPEG/WebP al proyecto (20 MB/imagen, 100 MB/carpeta, 8192 px por lado); no se descargan gráficos.
- Exportación PNG 1×, con transparencia fuera de la máscara. Si hay capas visibles con overflow (cinta por defecto), amplía los límites para incluirlas: el origen del canvas puede desplazarse dentro del PNG. Máximo 8192 px/lado y 32 MP. Reutiliza render del editor; excluye selección y guías.
- Historial de 100 cambios, transacciones por gesto. Bloqueo impide transformar, eliminar, duplicar o reordenar; visibilidad y desbloqueo siguen accesibles. Máximo del formato: 5000 elementos y 500 assets.
- `editor/model.ts`, `store.ts`, `transforms.ts`: datos/lógica; `rendering.ts` y componentes Konva: visualización; `persistence/native.ts`: IPC. Rust separado en `schema.rs`, `persistence.rs`, `assets.rs`, `export.rs`. UI con CSS Modules; tema compartido en `ui/theme.css`.
- Atajos: V selección, H/espacio desplazamiento, R/C/T formas/texto, flechas mueven 1 px (Shift: 10), Ctrl+D duplicar, Supr eliminar, Ctrl+Z deshacer, Ctrl+Shift+Z/Ctrl+Y rehacer, Ctrl+N/O/S/I/E archivos/importar/exportar. No interceptar escritura en inputs.

## Incidencias que no deben repetirse

- `lucide-vue-next` está deprecado: se usa el paquete oficial `@lucide/vue`. Vitest 3 tenía una alerta de mocker: actualizado a 4.1.11; conservar lockfiles.
- Menús heterogéneos necesitaban `disabled?: boolean` explícito para vue-tsc.
- PowerShell 5 lee UTF-8 como ANSI sin `-Encoding utf8`: produjo símbolos corruptos en App.vue; restaurados. Leer/escribir siempre UTF-8 explícitamente.
- Transformer de Konva acumula scale: v2 normaliza el grupo exterior a 1 y guarda scaleX/scaleY independientes; el grupo interior escala geometría y texto juntos. No volver a multiplicar fontSize/dimensiones: duplicaría la escala. Reflejos en el grupo interior conservan el anclaje. Límites en `transforms.ts`.
- Capturar puntero para pan solo sobre canvas, para no bloquear botones flotantes. Biblioteca izquierda con scroll y fila grid restringida para conservar capas en ventanas pequeñas.
- Validar proporciones, identificadores únicos, referencias de assets y rangos también en Rust. No marcar guardado antes de resolver IPC ni reemplazar el proyecto al cancelar.

## Validación de esta fase

- Vitest: 15 pruebas (CRUD, transformaciones/texto, historial, bloqueo, capas, proporciones, fibras deterministas y flujos nativos simulados con cancelación/error).
- Rust: 6 pruebas con archivos temporales reales (guardado/reapertura, backup, assets relativos, propiedades/orden/capas, JSON corrupto y rechazo de versiones/rutas/dimensiones/IDs inválidos).
- `npm run build`, `npm run check`, `cargo fmt -- --check`, Clippy con `-D warnings` y `npm audit`: ejecutados. Compilación Tauri release + instalador NSIS x64 verificada en Windows.
- Ejecutable nativo arrancado con ventana y proceso respondiendo; revisión visual del frontend local realizada. Automatización de diálogos nativos pendiente: el controlador de escritorio no estaba disponible; no confundir los tests del backend/IPC simulado con una prueba end-to-end de los diálogos.
- CI `.github/workflows/windows.yml`: pruebas, formato, Clippy y build Windows; adjunta instalador como artefacto. Binarios locales en `src-tauri/target/release/` y `bundle/nsis/`, excluidos de Git.

## Materiales y generación procedural (v2)

- Catálogo SVG local: kraft claro/oscuro, reciclado, cartulina, desgastado; hendiduras, grasa, suciedad, dobleces, abolladuras, desgaste y cinta; una ilustración geométrica. Se persisten claves builtin estables; SVG arbitrario externo no se importa. PNG/WebP y compatibilidad JPEG de v1 se copian localmente.
- Un asset tiene ID estable, categoría y fuente. Reemplazar crea un archivo nuevo y cambia la entrada compartida, conservando ID: canvas, materiales y variantes se actualizan juntos. Cache por ruta/fuente (no solo ID) para que undo/redo restaure también la imagen correcta.
- Retirar un asset elimina sus referencias en capas, materiales, perfiles y variantes en una transacción reversible. Los archivos anteriores se conservan en disco para deshacer y respaldo; no existe purga automática. No editar o borrar archivos de assets a mano mientras se trabaja.
- Abrir con archivos faltantes conserva el documento y muestra marcadores; Assets permite comprobar, reemplazar o retirar. Guardar/exportar revalida los archivos y bloquea referencias faltantes. Nunca descartar todo el proyecto por una imagen ausente. El backend rechaza rutas fuera de assets y valida firmas de imágenes importadas.
- Materiales compartidos: color, imagen y opacidad. El canvas y PNG usan el mismo patrón. Cada capa mantiene escala X/Y, reflejos H/V, rotación, opacidad, visibilidad, bloqueo y orden; overflow se aplica por capa para conservar intercalado con las capas recortadas.
- `procedural/engine.ts` es lógica pura sin canvas, Tauri ni reglas de minijuegos. PRNG uint32 + stream por regla, IDs deterministas por perfil/regla/slot. Misma entrada y semilla = mismos parámetros, IDs y orden.
- Perfiles guardan plantilla/dimensiones, material, reglas, probabilidad por regla, rango de cantidad (0–50), centros X/Y normalizados, escala, rotación, reflejos, opacidad y zona. Regiones personalizadas/protegidas usan fracciones 0–1. En círculos, las esquinas son cuatro sectores diagonales sobre el borde real.
- Protección usa AABB del elemento ya rotado/escalado (conservadora); puede omitir marcas que visualmente cabrían. Nunca fuerza el mínimo si no hay espacio: hasta 160 intentos/slot y aviso explícito. Protege texto e ilustraciones marcadas y regiones manuales. Una capa totalmente bloqueada conserva prioridad; si invade una región, se informa.
- Regenerar conserva capas manuales, orden de capas previas y bloqueos de posición/escala/rotación/reflejos/opacidad/asset. Propiedades bloqueadas conservan su capa incluso si la nueva cantidad/probabilidad la omitiría. Semilla siguiente incrementa uint32 con wrap.
- Lotes de 1–16: previsualizar no cambia el canvas; conservar solo selección (máximo 32 variantes). Cada variante guarda resultado, semilla, perfil completo y zonas. Aplicarla restaura esos parámetros en un paso de undo. Previews pendientes se invalidan al cambiar la pertenencia del catálogo; las variantes guardadas siguen referencias compartidas.
- `schema_v2.rs` valida perfiles, rangos, regiones, materiales y referencias de variantes. Tope JSON 16 MB tanto al leer como al escribir para no producir archivos que luego no puedan abrirse.
- Franja superior eliminada; estado guardado/no guardado en footer. Atajos del editor suspendidos mientras haya un diálogo abierto.
- Si desaparece la carpeta assets completa, importar/reemplazar la recrea antes de copiar; después se mantiene la comprobación de rutas. El checkbox de protección de ilustraciones refleja el mismo valor efectivo que el generador. `Use current canvas setup` copia también contorno, área segura y dimensiones al perfil.
- Validación v2: 47 tests Vitest, 9 Rust, vue-tsc/build y Clippy aprobados; fixture de proyecto producido por el generador real y reabierto desde disco. Build Tauri/NSIS Windows aprobado. En esta sesión no hay navegador/controlador UI disponible: no se afirma prueba visual end-to-end de diálogos.
