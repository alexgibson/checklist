$(function() {

	var items, appView, router, tap;

	//Models & Collections

	var Item = Backbone.Model.extend({

		defaults: function() {
      		return {
        		done:  false,
        		order: items.nextOrder(),
        		note: ''
      		};
    	},

    	toggle: function() {
			this.save({done: !this.get('done')});
		}
	});

	var ItemList = Backbone.Collection.extend({

		model: Item,

		localStorage: new Store('items'),

		done: function() {
      		return this.filter(function(item){ return item.get('done'); });
    	},

    	remaining: function() {
      		return this.without.apply(this, this.done());
    	},

    	nextOrder: function() {
      		if (!this.length) return 1;
      		return this.last().get('order') + 1;
    	},

    	comparator: function(item) {
      		return item.get('order');
    	}
	});

	//Routing & View Manager

	var AppRouter = Backbone.Router.extend({

		routes: {
			'':				'defaultRoute',
			'settings': 	'settings',
			'add/:id': 		'add',
			'edit/:id':		'edit'
		},

		initialize: function(options) {
			this.collection = options.collection;
      		this.appView = options.appView;
		},

		settings: function() {
			var settingsView = new SettingsView({collection: this.collection});
			this.appView.showView(settingsView);
			this.collection.fetch();
			settingsView.trigger('rendered');
		},

		add: function(id) {
			var listView = new ListView({collection: this.collection});
			this.appView.showView(listView);
			this.collection.fetch();
			$('#new-item-name').val(decodeURIComponent(id.replace(/\+/g, ' ')));
		},

		edit: function(id) {
			this.collection.fetch();
			var item = this.collection.get(id);
			if (item !== undefined) {
				var editView = new EditView({model: item});
				this.appView.showView(editView);
				editView.trigger('rendered');
			} else {
				router.navigate('', {trigger: true});
			}
		},

		defaultRoute: function() {
			var listView = new ListView({collection: this.collection});
			this.appView.showView(listView);
			this.collection.fetch();
		}

	});

	var ViewManager = Backbone.View.extend({
		showView: function(view){
			if (this.currentView){ this.currentView.destroy(); }
			this.currentView = view;
			this.currentView.render();
			$('#app-view').html(this.currentView.el);
		}
	});

	//Backbone Views

	var ItemView = Backbone.View.extend({

		tagName:  'li',

		template: _.template($('#item-template').html()),

		events: {
			'click .check' 		: 'toggleDone',
			'tap .item-text' 	: 'toggleDone',
			'tap .edit' 		: 'editItem',
			'keypress .edit'	: 'editOnEnter'
		},

		initialize: function() {
			this.model.bind('change', this.render, this);
			this.model.bind('destroy', this.remove, this);
		},

		render: function() {
			$(this.el).html(this.template(this.model.toJSON()));
			this.setText();
			return this;
		},

		setText: function() {
			var text = this.model.escape('text');
			this.$('.item-text').html(text);
		},

		toggleDone: function() {
			this.model.toggle();
		},

		editItem: function() {
			router.navigate('edit/' + this.model.get('id'), {trigger: true});
		},
		
		editOnEnter: function(e) {
			if (e.keyCode != 13) return;
			router.navigate('edit/' + this.model.get('id'), {trigger: true});
		},

		remove: function() {
			$(this.el).unbind();
			$(this.el).remove();
		}

	});

	var SettingsView = Backbone.View.extend({

		tagName:  'section',

		settingsTemplate: _.template($('#settings-template').html()),

		events: {
			'tap #deletechecked'		: 'clearCompleted',
			'tap #deleteall'			: 'deleteAll',
			'tap #close-settings'		: 'closeSettings',
			'keypress #close-settings'	: 'closeOnEnter'
		},

		initialize: function(options) {
			this.bind('rendered', this.afterRender, this);
			this.collection = options.collection;
		},

		render: function() {
			$(this.el).html(this.settingsTemplate());
			return this;
		},

		afterRender: function() {
			this.updateEmailLink();
		},

		clearCompleted: function() {
			if (confirm('Clear completed items?')) {
				_.each(this.collection.done(), function(model) { model.destroy(); });
				router.navigate('', {trigger: true});
				return false;
			}
		},

		deleteAll: function() {
			if (confirm('Delete all items?')) {
				while (this.collection.models.length > 0) {
					this.collection.models[0].destroy();
				}
				router.navigate('', {trigger: true});
				return false;
			}
		},

		updateEmailLink: function() {
			var mail = 'mailto:?', subject = 'My list', list = '';
			_.each(this.collection.models, function(model) { list += model.get('text') + '\n'; });
			mail += 'subject=' + encodeURIComponent(subject);
			mail += '&body=' + encodeURIComponent(list);
			mail += encodeURIComponent('\n\nMake your own list here: http://miniapps.co.uk/checklist/\n');
			$('#maillink').attr('href', mail);
			return false;
		},

		closeSettings: function() {
			router.navigate("", {trigger: true});
		},
		
		closeOnEnter: function(e) {
			if (e.keyCode != 13) return;
			router.navigate("", {trigger: true});
		},

		destroy: function(){
			this.unbind();
			this.remove();
		}
	});

	var EditView = Backbone.View.extend({

		tagName:  'section',

		editTemplate: _.template($('#edit-template').html()),

		events: {
			'tap #save-edit'		: 'saveItem',
			'tap #delete'			: 'deleteItem',
			'tap #delete-label'		: 'deleteItem',
			'keypress #edit-field'	: 'saveOnEnter',
			'keypress #save-edit'	: 'saveOnEnter',
			'click .check'			: 'toggleDone'
		},

		initialize: function(options) {
			this.model = options.model;
			this.bind('rendered', this.afterRender, this);
			this.deleted = false;
		},

		render: function() {
			$(this.el).html(this.editTemplate(this.model.toJSON()));
			return this;
		},
		
		afterRender: function() {
			this.updateShareLink();
		},

		saveItem: function() {
			if (this.input === '') { return; }
			if(this.deleted) {
				this.model.destroy();
			} else {
				this.input = $('#edit-field').val();
				this.note = $('#note').val();
				this.model.save({text: this.input, note: this.note});
			}
			router.navigate("", {trigger: true});
		},

		saveOnEnter: function(e) {
			var text = $('#edit-field').val();
			if (!text || e.keyCode != 13) return;
			e.preventDefault();
			this.saveItem();
		},
		
		toggleDone: function() {
			this.model.toggle();
		},

		deleteItem: function() {
			this.deleted = !this.deleted;
		},
		
		updateShareLink: function() {
			var mail = 'mailto:?', 
				subject = 'New item for your checklist', 
				item = this.model.get('text');
				note = this.model.get('note');

			mail += 'subject=' + encodeURIComponent(subject);
			mail += '&body=' + 'http://miniapps.co.uk/checklist/#add/' + encodeURIComponent(item.replace(/\ /g, '+'));
			mail += encodeURIComponent('\n\n' + note);
			$('#share-item-link').attr('href', mail);
			return false;
		},

		destroy: function(){
			this.unbind();
			this.remove();
		}

	});

	var ListView = Backbone.View.extend({

		tagName:  'section',

		statsTemplate: _.template($('#totals-template').html()),
		emptyListTemplate: _.template($('#empty-list-template').html()),
		listTemplate: _.template($('#list-template').html()),
		settingsTemplate: _.template($('#settings-bar-template').html()),

		events: {
			'keypress #new-item-name'	: 'createOnEnter',
			'tap #add-button'			: 'createOnSubmit',
			'tap .settings'				: 'openSettings',
			'keypress .settings'		: 'settingsOnEnter'
		},

		initialize: function(options) {
			this.collection = options.collection;
			this.collection.bind('add',   this.addOne, this);
			this.collection.bind('reset', this.addAll, this);
			this.collection.bind('all',   this.render, this);
		},

		render: function() {
			var length = this.collection.length;
      		this.$('#todo-stats').html(this.statsTemplate({
				total:      length,
				done:       this.collection.done().length,
				remaining:  this.collection.remaining().length
			}));
			this.$('#empty-list').html(this.emptyListTemplate({
				total:      length
			}));
			this.$('#settings-bar').html(this.settingsTemplate({
				total:      length
			}));
			return this;
    	},

    	addOne: function(item) {
			var itemView = new ItemView({model: item});
			$('#todo-list').append(itemView.render().el);
		},
		
		addAll: function() {
			$(this.el).html(this.listTemplate());
			this.collection.each(this.addOne);
		},

		createOnEnter: function(e) {
			var input = $('#new-item-name'),
				text = input.val();
			if (!text || e.keyCode != 13) return;
			e.preventDefault();
			this.collection.create({text: text});
			input.val('').blur();
		},

		createOnSubmit: function(e) {
			var input = $('#new-item-name'),
				text = input.val();
			if (!text) return;
			e.preventDefault();
			this.collection.create({text: text});
			input.val('');
		},
		
		openSettings: function() {
			router.navigate('settings', {trigger: true});
		},
		
		settingsOnEnter: function(e) {
			if (e.keyCode != 13) return;
			router.navigate('settings', {trigger: true});
		},

		destroy: function(){
			this.unbind();
			this.remove();
			this.collection.unbind('add', this.addOne);
			this.collection.unbind('reset', this.addAll);
			this.collection.unbind('all', this.render);
		}

	});

	//Initialize app

	var setStartupImage = function () {
		var head = document.getElementsByTagName('head')[0], filename, link;
		if (navigator.platform === 'iPad') {
			filename = window.orientation !== 90 || window.orientation === -90 ? 'splash-1024x748.png' : 'splash-768x1004.png';
		} else {
			filename = window.devicePixelRatio === 2 ? 'splash-640x920.png' : 'splash-320x460.png';
		}
		link = document.createElement('link');
		link.setAttribute('rel', 'apple-touch-startup-image');
		link.setAttribute('href', 'images/' + filename);
		head.appendChild(link);
	};

	setStartupImage();
	items = new ItemList;
	appView = new ViewManager();
	router = new AppRouter({collection: items, appView: appView});
	tap = new Tap(document.getElementById('app-view'));
	Backbone.history.start();

});