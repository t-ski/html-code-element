// TODO: Auto complete interface?

const devConfig = {
    genericLanguageKey: "*",
    tagName: "code-component"
};


const template = document.createElement("template");
template.innerHTML = `
<div class="lines"></div>
<div class="edit">
    <div class="edit-in" contenteditable data-nosnippet></div>
    <code class="edit-out">
        <slot></slot>
    </code>
</div>
<span class="copy">Copy</span>
<!-- © t-ski@GitHub -->
`.trim();


class HTMLCodeComponent extends HTMLElement {

    static #copyHandler;

    static #customConfig = {
        tabSize: 4,
        noOverflow: false
    };  // TODO: Line height option?
    static #template = template;
    static #formatHandlers = new Map();
        
    static config(customConfigObj) {
        HTMLCodeComponent.#customConfig = {
            ...HTMLCodeComponent.#customConfig,
            
            ...customConfigObj
        };

        !HTMLCodeComponent.#customConfig.noOverflow
        && HTMLCodeComponent.appendStyle(`
            .edit {
                overflow: scroll;
            }
            .edit-in, .edit-out {
                white-space: nowrap !important;
            }
        `);
    }

    static appendStyle(style) {
        const newStyleElement = document.createElement("style");
        newStyleElement.textContent = style
        .replace(/\s*\n+\s*/g, "")
        .replace(/"/g, '\\"')
        .trim();
        HTMLCodeComponent.#template.content.insertBefore(newStyleElement, HTMLCodeComponent.#template.content.querySelector("style"));
    }
    
    static setFormatHandler(languageName, handler) {
        languageName = !Array.isArray(languageName)
        ? [ languageName ] : languageName

        languageName.forEach(language => {
            HTMLCodeComponent.#formatHandlers.set(language, handler);
        });

        Array.from(document.querySelectorAll(devConfig.tagName))
        .filter(element => {
            return languageName.includes(element.getAttribute("language"))
            || languageName.includes(devConfig.genericLanguageKey);
        })
        .forEach(element => element.update());
    }
    
    static setCopyHandler(handler) {
        HTMLCodeComponent.#copyHandler = handler;
    }

    #host;
    #eventHandlers;

    constructor() {
        super();

        this.#eventHandlers = new Map();

        this.#host = this.attachShadow({
            mode: "closed"
        });
        
        this.#host.appendChild(HTMLCodeComponent.#template.content.cloneNode(true));

        this.#host.querySelector(".edit-in")
        .addEventListener("input", _ => {
            this.#applyFormatHandler();
        });
        
        this.#host.querySelector(".edit-in")
        .addEventListener("keydown", e => {
            let appendix;
            
            switch(e.keyCode) {
                case 9: // n-space tab (sub)
                    appendix = Array.from({ length: HTMLCodeComponent.#customConfig.tabSize }, _ => "&emsp;").join("");

                    break;
                case 32: // Space (sub)
                    appendix = "&emsp;";

                    break;
            }

            if(!appendix) {
                return;
            }
            
            e.preventDefault();

            document.execCommand("insertHTML", false, appendix);
        });

        this.#host.querySelector(".edit")
        .addEventListener("click", e => {
            if(e.target.className !== "edit") {
                return;
            }
            
            this.#host.querySelector(".edit-in").focus();
        });

        const copyButton = this.#host.querySelector(".copy");
        copyButton
        .addEventListener("click", _ => {
            try {
                const content = this.#readBareContent(".edit-in")
                .replace(/\u2003/g, " ");

                navigator.clipboard.writeText(content);

                HTMLCodeComponent.#copyHandler && HTMLCodeComponent.#copyHandler(copyButton);
            } catch(err) {
                HTMLCodeComponent.#copyHandler && HTMLCodeComponent.#copyHandler(copyButton);
            }
        });
    }

    #readBareContent(query) {
        const parent = this.#host.querySelector(query);

        if(!parent) {
            return [];
        }

        return Array.from(parent.querySelector("div")
        ? parent.querySelectorAll("div")
        : parent)
        .map(child => child.textContent)
        .join("\n");
    }

    #dispatchEvent(event) {
        if(!this.#eventHandlers.has(event)) {
            return;
        }

        this.#eventHandlers.get(event)
        .forEach(handler => handler({
            target: this
        })); // What to pass?
    }

    #applyFormatHandler(input) {
        const tagRegex = /<( *(\/ *)?[a-z][a-z0-9_-]*( +[a-z0-9_-]+ *(= *("|')((?!\\\5)(.| ))*\5)?)* *)>/gi;

        const handler = HTMLCodeComponent.#formatHandlers.has(devConfig.genericLanguageKey)
        ? HTMLCodeComponent.#formatHandlers.get(devConfig.genericLanguageKey)
        : (HTMLCodeComponent.#formatHandlers.has(this.language)
            ? HTMLCodeComponent.#formatHandlers.get(this.language)
            : c => c || "");

        const content = (input || this.#readBareContent(".edit-in"))
        .replace(tagRegex, "&lt;$1&gt;");
        
        const openTags = {};
        this.#host.querySelector(".edit-out").innerHTML = 
        handler(content, this.language)
        .split(/\n/g)
        .map(line => {
            (line.match(tagRegex) || [])
            .forEach(tag => {
                const tagName = tag.slice(1)
                .replace(/^< *(\/ *)?/, "")
                .split(/[ >]/, 2)[0]
                .toLowerCase();
                
                if(tag.slice(1).trim().charAt(0) === "/") {
                    openTags[tagName]
                    && openTags[tagName].pop();

                    return;
                }

                openTags[tagName] = (open.tagName || []).concat([ tag ]);
            });

            return `<div>${line}</div>`;
        })
        .join("");
        
        const lineNumbers = [];
        let lineHeight;
        Array.from(this.#host.querySelector(".edit-out").querySelectorAll("div"))
        .forEach(div => {
            const computedStyle = window.getComputedStyle(div);

            lineHeight = lineHeight || parseInt(computedStyle.getPropertyValue("line-height"));

            const ratio = HTMLCodeComponent.#customConfig.noOverflow
            ? Math.round(parseInt(computedStyle.getPropertyValue("height")) / lineHeight)
            : 1;
            
            lineNumbers.push(`${lineNumbers.length + 1}${Array.from({ length: ratio }, _ => "<br>").join("")}`);
        })

        this.#host.querySelector(".lines").innerHTML = lineNumbers.join("");

        /* this.#host.querySelector(".edit-in").innerHTML = this.#readBareContent(".edit-out")
        .split(/\n/g)
        .map(line => `<div>${line}</div>`)
        .join(""); */   // Cursor mis-update behavior

        this.#applyHighlighting();
        
        // Dispatch "event"
        this.#dispatchEvent("input");
    }

    #applyHighlighting() {
        if(!this.hasAttribute("highlight")) {
            return;
        }

        const lineDivs = Array.from(this.#host.querySelectorAll(".edit-out > div"));

        this.getAttribute("highlight")
        .split(/;/g)
        .map(instruction => instruction.trim())
        .forEach(instruction => {
            if(/^[0-9]+$/.test(instruction)) {
                lineDivs[parseInt(instruction) - 1].classList.add("highlighted");

                return;
            }

            if(!/^[0-9]+\s*,\s*[0-9]+$/.test(instruction)) {
                return;
            }

            const indices = instruction
            .split(",")
            .map(index => parseInt(index.trim()))
            .sort();

            for(let index = indices[0]; index <= indices[1]; index++) {
                lineDivs[parseInt(index) - 1].classList.add("highlighted");
            }
        });
    }
    
    #applyLiveTyping(speed) {
        if(this.hasAttribute("editable")) {
            return;
        }

        if(!this.isConnected) {
            return;
        }

        this.#host.styleSheets[this.#host.styleSheets.length - 1]
        .deleteRule(0);
        
        const remainingInput = this.#readBareContent(".edit-out")
        .split(""); 

        const writtenInput = [];
        
        const whitespaceRegex = /^(\s|\n)$/;
        let lastChar = " ";
        const type = fixedDelay => {
            const curChar = remainingInput.shift();
            writtenInput.push(curChar);

            const delayBounds = (whitespaceRegex.test(lastChar))
            ? (/\s|\n/.test(curChar)
                ? [ 50, 250 ] : [ 300, 750 ])
            : [25, 300];

            const delay = fixedDelay
            || Math.round(((Math.random()
            * (delayBounds[1] - delayBounds[0]))
            + delayBounds[0]) * (speed || 1));

            lastChar = curChar;

            setTimeout(_ => {
                this.#applyFormatHandler(writtenInput.join(""));

                (remainingInput.length > 0)
                && type();
            }, delay);
        };

        type(0);
    }

    connectedCallback() {
        window.setTimeout(_ => {
            const lines = this.innerHTML
            .replace(/^\s*\n|\n\s*$/g, "")
            .split(/\n/g);

            const minIndentation = lines
            .filter(line => (line.trim().length > 0))
            .map(line => line.match(/^\s*/)[0])
            .reduce((prev, cur) => Math.min(prev, cur.length), Infinity);

            const normalizedText = lines
            .map(line => line.slice(!isNaN(parseInt(minIndentation)) ? minIndentation : 0))
            .map(line => line.replace(/^ /g, "\u2003"))
            .map(line => line.replace(/ {2}/g, "\u2003\u2003"));

            this.#host.querySelector(".edit-in").innerHTML = normalizedText
            .map(line => `<div>${line || ""}</div>`)
            .join("")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&");

            this.#applyFormatHandler(normalizedText.join("\n"));

            this.hasAttribute("type-live")
            && this.#applyLiveTyping(parseInt(this.getAttribute("type-live")));
        }, 0);

        // TODO: Detect tab size to normalize it?
    }

    attributeChangedCallback(attrName) {
        if(attrName !== "language") {
            return;
        }

        this.#applyFormatHandler();
    }

    addEventListener(event, handler) {
        const current = this.#eventHandlers.get(event) || [];

        this.#eventHandlers.set(event, current.concat([ handler ]));
    }   // TODO: Complete

    update() {
        this.#applyFormatHandler();
    }

    get editable() {
        return this.hasAttribute("editable");
    }
    
    set editable(value) {
        this[`${value ? "set" : "remove"}Attribute`]("editable", value);

        value && this.#applyHighlighting();
    }

    get copyable() {
        return this.hasAttribute("copyable");
    }
    
    set copyable(value) {
        this[`${value ? "set" : "remove"}Attribute`]("copyable", value);
    }

    get highlight() {
        return this.hasAttribute("highlight");
    }
    
    set highlight(value) {
        this[`${value ? "set" : "remove"}Attribute`]("highlight", value);

        value && this.#applyHighlighting(value);
    }

    get typeLive() {
        return this.getAttribute("type-live");
    }
    
    set typeLive(value) {
        this[`${value ? "set" : "remove"}Attribute`]("type-live", value);

        value && this.#applyLiveTyping(value);
    }

    get language() {
        return this.getAttribute("language");
    }
    
    set language(value) {
        this[`${value ? "set" : "remove"}Attribute`]("copyable", value);
    }

}


HTMLCodeComponent.appendStyle("@CSS"
.concat((navigator.clipboard && navigator.clipboard.writeText)
? `
    :host([copyable]) .copy {
        display: block;
    }
` : ""));

window.customElements.define(devConfig.tagName, HTMLCodeComponent);


window.HTMLCodeComponent = HTMLCodeComponent;