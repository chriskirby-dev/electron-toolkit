import CDP from 'chrome-remote-interface';
import ChromeProtocol from './ChromeProtocol';
import EventEmitter from 'events';


function parseAttributeArray(attributeArray){
    return attributeArray.reduce((result, value, index, array) => {
        if (index % 2 === 0) {
            const property = value;
            const nextValue = array[index + 1];
            if (nextValue !== undefined) {
                result[property] = nextValue;
            }
        }
        return result;
    }, {});
}


class NodeRegistry {

    static #registry = {
        ids: [],
        backendIds: [],
        frames: []
    };

    static exists( node ){
        return this.#registry.backendIds[node.backendNodeId] ? true : false;
    }

    static isCurrent( node ){
        return this.#registry.backendIds[node.backendNodeId] === node && this.#registry.ids[node.nodeId] === node;
    }

    static register( node ){
        //debug('REGISTER', node);
        this.#registry.backendIds[node.backendId] = node;
        this.#registry.ids[node.nodeId] = node;
        if( node.frameId ){
            this.#registry.frames[node.frameId] = node;
        }else if(node.nodeName == '#document'){

        }
    }

    static update( element, previousNodeId ){
        const item = this.#registry.backendIds[element.backendId];
        delete this.#registry.ids[previousNodeId];
        this.#registry.ids[element.nodeId] = element;
    }

    static get( nodeId ){
        //debug('GET reg', nodeId);
        return this.#registry.ids[nodeId];
    }

    static getByBackend( backendId ){
        return this.#registry.backendIds[backendId];
    }

    static getAll(){
        return this.#registry.ids;
    }

    static getAllBackend(){
        return this.#registry.backendIds;
    }

    static getAllFrames(){
        return this.#registry.frames;
    }

    static reset(){
        this.#registry = { ids: [], backendIds: [], frames: [] };
    }
}

class Document {
    nodeId;
    backendId;
    parentId;
    children = [];
    constructor(node){
        this.node = node;
        this.nodeId = node.nodeId;
        this.backendId = node.backendNodeId;
    }

    addChild( child, afterNodeId ){

        //If parent id does not = this id
        if( child.parentId !== this.nodeId && child.parent ) 
            child.parent.removeChild(child);

        child.parentId = this.nodeId;

        if(afterNodeId){
            const index = this.children.findIndex( child => child.nodeId == afterNodeId );
            this.children.splice(index + 1, 0, child);
        }else{
            this.children.push(child);
        }
    }

    removeChild( backendChildId ){
        //Filter children for child with matching backend id
        const child = this.children.filter( child => child.backendNodeId == backendChildId );
        if(child.length){
            //Remove child from children array
            this.children.splice(this.children.indexOf(child[0]), 1);
        }
        return child[0];
    }
}


class VirtualDomElement extends EventEmitter{

    nodeId;
    backendId;
    parentId;
    selector;
    attributes;
    children = [];
    tagName;
    events =[];
    rect={};
    description={};
    #dom;

    constructor( selector ){
        super();
        if(typeof selector == 'object'){
            this.node = selector;
        }

        this[typeof selector === 'string' ? 'selector' : 'nodeId'] = selector;

       // this.initialize();

    }

    get parent(){
        return NodeRegistry.get( this.parentId || this.node.parentId );
    }

    get tagName(){
        return this.node.localName;
    }

    get value(){
        return this.node.nodeValue;
    }

    get x(){ return this.rect.left; }

    get y(){ return this.rect.top; }

    get width(){ return this.rect.width; }

    get height(){ return this.rect.height; }

    get visible(){

        const { rect } = this;
        const { x, y, width, height } = rect;

        const viewportWidth = this.dom.viewport.width;
        const viewportHeight = this.dom.viewport.height;

        if( x > 0 && x < viewportWidth && y < viewportHeight && y > 0 ){
            return true;
        }

        return false;
    }

    get dom(){
        return this.#dom;
    }

    addChild( child, afterNodeId ){

        //If parent id does not = this id
        if( child.parentId !== this.nodeId && child.parent ) 
            child.parent.removeChild(child);

        child.parentId = this.nodeId;

        if(afterNodeId){
            const index = this.children.findIndex( child => child.nodeId == afterNodeId );
            this.children.splice(index + 1, 0, child);
        }else{
            this.children.push(child);
        }
    }

    removeChild( backendChildId ){
        //Filter children for child with matching backend id
        const child = this.children.filter( child => child.backendNodeId == backendChildId );
        if(child.length){
            //Remove child from children array
            this.children.splice(this.children.indexOf(child[0]), 1);
        }
        return child[0];
    }

    addEventListener( event, callback ){
        this.events[event].push(callback);
    }

    removeEventListener( event, callback ){

    }

    update(node){
        if(node){
            const previousNodeId = this.nodeId;
            
            this.node = node;
            this.nodeId = this.node.nodeId;
            this.backendId = this.node.backendNodeId;
            if(node.parentId != this.parentId) this.parentId = node.parentId;
            if(node.nodeType == 1){
            this.attributes = parseAttributeArray(node.attributes);
            }

            NodeRegistry.update( this, previousNodeId );
        }

    }



    async initialize( dom ){
        this.#dom = dom;
        const { client } = this.dom;

        if(this.node){
            this.nodeId = this.node.nodeId;
            this.backendId = this.node.backendNodeId;
        }

        if(!this.nodeId && this.selector ){
            this.nodeId = await this.dom.find(this.selector);
        }

        //Get element details
        const { description, rect, attributes } = await this.dom.inspect( this.nodeId );

        this.description = description;

        this.rect = rect;

        this.attributes = attributes;
    
    }
}

class Dom extends EventEmitter {

    root = {};
    view;

    constructor( browserView ){
        super();
        this.view = browserView;
        //debug( this.view.webContents.debuggerPort );
        this.cdp = new ChromeProtocol(this.view.webContents.debuggerPort);
        this.initialize();
    }

    navigate(url){

        return new Promise((resolve, reject) => {

            this.once('content-ready', ({ href }) => {
                //debug('DOM-READY', href);
                return resolve(true);
            });

            this.view.webContents.loadURL( url );

        });
    }

    getNode( id ){
        return new Promise((resolve, reject) => {
            DOM.querySelector({

            }).then(({nodeId}) => {
                //debug('FOUND', nodeId);
                return resolve(nodeId);
            }).catch(reject);
        });
    }

    async find( reference, scope ){
        //debug('DOM:FIND', reference, scope );
        const { DOM } = this.domains;
        let selector;
        if(typeof reference == 'string') selector = reference;
        else if(typeof reference == 'object' && reference.selector ) selector = reference.selector;
        if(selector){
            //debug('FINDING', selector, scope ? scope : this.root.nodeId );
            const params = {
                nodeId: scope ? scope : this.root.nodeId,
                selector: selector,
            };
            const {nodeId} = await DOM.querySelector(params);
            //debug('FOUND', nodeId );
            return nodeId;
        }
        return reference;
    }

    async inspect( nodeId ){

        try {
            const response = {};

            const { DOM } = this.cdp.client;

            if (!nodeId) {
                throw new Error(`Element with reference '${nodeId}' not found`);
            }

            // Get the content quads for the element (assuming the element is not transformed)
            const { quads } = await DOM.getContentQuads({ nodeId });
            
            // Extract the first quad (assuming the element is not transformed)
            const quad = quads[0];

            // Calculate client rect
            const clientRect = {
                top: Math.min(quad[1].y, quad[2].y),
                left: Math.min(quad[0].x, quad[1].x),
                width: Math.abs(quad[2].x - quad[1].x),
                height: Math.abs(quad[2].y - quad[0].y),
            };

            response.rect = clientRect;

            const description = await DOM.describeNode({ nodeId });
            response.description = description;
            response.attributes = parseAttributeArray(description.attributes);

            return response;

        } catch (error) {
            return error;
        } finally {
            
        }

    }

    element( nodeId ){
        const el = new VirtualDomElement(nodeId);
        el.initialize(this);

        return el;
    }

    registerNode( node ){
        //debug('registerNode', node);
        //Search current registry for node. If not found, create a new VirtualDomElement and register it.
        let element = NodeRegistry.getByBackend(node.backendNodeId);
        if(node.type == 1){
            //debug('is element')
            if(!element){ 
                element = new VirtualDomElement(node);
                element.initialize(this);
                NodeRegistry.register(element);
            }else{
                //If found, update the existing VirtualDomElement.
                element.update(node);
            }
        }else if(node.nodeType == 9){
            const doc = new Document(node);
            this.document = doc;
            NodeRegistry.register(doc);
        }
        return element;

    }
    
    compileNodeIndex( tree ){
        if(typeof tree == 'object' && tree.nodeId){
            tree = [tree];
        }
        tree.forEach( node => {
            this.registerNode(node);
            if(node.children){
                this.compileNodeIndex(node.children);
            }
        });
    }
    

    async initialize(){
        const self = this;
        await this.cdp.connect();

        const target = await this.cdp.getTargetByTitle('automate');

        //debug( target.targetId );

        await this.cdp.connect(target);
        const { DOM, Debugger, Page, Target, Network } = this.cdp.client;
        this.domains = { DOM, Debugger, Page, Network };

        // Enable the DOM and Debugger domains
        await Promise.all([Network.enable(), Page.enable(), DOM.enable(), Debugger.enable()]);

    
   // Attach to the specified targetId

        // Get the root Document node
        const { root } = await DOM.getDocument({
            depth: -1,
            pierce: true
        });

        this.root = root;
        NodeRegistry.reset();
        this.compileNodeIndex(root);

        //debug('root', root);

        const pageMetrics = await Page.getLayoutMetrics();
        this.viewport = pageMetrics.cssVisualViewport;
        
        //debug('viewport', this.viewport);

        Network.on('requestWillBeSent', ( data ) => {
            //console.log('requestWillBeSent', data);
        });

        Network.on('loadingFinished', ( data ) => {
            //console.log('loadingFinished', data);
        });

        DOM.on('childNodeCountUpdated', ( data ) => {

        });

        DOM.on('attributeModified', ( data ) => {

        });

        DOM.on('attributeRemoved', ( data ) => {

        });

        DOM.on('documentUpdated', ( data ) => {

        });

        DOM.on('characterDataModified', ( data ) => {
            ////debug('characterDataModified', data);
        });

        DOM.on('childNodeInserted', ( data ) => {
            //debug('childNodeInserted', data);
            //debug(NodeRegistry.getAll());
            
            const element = this.registerNode(data.node);
//data.node.parentId = data.parentNodeId;
            const parent = NodeRegistry.get(data.parentNodeId);
            parent.addChild( element, data.previousNodeId );
        });

        DOM.on('childNodeRemoved', ( data ) => {
            //debug('childNodeRemoved', data);
            const parent = NodeRegistry.get(data.parentNodeId);
            const child = NodeRegistry.get(data.nodeId);
            parent.removeChild(child.backendId);
        });

        DOM.on('setChildNodes', ( data ) => {

        });

        Page.on('domContentEventFired', async ( data ) => {
            NodeRegistry.reset();
            //debug('domContentEventFired', data );
            const { root } = await DOM.getDocument({
                depth: -1,
                pierce: true
            });

            this.root = root;
            //debug('root', root);
            this.compileNodeIndex(root);

            const pageMetrics = await Page.getLayoutMetrics();
            this.viewport = pageMetrics.cssVisualViewport;
            //debug('viewport', this.viewport);
            //debug('emitting content-ready');
            self.emit('content-ready', { href: root.documentURL });
        });


        this.emit('ready');
    }

}

export default Dom;