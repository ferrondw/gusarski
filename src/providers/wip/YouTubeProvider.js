import { logger } from '../../logger.js';
import Provider from '../Provider.js';

export default class YouTubeProvider extends Provider {
    constructor() {
        super();
        this.name = 'YouTube';
        this.id = 'youtube';
        this.icon = 'youtube.png';
        this.searchPlaceholder = 'Enter a YouTube video link';
    }

    async search(query) {
        return [];
    }

    async download(task) {
        logger.logInfo(`downloading started with ${this.name}`);
    }
}