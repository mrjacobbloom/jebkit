# jebkit
That's right, folks. You never knew you needed it, but here it is: an HTML rendering engine written in JS as a CommonJS (/Node.js ?) module. I've barely tested it outside the browser. It takes a Document object and a 2D canvas context and renders the node-tree to that context.

This is super a work in progress, right now it uses sketchy RegExp instead of a real CSS parser and only has a handful of properties implemented. There's a whole lot left to be done (feel free to contribute!)

## Usage
```javascript
// Create a canvas context.
var canvas = document.getElementsByTagName('canvas')[0];
var ctx = canvas.getContext("2d");

// Pass jebkit a Document object
jebkit.render(document, ctx);
```

### Ways to generate a Document object
* jsdom?? (remember to turn on querySelector)
* `iframe.contentDocument`
* `new DOMParser().parseFromString(...)`

## Cred
* Based suuuuuuper loosely on https://limpet.net/mbrubeck/2014/08/08/toy-layout-engine-1.html
* The styles would not be sorted if not for https://css-tricks.com/specifics-on-css-specificity/
* Default styles are stolen from Jsdom, who took them from Blink, which is adapted from Webkit...
