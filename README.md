# Inventario Mac Minimal (PWA)

Aplicación web minimalista para inventario personalizable enfocada en accesorios/dispositivos Mac.

## Características

- Inventario con campos base + campos personalizados.
- Variantes por ítem (ej. color/capacidad/modelo).
- Movimientos de stock (entrada/salida) con historial local.
- Importación y exportación en formato Excel (`.xlsx`).
- Respaldo y restauración de datos (`.json`).
- Modo offline (PWA) e instalable en móvil/escritorio.
- Tema minimalista con selector de color.
- Generación rápida de mensaje para WhatsApp.

## Uso rápido

1. Abrir `index.html` en un navegador moderno.
2. (Opcional) Servir localmente para habilitar Service Worker:

```bash
python3 -m http.server 8080
```

3. Ir a `http://localhost:8080`.

## Notas

- No requiere backend ni registro/login.
- Los datos se guardan en `localStorage` del navegador.
- Para Excel se usa la librería `SheetJS` desde CDN.
