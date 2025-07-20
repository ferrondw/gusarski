import MyrientProvider from '../MyrientProvider.js';

export default class WiiProvider extends MyrientProvider {
    constructor() {
        super();
        this.name = 'Wii (Myrient)';
        this.id = 'wii';
        this.icon = 'wii.png';
        this.searchPlaceholder = 'Search Wii games...';
        this.baseURL = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Wii%20%28Digital%29%20%28CDN%29/';
    }
}