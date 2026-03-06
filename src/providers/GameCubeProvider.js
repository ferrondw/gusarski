import RomsfunProvider from '../RomsfunProvider.js';

export default class GameCubeProvider extends RomsfunProvider {
    constructor() {
        super();
        this.name = 'GameCube (Romsfun)';
        this.id = 'gamecube';
        this.consoleId = '13';
        this.targetType = 'RVZ Format';
        this.targetLanguage = 'Europe';
    }
}
