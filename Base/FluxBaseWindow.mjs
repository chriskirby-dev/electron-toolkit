import * as url from "url";
import path from "path";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

import { app, MessageChannelMain, BaseWindow } from "electron";
import delay from "../../../../../js/juice/Util/Timers.mjs";
import Content from "../../../../../js/juice/HTML/Content.mjs";
import FluxBaseView from "./FluxBaseView.mjs";

const DEFAULT_HOMEPAGE = path.resolve(__dirname, "../views/default.html");
const DEFAULT_PRELOAD = path.resolve(__dirname, "../Renderer/preload.mjs");
const PLUGINS_DIR = path.resolve(__dirname, "./plugins");

function extractBounds(options) {
    return {
        x: options.x || 0,
        y: options.y || 0,
        width: options.width || 800,
        height: options.height || 600,
    };
}

class FluxBaseWindow extends BaseWindow {
    static instances = [];

    bounds = {
        content: {},
        window: {},
    };

    views = [];

    constructor(options = {}) {
        super(options);
        this.#initialize(options);
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

    addContentView(id, webContentsView, prefs = { nodeIntegration: false }) {
        view.parent = this;
        this.views[id] = view;
        super.setBrowserView({ view: webContentsView, webPreferences: prefs });
    }

    createContentView(id, options) {
        const bounds = extractBounds(options);
        const view = new FluxBaseView(id, options, this);
        view.setBackgroundColor("pink");
        view.setBounds(bounds);
        this.contentView.addChildView(view);
        view.webContents.loadFile(this.homepage || DEFAULT_HOMEPAGE);
        this.views[id] = view;
        this.webContents = view.webContents;

        if (options.isMainView) this.mainView = view;

        //this.#onFrameCreated(null, { frame: this.views[id].webContents.mainFrame });
        return view;
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
            webContentsId: this.getContentView().id,
            scope: "viewport",
        };

        setTimeout(() => {
            frame.send("identifiers", identifiers);
        }, 100);
    }

    #onMove() {
        const [x, y] = this.getPosition();
        const { menubar, frameSize } = this.bounds;
        this.bounds.window.x = x;
        this.bounds.window.y = y;
        this.bounds.content.x = x + frameSize;
        this.bounds.content.y = y + menubar.height;
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

    onWindowResize() {
        this.views.forEach((view) => view.onWindowResize());
    }

    inject(js) {
        this.webContents.executeJavaScript(`
        (function(){
            ${js}
        })()
    `);
    }

    injectScript(source) {
        this.webContents.executeJavaScript(`
            (function(){
                alert('inject');
                const script = document.createElement('script');
                script.src = "${source}"
                document.head.appendChild(script);
            })()
        `);
    }

    loadURL(url, options) {
        return this.mainView.webContents.loadURL(url, options);
    }

    loadFile(url, options) {
        return this.mainView.webContents.loadFile(url, options);
    }

    #initialize(options) {
        const [totalWidth, totalHeight] = this.getSize();
        const [width, height] = this.getContentSize();

        console.log(totalWidth, totalHeight, width, height);

        const frameSize = (totalWidth - width) / 2;
        this.bounds = {
            window: {},
            content: {},
            frameSize: frameSize,
            menubar: { height: totalHeight - height - frameSize },
            width: width,
        };

        this.bounds.height = totalHeight - this.bounds.menubar.height;

        this.windowChange = this.windowChange.bind(this);
        this.#onResize();
        this.#onMove();

        this.on("dom-ready", this.#domReady.bind(this));

        this.on("move", this.#onMove.bind(this));

        this.on("resize", this.#onResize.bind(this));

        this.on("close", () => {});

        setTimeout(() => this.onInitializationComplete(), 100);
    }

    onInitializationComplete() {
        this.loadFile(this.static.homepage || DEFAULT_HOMEPAGE).then(() => {
            this.emit("ready");
        });
    }
}

export default FluxBaseWindow;
