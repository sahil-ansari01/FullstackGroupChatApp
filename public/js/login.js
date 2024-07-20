const token = localStorage.getItem('token');

async function login(e) {
    try {
        e.preventDefault();

        const loginDetails = {
            email: e.target.email.value,
            password: e.target.password.value
        };

        const res = await axios.post('http://34.207.64.152:3000/user/login', loginDetails);
        
        if (res.status === 200) {
            alert(res.data.message);
            localStorage.setItem('token', res.data.token);
            window.location.href = '/chat';
        } else {
            alert(res.data.message);
        }
    } catch (err) {
        alert(err.response.data.message);
    }
}