import EventEmitter from "events";
import ChromeProtocol from "../CDP/CDP.js";
class WebContentsDevTools extends EventEmitter {
    webContents;
    attached;

    constructor(webContents) {
        super();
        this.webContents = webContents;

        this.initialize();
    }

    async isReady() {
        if (this.ready) return Promise.resolve(true);
        return new Promise((resolve, reject) => {
            console.log("Waiting for DevTools to be ready");
            this.once("ready", resolve);
        });
    }

    get network() {
        return this.cdp.network;
    }

    get dom() {
        return this.cdp.dom;
    }

    get debugger() {
        return this.cdp.debugger;
    }

    get client() {
        return this.cdp.client;
    }

    get target() {
        return this.cdp.target;
    }

    get page() {
        return this.cdp.page;
    }

    get vdom() {
        return this.cdp.vdom;
    }

    close() {
        this.cdp.close();
    }

    async attach() {
        const { webContents } = this;
        const browser = webContents.browser;

        if (this.attached) return Promise.resolve();

        this.cdp = new ChromeProtocol(webContents);

        return new Promise((resolve, reject) => {
            this.cdp.on("connect", (client) => {
                //debug('Recieved Connect Event');
                const { network } = this.cdp;

                this.attached = true;

                network.on("request", (request) => {
                    if (request.isLogin && request.loginData.username) {
                        //const { Account } = db.models;
                        const url = new URL(request.url);
                        //let acct = Account.where({ identity_id: browser.identity.id, website: url.hostname });
                        /*
                        if (!acct.exists) {
                            acct = new Account({
                                identity_id: browser.identity.id,
                                login_url: request.data.documentURL,
                                website: url.hostname,
                                username: request.loginData.username,
                                password: request.loginData.password,
                                last_login: Date.now(),
                            });
                            acct.save();
                        }

                        viewport.emit("login", request.loginData);
                        */
                    }
                });
                this.emit("attached");
                resolve();
            });
        });
    }

    async initialize() {
        const wc = this.webContents;
        await wc.debugger.attach("1.3");
        const { targetInfo } = await wc.debugger.sendCommand("Target.getTargetInfo");
        wc.devTarget = targetInfo;
        const { targetId } = targetInfo;
        debug(targetInfo);
        wc.targetId = targetId;
        this.emit("ready");
        this.ready = true;
        console.log("DevTools Ready");
    }
}

export default WebContentsDevTools;
