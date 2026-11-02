import { chromium } from "playwright";

export class PlaywrightUtils {
    static newBrowser(hideBrowser) {
        return chromium.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--lang=en-US',
                "--disable-features=AsyncDns",
                hideBrowser ? '--headless=new' : ''
            ]
        });
    }

    static async headlessFetch(url, isJson) {
        const context = await chromium.launch({
            headless: false,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--lang=en-US",
                "--disable-features=AsyncDns"
            ]
        }
        );

        let page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        
        await page.waitForFunction(() => {
            const title = document.title.toLowerCase();
            const body = document.body?.innerText.toLowerCase() || "";

            return (
                !title.includes("just a moment") &&
                !title.includes("attention required") &&
                !body.includes("checking your browser") &&
                !body.includes("verify you are human")
            );
        }, { timeout: 120000 });

        let content = await page.content();
        await context.close();

        if (isJson) {
            return this.jsonFromRegex(content, /<pre.*?>([\s\S]*?)<\/pre>/);
        }

        return content;
    }

    static async jsonFromRegex(content, regex) {
        let match = regex.exec(content);

        if (!match || !match[1]) throw new Error("No JSON matched in regex");
        return JSON.parse(match[1]);
    }
}