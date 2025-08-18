import { chromium } from "playwright";

export class PlaywrightUtils {
    static newBrowser(hideBrowser) {
        return chromium.launch({
            headless: this.headlessBrowser,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--lang=en-US',
                hideBrowser ? '--headless=new' : ''
            ]
        });
    }

    static async headlessFetch(url, isJson) {
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
}