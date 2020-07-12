(function () {
  var supportedNodeNames = ["html", "div"];

  // Correct: Test: <html><div></div><div id='1' class='asd dsa'><div><div class='zzz'></div></div><div></div></div><div><div id='id'><div><div id='superid'></div></div></div></div></html>
  // Wrong: Test: <html><html><div id='1' class='asd dsa'></div></html></html>
  // Correct: Test: <html><div id='1' class='asd dsa'></div></html>

  var openingTagRegex = /^<([a-z]+)(((\s[a-z]*)=(("[^"]*")|('[^']*')))*)(\/?)>/;
  var closingTagRegex = /^<\/([a-z]+)>/;
  var attributesRegex = /(\s[a-z]*)=(("[^"]*")|('[^']*'))/;

  var treeView = document.getElementById('tree-view');
  var errorElement = document.getElementById('error');
  var htmlInput = document.getElementById("html-input");
  var parseButton = document.getElementById("parse-button");

  // make tree available for both buttons
  var tree;

  parseButton.addEventListener("click", function () {
    var htmlString = htmlInput.value;

    try {
      treeView.innerHTML = '';
      errorElement.innerHTML = '';
      tree = parseHTML(htmlString);
      console.log(tree);
      var treeRoot = drawTree(tree);
      console.log(treeRoot);
      treeView.appendChild(treeRoot);

      var toggler = document.getElementsByClassName("caret");

      for (i = 0; i < toggler.length; i++) {
        toggler[i].addEventListener("click", function(event) {
          this.parentElement.querySelector(".nested").classList.toggle("open");
          this.classList.toggle("caret-down");
        });
      }
    } catch (e) {
      console.error(e.message);
      treeView.innerHTML = '';
      errorElement.innerHTML = e.message;
    }
  });

  var searchButton = document.getElementById("search-button");
  var searchInput = document.getElementById('search-input');
  searchButton.addEventListener("click", function () {
    errorElement.innerHTML = '';

    try {
      var updatedTree = search(tree, searchInput.value);
      var treeRoot = drawTree(tree);
    } catch (e) {
      console.error(e.message);
      errorElement.innerHTML = e.message;
    }
  });


  function parseHTML(htmlString) {
    var nodeNamesMap = supportedNodeNames.reduce((acc, cur) => (acc[cur] = true, acc), {});
    var tempHtmlString = htmlString;
    var stack = new Stack();
    var tree = new Tree();

    var matchResult;
    while (tempHtmlString.length > 0) {
      if (matchResult = tempHtmlString.match(openingTagRegex)) {
        var tag = matchResult[1];

        if (!nodeNamesMap[tag]) {
          if (tag === 'html') {
            throw new Error('html could only be top level tag')
          }
          throw new Error('Found unsupported tag ', tag);
        }

        var attributes = matchResult[2];
        var attrMap = {
          class: [],
          id: ''
        };

        // parse attributes
        if (attributes.length > 0) {
          while (attributes.length > 0) {
            var attributeMatch = attributes.match(attributesRegex);
            var attributeName = attributeMatch[1].trim();
            // remove quotes
            var attributeValue = attributeMatch[2].slice(1, -1);

            if (attributeName === 'class') {
              // multiple values possible
              attributeValue = attributeValue.split(' ');
            }

            attrMap[attributeName] = attributeValue

            attributes = attributes.slice(attributeMatch[0].length);
          }
        }

        var node = new Node({ tag: tag, class: attrMap.class, id: attrMap.id });

        if (htmlString === tempHtmlString) {
          nodeNamesMap.html = false;
          tree.addHead(node);
        }

        if (!stack.isEmpty()) {
          stack.peek().appendChild(node);
        }
        stack.push(node);

      } else if (matchResult = tempHtmlString.match(closingTagRegex)) {
        var tag = matchResult[1];

        if (stack.isEmpty() || tag !== stack.peek().tag) {
          throw new Error('Found unpaired closing tag ' + matchResult[0]);
        } else {
          stack.pop();
        }
      } else {
        throw new Error('Can not parse input string! Invalid syntax');
      }

      tempHtmlString = tempHtmlString.slice(matchResult[0].length);
    }

    return tree;
  }

  function drawTree(tree) {
    var treeHead = tree.getHead();

    var list = document.createElement('ul');
    list.setAttribute('id', 'head');
    var headElement = document.createElement('li');
    list.appendChild(headElement);

    function buildChildNodes(parentNode, parentElement) {
      var children = parentNode.getChildren();

      if (children.length > 0) {
        var caret = document.createElement('span');
        caret.setAttribute('class', 'caret');
        caret.innerHTML = parentNode;

        var nestedTree = document.createElement('ul');
        nestedTree.setAttribute('class', 'nested');

        var li = document.createElement('li');
        li.appendChild(caret);
        li.appendChild(nestedTree);

        parentElement.appendChild(li);

        for (var i = 0; i < children.length; i++) {
          buildChildNodes(children[i], nestedTree);
        }
      } else {
        var li = document.createElement('li');
        li.innerHTML = parentNode;
        parentElement.appendChild(li);
      }
    }

    buildChildNodes(treeHead, headElement)

    return list;
  }


  function search(searchString) {
    if (!searchString) {
      searchString = '';
    }
    var searchTag = searchString.match(/^([a-z]+)/);
    // returns matches with leading `.`
    var searchClass = searchString.match(/\.([a-z]+)/g);
    var searchId = searchString.match(/#([a-z]+)/);

    // dfs
  }

  /** util classes
   *
   */

  // Node
  function Node(nodeData) {
    this.tag = nodeData.tag;
    this.classList = nodeData.class;
    this.id = nodeData.id;
    this.children = [];
  }

  Node.prototype.appendChild = function (child) {
    this.children.push(child);
  };

  Node.prototype.getChildren = function () {
    return this.children;
  }

  Node.prototype.getClassList = function () {
    return this.classList;
  }

  Node.prototype.getId = function () {
    return this.id;
  }

  Node.prototype.getTag = function () {
    return this.tag;
  }

  Node.prototype.toString = function () {
    return this.tag + (this.id ? '#' + this.id : '') + (this.classList.length > 0 ? '.' + this.classList.join('.') : '')
  }

  // +
  // marked: boolean
  function SearchNode(nodeData) {
    Node.call(this, {tag: nodeData.tag, class: nodeData.class, id: nodeData.id});

    this.marked = nodeData.marked;
  }

  SearchNode.prototype = Object.create(Node.prototype);

  // Tree
  function Tree() {
    this.head = undefined;
  }

  Tree.prototype.getHead = function () {
    return this.head;
  }

  Tree.prototype.addHead = function (node) {
    if (this.head) {
      node.appendChild(this.head);
    }

    this.head = node;
  };

  // Stack
  function Stack() {
    this.data = [];
    this.size = 0;
  }

  Stack.prototype.push = function (item) {
    this.data[this.size] = item;
    this.size = this.size + 1;
  };

  Stack.prototype.pop = function (item) {
    if (!this.isEmpty()) {
      this.size = this.size - 1;
      return this.data.pop();
    }

    return null;
  };

  Stack.prototype.peek = function (item) {
    if (!this.isEmpty()) {
      return this.data[this.size - 1];
    }

    return null;
  };

  Stack.prototype.isEmpty = function () {
    return this.size === 0;
  };

  // Queue
  function Queue() {
    this.data = [];
  }

  Queue.prototype.dequeue = function () {
    return this.data.shift();
  }

  Queue.prototype.enqueue = function (item) {
    return this.data.push(item);
  }

  Queue.prototype.peek = function () {
    return this.data[0];
  }
})();