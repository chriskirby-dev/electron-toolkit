import CDP from 'chrome-remote-interface';

class ChromerProtocol {

    connected = false;
    client = null;
    port;

    constructor( port ) {
        this.port = port;
        this.client = null;
    }

    connect( target ) {
        const options = {
            port: this.port
        }
        if(target) options.target = target;
        return CDP(target).then( client => {
            this.client = client;
            this.connected = true;
        }).catch(console.error);
    }

    async disconnect() {
        await this.client.close();
        this.connected = false;
    }
    
    async getTargets(){
        await this.connect();
        const { Target } = this.client;
        const { targetInfos } = await Target.getTargets();
        return targetInfos;
    }

    async getTargetByTitle( title ){
        const targets = await this.getTargets();
        //debug(targets);
        return targets.find( target => target.title.toLowerCase().includes(title) );
    }

}   


export default ChromerProtocol;