import MyrientProvider from '../MyrientProvider.js';

export default class WiiUProvider extends MyrientProvider {
    constructor() {
        super();
        this.name = 'WiiU (Myrient)';
        this.id = 'wiiu';
        this.icon = 'wiiu.png';
        this.searchPlaceholder = 'Search WiiU games...';
        this.baseURL = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Wii%20U%20%28Digital%29%20%28CDN%29/';
    }
}