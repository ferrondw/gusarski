const themes = {
    'dark': "Dark (Default)",
    'amoled': 'AMOLED',
    'dingendingen': 'DINGENDINGEN',
    'grounded': 'Grounded',
    'water': 'Water',
    'fire': 'Fire',
    'grass': 'Grass',
    'gold': 'Gold',
    'light': 'Light',
}
var currentTheme = localStorage.getItem('themeKey') || 'dark';

var socketReconnectInterval = null;
var socket;

var currentProviderID = localStorage.getItem('providerID') || 0;
var providers;

var downloadedItems = [];

const shortcuts = [
    {
        name: 'Previous Provider',
        keybind: { ctrl: false, shift: false, alt: false, key: ',' },
        action: () => pickProvider((currentProviderID - 1 + providers.length) % providers.length)
    },
    {
        name: 'Next Provider',
        keybind: { ctrl: false, shift: false, alt: false, key: '.' },
        action: () => pickProvider((currentProviderID + 1) % providers.length)
    },
    {
        name: 'Close Modal',
        keybind: { ctrl: false, shift: false, alt: false, key: 'Escape' },
        action: () => closeModal()
    },
    {
        name: 'Focus Search',
        keybind: { ctrl: true, shift: false, alt: false, key: 'K' },
        action: () => document.getElementById('searchQuery').focus()
    },
    {
        name: 'Open Shortcuts Menu',
        keybind: { ctrl: true, shift: false, alt: false, key: '/' },
        action: () => openModal('shortcutModal')
    },
    {
        name: 'Toggle Sidebar',
        keybind: { ctrl: true, shift: false, alt: false, key: 'B' },
        action: () => toggleSidebar()
    },
    {
        name: 'Reload CSS',
        keybind: { ctrl: true, shift: true, alt: false, key: 'L' },
        action: () => { // https://stackoverflow.com/questions/2024486/is-there-an-easy-way-to-reload-css-without-reloading-the-page
            let links = document.getElementsByTagName("link");
            for (let cl in links) {
                let link = links[cl];
                if (link.rel === "stylesheet")
                    link.href += "";
            }
        }
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    providers = await getProviders();
    setupWebSocket();
    pickProvider(currentProviderID || 0);
    setupThemePicker();
    refreshTheme();
    setupShortcuts();

    document.getElementById('providerButton').addEventListener('click', () => {
        document.getElementById('providerPicker').classList.toggle('open');
    });

    document.querySelectorAll('.closeModalButton').forEach(modal => {
        modal.addEventListener('click', () => {
            closeModal();
        });
    })

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

        // https://medium.com/@numberpicture/nugget-javascript-switch-expressions-e3bf059eefb0
        // https://boxicons.com
        let defaultPoster = ({
            "tv": `<svg class="defaultPoster" viewBox="0 0 24 24"><path d="M20 6h-5.59l2.29-2.29-1.41-1.41L12 5.59 8.71 2.3 7.3 3.71 9.59 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2M4 19V8h16v11z"></path></svg>`,
            "controller": `<svg class="defaultPoster" viewBox="0 0 24 24"><path d="M16 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2M18 9a1 1 0 1 0 0 2 1 1 0 1 0 0-2M16 7a1 1 0 1 0 0 2 1 1 0 1 0 0-2M14 9a1 1 0 1 0 0 2 1 1 0 1 0 0-2M8 8a2 2 0 1 0 0 4 2 2 0 1 0 0-4"></path><path d="M17 4H7C4.24 4 2 6.24 2 9v7.88a3.124 3.124 0 0 0 5.33 2.21l1.96-1.96c1.45-1.45 3.97-1.45 5.41 0l1.96 1.96c.59.59 1.37.91 2.21.91 1.72 0 3.12-1.4 3.12-3.12V9c0-2.76-2.24-5-5-5Zm3 12.88a1.118 1.118 0 0 1-1.91.79l-1.96-1.96c-1.1-1.1-2.56-1.71-4.12-1.71s-3.02.61-4.12 1.71l-1.96 1.96a1.118 1.118 0 0 1-1.91-.79V9c0-1.65 1.35-3 3-3h10c1.65 0 3 1.35 3 3v7.88Z"></path></svg>`,
            "book": `<svg class="defaultPoster" viewBox="0 0 24 24"><path d="M8 6h9v2H8z"></path><path d="M20 2H6C4.35 2 3 3.35 3 5v14c0 1.65 1.35 3 3 3h15v-2H6c-.55 0-1-.45-1-1s.45-1 1-1h14c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1m-6 14H6c-.35 0-.69.07-1 .18V5c0-.55.45-1 1-1h13v12z"></path></svg>`,
            "picture": `<svg class="defaultPoster" viewBox="0 0 24 24"><path d="M12 12 11 11 9 14 19 14 15 8 12 12z"></path><path d="m20,2h-12c-1.1,0-2,.9-2,2v12c0,1.1.9,2,2,2h12c1.1,0,2-.9,2-2V4c0-1.1-.9-2-2-2Zm-12,14V4h12v12s-12,0-12,0Z"></path><path d="m4,8h-2v12c0,1.1.9,2,2,2h12v-2H4v-12Z"></path></svg>`,
            "music": `<svg class="defaultPoster" viewBox="0 0 24 24"><path d="M3 11h12v2H3zM3 6h12v2H3zM3 16h9v2H3zM17 7v8.05a2.5 2.5 0 1 0-.5 4.95 2.5 2.5 0 0 0 2.5-2.5V8h2V6h-3c-.55 0-1 .45-1 1"></path></svg>`,
            "film": `<svg class="defaultPoster" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 4h-2V5h2zM7 11H5V9h2zm0 2v2H5v-2zm2 0h6v6H9zm0-2V5h6v6zm8 2h2v2h-2zm0-2V9h2v2zM7 5v2H5V5zM5 17h2v2H5zm12 2v-2h2v2z"></path></svg>`
        })[providers[stashProviderID].defaultPosterType] || posterType['tv']; // tv is always default

        // empty the "Searching..." text and shove in all the search results
        emptyMessage.style.display = "none";
        resultsContainer.innerHTML = "";
        results.forEach(result => {

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
        highlightCompleted();
    } catch (err) {
        emptyMessage.style.display = "flex";
        emptyMessage.innerText = "Error fetching results";
    }
}

function addToQueue(data, providerID) {
    socket.send(JSON.stringify({ action: 'add', data, providerID }));
    notification(`${data.title} added to queue.`, 'taskAdded');
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
            button = `<button onclick="taskAction('force', ${task.id})">Force</button>`;
        } else if (task.state === 'downloading') {
            button = ``;
        }
        else if (task.state == 'failed') {
            button = `<button onclick="taskAction('retry', ${task.id})">Retry</button><button onclick="taskAction('remove', ${task.id})">Remove</button>`;
        } else { // probably completed
            button = `<button onclick="taskAction('remove', ${task.id})">Remove</button>`;
        }

        div.innerHTML = `
        <h4 class="queueTitle">${task.data.title}</h4>
        <p class="queueStatus">Status: ${task.state}</p>
        <p class="queueUpdate">${lastMessage}</p>
        <img class="providerIcon" src="/icons/${providers[task.providerID].icon}">
        <div class="queueButtons">
        ${button}
        </div>`;
        queueList.appendChild(div);
    });
}

function highlightCompleted() {
    document.querySelectorAll('#results .card').forEach(card => {
        let title = card.querySelector('.title')?.textContent;
        if (title && downloadedItems.includes(title)) {
            card.classList.add('completed');
        }
    });
}

function taskAction(action, id) {
    socket.send(JSON.stringify({ action, id }));
}

function taskStateNotification(task) {
    switch (task.state) {
        case 'failed': notification(`${task.data.title} | Download Failed`, 'taskFailed'); break;
        case 'completed': notification(`${task.data.title} | Download Completed`, 'taskCompleted'); break;
    }
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
        switch (data.type) {
            case 'queue':
                renderQueue(data.queue);
                break;
            case 'downloadedItems':
                downloadedItems = downloadedItems.concat(data.items).filter((v, i, a) => a.indexOf(v) === i); // honestly no clue but it works
                highlightCompleted();
                break;
            case 'taskState':
                taskStateNotification(data.task);
                break;
            default: break;
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
    let modalContent = document.getElementById(id);
    modalContainer.classList.add('open');
    modalContent.classList.add('open');
    modalContent.style.pointerEvents = 'auto';
}

function closeModal() {
    let modalContainer = document.getElementById('modalContainer');
    modalContainer.classList.remove('open');
    for (let modalContent of modalContainer.children) {
        modalContent.classList.remove('open');
        modalContent.style.pointerEvents = 'none';
    }
}

//#region Sidebar
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
//#endregion

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
    let response = await fetch('/providers');
    let providers = await response.json();
    let providerPicker = document.getElementById('providerPicker');

    let sortedProviders = {};

    for (let index = 0; index < providers.length; index++) {
        let provider = providers[index];
        let category = provider.category || 'Unsorted';
        if (!sortedProviders[category]) sortedProviders[category] = [];
        sortedProviders[category].push({ provider, index });
    }

    // https://stackoverflow.com/questions/8763125/get-array-of-objects-keys
    Object.keys(sortedProviders).forEach(category => {
        let h2 = document.createElement('h2');
        h2.textContent = category;
        providerPicker.appendChild(h2);

        // can't just use category anymore because of the Object.keys
        sortedProviders[category].forEach(({ provider, index }) => {
            let button = document.createElement('div');
            button.classList.add('provider');
            button.innerHTML = `<img src="/icons/${provider.icon}"><p>${provider.name}</p>`;
            button.addEventListener('click', () => pickProvider(index));
            providerPicker.appendChild(button);
        });
    });

    return providers;
}


async function pickProvider(id) {
    document.getElementById('currentProviderIcon').src = `/icons/${providers[id].icon}`;
    document.getElementById('providerPicker').classList.remove('open');
    document.getElementById('searchQuery').placeholder = providers[id].searchPlaceholder || 'Search...'
    currentProviderID = id;
    localStorage.setItem('providerID', id);
}

function setTheme(key) {
    currentTheme = key;
    refreshTheme();
}

function refreshTheme() {
    document.documentElement.className = currentTheme || localStorage.getItem('themeKey');
    localStorage.setItem('themeKey', currentTheme);
}

function setupThemePicker() {
    let themesModalBody = document.getElementById('themesModalBody');

    for (let key in themes) {
        let div = document.createElement('div');
        div.classList.add('themePreview', key);
        div.innerHTML = `<h2>${themes[key]}</h2>
                         <p>Small text</p>`;
        let useButton = document.createElement('button');
        useButton.innerText = 'Use Theme';
        useButton.addEventListener('click', () => {
            setTheme(key);
        });
        div.appendChild(useButton);
        themesModalBody.appendChild(div);
    }
}

// clean? no. does it work? yes.
// makes all the methods usable directly in html, need to define this specifically because it is a module
window.toggleSidebar = toggleSidebar;
window.openModal = openModal;
window.search = search;
window.addToQueue = addToQueue;
window.renderQueue = renderQueue;
window.taskAction = taskAction;