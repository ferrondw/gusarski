import { logger } from '../logger.js';
import Provider from './Provider.js';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createExtractorFromFile } from 'node-unrar-js';

export default class RomsLabProvider extends Provider {
    constructor() {
        super();
        this.hideBrowser = false;
        this.headlessBrowser = false;
        this.selectorTimeout = 10000;
    }

    async search(query) {
        let browser;
        try {
            browser = await this.newBrowser();
            const page = await browser.newPage();
            await page.goto(
                `https://romslab.com/?s=${encodeURIComponent(query)}&post_type=post`,
                { waitUntil: 'networkidle' }
            );

            const posts = await page.$$('.grid-posts .post-item');
            const results = [];

            for (const post of posts) {
                const link = await post.$('.post-thumbnail a.thumb-image');
                const href = await link.getAttribute('href');
                const poster = await link.$eval('img', img => img.src);
                const rawTitle = await post.$eval(
                    '.heading-title',
                    el => el.innerText.trim()
                );

                if (this.titleExcludeRegex.test(rawTitle)) continue;

                const title = rawTitle
                    .replace(this.titleReplaceRegex, '$1')
                    .toLowerCase()
                    .replace(/\b\w/g, char => char.toUpperCase());

                results.push({ title, href, poster });
            }

            logger.logInfo(`Found ${results.length} results for query: ${query}`);
            return results;
        } catch (e) {
            logger.logError('Search failed: ' + e.message);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }

    async download(task) {
        let browser;
        try {
            browser = await this.newBrowser();
            const context = await browser.newContext({ locale: 'en-US' });
            const page = await context.newPage();
            const { href, title } = task.data;

            context.on('page', p => p !== page && p.close());
            page.on('dialog', dialog => dialog.dismiss());

            await page.goto(href, { waitUntil: 'networkidle' });
            const links = await page.$$eval(
                '.btns a.btn-download[href*=\"datanodes.to\"]',
                buttons => buttons.map(a => a.href)
            );

            const steps = [
                { url: links[0], folder: 'Base' },
                { url: links[1], folder: 'Updates' },
                { url: links[2], folder: 'DLC' }
            ];

            for (const step of steps) {
                if (!step.url) continue;
                await page.goto(step.url, { waitUntil: 'networkidle' });
                await this.handleDownloadLink(page, title, step.folder);
            }

        } catch (e) {
            logger.logError('Download failed: ' + e.message);
            throw new Error('Download failed');
        } finally {
            if (browser) await browser.close();
        }
    }

    async newBrowser() {
        return chromium.launch({
            headless: this.headlessBrowser,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--lang=en-US',
                this.hideBrowser ? '--headless=new' : ''
            ].filter(Boolean)
        });
    }

    logDirectoryTree(dir, prefix = '') {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            console.log(`${prefix}${entry.name}`);
            if (entry.isDirectory()) {
                this.logDirectoryTree(fullPath, `${prefix}  `);
            }
        }
    }

    flattenDirectory(dir, rootDir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                this.flattenDirectory(fullPath, rootDir);
                fs.rmdirSync(fullPath);
            } else {
                const destPath = path.join(rootDir, entry.name);
                fs.renameSync(fullPath, destPath);
            }
        }
    }

    async handleDownloadLink(page, gameTitle, folderName) {
        try {
            const safeTitle = gameTitle.replace(/[^a-z0-9\-]/gi, '_');
            const tempDir = path.join(this.basePath, safeTitle, 'temp');
            const outDir = path.join(this.basePath, safeTitle, folderName);
            fs.mkdirSync(tempDir, { recursive: true });
            fs.mkdirSync(outDir, { recursive: true });

            await page.waitForSelector('#downloadForm', { timeout: this.selectorTimeout });
            const freeBtn = page.locator('#method_free');
            await freeBtn.waitFor({ state: 'visible', timeout: this.selectorTimeout });
            await page.waitForTimeout(1000);
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle', timeout: this.selectorTimeout }),
                freeBtn.evaluate(btn => btn.click())
            ]);

            const btnSelector = 'div.shrink-0.w-full.md\\:w-auto > button';
            await page.waitForSelector(btnSelector, { timeout: this.selectorTimeout });
            await page.evaluate(sel => document.querySelector(sel).click(), btnSelector);
            await page.waitForFunction(
                sel => document.querySelector(sel)?.innerText.trim().startsWith('Continue'),
                btnSelector,
                { timeout: this.selectorTimeout + 5000 }
            );

            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.evaluate(sel => document.querySelector(sel).click(), btnSelector)
            ]);

            const archiveName = download.suggestedFilename();
            const archivePath = path.join(tempDir, archiveName);
            await download.saveAs(archivePath);
            console.log('Archive saved to:', archivePath);

            const extractor = await createExtractorFromFile({
                filepath: archivePath,
                targetPath: outDir
            });
            const extracted = extractor.extract();
            const files = [...extracted.files];
            console.log(`Extracted ${files.length} entries to ${outDir}`);
            files.forEach(f => console.log('  →', f.fileHeader.name));

            this.flattenDirectory(outDir, outDir);

            console.log('Final files in outDir:');
            this.logDirectoryTree(outDir);

            fs.rmSync(tempDir, { recursive: true, force: true });
            logger.logInfo(`Downloaded and extracted ${folderName} for ${gameTitle}`);
        } catch (e) {
            logger.logError(`Error in handleDownloadLink (${folderName}):`, e);
            throw new Error('Download error during handleDownloadLink');
        }
    }
}
