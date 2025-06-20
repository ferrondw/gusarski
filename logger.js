export class logger {
    static disabled = false;

    static logInfo(msg) {
        if (this.disabled) return;
        console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`); // cyan
    }

    static logSuccess(msg) {
        if (this.disabled) return;
        console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`); // green
    }

    static logWarning(msg) {
        if (this.disabled) return;
        console.warn(`\x1b[33m[WARNING]\x1b[0m ${msg}`); // yellow
    }

    static logError(msg, error) {
        if (this.disabled) return;
        console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`, error); // red
    }

    static logDebug(msg) {
        if (this.disabled) return;
        console.log(`\x1b[35m[DEBUG]\x1b[0m ${msg}`); // magenta
    }
}