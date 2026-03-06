import RomsfunProvider from '../RomsfunProvider.js';

export default class WiiUProvider extends RomsfunProvider {
    constructor() {
        super();
        this.name = 'Wii U (Romsfun)';
        this.id = 'wiiu';
        this.consoleId = '86';
        this.targetType = 'WUX FILE';
        this.targetLanguage = 'Europe';
    }
}
