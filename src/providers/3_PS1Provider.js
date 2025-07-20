import MyrientProvider from '../MyrientProvider.js';

export default class PS1Provider extends MyrientProvider {
    constructor() {
        super();
        this.name = 'PS1 (Myrient)';
        this.id = 'ps1';
        this.icon = 'playstation.png';
        this.searchPlaceholder = 'Search PS1 games...';
        this.baseURL = 'https://myrient.erista.me/files/No-Intro/Sony%20-%20PlayStation%20%28PS%20one%20Classics%29%20%28PSN%29/';
    }
}