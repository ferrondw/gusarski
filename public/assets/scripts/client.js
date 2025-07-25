const themes = ['dark', 'amoled', 'dingendingen', 'grounded', 'water', 'fire', 'light'];
var currentThemeIndex = parseInt(localStorage.getItem('themeIndex'), 10) || 0;

var socketReconnectInterval = null;
var socket;

var currentProviderID = 0;
var providers;

const shortcuts = [
    {
        name: 'Previous Provider',
        keybind: { ctrl: false, shift: true, alt: false, key: ',' },
        action: () => pickProvider((currentProviderID - 1 + providers.length) % providers.length)
    },
    {
        name: 'Next Provider',
        keybind: { ctrl: false, shift: true, alt: false, key: '.' },
        action: () => pickProvider((currentProviderID + 1) % providers.length)
    },
    {
        name: 'Focus Search',
        keybind: { ctrl: true, shift: false, alt: false, key: 'K' },
        action: () => document.getElementById('searchQuery').focus()
    },
    {
        name: 'Open Shortcuts Menu',
        keybind: { ctrl: true, shift: false, alt: false, key: '/' },
        action: () => document.getElementById('modalContainer').classList.add('open')
    },
    {
        name: 'Toggle Sidebar',
        keybind: { ctrl: true, shift: false, alt: false, key: 'B' },
        action: () => {
            let sidebar = document.getElementById('queueSidebar');
            let svg = document.querySelector('.sidebarToggle svg');
            sidebar.classList.toggle('open');
            svg.style.transform = sidebar.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    },
    {
        name: 'Close Modal',
        keybind: { ctrl: false, shift: false, alt: false, key: 'Escape' },
        action: () => document.getElementById('modalContainer').classList.remove('open')
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    setupWebSocket();
    providers = await getProviders();
    pickProvider(0);
    refreshTheme();
    setupShortcuts();

    document.getElementById('providerButton').addEventListener('click', () => {
        document.getElementById('providerPicker').classList.toggle('open');
    });

    document.getElementById('cycleThemeButton').addEventListener('click', () => {
        cycleThemes();
    });

    document.getElementById('shortcutsButton').addEventListener('click', () => {
        openModal('shortcutModal');
    });

    document.getElementById('closeModalButton').addEventListener('click', () => {
        closeModal();
    });

    let modalContainer = document.getElementById('modalContainer');
    modalContainer.addEventListener('click', (event) => {
        if (event.target === modalContainer) {
            closeModal();
        }
    });
});

async function search(overwriteQuery) {
    let queryInput = document.getElementById('searchQuery');

    let query = overwriteQuery || queryInput.value.trim();
    if (!query) return;

    // show the "Searching..." text, clear the search input, and clear any already existing search results
    let resultsContainer = document.getElementById('results');
    let emptyMessage = document.getElementById('emptyMessage');
    resultsContainer.innerHTML = "";
    queryInput.value = "";
    emptyMessage.style.display = "flex";
    emptyMessage.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_qM83{animation:spinner_8HQG 1.05s infinite}.spinner_oXPr{animation-delay:.1s}.spinner_ZTLf{animation-delay:.2s}@keyframes spinner_8HQG{0%,57.14%{animation-timing-function:cubic-bezier(0.33,.66,.66,1);transform:translate(0)}28.57%{animation-timing-function:cubic-bezier(0.33,0,.66,.33);transform:translateY(-6px)}100%{transform:translate(0)}}</style><circle class="spinner_qM83" cx="4" cy="12" r="3"/><circle class="spinner_qM83 spinner_oXPr" cx="12" cy="12" r="3"/><circle class="spinner_qM83 spinner_ZTLf" cx="20" cy="12" r="3"/></svg>';

    try {
        let stashProviderID = currentProviderID; // prevents user switching provider mid-search

        // try to fetch the really not that good api from the server
        let res = await fetch(`/search/${stashProviderID}/${encodeURIComponent(query)}`);
        let results = await res.json();
        if (!results || results.length === 0 || !Array.isArray(results)) {
            emptyMessage.innerText = "No results found";
            return;
        }

        // empty the "Searching..." text and shove in all the search results
        emptyMessage.style.display = "none";
        resultsContainer.innerHTML = "";
        results.forEach(result => {
            let defaultPoster = `<svg class="defaultPoster" width="24" height="24" viewBox="0 0 24 24">
            <path d="M20 6h-5.59l2.29-2.29-1.41-1.41L12 5.59 8.71 2.3 7.3 3.71 9.59 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2M4 19V8h16v11z"></path>
            </svg>`;

            let posterHTML = result.poster ? `<img src="/proxy?url=${encodeURIComponent(result.poster)}">` : defaultPoster;

            let card = document.createElement('div');
            card.className = "card";
            card.addEventListener('click', () => addToQueue(result, stashProviderID));
            card.innerHTML = `
            ${posterHTML}
            <div class="overlay"></div>
            <div class="info">
            <div class="title">${result.title || 'Unknown'}</div>
            <div class="details">
            <span class="amount">${result.amount || '?'}</span>
            <span class="year">${result.year || '?'}</span>
            </div>
            </div>
            <button class="downloadButton" title="Download">
            <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            </button>`;
            resultsContainer.appendChild(card);
        });
    } catch (err) {
        emptyMessage.style.display = "flex";
        emptyMessage.innerText = "Error fetching results";
    }
}

function addToQueue(data, providerID) {
    socket.send(JSON.stringify({ action: 'add', data, providerID }));
    showToast(`${data.title} added to queue.`);
}

function renderQueue(queue) {
    let queueList = document.getElementById('queueList');
    queueList.innerHTML = "";
    queue.forEach(task => {
        let div = document.createElement('div');
        div.className = "queueItem";
        let lastMessage = task.progressMessages.length ? task.progressMessages[task.progressMessages.length - 1] : "Nothing here yet (；′⌒`)";
        let button;
        if (task.state === 'pending') {
            button = `<button onclick="forceTask(${task.id})">Force</button>`;
        } else if (task.state === 'downloading') {
            button = ``;
        }
        else if (task.state == 'failed') {
            button = `<button onclick="retryTask(${task.id})">Retry</button><button onclick="removeTask(${task.id})">Remove</button>`;
        } else { // probably completed
            button = `<button onclick="removeTask(${task.id})">Remove</button>`;
        }

        div.innerHTML = `
        <h4 class="queueTitle">${task.data.title}</h4>
        <p class="queueStatus">Status: ${task.state}</p>
        <p class="queueUpdate">${lastMessage}</p>
        <div class="queueButtons">
        ${button}
        </div>`;
        queueList.appendChild(div);
    });
}

function forceTask(id) {
    socket.send(JSON.stringify({ action: 'force', id }));
}

function removeTask(id) {
    socket.send(JSON.stringify({ action: 'remove', id }));
}

function retryTask(id) {
    socket.send(JSON.stringify({ action: 'retry', id }));
}

function showToast(message) {
    let toastContainer = document.getElementById('toastContainer');
    let toast = document.createElement('div');
    toast.className = "toast";
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toastContainer.removeChild(toast), 2000);
}

//#region WebSocket
function setupWebSocket() {
    let icon = document.getElementById('wsIcon');
    let protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
    socket = new WebSocket(protocol + location.host);

    socket.addEventListener('open', () => {
        console.log('WebSocket connected');
        icon.classList.remove('disconnected');
        socket.send(JSON.stringify({ action: 'refresh' }));
        if (socketReconnectInterval) {
            clearInterval(socketReconnectInterval);
            socketReconnectInterval = null;
        }
    });

    socket.addEventListener('close', () => {
        console.log('WebSocket disconnected');
        icon.classList.add('disconnected');
        attemptReconnect();
    });

    socket.addEventListener('error', () => {
        console.error('WebSocket error');
        socket.close();
    });

    socket.addEventListener('message', event => {
        let data = JSON.parse(event.data);
        if (data.type === 'queue') {
            renderQueue(data.queue);
        }
    });
}

function attemptReconnect() {
    if (!socketReconnectInterval) {
        socketReconnectInterval = setInterval(() => {
            console.log('Attempting to reconnect WebSocket...');
            setupWebSocket();
        }, 1000);
    }
}
//#endregion

//#region Menus
function toggleSidebar() {
    let sidebar = document.getElementById('queueSidebar');
    let toggleButton = document.querySelector('.sidebarToggle');

    sidebar.classList.toggle('open');
    toggleButton.querySelector('svg').style.transform = sidebar.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
}

function openModal(id) {
    let modalContainer = document.getElementById('modalContainer');
    modalContainer.classList.add('open');
}

function closeModal() {
    let modalContainer = document.getElementById('modalContainer');
    modalContainer.classList.remove('open');
    for (let modalContent of modalContainer.children) {
        modalContent.classList.remove('open');
    }
}

let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
});

document.addEventListener('touchend', (event) => {
    touchEndX = event.changedTouches[0].clientX;
    let deltaX = touchEndX - touchStartX;
    let deltaY = event.changedTouches[0].clientY - touchStartY;
    let sidebar = document.getElementById('queueSidebar');
    let toggleButton = document.querySelector('.sidebarToggle');

    if (deltaX > 50 && Math.abs(deltaY) < 50) {
        sidebar.classList.remove('open');
        toggleButton.querySelector('svg').style.transform = 'rotate(0deg)';
    } else if (deltaX < -50 && Math.abs(deltaY) < 50) {
        sidebar.classList.add('open');
        toggleButton.querySelector('svg').style.transform = 'rotate(180deg)';
    }
});

function setupShortcuts() {
    let list = document.getElementById('shortcutList');
    shortcuts.forEach(({ name, keybind }) => {
        let li = document.createElement('li');
        let span = document.createElement('span');
        span.textContent = name;
        span.className = 'shortcutName';
        li.appendChild(span);
        ['ctrl', 'shift', 'alt'].forEach(mod => {
            if (keybind[mod]) {
                let k = document.createElement('kbd');
                k.textContent = mod.charAt(0).toUpperCase() + mod.slice(1);
                li.appendChild(k);
            }
        });
        let keyKbd = document.createElement('kbd');
        keyKbd.textContent = keybind.key;
        li.appendChild(keyKbd);
        list.appendChild(li);
    });

    document.addEventListener('keydown', (event) => {
        let tag = event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        shortcuts.forEach(({ keybind, action }) => {
            let match =
                (!!event.ctrlKey === keybind.ctrl) &&
                (!!event.shiftKey === keybind.shift) &&
                (!!event.altKey === keybind.alt) &&
                (event.key.toLowerCase() === keybind.key.toLowerCase());
            if (match) {
                event.preventDefault();
                action();
            }
        });
    });
}
//#endregion

async function getProviders() {
    let providerResponse = await fetch('/providers');
    let providers = await providerResponse.json();
    let providerPicker = document.getElementById('providerPicker');

    for (let index = 0; index < providers.length; index++) {
        let provider = providers[index];

        let button = document.createElement('div');
        button.classList.add('provider');
        button.innerHTML = `<img src="/icons/${provider.icon}"><p>${provider.name}</p>`;
        button.addEventListener('click', () => { pickProvider(index) });

        providerPicker.appendChild(button);
    }

    return providers;
}

async function pickProvider(id) {
    document.getElementById('currentProviderIcon').src = `/icons/${providers[id].icon}`;
    document.getElementById('providerPicker').classList.remove('open');
    document.getElementById('searchQuery').placeholder = providers[id].searchPlaceholder || 'Search...'
    currentProviderID = id;
}

function cycleThemes() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    refreshTheme();
}

function refreshTheme() {
    document.documentElement.className = themes[currentThemeIndex];
    localStorage.setItem('themeIndex', currentThemeIndex);
}

// clean? no. does it work? yes.
// makes all the methods usable directly in html, need to define this specifically because it is a module
window.toggleSidebar = toggleSidebar;
window.openModal = openModal;
window.search = search;
window.addToQueue = addToQueue;
window.renderQueue = renderQueue;
window.forceTask = forceTask;
window.retryTask = retryTask;
window.removeTask = removeTask;
window.showToast = showToast;