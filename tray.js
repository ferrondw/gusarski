import { app, Tray, Menu, shell } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
let serverProcess = null;
let tray = null;

function startServer() {
    if (serverProcess) {
        console.log('Server is already running');
        return;
    }

    console.log('Starting server...');
    serverProcess = spawn(process.execPath, ['index.js'], {
        cwd: __dirname,
        detached: false,
        stdio: 'ignore'
    });

    serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
        serverProcess = null;
        updateMenu();
    });

    updateMenu();
    console.log(`Server started at http://localhost:${PORT}`);
}

function stopServer() {
    if (!serverProcess) {
        console.log('Server is not running');
        return;
    }

    console.log('Stopping server...');
    serverProcess.kill();
    serverProcess = null;
    updateMenu();
}

function restartServer() {
    console.log('Restarting server...');
    stopServer();
    setTimeout(() => {
        startServer();
    }, 1000);
}

function updateMenu() {
    const isRunning = serverProcess !== null;
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open in Browser',
            click: () => {
                shell.openExternal(`http://localhost:${PORT}`);
            }
        },
        { type: 'separator' },
        {
            label: 'Start Server',
            enabled: !isRunning,
            click: () => {
                startServer();
            }
        },
        {
            label: 'Stop Server',
            enabled: isRunning,
            click: () => {
                stopServer();
            }
        },
        {
            label: 'Restart Server',
            enabled: isRunning,
            click: () => {
                restartServer();
            }
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                stopServer();
                app.quit();
            }
        }
    ]);

    if (tray) {
        tray.setContextMenu(contextMenu);
    }
}

app.whenReady().then(() => {
    const iconPath = path.join(__dirname, 'public', 'assets', 'images', 'favicon.png');
    tray = new Tray(iconPath);
    tray.setTitle('Gusarski');
    tray.setToolTip('Gusarski');
    
    updateMenu();
    
    startServer();
});

app.on('window-all-closed', (e) => {
    e.preventDefault();
});

app.on('before-quit', () => {
    stopServer();
});

app.on('will-quit', () => {
    stopServer();
});