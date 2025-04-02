//All variables
let youtubePlayer;
let currentYoutubeSong = null;
let timer = null;
let isPaused = false;
let elapsedYoutubeSongTime = 0;
let songImage = document.createElement('img');
let songName = document.createElement('p');
let songArtist = document.createElement('p');
let currentSongIndex;
let playlistName;
let soundcloudPlayer;
let currentSoundCloudSong = null;
let elapsedSoundCloudSongTime = 0;
let soundcloudIframe;
let playlist;
let songSkipped = false;

//All event listeners
window.addEventListener('load', async function() {
    try {
        let songsDiv = document.querySelector('#songs');
        playlistName = window.location.pathname.split('/').pop();

        const playlistData = await fetchPlaylistSongs(playlistName);

        songsDiv.innerHTML = '';

        playlistData.playlistSongs.forEach(song => {
            let result = document.createElement('div');
            let songName = document.createElement('p');
            let artistName = document.createElement('p');
            let songImage = document.createElement('img');
            let platformIcon = document.createElement('img');
            platformIcon.classList.add('platform-icon');

            if (song.song_id.startsWith('spotify:track:')) {
                platformIcon.src = '/static/images/spotify.png';
            } else if (song.song_id.startsWith('soundcloud:tracks:')){
                platformIcon.src = '/static/images/soundcloud.png';
            } else {
                platformIcon.src = '/static/images/youtube.png';
            }

            songName.textContent = song.name;
            artistName.textContent = 'by ' + song.artist;
            songImage.src = song.song_image;

            result.appendChild(platformIcon);
            result.appendChild(songImage);
            result.appendChild(songName);
            result.appendChild(artistName);

            songsDiv.appendChild(result);
        });

        createPlaylistPage({ name: playlistName }); 

    } catch (error) {
        console.error('Error fetching playlist songs:', error.message);
    }
});

//All functions
function createPlaylistPage(playlist) {
    let playlistName = document.createElement('h1');
    playlistName.className = 'playlistName';
    playlistName.textContent = playlist.name;

    let playlistNameDiv = document.getElementById('playlistName');

    playlistNameDiv.appendChild(playlistName);
}

function onPlayerError(event) {
    console.log('Error:', event.data);
    switch (event.data) {
      case 2:
        console.log('Request contains an invalid parameter value');
        break;
      case 5:
        console.log('The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred');
        break;
      case 100:
        console.log('The video requested was not found');
        break;
      case 101:
      case 150:
        console.log('The owner of the requested video does not allow it to be played in embedded players');
        break;
    }
}

async function playYoutubeSong(youtubeSong) {
    currentYoutubeSong = youtubeSong;

    if (!youtubePlayer) {
        youtubePlayer = new YT.Player('player', {
            height: '360',
            width: '640',
            videoId: youtubeSong.song_id,
            events: {
                'onReady': onPlayerReady
            }
        });
    } else {
        youtubePlayer.loadVideoById(youtubeSong.song_id);
    }

    let songDuration = currentYoutubeSong.duration;

    await sleep(700);

    clearInterval(timer);
    if(elapsedYoutubeSongTime === 0) {
        let playerControls = document.getElementById('player-controls');

        songImage.src = currentYoutubeSong.song_image;
        songName.textContent = currentYoutubeSong.name;
        songArtist.textContent = currentYoutubeSong.artist;

        playerControls.appendChild(songImage);
        playerControls.appendChild(songName);
        playerControls.appendChild(songArtist);

        return new Promise(resolve => {
            elapsedYoutubeSongTime = 0;
            timer = setInterval(() => {
                if (!isPaused) {
                    elapsedYoutubeSongTime += 1;

                    let percentage = (elapsedYoutubeSongTime / songDuration) * 100;

                    document.getElementById('progress-bar').style.width = percentage + '%';
                    document.getElementById('elapsed-time').textContent = formatTime(elapsedYoutubeSongTime);
                    document.getElementById('total-time').textContent = formatTime(songDuration); 
                }

                if (songSkipped) {
                    songSkipped = false;
                    elapsedYoutubeSongTime = songDuration;
                }

                if (elapsedYoutubeSongTime >= songDuration) {
                    clearInterval(timer);
                    isPaused = false;
                    resolve();
                }
            }, 1000);
        });
    } else {
        return new Promise(resolve => {
            timer = setInterval(() => {
                if (!isPaused) {
                    elapsedYoutubeSongTime += 1;

                    let percentage = (elapsedYoutubeSongTime / songDuration) * 100;

                    document.getElementById('progress-bar').style.width = percentage + '%';
                    document.getElementById('elapsed-time').textContent = formatTime(elapsedYoutubeSongTime);
                    document.getElementById('total-time').textContent = formatTime(songDuration); 
                }

                if (songSkipped) {
                    songSkipped = false;
                    elapsedYoutubeSongTime = songDuration;
                }

                if (elapsedYoutubeSongTime >= songDuration) {
                    clearInterval(timer);
                    isPaused = false;
                    resolve();
                }
            }, 1000);
        });
    }
}

function onPlayerReady(event) {
    event.target.playVideo();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function playSoundcloudSong(soundcloudSong) {
    let songId = soundcloudSong.song_id.split('soundcloud:tracks:')[1];
    let songUrl = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${songId}&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`;
    currentSoundCloudSong = soundcloudSong;

    if (soundcloudIframe) {
        soundcloudIframe.remove();
    }

    soundcloudIframe = document.createElement('iframe');
    soundcloudIframe.id = 'sc-widget';
    soundcloudIframe.width = '100%';
    soundcloudIframe.height = '166';
    soundcloudIframe.scrolling = 'no';
    soundcloudIframe.frameborder = 'no';
    soundcloudIframe.src = songUrl;
    document.body.appendChild(soundcloudIframe);

    soundcloudPlayer = SC.Widget(soundcloudIframe);
    soundcloudPlayer.play();

    let songDuration = currentSoundCloudSong.duration;
    
    await sleep(700);

    clearInterval(timer);
    if(elapsedSoundCloudSongTime === 0) {
        let playerControls = document.getElementById('player-controls');

        songImage.src = currentSoundCloudSong.song_image;
        songName.textContent = currentSoundCloudSong.name;
        songArtist.textContent = currentSoundCloudSong.artist;

        playerControls.appendChild(songImage);
        playerControls.appendChild(songName);
        playerControls.appendChild(songArtist);

        return new Promise(resolve => {
            elapsedSoundCloudSongTime = 0;
            timer = setInterval(() => {
                if (!isPaused) {
                    elapsedSoundCloudSongTime += 1;

                    let percentage = (elapsedSoundCloudSongTime / songDuration) * 100;

                    document.getElementById('progress-bar').style.width = percentage + '%';
                    document.getElementById('elapsed-time').textContent = formatTime(elapsedSoundCloudSongTime);
                    document.getElementById('total-time').textContent = formatTime(songDuration); 
                }

                if (songSkipped) {
                    songSkipped = false;
                    elapsedSoundCloudSongTime = songDuration;
                }

                if (elapsedSoundCloudSongTime >= songDuration) {
                    clearInterval(timer);
                    isPaused = false;
                    resolve();
                }
            }, 1000);
        });
    } else {
        return new Promise(resolve => {
            timer = setInterval(() => {
                if (!isPaused) {
                    elapsedSoundCloudSongTime += 1;

                    let percentage = (elapsedSoundCloudSongTime / songDuration) * 100;

                    document.getElementById('progress-bar').style.width = percentage + '%';
                    document.getElementById('elapsed-time').textContent = formatTime(elapsedSoundCloudSongTime);
                    document.getElementById('total-time').textContent = formatTime(songDuration); 
                }

                if (songSkipped) {
                    songSkipped = false;
                    elapsedSoundCloudSongTime = songDuration;
                }

                if (elapsedSoundCloudSongTime >= songDuration) {
                    clearInterval(timer);
                    isPaused = false;
                    resolve();
                }
            }, 1000);
        });
    }
}

async function playPlaylist() {
    try {
        clearInterval(timer);
        isPaused = false;
        elapsedYoutubeSongTime = 0;
        currentSongIndex = 0;
        elapsedSoundCloudSongTime = 0;
        playlist = await fetchPlaylist(playlistName);

        while (currentSongIndex < playlist.songs.length) {
            let song = playlist.songs[currentSongIndex];
            if (song.song_id.startsWith('spotify:track:')) {
                await playSpotifyTrack(song);
            } else if (song.song_id.startsWith('soundcloud:tracks:')) {
                await playSoundcloudSong(song);
            } else {
                await playYoutubeSong(song);
            }
            currentSongIndex += 1;
        }

    } catch (error) {
        console.error('Error getting stored playlist:', error.message);
    }
}

async function skipSong() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }

    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('elapsed-time').textContent = '00:00';
    document.getElementById('total-time').textContent = '00:00';

    playlist = await fetchPlaylist(playlistName);

    if(playlist.songs[currentSongIndex].song_id.startsWith('spotify:track:')) {
        const accessToken = await getAccessToken();
        await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });
    } else if (playlist.songs[currentSongIndex].song_id.startsWith('soundcloud:tracks:')) {
        soundcloudPlayer.pause();
        elapsedSoundCloudSongTime = 0;
    } else {
        youtubePlayer.pauseVideo();
        elapsedYoutubeSongTime = 0;
    }

    isPaused = false;
    songSkipped = true;
    currentSongIndex += 1;
}

async function pauseSong() {
    isPaused = true;

    let playlist = await fetchPlaylist(playlistName);

    if(playlist.songs[currentSongIndex].song_id.startsWith('spotify:track:')) {
        const accessToken = await getAccessToken();
        await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });
    } else if (playlist.songs[currentSongIndex].song_id.startsWith('soundcloud:tracks:')) {
        soundcloudPlayer.pause();
    } else {
        youtubePlayer.pauseVideo();
    }
}

async function continuePlaySong() {
    if (currentSongIndex === undefined) {
        openErrorPopup('Use the big green play button to start playlist');
    } else {
        isPaused = false;

        let playlist = await fetchPlaylist(playlistName);
    
        if(playlist.songs[currentSongIndex].song_id.startsWith('spotify:track:')) {
            const accessToken = await getAccessToken();
            await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                }
            });
        } else if (playlist.songs[currentSongIndex].song_id.startsWith('soundcloud:tracks:')) {
            soundcloudPlayer.play();
        } else {
            youtubePlayer.playVideo();
        }
    }
}

async function playSpotifyTrack(spotifySong) {
    let songDuration = spotifySong.duration;

    const accessToken = await getAccessToken();

    const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    });
    const devicesData = await devicesResponse.json();

    if (!devicesData.devices) {
        console.error('No devices property in response:', devicesData);
        return;
    }

    if (devicesData.devices.length === 0) {
        console.error('No devices available');
        return;
    }

    const deviceId = devicesData.devices[0].id;

    await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify({
            'device_ids': [deviceId],
        })
    });
    
    fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify({
            uris: [spotifySong.song_id]
        })
    });

    let playerControls = document.getElementById('player-controls');

    songImage.src = spotifySong.song_image;
    songName.textContent = spotifySong.name;
    songArtist.textContent = spotifySong.artist;

    playerControls.appendChild(songImage);
    playerControls.appendChild(songName);
    playerControls.appendChild(songArtist);

    await sleep(200);

    return new Promise(resolve => {
        let elapsedTime = 0;
        timer = setInterval(() => {
            if (!isPaused) {
                elapsedTime += 1;
    
                let percentage = (elapsedTime / songDuration) * 100;
    
                document.getElementById('progress-bar').style.width = percentage + '%';
                document.getElementById('elapsed-time').textContent = formatTime(elapsedTime);
                document.getElementById('total-time').textContent = formatTime(songDuration);
            }

            if (songSkipped) {
                songSkipped = false;
                elapsedTime = songDuration;
            }
    
            if (elapsedTime >= songDuration) {
                clearInterval(timer);
                isPaused = false;
                resolve();
            }
        }, 1000);
    });
}

function formatTime(seconds) {
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;

    if (minutes < 10) minutes = '0' + minutes;
    if (remainingSeconds < 10) remainingSeconds = '0' + remainingSeconds;

    return minutes + ':' + remainingSeconds;
}

function convertDurationToSeconds(duration) {
    if (duration === 'P0D') {
        return 0;
    }

    let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  
    match = match.slice(1).map(function(x) {
        if (x != null) {
            return x.replace(/\D/, '');
        }
    });
  
    let hours = (parseInt(match[0]) || 0);
    let minutes = (parseInt(match[1]) || 0);
    let seconds = (parseInt(match[2]) || 0);
  
    return hours * 3600 + minutes * 60 + seconds;
}

async function fetchPlaylistSongs(playlistName) {
    try {
        const response = await fetch(`/user/playlists/${playlistName}/songs`);
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Error fetching playlist songs');
    }
}

async function fetchPlaylist(playlistName) {
    try {
        const response = await fetch(`/user/playlists/${playlistName}`);
        const data = await response.json();

        if (data.status === 'success') {
            return data.playlist;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error fetching playlist: ', error);
    }
}