import { fileURLToPath, pathToFileURL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import bodyParser from 'body-parser';
import { logger } from './logger.js';
import { readdirSync } from 'fs';
import express from 'express';
import http from 'http';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const QUEUE_BATCH_LIMIT = 5;

//#region Express Server Setup
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/icons', express.static(path.join(__dirname, 'src', 'providers', 'icons')));
app.use(express.json());
//#endregion

var downloadQueue = []; // { taskId, providerId, state, progressMessages, data }
var currentDownloadCount = 0;
var taskIdCounter = 1;

const providers = await (async () => {
    const providersDir = path.join(__dirname, 'src', 'providers');
    const filePaths = readdirSync(providersDir).filter(f => f.endsWith('.js'));

    const modules = await Promise.all(
        filePaths.map(filePath => import(pathToFileURL(path.join(providersDir, filePath)).href))
    );

    return modules.map(m => {
        const Provider = m.default;
        return new Provider();
    });
})();

//#region WebSocket Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
    ws.send(JSON.stringify({ type: 'queue', queue: downloadQueue })); // send the newly connected client the queue
    ws.on('message', msg => {
        var data;
        try { data = JSON.parse(msg); } catch { return; }
        switch (data.action) {
            case 'add': addTask(data.providerID, data.data); break;
            case 'force': forceTask(data.id); break;
            case 'remove': downloadQueue = downloadQueue.filter(t => t.id !== data.id); break;
            default: break;
        }
        broadcastQueue();
    });
});
//#endregion

//#region Queue Management
function moveQueue() {
    while (currentDownloadCount < QUEUE_BATCH_LIMIT) {
        const nextTask = downloadQueue.find(task => task.state === 'pending');
        if (!nextTask) break;
        runDownload(nextTask);
    }
}

function broadcastQueue() {
    const payload = JSON.stringify({ type: 'queue', queue: downloadQueue });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

function addTask(providerID, data) {
    const task = {
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

function forceTask(id) {
    const task = downloadQueue.find(task => task.id == id);
    runDownload(task);
    return task;
}

async function runDownload(task) {
    task.state = "downloading";
    currentDownloadCount++;

    task.addMessage = (message) => {
        task.progressMessages.push(message);
        logger.logInfo(`${task.data.title} (Task ${task.id}): ${message}`);
        broadcastQueue();
    };

    providers[task.providerID].download(task)
        .then(() => {
            task.state = "completed";
        })
        .catch(e => {
            task.state = "failed";
            task.error = e.message; // not used but maybe handy later
        })
        .finally(() => {
            currentDownloadCount--;
            broadcastQueue();
            moveQueue();
        });
    broadcastQueue();
    return task;
}
//#endregion

//#region Endpoints
app.get('/search/:providerID/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const providerID = req.params.providerID;

        if (!query || query.length == 0) {
            res.status(500);
            logger.logError(`No query given, search could not be started.`);
        }

        if (!providerID || providerID >= providers.length || providerID < 0) {
            res.status(500);
            logger.logError(`No provider ID given, search could not be started.`);
        }

        var results = await providers[providerID].search(query);

        if (!results || results.length == 0) {
            res.status(500);
            logger.logError(`No results`);
        }

        res.json(results);
    }
    catch {
        res.status(500);
    }

});

app.get('/proxy', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl || targetUrl == null) return res.status(400).send("No URL specified");

        const decodedUrl = decodeURIComponent(targetUrl);
        const response = await fetch(decodedUrl);

        if (!response.ok) {
            res.status(500).send(`Fetch failed with status ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = Buffer.from(await response.arrayBuffer());

        res.set('Content-Type', contentType);
        res.send(buffer);
    } catch (err) {
        res.status(500).send("Error fetching url");
        logger.logError(`Proxy failed for: ${targetUrl}`, err);
    }
});

app.get('/providers', async (req, res) => {
    res.json(providers);
});
//#endregion

server.listen(PORT, () => {
    logger.logInfo(`Server listening at http://localhost:${PORT}`);
});