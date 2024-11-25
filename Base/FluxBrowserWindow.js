import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

import { BrowserWindow, MessageChannelMain } from "electron";
import Toolbar from "../Browser/Toolbar.js";
import Tabs from "../Browser/Tabs.js";
import Content from "../../juice/HTML/Content.mjs";
import path from "path";
const DEFAULT_HOMEPAGE = path.resolve(__dirname, "../../resources/views/start.html");
//const { Authentication, Identity, Global } = global.db.models;

class FluxBrowserWindow extends BrowserWindow {
    static instances = [];

    bounds = {
        content: {},
        window: {},
    };

    views = [];
    config;
    controls = true;
    tabs = true;
    ipc;

    constructor(options) {
        super(options);
        this.options = options;
        if (options.config) this.config = options.config;
        //Add to static instances
        this.constructor.instances.push(this);
        this.#initialize(options);
        if (this.initialize) this.initialize();
    }

    get title() {
        return this.webContents.getTitle();
    }

    get url() {
        return this.webContents.getURL();
    }

    async loadTemplate(path, tokens) {
        const dir = path.substring(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
        const content = new Content(path, { tokens });
        await content.loaded();
        console.log("RENDERED", content.rendered);
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

    addBrowserView(view) {
        view.window = this;
        this.views.push(view);
        super.addBrowserView(view);
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

    #setupTabs() {
        this.tabs = new Tabs({ browser: this });
        this.tabs.setBounds({
            x: 0,
            y: 0,
            width: this.bounds.content.width,
            height: this.bounds.toolbarHeight,
        });
    }

    #setupToolbar() {
        this.toolbar = new Toolbar({ browser: this });
        this.toolbar.setBounds({
            x: 0,
            y: 0,
            width: this.bounds.content.width,
            height: this.bounds.toolbarHeight,
        });
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

    #initialize(options) {
        if (options.toolbar) {
            this.#setupToolbar();
        }

        if (options.tabs) {
            this.#setupTabs();
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

        this.webContents.on("frame-created", this.#onFrameCreated.bind(this));

        this.on("dom-ready", this.#domReady.bind(this));

        this.on("move", this.#onMove.bind(this));

        this.on("resize", this.#onResize.bind(this));

        this.#onFrameCreated(null, { frame: this.webContents.mainFrame });

        this.loadFile(this.constructor.homepage || DEFAULT_HOMEPAGE);
    }
}

export default FluxBrowserWindow;
