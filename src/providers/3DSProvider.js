import MyrientProvider from '../MyrientProvider.js';

export default class _3DSProvider extends MyrientProvider { // need the underscore because JS is scared of classes starting with a number
    constructor() {
        super();
        this.name = '3DS';
        this.id = '3ds';
        this.icon = '3ds.png';
        this.searchPlaceholder = 'Search 3DS games...';
        this.baseURL = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%203DS%20(Decrypted)/';
    }
}