import fs from "fs";
import EventEmitter from "events";
import { contextBridge, ipcRenderer } from "electron";
import Inspect from "./inspect.mjs";
import Visual from "./visual.mjs";

const __filename = import.meta.url;
const __dirname = import.meta.url.substring(8, import.meta.url.lastIndexOf("/"));
const root = __dirname.split("/").slice(0, -3).join("/");

//Initialize flux global object
const flux = (window.flux = new EventEmitter());
flux.args = {};

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

window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const ctxMennuReq = {};
    ctxMennuReq.target = e.target;
    ipcRenderer.send("contextmenu-request", {
        source: ContextMenu.source,
        target: Inspect.element(e.target),
    });
});
