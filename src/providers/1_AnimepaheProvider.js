import { Logger } from '../utils/Logger.js';
import Provider from '../Provider.js';
import { chromium } from 'playwright';
import { mkdirp } from 'mkdirp';
import path from 'path';

export default class AnimepaheProvider extends Provider { // kept the 1_ before the file to always give it priority over other providers
    constructor() {
        super();
        this.name = 'Anime (animepahe)'; // name, id, and icon are required, icon is the name of the image file in "./icons/"
        this.id = 'animepahe';
        this.icon = 'data:image/png;base64,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';
        this.defaultPosterType = 'tv';
        this.category = 'Anime';
        this.searchPlaceholder = 'Search anime...';

        this.baseURL = 'https://animepahe.ru/';
        this.hideBrowser = false; // hides the headful browser while downloading
        this.headlessBrowser = false; // if the browser should have GUI or run completely in the background
        this.episodeBatchLimit = 3; // max amount of contexts the browser can start while downloading an anime
        this.selectorTimeout = 10000; // how long to wait on an selector (in milliseconds)
        this.downloadStartTimeout = 10000; // tries to restart the download if it doesn't start in X milliseconds
        this.maxDownloadRetries = 5; // how many times it should try to press the download button in the kwik page
        this.maxPopupRetries = 5; // how many times it should try to press the download popup button in the episode page
        this.desiredDownloadResolution = 1080; // desired resolution HEIGHT to download episodes in
        this.downloadResolutionLenience = 250; // still allows any resolution within +-X pixels of the desired resolution
    }

    async search(query) { // search can do anything, as long as it returns the required fields + any additional data needed by download
        try {
            let searchUrl = `${this.baseURL}api?m=search&q=${encodeURIComponent(query)}`;
            let content = await this.headlessFetch(searchUrl, true);

            if (!content.data) return [];

            let results = content.data.map(item => ({
                title: item.title, // first 4 are required {title, amount, year, poster} where poster is the direct link to an image
                amount: item.type == 'Movie' ? 'Movie' : `${item.episodes} Episode${item.episodes == 1 ? '' : 's'}`,
                year: item.year,
                poster: item.poster,

                session: item.session,
            }));

            return results;

        } catch (err) {
            Logger.error('Search failed', err);
        }
    }

    async download(task) { // download can do ANYTHING, it does not need to return anything (though it is expected to save data) + it has all fields from search.
        let browser = null; // create the browser variable so the catch can clean it up, but leave it at null until we are in the try block if something goes wrong in the newBrowser();

        try {
            browser = await this.newBrowser();

            let seasonDirectory = await this.prepareDownloadDirectories(task.data);
            let episodeLinks = await this.getEpisodeLinks(task);

            for (let i = 0; i < episodeLinks.length; i += this.episodeBatchLimit) { // go through all the episodes in batches
                let episodeBatch = episodeLinks.slice(i, i + this.episodeBatchLimit);

                let episodeNumbers = episodeBatch.map(({ episode }) => episode).join(', '); // logging which episodes are being downloaded
                task.addMessage(`Downloading episodes ${episodeNumbers}`);

                await Promise.all(episodeBatch.map(async ({ episode, url }) => { // Promise.all waits for ALL downloads to finish before starting the next batch
                    let context = await browser.newContext();
                    try {
                        let page = await context.newPage();
                        await page.goto(url, { waitUntil: 'networkidle' });

                        await this.replaceDownloadButtons(page); // default download buttons have a redirect, this method removes that
                        await this.processEpisode(page, seasonDirectory, episode, task.addMessage); // starts the episode download and waits for it to finish
                    } finally {
                        await context.close();
                    }
                }));
            }

            task.addMessage("Download completed.");
            Logger.success(`Download completed: ${task.data.title}`);
        } catch (e) {
            Logger.error(`Error downloading ${task.data.title}`, e);
            throw new Error('Error downloading');
        } finally {
            try { // closing the browser if it isn't already closed
                if (browser) {
                    await browser.close();
                }
            } catch (e) {
                Logger.warning("Error while closing the browser: " + e.message);
            }
        }
    }

    // ALL the following methods are not needed specifically for any other provider, and are just to help the process for animepahe

    async headlessFetch(url, isJson) {
        let context = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US']
        });
        let page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForSelector('#ddg-l10n-title', { state: 'detached', timeout: 10000 }).catch(() => { }); // wait for ddos guard
        let content = await page.content();
        await context.close();

        if (isJson) {
            return this.jsonFromRegex(content, /<pre.*?>([\s\S]*?)<\/pre>/);
        }

        return content;
    }

    async jsonFromRegex(content, regex) {
        let match = regex.exec(content);

        if (!match || !match[1]) throw new Error("No JSON matched in regex");
        return JSON.parse(match[1]);
    }

    async getEpisodeLinks(task) {
        task.addMessage(`Getting episode links`);

        let pageNum = 1;
        let episodes = [];
        let nextUrl = null; // only used for checking if we're done collecting episodes

        // loading all episodes from all pages
        do {
            let url = `${this.baseURL}api?m=release&id=${task.data.session}&sort=episode_asc&page=${pageNum}`;
            let resp = await this.headlessFetch(url, true);
            resp.data.forEach(ep => { // custom data type with less bloat
                episodes.push({ session: ep.session, episode: ep.episode, url: `${this.baseURL}play/${task.data.session}/${ep.session}` });
            });
            nextUrl = resp.next_page_url;
            pageNum++;
        } while (nextUrl);

        return episodes.sort((a, b) => a.episode - b.episode); // probably already sorted because of how the api returns episodes "the chance is low, but never 0"
    }

    // from Animepahe Improvements, changes to fit the style of the server because of the lack of userscript support
    async replaceDownloadButtons(page) {
        await page.waitForSelector('#downloadMenu', { timeout: this.selectorTimeout });
        await page.click('#downloadMenu');

        await page.waitForSelector('#pickDownload', { timeout: 10000 });

        await page.evaluate(() => {
            for (let span of document.querySelectorAll('#pickDownload a')) {
                span.addEventListener('click', function (e) {
                    e.preventDefault();
                    let href = this.getAttribute('href');

                    fetch(href)
                        .then(r => {
                            if (!r.ok) throw new Error('Network error');
                            return r.text();
                        })
                        .then(htmlText => {
                            let match = /https:\/\/kwik\.\w+\/f\/[^"]+/.exec(htmlText);
                            let finalUrl = match ? match[0] : href;
                            window.open(finalUrl, '_blank');
                        })
                        .catch(() => {
                            window.open(href, '_blank');
                        });
                });
            }
        });
    }

    async prepareDownloadDirectories(data) {
        // try to make a folder: ./downloads/<name> (<year>)/S1/
        let animeFolderName = `${this.decodeHtmlEntities(data.title.replace(/[\/\\:*?"<>|]/g, ''))} (${data.year})`;
        let seasonDir = path.join(this.basePath, animeFolderName, "S1");
        mkdirp.sync(seasonDir);
        return seasonDir;
    }

    decodeHtmlEntities(str) { // extra cleanup, otherwise /downloads will not recognise some folders
        return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (match) => {
            switch (match) {
                case '&amp;': return '&';
                case '&lt;': return '<';
                case '&gt;': return '>';
                case '&quot;': return '"';
                case '&#39;': return "'";
                default: return match;
            }
        });
    }

    async processEpisode(page, seasonDir, episodeNumber, addMessage) {
        // wait for the downloads options to appear
        await page.waitForSelector('#pickDownload', { state: 'attached', timeout: this.selectorTimeout });
        page.setDefaultTimeout(0); // resets timeouts
        page.setDefaultNavigationTimeout(0);

        let options = await page.$$('#pickDownload .dropdown-item');

        // try to get the first download link good enough to be in the range of the desired resolution +- the resolution lenience
        let downloadOption = await this.getPreferredDownloadOption(options); // { resolution, option }

        if (!downloadOption || downloadOption == null) throw new Error(`Desired resolution not available for Episode ${episodeNumber}.`);

        // open the download page with retries
        let popup = await this.openPopup(page, downloadOption.option, downloadOption.resolution, addMessage);

        if (!popup) {
            Logger.error(`Failed to open popup for ${downloadOption.resolution}p resolution.`);
            return; // or 'continue;' to check the other options? not sure yet
        }

        // wait for the download to start (with retries)
        let episodeDownload = await this.tryStartDownload(popup, addMessage); // returns the download but is null if it fails

        if (!episodeDownload || episodeDownload == null) {
            await popup.close();
            Logger.error(`Download failed to start after ${this.maxDownloadRetries} attempts for Episode ${episodeNumber}.`);
            return;
        }

        let destPath = path.join(seasonDir, `S1E${episodeNumber}.mp4`);
        await episodeDownload.saveAs(destPath);
        addMessage(`Episode ${episodeNumber} downloaded.`);

        await popup.close();
    }

    async kwikDownload(popup) {
        await popup.waitForLoadState('domcontentloaded');

        await popup.waitForFunction( // custom function to check if any form has more then one thing in it
            () => document.querySelectorAll('form').length > 0,
            { timeout: this.selectorTimeout }
        );

        await popup.evaluate(() => {
            document.querySelectorAll('form')[0].submit();
        });

        let download = await popup.waitForEvent('download', { timeout: this.downloadStartTimeout });
        return download;
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

    async openPopup(page, option, resolution, addMessage) {
        for (let attempt = 0; attempt < this.maxPopupRetries; attempt++) {
            try {
                await option.evaluate(el => el.click());
                let popup = await page.waitForEvent('popup', { timeout: this.selectorTimeout });
                if (popup) return popup;
            } catch (e) {
                Logger.warning(`openPopup: attempt ${attempt + 1} failed: ${e.message}`);
                addMessage(`Retrying ${resolution}p option (attempt ${attempt + 1})...`);
                await page.waitForTimeout(1000); // "net::ERR_ABORTED; maybe frame was detached?", hope this will fix it, it not just remove this line
            }
        }
        Logger.error(`Failed to open popup in ${resolution}p after ${this.maxPopupRetries} attempts.`);
        return null;
    }

    async getPreferredDownloadOption(options) {
        for (let option of options) {
            // get the text of the resolution button
            let text = await option.evaluate(el => el.innerText);
            if (!text) continue;

            // pull the resolution from the text
            let match = text.match(/(\d+)[pP]/);
            if (!match) continue;

            // get the difference in pixels from this resolution and the desired resolution
            let resolution = parseInt(match[1], 10);
            let resolutionDifference = Math.abs(resolution - this.desiredDownloadResolution);

            // only accept the download option if it's close to the desired resolution
            if (resolutionDifference <= this.downloadResolutionLenience) {
                return {
                    resolution,
                    option
                };
            }
        }
    }

    async tryStartDownload(popup, addMessage) {
        for (let attempt = 1; attempt <= this.maxDownloadRetries; attempt++) {
            try {
                let download = await this.kwikDownload(popup);
                return download;
            } catch (e) {
                if (attempt < this.maxDownloadRetries) {
                    Logger.warning(`Download didn’t start (attempt ${attempt}): ${e.message}`);
                    addMessage(`Download didn’t start, retrying... (attempt ${attempt})`);
                    try { // if it errors just wait a bit, this whole code block is in a for loop anyways
                        await popup.reload({ waitUntil: 'networkidle' });
                    } catch (reloadErr) {
                        Logger.warning(`popup.reload() failed: ${reloadErr.message}`);
                        await popup.waitForTimeout(1000); // same here, download takes a while anyways so waiting a second doesn't hurt anyone... i think
                    }
                } else {
                    Logger.error(`All download attempts failed.`);
                    addMessage(`All download attempts failed, skipping episode...`);
                }
            }
        }
        return null;
    }
}