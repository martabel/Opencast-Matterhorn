fluid_1_1=fluid_1_1||{};(function($,fluid){var deriveLightboxCellBase=function(namebase,index){return namebase+"lightbox-cell:"+index+":"};var addThumbnailActivateHandler=function(lightboxContainer){var enterKeyHandler=function(evt){if(evt.which===fluid.reorderer.keys.ENTER){var thumbnailAnchors=$("a",evt.target);document.location=thumbnailAnchors.attr("href")}};$(lightboxContainer).keypress(enterKeyHandler)};var seekNodesById=function(rootnode,tagname,idmatch){var inputs=rootnode.getElementsByTagName(tagname);var togo=[];for(var i=0;i<inputs.length;i+=1){var input=inputs[i];var id=input.id;if(id&&id.match(idmatch)){togo.push(input)}}return togo};var createItemFinder=function(parentNode,containerId){var lightboxCellNamePattern="^"+deriveLightboxCellBase(containerId,"[0-9]+")+"$";return function(){return seekNodesById(parentNode,"div",lightboxCellNamePattern)}};var findForm=function(element){while(element){if(element.nodeName.toLowerCase()==="form"){return element}element=element.parentNode}};var defaultAfterMoveCallback=function(lightboxContainer){var reorderform=findForm(lightboxContainer);return function(){var inputs,i;inputs=seekNodesById(reorderform,"input","^"+deriveLightboxCellBase(lightboxContainer.id,"[^:]*")+"reorder-index$");for(i=0;i<inputs.length;i+=1){inputs[i].value=i}if(reorderform&&reorderform.action){$.post(reorderform.action,$(reorderform).serialize(),function(type,data,evt){})}}};fluid.defaults("fluid.reorderImages",{layoutHandler:"fluid.gridLayoutHandler",selectors:{imageTitle:".flc-reorderer-imageTitle"}});fluid.reorderImages=function(container,options){var that=fluid.initView("fluid.reorderImages",container,options);var containerEl=fluid.unwrap(that.container);if(!that.options.afterMoveCallback){that.options.afterMoveCallback=defaultAfterMoveCallback(containerEl)}if(!that.options.selectors.movables){that.options.selectors.movables=createItemFinder(containerEl,containerEl.id)}var reorderer=fluid.reorderer(container,that.options);var movables=reorderer.locate("movables");fluid.transform(movables,function(cell){fluid.reorderImages.addAriaRoles(that.options.selectors.imageTitle,cell)});fluid.tabindex($("a",container),-1);addThumbnailActivateHandler(container);return reorderer};fluid.reorderImages.addAriaRoles=function(imageTitle,cell){cell=$(cell);cell.attr("role","img");var title=$(imageTitle,cell);if(title[0]===cell[0]||title[0]===document){fluid.fail("Could not locate cell title using selector "+imageTitle+" in context "+fluid.dumpEl(cell))}var titleId=fluid.allocateSimpleId(title);cell.attr("aria-labelledby",titleId);var image=$("img",cell);image.attr("role","presentation");image.attr("alt","")};fluid.lightbox=fluid.reorderImages})(jQuery,fluid_1_1);