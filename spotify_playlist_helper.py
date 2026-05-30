#!/usr/bin/env python3
"""Spotify playlist browser and legal local-audio MP3 converter.

This app intentionally does not download songs from the web. It uses Spotify only
for playlist metadata and can convert audio files that already exist locally and
that the user has the right to convert.
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import spotipy
else:
    spotipy = Any  # type: ignore[assignment]

SPOTIFY_SCOPES = "playlist-read-private playlist-read-collaborative"
SUPPORTED_AUDIO_EXTENSIONS = {
    ".aac",
    ".aiff",
    ".alac",
    ".flac",
    ".m4a",
    ".ogg",
    ".opus",
    ".wav",
    ".wma",
}


@dataclass(frozen=True)
class Track:
    """Small metadata record for a Spotify playlist item."""

    number: int
    title: str
    artists: str
    album: str
    duration_ms: int
    spotify_url: str

    @property
    def duration(self) -> str:
        total_seconds = self.duration_ms // 1000
        minutes, seconds = divmod(total_seconds, 60)
        return f"{minutes}:{seconds:02d}"

    @property
    def search_label(self) -> str:
        return f"{self.artists} - {self.title}"


@dataclass(frozen=True)
class PlaylistChoice:
    """Visible Spotify playlist entry."""

    number: int
    name: str
    playlist_id: str
    owner: str
    total_tracks: int


def slugify(value: str) -> str:
    """Return a filesystem-safe slug for generated files."""
    value = re.sub(r"[^\w\s.-]", "", value, flags=re.UNICODE).strip().lower()
    value = re.sub(r"[\s_]+", "-", value)
    return value or "playlist"


def build_spotify_client() -> "spotipy.Spotify":
    """Create an authenticated Spotify Web API client."""
    try:
        import spotipy
        from spotipy.oauth2 import SpotifyOAuth
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Faltan dependencias de Python. Ejecuta: pip install -r requirements.txt"
        ) from exc
    missing = [
        name
        for name in ("SPOTIPY_CLIENT_ID", "SPOTIPY_CLIENT_SECRET", "SPOTIPY_REDIRECT_URI")
        if not os.getenv(name)
    ]
    if missing:
        missing_names = ", ".join(missing)
        raise RuntimeError(
            "Faltan variables de entorno de Spotify: "
            f"{missing_names}. Consulta el README para configurarlas."
        )

    auth_manager = SpotifyOAuth(scope=SPOTIFY_SCOPES, open_browser=True)
    return spotipy.Spotify(auth_manager=auth_manager)


def get_current_user_playlists(client: spotipy.Spotify) -> list[PlaylistChoice]:
    """Fetch every playlist visible to the signed-in Spotify account."""
    playlists: list[PlaylistChoice] = []
    page = client.current_user_playlists(limit=50)

    while page:
        for item in page["items"]:
            owner = item.get("owner", {}).get("display_name") or item.get("owner", {}).get("id", "")
            playlists.append(
                PlaylistChoice(
                    number=len(playlists) + 1,
                    name=item["name"],
                    playlist_id=item["id"],
                    owner=owner,
                    total_tracks=item.get("tracks", {}).get("total", 0),
                )
            )
        page = client.next(page) if page.get("next") else None

    return playlists


def choose_playlist(playlists: list[PlaylistChoice]) -> PlaylistChoice:
    """Show the playlist menu and return the selected item."""
    if not playlists:
        raise RuntimeError("No encontré playlists en esta cuenta de Spotify.")

    print("\n¿Qué playlist quieres descargar?")
    print("Nota: esta app exporta metadatos y convierte archivos locales propios; no descarga música de la web.\n")
    for playlist in playlists:
        print(f"{playlist.number:>2}. {playlist.name} ({playlist.total_tracks} canciones) — {playlist.owner}")

    while True:
        raw = input("\nElige un número de playlist: ").strip()
        if raw.isdigit():
            index = int(raw)
            if 1 <= index <= len(playlists):
                return playlists[index - 1]
        print("Opción inválida. Escribe el número que aparece junto a la playlist.")


def get_playlist_tracks(client: spotipy.Spotify, playlist_id: str) -> list[Track]:
    """Fetch track metadata for one playlist."""
    tracks: list[Track] = []
    page = client.playlist_items(
        playlist_id,
        fields="next,items(track(name,artists(name),album(name),duration_ms,external_urls.spotify))",
        additional_types=("track",),
        limit=100,
    )

    while page:
        for item in page["items"]:
            track = item.get("track")
            if not track:
                continue
            artists = ", ".join(artist["name"] for artist in track.get("artists", []))
            tracks.append(
                Track(
                    number=len(tracks) + 1,
                    title=track.get("name", ""),
                    artists=artists,
                    album=track.get("album", {}).get("name", ""),
                    duration_ms=track.get("duration_ms", 0),
                    spotify_url=track.get("external_urls", {}).get("spotify", ""),
                )
            )
        page = client.next(page) if page.get("next") else None

    return tracks


def export_csv(tracks: Iterable[Track], output_path: Path) -> None:
    """Write playlist metadata to a CSV file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["#", "title", "artists", "album", "duration", "spotify_url", "search_label"])
        for track in tracks:
            writer.writerow(
                [
                    track.number,
                    track.title,
                    track.artists,
                    track.album,
                    track.duration,
                    track.spotify_url,
                    track.search_label,
                ]
            )


def export_m3u_placeholders(tracks: Iterable[Track], output_path: Path) -> None:
    """Write a legal placeholder M3U with comments and Spotify URLs."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as m3u:
        m3u.write("#EXTM3U\n")
        m3u.write("# Esta lista contiene referencias, no archivos de audio descargados.\n")
        for track in tracks:
            m3u.write(f"#EXTINF:{track.duration_ms // 1000},{track.search_label}\n")
            m3u.write(f"# {track.spotify_url}\n")


def convert_local_audio_to_mp3(input_dir: Path, output_dir: Path, bitrate: str = "192k") -> int:
    """Convert supported local audio files to MP3.

    The caller is responsible for ensuring they own or are licensed to convert
    the source files.
    """
    try:
        from pydub import AudioSegment
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Falta pydub. Ejecuta: pip install -r requirements.txt"
        ) from exc
    if not input_dir.exists() or not input_dir.is_dir():
        raise RuntimeError(f"La carpeta local no existe: {input_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)
    converted = 0
    for source in sorted(input_dir.rglob("*")):
        if not source.is_file() or source.suffix.lower() not in SUPPORTED_AUDIO_EXTENSIONS:
            continue
        relative = source.relative_to(input_dir).with_suffix(".mp3")
        destination = output_dir / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        print(f"Convirtiendo: {source} -> {destination}")
        audio = AudioSegment.from_file(source)
        audio.export(destination, format="mp3", bitrate=bitrate)
        converted += 1

    return converted


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Conecta con Spotify, lista playlists, exporta metadatos y convierte audio local propio a MP3."
    )
    parser.add_argument("--output-dir", default="exports", type=Path, help="Carpeta donde guardar CSV/M3U.")
    parser.add_argument(
        "--convert-local-dir",
        type=Path,
        help="Carpeta opcional con archivos de audio propios para convertir a MP3.",
    )
    parser.add_argument(
        "--mp3-output-dir",
        default=Path("converted_mp3"),
        type=Path,
        help="Carpeta de salida para conversiones MP3 locales.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])

    client = build_spotify_client()
    playlist = choose_playlist(get_current_user_playlists(client))
    tracks = get_playlist_tracks(client, playlist.playlist_id)

    basename = slugify(playlist.name)
    csv_path = args.output_dir / f"{basename}.csv"
    m3u_path = args.output_dir / f"{basename}.m3u"
    export_csv(tracks, csv_path)
    export_m3u_placeholders(tracks, m3u_path)

    print(f"\nExporté {len(tracks)} canciones a:")
    print(f"- {csv_path}")
    print(f"- {m3u_path}")

    if args.convert_local_dir:
        converted = convert_local_audio_to_mp3(args.convert_local_dir, args.mp3_output_dir)
        print(f"\nConvertí {converted} archivo(s) locales a MP3 en {args.mp3_output_dir}.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
