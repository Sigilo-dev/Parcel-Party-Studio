# Parcel Party Studio

Un taller de escritorio para dar vida a mundos de cartón.

Parcel Party Studio es una aplicación para Windows que permite componer recursos gráficos 2D para juegos en Godot: elegir una silueta, combinar formas y materiales, y preparar piezas con personalidad propia. Un espacio de trabajo oscuro, compacto y enfocado en crear.

Hecha en base a Tauri 2 y Vue 3, con un núcleo nativo en Rust y TypeScript para el editor. Los proyectos viven en tu equipo y los recursos iniciales se generan con geometría local.

## Tu próxima entrega empieza aquí

- Cuatro siluetas: rectangular, cuadrada, circular y bold, con recorte y área segura.
- Formas, etiquetas e imágenes en capas: mueve, gira, escala y experimenta con deshacer y rehacer.
- Cinco materiales de cartón y siete familias de imperfecciones, con placeholders locales reemplazables.
- Biblioteca de imágenes con categorías, previsualización y reemplazo compartido entre diseños.
- Composición procedural con semillas reproducibles, zonas protegidas y lotes de variantes para elegir.
- Reflejos, escalado independiente y cinta adhesiva que puede sobresalir del contorno.
- Proyectos locales con sus propios recursos y exportación PNG para llevar tus creaciones a Godot.

Sin cuentas ni recursos gráficos remotos. Solo tu taller, tus archivos y tu próxima pequeña aventura.

## Créditos

Gracias a los proyectos que hacen posible este taller: [Tauri](https://tauri.app/), [Rust](https://www.rust-lang.org/), [Vue](https://vuejs.org/), [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/), [Konva](https://konvajs.org/) y [vue-konva](https://github.com/konvajs/vue-konva), [Pinia](https://pinia.vuejs.org/), [Lucide](https://lucide.dev/) y [Vitest](https://vitest.dev/). Diálogos locales con [rfd](https://github.com/PolyMeilex/rfd), serialización con [Serde](https://serde.rs/), identificadores con [uuid](https://github.com/uuid-rs/uuid) y codificación con [base64](https://github.com/marshallpierce/rust-base64). Las herramientas conservan sus respectivas licencias. Godot es el motor de destino; este proyecto no está afiliado a Godot.

Desarrollado por Sigilo-dev. Consulta [decisiones y especificaciones](DECISIONS.md) para desarrollo y validación.
