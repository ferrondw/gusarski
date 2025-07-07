import { logger } from '../../logger.js';
import Provider from '../Provider.js';
import { chromium } from 'playwright';
import { mkdirp } from 'mkdirp';
import path from 'path';

export default class AnimepaheProvider extends Provider {
    constructor() {
        super();
        this.name = 'Animepahe'; // name, id, and icon are required, icon is the name of the image file in ./icons/
        this.id = 'animepahe';
        this.icon = 'animepahe.png';
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
            logger.logError('Search failed', err);
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
            logger.logSuccess(`Download completed: ${task.data.title}`);
        } catch (e) {
            logger.logError(`Error downloading ${task.data.title}`, e);
            throw new Error('Error downloading');
        } finally {
            try { // closing the browser if it isn't already closed
                if (browser) {
                    await browser.close();
                }
            } catch (e) {
                logger.logWarning("Error while closing the browser: " + e.message);
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
        let animeFolderName = `${data.title.replace(/[\/\\:*?"<>|]/g, '')} (${data.year})`;
        let seasonDir = path.join(this.basePath, animeFolderName, "S1");
        mkdirp.sync(seasonDir);
        return seasonDir;
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
            logger.logError(`Failed to open popup for ${downloadOption.resolution}p resolution.`);
            return; // or 'continue;' to check the other options? not sure yet
        }

        // wait for the download to start (with retries)
        let episodeDownload = await this.tryStartDownload(popup, addMessage); // returns the download but is null if it fails

        if (!episodeDownload || episodeDownload == null) {
            await popup.close();
            logger.logError(`Download failed to start after ${this.maxDownloadRetries} attempts for Episode ${episodeNumber}.`);
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
        let popup = null;

        for (let attempt = 0; attempt < this.maxPopupRetries; attempt++) {
            try {
                await option.evaluate(el => el.click());
                popup = await page.waitForEvent('popup', { timeout: this.selectorTimeout });
                if (popup) return popup;
            } catch (e) {
                addMessage(`Retrying ${resolution}p option (attempt ${attempt + 1})…`);
            }
        }
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
            } catch {
                if (attempt < this.maxDownloadRetries) {
                    logger.logWarning(`Download didn’t start, retrying... (attempt ${attempt})…`);
                    addMessage(`Download didn’t start, retrying... (attempt ${attempt})…`);
                    await popup.reload();
                }
            }
        }
    }
}