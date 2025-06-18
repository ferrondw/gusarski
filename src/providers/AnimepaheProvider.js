import Provider from '../Provider.js';
import { chromium } from 'playwright';

export default class AnimepaheProvider extends Provider {
    constructor() {
        super();
        this.name = 'Animepahe'; // string viewed by the client
        this.id = 'animepahe'; // string used as save location base
        this.icon = 'animepahe.png'; // string viewed by the client

        this.baseURL = 'https://animepahe.ru/';
    }

    async search(query) { // search can do anything, as long as it returns the required fields + any additional data needed by download
        try {
            const searchUrl = `${this.baseURL}api?m=search&q=${encodeURIComponent(query)}`;

            console.log(`Searching animepahe for: "${query}"`);

            console.log(searchUrl);
            const content = await headlessFetch(searchUrl, true);

            if (!content.data) return [];
            console.log(`Found ${content.data.length} results for: "${query}"`);

            const results = content.data.map(item => ({
                title: item.title, // first 4 are requires {title, amount, year, poster} where poster is the direct link to an image
                amount: item.episodes,
                year: item.year,
                poster: item.poster,

                session: item.session,
            }));

            return results;

        } catch (err) {
            console.log(`Error while searching for "${query}": ${err}`);
            return { error: err.toString() };
        }
    }

    async download(task) { // download can do ANYTHING, it does not need to return anything (though it is expected to save data) + it has all fields from search.
        console.log(`downloading to ${this.basePath} on ${this.name}`); // basePath is a Provider inherited get string to get the download location assigned to this provider from its ID
    }
}

// ALL the following methods are not needed specifically for any provider, and are just to help the process specifically for animepahe

async function headlessFetch(url, isJson) {
    const context = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US']
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#ddg-l10n-title', { state: 'detached', timeout: 10000 }).catch(() => { }); // wait for ddos guard
    const content = await page.content();
    await context.close();

    if (isJson) {
        return jsonFromRegex(content, /<pre.*?>([\s\S]*?)<\/pre>/);
    }

    return content;
}

async function jsonFromRegex(content, regex) {
    const match = regex.exec(content);

    if (!match || !match[1]) throw new Error("No JSON matched in regex");
    return JSON.parse(match[1]);
}