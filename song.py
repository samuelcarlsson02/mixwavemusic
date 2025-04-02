class Song:
    def __init__(self, song_id, song_name, artist_name, song_image, song_duration):
        self.song_id = song_id
        self.name = song_name
        self.artist = artist_name
        self.song_image = song_image
        self.duration = song_duration

    def to_dict(self):
        return {
            'song_id': self.song_id,
            'name': self.name,
            'artist': self.artist,
            'song_image': self.song_image,
            'duration': self.duration
        }