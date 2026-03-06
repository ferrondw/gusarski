import RomsfunProvider from '../RomsfunProvider.js';

export default class _3DSProvider extends RomsfunProvider {
    constructor() {
        super();
        this.name = 'Nintendo 3DS (Romsfun)';
        this.id = '3ds';
        this.consoleId = '91';
        this.targetType = 'CIA Format';
        this.targetLanguage = 'Europe';
    }
}
