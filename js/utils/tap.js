/*
 *
 * Find more about this plugin by visiting
 * http://alxgbsn.co.uk/
 *
 * Copyright (c) 2013 Alex Gibson, http://alxgbsn.co.uk/
 * Released under MIT license
 *
 */

(function (window, document) {

	function Tap(el) {
		this.element = typeof el === 'object' ? el : document.getElementById(el);
		this.eventStart = this.hasTouch ? 'touchstart' : 'mousedown';
		this.eventMove = this.hasTouch ? 'touchmove' : 'mousemove';
		this.eventEnd = this.hasTouch ? 'touchend' : 'mouseup';
		this.moved = false; //flags if the finger has moved
		this.startX = 0; //starting x coordinate
		this.startY = 0; //starting y coordinate
		this.deltaX = 0;
		this.deltaY = 0;
		this.element.addEventListener(this.eventStart, this, false);
	}
	
	Tap.prototype.hasTouch = 'ontouchstart' in window || 'createTouch' in document;

	//start			
	Tap.prototype.start = function (e) {
		this.moved = false;
		this.deltaX = 0;
		this.deltaY = 0;
		this.startX = this.hasTouch ? e.touches[0].pageX : e.pageX;
		this.startY = this.hasTouch ? e.touches[0].pageY : e.pageY;
		this.element.addEventListener(this.eventMove, this, false);
		this.element.addEventListener(this.eventEnd, this, false);
		if (this.hasTouch) {
			this.element.addEventListener('touchcancel', this, false);
		}
	};

	//move	
	Tap.prototype.move = function (e) {
		var x = this.hasTouch ? e.touches[0].pageX : e.pageX,
			y = this.hasTouch ? e.touches[0].pageY : e.pageY;

		this.deltaX += Math.abs(x - this.startX);
		this.deltaY += Math.abs(y - this.startY);

		//if finger moves more than 6px flag to cancel
		if (this.deltaX > 5 || this.deltaY > 5) {
			this.moved = true;
		}
	};

	//end
	Tap.prototype.end = function (e) {
		var evt;
		if (!this.moved) {
			//only preventDefault on elements that are not form inputs
			if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
				e.preventDefault();
			}
			evt = document.createEvent('Event');
			evt.initEvent('tap', true, true);
			e.target.dispatchEvent(evt);
		}
		this.deltaX = 0;
		this.deltaY = 0;
		this.element.removeEventListener(this.eventMove, this, false);
		this.element.removeEventListener(this.eventEnd, this, false);
		if (this.hasTouch) {
			this.element.removeEventListener('touchcancel', this, false);
		}
	};

	//touchcancel
	Tap.prototype.cancel = function (e) {
		//reset state
		this.moved = false;
		this.startX = 0;
		this.startY = 0;
		this.deltaX = 0;
		this.deltaY = 0;
		this.element.removeEventListener(this.eventMove, this, false);
		this.element.removeEventListener(this.eventEnd, this, false);
		if (this.hasTouch) {
			this.element.removeEventListener('touchcancel', this, false);
		}
	};

	Tap.prototype.handleEvent = function (e) {
		switch (e.type) {
		case 'touchstart': this.start(e); break;
		case 'touchmove': this.move(e); break;
		case 'touchend': this.end(e); break;
		case 'touchcancel': this.cancel(e); break;
		case 'mousedown': this.start(e); break;
		case 'mousemove': this.move(e); break;
		case 'mouseup': this.end(e); break;
		}
	};

	//public function
	window.Tap = Tap;

}(window, document));