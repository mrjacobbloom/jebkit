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