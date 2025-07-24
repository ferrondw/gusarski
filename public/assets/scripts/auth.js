if (new URLSearchParams(window.location.search).get('fail') === '1') {
    document.getElementById('error').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

window.addEventListener('DOMContentLoaded', () => {
    const u = document.getElementById('username');
    const p = document.getElementById('password');
    setTimeout(() => {
        if (u.value && p.value) {
            document.getElementById('loginForm').submit();
        }
    }, 200);
});