
from flask import Flask, redirect, request, jsonify, session, render_template, send_from_directory
from db_connector import DBConnector
from db_query import DatabaseQuery
import requests
import base64
import urllib.parse
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("APP_SECRET_KEY")
sessions = {}
spotify_client_id = os.getenv("SPOTIFY_CLIENT_ID")
spotify_client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
spotify_credentials = base64.b64encode(f"{spotify_client_id}:{spotify_client_secret}".encode()).decode()
spotify_redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")
google_api_key = os.getenv("GOOGLE_API_KEY")
soundcloud_oauth_token = os.getenv("SOUNDCLOUD_OAUTH_TOKEN")
soundcloud_client_id = os.getenv("SOUNDCLOUD_CLIENT_ID")

# When accessing base URL to get to the main page
@app.route('/')
def home():
    return render_template('/main.html')

@app.route('/search')
def search():
    return render_template('/search.html')

# Searching for songs on Spotify and Youtube and showing the results
@app.route('/search/results')
def searchResult():

    query = request.args.get("q")
    spotify_offset = int(request.args.get("spotifyOffset", "0"))
    youtube_page_token = request.args.get("youtubePageToken", "")
    soundcloud_offset = int(request.args.get("soundcloudOffset", "0"))
    limit = 10

    spotify_search_request = {
        "url": f"https://api.spotify.com/v1/search?q={urllib.parse.quote(query)}&type=track&limit={limit}&offset={spotify_offset}",
        "headers": {
            "Authorization": "Bearer " + get_spotify_access_token()
        }
    }

    spotify_response = requests.get(**spotify_search_request)
    spotify_result = spotify_response.json()

    youtube_search_request = {
        "url": f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={urllib.parse.quote(query)}&type=video&maxResults={limit}&pageToken={youtube_page_token}&key={google_api_key}",
    }

    youtube_response = requests.get(**youtube_search_request)
    youtube_result = youtube_response.json()

    soundcloud_search_request = {
        "url": f"https://api-v2.soundcloud.com/search/tracks?q={urllib.parse.quote(query)}&client_id={soundcloud_client_id}&limit={limit}&offset={soundcloud_offset}"
    }

    soundcloud_response = requests.get(**soundcloud_search_request)
    soundcloud_result = soundcloud_response.json()

    combined_items = combine_results(spotify_result, youtube_result, soundcloud_result, limit)

    result = {
        "combined": combined_items
    }

    if "nextPageToken" in youtube_result:
        result["nextYoutubePageToken"] = youtube_result["nextPageToken"]

    if len(soundcloud_result) == limit:
        result["nextSoundcloudOffset"] = soundcloud_offset + limit    

    return jsonify(result)

# Getting the access token for Spotify
def get_spotify_access_token():
    token_request = {
        "grant_type": "client_credentials"
    }

    headers = {
        "Authorization": "Basic " + spotify_credentials
    }

    token_response = requests.post("https://accounts.spotify.com/api/token", data=token_request, headers=headers)
    return token_response.json()["access_token"]

# Combine the results from Spotify and YouTube
def combine_results(spotify_result, youtube_result, soundcloud_result, limit):
    spotify_items = spotify_result.get("tracks", {}).get("items", [])
    youtube_items = youtube_result.get("items", [])
    soundcloud_items = soundcloud_result.get("collection", [])

    combined_items = []

    for i in range(limit):
        if i < len(spotify_items):
            combined_items.append(spotify_items[i])
        if i < len(youtube_items):
            combined_items.append(youtube_items[i])
        if i < len(soundcloud_items):
            combined_items.append(soundcloud_items[i])    

    return combined_items

# Registers a new user
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    register_success = db_query.register_user(username, email, password)

    if register_success:
        return jsonify(status='success'), 200
    else:
        return jsonify(status='failure', message='Username or email already in use.'), 400
    
# Accessing the login page when login button is clicked
@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

# Accessing the playlist page when "Se mina spellistor"-link is clicked
@app.route('/playlists')
def playlists_page():
    return render_template('playlists.html')

# Accessing the playlist page when "Se mina spellistor"-link is clicked
@app.route('/register')
def register_page():
    return render_template('register.html')

# Accessing playlist page when clicking on a playlist
@app.route('/playlist/<name>')
def playlist_page(name):
    return render_template('playlist.html', name=name)

# Logs in the user
@app.route('/user/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    login_success = db_query.login_user(username, password)

    if login_success:
        session['username'] = username
        session['logged_in'] = True
        print("Logged in successfully")
        return jsonify(status='success', username=username), 200
    else:
        print("Login failed")
        return jsonify(status='failure', message='Invalid username or password'), 401
    
# Checks if the user is logged in
@app.route('/user/login-status', methods=['GET'])
def login_status():
    return jsonify({"logged_in": session.get('logged_in', False)})

# Gets session id
@app.route('/user/session_id')
def user_session_id():
    session_id = request.args.get("session_id")

    if session_id is None:
        return jsonify(message="Session id not found"), 401
    else:
        return jsonify(session_id=session_id)

# Creates a new playlist
@app.route('/user/playlists', methods=['POST'])
def create_playlist():
    if 'logged_in' in session:
        data = request.get_json()
        playlist_name = data.get('playlistName')
        username = session.get('username')

        result = db_query.create_playlist(username, playlist_name)

        if result == 0:
            return jsonify(status='success', message='Playlist created successfully'), 200
        elif result == 1:
            return jsonify(status='failure', message='Playlist already exists'), 400
        else:
            return jsonify(status='failure', message='Error creating playlist'), 500
    else:
        return jsonify(status='failure', message='User not logged in'), 401

# Add song to playlist
@app.route('/user/playlists/<playlist_name>/songs', methods=['POST'])
def add_song_to_playlist(playlist_name):
    if 'logged_in' in session:
        data = request.get_json()
        song_id = data.get('songID')
        song_name = data.get('songName')
        artist_name = data.get('songArtist')
        song_image = data.get('songImage')
        song_duration = data.get('songDuration')
        username = session.get('username')

        result = db_query.add_song_to_playlist(username, playlist_name, song_id, song_name, artist_name, song_image, song_duration)

        if result == 0:
            return jsonify(status='success', message='Song added to playlist successfully'), 200
        elif result == 1:
            return jsonify(status='failure', message='Song is already in playlist'), 400
        else:
            return jsonify(status='failure', message='Error adding song to playlist'), 500
    else:
        return jsonify(status='failure', message='User not logged in'), 401

# Get a user's playlists
@app.route('/user/playlists', methods=['GET'])
def get_user_playlists():
    if 'logged_in' in session:
        username = session.get('username')
        playlists = db_query.get_user_playlists(username)
        
        return jsonify(status='success', playlists=playlists), 200
    else:
        return jsonify(status='failure', message='User not logged in'), 401

# Gets a user's playlist names
@app.route('/user/playlist-names', methods=['GET'])
def get_user_playlist_names():
    username = session.get('username')
    
    playlists = db_query.get_user_playlists(username)   
    playlists_dicts = [playlist.to_dict() for playlist in playlists]

    return jsonify(playlists=playlists_dicts)

# Get a specific playlist
@app.route('/user/playlists/<playlist_name>', methods=['GET'])
def get_playlist(playlist_name):
    if 'logged_in' in session:
        username = session.get('username')
        playlist = db_query.get_playlist(username, playlist_name)

        return jsonify(status='success', playlist=playlist.to_dict(), message='Playlist fetched successfully'), 200
    else:
        return jsonify(status='failure', message='User not logged in'), 401

# Gets a playlist's songs
@app.route('/user/playlists/<playlist_name>/songs', methods=['GET'])
def get_playlist_songs(playlist_name):
    if 'logged_in' in session:
        username = session.get('username')
        playlist_songs = db_query.get_playlist_songs(username, playlist_name)

        playlist_songs_dicts = [song.to_dict() for song in playlist_songs]

        return jsonify(status='success', playlistSongs=playlist_songs_dicts), 200
    else:
        return jsonify(status='failure', message='User not logged in'), 401

# Logs the user out
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    return jsonify(status='success'), 200

# Sends the user to sign in with Spotify
@app.route('/login/spotify')
def login_spotify():
    scopes = "user-read-private user-read-email streaming user-modify-playback-state user-read-playback-state"
    authorize_url = f"https://accounts.spotify.com/authorize?response_type=code&client_id={spotify_client_id}&scope={scopes}&redirect_uri={spotify_redirect_uri}"

    return redirect(authorize_url)

# Endpoint where the user gets sent to after logging in with Spotify
@app.route('/callback')
def callback():
    code = request.args.get("code")

    token_request_body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": spotify_redirect_uri
    }

    headers = {
        "Authorization": "Basic " + spotify_credentials
    }

    token_request_url = "https://accounts.spotify.com/api/token"
    token_response = requests.post(token_request_url, data=token_request_body, headers=headers)

    try:
        response_json = token_response.json()
        access_token = response_json["access_token"]

        session_id = str(uuid.uuid4())
        sessions[session_id] = access_token

        return redirect('/login?session_id=' + session_id)
    except Exception as e:
        print(e)
        return jsonify(message="Error processing callback", error=str(e)), 500

# Gets the Spotify access token that is saved before
@app.route('/access_token')
def access_token():
    session_id = request.args.get("session_id")
    access_token = sessions.get(session_id)

    if access_token is None:
        return jsonify(message="Access token not found"), 401
    else:
        return jsonify(access_token=access_token)

# Gets a youtube video's duration
@app.route('/youtube-duration')
def youtube_duration():
    video_id = request.args.get("videoId")
    url = f"https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id={video_id}&key={google_api_key}"

    try:
        response = requests.get(url)
        response.raise_for_status()

        json_data = response.json()
        duration = json_data["items"][0]["contentDetails"]["duration"]

        return jsonify(duration=duration), 200
    except Exception as e:
        print(e)
        return jsonify(message="Couldn't retrieve the duration of the video"), 500
    
@app.route('/video-is-embeddable')
def is_embeddable():
    video_id = request.args.get("videoId")
    url = f"https://www.googleapis.com/youtube/v3/videos?part=status&id={video_id}&key={google_api_key}"

    try:
        response = requests.get(url)
        response.raise_for_status()

        json_data = response.json()
        embeddable = json_data["items"][0]["status"]["embeddable"]

        return jsonify(embeddable=embeddable), 200
    except Exception as e:
        print(e)
        return jsonify(message="Couldn't retrieve the embeddable status of the video"), 500    

# Main function
if __name__ == '__main__':
    db_connector = DBConnector()
    db_query = DatabaseQuery(db_connector)
    
    try:
        app.run('mixwavemusic.com', 80)
        
    finally:
        db_connector.close_connection()