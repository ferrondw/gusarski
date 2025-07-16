import MyrientProvider from '../MyrientProvider.js';

export default class PS1Provider extends MyrientProvider {
    constructor() {
        super();
        this.name = 'PS3';
        this.id = 'ps3';
        this.icon = 'playstation.png';
        this.searchPlaceholder = 'Search PS3 games...';
        this.baseURL = 'https://myrient.erista.me/files/No-Intro/Sony%20-%20PlayStation%203%20%28PSN%29%20%28Content%29/';
    }
}