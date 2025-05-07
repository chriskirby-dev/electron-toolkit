import fs from "fs";
import path from "path";
import EventEmitter from "events";
import { contextBridge, ipcRenderer } from "electron";
import Inspect from "file:///ROOT_DIR/resources/js/verdor/electron-toolkit/Renderer/inspect.mjs";
import Visual from "file:///ROOT_DIR/resources/js/verdor/electron-toolkit/Renderer/visual.mjs";

const APP_ROOT = "file:///ROOT_DIR/";
const JUICE_DIR = "JUICE_PATH/";
const __filename = import.meta.url;
const __dirname = import.meta.url.substring(8, import.meta.url.lastIndexOf("/"));

//Initialize flux global object
const flux = (window.flux = new EventEmitter());
flux.args = {};
flux.inspect = Inspect;
flux.ipc = ipcRenderer;

window.process.argv.map((arg) => {
    if (arg.includes("=")) {
        const [prop, value] = arg.split("=");
        if (prop.includes("--webcontents")) {
            prop = prop.replace("--webcontents-", "");
            this.related[prop] = parseInt(value);
            return;
        }
        flux.args[prop] = value;
    } else {
        flux.args[arg] = true;
    }
});

const windowLoaded = new Promise((resolve) => {
    window.onload = resolve;
});

ipcRenderer.on("identifiers", (e, identifiers) => {
    console.log("identifiers", identifiers);
    window.flux.frame = flux.frame = identifiers;
});

ipcRenderer.on("inspect", (e, target) => {
    if (target.selector) return new Inspect(target.selector);
});

window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const ctxMenuReq = {};
    ctxMenuReq.target = e.target;
    flux.ipc.send("contextmenu-request", {
        source: ContextMenu.source,
        target: Inspect.element(e.target),
    });
});
