const params = new URLSearchParams(window.location.search);

if (params.get('fail') === '1') { // idk how else to do it, so when the param is added, show the message and remove it instantly
    document.getElementById('error').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    params.delete('fail');
    let newQuery = params.toString();
    let newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '');
    history.replaceState(null, '', newUrl);
}