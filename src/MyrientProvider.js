import Provider from './Provider.js';
import { PlaywrightUtils } from './utils/PlaywrightUtils.js';
import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import { Logger } from './utils/Logger.js';
import { FolderNameSanitizer } from './utils/FolderNameSanitizer.js';

const ALLOWED_REGIONS = ['World', 'Asia', 'Japan', 'Europe', 'USA', 'Australia', 'Taiwan', 'China', 'Korea', 'France', 'Germany', 'Canada', 'Italy', 'Spain', 'Netherlands'];
const ALLOWED_FLAGS = ['Demo', 'Beta', 'Kiosk', 'Virtual Console', 'DLC', 'Update', 'Channel'];

export default class MyrientProvider extends Provider {
    constructor() {
        super();
        this.hideBrowser = true;
        this.headlessBrowser = false;
        this.selectorTimeout = 10000;
        this.defaultPosterType = 'controller';
    }

    async search(query) {
        let browser = null;
        try {
            browser = await PlaywrightUtils.newBrowser(this.hideBrowser);
            let page = await browser.newPage();
            await page.goto(this.baseURL, { waitUntil: 'networkidle' });

            await page.focus('#search');
            await page.keyboard.type(query);

            let rows = await page.$$('#list tbody tr:not([hidden])');
            let results = [];

            for (let row of rows) {
                let linkEl = await row.$('td.link a');
                if (!linkEl) continue;
                let rawTitle = (await linkEl.getAttribute('title')) || (await linkEl.textContent());
                let href = await linkEl.getAttribute('href');
                let sizeEl = await row.$('td.size');
                let amount = sizeEl ? (await sizeEl.textContent()).trim() : null;

                let parenMatches = [...rawTitle.matchAll(/\(([^)]+)\)/g)].map(m => m[1]);

                let region = null;
                let flags = [];
                for (let content of parenMatches) {
                    if (ALLOWED_REGIONS.includes(content)) {
                        region = content;
                    } else if (ALLOWED_FLAGS.includes(content)) {
                        flags.push(content);
                    }
                }

                let year = region || null;
                let flagsText = flags.length ? ` (${flags.join(', ')})` : '';
                let title = `${FolderNameSanitizer.sanitize(rawTitle).replace(/\.zip$/i, '').trim()}${flagsText}`;
                results.push({ title, amount, year, href });
            }

            return results;
        } catch (e) {
            return [];
        } finally {
            try {
                if (browser) {
                    await browser.close();
                }
            } catch (e) {
                Logger.warning("Error while closing the browser: " + e.message);
            }
        }
    }

    async download(task) {
        let browser = null;
        try {
            browser = await PlaywrightUtils.newBrowser(this.hideBrowser);
            let page = await browser.newPage();
            await page.goto(this.baseURL, { waitUntil: 'networkidle' });

            task.addMessage('Downloading ZIP...')
            let [download] = await Promise.all([
                page.waitForEvent('download'),
                page.click(`a[href='${task.data.href}']`)
            ]);

            task.addMessage('Extracting ZIP...')
            let cleanTitle = FolderNameSanitizer.sanitize(task.data.title);
            let destDir = path.join(this.basePath, cleanTitle);
            await fs.promises.mkdir(destDir, { recursive: true });
            let zipPath = path.join(destDir, `${cleanTitle}.zip`);

            await download.saveAs(zipPath);
            await fs.createReadStream(zipPath)
                .pipe(unzipper.Extract({ path: destDir }))
                .promise();

            task.addMessage('Cleaning up ZIP file...');
            try {
                await fs.promises.unlink(zipPath);
                task.addMessage('ZIP file deleted.');
            } catch (err) {
                task.addMessage(`Failed to delete ZIP`);
            }
        } catch (e) {
            Logger.error(`Error downloading ${task.data.title}`, e);
            throw new Error('Error downloading');
        } finally {
            try {
                if (browser) {
                    await browser.close();
                }
            } catch (e) {
                Logger.warning("Error while closing the browser: " + e.message);
            }
        }
    }
}