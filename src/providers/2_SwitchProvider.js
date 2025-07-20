import RomsLabProvider from '../RomsLabProvider.js';

export default class SwitchProvider extends RomsLabProvider {
    constructor() {
        super();
        this.name = 'Switch (RomsLab)';
        this.id = 'switch';
        this.icon = 'switch.png';
        this.searchPlaceholder = 'Search Switch games...';
        this.titleReplaceRegex = /^(.*?)(?:\s+SWITCH\s+(?:NSP\+?|XCI\+?)\s+FREE\s+DOWNLOAD)$/i;
        this.titleExcludeRegex = /PS5\s+FREE\s+DOWNLOAD$/i;
    }
}
