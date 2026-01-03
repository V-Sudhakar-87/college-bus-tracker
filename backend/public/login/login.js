const token = localStorage.getItem("jwtToken");
const role = localStorage.getItem("userRole");

if (token && role) {
  if (role === "Student") {
    window.location.href = "../student/student.html";
  } else if (role === "Driver") {
    window.location.href = "../driver/driver.html";
  } else if (role === "Incharge") {
    window.location.href = "../incharge/incharge-dashboard.html";
  }
}

document.addEventListener('DOMContentLoaded', function() {
    const roleButtons = document.querySelectorAll('.role-btn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm'); 
    const signupLinkContainer = document.getElementById('signupLinkContainer');
    const selectedRoleInput = document.getElementById('selectedRole');
    const messageElement = document.getElementById('message');

    // Role Selection Logic
    function handleRoleSelection(role) {
        roleButtons.forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`.role-btn[data-role="${role}"]`).classList.add('selected');
        selectedRoleInput.value = role; 

        if (role === 'Incharge') {
            signupLinkContainer.style.display = 'block';
        } else {
            signupLinkContainer.style.display = 'none';
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
        }
    }

    handleRoleSelection('Student'); 

    roleButtons.forEach(button => {
        button.addEventListener('click', () => {
            handleRoleSelection(button.getAttribute('data-role'));
        });
    });

    // Signup Form Toggling (Show/Hide)
    document.getElementById('toggleSignup').onclick = (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        signupLinkContainer.style.display = 'none';
        messageElement.textContent = ''; 
    };

    document.getElementById('backToLogin').onclick = (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        signupLinkContainer.style.display = 'block';
        messageElement.textContent = '';
    };

    //Login Submission Logic
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault(); 

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = selectedRoleInput.value; 
        
        messageElement.textContent = ''; 

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, role }) 
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('jwtToken', data.token); 
                localStorage.setItem('userRole', data.user.role);
                localStorage.setItem('userName', data.user.name);

                if (data.user.role === 'Student') {
                   window.location.href = '../student/student.html';
                } else if (data.user.role === 'Driver') {
                    window.location.href = '../driver/driver.html'; 
                    
                } else if (data.user.role === 'Incharge') {
                    window.location.href = '../incharge/incharge-dashboard.html'; 
                }
            } else {
                messageElement.textContent = data.message || 'Login failed. Check credentials.';
            }

        } catch (error) {
            messageElement.textContent = 'Server connection error. Please try again.';
            console.error('Fetch error:', error);
        }
    });
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const adminSecret = document.getElementById('adminSecret').value;

        messageElement.textContent = '';

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, password, role: 'Incharge', adminSecret })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Account created successfully! Please login.");
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
                signupLinkContainer.style.display = 'block';
                signupForm.reset();
            } else {
                messageElement.textContent = data.message || 'Signup failed.';
            }
        } catch (error) {
            messageElement.textContent = 'Server connection error.';
        }
    });

});