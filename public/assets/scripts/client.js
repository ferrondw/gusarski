const themes = {
    'dark': "Dark (Default)",
    'amoled': 'AMOLED',
    'dingendingen': 'DINGENDINGEN',
    'gold': 'Gold',
    'hue': 'Hue',
}
var currentTheme = localStorage.getItem('themeKey') || 'dark';

var socketReconnectInterval = null;
var socket;

var currentProviderID = localStorage.getItem('providerID') || 0;
var providers;

var downloadedItems = [];

const svgIcons = {
    'download': `<svg viewBox="0 0 24 24"><path d="M11 3v7H7l5 6 5-6h-4V3z"></path><path d="M19 19H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2z"></path></svg>`,
    'close': `<svg viewBox="0 0 24 24"><path d="m7.76 14.83-2.83 2.83 1.41 1.41 2.83-2.83 2.12-2.12.71-.71.71.71 1.41 1.42 3.54 3.53 1.41-1.41-3.53-3.54-1.42-1.41-.71-.71 5.66-5.66-1.41-1.41L12 10.59 6.34 4.93 4.93 6.34 10.59 12l-.71.71z"></path></svg>`,
    'retry': `<svg style="scale: 0.9;" viewBox="0 0 24 24"><path d="M19.07 4.93c-.45-.45-.95-.86-1.48-1.22a9.6 9.6 0 0 0-1.7-.92c-.6-.25-1.24-.45-1.88-.58-1.32-.27-2.71-.27-4.03 0-.64.13-1.27.33-1.88.58a9.96 9.96 0 0 0-4.4 3.62 9.6 9.6 0 0 0-.92 1.7c-.25.6-.45 1.24-.58 1.88-.13.66-.2 1.34-.2 2.01s.07 1.35.2 2.01c.13.64.33 1.27.58 1.88a9.96 9.96 0 0 0 3.62 4.4c.53.36 1.1.67 1.7.92s1.24.45 1.88.58c.66.13 1.34.2 2.01.2s1.35-.07 2.01-.2c.64-.13 1.27-.33 1.88-.58a9.96 9.96 0 0 0 4.4-3.62c.36-.53.67-1.1.92-1.7s.45-1.24.58-1.88c.13-.66.2-1.34.2-2.01h-2a7.85 7.85 0 0 1-.63 3.11c-.2.48-.45.93-.74 1.36-.28.42-.61.82-.98 1.19-.36.36-.76.69-1.18.98-.43.29-.88.54-1.36.74s-.99.36-1.5.47a8 8 0 0 1-4.73-.47c-.48-.2-.93-.45-1.36-.74-.42-.29-.82-.62-1.18-.98s-.69-.76-.98-1.19a7.8 7.8 0 0 1-.74-1.36c-.2-.48-.36-.99-.47-1.5-.11-.53-.16-1.07-.16-1.61a7.85 7.85 0 0 1 .63-3.11c.2-.48.45-.93.74-1.36.29-.42.62-.82.98-1.18s.76-.69 1.18-.98c.43-.29.88-.54 1.36-.74s.99-.36 1.5-.47a8 8 0 0 1 4.73.47c.48.2.93.45 1.36.74.42.29.82.62 1.18.98.17.17.32.34.48.52L15.98 9h6V3l-2.45 2.45c-.15-.18-.31-.36-.48-.52Z"></path></svg>`,
    'chevron': `<svg viewBox="0 0 24 24"><path d="m12 15.41 5.71-5.7-1.42-1.42-4.29 4.3-4.29-4.3-1.42 1.42z"></path></svg>`
}

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
        action: () => openModal('shortcutsModal')
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
                if (links[cl].rel === "stylesheet") links[cl].href += "";
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
    setupTransitionSpeedPicker();

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
    resultsContainer.style.display = "none";
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
        })[providers[stashProviderID].defaultPosterType || 'tv']; // tv is always default

        // empty the "Searching..." text and shove in all the search results
        emptyMessage.style.display = "none";
        resultsContainer.style.display = "flex";
        results.forEach(result => {

            let posterHTML = result.poster ? `<img src="${result.poster}">` : defaultPoster;
            let amountHTML = result.amount ? `<span class="amount">${result.amount}</span>` : '';
            let yearHTML = result.year ? `<span class="year">${result.year}</span>` : '';

            let card = document.createElement('div');
            card.className = "card";
            card.addEventListener('click', (event) => {
                if (event.shiftKey) {
                    socket.send(JSON.stringify({
                        action: 'toggleComplete',
                        title: result.title
                    }));
                    return;
                }

                if (!card.classList.contains('completed')) {
                    addToQueue(result, stashProviderID);
                }
            });
            card.innerHTML = `
            ${posterHTML}
            <div class="overlay"></div>
            <div class="info">
            <div class="title">${result.title || 'Unknown'}</div>
            <div class="details">
            ${amountHTML}
            ${yearHTML}
            </div>
            </div>
            <button class="downloadButton" title="Download">${svgIcons['download']}</button>`;
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
            button = `<button onclick="taskAction('force', ${task.id})">${svgIcons['download']}Force</button>`;
        } else if (task.state === 'downloading') {
            button = ``;
        }
        else if (task.state == 'failed') {
            button = `<button onclick="taskAction('retry', ${task.id})">${svgIcons['retry']}Retry</button><button onclick="taskAction('remove', ${task.id})">${svgIcons['close']}Remove</button>`;
        } else { // probably completed
            button = `<button onclick="taskAction('remove', ${task.id})">${svgIcons['close']}Remove</button>`;
        }

        div.innerHTML = `
        <h4 class="queueTitle">${task.data.title}</h4>
        <p class="queueStatus">Status: ${task.state}</p>
        <p class="queueUpdate">${lastMessage}</p>
        <img class="providerIcon" src="${providers[task.providerID].icon}">
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
        } else if (card.classList.contains('completed')) {
            card.classList.remove('completed');
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
                downloadedItems = data.items;
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

    let html = '';
    Object.keys(sortedProviders).forEach(category => {
        let categoryHtml = `<div class="providerCategory">
            <div class="providerCategoryHeader">
                <h2>${category} <span style="font-size: 12px;">(${sortedProviders[category].length})</span></h2>
                <div class="categoryToggleButton">
                    ${svgIcons['chevron']}
                </div>
            </div>
            <div class="providerCategoryBody">`;

        sortedProviders[category].forEach(({ provider, index }) => {
            categoryHtml += `
                <button class="provider" onclick="pickProvider(${index})">
                    <img src="${provider.icon}">
                    <p>${provider.name}</p>
                </button>`;
        });

        categoryHtml += '</div></div>';
        html += categoryHtml;
    });

    providerPicker.innerHTML = html;

    document.querySelectorAll('#providerPicker .providerCategoryHeader')
        .forEach(header => {
            header.addEventListener('click', () => {
                let category = header.parentElement;
                category.classList.toggle('open');
                let body = category.querySelector('.providerCategoryBody');
                if (category.classList.contains('open')) {
                    body.style.maxHeight = `${body.scrollHeight + 20}px`;
                } else {
                    body.style.maxHeight = 0;
                }
            });
        });

    return providers;
}

async function pickProvider(id) {
    document.getElementById('currentProviderIcon').src = `${providers[id].icon}`;
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
        div.innerHTML = `<h2>${themes[key]}</h2><p>Small text</p>`;
        let useButton = document.createElement('button');
        useButton.innerText = 'Use Theme';
        useButton.addEventListener('click', () => {
            setTheme(key);
        });
        div.appendChild(useButton);
        themesModalBody.appendChild(div);
    }
}

function setupTransitionSpeedPicker() {
    let transitionSpeedSelect = document.getElementById('transitionSpeedSelect');
    let savedSpeed = localStorage.getItem('transitionSpeed') || '0.3s';
    transitionSpeedSelect.value = savedSpeed;
    document.documentElement.style.setProperty('--transition-speed', savedSpeed);
    transitionSpeedSelect.addEventListener('change', () => {
        let speed = transitionSpeedSelect.value;
        localStorage.setItem('transitionSpeed', speed);
        document.documentElement.style.setProperty('--transition-speed', speed);
    });
}

// clean? no. does it work? yes.
// makes all the methods usable directly in html, need to define this specifically because it is a module
window.pickProvider = pickProvider;
window.toggleSidebar = toggleSidebar;
window.openModal = openModal;
window.search = search;
window.addToQueue = addToQueue;
window.renderQueue = renderQueue;
window.taskAction = taskAction;