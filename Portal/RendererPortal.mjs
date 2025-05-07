import { EventEmitter } from "events";
import { ipcRenderer } from "electron";

export class RendererPortal extends EventEmitter {
    static instances = [];
    static index = 0;

    constructor(options) {
        this.options = options;
        RendererPortal.index++;
        RendererPortal.instances.push(this);
        this.index = RendererPortal.index;
        this.id = "portal" + RendererPortal.index;
        this.#initialize();
    }

    onMessage(e) {
        console.log("Got Message", e);
        const message = e.data;
        if (typeof message === "string") {
            this.emit("message", message);
        } else if (message.hasOwnProperty("event")) {
            this.emit(message.event, ...message.data);
        } else {
            this.emit("data", message);
        }
    }

    send() {
        this.local.postMessage(...arguments);
    }

    #initialize() {
        this.ready = false;

        // The only difference between port1 and port2 is in how you use them. Messages
        // sent to port1 will be received by port2 and vice-versa.

        ipcRenderer.on("protal:created", (e) => {
            this.local = e.ports[0];
            this.local.onmessage = this.onMessage.bind(this);

            this.ready = true;
        });

        ipcRenderer.on("protal:request", () => {
            const channel = new MessageChannel();
            const { port1: localPort, port2: remotePort } = channel;
            this.local = localPort;
            this.remote = remotePort;
            localPort.onmessage = this.onMessage.bind(this);
            console.log("Sending Message Port");
            ipcRenderer.postMessage("portal:created", { id: this.id }, [remotePort]);
            this.ready = true;
        });

        this.ready = true;
        ipcRenderer.send("ready");
    }
}
