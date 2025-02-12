import * as url from "url";
import path from "path";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import { extractOptions } from "./BrowserOptions.mjs";
import { app, MessageChannelMain, WebContentsView } from "electron";
import delay from "../../../../../js/juice/Util/Timers.mjs";
import Content from "../../../../../js/juice/HTML/Content.mjs";

const DEFAULT_HOMEPAGE = path.resolve(__dirname, "../views/default.html");
const DEFAULT_PRELOAD = path.resolve(__dirname, "../Renderer/preload.mjs");
const PLUGINS_DIR = path.resolve(__dirname, "./plugins");

class FluxBaseView extends WebContentsView {
    frameSize = 0;
    config;
    ipc;
    views = [];
    plugins = [];

    static preloads = [DEFAULT_PRELOAD];
    static appliedOptionsBase = ["config", "isMainView", "dependants:depends", "template", "width", "height", "x", "y"];
    static appliedOptions = [];
    static instances = [];

    bounds = {
        content: {},
        window: {},
    };

    static create(options) {
        class ExtendedBrowserWindow extends FluxBaseView {
            static appliedOptions = options.appliedOptions || [];
            static plugins = options.plugins || [];
        }
        return ExtendedBrowserWindow;
    }

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

    constructor(name, options, parent) {
        const browserOptions = extractOptions(options);
        if (browserOptions.webPreferences && !browserOptions.webPreferences.preload) {
            browserOptions.webPreferences.preload = DEFAULT_PRELOAD;
        }
        console.log("browserOptions", browserOptions);
        super(browserOptions, parent);
        this.parentWindow = parent;
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
        delay(100, "bounds").then(() => this.windowChange());
    }

    get y() {
        return this._y;
    }

    set y(y) {
        this._y = y - this.frameSize;
        delay(100, "bounds").then(() => this.windowChange());
    }

    get width() {
        return this._width;
    }

    set width(width) {
        this._width = width + this.frameSize * 2;
        delay(100, "bounds").then(() => this.windowChange());
    }

    get height() {
        return this._height;
    }

    set height(height) {
        this._height = height + this.frameSize * 2;
        delay(100, "bounds").then(() => this.windowChange());
    }

    windowChange() {
        this.setBounds({ x: this._x, y: this._y, width: this._width, height: this._height });
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

    injectScript(source, target) {
        const ext = path.extname(source);
        switch (ext) {
            case ".js":
                return this.injectPromise(`
                    alert('inject ${source}');
                    const script = document.createElement('script');
                    script.src = "${source}";
                    script.onload = () => resolve();
                    script.onerror = () => reject();
                    document.head.appendChild(script);
                `);
                break;
            case ".css":
                return this.injectPromise(`
                    alert('inject ${source}');
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = "${source}";
                    link.onload = () => resolve();
                    link.onerror = () => reject();
                    document.head.appendChild(link);
                `);
                break;
        }
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
        this.windowChange = this.windowChange.bind(this);
        const { options, parentWindow } = this;

        if (this.template) {
            this.loadTemplate(this.template, this.tokens || {});
        }

        if (this.static.plugins?.length) {
            this.static.plugins.forEach((plugin) => {
                this.loadPlugin(plugin);
            });
        }

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
    }
}

export default FluxBaseView;
