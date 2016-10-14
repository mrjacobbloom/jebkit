/**********
* jebkit - An HTML rendering engine written in JS. Because the worl needed that.
* Coptright (c) 2016 Jacob Bloom (github user Airhogs777)
***********/

(function() {
  'use strict';
      
  /**
   * Object of fuctions (the entire module).
   * @type {Object.Function}
   */
  var exports = {};

  // If running in Node, do package stuff. Otherwise just be a variable.
  if(module) {
  module.exports = exports;
  }
  if (window) {
    window.jebkit = exports;
  }
  
  var cssom = require('./cssom.js');
  var CSSRule_ = cssom.CSSRule_;
  
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
   * @param {Array.CSSRule_} matchedRules An array of matched CSS style rules.
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
   * @param {Array.CSSRule_} rules An array of all CSS style rules.
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
          matchedRules.push(new CSSRule_(this.node.getAttribute('style'), true, 0));
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
    var rules = cssom.getStylesheetRules(doc);
    var styleTree = new StyleNode_(doc.documentElement, rules);
    //okay now to the meaty (layout=meat??) stuff
    // there's nothing more satisfying than funct names of equal length.
    deleteHiddenNodes(styleTree);
    addAnonymousNodes(styleTree);
    require('./resolve.js')(styleTree);
    computeDimensions(styleTree, null, null, true, context);
    console.log(styleTree);
    
    // NOW WE DRAW THINGS :DDDDDDD
    context.clearRect(0,0,context.canvas.width, context.canvas.height);
    renderNode(styleTree, context);
  };

})();
