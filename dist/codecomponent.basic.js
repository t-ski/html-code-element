"use strict"; (_ => { const devConfig = { languageWildcard: "*", tagName: "code-component" }; const template = document.createElement("template"); template.innerHTML = ` <div class="lines"></div> <div class="edit"> <div class="edit-in" contenteditable data-nosnippet></div> <code class="edit-out"> <slot></slot> </code> </div> <span class="copy">Copy</span> <!-- © t-ski@GitHub --> `.trim(); class HTMLCodeComponent extends HTMLElement { static get observedAttributes() { return [ "copyable", "editable", "highlight", "language", "type-live" ]; } static #copyHandler; static #customConfig = { "tab-size": 4, "copyable": false, "editable": false, "language": null, "type-live": 1, "no-overflow": false }; static #template = template; static #formatHandlers = new Map(); static config(customConfigObj) { HTMLCodeComponent.#customConfig = { ...HTMLCodeComponent.#customConfig, ...customConfigObj }; } static appendStyle(cssRulesOrHref) { let insertElement; if(/^(https?:\/\/)?(\.\.?\/)*([^\s{}/]*\/)*[^\s{}/]+$/i.test(cssRulesOrHref)) { insertElement = document.createElement("link"); insertElement.setAttribute("rel", "stylesheet"); insertElement.setAttribute("href", cssRulesOrHref); } else { insertElement = document.createElement("style"); insertElement.textContent = cssRulesOrHref .replace(/\s*\n+\s*/g, "") .replace(/"/g, '\\"') .trim(); } HTMLCodeComponent.#template.content .insertBefore(insertElement, HTMLCodeComponent.#template.content.firstChild); Array.from(document.querySelectorAll(devConfig.tagName)) .filter(element => (element instanceof HTMLCodeComponent)) .forEach(element => { element.#host.insertBefore(insertElement.cloneNode(true), element.#host.firstChild); }); } static setFormatHandler(languageName, handler) { languageName = !Array.isArray(languageName) ? [ languageName ] : languageName; languageName.forEach(language => { const list = HTMLCodeComponent.#formatHandlers.get(language, handler) || []; HTMLCodeComponent.#formatHandlers.set(language, list.concat([ handler ])); }); Array.from(document.querySelectorAll(devConfig.tagName)) .filter(element => (element instanceof HTMLCodeComponent)) .filter(element => { return languageName.includes(element.getAttribute("language")) || languageName.includes(devConfig.languageWildcard); }) .forEach(element => element.#update()); } static setCopyHandler(handler) { HTMLCodeComponent.#copyHandler = handler; } #initialized; #host; constructor() { super(); this.#host = this.attachShadow({ mode: "closed" }); this.#host.appendChild(HTMLCodeComponent.#template.content.cloneNode(true)); this.#host.querySelector(".edit-in") .addEventListener("input", _ => { this.#applyFormatHandler(); }); this.#host.querySelector(".edit-in") .addEventListener("blur", _ => this.dispatchEvent(new Event("change"))); this.#host.querySelector(".edit-in") .addEventListener("keydown", e => { let appendix; switch(e.keyCode) { case 9: appendix = Array.from({ length: HTMLCodeComponent.#customConfig["tab-size"] }, _ => "&emsp;").join(""); break; case 13: appendix = "<br>\n<br>"; break; case 32: appendix = "&emsp;"; break; } if(!appendix) { return; } e.preventDefault(); document.execCommand("insertHTML", false, appendix); }); this.#host.querySelector(".edit-in") .addEventListener("copy", _ => this.#applyCopyHandler()); this.#host.querySelector(".edit-out") .addEventListener("copy", _ => this.#applyCopyHandler()); this.#host.querySelector(".edit-in") .addEventListener("paste", e => { e.preventDefault(); const pastedText = (window.clipboardData && window.clipboardData.getData) ? window.clipboardData.getData("Text") : e.clipboardData.getData("text/plain"); if(!pastedText) { return; } document.execCommand("insertHTML", false, pastedText .replace(/\n/g, "<br>\n")); }); this.#host.querySelector(".edit") .addEventListener("click", e => { if(e.target.className !== "edit") { return; } this.#host.querySelector(".edit-in").focus(); }); this.#host.querySelector(".copy") .addEventListener("click", _ => this.#applyCopyHandler()); } connectedCallback() { if(HTMLCodeComponent.#customConfig["no-overflow"]) { this.#deleteRequiredCssRule(2); this.#deleteRequiredCssRule(1); } !(navigator.clipboard || {}).writeText && this.#deleteRequiredCssRule(0); (this.typeLive && this.editable) && this.removeAttribute("type-live"); setTimeout(_ => { const lines = this.innerHTML .replace(/^\s*\n|\n\s*$/g, "") .split(/\n/g); const minIndentation = lines .filter(line => (line.trim().length > 0)) .map(line => line.match(/^\s*/)[0]) .reduce((prev, cur) => Math.min(prev, cur.length), Infinity); const normalizedText = lines .map(line => line.slice(!isNaN(parseInt(minIndentation)) ? minIndentation : 0)) .map(line => line.replace(/^ /g, "\u2003")) .map(line => line.replace(/ {2}/g, "\u2003\u2003")) .map(line => { return line .replace(/&lt;/g, "<") .replace(/&gt;/g, ">") .replace(/&quot;/g, "\"") .replace(/&#39;/g, "\'") .replace(/&amp;/g, "&"); }); this.#host.querySelector(".edit-in").innerHTML = normalizedText .map(line => `<div>${line || ""}</div>`) .join(""); const code = normalizedText.join("\n"); this.#update(code); this.#initialized = true; }, 0); } attributeChangedCallback(attrName) { switch(attrName) { case "highlight": this.#applyHighlighting(); return; case "language": this.#applyFormatHandler(); return; case "type-live": this.#applyLiveTyping(); return; } } #update(code) { ![undefined, null].includes(this.typeLive) ? this.#applyLiveTyping(code) : this.#applyFormatHandler(code); } #deleteRequiredCssRule(index) { this.#host .styleSheets[this.#host.styleSheets.length - 1] .deleteRule(index); } #readBareContent(noUnicode = false) { return this.#host.querySelector(".edit-in").textContent .split(/\n/g) .map(line => { return noUnicode ? line.replace(/\u2003/g, " ") : line; }) .join("\n"); } #applyFormatHandler(input) { const language = this.language || HTMLCodeComponent.#customConfig["language"]; const handlers = (HTMLCodeComponent.#formatHandlers.get(devConfig.languageWildcard) || []) .concat(HTMLCodeComponent.#formatHandlers.get(language) || []); const tagRegex = /<( *(\/ *)?(?!br)[a-z][a-z0-9_-]*( +[a-z0-9_-]+ *(= *("|')((?!\\\6)(.| ))*\6)?)* *)>/gi; input = input || this.#readBareContent(); let output = input.replace(tagRegex, "&lt;$1&gt;"); handlers.forEach(handler => { output = handler(output, language); }); const openingTags = []; this.#host.querySelector(".edit-out").innerHTML = output .split(/\n/g) .map(line => { const prevOpeningTags = Object.assign([], openingTags); (line.match(tagRegex) || []) .forEach(tag => { const tagName = tag.match(/[a-z][a-z0-9_-]*/i)[0]; if(/^< *\//.test(tag)) { while(![tagName, undefined].includes(openingTags.pop())); return; } openingTags.push({ name: tagName, tag: tag }); }); return `<div>${ prevOpeningTags .map(tag => { return tag.tag }) .join("") }${line}${ openingTags .map(tag => { return `</${tag.name}>`; }) .join("") }</div>`; }) .join(""); const lineNumbers = []; let lineHeight; Array.from(this.#host.querySelector(".edit-out").querySelectorAll("div")) .forEach(div => { const computedStyle = window.getComputedStyle(div); lineHeight = lineHeight || parseInt(computedStyle.getPropertyValue("line-height")); const ratio = HTMLCodeComponent.#customConfig["no-overflow"] ? Math.round(parseInt(computedStyle.getPropertyValue("height")) / lineHeight) : 1; lineNumbers.push(`${lineNumbers.length + 1}${Array.from({ length: ratio }, _ => "<br>").join("")}`); }); this.#host.querySelector(".lines").innerHTML = lineNumbers.join(""); this.#applyHighlighting(); } #applyCopyHandler(e) { e && e.preventDefault(); const copyButton = this.#host.querySelector(".copy"); try { navigator.clipboard.writeText(this.textContent); HTMLCodeComponent.#copyHandler && HTMLCodeComponent.#copyHandler(copyButton); } catch(err) { HTMLCodeComponent.#copyHandler && HTMLCodeComponent.#copyHandler(copyButton); } } #applyHighlighting() { if(!this.highlight) { return; } const lineDivs = Array.from(this.#host.querySelectorAll(".edit-out > div")); lineDivs.forEach(div => div.classList.remove("highlighted")); this.highlight .split(/;/g) .map(instruction => instruction.trim()) .forEach(instruction => { if(/^[0-9]+$/.test(instruction)) { lineDivs[parseInt(instruction) - 1] && lineDivs[parseInt(instruction) - 1].classList.add("highlighted"); return; } if(!/^[0-9]+\s*,\s*[0-9]+$/.test(instruction)) { return; } const indices = instruction .split("-") .map(index => parseInt(index.trim())) .sort(); for(let index = indices[0]; index <= indices[1]; index++) { if(!lineDivs[parseInt(index) - 1]) { return; } lineDivs[parseInt(index) - 1].classList.add("highlighted"); } }); } #applyLiveTyping(input) { const speed = parseInt(this.typeLive) || HTMLCodeComponent.#customConfig["type-live"]; const remainingInput = (input || this.#readBareContent()) .split(""); const writtenInput = []; const whitespaceRegex = /^(\s|\n)$/; let lastChar = " "; const type = fixedDelay => { const curChar = remainingInput.shift(); writtenInput.push(curChar); const delayBounds = (whitespaceRegex.test(lastChar)) ? (/\s|\n/.test(curChar) ? [ 50, 250 ] : [ 300, 750 ]) : [25, 300]; const delay = fixedDelay || Math.round(((Math.random() * (delayBounds[1] - delayBounds[0])) + delayBounds[0]) * (speed || 1)); lastChar = curChar; setTimeout(_ => { this.#applyFormatHandler(writtenInput.join("")); (remainingInput.length > 0) && type(); }, delay); }; type(0); } #getBinaryAttribute(attribute) { const value = this.getAttribute(attribute); return ![undefined, null, "false"].includes(value); } #setAttribute(attribute, value) { this[`${!!value ? "set" : "remove"}Attribute`](attribute, value); } get editable() { return this.#getBinaryAttribute("editable"); } set editable(value) { (this.typeLive && value !== "false") && this.removeAttribute("type-live"); this.#setAttribute("editable", value); } get copyable() { return this.#getBinaryAttribute("copyable"); } set copyable(value) { this.#setAttribute("copyable", value); } get highlight() { return this.getAttribute("highlight"); } set highlight(value) { this.#setAttribute("highlight", value); } get typeLive() { return this.getAttribute("type-live"); } set typeLive(value) { if(this.editable) { return; } this.#setAttribute("type-live", value); } get language() { return this.getAttribute("language"); } set language(value) { this.#setAttribute("language", value); } get innerHTML() { return !this.#initialized ? super.innerHTML : this.#readBareContent(true); } set innerHTML(input) { this.#applyFormatHandler(input); } get textContent() { return this.innerHTML; } set textContent(input) { this.innerHTML = input; } } HTMLCodeComponent.appendStyle(":host([copyable]) .copy {display: block;}.edit {overflow: scroll;}.edit-in, .edit-out {white-space: nowrap !important;}:host([hidden]) {display: none !important;}:host([editable]) .edit-in {display: block !important;}:host([copyable]) .copy {display: block !important;}.copy {display: none !important;}:host {--line-height: 1.75em;}:host {position: relative;display: flex;flex-direction: row;overflow: scroll;}:host([editable]) .edit {cursor: text;}:host([editable]) .edit-out {position: absolute;top: 0;width: 100%;height: 100%;pointer-events: none;}.edit {position: relative;flex: 1 0 0;}.lines, .edit-in, .edit-out {padding: 0.65em 0.85em;font-family: monospace;box-sizing: border-box;}.lines, .edit-in, .edit-in > div, .edit-out > div {line-height: var(--line-height);}.edit {scroll-padding-right: 0.85rem;}.lines {text-align: right;}.edit-in > div, .edit-out > div {height: auto;min-height: var(--line-height);}.edit-in {display: none;min-height: fit-content;color: transparent;caret-color: slategray;}.edit-in:focus {outline: none;}.edit-out {position: relative;display: block;width: fit-content;min-width: 100%;}"); window.customElements.define(devConfig.tagName, HTMLCodeComponent); window.HTMLCodeComponent = HTMLCodeComponent; HTMLCodeComponent.appendStyle(":host {background-color: #FFFFFF;color: #111111;border: 1px solid #EAEAEA;border-radius: 0.35em;}:host(:hover) .copy {opacity: 1;}.lines, .edit {height: fit-content;min-height: 100%;}.lines {background-color: #FAFAFA;color: #7A7A7A;user-select: none;}.highlighted {background-color: #FFFFDA;}.copy {position: absolute;top: 0;right: 0;cursor: pointer;margin: 0.25em;padding: 0.75em;background-color: inherit;text-transform: uppercase;opacity: 0;user-select: none;transition: all 200ms;}@media (prefers-color-scheme: dark) {:host {background-color: #222 !important;color: #FFF !important;border-color: #555 !important;}.lines {background-color: #3E3E3E !important;}.highlighted {background-color: #444800 !important;}}"); let copyTimeout; HTMLCodeComponent.setCopyHandler(copyButton => { copyButton.textContent = "Copied"; clearTimeout(copyTimeout); copyTimeout = setTimeout(_ => { copyButton.textContent = "Copy"; }, 2000); }); })();