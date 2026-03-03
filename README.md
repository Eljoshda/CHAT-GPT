# Inventario Mac Minimal (PWA)

Aplicación web minimalista para inventario personalizable enfocada en accesorios/dispositivos Mac.

## Cómo entrar (local)

1. Abre una terminal dentro de esta carpeta.
2. Ejecuta:

```bash
python3 -m http.server 8080
```

3. Entra desde tu navegador a:

```text
http://localhost:8080
```

> Si solo abres el archivo `index.html` con doble clic, la app funciona, pero el modo offline PWA puede no registrarse correctamente en algunos navegadores.

## Cómo verlo en GitHub

En tu captura se ve la rama `main` con solo `.gitkeep`. La app está en la rama de trabajo y debe integrarse a `main` para verla allí.

Flujo recomendado:

1. Abrir/aceptar el Pull Request de la rama `work` hacia `main`.
2. Hacer merge del PR.
3. Volver a `main` en GitHub y recargar la página.

## Características

- Inventario con campos base + campos personalizados.
- Variantes por ítem (ej. color/capacidad/modelo).
- Movimientos de stock (entrada/salida) con historial local.
- Importación y exportación en formato Excel (`.xlsx`).
- Respaldo y restauración de datos (`.json`).
- Modo offline (PWA) e instalable en móvil/escritorio.
- Tema minimalista con selector de color.
- Generación rápida de mensaje para WhatsApp.

## Publicarlo gratis (GitHub Pages)

Ya se incluye un workflow para publicar el sitio en GitHub Pages al hacer merge en `main` (`.github/workflows/pages.yml`).

Pasos:

1. En GitHub: **Settings → Pages**.
2. En "Source", selecciona **GitHub Actions**.
3. Haz merge del PR a `main`.
4. Espera a que termine el workflow "Deploy static app to GitHub Pages".

Luego tendrás una URL pública del tipo:

```text
https://TU-USUARIO.github.io/CHAT-GPT/
```

## Notas

- No requiere backend ni registro/login.
- Los datos se guardan en `localStorage` del navegador.
- Para Excel se usa la librería `SheetJS` desde CDN.
