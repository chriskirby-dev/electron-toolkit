import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

import FluxBrowserWindow from "./FluxBrowserWindow.js";
import Content from "../../juice/HTML/Content.mjs";
import path from "path";

class FluxBrowserPopup extends FluxBrowserWindow {
    static homepage = path.resolve(__dirname, "../../resources/views/start-simple.html");
    toolbar = false;
    tabs = false;

    constructor(options = {}) {
        if (!options.webPreferences) options.webPreferences = {};
        options.webPreferences.webSecurity = false;
        options.webPreferences.nodeIntegration = true;
        options.tabs = false;
        options.toolbar = false;
        super(options);
    }
}

export default FluxBrowserPopup;
