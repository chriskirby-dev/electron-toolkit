/**
 * Get the current page's metrics
 *
 * @returns {Object} Page metrics
 */
class Inspect {
    static page() {
        const body = document.body;
        const html = document.documentElement;

        // Get the maximum height and width of the document
        const docHeight = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
        );
        const docWidth = Math.max(
            body.scrollWidth,
            body.offsetWidth,
            html.clientWidth,
            html.scrollWidth,
            html.offsetWidth
        );

        // Get the window's width and height
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Get the scroll position of the document
        const scrollX = document.body.scrollLeft || document.documentElement.scrollLeft;
        const scrollY = document.body.scrollTop || document.documentElement.scrollTop;

        // Build the page object
        const page = {
            title: document.title,
            url: window.location.href,
            window: { width: windowWidth, height: windowHeight },
            document: { width: docWidth, height: docHeight },
            scroll: { x: scrollX, y: scrollY, maxX: docWidth - windowWidth, maxY: docHeight - windowHeight },
            frame: this.frame() || { path: "top" },
        };

        return page;
    }

    /**
     * Get the metrics of an element
     *
     * @param {Element} element
     * @returns {Object} Element metrics
     */
    static element(selector) {
        const element = typeof selector == "string" ? document.querySelector(selector) : selector;
        if (!element.getBoundingClientRect) {
            return;
        }

        const rect = element.getBoundingClientRect();
        const page = this.page();

        // Get the attributes of the element
        const { attributes } = element;
        const _attributes = {};
        for (var i = 0, atts = attributes, n = atts.length, arr = []; i < n; i++) {
            _attributes[atts[i].nodeName] = element.getAttribute(atts[i].nodeName);
        }

        // Build the element object
        const resp = {
            selector: this.getSelector(element),
            x: rect.left,
            y: rect.top,
            text: element.textContent.trim().replace(/([\s]+)/g, " "),
            pageX: rect.left + page.scroll.x,
            pageY: rect.top + page.scroll.y,
            width: rect.width,
            height: rect.height,
            tagName: element.tagName.toLowerCase(),
            attributes: _attributes,
        };

        // Check if the element is a form element
        if (
            ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName) ||
            element.form ||
            element.constructor.formAssociated
        ) {
            resp.formElement = true;
        }

        // Check if the element is inside a frame
        if (window.flux?.frame) {
            resp.frame = window.flux.frame;
        }

        return resp;
    }

    /**
     * Get the metrics of all elements in the given scope
     *
     * @param {Element} scope
     * @returns {Object} Metrics of all elements in the given scope
     */
    static aggregateElements(scope = document) {
        const data = { class: {}, tag: {}, attribute: {} };

        // Get all elements in the given scope
        const elements = scope.querySelectorAll("*");

        // Iterate over all elements and build the metrics
        elements.forEach((element) => {
            const tag = element.tagName.toLowerCase();
            const attributes = Array.from(element.attributes);

            // Count the number of elements with the same tag
            if (data.tag[tag]) {
                data.tag[tag].count += 1;
                data.tag[tag].elements.push(element);
            } else {
                data.tag[tag] = { count: 1, elements: [element] };
            }

            // Count the number of elements with the same class
            if (element.className) {
                const classNames = Array.from(element.classList);

                classNames.forEach((className) => {
                    if (data.class[className]) {
                        data.class[className].count += 1;
                        data.class[className].elements.push(element);
                    } else {
                        data.class[className] = { count: 1, elements: [element] };
                    }
                });
            }

            // Count the number of elements with the same attribute
            attributes.forEach((attribute) => {
                const value = element.getAttribute(attribute);
                if (data.attribute[attribute.name]) {
                    data.attribute[attribute.name].count += 1;
                    data.attribute[attribute.name].elements.push(element);
                    data.attribute[attribute.name].values.push(value);
                } else {
                    data.attribute[attribute.name] = { count: 1, elements: [element], values: [value] };
                }
            });
        });

        return data;
    }

    /**
     * Get the metrics of all classes in the given scope
     *
     * @param {Element} scope
     * @returns {Object} Metrics of all classes in the given scope
     */
    static aggergrateClasses(scope = document) {
        const classes = scope.querySelectorAll("*[class]");
        const classMap = {};
        classes.forEach((element) => {
            const classNames = element.className.split(" ");
            classNames.forEach((className) => {
                if (classMap[className]) {
                    classMap[className].count += 1;
                    classMap[className].elements.push(element);
                } else {
                    classMap[className] = { count: 1, elements: [element] };
                }
            });
        });
        return classMap;
    }

    /**
     * Get the selector of the given element
     *
     * @param {Element} element
     * @param {String} prefix
     * @param {Boolean} traverse
     * @param {Object} tmp
     * @returns {String} Selector of the given element
     */
    static getSelector(element, prefix, traverse = true, tmp = {}) {
        let selector;
        if (!tmp.aggregate) {
            tmp.aggregate = this.aggregateElements();
        }

        // Check if the element is valid
        if (!(element instanceof Element) && !element.tagName) {
            console.error(element, "Invalid element provided.");
            return null;
        }

        // Get the tag name of the element
        const tag = element.tagName.toLowerCase();
        const siblings = Array.from(element.parentNode.children);
        const siblingsOfSameTag = siblings.filter((sibling) => sibling.tagName === element.tagName);
        const classes = {};
        Array.from(element.classList).map((className) => {
            classes[className] = tmp.aggregate.class[className].count;
        });

        const sameTagCount = tmp.aggregate.tag[tag].count;

        getSelector: {
            selector = tag;
            // Check if the element has an ID
            if (element.id) {
                selector = `${tag}#${element.id}`;
                break getSelector;
            }

            // Check if the element has a unique class in all of doc
            for (let className in classes) {
                if (classes[className] == 1) {
                    selector = `${tag}.${className}`;
                    break getSelector;
                }
            }

            // Check parent for similar siblings
            const _siblings = Array.from(element.parentNode.children);
            const similarSiblings = _siblings.filter((sibling) => sibling.tagName === element.tagName);

            if (similarSiblings.length > 1) {
                const index = similarSiblings.indexOf(element) + 1;
                selector = `${element.tagName}:nth-child(${index})`;
                break getSelector;
            }
        }

        // Use :is() pseudo-class with tag name and attributes

        const attributes = Array.from(element.attributes)
            .map((attr) => (["id", "class"].includes(attr.name) ? `[${attr.name}="${attr.value}"]` : ""))
            .join("");
        selector = `${tag}${attributes}`;

        let current = element;
        while (current.parentNode && document.querySelectorAll(selector).length > 1) {
            selector = this.getSelector(current.parentNode, selector);
            current = current.parentNode;
        }

        return selector;
    }

    /**
     * Get the frame metrics of the current window
     *
     * @returns {Object} Frame metrics of the current window
     */
    static frame() {
        if (!window.frameElement) return false;
        const id = window.frameElement.id;
        const name = window.frameElement.name;

        let win = window;
        let x, y;
        x = y = 0;
        const path = [];
        while (win.frameElement) {
            var rect = win.frameElement.getBoundingClientRect();
            x += rect.left;
            y += rect.top;
            path.push(win.frameElement.id || win.frameElement.name);
            win = win.parent;
        }
        path.reverse();
        return { path, x, y, id, name };
    }
}

export default Inspect;
