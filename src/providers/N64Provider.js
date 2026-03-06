import RomsfunProvider from '../RomsfunProvider.js';

export default class N64Provider extends RomsfunProvider {
    constructor() {
        super();
        this.name = 'Nintendo 64 (Romsfun)';
        this.id = 'n64';
        this.consoleId = '9';
        this.targetType = 'No-Intro';
        this.targetLanguage = 'Europe';
    }
}
