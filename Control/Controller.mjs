import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import path from "node:path";
import MouseControl from "./MouseControl.js";
import KeyboardControl from "./KeyboardControl.js";
import { EventEmitter } from "events";

const PRELOAD_SCRIPT = path.join(__dirname, "preload.js");

class Controller extends EventEmitter {
    constructor(webContents) {
        super();
        this.webContents = webContents;
        this.mouse = new MouseControl(this.webContents);
        this.keyboard = new KeyboardControl(this.webContents);
        this.webContents.injectScript(PRELOAD_SCRIPT).then(() => {
            this.initialize();
        });
    }

    sequence(steps) {
        return new Promise((resolve, reject) => {
            let index = 0;
            const next = () => {
                if (index >= steps.length) {
                    return resolve();
                }
                const step = steps[index++];
                step().then(next, reject);
            };
            next();
        });
    }

    navigate() {
        return this.webContents.loadURL(...arguments);
    }

    inspect(selector) {
        return this.webContents.injectPromise(`
            resolve(flux.classes.inspect.element(${selector}));
        `);
    }

    focus(selector) {
        return this.inspect(selector).then((element) => {
            const { centerX: x, centerY: y } = element;
            return this.mouse.moveSmooth(x, y).then(() => {
                return this.mouse.click();
            });
        });
    }

    fillInput(selector, value) {
        return this.focus(selector).then(() => {
            return this.type(value);
        });
    }

    mouseTo({ x, y, selector }) {
        if (x && y) {
            return this.mouse.moveSmooth(x, y);
        }
        if (target) {
            return this.inspect(selector).then((element) => {
                const { centerX: x, centerY: y } = element;
                return this.mouse.moveSmooth(x, y);
            });
        }
    }

    pressKey(keyCode) {
        this.keyboard.keyPress(keyCode);
    }

    type(string) {
        const chars = string.split("");
        return new Promise((resolve, reject) => {
            function nextChar() {
                if (!chars.length) return resolve();
                this.keyboard.keyPress(chars.shift()).then(() => {
                    setTimeout(() => nextChar(), Math.random() * 100);
                });
            }

            nextChar();
        });
    }

    click() {}

    scrollTo() {}

    scrollBy() {}

    hover() {}

    initialize() {}
}

export default Controller;
