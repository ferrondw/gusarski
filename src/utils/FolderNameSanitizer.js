export class FolderNameSanitizer {
    static replacer = '_';
    static reserved = [
        'CON', 'PRN', 'AUX', 'NUL',
        ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
        ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`)
    ];
    static invalidChars = /[\\/:*?"<>|]/g;

    static sanitize(name, replacer = FolderNameSanitizer.replacer) {
        if (typeof name !== 'string') {
            throw new TypeError('Folder name must be a string');
        }

        let clean = name.replace(FolderNameSanitizer.invalidChars, replacer);
        clean = clean.replace(/[\. ]+$/, '');

        if (FolderNameSanitizer.reserved.includes(clean.toUpperCase())) {
            clean += replacer;
        }

        if (clean.length > 255) {
            clean = clean.slice(0, 255);
        }

        if (!clean) {
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
            return `File-${timestamp}`;
        }

        return clean;
    }
}