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
  var text = require('./default-stylesheet.js');
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
