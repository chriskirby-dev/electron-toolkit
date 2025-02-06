import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import { extractOptions } from "./BrowserOptions.mjs";
import { app, BrowserWindow, MessageChannelMain } from "electron";
//import Toolbar from "../Browser/Toolbar.js";
//import Tabs from "../Browser/Tabs.js";
import Content from "../../juice/HTML/Content.mjs";
import path from "path";
const DEFAULT_HOMEPAGE = path.resolve(__dirname, "../views/default.html");
const DEFAULT_PRELOAD = path.resolve(__dirname, "../Renderer/preload.mjs");
const PLUGINS_DIR = path.resolve(__dirname, "./plugins");
//const { Authentication, Identity, Global } = global.db.models;

let delays = {};
function delay(ms, id = "default") {
    if (delays[id]) clearTimeout(delays[id]);
    return new Promise((resolve) => {
        delays[id] = setTimeout(resolve, ms);
    });
}

class FluxBrowserWindow extends BrowserWindow {
    static preloads = [DEFAULT_PRELOAD];
    static appliedOptionsBase = ["config", "dependants:depends", "template", "width", "height", "x", "y"];
    static appliedOptions = [];
    static instances = [];

    bounds = {
        content: {},
        window: {},
    };

    frameSize = 0;

    config;
    ipc;
    views = [];
    plugins = [];

    static async whenReady(...args) {
        return new Promise((resolve) => {
            if (app.isReady()) {
                resolve(args.length > 0 ? new this(...args) : null);
            } else {
                app.on("ready", () => {
                    resolve(args.length > 0 ? new this(...args) : null);
                });
            }
        });
    }

    static create(options) {
        class ExtendedBrowserWindow extends FluxBrowserWindow {
            static appliedOptions = options.appliedOptions || [];
            static plugins = options.plugins || [];
        }
        return ExtendedBrowserWindow;
    }

    constructor(options) {
        const browserOptions = extractOptions(options);
        if (browserOptions.webPreferences && !browserOptions.webPreferences.preload) {
            browserOptions.webPreferences.preload = DEFAULT_PRELOAD;
        }
        console.log("browserOptions", browserOptions);
        super(browserOptions);
        this.setOptions(options);
        //Add to static instances
        this.constructor.instances.push(this);
        this.#initialize(options);
        if (this.initialize) setTimeout(this.initialize.bind(this), 100);
    }

    /**
     * Sets the options for the FluxBrowserWindow instance.
     * Iterates over the allowedOptions and assigns values from the provided
     * options object. If an option value is not a function, it sets the
     * property; if it is a function, it calls the method with the given
     * arguments. If an option is not provided, it is set to null.
     *
     * @param {Object} options - An object containing configuration options.
     */

    setOptions(options) {
        this.options = options;
        //Apply appliedOptions from options obj to this instance if they exist

        const appliedOptions = this.constructor.appliedOptionsBase.concat(this.constructor.appliedOptions);

        for (let option of appliedOptions) {
            const optionName = option.includes(":") ? option.split(":")[0] : option;
            const optionKeys = option.includes(":") ? option.split(":")[1].split(",") : [option];
            const optionKey = optionKeys.filter((k) => options[k] !== undefined)[0];

            if (options[optionKey] !== undefined) {
                if (typeof this[optionName] !== "function") {
                    this[optionName] = options[optionKey];
                } else {
                    this[optionName](...options[optionKey]);
                }
            } else if (this[optionName] === undefined) {
                this[optionName] = null;
            }
        }
    }

    get static() {
        return this.constructor;
    }

    get title() {
        return this.webContents.getTitle();
    }

    get url() {
        return this.webContents.getURL();
    }

    get x() {
        return this._x;
    }

    set x(x) {
        this._x = x - this.frameSize;
        delay(100, "position").then(() => this.setPosition(this._x, this._y));
    }

    get y() {
        return this._y;
    }

    set y(y) {
        this._y = y - this.frameSize;
        delay(100, "position").then(() => this.setPosition(this._x, this._y));
    }

    get width() {
        return this._width;
    }

    set width(width) {
        this._width = width + this.frameSize * 2;
        delay(100, "size").then(() => this.setSize(this._width, this._height));
    }

    get height() {
        return this._height;
    }

    set height(height) {
        this._height = height + this.frameSize * 2;
        delay(100, "size").then(() => this.setSize(this._width, this._height));
    }

    windowChange() {
        this.setPosition(this._x, this._y);
        this.setSize(this._width, this._height);
    }

    async loadTemplate(path, tokens) {
        const dir = path.substring(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
        const content = new Content(path, { tokens });
        await content.loaded();
        console.log("Load Template", content.rendered);
        this.loadURL("data:text/html;charset=UTF-8," + encodeURIComponent(content.rendered), {
            baseURLForDataURL: dir,
        });
    }

    send() {
        return this.webContents.send(...arguments);
    }

    sendPortal(port, channel) {
        this.webContents.postMessage("portal:forward", { channel: channel }, [port]);
    }

    portal() {
        const { port1, port2 } = new MessageChannelMain();

        this.inject(`
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('portal', (event) => {
                const [ port ] = event.ports;
                port.onmessage = (event) => {
                    console.log('received result:', event.data)
                }
                port.postMessage(22);
            })
            window.addEventListener('message', (event) => {
                console.log('message', message);
            });
        `);

        port2.on("message", (message) => {
            console.log(message);
            if (message.data) {
            }
        });

        port2.start();

        this.webContents.postMessage("portal:forward", { channel: "automation:target" }, [port1]);
    }

    addContentView(webContentsView, prefs = { nodeIntegration: false }) {
        view.window = this;
        this.views.push(view);
        super.setBrowserView({ view: webContentsView, webPreferences: prefs });
    }

    #domReady() {
        const { config } = this;
        this.#onFrameCreated(null, this.webContents.mainFrame);
        if (config) {
            if (config.scripts) {
                config.scripts.forEach((script) => {
                    this.injectScript(script);
                });
            }
        }
    }

    #onFrameCreated(e, details) {
        const { frame } = details;

        const identifiers = {
            nodeId: frame.frameTreeNodeId,
            routingId: frame.routingId,
            processId: frame.processId,
            name: frame.name,
            orgin: frame.origin,
            webContentsId: this.webContents.id,
            scope: "viewport",
        };

        this.inject(`
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('identifiers', (identifiers) => {
                flux.identifiers = identifiers;
            });    
        `);

        setTimeout(() => {
            frame.send("identifiers", identifiers);
        }, 100);
    }

    #onMove() {
        const [x, y] = this.getPosition();
        const { menubarHeight, frameSize } = this.bounds;
        this.bounds.window.x = x;
        this.bounds.window.y = y;
        this.bounds.content.x = x + frameSize;
        this.bounds.content.y = y + menubarHeight;
        if (this.views.length) {
            this.views.forEach((view) => view.onWindowMove(this.bounds));
        }
    }

    #onResize() {
        const [totalWidth, totalHeight] = this.getSize();
        const [width, height] = this.getContentSize();
        this.bounds.window.height = totalHeight;
        this.bounds.window.width = totalWidth;
        this.bounds.content.width = width;
        this.bounds.content.height = height;
        if (this.views.length) {
            this.views.forEach((view) => view.onWindowResize(this.bounds));
        }
    }

    inject(js) {
        this.webContents.executeJavaScript(`
            (function(){
                ${js}
            })()
        `);
    }

    injectScript(source) {
        return this.injectPromise(`
            alert('inject');
            const script = document.createElement('script');
            script.src = "${source}";
            script.onload = () => resolve();
            script.onerror = () => reject();
            document.head.appendChild(script);
        `);
    }

    injectPromise(js) {
        if (!js.includes("resolve")) {
            console.warn("injectPromise: missing resolve");
        }
        this.webContents.executeJavaScript(`
            (function(){
                return new Promise( (resolve, reject) => {
                    ${js}
                });
            })()
        `);
    }

    async loadPlugin(pluginName) {
        const pluginPath =
            pluginName.startsWith("/") ||
            pluginName.startsWith("\\") ||
            pluginName.startsWith("http") ||
            pluginName.startsWith("file:")
                ? pluginName
                : "file://" + path.resolve(PLUGINS_DIR, pluginName + ".mjs");
        console.log(pluginPath);
        const plugin = await import(pluginPath);
        console.log(plugin);
        if (plugin.install) plugin.install(this);
        console.log("Installed Plugin", pluginName);
        this.plugins.push(plugin);
    }

    #initialize() {
        console.log("#init", this.constructor.name);
        const { options } = this;

        let dependants;
        if (this.dependants) {
        }

        if (this.template) {
        }

        this.windowChange = this.windowChange.bind(this);

        this.webContents.mainFrame.ipc.on("portal-created", () => {});

        this.webContents.on("ipc-message", (e, channel, ...data) => {
            if (e.ports) {
                const port = e.ports[0];
            }
            if (channel == "portal") {
                const port = e.ports[0];
                port.on("message", (event) => {
                    // data is { answer: 42 }
                    const data = event.data;
                });
                port.start();
                this.emit("portal", port);
                return;
            }
            this.emit(`ipc:${channel}`, e, ...data);
        });

        this.#onResize();
        this.bounds.frameSize = (this.bounds.window.width - this.bounds.content.width) / 2;
        this.bounds.menubarHeight = this.bounds.window.height - this.bounds.content.height - this.bounds.frameSize;
        this.#onMove();

        this.on("dom-ready", this.#domReady.bind(this));

        this.on("move", this.#onMove.bind(this));

        this.on("resize", this.#onResize.bind(this));

        this.on("close", () => {});

        this.webContents.on("did-finish-load", () => {
            this.#onFrameCreated(null, { frame: this.webContents.mainFrame });
            this.show();
            this.emit("loaded");
        });

        this.webContents.on("frame-created", this.#onFrameCreated.bind(this));

        this.loadFile(this.static.homepage || DEFAULT_HOMEPAGE);

        if (this.static.plugins?.length) {
            this.static.plugins.forEach((plugin) => {
                this.loadPlugin(plugin);
            });
        }
    }
}

export default FluxBrowserWindow;
