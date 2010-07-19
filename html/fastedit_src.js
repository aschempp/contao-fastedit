/*
	mediaboxAdvanced v1.2.0 - The ultimate extension of Slimbox and Mediabox; an all-media script
	updated 2010.01.24
	(c) 2007-2009 John Einselen <http://iaian7.com>
		based on
	Slimbox v1.64 - The ultimate lightweight Lightbox clone
	(c) 2007-2008 Christophe Beyls <http://www.digitalia.be>
	MIT-style license.
	Customized for TYPOlight.
*/

var Fasteditbox;

(function() {
	// Global variables, accessible to Fasteditbox only
	var options, images, activeImage, prevImage, nextImage, top, mTop, left, mLeft, winWidth, winHeight, fx, preload, preloadPrev = new Image(), preloadNext = new Image(), foxfix = false, iefix = false,
	// DOM elements
	overlay, center, image, bottom, captionSplit, title, caption, number,
	// Fasteditbox specific vars
	URL, WH, WHL, elrel, mediaWidth, mediaHeight, mediaType = "none", mediaSplit, mediaId = "fasteditBox", mediaFmt;

	/*	Initialization	*/

	window.addEvent("domready", function() {
		// Create and append the Fasteditbox HTML code at the bottom of the document
		$(document.body).adopt(
			$$([
				overlay = new Element("div", {id: "feOverlay"}).addEvent("click", close),
				center = new Element("div", {id: "feCenter"})
			]).setStyle("display", "none")
		);

		image = new Element("div", {id: "feImage"}).injectInside(center);
		bottom = new Element("div", {id: "feBottom"}).injectInside(center).adopt(
			new Element("a", {id: "feCloseLink", href: "#"}).addEvent("click", close),
			title = new Element("div", {id: "feTitle"}),
			number = new Element("div", {id: "feNumber"}),
			caption = new Element("div", {id: "feCaption"})
		);

		fx = {
			overlay: new Fx.Tween(overlay, {property: "opacity", duration: 360}).set(0),
			image: new Fx.Tween(image, {property: "opacity", duration: 360, onComplete: captionAnimate}),
			bottom: new Fx.Tween(bottom, {property: "opacity", duration: 240}).set(0)
		};
	});

	/*	API		*/

	Fasteditbox = {
		close: function(){ 
			close();	// Thanks to Yosha on the google group for fixing the close function API!
		}, 

		open: function(_images, startImage, _options) {
			options = $extend({
				loop: false,					// Allows to navigate between first and last images
				stopKey: true,					// Prevents default keyboard action (such as up/down arrows), in lieu of the shortcuts
													// Does not apply to iFrame content
													// Does not affect mouse scrolling
				overlayOpacity: 0.7,			// 1 is opaque, 0 is completely transparent (change the color in the CSS file)
													// Remember that Firefox 2 and Camino 1.6 on the Mac require a background .png set in the CSS
				resizeOpening: false,			// Determines if box opens small and grows (true) or start full size (false)
				resizeDuration: 240,			// Duration of each of the box resize animations (in milliseconds)
				resizeTransition: false,		// Mootools transition effect (false leaves it at the default)
				initialWidth: 320,				// Initial width of the box (in pixels)
				initialHeight: 180,				// Initial height of the box (in pixels)
				defaultWidth: 750,				// Default width of the box (in pixels) for undefined media (MP4, FLV, etc.)
				defaultHeight: 600,				// Default height of the box (in pixels) for undefined media (MP4, FLV, etc.)
				showCaption: false,				// Display the title and caption, true / false
				showCounter: false,				// If true, a counter will only be shown if there is more than 1 image to display
				counterText: '({x} of {y})'		// Translate or change as you wish
			}, _options || {});

			if ((Browser.Engine.gecko) && (Browser.Engine.version<19)) {	// Fixes Firefox 2 and Camino 1.6 incompatibility with opacity + flash
				foxfix = true;
				options.overlayOpacity = 1;
				overlay.className = 'feOverlayFF';
			}

			if (typeof _images == "string") {	// The function is called for a single image, with URL and Title as first two arguments
				_images = [[_images,startImage,_options]];
				startImage = 0;
			}

			images = _images;
			options.loop = options.loop && (images.length > 1);

			if ((Browser.Engine.trident) && (Browser.Engine.version<5)) {	// Fixes IE 6 and earlier incompatibilities with CSS position: fixed;
				iefix = true;
				overlay.className = 'feOverlayIE';
				overlay.setStyle("position", "absolute");
				position();
			}
			size();
			setup(true);
			top = window.getScrollTop() + (window.getHeight()/2);
			left = window.getScrollLeft() + (window.getWidth()/2);
			fx.resize = new Fx.Morph(center, $extend({duration: options.resizeDuration, onComplete: imageAnimate}, options.resizeTransition ? {transition: options.resizeTransition} : {}));
			center.setStyles({top: top, left: left, width: options.initialWidth, height: options.initialHeight, marginTop: -(options.initialHeight/2), marginLeft: -(options.initialWidth/2), display: ""});
			fx.overlay.start(options.overlayOpacity);
			return changeImage(startImage);
		}
	};

	Element.implement({
		fasteditbox: function(_options, linkMapper) {
			$$(this).fasteditbox(_options, linkMapper);	// The processing of a single element is similar to the processing of a collection with a single element

			return this;
		}
	});

	Elements.implement({
		/*
			options:	Optional options object, see Fasteditbox.open()
			linkMapper:	Optional function taking a link DOM element and an index as arguments and returning an array containing 3 elements:
						the image URL and the image caption (may contain HTML)
			linksFilter:Optional function taking a link DOM element and an index as arguments and returning true if the element is part of
						the image collection that will be shown on click, false if not. "this" refers to the element that was clicked.
						This function must always return true when the DOM element argument is "this".
		*/
		fasteditbox: function(_options, linkMapper, linksFilter) {
			linkMapper = linkMapper || function(el) {
				elrel = el.rel.split(/[\[\]]/);
				elrel = elrel[1];
				return [el.href, el.title, elrel];
			};

			linksFilter = linksFilter || function() {
				return true;
			};

			var links = this;

			// PATCH: enable contextmenu
			//links.addEvent('contextmenu', function(e){
			//	if (this.toString().match(/\.gif|\.jpg|\.png/i)) e.stop();
			//});
			// PATCH EOF

			links.removeEvents("click").addEvent("click", function() {
				// Build the list of images that will be displayed
				var filteredArray = links.filter(linksFilter, this);
				var filteredLinks = [];
				var filteredHrefs = [];

				filteredArray.each(function(item, index){
					if(filteredHrefs.indexOf(item.toString()) < 0) {
						filteredLinks.include(filteredArray[index]);
						filteredHrefs.include(filteredArray[index].toString());
					};
				});

				return Fasteditbox.open(filteredLinks.map(linkMapper), filteredHrefs.indexOf(this.toString()), _options);
			});

			return links;
		}
	});

	/*	Internal functions	*/

	function position() {
		overlay.setStyles({top: window.getScrollTop(), left: window.getScrollLeft()});
	}

	function size() {
		winWidth = window.getWidth();
		winHeight = window.getHeight();
		overlay.setStyles({width: winWidth, height: winHeight});
	}

	function setup(open) {
		// Hides on-page objects and embeds while the overlay is open, nessesary to counteract Firefox stupidity
		["object", window.ie ? "select" : "embed"].forEach(function(tag) {
			Array.forEach(document.getElementsByTagName(tag), function(el) {
				if (open) el._fasteditbox = el.style.visibility;
				el.style.visibility = open ? "hidden" : el._fasteditbox;
			});
		});

		overlay.style.display = open ? "" : "none";

		var fn = open ? "addEvent" : "removeEvent";
		if (iefix) window[fn]("scroll", position);
		window[fn]("resize", size);
		document[fn]("keydown", keyDown);
	}

	function keyDown(event) {
		switch(event.code) {
			case 27:	// Esc
			case 88:	// 'x'
			case 67:	// 'c'
				close();
				break;
			case 37:	// Left arrow
			case 80:	// 'p'
				previous();
				break;	
			case 39:	// Right arrow
			case 78:	// 'n'
				next();
		}
		if (options.stopKey) { return false; };
	}

	function changeImage(imageIndex) {
		if (imageIndex >= 0) {
			image.set('html', '');
			activeImage = imageIndex;
			prevImage = ((activeImage || !options.loop) ? activeImage : images.length) - 1;
			nextImage = activeImage + 1;
			if (nextImage == images.length) nextImage = options.loop ? 0 : -1;
			stop();
			center.className = "feLoading";

// FASTEDITBOX FORMATING
			if (!images[imageIndex][2]) images[imageIndex][2] = '';	// Thanks to Leo Feyer for offering this fix
			WH = images[imageIndex][2].split(' ');
			WHL = WH.length;
			if (WHL>1) {
				mediaWidth = (WH[WHL-2].match("%")) ? (window.getWidth()*((WH[WHL-2].replace("%", ""))*0.01))+"px" : WH[WHL-2]+"px";
				mediaHeight = (WH[WHL-1].match("%")) ? (window.getHeight()*((WH[WHL-1].replace("%", ""))*0.01))+"px" : WH[WHL-1]+"px";
			} else {
				mediaWidth = "";
				mediaHeight = "";
			}
			URL = images[imageIndex][0];
			// PATCH: do not encode URIs because TYPOlight has done already
			//URL = encodeURI(URL).replace("(","%28").replace(")","%29");
			// PATCH EOF
			captionSplit = images[activeImage][1].split('::');

			mediaType = 'url';
			mediaWidth = mediaWidth || options.defaultWidth;
			mediaHeight = mediaHeight || options.defaultHeight;
			mediaId = "mediaId_"+new Date().getTime();	// Safari will not update iframe content with a static id.
			preload = new Element('iframe', {
				'src': URL,
				'id': mediaId,
				'width': mediaWidth,
				'height': mediaHeight,
				'frameborder': 0,
				'events': {
					'load': function() {
						$(preload.contentWindow.document.body).addClass('fastedit');
						if (preload.get('src') != preload.contentWindow.document.location.href)
						{
							document.location.reload();
						}
					}
				}
				});
			startEffect();
		}
		return false;
	}

	function startEffect() {
		image.setStyles({backgroundImage: "none", display: ""});
		preload.inject(image);
		image.setStyles({width: mediaWidth, height: mediaHeight});

		title.set('html', (options.showCaption) ? captionSplit[0] : "");
		caption.set('html', (options.showCaption && (captionSplit.length > 1)) ? captionSplit[1] : "");
		number.set('html', (options.showCounter && (images.length > 1)) ? options.counterText.replace(/{x}/, activeImage + 1).replace(/{y}/, images.length) : "");

		if ((prevImage >= 0) && (images[prevImage][0].match(/\.gif|\.jpg|\.png|twitpic\.com/i))) preloadPrev.src = images[prevImage][0].replace(/twitpic\.com/i, "twitpic.com/show/full");
		if ((nextImage >= 0) && (images[nextImage][0].match(/\.gif|\.jpg|\.png|twitpic\.com/i))) preloadNext.src = images[nextImage][0].replace(/twitpic\.com/i, "twitpic.com/show/full");

		mediaWidth = image.offsetWidth;
		mediaHeight = image.offsetHeight+bottom.offsetHeight;
		if (mediaHeight >= top+top-10) { mTop = -(top-10) } else { mTop = -(mediaHeight/2) };
		if (mediaWidth >= left+left-10) { mLeft = -(left-10) } else { mLeft = -(mediaWidth/2) };
		if (options.resizeOpening) { fx.resize.start({width: mediaWidth, height: mediaHeight, marginTop: mTop, marginLeft: mLeft});
		} else { center.setStyles({width: mediaWidth, height: mediaHeight, marginTop: mTop, marginLeft: mLeft}); imageAnimate(); }
	}

	function imageAnimate() {
		fx.image.start(1);
	}

	function captionAnimate() {
		center.className = "";
		fx.bottom.start(1);
	}

	function stop() {
		if (preload) preload.onload = $empty;
		fx.resize.cancel();
		fx.image.cancel().set(0);
		fx.bottom.cancel().set(0);
	}

	function close() {
		if (activeImage >= 0) {
			window.location.reload();
		}
		return false;
	}
})();

// AUTOLOAD CODE BLOCK
Fasteditbox.scanPage = function() {
	var links = $$("a").filter(function(el) {
		return el.rel && el.rel.test(/^fastedit/i);
	});
	$$(links).fasteditbox({/* Put custom options here */}, null, function(el) {
		var rel0 = this.rel.replace(/[[]|]/gi," ");
		var relsize = rel0.split(" ");
		return (this == el) || ((this.rel.length > 8) && el.rel.match(relsize[1]));
	});
};
window.addEvent("domready", Fasteditbox.scanPage);