# HTML Code Component

Rich HTML native code component.

## Integration

Integrate GitHub hosted module via script tag:

``` html
<script src="https://t-ski.github.io/html-code-component/dist/codecomponent.basic.js"></script>
```

Code component elements can be created like ordinary non-empty HTML elements: From markup tags or dynamic creation.

``` html
<code-component language="php" editable>
    // Code goes here
</code-component>
```

> Code component elements can be considered block spaced text content elements.

## Themes

Different default themes are available. All theme styles are individually extendable.

|    |    |
| :- | :- |
| `codecomponent.min.js`   | *Minimum component style*       |
| `codecomponent.basic.js` | *Default basic component style* |

## Attributes

Several attribute modifiers are available:

| Name | Purpose |
| :--- | :------ |
| `copyable` | *Enable copying of code via button* |
| `editable` | *Enable editing of code* |
| `highlight` | *Highlight given line(s) of code. Multiple lines to delimit with semicolon (;); line ranges to depicit with an infix dash (-).* |
| `type-live`| *Whether to have the given code* |

## Global Configuration

Code component elements can be adjusted on a globally uniformal basis using the static HTMLCodeComponent class context.  
  
Apply settings to each successively parsed code component using the `config()` method: 

``` js
HTMLCodeComponent.config({
    "tab-size": 4,
    "no-overflow": false
});
```

Element attributes (s.a.) that might be required to have a universal effect can be defined to the config, too:

``` js
HTMLCodeComponent.config({
    "copyable": false,
    "editable": false,
    "type-live": false
});
```

## Style

Custom styles can be provided to extend (and possibly override) the default style theme. At that, both plain CSS text or a path to a stylesheet file may be provided:

``` js
// CSS Text overload
HTMLCodeComponent.appendStyle(`
    .edit {
        color: slategray;
    }

    .hljs-comment {
        color: gray;
    }
`);

// Stylesheet href overload
HTMLCodeComponent.appendStyle("/assets/css/code-component.css");
```

### Structure

The code component element maintains an encapsulated DOM. The underlying elements can be styles from the given styles accessing the elements directly. The internal elements are classified as follows:

| Class | Element Description |
| :--- | :------------------- |
| `:host` | *Overall element wrapper* |
| `lines` | *Line number indicator on the left* |
| `edit` | *Editable area on the right* |
| `highlighted` | *Highlighted lines* |
| `copy` | *Copy button in the top-right corner* |

## Format handler

In order to provide custom code formatting (usually for highlighting) use the `setFormatHandler()` method:

``` js
// Specific language
HTMLCodeComponent.setFormatHandler("js", code => {
    return formatJs(code);
});

// Specific language
HTMLCodeComponent.setFormatHandler([ "js", "javascript" ], code => {
    return formatJs(code);
});

// Any language wildcard
HTMLCodeComponent.setFormatHandler("*", (code, language) => {
    return formatAny(code, language);
});
```

> Each language can be assigned multiple handlers that are worked in order of registration.

> The wildcard (working on `*`) handles any code regardless of the actual language and always applies first.

### Using highlight.js

[highlight.js](https://highlightjs.org/) – representing the most popular code highlighting API for JS – can easily be integrated. Consider the following example:

``` html
<script src="https://unpkg.com/@highlightjs/cdn-assets@11.6.0/highlight.min.js"></script>

<script>
    HTMLCodeComponent.setFormatHandler("*", (code, language) => hljs.highlight(code, { language }).value);
</script>
```

## Copy handler

In order to provide custom copy action handling (usually for mutating the copy button) use the `setCopyHandler()` method:

``` js
let copyTimeout;
HTMLCodeComponent.setCopyHandler(copyButton => {
    copyButton.textContent = "Copied";

    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(_ => {
        copyButton.textContent = "Copy";
    }, 2000);
});
```

> At most one copy handler is effective. Thus, any newly set handler overrides the previous.

### Slotted contents

Retrieve slotted code using either `innerHTML` or `textContent`. Both return the exact same value.

``` js
let code = document.querySelector("code-component#hero").innerHTML;
    code = document.querySelector("code-component#hero").textContent;
```

## Events

Each code component emits the familiar generic events. Additionally, editable code component elements emit the `input` and the `change` event equivalent to `input` or `textarea` element.

``` js
document.querySelector("code-component#hero")
.addEventListener("input", e => {
    document.querySelector("#compiled-out").textContent = compileAndRun(e.target.textContent);
});
```