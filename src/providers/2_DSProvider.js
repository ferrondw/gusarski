import MyrientProvider from '../MyrientProvider.js';

export default class DSProvider extends MyrientProvider {
    constructor() {
        super();
        this.name = 'DS (Myrient)';
        this.id = 'ds';
        this.icon = 'ds.png';
        this.searchPlaceholder = 'Search DS games...';
        this.baseURL = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DS%20%28Decrypted%29/';
    }
}