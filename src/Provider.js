import path from 'path';

export default class Provider {
    async search(query) {
        throw new Error('`search()` must be implemented by subclass');
    }

    async download(task) {
        throw new Error('`download()` must be implemented by subclass');
    }

    get basePath() {
        return path.join('downloads', this.id);
    }
}