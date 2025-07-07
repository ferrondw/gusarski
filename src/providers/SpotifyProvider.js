import { logger } from '../../logger.js';
import Provider from '../Provider.js';

export default class SpotifyProvider extends Provider {
    constructor() {
        super();
        this.name = 'Spotify';
        this.id = 'spotify';
        this.icon = 'spotify.png';
        this.searchPlaceholder = 'Enter a Spotify playlist link';
    }

    async search(query) {
        return [];
    }

    async download(task) {
        logger.logInfo(`downloading started with ${this.name}`);
    }
}