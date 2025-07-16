import { logger } from '../../logger.js';
import Provider from '../Provider.js';

export default class TikTokProvider extends Provider {
    constructor() {
        super();
        this.name = 'TikTok';
        this.id = 'tiktok';
        this.icon = 'tiktok.png';
        this.searchPlaceholder = 'Enter an Instagram video link';
    }

    async search(query) {
        return [];
    }

    async download(task) {
        logger.logInfo(`downloading started with ${this.name}`);
    }
}