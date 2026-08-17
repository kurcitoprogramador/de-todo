# Variantes del isologo

## Version activa en la pagina

- `isologo-pastel-soft.png` (fuente original, 1254 px)
- `isologo/pastel-soft-600.png` (usado en el hero, optimizado para web: 189 KB)
- `isologo/pastel-soft-144.png` (usado en el header, optimizado: 17 KB)
- `favicon.ico` (favicon del sitio)

## Otras versiones

- `isologo-pastel-boutique.png`
- `isologo-pastel-light.png`
- `isologo-pastel-luxe.png`
- `isologo-web.png` (RGBA, fondo transparente)

## Como cambiar la version en la web

1. Abre `index.html`.
2. Busca `isologo-pastel-soft-600.png` (hero) o `isologo-pastel-soft-144.png` (header).
3. Reemplaza por la variante que quieras probar (usa sufijo `-600` y `-144`).
4. Guarda y abre la pagina en el navegador.

## Optimizacion para web

Los logos originales pesan 1.4–2.2 MB (1254 px). Se generaron versiones
optimizadas con `Pillow` (reduccion a 256 colores + resize) que pesan mucho
menos:

| Archivo | Uso en la web | Tamano |
|---|---|---|
| `-600.png` | Hero (logo principal) | 189 KB |
| `-144.png` | Header (marca pequena) | 17 KB |
| `-180.png` | Favicon / touch icon | 25 KB |
| `-64.png` | Favicon pequeno | 4 KB |

Regenera las optimizaciones con Python si cambias la fuente:

```python
from PIL import Image
src = Image.open("isologo/isologo-pastel-soft.png").convert("RGB")
for size, name in [(600,"600"),(144,"144"),(180,"180"),(64,"64")]:
    img = src.resize((size,size), Image.LANCZOS)
    img.convert("P", palette=Image.ADAPTIVE, colors=256).save(f"isologo/isologo-pastel-soft-{name}.png", optimize=True)
```

## Vista rapida

- Abre `isologo-variantes.html` para comparar todas las versiones.