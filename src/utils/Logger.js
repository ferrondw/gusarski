export const Color = {
    Reset: "\x1b[0m",
    Black: "\x1b[30m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Magenta: "\x1b[35m",
    Cyan: "\x1b[36m",
    LightGray: "\x1b[37m",
    DarkGray: "\x1b[90m",
    LightRed: "\x1b[91m",
    LightGreen: "\x1b[92m",
    LightYellow: "\x1b[93m",
    LightBlue: "\x1b[94m",
    LightMagenta: "\x1b[95m",
    LightCyan: "\x1b[96m",
    White: "\x1b[97m",
};

export const LogLevel = {
    Normal: 0,
    Warning: 1,
    Error: 2,
};

export class Logger {
    static disabled = false;

    static baseLog(label, color, msg, level = LogLevel.Normal, error) {
        if (this.disabled) return;
        // https://stackoverflow.com/questions/18229022/how-to-show-current-time-in-javascript-in-the-format-hhmmss
        const timestamp = `[${new Date().toLocaleTimeString('eo', { hour12: false })}]`;
        const out = `${timestamp} ${color}[${label}]${Color.Reset} ${msg}`;
        if (level === LogLevel.Warning) { // i really do not like this but it's the best i can come up with
            console.warn(out);
        } else if (level === LogLevel.Error) {
            console.error(out, error);
        } else {
            console.log(out);
        }
    }

    static info(msg) {
        this.baseLog('INFO', Color.Cyan, msg);
    }

    static success(msg) {
        this.baseLog('SUCCESS', Color.Green, msg);
    }

    static warning(msg) {
        this.baseLog('WARNING', Color.Yellow, msg, LogLevel.Warning);
    }

    static error(msg, err) {
        this.baseLog('ERROR', Color.Red, msg, LogLevel.Error, err);
    }

    static debug(msg) {
        this.baseLog('DEBUG', Color.Magenta, msg);
    }
}