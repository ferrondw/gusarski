import RomsfunProvider from '../RomsfunProvider.js';

export default class NDSProvider extends RomsfunProvider {
    constructor() {
        super();
        this.name = 'Nintendo DS (Romsfun)';
        this.id = 'nds';
        this.consoleId = '3';
        this.targetType = '';
        this.targetLanguage = 'Europe';
    }
}
