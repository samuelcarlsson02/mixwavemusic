//All variables

//All event listeners
window.addEventListener('load', async function() {
    const isLoggedIn = await checkLoginStatus();

    if (isLoggedIn) {
        const playlistsContainer = document.getElementById('playlists');
        const playlists = await fetchUserPlaylists();
    
        for (const playlist of playlists) {
            const playlistButton = document.createElement('button');
            playlistButton.textContent = playlist.name;
            playlistButton.id = 'playlistButton';
            playlistsContainer.appendChild(playlistButton);
            playlistButton.addEventListener('click', function() {
                window.location.href = '/playlist/' + playlist.name;
            });
        }
    }
});

//All functions
async function fetchUserPlaylists() {
    try {
        const response = await fetch('/user/playlist-names');
        const data = await response.json();
        return data.playlists;
    } catch (error) {
        throw new Error('Error fetching user playlists');
    }
}