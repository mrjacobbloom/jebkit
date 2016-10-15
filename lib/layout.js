/**
 * Find the dimensions for a block element.
 * @param {StyleNode_} node
 * @param {StyleNode_} parent Parent node to node.
 * @param {?StyleNode_} prevSibling Previous sibling node.
 */
var block = function(node, parent, prevSibling) {
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
  
  if (prevSibling) {
    node.dimensions.y = prevSibling.dimensions.y
        + prevSibling.dimensions.height
        + prevSibling.getProp('margin-bottom')
        + node.getProp('margin-top');
  } else {
    node.dimensions.y = parent.dimensions.y
        + parent.getProp('padding-top')
        + node.getProp('margin-top');
  }
  
  
  var childrenTotalHeight = 0;
  for (let i = 0, child; node.children && (child = node.children[i]); i++) {
    layout(child, node, node.children[i-1]);
    childrenTotalHeight += child.dimensions.height
        + child.getProp('margin-top')
        + child.getProp('margin-bottom');
  }
  
  var minHeight = node.getProp('height') /*|| node.getProp('min-height')*/ || 0;
  if (childrenTotalHeight > minHeight) {
    node.dimensions.height = childrenTotalHeight;
  } else {
    node.dimensions.height = minHeight;
  }

  node.dimensions.height += node.getProp('padding-top')
      + node.getProp('padding-bottom');
}

/**
 * Find the dimensions for a block element.
 * @param {StyleNode_} node
 * @param {StyleNode_} parent Parent node to node.
 * @param {?StyleNode_} prevSibling Previous sibling node.
 */
var inline = function(node, parent, prevSibling) {
  for (let i = 0, child; node.children && (child = node.children[i]); i++) {
    layout(child, node, node.children[i-1]);
  }
}

/**
 * Recursively find the width and height of each node.
 * @param {StyleNode_} node
 * @param {?StyleNode_} parent Parent node to node.
 * @param {?StyleNode_} prevSibling Previous sibling node.
 * @param {?CanvasRenderingContext2D} opt_ctx the canvas context (for width/height).
 */
var layout = function(node, parent, prevSibling, opt_ctx) {
  node.dimensions = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  }
  if (!parent) {
    node.dimensions.x = 0;
    node.dimensions.y = 0;
    node.dimensions.width = opt_ctx.canvas.width;
    
    node.dimensions.height = node.getProp('padding-top')
        + node.getProp('padding-bottom');
    for (let i = 0, child; node.children && (child = node.children[i]); i++) {
      layout(child, node, node.children[i-1]);
      node.dimensions.height += child.dimensions.height
          + child.getProp('margin-top')
          + child.getProp('margin-bottom');
    }
  } else if (node.isBlock) {
    block(node, parent, prevSibling);
  } else {
    inline(node, parent, prevSibling);
  }
}

module.exports = layout;