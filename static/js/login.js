//All variables
let sessionId;

//All event listeners
window.addEventListener('load', async function() {
    try {
        sessionId = new URLSearchParams(window.location.search).get('session_id');
    
        if(sessionId !== null) {
            setSessionId(sessionId);
            document.getElementById('loginWithSpotifyButton').style.display = 'none';
            document.getElementById('usernameInput').value = localStorage.getItem('username');
            document.getElementById('passwordInput').value = localStorage.getItem('password');
        } else {
            console.error('Session ID is null');
        }
    } catch (error) {
        console.error('Error checking session ID:', error.message);
    }
});
//ALl functions
function loginForm() {
    let username = document.getElementById("usernameInput").value;
    let password = document.getElementById("passwordInput").value;

    if (sessionId !== null) {
        fetch('/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: username, password: password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                window.location.href = '/';
            } else {
                openErrorPopup(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error.message);
        });
    } else {
        openErrorPopup('Please log in with Spotify to continue');
    }
}

function loginSpotify() {
    localStorage.setItem('username', document.getElementById('usernameInput').value);
    localStorage.setItem('password', document.getElementById('passwordInput').value);
    window.location.href = '/login/spotify';
}

function openRegister() {
    window.location.href = '/register';
}