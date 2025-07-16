import Provider from './Provider.js';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';

const ALLOWED_REGIONS = ['World', 'Japan', 'Europe', 'USA', 'Australia', 'Taiwan', 'China', 'Korea', 'France', 'Germany', 'Canada', 'Italy', 'Spain', 'Netherlands'];
const ALLOWED_FLAGS = ['Demo', 'Beta', 'Kiosk', 'Virtual Console', 'DLC', 'Update', 'Channel'];

export default class MyrientProvider extends Provider {
    constructor() {
        super();
        this.hideBrowser = false;
        this.headlessBrowser = false;
        this.selectorTimeout = 10000;
    }

    async search(query) {
        let browser = await this.newBrowser();
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
            let title = `${rawTitle.replace(/\s*\([^()]*\)/g, '').replace(/\.zip$/i, '').trim()}${flagsText}`;
            results.push({ title, amount, year, href });
        }

        await browser.close();
        return results;
    }

    async download(task) {
        let browser = await this.newBrowser();
        let context = await browser.newContext({ acceptDownloads: true });
        let page = await context.newPage();
        await page.goto(this.baseURL, { waitUntil: 'networkidle' });

        let [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click(`a[href='${task.data.href}']`)
        ]);

        let cleanTitle = task.data.title.replace(/[<>:"\/\|?*]/g, '');
        let destDir = path.join(this.basePath, cleanTitle);
        await fs.promises.mkdir(destDir, { recursive: true });
        let zipPath = path.join(destDir, `${cleanTitle}.zip`);

        await download.saveAs(zipPath);
        await fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: destDir }))
            .promise();

        await browser.close();
    }

    async newBrowser() {
        return chromium.launch({
            headless: this.headlessBrowser,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--lang=en-US',
                this.hideBrowser ? '--headless=new' : ''
            ]
        });
    }
}
