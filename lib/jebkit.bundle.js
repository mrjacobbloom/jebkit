/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module) {/**********
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
	  
	  var cssom = __webpack_require__(2);
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
	    __webpack_require__(4)(styleTree);
	    computeDimensions(styleTree, null, null, true, context);
	    console.log(styleTree);
	    
	    // NOW WE DRAW THINGS :DDDDDDD
	    context.clearRect(0,0,context.canvas.width, context.canvas.height);
	    renderNode(styleTree, context);
	  };

	})();

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)(module)))

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * half of this project is basically a poorly-written shim for getComputedStyle & CSSOM.
	 * P.S. never let me write a parser or I'll RegExp all over you.
	 */

	/**
	 * Constructor for a CSS rule using the worst possible parsing methods.
	 * TODO: never let me write a parser.
	 * @param {String} instring The rule as a string to be parsed.
	 * @param {Boolean} attr Whether the rule is in a style attribute.
	 * @param {Number} index Index of the rule in stylesheets.
	 */
	var CSSRule_ = function(instring, attr, index) {
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
	};

	/**
	 * Split the stylesheet from a string into an array of rules (also strings).
	 * @param {String} stylesheet
	 * @return {Array.String}
	 * @private
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
	 * Return an array representing the selector's specificity.
	 * @param {?String} selector The selector to be parsed (null if in style attr).
	 * @param {Number} index The index of the rule (null if in style attr).
	 * @return {Array} [includedByAt, !important, attr, id, class, tagname, ruleIndex, propIndex]
	 * @private
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
	 * Extract the rules from the stylesheets in the document and return them in
	 * an array.
	 * @param {Document} doc The document to scrape.
	 */
	var getStylesheetRules = function(doc) {
	  var allRules = [];
	  
	  // I added webpack exclusively so I wouldn't have to load these async-ly,
	  // using xhr would mean like so many nested callbacks. I need structure.
	  // also this is the same in Node and browser so yay.
	  var text = __webpack_require__(3);
	  var rules = splitStyleSheet(text);
	  for (let j = 0, rule; rule = rules[j]; j++) {
	    allRules.push(new CSSRule_(rule, false, allRules.length));
	  }
	  
	  
	  // now everything else on the page.
	  if (doc.styleSheets && doc.styleSheets.length > 0) {
	    for (let i = 0, stylesheet; stylesheet = doc.styleSheets[i]; i++) {
	      for (let j = 0, rule; rule = stylesheet.cssRules[j]; j++) {
	        allRules.push(new CSSRule_(rule.cssText, false, allRules.length));
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
	        allRules.push(new CSSRule_(rule, false, allRules.length));
	      }
	    }
	  }
	  return allRules;
	};

	module.exports = {
	  CSSRule_: CSSRule_,
	  getStylesheetRules: getStylesheetRules
	};


/***/ },
/* 3 */
/***/ function(module, exports) {

	// Ideally, we would use
	// https://html.spec.whatwg.org/multipage/rendering.html#the-css-user-agent-style-sheet-and-presentational-hints
	// but for now, just use the version from blink. This file is copied from
	// https://chromium.googlesource.com/chromium/blink/+/96aa3a280ab7d67178c8f122a04949ce5f8579e0/Source/core/css/html.css
	// (removed a line which had octal literals inside since octal literals are not allowed in template strings)

	// We use a .js file because otherwise we can't browserify this. (brfs is unusable due to lack of ES2015 support)

	module.exports = `
	/*
	 * The default style sheet used to render HTML.
	 *
	 * Copyright (C) 2000 Lars Knoll (knoll@kde.org)
	 * Copyright (C) 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011 Apple Inc. All rights reserved.
	 *
	 * This library is free software; you can redistribute it and/or
	 * modify it under the terms of the GNU Library General Public
	 * License as published by the Free Software Foundation; either
	 * version 2 of the License, or (at your option) any later version.
	 *
	 * This library is distributed in the hope that it will be useful,
	 * but WITHOUT ANY WARRANTY; without even the implied warranty of
	 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
	 * Library General Public License for more details.
	 *
	 * You should have received a copy of the GNU Library General Public License
	 * along with this library; see the file COPYING.LIB.  If not, write to
	 * the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,
	 * Boston, MA 02110-1301, USA.
	 *
	 */

	@namespace "http://www.w3.org/1999/xhtml";

	html {
	    display: block
	}

	:root {
	    scroll-blocks-on: start-touch wheel-event
	}

	/* children of the <head> element all have display:none */
	head {
	    display: none
	}

	meta {
	    display: none
	}

	title {
	    display: none
	}

	link {
	    display: none
	}

	style {
	    display: none
	}

	script {
	    display: none
	}

	/* generic block-level elements */

	body {
	    display: block;
	    margin: 8px
	}

	body:-webkit-full-page-media {
	    background-color: rgb(0, 0, 0)
	}

	p {
	    display: block;
	    -webkit-margin-before: 1__qem;
	    -webkit-margin-after: 1__qem;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	}

	div {
	    display: block
	}

	layer {
	    display: block
	}

	article, aside, footer, header, hgroup, main, nav, section {
	    display: block
	}

	marquee {
	    display: inline-block;
	}

	address {
	    display: block
	}

	blockquote {
	    display: block;
	    -webkit-margin-before: 1__qem;
	    -webkit-margin-after: 1em;
	    -webkit-margin-start: 40px;
	    -webkit-margin-end: 40px;
	}

	figcaption {
	    display: block
	}

	figure {
	    display: block;
	    -webkit-margin-before: 1em;
	    -webkit-margin-after: 1em;
	    -webkit-margin-start: 40px;
	    -webkit-margin-end: 40px;
	}

	q {
	    display: inline
	}

	q:before {
	    content: open-quote;
	}

	q:after {
	    content: close-quote;
	}

	center {
	    display: block;
	    /* special centering to be able to emulate the html4/netscape behaviour */
	    text-align: -webkit-center
	}

	hr {
	    display: block;
	    -webkit-margin-before: 0.5em;
	    -webkit-margin-after: 0.5em;
	    -webkit-margin-start: auto;
	    -webkit-margin-end: auto;
	    border-style: inset;
	    border-width: 1px;
	    box-sizing: border-box
	}

	map {
	    display: inline
	}

	video {
	    object-fit: contain;
	}

	/* heading elements */

	h1 {
	    display: block;
	    font-size: 2em;
	    -webkit-margin-before: 0.67__qem;
	    -webkit-margin-after: 0.67em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	    font-weight: bold
	}

	:-webkit-any(article,aside,nav,section) h1 {
	    font-size: 1.5em;
	    -webkit-margin-before: 0.83__qem;
	    -webkit-margin-after: 0.83em;
	}

	:-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) h1 {
	    font-size: 1.17em;
	    -webkit-margin-before: 1__qem;
	    -webkit-margin-after: 1em;
	}

	:-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) h1 {
	    font-size: 1.00em;
	    -webkit-margin-before: 1.33__qem;
	    -webkit-margin-after: 1.33em;
	}

	:-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) h1 {
	    font-size: .83em;
	    -webkit-margin-before: 1.67__qem;
	    -webkit-margin-after: 1.67em;
	}

	:-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) h1 {
	    font-size: .67em;
	    -webkit-margin-before: 2.33__qem;
	    -webkit-margin-after: 2.33em;
	}

	h2 {
	    display: block;
	    font-size: 1.5em;
	    -webkit-margin-before: 0.83__qem;
	    -webkit-margin-after: 0.83em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	    font-weight: bold
	}

	h3 {
	    display: block;
	    font-size: 1.17em;
	    -webkit-margin-before: 1__qem;
	    -webkit-margin-after: 1em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	    font-weight: bold
	}

	h4 {
	    display: block;
	    -webkit-margin-before: 1.33__qem;
	    -webkit-margin-after: 1.33em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	    font-weight: bold
	}

	h5 {
	    display: block;
	    font-size: .83em;
	    -webkit-margin-before: 1.67__qem;
	    -webkit-margin-after: 1.67em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	    font-weight: bold
	}

	h6 {
	    display: block;
	    font-size: .67em;
	    -webkit-margin-before: 2.33__qem;
	    -webkit-margin-after: 2.33em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	    font-weight: bold
	}

	/* tables */

	table {
	    display: table;
	    border-collapse: separate;
	    border-spacing: 2px;
	    border-color: gray
	}

	thead {
	    display: table-header-group;
	    vertical-align: middle;
	    border-color: inherit
	}

	tbody {
	    display: table-row-group;
	    vertical-align: middle;
	    border-color: inherit
	}

	tfoot {
	    display: table-footer-group;
	    vertical-align: middle;
	    border-color: inherit
	}

	/* for tables without table section elements (can happen with XHTML or dynamically created tables) */
	table > tr {
	    vertical-align: middle;
	}

	col {
	    display: table-column
	}

	colgroup {
	    display: table-column-group
	}

	tr {
	    display: table-row;
	    vertical-align: inherit;
	    border-color: inherit
	}

	td, th {
	    display: table-cell;
	    vertical-align: inherit
	}

	th {
	    font-weight: bold
	}

	caption {
	    display: table-caption;
	    text-align: -webkit-center
	}

	/* lists */

	ul, menu, dir {
	    display: block;
	    list-style-type: disc;
	    -webkit-margin-before: 1__qem;
	    -webkit-margin-after: 1em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	    -webkit-padding-start: 40px
	}

	ol {
	    display: block;
	    list-style-type: decimal;
	    -webkit-margin-before: 1__qem;
	    -webkit-margin-after: 1em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	    -webkit-padding-start: 40px
	}

	li {
	    display: list-item;
	    text-align: -webkit-match-parent;
	}

	ul ul, ol ul {
	    list-style-type: circle
	}

	ol ol ul, ol ul ul, ul ol ul, ul ul ul {
	    list-style-type: square
	}

	dd {
	    display: block;
	    -webkit-margin-start: 40px
	}

	dl {
	    display: block;
	    -webkit-margin-before: 1__qem;
	    -webkit-margin-after: 1em;
	    -webkit-margin-start: 0;
	    -webkit-margin-end: 0;
	}

	dt {
	    display: block
	}

	ol ul, ul ol, ul ul, ol ol {
	    -webkit-margin-before: 0;
	    -webkit-margin-after: 0
	}

	/* form elements */

	form {
	    display: block;
	    margin-top: 0__qem;
	}

	label {
	    cursor: default;
	}

	legend {
	    display: block;
	    -webkit-padding-start: 2px;
	    -webkit-padding-end: 2px;
	    border: none
	}

	fieldset {
	    display: block;
	    -webkit-margin-start: 2px;
	    -webkit-margin-end: 2px;
	    -webkit-padding-before: 0.35em;
	    -webkit-padding-start: 0.75em;
	    -webkit-padding-end: 0.75em;
	    -webkit-padding-after: 0.625em;
	    border: 2px groove ThreeDFace;
	    min-width: -webkit-min-content;
	}

	button {
	    -webkit-appearance: button;
	}

	/* Form controls don't go vertical. */
	input, textarea, keygen, select, button, meter, progress {
	    -webkit-writing-mode: horizontal-tb !important;
	}

	input, textarea, keygen, select, button {
	    margin: 0__qem;
	    font: -webkit-small-control;
	    text-rendering: auto; /* FIXME: Remove when tabs work with optimizeLegibility. */
	    color: initial;
	    letter-spacing: normal;
	    word-spacing: normal;
	    line-height: normal;
	    text-transform: none;
	    text-indent: 0;
	    text-shadow: none;
	    display: inline-block;
	    text-align: start;
	}

	input[type="hidden" i] {
	    display: none
	}

	input {
	    -webkit-appearance: textfield;
	    padding: 1px;
	    background-color: white;
	    border: 2px inset;
	    -webkit-rtl-ordering: logical;
	    -webkit-user-select: text;
	    cursor: auto;
	}

	input[type="search" i] {
	    -webkit-appearance: searchfield;
	    box-sizing: border-box;
	}

	input::-webkit-textfield-decoration-container {
	    display: flex;
	    align-items: center;
	    -webkit-user-modify: read-only !important;
	    content: none !important;
	}

	input[type="search" i]::-webkit-textfield-decoration-container {
	    direction: ltr;
	}

	input::-webkit-clear-button {
	    -webkit-appearance: searchfield-cancel-button;
	    display: inline-block;
	    flex: none;
	    -webkit-user-modify: read-only !important;
	    -webkit-margin-start: 2px;
	    opacity: 0;
	    pointer-events: none;
	}

	input:enabled:read-write:-webkit-any(:focus,:hover)::-webkit-clear-button {
	    opacity: 1;
	    pointer-events: auto;
	}

	input[type="search" i]::-webkit-search-cancel-button {
	    -webkit-appearance: searchfield-cancel-button;
	    display: block;
	    flex: none;
	    -webkit-user-modify: read-only !important;
	    -webkit-margin-start: 1px;
	    opacity: 0;
	    pointer-events: none;
	}

	input[type="search" i]:enabled:read-write:-webkit-any(:focus,:hover)::-webkit-search-cancel-button {
	    opacity: 1;
	    pointer-events: auto;
	}

	input[type="search" i]::-webkit-search-decoration {
	    -webkit-appearance: searchfield-decoration;
	    display: block;
	    flex: none;
	    -webkit-user-modify: read-only !important;
	    -webkit-align-self: flex-start;
	    margin: auto 0;
	}

	input[type="search" i]::-webkit-search-results-decoration {
	    -webkit-appearance: searchfield-results-decoration;
	    display: block;
	    flex: none;
	    -webkit-user-modify: read-only !important;
	    -webkit-align-self: flex-start;
	    margin: auto 0;
	}

	input::-webkit-inner-spin-button {
	    -webkit-appearance: inner-spin-button;
	    display: inline-block;
	    cursor: default;
	    flex: none;
	    align-self: stretch;
	    -webkit-user-select: none;
	    -webkit-user-modify: read-only !important;
	    opacity: 0;
	    pointer-events: none;
	}

	input:enabled:read-write:-webkit-any(:focus,:hover)::-webkit-inner-spin-button {
	    opacity: 1;
	    pointer-events: auto;
	}

	keygen, select {
	    border-radius: 5px;
	}

	keygen::-webkit-keygen-select {
	    margin: 0px;
	}

	textarea {
	    -webkit-appearance: textarea;
	    background-color: white;
	    border: 1px solid;
	    -webkit-rtl-ordering: logical;
	    -webkit-user-select: text;
	    flex-direction: column;
	    resize: auto;
	    cursor: auto;
	    padding: 2px;
	    white-space: pre-wrap;
	    word-wrap: break-word;
	}

	::-webkit-input-placeholder {
	    -webkit-text-security: none;
	    color: darkGray;
	    display: block !important;
	    pointer-events: none !important;
	}

	input::-webkit-input-placeholder {
	    white-space: pre;
	    word-wrap: normal;
	    overflow: hidden;
	    -webkit-user-modify: read-only !important;
	}

	input[type="password" i] {
	    -webkit-text-security: disc !important;
	}

	input[type="hidden" i], input[type="image" i], input[type="file" i] {
	    -webkit-appearance: initial;
	    padding: initial;
	    background-color: initial;
	    border: initial;
	}

	input[type="file" i] {
	    align-items: baseline;
	    color: inherit;
	    text-align: start !important;
	}

	input:-webkit-autofill, textarea:-webkit-autofill, select:-webkit-autofill {
	    background-color: #FAFFBD !important;
	    background-image:none !important;
	    color: #000000 !important;
	}

	input[type="radio" i], input[type="checkbox" i] {
	    margin: 3px 0.5ex;
	    padding: initial;
	    background-color: initial;
	    border: initial;
	}

	input[type="button" i], input[type="submit" i], input[type="reset" i] {
	    -webkit-appearance: push-button;
	    -webkit-user-select: none;
	    white-space: pre
	}

	input[type="file" i]::-webkit-file-upload-button {
	    -webkit-appearance: push-button;
	    -webkit-user-modify: read-only !important;
	    white-space: nowrap;
	    margin: 0;
	    font-size: inherit;
	}

	input[type="button" i], input[type="submit" i], input[type="reset" i], input[type="file" i]::-webkit-file-upload-button, button {
	    align-items: flex-start;
	    text-align: center;
	    cursor: default;
	    color: ButtonText;
	    padding: 2px 6px 3px 6px;
	    border: 2px outset ButtonFace;
	    background-color: ButtonFace;
	    box-sizing: border-box
	}

	input[type="range" i] {
	    -webkit-appearance: slider-horizontal;
	    padding: initial;
	    border: initial;
	    margin: 2px;
	    color: #909090;
	}

	input[type="range" i]::-webkit-slider-container, input[type="range" i]::-webkit-media-slider-container {
	    flex: 1;
	    min-width: 0;
	    box-sizing: border-box;
	    -webkit-user-modify: read-only !important;
	    display: flex;
	}

	input[type="range" i]::-webkit-slider-runnable-track {
	    flex: 1;
	    min-width: 0;
	    -webkit-align-self: center;

	    box-sizing: border-box;
	    -webkit-user-modify: read-only !important;
	    display: block;
	}

	input[type="range" i]::-webkit-slider-thumb, input[type="range" i]::-webkit-media-slider-thumb {
	    -webkit-appearance: sliderthumb-horizontal;
	    box-sizing: border-box;
	    -webkit-user-modify: read-only !important;
	    display: block;
	}

	input[type="button" i]:disabled, input[type="submit" i]:disabled, input[type="reset" i]:disabled,
	input[type="file" i]:disabled::-webkit-file-upload-button, button:disabled,
	select:disabled, keygen:disabled, optgroup:disabled, option:disabled,
	select[disabled]>option {
	    color: GrayText
	}

	input[type="button" i]:active, input[type="submit" i]:active, input[type="reset" i]:active, input[type="file" i]:active::-webkit-file-upload-button, button:active {
	    border-style: inset
	}

	input[type="button" i]:active:disabled, input[type="submit" i]:active:disabled, input[type="reset" i]:active:disabled, input[type="file" i]:active:disabled::-webkit-file-upload-button, button:active:disabled {
	    border-style: outset
	}

	option:-internal-spatial-navigation-focus {
	    outline: black dashed 1px;
	    outline-offset: -1px;
	}

	datalist {
	    display: none
	}

	area {
	    display: inline;
	    cursor: pointer;
	}

	param {
	    display: none
	}

	input[type="checkbox" i] {
	    -webkit-appearance: checkbox;
	    box-sizing: border-box;
	}

	input[type="radio" i] {
	    -webkit-appearance: radio;
	    box-sizing: border-box;
	}

	input[type="color" i] {
	    -webkit-appearance: square-button;
	    width: 44px;
	    height: 23px;
	    background-color: ButtonFace;
	    /* Same as native_theme_base. */
	    border: 1px #a9a9a9 solid;
	    padding: 1px 2px;
	}

	input[type="color" i]::-webkit-color-swatch-wrapper {
	    display:flex;
	    padding: 4px 2px;
	    box-sizing: border-box;
	    -webkit-user-modify: read-only !important;
	    width: 100%;
	    height: 100%
	}

	input[type="color" i]::-webkit-color-swatch {
	    background-color: #000000;
	    border: 1px solid #777777;
	    flex: 1;
	    min-width: 0;
	    -webkit-user-modify: read-only !important;
	}

	input[type="color" i][list] {
	    -webkit-appearance: menulist;
	    width: 88px;
	    height: 23px
	}

	input[type="color" i][list]::-webkit-color-swatch-wrapper {
	    padding-left: 8px;
	    padding-right: 24px;
	}

	input[type="color" i][list]::-webkit-color-swatch {
	    border-color: #000000;
	}

	input::-webkit-calendar-picker-indicator {
	    display: inline-block;
	    width: 0.66em;
	    height: 0.66em;
	    padding: 0.17em 0.34em;
	    -webkit-user-modify: read-only !important;
	    opacity: 0;
	    pointer-events: none;
	}

	input::-webkit-calendar-picker-indicator:hover {
	    background-color: #eee;
	}

	input:enabled:read-write:-webkit-any(:focus,:hover)::-webkit-calendar-picker-indicator,
	input::-webkit-calendar-picker-indicator:focus {
	    opacity: 1;
	    pointer-events: auto;
	}

	input[type="date" i]:disabled::-webkit-clear-button,
	input[type="date" i]:disabled::-webkit-inner-spin-button,
	input[type="datetime-local" i]:disabled::-webkit-clear-button,
	input[type="datetime-local" i]:disabled::-webkit-inner-spin-button,
	input[type="month" i]:disabled::-webkit-clear-button,
	input[type="month" i]:disabled::-webkit-inner-spin-button,
	input[type="week" i]:disabled::-webkit-clear-button,
	input[type="week" i]:disabled::-webkit-inner-spin-button,
	input:disabled::-webkit-calendar-picker-indicator,
	input[type="date" i][readonly]::-webkit-clear-button,
	input[type="date" i][readonly]::-webkit-inner-spin-button,
	input[type="datetime-local" i][readonly]::-webkit-clear-button,
	input[type="datetime-local" i][readonly]::-webkit-inner-spin-button,
	input[type="month" i][readonly]::-webkit-clear-button,
	input[type="month" i][readonly]::-webkit-inner-spin-button,
	input[type="week" i][readonly]::-webkit-clear-button,
	input[type="week" i][readonly]::-webkit-inner-spin-button,
	input[readonly]::-webkit-calendar-picker-indicator {
	    visibility: hidden;
	}

	select {
	    -webkit-appearance: menulist;
	    box-sizing: border-box;
	    align-items: center;
	    border: 1px solid;
	    white-space: pre;
	    -webkit-rtl-ordering: logical;
	    color: black;
	    background-color: white;
	    cursor: default;
	}

	select:not(:-internal-list-box) {
	    overflow: visible !important;
	}

	select:-internal-list-box {
	    -webkit-appearance: listbox;
	    align-items: flex-start;
	    border: 1px inset gray;
	    border-radius: initial;
	    overflow-x: hidden;
	    overflow-y: scroll;
	    vertical-align: text-bottom;
	    -webkit-user-select: none;
	    white-space: nowrap;
	}

	optgroup {
	    font-weight: bolder;
	    display: block;
	}

	option {
	    font-weight: normal;
	    display: block;
	    padding: 0 2px 1px 2px;
	    white-space: pre;
	    min-height: 1.2em;
	}

	select:-internal-list-box option,
	select:-internal-list-box optgroup {
	    line-height: initial !important;
	}

	select:-internal-list-box:focus option:checked {
	    background-color: -internal-active-list-box-selection !important;
	    color: -internal-active-list-box-selection-text !important;
	}

	select:-internal-list-box option:checked {
	    background-color: -internal-inactive-list-box-selection !important;
	    color: -internal-inactive-list-box-selection-text !important;
	}

	select:-internal-list-box:disabled option:checked,
	select:-internal-list-box option:checked:disabled {
	    color: gray !important;
	}

	select:-internal-list-box hr {
	    border-style: none;
	}

	output {
	    display: inline;
	}

	/* meter */

	meter {
	    -webkit-appearance: meter;
	    box-sizing: border-box;
	    display: inline-block;
	    height: 1em;
	    width: 5em;
	    vertical-align: -0.2em;
	}

	meter::-webkit-meter-inner-element {
	    -webkit-appearance: inherit;
	    box-sizing: inherit;
	    -webkit-user-modify: read-only !important;
	    height: 100%;
	    width: 100%;
	}

	meter::-webkit-meter-bar {
	    background: linear-gradient(to bottom, #ddd, #eee 20%, #ccc 45%, #ccc 55%, #ddd);
	    height: 100%;
	    width: 100%;
	    -webkit-user-modify: read-only !important;
	    box-sizing: border-box;
	}

	meter::-webkit-meter-optimum-value {
	    background: linear-gradient(to bottom, #ad7, #cea 20%, #7a3 45%, #7a3 55%, #ad7);
	    height: 100%;
	    -webkit-user-modify: read-only !important;
	    box-sizing: border-box;
	}

	meter::-webkit-meter-suboptimum-value {
	    background: linear-gradient(to bottom, #fe7, #ffc 20%, #db3 45%, #db3 55%, #fe7);
	    height: 100%;
	    -webkit-user-modify: read-only !important;
	    box-sizing: border-box;
	}

	meter::-webkit-meter-even-less-good-value {
	    background: linear-gradient(to bottom, #f77, #fcc 20%, #d44 45%, #d44 55%, #f77);
	    height: 100%;
	    -webkit-user-modify: read-only !important;
	    box-sizing: border-box;
	}

	/* progress */

	progress {
	    -webkit-appearance: progress-bar;
	    box-sizing: border-box;
	    display: inline-block;
	    height: 1em;
	    width: 10em;
	    vertical-align: -0.2em;
	}

	progress::-webkit-progress-inner-element {
	    -webkit-appearance: inherit;
	    box-sizing: inherit;
	    -webkit-user-modify: read-only;
	    height: 100%;
	    width: 100%;
	}

	progress::-webkit-progress-bar {
	    background-color: gray;
	    height: 100%;
	    width: 100%;
	    -webkit-user-modify: read-only !important;
	    box-sizing: border-box;
	}

	progress::-webkit-progress-value {
	    background-color: green;
	    height: 100%;
	    width: 50%; /* should be removed later */
	    -webkit-user-modify: read-only !important;
	    box-sizing: border-box;
	}

	/* inline elements */

	u, ins {
	    text-decoration: underline
	}

	strong, b {
	    font-weight: bold
	}

	i, cite, em, var, address, dfn {
	    font-style: italic
	}

	tt, code, kbd, samp {
	    font-family: monospace
	}

	pre, xmp, plaintext, listing {
	    display: block;
	    font-family: monospace;
	    white-space: pre;
	    margin: 1__qem 0
	}

	mark {
	    background-color: yellow;
	    color: black
	}

	big {
	    font-size: larger
	}

	small {
	    font-size: smaller
	}

	s, strike, del {
	    text-decoration: line-through
	}

	sub {
	    vertical-align: sub;
	    font-size: smaller
	}

	sup {
	    vertical-align: super;
	    font-size: smaller
	}

	nobr {
	    white-space: nowrap
	}

	/* states */

	:focus {
	    outline: auto 5px -webkit-focus-ring-color
	}

	/* Read-only text fields do not show a focus ring but do still receive focus */
	html:focus, body:focus, input[readonly]:focus {
	    outline: none
	}

	applet:focus, embed:focus, iframe:focus, object:focus {
	    outline: none
	}

	input:focus, textarea:focus, keygen:focus, select:focus {
	    outline-offset: -2px
	}

	input[type="button" i]:focus,
	input[type="checkbox" i]:focus,
	input[type="file" i]:focus,
	input[type="hidden" i]:focus,
	input[type="image" i]:focus,
	input[type="radio" i]:focus,
	input[type="reset" i]:focus,
	input[type="search" i]:focus,
	input[type="submit" i]:focus,
	input[type="file" i]:focus::-webkit-file-upload-button {
	    outline-offset: 0
	}

	a:-webkit-any-link {
	    color: -webkit-link;
	    text-decoration: underline;
	    cursor: auto;
	}

	a:-webkit-any-link:active {
	    color: -webkit-activelink
	}

	/* HTML5 ruby elements */

	ruby, rt {
	    text-indent: 0; /* blocks used for ruby rendering should not trigger this */
	}

	rt {
	    line-height: normal;
	    -webkit-text-emphasis: none;
	}

	ruby > rt {
	    display: block;
	    font-size: 50%;
	    text-align: start;
	}

	ruby > rp {
	    display: none;
	}

	/* other elements */

	noframes {
	    display: none
	}

	frameset, frame {
	    display: block
	}

	frameset {
	    border-color: inherit
	}

	iframe {
	    border: 2px inset
	}

	details {
	    display: block
	}

	summary {
	    display: block
	}

	summary::-webkit-details-marker {
	    display: inline-block;
	    width: 0.66em;
	    height: 0.66em;
	    -webkit-margin-end: 0.4em;
	}

	template {
	    display: none
	}

	bdi, output {
	    unicode-bidi: -webkit-isolate;
	}

	bdo {
	    unicode-bidi: bidi-override;
	}

	textarea[dir=auto i] {
	    unicode-bidi: -webkit-plaintext;
	}

	dialog:not([open]) {
	    display: none
	}

	dialog {
	    position: absolute;
	    left: 0;
	    right: 0;
	    width: -webkit-fit-content;
	    height: -webkit-fit-content;
	    margin: auto;
	    border: solid;
	    padding: 1em;
	    background: white;
	    color: black
	}

	dialog::backdrop {
	    position: fixed;
	    top: 0;
	    right: 0;
	    bottom: 0;
	    left: 0;
	    background: rgba(0,0,0,0.1)
	}

	/* page */

	@page {
	    /* FIXME: Define the right default values for page properties. */
	    size: auto;
	    margin: auto;
	    padding: 0px;
	    border-width: 0px;
	}

	/* noscript is handled internally, as it depends on settings. */

	`;


/***/ },
/* 4 */
/***/ function(module, exports) {

	/**
	 * Recursively resolve shorthand properties.
	 * @param {StyleNode_} node
	 */
	module.exports = function(node) {
	  if(node.children) {
	    for(let i = 0, child; child = node.children[i]; i++) {
	      module.exports(child);
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

/***/ }
/******/ ]);