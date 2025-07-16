import MyrientProvider from '../MyrientProvider.js';

export default class N64Provider extends MyrientProvider {
    constructor() {
        super();
        this.name = 'Nintendo 64';
        this.id = 'n64';
        this.icon = 'n64.png';
        this.searchPlaceholder = 'Search N64 games...';
        this.baseURL = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%2064%20%28BigEndian%29/';
    }
}