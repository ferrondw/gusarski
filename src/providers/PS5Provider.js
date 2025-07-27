import RomsLabProvider from '../RomsLabProvider.js';

export default class PS5Provider extends RomsLabProvider {
    constructor() {
        super();
        this.name = 'PS5 (RomsLab)';
        this.id = 'ps5';
        this.icon = 'playstation.png';
        this.category = 'Playstation ROMs';
        this.searchPlaceholder = 'Search PS5 games...';
        this.titleReplaceRegex = /PS5\s+FREE\s+DOWNLOAD$/i;
        this.titleExcludeRegex = /^(.*?)(?:\s+SWITCH\s+(?:NSP\+?|XCI\+?)\s+FREE\s+DOWNLOAD)$/i;
    }
}
