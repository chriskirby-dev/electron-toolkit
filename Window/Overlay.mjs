import FluxBrowserWindow from "../Base/FluxBrowserWindow.mjs";
import { Window } from "../../windows-koffi/index.js";
import path from "path";
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const OVERLAY_PRELOAD = path.resolve(__dirname, "../Renderer/preload.mjs");

class OverlayWindow extends FluxBrowserWindow {
    static homepage = path.resolve(__dirname, "../views/overlay.html");
    static parseOptions(options = {}) {
        const values = {};

        options.title = "Overlay";
        options.alwaysOnTop = true;
        options.transparent = true;
        options.frame = false;
        if (!options.webPreferences) options.webPreferences = {};
        options.webPreferences.preload = OVERLAY_PRELOAD;

        ["target", "css"].forEach((prop) => {
            if (options[prop]) {
                values[prop] = options[prop];
                delete options[prop];
            }
        });

        return { options, values };
    }

    constructor(options = {}) {
        console.log("Create OverlayWindow");
        const parsed = OverlayWindow.parseOptions(options);
        super(parsed.options);
        for (let prop in parsed.values) {
            this[prop] = parsed.values[prop];
        }
    }

    aquireTarget(target) {
        const targetWindow = Window.search(this.target)[0];
        console.log("aquireTarget", targetWindow);
        if (targetWindow) {
            targetWindow.onChange((e) => {
                console.log("onChange", e);
                if (e.isMoved) {
                    this.x = e.client.x;
                    this.y = e.client.y;
                }

                if (e.isResized) {
                    this.width = e.client.width;
                    this.height = e.client.height;
                }
                this.setAlwaysOnTop(true, "screen");
            });

            this.x = targetWindow.client.x;
            this.y = targetWindow.client.y;
            this.width = targetWindow.client.width;
            this.height = targetWindow.client.height;

            this.targetWindow = targetWindow;
            this.emit("target-aquired", this.targetWindow);
        } else {
            setTimeout(() => this.aquireTarget(), 1000);
        }
    }

    initialize() {
        const { config, options } = this;
        console.log("initialize", config, options);
        if (this.target) {
            this.aquireTarget(this.target);
        }

        this.webContents.on("did-finish-load", () => {
            this.inject(`
                const tmp = document.createElement('div'); 
                tmp.style.position = 'absolute';
                tmp.style.width = '100%';
                tmp.style.height = '100%';
                tmp.style.top = '0';
                tmp.style.left = '0';
                //tmp.style.backgroundColor = 'lime';
                tmp.style.outline = '2px solid lime';
                document.body.appendChild(tmp);
            `);
        });
    }
}

export default OverlayWindow;
