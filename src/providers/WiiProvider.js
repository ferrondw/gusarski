import RomsfunProvider from '../RomsfunProvider.js';

export default class WiiProvider extends RomsfunProvider {
    constructor() {
        super();
        this.name = 'Wii (Romsfun)';
        this.id = 'wii';
        this.consoleId = '10';
        this.targetType = 'RVZ Format';
        this.targetLanguage = 'Europe';
    }
}
