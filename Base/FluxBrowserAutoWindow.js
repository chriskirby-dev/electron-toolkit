import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

class FluxBrowserAutoWindow extends BrowserWindow {
    static instances = [];

    constructor(options) {
        super(options);
        this.options = options;
        if (options.config) this.config = options.config;
        //Add to static instances
        this.constructor.instances.push(this);
        this.#initialize();
    }

    get title() {
        return this.getTitle();
    }

    set title(t) {
        this.setTitle(t);
    }

    get width() {
        return this.bounds.width;
    }

    set width(w) {
        this.bounds.width = w;
        this.setSize(w, this.height, true);
        this.#onResize();
    }

    get height() {
        return this.bounds.height;
    }

    set height(h) {
        this.bounds.height = h;
        this.setSize(this.width, h, true);
        this.#onResize();
    }

    makeOverlay() {}

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

        this.sendPortal(port1, "automation:target");
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
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = "${source}"
                    script.onload = () => {
                        resolve();
                    }
                    document.head.appendChild(script);
                });
            })()
        `);
    }

    #onResize() {
        const [totalWidth, totalHeight] = this.getSize();
        const [width, height] = this.getContentSize();
        this.bounds.window.height = totalHeight;
        this.bounds.window.width = totalWidth;
        this.bounds.width = width;
        this.bounds.height = height;
    }

    async #initialize() {
        this.on("dom-ready", this.#domReady.bind(this));

        this.on("resize", this.#onResize.bind(this));

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

        const wc = this.webContents;
        await wc.debugger.attach("1.3");
        const { targetInfo } = await wc.debugger.sendCommand("Target.getTargetInfo");
        const { targetId } = targetInfo;
        this.targetId = targetId;
    }
}

export default FluxBrowserAutoWindow;
