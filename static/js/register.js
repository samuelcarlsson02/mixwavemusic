//ALl variables

//All event listeners

//All functions
function submitForm() {
    var username = document.getElementById("usernameInput").value;
    var email = document.getElementById("emailInput").value;
    var password = document.getElementById("passwordInput").value;
    var confirmPassword = document.getElementById("confirmPasswordInput").value;

    if (password !== confirmPassword) {
        openErrorPopup("Passwords do not match!");
        return;
    }

    fetch('/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: username, email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            openSuccessPopup("Registration successful!");
            setTimeout(function () {
                window.location.href = '/login';
            }, 2000);
        } else {
            openErrorPopup(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
}