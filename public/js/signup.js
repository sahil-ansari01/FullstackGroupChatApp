document.addEventListener('DOMContentLoaded', function() {
    const login = document.getElementById('login');
    if (login) {
        login.addEventListener('click', function() {
            window.location.href = '/user/login'
        })
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', signup)
    }
})

async function signup(e) {
    try {
        e.preventDefault();

        const signupDetails = {
            name: e.target.name.value,
            email: e.target.email.value,
            phone: e.target.phone.value,
            password: e.target.password.value,
        }

        const response = await axios.post('http://localhost:3000/user/signup', signupDetails);

        console.log(response);
        if (response.status === 201) {
            alert('Successfuly signed up!');
            window.location.href = '/user/login';
        } else {
            throw new Error('Failed to login!')
        }
    }
    
    catch(error) {
        if (error.response) {
            if (error.response.status === 400) {
                alert(error.response.data.error);
            } else if(error.response.status === 500) {
                alert('Phone number must be unqiue!')
            }
        } else if (error.request) {
            alert('No response from the server!')
        } else {
            alert('Error setting up the request!')  
        }
    }
}