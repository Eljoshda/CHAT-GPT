# Spotify Playlist Helper

Aplicación de terminal que se conecta a tu cuenta de Spotify, muestra un menú con tus playlists y exporta la playlist elegida a archivos CSV/M3U. También puede convertir a MP3 archivos de audio que ya tengas localmente y que tengas derecho a convertir.

> Importante: esta app **no descarga música de Spotify ni busca canciones en la web para descargarlas**. Spotify no permite descargar archivos de audio mediante su API y descargar música protegida desde fuentes no autorizadas puede infringir derechos de autor. El objetivo es ayudarte a organizar tus playlists y convertir archivos locales propios.

## Requisitos

- Python 3.10 o superior.
- Una app creada en el [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- `ffmpeg` instalado si quieres usar la conversión a MP3 local.

## Instalación

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configuración de Spotify

Crea una app en Spotify Developer Dashboard y agrega una Redirect URI, por ejemplo `http://127.0.0.1:8080/callback`. Luego exporta estas variables:

```bash
export SPOTIPY_CLIENT_ID="tu_client_id"
export SPOTIPY_CLIENT_SECRET="tu_client_secret"
export SPOTIPY_REDIRECT_URI="http://127.0.0.1:8080/callback"
```

## Uso

Ejecuta la app:

```bash
python spotify_playlist_helper.py
```

Verás un menú con el texto `¿Qué playlist quieres descargar?`. Al elegir una playlist, la app generará:

- `exports/<playlist>.csv`: metadatos de canciones, artistas, álbum, duración, enlace de Spotify y etiqueta de búsqueda.
- `exports/<playlist>.m3u`: lista M3U de referencia con enlaces de Spotify como comentarios.

## Convertir archivos locales propios a MP3

Si ya tienes archivos de audio en tu computadora y cuentas con los derechos necesarios, puedes convertirlos a MP3:

```bash
python spotify_playlist_helper.py --convert-local-dir ./mi_audio --mp3-output-dir ./converted_mp3
```

Formatos de entrada soportados: AAC, AIFF, ALAC, FLAC, M4A, OGG, OPUS, WAV y WMA. La conversión depende de `ffmpeg`.

## Qué hacer si quieres escuchar offline

Para escuchar offline de forma legal, usa la función de descarga offline de Spotify Premium dentro de la app oficial de Spotify, o compra/descarga música desde tiendas y servicios que te otorguen una licencia de descarga.
