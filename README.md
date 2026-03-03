# Inventario Mac Minimal (Web + App)

MVP gratuito, offline y minimalista para gestionar stock de productos del ecosistema Mac.

## Incluye
- Web responsive + instalación como app (PWA).
- Alta/edición de productos con variantes y campos personalizables.
- Movimiento de stock (entrada, salida, ajuste).
- Importación/exportación Excel (XLSX/CSV).
- Respaldo y restauración en JSON.
- Personalización de color principal.
- Compartir resumen por WhatsApp.
- Funcionamiento offline con Service Worker.

## Ejecutar localmente
```bash
python3 -m http.server 8080
```
Abrir: `http://localhost:8080`

## Formato recomendado para importar Excel
Columnas sugeridas:
- `name`, `sku`, `category`, `model`, `variant`, `cost`, `price`, `supplier`, `owner`, `stock`, `notes`, `color`

También acepta equivalentes en español como `Nombre`, `SKU`, `Categoria`, `Modelo`, `Variante`, `Costo`, `Precio`, `Proveedor`, `Responsable`, `Stock`, `Notas`.
