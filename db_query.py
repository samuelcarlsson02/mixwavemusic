import psycopg2
from playlist import Playlist
from song import Song
from db_connector import DBConnector
from typing import List, Optional

class DatabaseQuery:
    def __init__(self, db_connector: DBConnector):
        self.connection = db_connector.connection

    def register_user(self, username: str, email: str, password: str) -> bool:
        with self.connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE username = %s OR email = %s", (username, email))
            if cursor.fetchone():
                return False

            cursor.execute("INSERT INTO users (username, password, email) VALUES (%s, %s, %s)", (username, password, email))
            self.connection.commit()
            return True

    def login_user(self, username: str, password: str) -> bool:
        with self.connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
            return bool(cursor.fetchone())

    def create_playlist(self, username: str, playlist_name: str) -> int:
        with self.connection.cursor() as cursor:
            # Check if playlist already exists
            cursor.execute("SELECT 1 FROM playlists WHERE name = %s AND username = %s", (playlist_name, username))
            if cursor.fetchone() is not None:
                return 1  # Playlist already exists

            cursor.execute("INSERT INTO playlists (name, username) VALUES (%s, %s)", (playlist_name, username))
            self.connection.commit()
            if cursor.rowcount > 0:
                return 0  # Playlist created successfully
            else:
                return 2  # Error creating playlist

    def get_user_playlists(self, username: str) -> List[Playlist]:
        playlists = []
        with self.connection.cursor() as cursor:
            sql = "SELECT name FROM playlists WHERE username = %s"
            cursor.execute(sql, (username,))
            rows = cursor.fetchall()
            for row in rows:
                playlists.append(Playlist(row[0]))

        return playlists

    def get_playlist(self, username: str, playlist_name: str) -> Optional[Playlist]:
        playlist = None
        with self.connection.cursor() as cursor:
            cursor.execute("SELECT playlist_id FROM playlists WHERE name = %s AND username = %s", (playlist_name, username))
            playlist_id = cursor.fetchone()[0]
            cursor.execute("SELECT p.name, s.songURL, s.title, s.artist, s.songImage, s.duration FROM playlists p JOIN playlist_songs ps ON p.playlist_id = ps.playlist_id JOIN songs s ON ps.songURL = s.songURL WHERE p.username = %s AND p.playlist_id = %s", (username, playlist_id))
            rows = cursor.fetchall()
            for row in rows:
                song = Song(row[1], row[2], row[3], row[4], row[5])
                if playlist is None:
                    playlist = Playlist(row[0], [song])
                else:
                    playlist.songs.append(song)
        return playlist

    def add_song_to_playlist(self, username: str, playlist_name: str, songID: str, songName: str, artistName: str, songImage: str, songDuration: int) -> int:
        with self.connection.cursor() as cursor:
            cursor.execute("SELECT songURL FROM songs WHERE songURL = %s", (songID,))
            if cursor.fetchone() is None:
                cursor.execute("INSERT INTO songs (songURL, title, artist, duration, songImage) VALUES (%s, %s, %s, %s, %s)", (songID, songName, artistName, songDuration, songImage))
            cursor.execute("SELECT playlist_id FROM playlists WHERE name = %s AND username = %s", (playlist_name, username))
            playlist_id = cursor.fetchone()[0]
            
            # Check if song is already in playlist
            cursor.execute("SELECT 1 FROM playlist_songs WHERE playlist_id = %s AND songURL = %s", (playlist_id, songID))
            if cursor.fetchone() is not None:
                return 1

            cursor.execute("INSERT INTO playlist_songs (playlist_id, songURL) VALUES (%s, %s)", (playlist_id, songID))
            self.connection.commit()
            if cursor.rowcount > 0:
                return 0  # Song added successfully
            else:
                return 2  # Error adding song to playlist

    def get_playlist_songs(self, username: str, playlist_name: str) -> List[Song]:
        songs = []
        with self.connection.cursor() as cursor:
            cursor.execute("SELECT playlist_id FROM playlists WHERE name = %s AND username = %s", (playlist_name, username))
            playlist_id = cursor.fetchone()[0]
            cursor.execute("SELECT s.songURL, s.title, s.artist, s.songImage, s.duration FROM songs s JOIN playlist_songs ps ON s.songURL = ps.songURL WHERE ps.playlist_id = %s", (playlist_id,))
            rows = cursor.fetchall()
            for row in rows:
                song = Song(row[0], row[1], row[2], row[3], row[4])
                songs.append(song)
        return songs
    
    def delete_all_playlists_and_songs(self):
        with self.connection.cursor() as cursor:
            cursor.execute("DELETE FROM playlist_songs")
            cursor.execute("DELETE FROM playlists")
            cursor.execute("DELETE FROM songs")
            self.connection.commit()