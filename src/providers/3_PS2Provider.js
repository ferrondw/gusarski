import MyrientProvider from '../MyrientProvider.js';

export default class PS1Provider extends MyrientProvider {
    constructor() {
        super();
        this.name = 'PS2 (Redump) (Myrient)';
        this.id = 'ps2';
        this.icon = 'playstation.png';
        this.searchPlaceholder = 'Search PS2 games...';
        this.baseURL = 'https://myrient.erista.me/files/Redump/Sony%20-%20PlayStation%202/';
    }
}