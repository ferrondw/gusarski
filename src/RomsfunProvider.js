import { Logger } from './utils/Logger.js';
import Provider from './Provider.js';
import { PlaywrightUtils } from './utils/PlaywrightUtils.js';
import { mkdirp } from 'mkdirp';
import path from 'path';
import fs from 'fs';

export default class RomsfunProvider extends Provider {
    constructor() {
        super();
        this.name = 'Romsfun Base';
        this.id = 'romsfunbase';
        this.defaultPosterType = 'controller';
        this.category = 'Nintendo';
        this.searchPlaceholder = 'Search games...';
    }

    async search(query) {
        try {
            let searchUrl = `https://romsfun.com/browse-all-roms/?q=${encodeURIComponent(query)}&consoles=${this.consoleId}`;
            let res = await fetch(searchUrl);
            let html = await res.text();

            let links = [];
            let linkRegex = /class="bg-white rounded-xl p-3 flex gap-4 shadow-md transition items-center"[\s\S]*?<a href="(https:\/\/romsfun\.com\/roms\/[^"]+)"/g;
            let match;
            while ((match = linkRegex.exec(html)) !== null) {
                if (!links.includes(match[1])) {
                    links.push(match[1]);
                }
            }

            let results = [];
            const batchSize = 5;
            for (let i = 0; i < links.length; i += batchSize) {
                const batch = links.slice(i, i + batchSize);
                await Promise.all(batch.map(async (url) => {
                    try {
                        let detailRes = await fetch(url);
                        let detailHtml = await detailRes.text();

                        const titleMatch = /<h1 class="text-xl lg:text-2xl font-bold mb-4 text-romfun-pink">([^<]+)<\/h1>/.exec(detailHtml);
                        const posterMatch = /<img src="(https:\/\/romsfun\.com\/wp-content\/uploads\/[^"]+)"[^>]*class="w-full h-auto max-w-full object-contain"/.exec(detailHtml);
                        const amountMatch = detailHtml.match(/<span class="text-gray-400">.*?<\/span>\s*<span class="text-sm text-gray-600">\s*([\d\.]+\s*[KMGTB]+)\s*<\/span>/);
                        const dateMatch = /Release Date[\s\S]*?<td[^>]*>[\s\S]*?(?:<p>)?([^<]+)/.exec(detailHtml);
                        const downloadMatch = /<a href="(https:\/\/romsfun\.com\/download\/[^"]+)"[^>]*>[\s\S]*?Download ROM/.exec(detailHtml);

                        if (titleMatch && downloadMatch) {
                            results.push({
                                title: titleMatch[1],
                                amount: amountMatch ? amountMatch[1] : 'Unknown Size',
                                year: dateMatch ? dateMatch[1].trim() : 'Unknown Year',
                                poster: posterMatch ? `/proxy?url=${encodeURIComponent(posterMatch[1])}` : null,
                                detailUrl: url,
                                downloadPageUrl: downloadMatch[1]
                            });
                        }
                    } catch (e) {
                        Logger.error(`Failed to fetch detail for ${url}`, e);
                    }
                }));
            }

            return results;

        } catch (err) {
            Logger.error('Search failed', err);
            return [];
        }
    }

    async download(task) {
        let browser = null;
        try {
            task.addMessage('Fetching download links...');
            let dlRes = await fetch(task.data.downloadPageUrl);
            let dlHtml = await dlRes.text();

            const rows = dlHtml.split(/<tr[^>]*>/).slice(1);
            
            let bestLink = null;
            let fallbackLink = null;

            for (const row of rows) {
                const linkMatch = /<a target="_blank"[\s\S]*?href="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<svg/i.exec(row);
                const typeMatch = /<td class="py-2 font-semibold text-gray-500">\s*([^<]+?)\s*<\/td>/i.exec(row);

                if (linkMatch && typeMatch) {
                    const rowLink = linkMatch[1];
                    const rowName = linkMatch[2];
                    const rowType = typeMatch[1].trim();

                    if (!this.targetType || rowType.includes(this.targetType) || new RegExp(this.targetType, 'i').test(rowType)) {
                        if (!fallbackLink) fallbackLink = rowLink;
                        
                        if (new RegExp(this.targetLanguage, 'i').test(rowName)) {
                            bestLink = rowLink;
                            break;
                        }
                    }
                }
            }

            let finalDownloadLink = bestLink || fallbackLink;

            if (!finalDownloadLink) {
                throw new Error(`Could not find a download link matching type "${this.targetType}".`);
            }

            task.addMessage('Starting browser for download...');
            browser = await PlaywrightUtils.newBrowser(false);
            let context = await browser.newContext({ acceptDownloads: true });
            let page = await context.newPage();

            let cleanTitle = task.data.title.replace(/[\/\\:*?"<>|]/g, '');
            let destPath = path.join(this.basePath, cleanTitle);
            mkdirp.sync(destPath);

            task.addMessage('Waiting for download to start (around 10 seconds)...');

            page.setDefaultTimeout(60000);
            
            let downloadPromise = page.waitForEvent('download', { timeout: 60000 });
            await page.goto(finalDownloadLink, { waitUntil: 'domcontentloaded' });
            
            let download = await downloadPromise;
            task.addMessage('Download started...');

            let tempPath = path.join(destPath, download.suggestedFilename() + '.part');
            let finalPath = path.join(destPath, download.suggestedFilename());
            
            let stream = await download.createReadStream();
            if (!stream) throw new Error("Download stream not available");

            let bytes = 0;
            let lastTick = Date.now();
            let idleLimit = 5 * 60 * 1000;
            let idleTimer = setInterval(() => {
                if (Date.now() - lastTick > idleLimit) {
                    stream.destroy(new Error("No download progress (idle timeout)"));
                }
            }, 30 * 1000);

            await new Promise((resolve, reject) => {
                let file = fs.createWriteStream(tempPath);
                stream.on('data', (chunk) => {
                    bytes += chunk.length;
                    lastTick = Date.now();
                });
                stream.on('error', (err) => reject(err));
                file.on('error', (err) => reject(err));
                file.on('finish', resolve);
                stream.pipe(file);
            }).finally(() => clearInterval(idleTimer));

            let failure = await download.failure();
            if (failure) {
                try { await fs.promises.unlink(tempPath); } catch { }
                throw new Error(`Download failed: ${failure}`);
            }

            await fs.promises.rename(tempPath, finalPath);
            task.addMessage('Download completed successfully!');
            Logger.success(`Download completed: ${task.data.title}`);

        } catch (e) {
            Logger.error(`Error downloading ${task.data.title}`, e);
            throw new Error('Error downloading');
        } finally {
            if (browser) {
                try { await browser.close(); } catch (e) { Logger.warning("Error closing browser: " + e.message); }
            }
        }
    }
}
