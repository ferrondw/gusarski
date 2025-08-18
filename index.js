import { fileURLToPath, pathToFileURL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { Logger } from './src/utils/Logger.js';
import session from 'express-session';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const PORT = process.env.PORT || 3000;
const QUEUE_BATCH_LIMIT = 5;

//#region Express Server Setup
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
const useAuthentication = Boolean(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);

if (useAuthentication) {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true
        }
    }));
}
//#endregion

//#region Authentication
if (useAuthentication) {
    app.get('/auth', (req, res) => {
        if (req.session.loggedIn) {
            return res.redirect('/');
        }
        return res.sendFile(path.join(__dirname, 'public', 'auth.html'));
    });

    app.post('/login', (req, res) => {
        let { username, password } = req.body;
        if (username === process.env.AUTH_USERNAME && password === process.env.AUTH_PASSWORD) {
            req.session.loggedIn = true;
            return res.redirect('/');
        }
        req.session.destroy(() => {
            res.redirect('/auth?fail=1');
        });
    });

    app.use((req, res, next) => {
        let publicPaths = ['/auth', '/login'];
        let isPublic = publicPaths.includes(req.path) || req.path.startsWith('/assets/');

        if (isPublic) return next();
        if (req.session?.loggedIn) return next();
        return res.redirect('/auth');
    });
} else {
    Logger.warning('Auth disabled');
}
//#endregion

//#region Statics
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'))); // just so it all works in subfolders too
app.use(express.json());
//#endregion

var downloadQueue = []; // { taskId, providerId, state, progressMessages, data }
var currentDownloadCount = 0;
var taskIdCounter = 1;

const providers = await (async () => {
    let providersDir = path.join(__dirname, 'src', 'providers');
    let filePaths = fs.readdirSync(providersDir).filter(f => f.endsWith('.js'));

    let modules = await Promise.all(
        filePaths.map(filePath => import(pathToFileURL(path.join(providersDir, filePath)).href))
    );
    return modules.map(m => new m.default());
})();

//#region WebSocket Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
    ws.send(JSON.stringify({ type: 'queue', queue: downloadQueue }));

    let completedFile = path.join(__dirname, 'completed.txt');
    let items = [];
    try {
        let data = fs.readFileSync(completedFile, 'utf-8');
        items = data.split(/\r?\n/).filter(Boolean);
    } catch (e) {
        try {
            fs.writeFileSync(completedFile, '');
        } catch (err) {
            Logger.error('Failed to create completed.txt', err);
        }
    }
    ws.send(JSON.stringify({ type: 'downloadedItems', items }));

    ws.on('message', msg => {
        let data;
        try { data = JSON.parse(msg); } catch { return; }
        switch (data.action) {
            case 'add': addTask(data.providerID, data.data); break;
            case 'force': forceTask(data.id); break;
            case 'retry': retryTask(data.id); break;
            case 'remove': downloadQueue = downloadQueue.filter(t => t.id !== data.id); break;
            case 'toggleComplete': toggleTaskComplete(data); break;
            default: break;
        }
        broadcastQueue();
    });
});
//#endregion

//#region Queue Management
function moveQueue() {
    while (currentDownloadCount < QUEUE_BATCH_LIMIT) {
        let nextTask = downloadQueue.find(task => task.state === 'pending');
        if (!nextTask) break;
        download(nextTask);
    }
}

function broadcastQueue() {
    let payload = JSON.stringify({ type: 'queue', queue: downloadQueue });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

function broadcastTaskStateUpdated(task) {
    let payload = JSON.stringify({ type: 'taskState', task });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
    });

    if (task.state === 'completed') {
        let name = task.data.title;
        let msg = JSON.stringify({ type: 'downloadedItems', items: [name] });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(msg);
        });
    }
}

function addTask(providerID, data) {
    let task = {
        id: taskIdCounter++,
        providerID,
        state: "pending",
        progressMessages: [],
        data
    };
    downloadQueue.push(task);
    broadcastQueue();
    moveQueue();
    return task;
}

function retryTask(id) {
    let task = downloadQueue.find(task => task.id == id);
    if (task.state !== 'failed') return;
    task.state = 'pending';
    broadcastQueue();
    moveQueue();
    return task;
}

function forceTask(id) {
    let task = downloadQueue.find(task => task.id == id);
    download(task);
    return task;
}

function toggleTaskComplete(data) {
    let completedFile = path.join(__dirname, 'completed.txt');
    let items = [];
    try {
        items = fs.readFileSync(completedFile, 'utf-8').split(/\r?\n/).filter(Boolean);
    } catch { }
    let id = items.indexOf(data.title);
    if (id === -1) {
        items.push(data.title);
    } else {
        items.splice(id, 1);
    }
    fs.writeFileSync(completedFile, items.join('\n') + (items.length ? '\n' : ''));
    let msgComplete = JSON.stringify({ type: 'downloadedItems', items });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(msgComplete);
    });
}

async function download(task) {
    task.state = "downloading";
    currentDownloadCount++;

    task.addMessage = (message) => {
        task.progressMessages.push(message);
        Logger.info(`${task.data.title} (Task ${task.id}): ${message}`);
        broadcastQueue();
    };

    providers[task.providerID].download(task)
        .then(async () => {
            task.state = "completed";
            fs.appendFile(path.join(__dirname, 'completed.txt'), `${task.data.title}\n`, (err) => {
                if (err) Logger.error(`Failed to add ${task.data.title} to the completed list`, err);
            });
        })
        .catch(e => {
            task.state = "failed";
            task.error = e.message; // not used but maybe handy later
        })
        .finally(() => {
            currentDownloadCount--;
            broadcastQueue();
            moveQueue();
            broadcastTaskStateUpdated(task);
        });
}
//#endregion

//#region Endpoints
// would like to move these to the websocket to not expose any endpoints
app.get('/search/:providerID/:query', async (req, res) => {
    try {
        let query = req.params.query;
        let providerID = req.params.providerID;

        if (!query || query.length == 0) {
            res.status(500);
            Logger.error(`No query given, search could not be started.`);
        }

        if (!providerID || providerID >= providers.length || providerID < 0) {
            res.status(500);
            Logger.error(`No provider ID given, search could not be started.`);
        }

        var results = await providers[providerID].search(query);

        if (!results || results.length == 0) {
            res.status(500);
            Logger.error(`No results`);
        }

        res.json(results);
    }
    catch {
        res.status(500);
    }
});

app.get('/proxy', async (req, res) => {
    try {
        let targetUrl = req.query.url;
        if (!targetUrl || targetUrl == null) return res.status(400).send("No URL specified");

        let decodedUrl = decodeURIComponent(targetUrl);
        let response = await fetch(decodedUrl);

        if (!response.ok) {
            res.status(500).send(`Fetch failed with status ${response.status}`);
        }

        let contentType = response.headers.get('content-type') || 'application/octet-stream';
        let buffer = Buffer.from(await response.arrayBuffer());

        res.set('Content-Type', contentType);
        res.send(buffer);
    } catch (err) {
        res.status(500).send("Error fetching url");
        Logger.error(`Proxy failed for: ${targetUrl}`, err);
    }
});

app.get('/providers', async (req, res) => {
    res.json(providers);
});
//#endregion

server.listen(PORT, () => {
    Logger.info(`Server listening at http://localhost:${PORT}`);
});