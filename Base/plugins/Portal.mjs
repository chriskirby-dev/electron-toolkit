import { MessageChannelMain, ipcMain } from "electron";

import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export const name = "Portal";

export const path = __filename;

export function install(window) {
    const { id } = window.webContents;
    const { port1, port2 } = new MessageChannelMain();

    ipcMain.on("portal:created:" + id, (event) => {
        const [port] = event.ports;

        port.onmessage = (e) => {
            console.log("received result:", e.data);
            flux.emit("message", e.data);
            if (e.data.event) {
                const event = e.data.event;
                const data = e.data.data ? (Array.isArray(e.data.data) ? e.data.data : [e.data.data]) : [];
                flux.emit("message:event", event, ...data);
            } else {
                flux.emit("message:data", event, e.data);
            }
        };
        port.postMessage(22);
    });

    window.inject(`
      
        const { ipc } = flux;

        function sendMessage( ...args ){
            if(args.length == 1){
                const [ data ] = args;
                flux.portal.postMessage( data, null );
            }else if(args.length == 2){
                const [ event, data ] = args;
                flux.portal.postMessage( { event, data }, null );
            }
        }

        function onMessage(e){
            console.log('received result:', e.data)
            flux.emit('message', e.data);
            if(e.data === 'string'){
                flux.emit('message\${e.data}');
            } else if ( e.data.event ){
                const event = e.data.event;
                const data = e.data.data ? (Array.isArray(e.data.data) ? e.data.data : [e.data.data] ) : [];
                flux.emit('message:\${event}', ...data);
            }else{
                flux.emit('message:data', e.data);
            }
        }

        ipc.on('portal:request', (event) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = onMessage;
            channel.port1.postMessage('portal:created', [channel.port2]);
            flux.send = sendMessage;
        });

        ipc.on('portal:created', (event) => {
            const [ port ] = event.ports;
            port.onmessage = onMessage;
            port.postMessage({
                event: 'handshake',
                data: {
                    webContentsId: '${id}'
                }
            });
        })
        window.addEventListener('message', (e) => {
            console.log('message', message);
        });
    `);

    port2.on("message", (message) => {
        console.log(message);
        if (message.data) {
        }
    });

    window.on("loaded", () => {
        port2.start();

        window.webContents.postMessage("portal:forward", { channel: "automation:target" }, [port1]);
    });

    window.webContents.on("portal:created", () => {});
}
