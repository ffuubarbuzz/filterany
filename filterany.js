(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.FilterAny = factory();
	}
}(this, function () {
	var defaults = {
		debounceTimeout: 0,
		highlightedClass: 'filter-highlighted',
		inputSelector: 'input[type=search]',
		itemContainerSelector: 'ul',
		itemSelector: 'li',
		itemTextSelector: '',
		onSearch: function() {}
	};
	function highlightNode(node, startIndex, length, classList) {
		var highlightedNode = document.createElement('mark');
		highlightedNode.classList.add(classList);
		var highlight = document.createRange();
		var nodes = node.childNodes;
		var index = 0;
		for (var i = 0; i <= nodes.length - 1; i++) {
			var localIndex = startIndex - index;
			if ( localIndex < 0 ) {
				break;
			}
			if ( isTextNode(nodes[i]) && localIndex <= nodes[i].textContent.length - 1) {
				highlight.selectNodeContents(nodes[i]);
				highlight.setStart(nodes[i], localIndex);
				highlight.setEnd(nodes[i], localIndex + length);
				highlight.surroundContents(highlightedNode);
				break;
			}
			index += nodes[i].textContent.length;
		}
	}

	function isTextNode(node) {
		return node.nodeType === 3 && /\S/.test(node.textContent);
	}

	function findTextNode(node) {
		var children = node.childNodes,
			child = null,
			textNode = null;
		for (var i = 0; i < children.length; i++) {
			child = children[i];
			if ( isTextNode(child) ) {
				return child;
			}
			else {
				textNode = findTextNode(child);
				if ( textNode ) {
					return textNode;
				}
			}
		}
		return null;
	}
	function cleanItems(containers) {
		for (var i = containers.length - 1; i >= 0; i--) {
			var container = containers[i];
			cleanNodes(container.nodes);
		}
	}

	function cleanNodes(nodes) {
		for (var i = nodes.length - 1; i >= 0; i--) {
			var node = nodes[i];
			node.style.display = '';
			var previouslyHighlighted = node.querySelectorAll('mark');
			if ( !previouslyHighlighted.length ) {
				continue;
			}
			for (var j = previouslyHighlighted.length - 1; j >= 0; j--) {
				var el = previouslyHighlighted[j];
				el.parentNode.replaceChild(el.childNodes[0], el);	//unwrapping
			}
			node.normalize();	//concat textNodes
		}
	}

	function arrayFromNodeList(nodeList) {
		var result = new Array(nodeList.length);
		for (var i = result.length - 1; i >= 0; i--) {
			result[i] = nodeList[i];
		}
		return result;
	}

	function FilterAny(element, options) {
		if (!element) {
			throw new Error('FilterAny: firts argument expected to be Node');
		}

		if (!(this instanceof FilterAny)) {
			return (new FilterAny(element, options)).init();
		}

		this.element = element;
		this.settings = {};
		for (var prop in defaults) {
			this.settings[prop] = (options && options[prop] !== undefined) ? options[prop] : defaults[prop];
		}
		this.init();
	}

	FilterAny.prototype.onInput = function() {
		var instance = this;
		function handler() {
			instance.search(instance.input.value);
		}
		if (this.settings.debounceTimeout) {
			return function() {
				clearTimeout(this.triggerTimer);
				this.triggerTimer = setTimeout(handler, this.settings.debounceTimeout);
			}
		} else {
			return handler;
		}
	}

	FilterAny.prototype.onReset = function() {
		var instance = this;
		return function(e) {
			instance.search(instance.input.getAttribute('value'));
		}
	}

	FilterAny.prototype.init = function() {
		this.input = this.element.querySelector(this.settings.inputSelector);
		if (!this.input) {
			throw new Error('FilterAny: no input found (refer to option `inputSelector`)');
		}
		this.itemContainerList = this.element.querySelectorAll(this.settings.itemContainerSelector);
		if (!this.itemContainerList) {
			throw new Error('FilterAny: no input found (refer to option `itemContainerSelector`)');
		}
		var itemContainers = arrayFromNodeList(this.itemContainerList);

		this.containers = [];
		var instance = this;
		itemContainers.forEach(function(itemContainer, index){
			var nodeList = itemContainer.querySelectorAll(instance.settings.itemSelector);
			var nodes = arrayFromNodeList(nodeList);

			cleanNodes(nodes);
			var textNodes = nodes.map(function(node){
				return instance.settings.itemTextSelector ? node.querySelector(instance.settings.itemTextSelector) : node;
			});
			var strings = textNodes.map(function(textNode){
				return textNode.textContent;
			});
			instance.containers.push({
				'containerElement': this,
				'strings': strings,
				'nodes': nodes,
				'textNodes': textNodes
			});
		});
		var inputHandler = this.onInput();
		var resetHandler = this.onReset();
		this.input.removeEventListener('input', inputHandler);
		this.input.addEventListener('input', inputHandler);
		var form = this.input.form;
		if ( form ) {
			form.removeEventListener('reset', resetHandler);
			form.addEventListener('reset', resetHandler);
		}

		if (this.input.value) {
			this.search(this.input.value);
		}
	}

	FilterAny.prototype.search = function(query) {
		var itemsFound = [];
		cleanItems(this.containers)
		if ( !query ) {
			this.settings.onSearch.call(null);
			return;
		}

		this.input.value = query;

		for (var i = this.containers.length - 1; i >= 0; i--) {
			var container = this.containers[i];
			var containerElement = container.containerElement;
			var nodes = container.nodes;
			
			// remembering container position in DOM before detaching
			// var containerParent = containerElement.parentNode;
			// var containerIndex = Array.prototype.indexOf.call(containerParent.childNodes, containerElement);
			// if ( containerElement.nextSibling ) {
			// 	var containerNextSibling = containerElement.nextSibling;
			// }
			// containerParent.removeChild(containerElement);

			for (var j = container.strings.length - 1; j >= 0; j--) {
				var node = container.nodes[j];
				var textNode = container.textNodes[j];

				var occurenceIndex = container.strings[j].toLowerCase().indexOf(query.toLowerCase());
				if ( occurenceIndex === -1 ) {
					node.style.display = 'none';
					continue;
				}
				else {
					itemsFound.push(node);
				}

				// highlighting all occurences
				if ( this.settings.highlightedClass ) {
					while (occurenceIndex !== -1) {
						highlightNode(textNode, occurenceIndex, query.length, this.settings.highlightedClass);
						occurenceIndex = container.strings[j].toLowerCase().indexOf(query.toLowerCase(), occurenceIndex + 1);
					}
				}
			}
			//appending container back to it's origin
			// if ( containerNextSibling ) {
			// 	containerParent.insertBefore(containerElement, containerNextSibling);
			// }
			// else {
			// 	containerParent.appendChild(containerElement)
			// }
		}

		this.settings.onSearch.call(itemsFound);
	}

	return FilterAny;
}));