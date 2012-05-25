/**
 * @author Alex Gibson
 * @name Checklist
 * @desc Checklist is an easy to use web app for creating quick to-do or shopping lists.
 */
 
/*global $, Backbone, _, Store, Tap, console */

$(function () {

	var Item,
		ItemList,
		AppRouter,
		ViewManager,
		ItemView,
		SettingsView,
		EditView,
		ListView,
		items,
		appView,
		router,
		tap;

	/**
	* Model for checklist items
	* Sets defaults & performs data validation on initialisation of new model items.
	*/
	Item = Backbone.Model.extend({

		defaults: function () {
			return {
				text:	'empty item',
				order:	items.nextOrder(),
				done:	false
			};
		},

		validate: function (attribs) {
			if (!_.isString(attribs.text)) {
				return 'Text attribute must be a string';
			}
			if (!_.isBoolean(attribs.done)) {
				return 'Done attribute must be a boolean';
			}
			if (!_.isNumber(attribs.order)) {
				return 'Order attribute must be a number';
			}
		},

		initialize: function () {
			if (!this.get('title')) {
				this.set({'title' : this.defaults.title});
			}
			this.bind('error', function (model, error) {
				console.error(error);
			});
		},

		toggle: function () {
			this.save({done: !this.get('done')});
		},

		clear: function () {
			this.destroy();
		}
	});

	/**
	* A collection of Item model data which is saved to the browser using localStorage.
	* Includes methods for items counts and finding the next order value for new items
	*/
	ItemList = Backbone.Collection.extend({

		model: Item,

		localStorage: new Store('items'),

		done: function () {
			return this.filter(function (item) { return item.get('done'); });
		},

		remaining: function () {
			return this.without.apply(this, this.done());
		},

		nextOrder: function () {
			if (!this.length) { return 1; }
			return this.last().get('order') + 1;
		}
	});

	/**
	* Responsible for listening for URL hash changes and dispatching each route to appropriate view handler
	*/
	AppRouter = Backbone.Router.extend({

		routes: {
			'':				'defaultRoute',
			'settings':		'settings',
			'add/:id':		'add',
			'edit/:id':		'edit'
		},

		initialize: function (options) {
			this.collection = options.collection;
			this.appView = options.appView;
		},

		settings: function () {
			var settingsView = new SettingsView({collection: this.collection});
			this.appView.showView(settingsView);
			this.collection.fetch();
			settingsView.trigger('rendered');
		},

		add: function (id) {
			var listView = new ListView({collection: this.collection});
			this.appView.showView(listView);
			this.collection.fetch();
			$('#new-item-name').val(decodeURIComponent(id.replace(/\+/g, ' ')));
		},

		edit: function (id) {
			var item, editView;
			this.collection.fetch();
			item = this.collection.get(id);
			if (item !== undefined) {
				editView = new EditView({model: item});
				this.appView.showView(editView);
				editView.trigger('rendered');
			} else {
				router.navigate('', {trigger: true});
			}
		},

		defaultRoute: function () {
			var listView = new ListView({collection: this.collection});
			this.appView.showView(listView);
			this.collection.fetch();
		}

	});

	/**
	* Responsible for ensuring old views are destroyed before rendering a new view
	*/
	ViewManager = Backbone.View.extend({
		showView: function (view) {
			if (this.currentView) { this.currentView.destroy(); }
			this.currentView = view;
			this.currentView.render();
			$('#app-view').html(this.currentView.el);
		}
	});

	/**
	* Responsible for rendering each checklist item and handling event logic
	*/
	ItemView = Backbone.View.extend({

		tagName:  'li',

		template: _.template($('#item-template').html()),

		events: {
			'click .check'		: 'toggleDone',
			'tap .item-text'	: 'toggleDone',
			'tap .edit'			: 'editItem',
			'keypress .edit'	: 'editOnEnter'
		},

		initialize: function () {
			this.model.bind('change', this.render, this);
			this.model.bind('destroy', this.remove, this);
		},

		render: function () {
			$(this.el).html(this.template(this.model.toJSON()));
			this.setText();
			return this;
		},

		setText: function () {
			var text = this.model.escape('text');
			this.$('.item-text').html(text);
		},

		toggleDone: function () {
			this.model.toggle();
		},

		editItem: function () {
			router.navigate('edit/' + this.model.get('id'), {trigger: true});
		},

		editOnEnter: function (e) {
			if (e.keyCode !== 13) { return; }
			router.navigate('edit/' + this.model.get('id'), {trigger: true});
		},

		remove: function () {
			$(this.el).unbind();
			$(this.el).remove();
		},

		clear: function () {
			this.model.clear();
		}

	});

	/**
	* Responsible for rendering settings view and handling event logic
	*/
	SettingsView = Backbone.View.extend({

		tagName:  'section',

		settingsTemplate: _.template($('#settings-template').html()),

		events: {
			'click #clear-completed':		'clearCompleted',
			'click #clear-all':				'clearAll',
			'click #uncheck-all':			'uncheckAll',
			'tap #close-settings':			'closeSettings',
			'keypress #close-settings':		'closeOnEnter'
		},

		initialize: function (options) {
			this.bind('rendered', this.afterRender, this);
			this.collection = options.collection;
			this.clearCompletedFlag = false;
			this.uncheckAllFlag = false;
			this.clearAllFlag = false;
		},

		render: function () {
			$(this.el).html(this.settingsTemplate());
			return this;
		},

		afterRender: function () {
			this.updateEmailLink();
		},

		clearCompleted: function () {
			this.clearCompletedFlag = !this.clearCompletedFlag;
		},

		clearAll: function () {
			this.clearAllFlag = !this.clearAllFlag;
		},

		uncheckAll: function () {
			this.uncheckAllFlag = !this.uncheckAllFlag;
		},

		updateEmailLink: function () {
			var mail = 'mailto:?', subject = 'My list', list = '';
			_.each(this.collection.models, function (model) {
				list += model.get('text') + '\n';
			});
			mail += 'subject=' + encodeURIComponent(subject);
			mail += '&body=' + encodeURIComponent(list);
			mail += encodeURIComponent('\n\nCreate your own list at: http://alexgibson.github.com/checklist/\n');
			$('#maillink').attr('href', mail);
			return false;
		},

		updateCollection: function () {
			if (this.clearCompletedFlag) {
				_.each(this.collection.done(), function (model) {
					model.clear();
				});
			}
			if (this.uncheckAllFlag) {
				_.each(this.collection.done(), function (model) {
					model.save({'done': false});
				});
			}
			if (this.clearAllFlag) {
				while (this.collection.models.length > 0) {
					this.collection.models[0].destroy();
				}
			}
			router.navigate("", {trigger: true});
		},

		closeSettings: function () {
			this.updateCollection();
		},

		closeOnEnter: function (e) {
			if (e.keyCode !== 13) { return; }
			this.updateCollection();
		},

		destroy: function () {
			this.unbind();
			this.remove();
		}
	});

	/**
	* Responsible for rendering edit view and handling event logic
	*/
	EditView = Backbone.View.extend({

		tagName:  'section',

		editTemplate: _.template($('#edit-template').html()),

		events: {
			'tap #save-edit'		: 'saveItem',
			'click #clear'			: 'clearItem',
			'keypress #edit-field'	: 'saveOnEnter',
			'keypress #save-edit'	: 'saveOnEnter',
			'click #edit-completed'	: 'toggleDone'
		},

		initialize: function (options) {
			this.model = options.model;
			this.bind('rendered', this.afterRender, this);
			this.clear = false;
		},

		render: function () {
			$(this.el).html(this.editTemplate(this.model.toJSON()));
			return this;
		},

		afterRender: function () {
			this.updateShareLink();
		},

		saveItem: function () {
			if (this.input === '') { return; }
			if (this.clear) {
				this.model.destroy();
			} else {
				this.input = $('#edit-field').val();
				this.model.save({text: this.input});
			}
			router.navigate("", {trigger: true});
		},

		saveOnEnter: function (e) {
			var text = $('#edit-field').val();
			if (!text || e.keyCode !== 13) { return; }
			e.preventDefault();
			this.saveItem();
		},

		toggleDone: function () {
			this.model.toggle();
		},

		clearItem: function () {
			this.clear = !this.clear;
		},

		updateShareLink: function () {
			var mail = 'mailto:?',
				subject = 'New item for your checklist',
				item = this.model.get('text');

			mail += 'subject=' + encodeURIComponent(subject);
			mail += '&body=' + 'http://alexgibson.github.com/checklist/#add/' + encodeURIComponent(item.replace(/\ /g, '+'));
			$('#share-item-link').attr('href', mail);
			return false;
		},

		destroy: function () {
			this.unbind();
			this.remove();
		}

	});

	/**
	* Responsible for rendering main list view and handling event logic
	*/
	ListView = Backbone.View.extend({

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

		initialize: function (options) {
			this.collection = options.collection;
			this.collection.bind('add',   this.addOne, this);
			this.collection.bind('reset', this.addAll, this);
			this.collection.bind('all',   this.render, this);
		},

		render: function () {
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
			document.title = 'Checklist (' + this.collection.remaining().length + ')';
			return this;
		},

		addOne: function (item) {
			var itemView = new ItemView({model: item});
			$('#todo-list').append(itemView.render().el);
		},

		addAll: function () {
			$(this.el).html(this.listTemplate());
			this.collection.each(this.addOne);
		},

		createOnEnter: function (e) {
			var input = $('#new-item-name'),
				text = input.val();
			if (!text || e.keyCode !== 13) { return; }
			e.preventDefault();
			this.collection.create({text: text});
			input.val('').blur();
		},

		createOnSubmit: function (e) {
			var input = $('#new-item-name'),
				text = input.val();
			if (!text) { return; }
			e.preventDefault();
			this.collection.create({text: text});
			input.val('');
		},

		openSettings: function () {
			router.navigate('settings', {trigger: true});
		},

		settingsOnEnter: function (e) {
			if (e.keyCode !== 13) { return; }
			router.navigate('settings', {trigger: true});
		},

		destroy: function () {
			this.unbind();
			this.remove();
			this.collection.unbind('add', this.addOne);
			this.collection.unbind('reset', this.addAll);
			this.collection.unbind('all', this.render);
		}

	});

	/**
	* App config and init
	*/

	items = new ItemList();
	appView = new ViewManager();
	router = new AppRouter({collection: items, appView: appView});
	tap = new Tap(document.getElementById('app-view'));
	Backbone.history.start();

});