import { BrowserView } from "electron";

const INSTANCES = [];

class FluxBrowserView extends BrowserView {
    static instances = [];

    window;
    bounds = { width: 0, height: 0, x: 0, y: 0 };

    constructor(options, window) {
        super(options);
        if (window) this.window = window;
        this.#initialize();
    }

    send() {
        return this.webContents.send(...arguments);
    }

    portal() {}

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

    #onWindowResize(windowBounds) {}

    #onWindowMove(windowBounds) {
        this.x = windowBounds.content.x + this.bounds.x;
        this.y = windowBounds.content.y + this.bounds.y;
    }

    #initialize() {
        console.log(this);
        INSTANCES.push(this);

        this.#onFrameCreated(null, { frame: this.webContents.mainFrame });

        this.webContents.on("frame-created", this.#onFrameCreated.bind(this));

        // this.webContents.on("move", this.#onWindowMove.bind(this));

        // this.webContents.on("resize", this.#onWindowResize.bind(this));
    }
}

export default FluxBrowserView;
