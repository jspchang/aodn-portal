Ext.namespace('Portal.search');

Portal.search.SearchController = Ext.extend(Ext.util.Observable, {
	
  constructor: function(config) {
    
    Portal.search.SearchController.superclass.constructor.apply(this, arguments);
    
    this.savedSearchStore = new Ext.data.JsonStore({
      autoLoad: Portal.app.config.currentUser,
      autoDestroy: true,
      remote: true,
      url: 'search/list',
      baseParams: {
        'owner.id': Portal.app.config.currentUser ? Portal.app.config.currentUser.id : null
      },
      fields: ['id','name']
    });
    
    this.activeFilterStore = Portal.search.filter.newDefaultActiveFilterStore();
    this.inactiveFilterStore = Portal.search.filter.newDefaultInactiveFilterStore(this);
    
    this.activeFilterStore.on('remove', this.onRemoveActiveFilter, this);
    this.inactiveFilterStore.on('remove', this.onRemoveInactiveFilter, this);

    this.addEvents('newsearch');
  },
  
  getActiveFilterStore: function() {
    return this.activeFilterStore;
  },

  getInactiveFilterStore: function() {
    return this.inactiveFilterStore;
  },
  
  getSavedSearchStore: function() {
    return this.savedSearchStore;
  },

  onRemoveActiveFilter: function(store, record)
  {
    this.inactiveFilterStore.add(record);
    this.inactiveFilterStore.sort('sortOrder');
  },
  
  onRemoveInactiveFilter: function(store, record)
  {
    this.activeFilterStore.add(record);
  },
  
	loadSavedSearch: function(id, name)
	{
		// Load the saved search (in full).
		Ext.Ajax.request({
			url: 'search/show',
			params: { id: id },
			success: this.onSuccessfulShow,
			failure: this.onFailedShow,
			scope: this
		});
	},
	
	deleteSavedSearch: function(record)
	{
		Ext.Ajax.request({
			url: 'search/delete',
			params: { id: record.get('id') },
			success: this.onSuccessfulDelete,
			failure: this.onFailedDelete,
			scope: this
		});
	},
	
	saveSearch: function(savedSearchName) 
	{
		var filtersArray = [];
		
		Ext.each(this.activeFilterStore.data.items, function(record, index, array) {
			   
			filtersArray.push(record.get('asJson')());
		});
		
		var jsonArray = 
		{
			name: savedSearchName,
			owner: { id: Portal.app.config.currentUser.id },
			filters: filtersArray
		};
		
		Ext.Ajax.request({
			url: 'search/save',
		    jsonData: Ext.encode(jsonArray),
			success: this.onSuccessfulSave,
			failure: this.onFailedSave,
			scope: this
		});
	},
	
	newSearch: function() {
    var defaultFilters = Portal.search.filter.getDefaultFilters();
	  this.clearFilters();
	  this.addFiltersArray(defaultFilters);
	  this.fireEvent('newsearch');
	},
	
  clearFilters: function() {
    // Make every filter inactive.
    this.activeFilterStore.each(function(record) {
      record.set('filterValue', undefined);
      this.inactiveFilterStore.add(record);
    }, this);
    this.activeFilterStore.removeAll();
  },
  
  addFiltersObject: function(filters) {
    Ext.each(filters, function(filter) {
      this.addFilter(filter.type, filter.value);
    }, this);
  },

  addFiltersArray: function(filters) {
    Ext.each(filters, function(filter) {
      this.addFilter(filter[1], filter[3]);
    }, this);
  },
  
  addFilter: function(filterType, filterValue) {
    var recordIndex = this.inactiveFilterStore.find('type', filterType);
    
    if (recordIndex == -1)
    {
      // error
      // TODO
      return
    }
    
    var record = this.inactiveFilterStore.getAt(recordIndex);

    // Update value.
    record.set('filterValue', filterValue);
    
    // Move to active store...
    this.inactiveFilterStore.remove(record);
  },
  
	onSuccessfulSave: function(response, options)
	{
		console.log(response);
		
    var savedSearch = Ext.decode(response.responseText);
    
    this.savedSearchStore.load({
      callback: function(records, options, success) {
        if (success) {
          this.fireEvent('searchsaved', savedSearch.id);
        }
      },
      scope: this
    });
	},
	
	onFailedSave: function(response, options)
	{
		console.log(response);
	},
	
	onSuccessfulShow: function(response, options)
	{
		var savedSearch = Ext.decode(response.responseText);
		this.clearFilters();
		this.addFiltersObject(savedSearch.filters);
	},
	
	onFailedShow: function(response, options)
	{
		console.log(response);
	},
	
	onSuccessfulDelete: function(response, options)
	{
		this.savedSearchStore.reload();
	},
	
	onFailedDelete: function(response, options)
	{
		// TODO
	}
	
});