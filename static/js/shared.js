//All variables

//ALl event listeners
window.addEventListener('load', async function() {
    try {
        const isLoggedIn = await checkLoginStatusWithoutPopup();

        const loginButton = document.getElementById('loginNavButton');

        if (isLoggedIn) {
            replaceWithLogoutButton(loginButton);
        }
    } catch (error) {
        console.error('Error checking login status:', error.message);
    }
});

document.addEventListener('keydown', function (event) {
    let searchInput;
    try {
        searchInput = document.querySelector('#searchInput').value;
    } catch (error) {
        searchInput = document.querySelector('#miniSearchInput').value;
    }

    if (event.key === 'Enter' && searchInput !== '' && !document.activeElement.classList.contains(searchInput)) {
        search();
    }
});

//All functions
function search() {
    let searchQuery;
    try {
        searchQuery = document.querySelector('#searchInput').value;
    } catch (error) {
        searchQuery = document.querySelector('#miniSearchInput').value;
    }

    window.location.href = '/search' + '?q=' + searchQuery;
}

function replaceWithLogoutButton(loginButton) {
    const logoutButton = loginButton;
    logoutButton.innerHTML = 'Log out';
    logoutButton.href = '/logout';
    logoutButton.id = 'logoutNavButton';
    logoutButton.addEventListener('click', async function (event) {
        event.preventDefault();
        try {
            const response = await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.status === 'success') {
                replaceWithLoginButton(logoutButton);
            } else {
                console.error('Logout failed:', data.message);
            }
        } catch (error) {
            console.error('Error during logout:', error.message);
        }
    });
}

function replaceWithLoginButton(logoutButton) {
    const loginButton = logoutButton;
    loginButton.innerHTML = 'Login';
    loginButton.href = '/login';
    loginButton.id = 'loginNavButton';
    loginButton.addEventListener('click', function () {
        window.location.href = '/login';
    });
}

async function checkLoginStatus() {
    return fetch('/user/login-status', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            if (!data.logged_in) {
                openLoginPopup();
            }
            return data.logged_in;
        })
        .catch(error => {
            console.error('Error checking login status:', error.message);
            return false;
        });
}

async function checkLoginStatusWithoutPopup() {

    return fetch('/user/login-status', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            return data.logged_in;
        })
        .catch(error => {
            console.error('Error checking login status:', error.message);
            return false;
        });
}

function closeLoginPopup() {
    hideOverlay();
    let loginPopup = document.getElementById('loginPopup');
    loginPopup.style.display = 'none';
}

function openLoginPopup() {
    showOverlay();
    let loginPopup = document.getElementById('loginPopup');
    loginPopup.style.display = 'block';
}

async function getAccessToken() {
    let sessionId = localStorage.getItem('session_id');
    const response = await fetch(`/access_token?session_id=${sessionId}`);
    const data = await response.json();
    return data.access_token;
}

function setSessionId(sessionId) {
    localStorage.setItem('session_id', sessionId);
}

function openErrorPopup(message) {
    showOverlay();
    document.getElementById("errorText").innerText = message;
    document.getElementById("errorPopup").style.display = "block";
}

function closeErrorPopup() {
    hideOverlay();
    document.getElementById("errorPopup").style.display = "none";
}

function openSuccessPopup(message) {
    document.getElementById('successText').innerText = message;
    document.getElementById('successPopup').style.display = 'block';
}

function showOverlay() {
    document.getElementById('overlay').style.display = 'block';
}

function hideOverlay() {
    document.getElementById('overlay').style.display = 'none';
}