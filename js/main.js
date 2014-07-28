$(function () {

    var Item;
    var ItemList;
    var AppRouter;
    var ViewManager;
    var ItemView;
    var SettingsView;
    var EditView;
    var ListView;
    var items;
    var appView;
    var router;
    var tap;

    var $appView = $('#app-view');

    /**
    * Model for checklist items
    * Sets defaults & performs data validation on initialisation of new model items.
    */
    Item = Backbone.Model.extend({

        defaults: function () {
            return {
                text: 'empty item',
                order: items.nextOrder(),
                priority: false,
                done: false
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
            if (!_.isBoolean(attribs.priority)) {
                return 'Priority attribute must be a boolean';
            }
        },

        initialize: function () {
            this.bind('invalid', function (model, error) {
                console.error(error);
            });
        },

        toggleDone: function () {
            this.save({done: !this.get('done')});
        },

        togglePriority: function (val) {
            this.save({priority: !this.get('priority')});
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
            return this.where({done: true});
        },

        remaining: function () {
            return this.where({done: false});
        },

        nextOrder: function () {
            if (!this.length) {
                return 1;
            }
            return this.last().get('order') + 1;
        },

        // items are sorted by priority first and original insertion order second
        comparator: function(item) {
            return [item.get('priority') ? 0 : 1, item.get('order')];
        }
    });

    /**
    * Responsible for listening for URL hash changes and dispatching each route to appropriate view handler
    */
    AppRouter = Backbone.Router.extend({

        routes: {
            '':             'defaultRoute',
            'settings':     'settings',
            'add/:id':      'add',
            'edit/:id':     'edit'
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
            this.collection.fetch({reset: true});
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
            this.collection.fetch({reset:true});
        }

    });

    /**
    * Responsible for ensuring old views are destroyed before rendering a new view
    */
    ViewManager = Backbone.View.extend({
        showView: function (view) {
            if (this.currentView) {
                this.currentView.destroy();
            }
            this.currentView = view;
            this.currentView.render();
            $appView.html(this.currentView.el);
        }
    });

    /**
    * Responsible for rendering each checklist item and handling event logic
    */
    ItemView = Backbone.View.extend({

        tagName:  'li',

        template: _.template($('#item-template').html()),

        events: {
            'click .check'      : 'toggleDone',
            'tap .item-text'    : 'toggleDone',
            'tap .edit'         : 'editItem',
            'keypress .edit'    : 'editOnEnter'
        },

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);
        },

        render: function () {
            $(this.el).html(this.template(this.model.toJSON()));
            this.setText();
            return this;
        },

        setText: function () {
            var text = this.model.escape('text');
            this.$('.item-text').text(text);
        },

        toggleDone: function (e) {
            e.preventDefault();
            this.model.toggleDone();
        },

        editItem: function () {
            router.navigate('edit/' + this.model.get('id'), {trigger: true});
        },

        editOnEnter: function (e) {
            if (e.keyCode !== 13) {
                return;
            }
            router.navigate('edit/' + this.model.get('id'), {trigger: true});
        },

        remove: function () {
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
            'click #delete-completed':      'deleteCompleted',
            'click #delete-all':            'deleteAll',
            'click #uncheck-all':           'uncheckAll',
            'tap #close-settings':          'closeSettings',
            'keypress #close-settings':     'closeOnEnter'
        },

        initialize: function (options) {
            this.bind('rendered', this.afterRender, this);
            this.collection = options.collection;
            this.deleteCompletedFlag = false;
            this.uncheckAllFlag = false;
            this.deleteAllFlag = false;
        },

        render: function () {
            $(this.el).html(this.settingsTemplate());
            return this;
        },

        afterRender: function () {
            this.updateEmailLink();
        },

        deleteCompleted: function () {
            this.deleteCompletedFlag = !this.deleteCompletedFlag;
        },

        deleteAll: function () {
            this.deleteAllFlag = !this.deleteAllFlag;
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
            mail += encodeURIComponent('\n\nCreate your own checklist at: http://alxgbsn.co.uk/checklist/\n');
            $('#maillink').attr('href', mail);
            return false;
        },

        updateCollection: function () {
            if (this.deleteCompletedFlag) {
                _.each(this.collection.done(), function (model) {
                    model.clear();
                });
            }
            if (this.uncheckAllFlag) {
                _.each(this.collection.done(), function (model) {
                    model.save({'done': false});
                });
            }
            if (this.deleteAllFlag) {
                while (this.collection.models.length > 0) {
                    this.collection.models[0].destroy();
                }
            }
            router.navigate('', {trigger: true});
        },

        closeSettings: function (e) {
            e.preventDefault();
            this.updateCollection();
        },

        closeOnEnter: function (e) {
            if (e.keyCode !== 13) {
                return;
            }
            e.preventDefault();
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
            'tap #save-edit'        : 'saveItem',
            'click #delete'         : 'deleteItem',
            'keypress #edit-field'  : 'saveOnEnter',
            'keypress #save-edit'   : 'saveOnEnter',
            'click #edit-completed' : 'toggleDone',
            'click #priority'       : 'togglePriority'
        },

        initialize: function (options) {
            this.model = options.model;
            this.bind('rendered', this.afterRender, this);
            this.delete = false;
        },

        render: function () {
            $(this.el).html(this.editTemplate(this.model.toJSON()));
            return this;
        },

        afterRender: function () {
            this.updateShareLink();
        },

        saveItem: function (e) {
            e.preventDefault();
            if (this.delete) {
                this.model.destroy();
            } else {
                this.input = $('#edit-field').val();
                if (this.input === '') {
                    return;
                }
                this.model.save({text: this.input});
            }
            router.navigate("", {trigger: true});
        },

        saveOnEnter: function (e) {
            var text = $('#edit-field').val();
            if (!text || e.keyCode !== 13) {
                return;
            }
            this.saveItem(e);
        },

        toggleDone: function () {
            this.model.toggleDone();
        },

        togglePriority: function (e) {
            this.model.togglePriority();
        },

        deleteItem: function () {
            this.delete = !this.delete;
        },

        updateShareLink: function () {
            var mail = 'mailto:?';
            var subject = 'New item for your checklist';
            var item = this.model.get('text');

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
            'keypress #new-item-name'   : 'createOnEnter',
            'tap #add-button'           : 'createOnSubmit',
            'tap .settings'             : 'openSettings',
            'keypress .settings'        : 'settingsOnEnter'
        },

        initialize: function (options) {
            this.collection = options.collection;
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.addAll);
            this.listenTo(this.collection, 'all', this.render);
        },

        render: function () {
            var length = this.collection.length;
            this.$('#todo-stats').html(this.statsTemplate({
                total:      length,
                done:       this.collection.done().length,
                remaining:  this.collection.remaining().length
            }));
            this.$('#get-started').html(this.emptyListTemplate({
                total:      length
            }));
            this.$('#settings-bar').html(this.settingsTemplate({
                total:      length
            }));
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
            this.remove();
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
