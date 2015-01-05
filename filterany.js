(function( $ ) {
	$.fn.filterAny = function( options ) {
		
		return this.each(function() {
			var settings = $.extend({
				debounceTimeout: 200,
				highlightedClass: 'filter-highlighted',
				inputSelector: 'input[type=search]',
				itemsContainerSelector: 'ul',
				itemSelector: 'li',
				itemTextSelector: '',
				onSearch: function() {}
			}, options );

			var $this = $(this);
			var $input = $this.find(settings.inputSelector);
			if ( !$input.length ) {
				console.error('filterAny: No input found');
				return;
			}

			var $itemContainers = $this.find(settings.itemsContainerSelector);
			if ( !$itemContainers.length ) {
				console.error('filterAny: No item container found');
				return;
			}

			var containers = [];
			
			$itemContainers.each(function(index, value){
				var $nodes = $(value).find(settings.itemSelector, display);
				var display = $nodes.length > 0 ? $nodes[0].style.display : 'block';
				if ( display === 'none' ) {
					display = 'block'
				}
				cleanNodes($nodes.toArray());
				var textNodes = $nodes.map(function(){
					return settings.itemTextSelector ? this.querySelector(settings.itemTextSelector) : this;
				});
				var strings = textNodes.map(function(){
					return this.textContent;
				});
				containers.push({
					'containerElement': this,
					'strings': strings,
					'nodes': $nodes,
					'textNodes': textNodes,
					'display': display
				});
			});

			var triggerTimer;

			$input.off('input.fa change.fa').on('input.fa change.fa', function(){
				clearTimeout(triggerTimer);
				triggerTimer = setTimeout(search, settings.debounceTimeout);
			}).each(function(){
				$(this.form).off('reset.fa').on('reset.fa', function(){
					// If there are multiple filterAny instances in one form,
					// this handler will only be called for the last one.
					cleanItems()
				});
			});

			if ($input.val()) {
				search();
			}

			function search() {
				var query = $input.val();
				var itemsFound = [];
				cleanItems()
				if ( !query ) {
					settings.onSearch.call(this, $(''));
					return;
				}

				for (var i = containers.length - 1; i >= 0; i--) {
					var container = containers[i];
					var containerElement = container.containerElement;
					var $nodes = $(container.nodes);
					
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
						if ( settings.highlightedClass ) {
							while (occurenceIndex != -1) {
								highlightNode(textNode, occurenceIndex, query.length);
								occurenceIndex = container.strings[j].toLowerCase().indexOf(query.toLowerCase(), occurenceIndex + 1);
							}
						}
					};
					//appending container back to it's origin
					// if ( containerNextSibling ) {
					// 	containerParent.insertBefore(containerElement, containerNextSibling);
					// }
					// else {
					// 	containerParent.appendChild(containerElement)
					// }
				};

				settings.onSearch.call(this, $(itemsFound));
			}

			function cleanItems() {
				for (var i = containers.length - 1; i >= 0; i--) {
					var container = containers[i];
					cleanNodes(container.nodes, container.display);
				};
			}

			function cleanNodes(nodes, display, callback) {
				for (var i = nodes.length - 1; i >= 0; i--) {
					var node = nodes[i];
					node.style.display = display;
					var previouslyHighlighted = node.querySelectorAll('.' + settings.highlightedClass);
					if ( !previouslyHighlighted.length ) {
						continue;
					}
					for (var j = previouslyHighlighted.length - 1; j >= 0; j--) {
						var el = previouslyHighlighted[j];
						el.parentNode.replaceChild(el.childNodes[0], el);	//unwrapping
					};
					node.normalize();	//concat textNodes
				};
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

			function highlightNode(node, startIndex, length) {
				var highlightedNode = document.createElement('mark');
				highlightedNode.classList.add(settings.highlightedClass);
				var highlight = document.createRange();
				var nodes = node.childNodes;
				var index = 0;
				for (var i = 0; i <= nodes.length - 1; i++) {
					var localIndex = startIndex - index;
					if ( localIndex < 0 ) {
						break;
					}
					if ( isTextNode(nodes[i]) && localIndex <= nodes[i].textContent.length-1) {
						highlight.selectNodeContents(nodes[i]);
						highlight.setStart(nodes[i], localIndex);
						highlight.setEnd(nodes[i], localIndex + length);
						highlight.surroundContents(highlightedNode);
						break;
					}
					index += nodes[i].textContent.length;
				};
			}

			function isTextNode(node) {
				return node.nodeType === 3 && /\S/.test(node.textContent);
			}
		});
	};
}( jQuery ));