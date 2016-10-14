/**********
* jebkit - An HTML rendering engine written in JS. Because the worl needed that.
* Coptright (c) 2016 Jacob Bloom (github user Airhogs777)
***********/

(function() {
  'use strict';
  
  /**
   * Whether the runtime is Node or a browser.
   * @type {Boolean}
   * @private
   */
  var isNode_ = Boolean(typeof(module) !== 'undefined'
      && typeof(module.exports) !== 'undefined');
      
  /**
   * Object of fuctions (the entire module).
   * @type {Object.Function}
   */
  var exports = {};
  
  // should be able to require stuff now that we have webpack setup.
  //cssParser = require('css');

  // If running in Node, do package stuff. Otherwise just be a variable.
  if(module) {
  module.exports = exports;
  }
  if (window) {
    window.jebkit = exports;
  }
  /*if (isNode_) {
    module.exports = exports;
    
    //var fs = require('fs');
  } else {
    if(this) {
      this.jebkit = exports;
    } else {
      window.jebkit = exports;
    }
  }*/
  
  /**
   * Return an array representing the selector's specificity.
   * @param {?String} selector The selector to be parsed (null if in style attr).
   * @param {Number} index The index of the rule (null if in style attr).
   * @return {Array} [includedByAt, !important, attr, id, class, tagname, ruleIndex, propIndex]
   */
  function selectorToSpecificity(selector, index) {
    var specificity;
    if (selector === null) {
      specificity = [1, 0, 1, 0, 0, 0, 0, 0];
    } else {
      // more parsing with RegEx muahahaha
      // there are no rules
      // let's break everything
      // I REALLY need to import a 3rd-party parser :DDD
      let idMatches = selector.match(/#[A-Za-z\-0-9_]+/g);
      let idCount = (idMatches !== null) ? idMatches.length : 0;
      let classMatches = selector.match(/\.[A-Za-z\-0-9_]+/g);
      let classCount = (classMatches !== null) ? classMatches.length : 0;
      let tagNameMatches = selector.match(/(^|\s)[A-Za-z\-0-9_]+/g);
      let tagNameCount = (tagNameMatches !== null) ? tagNameMatches.length : 0;
      
      specificity = [1, 0, 0, idCount, classCount, tagNameCount, index, 0];
    }
    return specificity;
  }
  
  /**
   * Constructor for a CSS rule using the worst possible parsing methods.
   * TODO: never let me write a parser.
   * @param {String} instring The rule as a string to be parsed.
   * @param {Boolean} attr Whether the rule is in a style attribute.
   * @param {Number} index Index of the rule in stylesheets.
   * @private
   */
  function JebkitCSSRule_(instring, attr, index) {
    var propStrs;
    if(attr) {
      this.selector = null;
      propStrs = instring.split(';');
    } else {
      var ruleParts = instring.split(/{|}/);
      this.selector = ruleParts[0].trim();
      propStrs = ruleParts[1].split(';');
    }
    this.properties = {};
    for (let i = 0, propStr; propStr = propStrs[i]; i++) {
      let propParts = propStr.split(':');
      if (propParts.length >= 2) {
        this.properties[propParts[0].trim()] = propParts[1].trim();
      }
    }
    /**
     * Array representing the selector's specificity (see selectorToSpecificity).
     * @type {Array}
     */
    this.specificity = selectorToSpecificity(this.selector, index);
  }
  /**
   * Split the stylesheet from a string into an array of rules (also strings).
   * @param {String} stylesheet
   * @return {Array.String}
   */
  function splitStyleSheet(stylesheet) {
    var out = stylesheet;
    // I'm the worst kind of h@x0r
    out = out.replace(/\/\*(.|\n)*?\*\//g, '');
    out = out.replace(/@.*/g, '');
    out = out.match(/[^{}]*{[^{}]*}/g);
    return out;
  }
  
  /**
   * Extract the rules from the stylesheets in the document and return them in
   * an array.
   * @param {Document} doc The document to scrape.
   * @private
   */
  function getStylesheetRules_(doc) {
    var allRules = [];
    
    // I added webpack exclusively so I wouldn't have to load these async-ly,
    // using xhr would mean like so many nested callbacks. I need structure.
    // also this is the same in Node and browser so yay.
    var text = require('./default-stylesheet.js');
    var rules = splitStyleSheet(text);
    for (let j = 0, rule; rule = rules[j]; j++) {
      allRules.push(new JebkitCSSRule_(rule, false, allRules.length));
    }
    
    
    // now everything else on the page.
    if (doc.styleSheets && doc.styleSheets.length > 0) {
      for (let i = 0, stylesheet; stylesheet = doc.styleSheets[i]; i++) {
        for (let j = 0, rule; rule = stylesheet.cssRules[j]; j++) {
          allRules.push(new JebkitCSSRule_(rule.cssText, false, allRules.length));
        }
      }
    } else {
      // apparently getting a document via DOMParser doesn't fill
      // document.styleSheets with stylesheets so let's do it ourselves.
      let styleElements = doc.getElementsByTagName('style');
      for (let i = 0, styleElement, rules; styleElement = styleElements[i]; i++) {
        // split element's contents into array of rules
        // I know this is wrong, shh. Let's pretend @-rules are fake.
        rules = splitStyleSheet(styleElement.innerHTML);
        for (let j = 0, rule; rule = rules[j]; j++) {
          allRules.push(new JebkitCSSRule_(rule, false, allRules.length));
        }
      }
    }
    return allRules;
  }
  
  /**
   * Compares 2 specificity arrays for the sort function.
   * @param {Array.Number} spec1 First specificity array.
   * @param {Array.Number} spec2 Second specificity array.
   * @return {Number}
   */
  function compareSelectors(spec1, spec2) {
    for (let i = 0; i < spec1.specificity.length; i++) {
      if(spec1.specificity[i] != spec2.specificity[i]) {
        return spec1.specificity[i] - spec2.specificity[i];
      }
    }
    return 0;
  }
  
  
  /**
   * Return an array of the properties to apply.
   * @param {Array.JebkitCSSRule_} matchedRules An array of matched CSS style rules.
   * @return {Object.String}
   * @private
   */
  function getAppliedStyles_(matchedRules) {
    var rulesByProperty = {};
    for (let i = 0, rule; rule = matchedRules[i]; i++) {
      let propKeys = Object.keys(rule.properties);
      for (let j = 0, prop; prop = propKeys[j]; j++) {
        if(rule.properties.hasOwnProperty(prop)) {
          if(!rulesByProperty[prop]) {
            rulesByProperty[prop] = [];
          }
          let obj = {
            value: rule.properties[prop],
            specificity: rule.specificity.slice(),
            rule: rule
          }
          obj.specificity[1] = (obj.value.match(/!important/) ? 1 : 0);
          rulesByProperty[prop].push(obj);
        }
      }
    }
    
    var allPropKeys = Object.keys(rulesByProperty);
    var appliedStyles = {};
    for (let i = 0, prop; prop = allPropKeys[i]; i++) {
      if(rulesByProperty.hasOwnProperty(prop)) {
        rulesByProperty[prop].sort(compareSelectors);
        appliedStyles[prop] = rulesByProperty[prop].pop().value
            .replace(/!important/, '').trim();
        // idc if I modify the original array since it's built immeiately before
        // remove "important" since it's not ... important ... for styling
        // I crack myself up
      }
    }
    return appliedStyles;
  }
  
  /**
   * Recursively build tree of nodes and their applied (most precedant) styles
   * (not necessarily the computed values).
   * @param {?HTMLElement} node The node to collect applied styles for, or null.
   * @param {Array.JebkitCSSRule_} rules An array of all CSS style rules.
   * @private
   */
  function StyleNode_(node, rules) {
    this.node = node;
    this.children = null;
    if(node) {
      this.nodeType = node.nodeType;
      if(node.childNodes && node.childNodes.length) {
        this.children = [];
        for (let i = 0, child; child = node.childNodes[i]; i++) {
          // ignore empty text nodes and comment nodes
          if (!(child.nodeType == Node.TEXT_NODE && child.data.trim().length === 0)
              && child.nodeType != Node.COMMENT_NODE) {
            this.children.push(new StyleNode_(child, rules));
          }
        }
      }
      // TODO: inherit
      if (this.nodeType == Node.ELEMENT_NODE) {
        var matchedRules = [];
        for (let i = 0, rule; rule = rules[i]; i++) {
          if (this.node.matches(rule.selector)) {
            matchedRules.push(rule);
          }
        }
        if (this.node.getAttribute('style')) {
          matchedRules.push(new JebkitCSSRule_(this.node.getAttribute('style'), true, 0));
        }
        this.appliedStyles = getAppliedStyles_(matchedRules);
      }
    } else {
      this.nodeType = null;
    }
    this.getProp = function(property) {
      if (this.computedStyles && this.computedStyles[property]) {
        return this.computedStyles[property];
      } else if (this.appliedStyles && this.appliedStyles[property]) {
        return this.appliedStyles[property];
      } else {
        return null;
      }
    }
    // this is a function since nodes may be modified down the line
    this.isBlock = function() {
      return Boolean(this.nodeType === null
          || (this.nodeType == Node.ELEMENT_NODE
            && this.appliedStyles.display
            && this.appliedStyles.display.match(/block/)));
    }
  }
  
  /**
   * Delete nodes that won't be rendered.
   * @param {StyleNode_} node
   */
  function deleteHiddenNodes(node) {
    
    // baby function to test if a node is hidden.
    var isHidden = function(a) {
      return Boolean(a.nodeType == Node.ELEMENT_NODE
            && a.appliedStyles.display
            && a.appliedStyles.display.match(/none/));
    }
    
    var newChildren = []
    for(let i = 0, child; child = node.children[i]; i++) {
      if (!isHidden(child)) {
        newChildren.push(child);
        if(child.nodeType == Node.ELEMENT_NODE) {
          deleteHiddenNodes(child)
        }
      }
    }
    node.children = newChildren;
  }
  
  /**
   * No box can contain mixed block and inline elements, so this groups mixed-
   * typed sibling elements into imaginary boxes.
   * @param {StyleNode_} node
   */
  function addAnonymousNodes(node) {
    // iterate through chilren once to see if there are any blocks.
    var childrenIncludesBlock = false,
        childrenIncludesInline = false;
    for(let i = 0, child; child = node.children[i]; i++) {
      if (child.isBlock()) {
        childrenIncludesBlock = true;
      } else {
        childrenIncludesInline = true;
      }
    }
    
    if (childrenIncludesBlock && childrenIncludesInline) {
      // iterate through chilren again to add anon block boxes around contiguous
      // inline chilren.
      var newChildren = []
      for(let i = 0, child; child = node.children[i]; i++) {
        if (child.isBlock()) {
          newChildren.push(child);
        } else {
          if(Array.isArray(newChildren[newChildren.length-1])) {
            newChildren[newChildren.length-1].push(child);
          } else {
            newChildren.push([child]);
          }
        }
      }
      // now convert those nested arrays into anonymous block nodes;
      for(let i = 0; i < newChildren.length; i++) {
        if(Array.isArray(newChildren[i])) {
          let tempChildren = newChildren[i];
          newChildren[i] = new StyleNode_(null, []);
          newChildren[i].children = tempChildren;
          newChildren[i].appliedStyles = {'display': 'block'}
        }
      }
      node.children = newChildren;
    }
    for(let i = 0, child; child = node.children[i]; i++) {
      if(child.nodeType == Node.ELEMENT_NODE) {
        addAnonymousNodes(child);
      }
    }
  }
  
  /**
   * Recursively resolve shorthand properties.
   * @param {StyleNode_} node
   */
  function resolveShorthands(node) {
    if(node.children) {
      for(let i = 0, child; child = node.children[i]; i++) {
        resolveShorthands(child);
      }
    }
    if(!node.appliedStyles) {return;}
    
    var lengthToPx = function(len) {
      // make sure len is a string
      var strlen = String(len);
      // ideally some more useful code should go here.
      var num = Number(strlen.replace(/[A-Za-z]+/g, ''));
      if (isNaN(num)) {
        return 0;
      } else {
        return num;
      }
    }
    
    var p = node.appliedStyles;
    var q = node.computedStyles = {};
    
    // baby function to quickly resolve Top-Right-Bottom-Left style shorthands
    var trblProp = function(prop) {
      if(p[prop + '-top'] !== undefined) q[prop + '-top'] = p[prop + '-top'];
      if(p[prop + '-right'] !== undefined) q[prop + '-right'] = p[prop + '-right'];
      if(p[prop + '-bottom'] !== undefined) q[prop + '-bottom'] = p[prop + '-bottom'];
      if(p[prop + '-left'] !== undefined) q[prop + '-left'] = p[prop + '-left'];
      if(p[prop] === undefined) {
        q[prop] = "0";
      } else {
        q[prop] = p[prop];
      }
      let split = q[prop].split(' ');
      if(split.length == 1) {
        if(q[prop + '-top'] === undefined) q[prop + '-top'] = split[0];
        if(q[prop + '-right'] === undefined) q[prop + '-right'] = split[0];
        if(q[prop + '-bottom'] === undefined) q[prop + '-bottom'] = split[0];
        if(q[prop + '-left'] === undefined) q[prop + '-left'] = split[0];
      } else if(split.length == 2) {
        if(q[prop + '-top'] === undefined) q[prop + '-top'] = split[0];
        if(q[prop + '-right'] === undefined) q[prop + '-right'] = split[1];
        if(q[prop + '-bottom'] === undefined) q[prop + '-bottom'] = split[0];
        if(q[prop + '-left'] === undefined) q[prop + '-left'] = split[1];
      } else if(split.length == 4) {
        if(q[prop + '-top'] === undefined) q[prop + '-top'] = split[0];
        if(q[prop + '-right'] === undefined) q[prop + '-right'] = split[1];
        if(q[prop + '-bottom'] === undefined) q[prop + '-bottom'] = split[2];
        if(q[prop + '-left'] === undefined) q[prop + '-left'] = split[3];
      }
      q[prop] = lengthToPx(q[prop]);
      q[prop + '-top'] = lengthToPx(q[prop + '-top']);
      q[prop + '-right'] = lengthToPx(q[prop + '-right']);
      q[prop + '-bottom'] = lengthToPx(q[prop + '-bottom']);
      q[prop + '-left'] = lengthToPx(q[prop + '-left']);
    }
    
    // get TRBL properties out of the way first.
    trblProp('padding');
    trblProp('margin');
    q['height'] = lengthToPx(p['height']);
    q['width'] = lengthToPx(p['width']);
    //trblProp('border-width'); //should be border-bottom-width
                              // dang, I may need to explore this further.
  }
  
  /**
   * Recursively find the width and height of each node.
   * @param {StyleNode_} node
   * @param {?StyleNode_} parent Parent node to node.
   * @param {?StyleNode_} prevSibling Previous sibling node.
   * @param {?Boolean} opt_isDocumentElement True if node is the
   *    documentElement (the outermost/parentiest node).
   * @param {?CanvasRenderingContext2D} opt_ctx the canvas context (for width/height).
   */
  function computeDimensions(node, parent, prevSibling, opt_isDocumentElement, opt_ctx) {
    node.dimensions = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
    if (opt_isDocumentElement) {
      node.dimensions.x = 0;
      node.dimensions.y = 0;
      node.dimensions.width = opt_ctx.canvas.width;
    } else {
      if (node.isBlock()) {
        node.dimensions.x = parent.dimensions.x
            + parent.getProp('padding-left')
            + node.getProp('margin-left');
        var maxWidth = parent.dimensions.width
            - parent.getProp('padding-left')
            - parent.getProp('padding-right')
            - node.getProp('margin-left')
            - node.getProp('margin-right');
        // MIN AND MAX WIDTH
        if (node.getProp('width') && node.getProp('width') < maxWidth) {
          node.dimensions.width = node.getProp('width');
        } else {
          node.dimensions.width = maxWidth;
        }
      }
    }
    
    if (prevSibling) {
      node.dimensions.y = prevSibling.dimensions.y
          + prevSibling.dimensions.height
          + prevSibling.getProp('margin-bottom')
          + node.getProp('margin-top');
    } else if (parent) {
      node.dimensions.y = parent.dimensions.y
          + parent.getProp('padding-top')
          + node.getProp('margin-top');
    }
    
    
    var childrenTotalHeight = 0;
    for (let i = 0, child; node.children && (child = node.children[i]); i++) {
      computeDimensions(child, node, node.children[i-1]);
      childrenTotalHeight += child.dimensions.height
          + child.getProp('margin-top')
          + child.getProp('margin-bottom');
    }
    
    if (node.isBlock()) {
      var minHeight = node.getProp('height') /*|| node.getProp('min-height')*/ || 0;
      if (childrenTotalHeight > minHeight) {
        node.dimensions.height = childrenTotalHeight;
      } else {
        node.dimensions.height = minHeight;
      }

      node.dimensions.height += node.getProp('padding-top')
          + node.getProp('padding-bottom');
    }
  }
  
  /**
   * Render the node.
   * @param {StyleNode_} node The node to render.
   * @param {CanvasRenderingContext2D} ctx The canvas context to render onto.
   */
  function renderNode(node, ctx) {
    ctx.fillStyle = (node.getProp('background') || 'transparent');
    ctx.fillRect(node.dimensions.x,node.dimensions.y,node.dimensions.width,node.dimensions.height);
    for (let i = 0, child; node.children && (child = node.children[i]); i++) {
      renderNode(child, ctx);
    }
  }
  
  /**
   * Render the input HTML onto a canvas context.
   * @param  {Document} doc The document object to render.
   * @param  {CanvasRenderingContext2D} context A 2D canvas context.
   * @return Void.
   */
  exports.render = function(doc, context) {
    // the first half of this is basically a shim for getComputedStyle & CSSOM.
    // P.S. never let me write a parser or I'll RegExp all over you.
    var rules = getStylesheetRules_(doc);
    var styleTree = new StyleNode_(doc.documentElement, rules);
    //okay now to the meaty (layout=meat??) stuff
    deleteHiddenNodes(styleTree);
    addAnonymousNodes(styleTree);
    // somewhere around here, resolve shorthands, set padding to 0 by default, etc.
    resolveShorthands(styleTree);
    computeDimensions(styleTree, null, null, true, context);
    console.log(styleTree);
    
    // NOW WE DRAW THINGS :DDDDDDD
    context.clearRect(0,0,context.canvas.width, context.canvas.height);
    renderNode(styleTree, context);
  };

})();
