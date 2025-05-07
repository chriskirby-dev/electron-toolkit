import AutoMouse from './AutoMouse';
import AutoKeyboard from './AutoKeyboard';

class Automator {

    browser;
    reservations = {};

    constructor( browser ){
        this.browser = browser;
        this.mouse = new AutoMouse(this);
        this.keyboard = new AutoKeyboard(this);
    }

    get view(){
        return this.browser.view;
    }

    executeUntilTrue(script){
        const self = this;
        return new Promise((resolve, reject) => {

            function checkScript(){
                console.log('checkScript');
                self.browser.debugger.runtime.eval(script).then( result => {
                    console.log('checkScript', result);
                    if( result == true ){
                        setTimeout( () => resolve(true), 2000 );
                    }else{
                        setTimeout( checkScript, 500 );
                    }
                });
            }

            checkScript();
        });
    }

    executeJS(script){
        return this.browser.view.webContents.executeJavaScript(`
            ${script}
        `);
    }

    executePromise(script, timeout ){
        return this.browser.view.webContents.executeJavaScript(`
            let resolveTO;
            async function promise(){
                return new Promise((resolve, reject) => {
                    ${ timeout ? `resolveTO = setTimeout( reject, ${timeout});` : '' }
                    ${script}
                });
            }
            
            promise();
       `);
    }

    callback(channel, ...args){
        if( this.reservations[channel] ){
            while( this.reservations[channel].length ){
                const fn = this.reservations[channel].shift();
                fn(...args);
            }
        }
    }

    async inspect( target ){
        if( typeof target == 'string' ) target = { selector: target };
        return this.browser.debugger.dom.inspectNode(target.selector);
    }

    scrollToTarget( target ){
        if( typeof target == 'string' ) target = { selector: target };
        return new Promise((resolve, reject) => {
            this.inspect(target).then( detail => {
                if(detail.visible){
                    return resolve();
                }
                return this.executeJS(` flux.scrollToElement('${target.selector}'); `);
            });
        });
    }

    scrollTo( x, y ){
        return this.executeJS(` flux.scrollTo(${x}, ${y}); `);
    }

    monitor(target, event){
        return this.executeJS(` flux.monitor('${target}','${event}'); `);
    }

    clickSelector( target, offsetX, offsetY ){
        if( typeof target == 'string' ) target = { selector: target };
        this.browser.view.webContents.focus();

        //debug('Attempting to Click Selector', target, target.selector );
      //  this.view.webContents.focus();
        return new Promise((resolve, reject) => {

            this.monitor( target.selector, 'click' ).then(() => {
                //debug('Element was Clicked');
                return resolve(true);
            });

            this.browser.debugger.dom.scrollIntoView(target.selector).then(() => {
                //debug('scrollIntoView complete');
                this.mouse.moveToTarget(target, offsetX, offsetY).then(() => {
                    //debug('Move Complete');
                    this.mouse.click().then(() =>{
                        //debug('Click Complete');
                        setTimeout( () => resolve(true), 500 );
                    });
                });
            });
        });
    

    }

    
    click( x, y ){

        this.auotmator.browser.view.webContents.focus();

        return new Promise((resolve, reject) => {
            this.scrollTo(x,y).then(() => {
                return this.mouse.moveSmooth( x, y ).then(() => {
                    //debug('Move Complete');
                    return this.mouse.click().then(() =>{
                        //debug('Click Complete');
                        return resolve(true);
                    });
                });
            });
        });
    

    }

    type( value, speed ){
        console.log('Start Typing', value);
        return this.keyboard.type(value, speed);
    }

    input( selector, text, speed ){
        return this.focus(selector).then(() => {
            return this.type(text, speed );
        });
    }

    async focus( target, offsetX, offsetY ){

        if( typeof target == 'string' ) target = { selector: target };
        let focused = false;
        let focusTO;

        this.browser.view.webContents.focus();

        const inspection = await this.inspect(target.selector);
        console.log('inspection',inspection);
        throw new Error('exit');

        return new Promise((resolve, reject) => {
            this.browser.debugger.runtime.eval(`document.querySelector('${target.selector}') === document.activeElement;`).then((focused) => {
                //debug('IS Focused', focused )
                if(focused){
                    return resolve();
                }else{
                    this.clickSelector(target.selector, offsetX, offsetY).then(() => {
                        //debug('IS Focused', focused )
                        return resolve();
                        if(!focused){
                            focusTO = setTimeout(() => {
                                this.executeJS(`document.querySelector('${target.selector}').focus();`)
                            }, 2000 );

                            return this.monitor( target.selector, 'focus' ).then(() => {
                                clearTimeout(focusTO);
                                //debug('Element Now Focused');
                            });
                        }
                    });
                }
            });
        });
    }

    scrape( options ){
        return this.executeJS(` flux.scrape(${JSON.stringify(options)}); `);
    }

    navigate( url ){
        const self = this;
        return new Promise((resolve, reject) => {
            self.reserve('dom-ready', resolve);
            return this.browser.load(url).then(() => {
                self.browser.view.webContents.focus();

            }).catch(reject);
        });
    }

    reserve(event, fn ){
        if(!this.reservations[event]){
            this.reservations[event] = [];
        }
        this.reservations[event].push(fn);
    }


}

export default Automator;