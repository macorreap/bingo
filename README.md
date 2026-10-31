# Bingo Oratorio

Aplicación web en **HTML, CSS y JavaScript**, con el logo del Oratorio y sin dependencias externas. Incluye un servidor local opcional en Node.js. No requiere una cuenta ni servicios de GPT.

## Abrir y jugar

1. Descarga todos los archivos conservando su estructura.
2. Abre **index.html** en Chrome, Edge, Firefox o Safari actualizado.
3. Haz clic en un número para encenderlo. Otro clic lo apaga. También puedes escribirlo en «¿Qué número salió?» y presionar Enter.
4. Elige uno de los nueve colores bajo el tablero.

El tablero tiene **cinco filas horizontales**, en este orden:

| Letra | Números, de izquierda a derecha |
| --- | --- |
| B | 1 al 15 |
| I | 16 al 30 |
| N | 31 al 45 |
| G | 46 al 60 |
| O | 61 al 75 |

Los números aparecen apagados al empezar. El último número conserva un borde especial. Las seis últimas selecciones, el total marcado y los números restantes se actualizan automáticamente.

## Proyectar en una segunda pantalla

1. Conecta la pantalla o proyector y configura el escritorio en **modo extendido**.
2. En el panel del moderador, presiona **Proyectar tablero**. Permite la ventana emergente si el navegador la bloquea.
3. Arrastra la ventana nueva a la segunda pantalla y presiona **Pantalla completa**.
4. Mantén abierto el panel del moderador. Los clics y cambios de color se reflejan en la proyección. El público ve únicamente el tablero y el resumen; no puede cambiar los números.

Ambas ventanas deben estar en el **mismo navegador y equipo**. La comunicación utiliza BroadcastChannel, postMessage y almacenamiento local. Si abres los archivos directamente y el navegador restringe sus funciones, utiliza el servidor local descrito abajo o publica los archivos en un alojamiento web.

## Colores y controles

- Rojo, verde claro, gris, verde oscuro, amarillo, naranjo, lila, azul y café.
- **Deshacer** revierte el último cambio de números; también funciona con Ctrl+Z o ⌘+Z fuera del campo de entrada.
- **Nueva partida** solicita confirmación y apaga todos los números, conservando el color. Puede deshacerse.
- **Sonido** permite activar un tono breve al marcar.
- Al recargar, se recuperan los números, el color, la preferencia de sonido y hasta 100 cambios para deshacer. El almacenamiento es local a este navegador y dirección; no se comparte entre dispositivos. Limpiar los datos del navegador elimina la partida guardada. En navegación privada o con almacenamiento bloqueado, mantén la ventana abierta.
- En teléfonos, desliza el tablero horizontalmente para ver los 15 números de cada fila. La vista de proyección se adapta al ancho disponible; para mejor visibilidad usa la pantalla en horizontal.

## Servidor local opcional

Instala Node.js 18 o superior y, dentro de esta carpeta, ejecuta:

```sh
npm start
```

Abre **http://localhost:3000**. No hace falta ejecutar `npm install`: no hay dependencias.

El servidor sirve únicamente los archivos públicos de la aplicación. Por defecto escucha solo en el equipo local. No almacena la partida ni incorpora sincronización entre equipos, usuarios ni base de datos; esas funciones no son necesarias para la proyección local.

Prueba del servidor:

```sh
npm test
```

## Subir a GitHub

Crea un repositorio y sube los archivos de esta carpeta manteniendo la subcarpeta `assets`. Los archivos de funcionamiento son:

```text
index.html
styles.css
app.js
assets/
  logo-oratorio.png
```

También puedes subir `README.md`, `server.mjs`, `package.json`, `.gitignore` y `tests/` como parte del código fuente completo. Para publicarlo como página estática, selecciona en la configuración de GitHub Pages la rama que contiene `index.html` y su carpeta raíz. El servidor Node.js es opcional y no se ejecuta en GitHub Pages.

## Personalización del código

- `styles.css`: diseño, tipografía, tamaños, adaptación y vista de proyección.
- `app.js`: números, temas, guardado, sonido y comunicación entre ventanas. Los nueve temas están definidos en `THEMES`.
- `assets/logo-oratorio.png`: logo original proporcionado para este proyecto.

La aplicación no utiliza fuentes, analítica, bibliotecas ni imágenes alojadas por terceros. Después de descargarla, puede usarse sin conexión.
