
const __filename = import.meta.url;
const __dirname = import.meta.url.substring(8, import.meta.url.lastIndexOf('/'));

import EventEmitter from "events";
import { type } from '../../../juice/Util/Core.mjs';
//import Automator from './Automator.js';
import path from 'path';
import Control from './Control.js';
import { app } from "electron";

class Automate extends EventEmitter {

    browser;
    queue = [];
    index = 0;
    taskIndex = 0;
    automator;
    type;

    constructor( browser ) {
        super();        
        this.browser = browser;
        if(this.browser.ready){
           // this.automator = new Automator( browser );
        }else{
            this.browser.on('ready', ()=>{
              //  this.automator = new Automator( browser );
            });
        }
    }

    

    input(){

    }


    onEvent( channel, ...args ){
        this.browser.overlay.send(channel, ...args );
        /*
        this.automator.mouse.callback(channel, ...args);
        this.automator.keyboard.callback(channel, ...args);
        this.automator.callback(channel, ...args);
        */
        switch( channel ){
            case 'mousemove':
              
            break;
           
        }
    }

    run(){


    }


    

    complete(){
        this.browser.overlay.hide();
    }

    runScript(){
        const { script } = this;
    }

    runTask(task){
        this.browser.panels.get('AutomationPanel').send('starting-task', this.taskIndex);
        console.log('runTask', task);
        let action = null;
        let stop = false;
        switch(task.action){
            case 'navigate':
                action = this.control.navigate( task.value.href );
            break;
            /*
            case 'click':
                if( task.target.selector ){
                    let ox, oy;
                    if(task.target.tagName == 'input'){
                        ox = 10;
                        oy = task.target.width/2;
                    }
                    action = this.automator.clickSelector( task.target, ox, oy );
                }else{
                    action = this.automator.click( task.target.x, task.target.y );
                }
            break;
            */

            case 'fill':
                const paths = task.value.path.split('.');
                //debug(paths);
                let tokenValue = '';
                if(paths[0] == 'global'){
                    const { Global } = global.db.models;
                    const gv = Global.where({
                        name: paths[1]
                    }).first();
                    
                    tokenValue = gv.value;
                }else if(paths[0] == 'identity'){
                     tokenValue = task.value.path.split('.').reduce((obj, key) => obj && obj[key] || '', this.identity.toJson() );
                }
                console.log('FILL',tokenValue);
                action = this.control.input( task.target, tokenValue );
            break;
                /*
            case 'input':
            action = this.automator.input( task.target, task.value.end.replace(task.value.start, '') );
            break;
            case 'focus':
            action = this.automator.focus( task.target );
            stop = true;
            break;
            case 'await':
                action = this.await(task);
            break;
            */
        }

        return new Promise((resolve) => {
            action.then((result) => {
                if(!result || stop) return;
                //debug('Action Finished');
                if(task.verify){
                    return this.verify(task).then(() => setTimeout( resolve, 500) );
                }
                setTimeout( resolve, 500)
       
            });
        });

    }

    await(task){
        const self = this;
        const type = task.value.type;
        switch(type){
            /*
            case 'dom_condition':
                if(task.value.condition == 'exists'){
                    return this.automator.executeUntilTrue(`document.querySelector('${task.target.selector}') !== undefined;`);
                }
            break;
            case 'page-load':
            return new Promise((resolve, reject) => {

                function onViewDomReady(){
                    //debug('view-dom-ready');
                    if(!task.value.href){
                        resolve();
                        self.removeListener('view-dom-ready', onViewDomReady);
                    }else if(task.value.href == this.browser.href ){
                        resolve();
                        self.removeListener('view-dom-ready', onViewDomReady);
                    }
                }

                self.browser.view.webContents.once('dom-ready', onViewDomReady );
            });
            break;
            case 'timeout':
            return new Promise((resolve, reject) => {
                setTimeout( resolve, task.value.duration );
            });
            break;
            case 'condition':
            return new Promise((resolve, reject) => {

            });
            break;
            */
        }
    }

    verify(task){
        if(task.verify){
            const type = task.value.type;
            switch(type){
                case 'page-load':
                steps.push(new Promise((resolve, reject) => {
                    this.browser.once('view-dom-ready', resolve );
                }));
                
                break;
            }
        }
    }

    runTasks( tasks ){
        const self = this;
        self.taskIndex = -1;
        if(tasks) self.tasks = tasks;

        return new Promise((resolve, reject) => {
            function nextTask(){
                if(self.taskIndex >= 1/*self.tasks.length-1*/) return resolve();
                self.taskIndex++;
                let task = self.tasks[ self.taskIndex ];
                self.runTask(task.toJson()).then( nextTask );
            }
            nextTask();
        });
    }

    load( type, id ){
       // this.browser.debugger.enable('dom');
        //this.browser.debugger.enable('network');
        //debug('LOADING AUTOMATION', type, id );
        const { Automation, AutomationTask, Identity } = global.db.models;
        this.browser.overlay.show();
        
        this.type = type;
        
        this.identity = Identity.fromId(this.browser.identity.id || 1);
       // console.log(this.identity);

        this.browser.tabs.create(null, {
            homepage: path.join(__dirname, '../../../', 'resources/views/automate.html')
        });

        this.browser.view.webContents.focus();
/*
        this.browser.debugger.dom.getSnapshot().then((snap) => {
            //debug(snap);
        });
*/
        this.control = new Control(this.browser.view);
        this.control.on('ready', () => {
            //debug('Control Ready');
            if(type == 'script'){
            
                const scriptPath = id;
                const AutomationScript = require(scriptPath);
                this.script = new AutomationScript(this);
                this.runScript().then(this.complete);
            }else if(type == 'tasks'){
                const automation = new Automation( id );
                this.tasks = automation.tasks;
                this.taskIndex = -1;
                this.runTasks().then(this.complete);
            }

        })
        
    }

}


export default Automate;