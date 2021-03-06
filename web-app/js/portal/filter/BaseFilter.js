
/*
 * Copyright 2012 IMOS
 *
 * The AODN/IMOS Portal is distributed under the terms of the GNU General Public License
 *
 */

Ext.namespace('Portal.filter');

/**
   This is the base type of all filters for geoserver layers.
**/
Portal.filter.BaseFilter = Ext.extend(Ext.Panel, {
	constructor: function(cfg) {
		var config = Ext.apply({
			listeners: {
				beforeremove: function(panel, component){
					this.removeAll(true);
				}
			}
		}, cfg);

     	this.CQL = "";
     	this.filter = undefined;
     	this.layer = undefined;

     	Portal.filter.BaseFilter.superclass.constructor.call(this, config);
	},

	initComponent: function(cfg){
		this.addEvents('addFilter');
		Portal.filter.BaseFilter.superclass.initComponent.call(this);
	},

	/**
	   You must implement this method in subclass.

	   This method generates all the component fields required for this filter to work, e.g. textfields, buttons, etc.
	   Note that the "x" button is created in the filterPanel. See also handleRemoveFilter.
	**/
	_createField:function(){
	},

	setLayerAndFilter: function(layer, filter){
		this.filter = filter;
		this.layer = layer;
		this._createField();
		this._setExistingFilters();
	},

	getCQL: function(){
		return this.CQL;
	},

	getFilterName: function(){
		return this.filter.name;
	},

	/**
	   You must implement this method in subclass.

	   This is called whenever the "x" button next to a field has been clicked, i.e. clearing/removing a filter.
	   In this method, implement actions like clearing a textfield, reset values.
	**/
	handleRemoveFilter: function(){
	},

	hasValue: function(){
		return this.CQL != "";
	},

	_fireAddEvent: function(){
		this.fireEvent('addFilter', this);
	},

	_setExistingFilters: function(){
	}
});
