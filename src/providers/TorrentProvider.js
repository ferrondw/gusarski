import { logger } from '../../logger.js';
import Provider from '../Provider.js';

export default class TorrentProvider extends Provider {
    constructor() {
        super();
        this.name = 'Torrent';
        this.id = 'torrent';
        this.icon = 'torrent.png';
        this.searchPlaceholder = 'Search torrents...';
    }

    async search(query) {
        return [];
    }

    async download(task) {
        logger.logInfo(`downloading started with ${this.name}`);
    }
}