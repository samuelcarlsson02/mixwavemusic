class Playlist:
    def __init__(self, name, songs=None):
        self.name = name
        self.songs = songs if songs is not None else []
        self.id = None
        
    def to_dict(self):
        return {
            'name': self.name,
            'songs': [song.to_dict() for song in self.songs],
            'id': self.id
        }