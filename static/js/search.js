let spotifyOffset = 0;
let youtubePageToken = "";
let soundcloudOffset = 0;
let isLoggedIn = false;
let dropdownMenu;
let songIndex;
let songs;
let songIndexOptionsButton;

//All event listeners
window.addEventListener('load', async function() {
    isLoggedIn = await checkLoginStatusWithoutPopup();
    songIndex = 0;
    songs = [];

    document.querySelector('#searchResults').innerHTML = '';
    spotifyOffset = 0;
    youtubePageToken = "";

    const urlParams = new URLSearchParams(window.location.search);
    const searchInput = urlParams.get('q');

    document.querySelector('#miniSearchInput').value = searchInput;

    if (searchInput.trim() === '') {
        alert('Please enter a search query.');
    }
    else {
        await fetchSearchResults(searchInput, spotifyOffset, youtubePageToken, soundcloudOffset)
            .then(handleSearchResults)
            .catch(error => console.error('Error:', error));
    }
});

document.querySelector('#loadMoreResults').addEventListener('click', async function(event) {
    document.querySelector('#loadingSpinnerContainer').style.display = 'block';

    spotifyOffset += 10;
    soundcloudOffset += 10;

    const urlParams = new URLSearchParams(window.location.search);
    const searchInput = urlParams.get('q');

    await fetchSearchResults(searchInput, spotifyOffset, youtubePageToken, soundcloudOffset)
        .then(handleSearchResults)
        .catch(error => console.error('Error:', error));

    document.querySelector('#loadingSpinnerContainer').style.display = 'none';
});

document.body.addEventListener('click', function(event) {
    let optionsButton = event.target.closest('.options-button');
    let addToPlaylistButton = event.target.closest('.add-to-playlist-button');
    let createNewPlaylistButton = event.target.closest('.create-new-playlist-button');

    let addTab = event.target.closest('#addTab');
    let createTab = event.target.closest('#createTab');
    
    let playlistSelect = document.querySelector('#playlistSelect');

    if (optionsButton) {
        if (isLoggedIn) {
            if (dropdownMenu !== undefined && dropdownMenu.style.display === 'block') {
                dropdownMenu.style.display = 'none';
            } else {
                dropdownMenu = optionsButton.nextElementSibling;
                songIndexOptionsButton = optionsButton.id;
                dropdownMenu.style.display = 'block';
            }
        } else {
            openLoginPopup();
        }
    } else if (addToPlaylistButton) {
        createPlaylistPopup();
        document.querySelector('.playlist-popup').style.display = 'block';
        dropdownMenu.style.display = 'none';
        document.querySelector('#addTab').click();
    } else if (createNewPlaylistButton) {
        createPlaylistPopup();
        document.querySelector('.playlist-popup').style.display = 'block';
        dropdownMenu.style.display = 'none';
        document.querySelector('#createTab').click();
    } else if (addTab) {
        let addTabContent = document.querySelector('#addTabContent');
        addTab.classList.add('active');
        addTabContent.style.display = 'block';
        
        createTab = document.querySelector('#createTab')
        createTab.classList.remove('active');
        document.querySelector('#createTabContent').style.display = 'none';

        populatePlaylistSelect(playlistSelect);
    } else if (createTab) {
        let createTabContent = document.querySelector('#createTabContent');
        createTab.classList.add('active');
        createTabContent.style.display = 'block';

        addTab = document.querySelector('#addTab')
        addTab.classList.remove('active');
        document.querySelector('#addTabContent').style.display = 'none';

    } else if (event.target.closest('.closeButton')) {
        let playlistPopup = event.target.closest('.playlist-popup');
        if (playlistPopup !== null) {
            playlistPopup.style.display = 'none';
        }
    } else if (event.target.closest('.addSongButton')) {
        addSongToPlaylist(playlistSelect, songIndexOptionsButton);
    } else if (event.target.closest('.createPlaylistButton')) {
        createNewPlaylist(document.querySelector('.nameNewPlaylistInput'));
    } else {
        if(dropdownMenu !== undefined) {
            dropdownMenu.style.display = 'none';
        }
    }
});

//All functions
async function fetchSearchResults(searchInput, spotifyOffset, youtubePageToken, soundcloudOffset) {
    return await fetch(`/search/results?q=${encodeURIComponent(searchInput)}&spotifyOffset=${spotifyOffset}&youtubePageToken=${youtubePageToken}&soundcloudOffset=${soundcloudOffset}`)
        .then(response => response.json());
}

async function createResultElement(item) {
    document.querySelector('#loadingSpinnerContainer').style.display = 'block';

    let searchResults = document.createElement('div');
    let songName = document.createElement('p');
    let artistName = document.createElement('p');
    let songImage = document.createElement('img');
    let platformIcon = document.createElement('img');

    let songID;
    let songDuration;

    if (item.type === 'track') {
        songName.textContent = item.name;
        artistName.textContent = 'by ' + item.artists[0].name;
        songImage.src = item.album.images[0].url;
        songID = item.uri;
        songDuration = item.duration_ms / 1000;

        platformIcon.src = '/static/images/spotify.png';
        platformIcon.classList.add('platform-icon');

        searchResults.appendChild(platformIcon);
        searchResults.appendChild(songImage);
        searchResults.appendChild(songName);
        searchResults.appendChild(artistName);

        songs.push({ songName: songName.textContent, songArtist: item.artists[0].name, songImage: songImage.src, songID: songID, songDuration: songDuration });
        createSongOptions(searchResults, songIndex);
        songIndex++;

        document.querySelector('#loadingSpinner').style.display = 'none';
        return Promise.resolve({ result: searchResults, songDuration });
    } else if (item.kind === 'youtube#searchResult') {
        songName.textContent = item.snippet.title;
        artistName.textContent = 'by ' + item.snippet.channelTitle;
        songImage.src = item.snippet.thumbnails.default.url;
        songID = item.id.videoId;

        platformIcon.src = '/static/images/youtube.png';
        platformIcon.classList.add('platform-icon');

        return await fetch(`/youtube-duration?videoId=${encodeURIComponent(songID)}`)
            .then(response => response.text())
            .then(async duration => {
                songDuration = convertDurationToSeconds(duration);

                if (songDuration > 0) {
                    searchResults.appendChild(platformIcon);
                    searchResults.appendChild(songImage);
                    searchResults.appendChild(songName);
                    searchResults.appendChild(artistName);

                    songs.push({ songName: songName.textContent, songArtist: item.snippet.channelTitle, songImage: songImage.src, songID: songID, songDuration: songDuration });
                    createSongOptions(searchResults, songIndex);
                    songIndex++;
                }

                document.querySelector('#loadingSpinnerContainer').style.display = 'none';
                return Promise.resolve({ result: searchResults, songDuration });
            });
    } else if (item.urn.startsWith('soundcloud:tracks')) {
        songName.textContent = item.title;
        artistName.textContent = 'by ' + item.user.username;
        songImage.src = item.artwork_url;
        songID = item.urn;
        songDuration = item.duration / 1000;

        platformIcon.src = '/static/images/soundcloud.png';
        platformIcon.classList.add('platform-icon');

        searchResults.appendChild(platformIcon);
        searchResults.appendChild(songImage);
        searchResults.appendChild(songName);
        searchResults.appendChild(artistName);

        songs.push({ songName: songName.textContent, songArtist: item.user.username, songImage: songImage.src, songID: songID, songDuration: songDuration });
        createSongOptions(searchResults, songIndex);
        songIndex++;

        document.querySelector('#loadingSpinnerContainer').style.display = 'none';
        return Promise.resolve({ result: searchResults, songDuration });
    }
}

async function handleSearchResults(data) {
    if (data && data.combined) {
        const itemPromises = data.combined.map(createResultElement);

        Promise.all(itemPromises)
            .then(items => {
                items.forEach(({ result }) => {
                    if (result) {
                        document.querySelector('#searchResults').appendChild(result);
                    }
                });

                document.querySelector('#loadMoreResults').style.display = 'block';

                if (data.nextYoutubePageToken) {
                    youtubePageToken = data.nextYoutubePageToken;
                }
            })
            .catch(error => console.error('Error:', error));
    } else {
        console.error('Unexpected API response:', data);
    }
}

function createSongOptions(searchResults, songIndex) {
    let optionsButton = document.createElement('button');
    optionsButton.id = songIndex;
    optionsButton.textContent = '...';
    optionsButton.className = 'options-button';

    let dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'dropdown-menu';
    dropdownMenu.style.display = 'none';

    let addToPlaylistButton = document.createElement('a');
    addToPlaylistButton.className = 'add-to-playlist-button';
    addToPlaylistButton.textContent = 'Add to playlist';
    dropdownMenu.appendChild(addToPlaylistButton);

    let createNewPlaylistButton = document.createElement('a');
    createNewPlaylistButton.className = 'create-new-playlist-button';
    createNewPlaylistButton.textContent = 'Create new playlist';
    dropdownMenu.appendChild(createNewPlaylistButton);

    searchResults.appendChild(optionsButton);
    searchResults.appendChild(dropdownMenu);
}

function createPlaylistPopup() {
    //Popup creation
    let playlistPopup = document.createElement('div');
    playlistPopup.className = 'playlist-popup';
    document.body.appendChild(playlistPopup);

    //Creation of the tabs
    let createTab = document.createElement('div');
    createTab.id = 'createTab';
    createTab.className = 'tab';
    createTab.textContent = 'Create new playlist';
    playlistPopup.appendChild(createTab);
    
    let addTab = document.createElement('div');
    addTab.id = 'addTab';
    addTab.className = 'tab';
    addTab.textContent = 'Add to playlist';
    playlistPopup.appendChild(addTab);

    // Creation of add to playlist tab content
    let addTabContent = document.createElement('div');
    addTabContent.id = 'addTabContent';
    addTabContent.className = 'tabContent';
    playlistPopup.appendChild(addTabContent);

    let choosePlaylist = document.createElement('h3');
    choosePlaylist.className = 'choosePlaylist';
    choosePlaylist.textContent = 'Choose playlist:';
    addTabContent.appendChild(choosePlaylist);

    let playlistSelect = document.createElement('select');
    playlistSelect.id = 'playlistSelect';
    addTabContent.appendChild(playlistSelect);

    let addSongButton = document.createElement('button');
    addSongButton.className = 'addSongButton';
    addSongButton.textContent = 'Add';
    addTabContent.appendChild(addSongButton);

    //Creation of create new playlist tab content
    let createTabContent = document.createElement('div');
    createTabContent.id = 'createTabContent';
    createTabContent.className = 'tabContent';
    playlistPopup.appendChild(createTabContent);

    let nameNewPlaylist = document.createElement('h3');
    nameNewPlaylist.textContent = 'Enter title:';
    nameNewPlaylist.className = 'nameNewPlaylist';
    createTabContent.appendChild(nameNewPlaylist);

    let nameNewPlaylistInput = document.createElement('input');
    nameNewPlaylistInput.type = 'text';
    nameNewPlaylistInput.className = 'nameNewPlaylistInput';
    nameNewPlaylistInput.placeholder = 'New playlist';
    createTabContent.appendChild(nameNewPlaylistInput);

    let createPlaylistButton = document.createElement('button');
    createPlaylistButton.className = 'createPlaylistButton';
    createPlaylistButton.textContent = 'Create playlist';
    createTabContent.appendChild(createPlaylistButton);

    //Creation of close button
    let closeButton = document.createElement('button');
    closeButton.className = 'closeButton';
    closeButton.textContent = 'X';
    playlistPopup.appendChild(closeButton);
}

async function populatePlaylistSelect(playlistSelect) {
    playlistSelect.innerHTML = '';

    let playlists = await fetchUserPlaylists();

    playlists.forEach(playlist => {
        let option = document.createElement('option');
        option.textContent = playlist.name;
        playlistSelect.appendChild(option);
    });
}

async function fetchUserPlaylists() {
    try {
        const response = await fetch('/user/playlist-names');
        const data = await response.json();
        return data.playlists;
    } catch (error) {
        throw new Error('Error fetching user playlists');
    }
}

function addSongToPlaylist(playlistSelect, songIndex) {
    let selectedPlaylist = playlistSelect.options[playlistSelect.selectedIndex].text;

    let song = songs[songIndex];

    if (selectedPlaylist !== null) {
        fetch(`/user/playlists/${selectedPlaylist}/songs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ playlistName: selectedPlaylist, songName: song.songName, songArtist: song.songArtist, songImage: song.songImage, songID: song.songID, songDuration: song.songDuration})
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('Song is already in playlist');
                } else {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }
            return response.json();
        })
        .then(data => {
            openSuccessSongAddedPopup();
        })
        .catch(error => {
            openErrorSongAddedPopup(error.message);
        });
    }
}

function createNewPlaylist(nameNewPlaylistInput) {
    let playlistName = nameNewPlaylistInput.value;
    
    if (playlistName.trim() !== '') {
        fetch('/user/playlists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ playlistName: playlistName }),
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('Playlist already exists');
                } else {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }
            return response.json();
        })
        .then(data => {
            openSuccessPlaylistCreationPopup(playlistName);
        })
        .catch(error => {
            openErrorPlaylistCreationPopup(error.message);
        });
    } else {
        openErrorPlaylistCreationPopup("Playlist name cannot be empty");
    }
}

function openSuccessPlaylistCreationPopup(playlistName) {
    showOverlay();
    var successPopup = document.createElement('div');
    successPopup.className = 'successPopup';
    successPopup.textContent = 'Playlist "' + playlistName + '" successfully created';
    document.body.appendChild(successPopup);

    var closeButton = document.createElement('button');
    closeButton.className = 'closeButton';
    closeButton.textContent = 'X';
    successPopup.appendChild(closeButton);

    setTimeout(function() {
        if (document.body.contains(successPopup)) {
            hideOverlay();
            successPopup.style.display = 'none';
            document.body.removeChild(successPopup);
        }
    }, 3000); 

    closeButton.addEventListener('click', function() {
        if (document.body.contains(successPopup)) {
            hideOverlay();
            successPopup.style.display = 'none';
            document.body.removeChild(successPopup);
        }
    });
}

function closePlaylistCreationPopup() {
    hideOverlay();
    var playlistCreationPopup = document.getElementById('playlistCreationPopup');
    playlistCreationPopup.style.display = 'none';
}

function openErrorPlaylistCreationPopup(errorMessage) {
    showOverlay();
    var errorPopup = document.createElement('div');
    errorPopup.className = 'errorPopup';
    errorPopup.textContent = 'Error creating playlist: ' + errorMessage;
    document.body.appendChild(errorPopup);

    var closeButton = document.createElement('button');
    closeButton.className = 'closeButton';
    closeButton.textContent = 'X';
    errorPopup.appendChild(closeButton);

    setTimeout(function () {
        hideOverlay();
        errorPopup.style.display = 'none';
        document.body.removeChild(errorPopup);
    }, 3000);

    closeButton.addEventListener('click', function () {
        hideOverlay();
        errorPopup.style.display = 'none';
        document.body.removeChild(errorPopup);
    });
}

function openSuccessSongAddedPopup() {
    showOverlay();
    var successPopup = document.createElement('div');
    successPopup.className = 'successPopup';
    successPopup.textContent = 'Song successfully added';
    document.body.appendChild(successPopup);

    var closeButton = document.createElement('button');
    closeButton.className = 'closeButton';
    closeButton.textContent = 'X';
    successPopup.appendChild(closeButton);

    setTimeout(function() {
        hideOverlay();
        successPopup.style.display = 'none';
        document.body.removeChild(successPopup);
    }, 3000); 

    closeButton.addEventListener('click', function() {
        hideOverlay();
        successPopup.style.display = 'none';
        document.body.removeChild(successPopup);
    });
}

function openErrorSongAddedPopup(message) {
    showOverlay();
    var errorPopup = document.createElement('div');
    errorPopup.className = 'errorPopup';
    errorPopup.textContent = message;
    document.body.appendChild(errorPopup);

    var closeButton = document.createElement('button');
    closeButton.className = 'closeButton';
    closeButton.textContent = 'X';
    errorPopup.appendChild(closeButton);

    setTimeout(function () {
        hideOverlay();
        errorPopup.style.display = 'none';
        document.body.removeChild(errorPopup);
    }, 3000);

    closeButton.addEventListener('click', function () {
        hideOverlay();
        errorPopup.style.display = 'none';
        document.body.removeChild(errorPopup);
    });
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