Ext.namespace('Portal.ui');

Portal.ui.MapPanel = Ext.extend(Portal.common.MapPanel, {

    constructor: function(cfg) {

        this.appConfig = cfg.appConfig;

        // Stop the pink tiles appearing on error
        OpenLayers.Util.onImageLoadError = function(e) {
            this.style.display = "";
            this.src = "img/blank.png";
        };

        this.initMap();
		this.addBaseLayers();

        var config = Ext.apply({
            id: "map",
            region: "center",
            split: true,
            header: false,
            initialBbox: this.appConfig.initialBbox,
            autoZoom: this.appConfig.autoZoom,
            hideLayerOptions: this.appConfig.hideLayerOptions,
            activeLayers: {},
            layersLoading: 0
        }, cfg);

        Portal.ui.MapPanel.superclass.constructor.call(this, config);
        this.initAnimationPanel();
        
        this.spinnerForLayerloading = new Spinner({
            lines: 12, // The number of lines to draw
            length: 16, // The length of each line
            width: 4, // The line thickness
            radius: 12, // The radius of the inner circle
            color: '#0B5584', //#18394E', // #rgb or #rrggbb
            speed: 1, // Rounds per second
            trail: 60, // Afterglow percentage
            shadow: true // Whether to render a shadow
        });

        this.on('hide', function() {
            // map is never hidden!!!!"
            this.updateLoadingImage("none");
            this._closeFeatureInfoPopup();
        }, this);
		

        this.on('baselayersloaded', this.onBaseLayersLoaded, this);
		this.map.events.register('movestart', this, this.closeDropdowns);

        this.addEvents('baselayersloaded', 'layeradded', 'tabchange', 'mouseover');
        this.bubbleEvents.push('baselayersloaded');
        this.bubbleEvents.push('layeradded');
        //this.bubbleEvents.push('focus');			
		
        		

        this.on('afterlayout', function() {
            // cursor mods
            //this.style.cursor="pointer";
            jQuery("div.olControlZoomBoxItemInactive ").click(function(){
                //this.style.cursor="crosshair";
                clickControl.deactivate();
            });
            jQuery("div.olControlNavigationItemActive ").click(function(){
                //this.style.cursor="pointer";
                clickControl.activate();
            });
            jQuery("div.olControlMousePosition,div.olControlScaleLine *").mouseover(function() {
                jQuery("div.olControlMousePosition,div.olControlScaleLine *").addClass('allwhite');
            });
            jQuery("div.olControlMousePosition,div.olControlScaleLine *").mouseout(function() {
                jQuery("div.olControlMousePosition,div.olControlScaleLine *").removeClass('allwhite');
            });


        }, this);

        this.on('tabchange', function() {
            this._closeFeatureInfoPopup();
        }, this);


        // make sure layer store reflects loaded layers
        // even if the map hasn't been rendered yet
        this.layers.bind(this.map);
        
        Ext.MsgBus.subscribe('selectedLayerChanged', function(subject, message) {
            this.updateAnimationControlsPanel(message)
        }, this);
    },
    
	closeDropdowns: function(event) {
		this.map.events.triggerEvent('blur',event); // listening in BaseLayerComboBox and mapOptionsPanel
	},	

    afterRender: function() {

        Portal.ui.MapPanel.superclass.afterRender.call(this);
        this.mapOptions.afterRender(this);
    },

	loadSnapshot: function(id) {		

		this.mapOptions.mapActionsControl.actionsPanel.loadSnapshot(id);
	},

    autoZoomCheckboxHandler: function(box, checked) {
        //console.log("autoZoom: " + checked);
        Portal.app.config.autoZoom = checked;
        this.autoZoom = checked;
    },

    layerOptionsCheckboxHandler: function(box, checked) {
        Portal.app.config.hideLayerOptions = checked;
        this.hideLayerOptions = checked;
    },

    resetMap: function() {
        this.removeAllLayers();
        this.zoomToInitialBbox();
        this.addDefaultLayers();
		// reset baselayers??		
		//this.addBaseLayers();
    },

    _handleFeatureInfoClick: function(event) {
        this._closeFeatureInfoPopup();
        this._findFeatureInfo(event);
    },

    _closeFeatureInfoPopup: function() {
        if (this.featureInfoPopup) {
            this.featureInfoPopup.close();
        }
    },

    _findFeatureInfo: function(event) {
        this.featureInfoPopup = new Portal.ui.FeatureInfoPopup({
            map: this.map,
            appConfig: this.appConfig,
            maximisedSize: this.getViewSize(),
            maximisedX: this.getPageX(),
            maximisedY: this.getPageY()
        });
        this.featureInfoPopup.findFeatures(event);
    },

    initMap: function() {

        // The MapActionsControl (in the OpenLayers map tools) needs this.
        this.appConfig.mapPanel = this;

        this.mapOptions = new Portal.ui.openlayers.MapOptions(this.appConfig, this);
        this.map = new OpenLayers.Map(this.mapOptions);
        this.map.restrictedExtent = new OpenLayers.Bounds.fromArray([null, -90, null, 90]);
        this.map.events.register('removelayer', this, this.postRemoveLayer);		
    },

    initAnimationPanel: function() {
    
        this.animationPanel = new Portal.ui.AnimationPanel(this);
        this.add(this.animationPanel);
        
        // TODO: remove this - just a short cut as part of refactoring.
        this.animationControlsPanel = this.animationPanel.animationControlsPanel;
    },

    addBaseLayers: function() {
        if (this.baseLayersLoaded || this.baseLayersLoading) {
            return;
        }
        this.baseLayersLoading = true;

        Ext.Ajax.request({
            url: 'layer/configuredbaselayers',
            scope: this,
            success: function(resp, opts) {
                var layerDescriptors = Ext.util.JSON.decode(resp.responseText);
                Ext.each(layerDescriptors,
                    function(layerDescriptor, index, all) {
                        layerDescriptor.isBaseLayer = true;
                        layerDescriptor.queryable = false;
                        this.map.addLayer(this.getOpenLayer(layerDescriptor));
                    },
                    this
                );
                delete this.baseLayersLoading;
                this.baseLayersLoaded = true;
                this.fireEvent('baselayersloaded');
            }
        });
    },

    onBaseLayersLoaded: function() {
        this.addDefaultLayers();
		if (this.mapOptions.mapActionsControl != undefined) {
			this.mapOptions.mapActionsControl.actionsPanel.mapOptionsPanel.baseLayerCombo.reload();
		}
		
    },

    addDefaultLayers: function() {
        if (this.defaultLayersLoaded || this.defaultLayersLoading) {
            return;
        }
        this.defaultLayersLoading = true;
        Ext.Ajax.request({
            url: 'layer/defaultlayers',
            scope: this,
            success: function(resp, opts) {
                var layerDescriptors = Ext.util.JSON.decode(resp.responseText);
                Ext.each(layerDescriptors,
                    function(layerDescriptor, index, all) {
                        this._addLayer(this.getOpenLayer(layerDescriptor), true);
                    },
                    this
                );
                // TODO tommy move to portal panel or another higher UI
                jQuery('.extAjaxLoading').hide('slow');
                // Zoom to the top most layer if autoZoom is enabled
                if (this.autoZoom === true) {
                    this.zoomToLayer(this.map.layers[this.map.layers.length - 1]);
                }
                this.defaultLayersLoaded = true;
                delete this.defaultLayersLoading;
                this.fireEvent('defaultlayersloaded');
            }
        });
    },

    getServer: function(item) {
        return item.server;
    },

    getServerImageFormat: function (server) {
        if (server) {
            if (server.imageFormat) {
                return server.imageFormat;
            }
            return 'image/png';
        }
        return undefined;
    },

    getWmsVersionString: function(server) {
        // list needs to match Server.groovy
        var versionList = ["1.0.0","1.0.7","1.1.0","1.1.1","1.3.0"];
        for(var i = 0; i < versionList.length; i++){
            if (server.type.indexOf(versionList[i]) != -1) {
                return versionList[i];
            }
        }
        return "undefined";
    },

    getServerOpacity: function(server) {
        var opacity = server.opacity ? server.opacity : 100;
        return Math.round((opacity / 100)*10)/10;
    },

    getOpenLayerOptions: function(layerDescriptor, overrides) {
        
        var gutterSize = 20;
        if (layerDescriptor.isBaseLayer) {
            gutterSize = 0;
        }
        
        var options = {
            wrapDateLine: true,
            opacity: this.getServerOpacity(this.getServer(layerDescriptor)),
            version: this.getWmsVersionString(this.getServer(layerDescriptor)),
            transitionEffect: 'resize',
            isBaseLayer: layerDescriptor.isBaseLayer,
            buffer: 1,
            gutter: gutterSize,
            projection: new OpenLayers.Projection(layerDescriptor.projection)
        };
        if (overrides) {
            Ext.apply(options, overrides);
        }
        return options;
    },

    getOpenLayerParams: function(layerDescriptor, overrides) {

        if(layerDescriptor.namespace != null) {
            layerDescriptor.name = layerDescriptor.namespace + ":" + layerDescriptor.name;
        }
        var defaultStyle = "";
        if(layerDescriptor.defaultStyle != null)
        {
            defaultStyle = layerDescriptor.defaultStyle;
        }

        var params = {
            layers: layerDescriptor.name,
            transparent: 'TRUE',
            version: this.getWmsVersionString(this.getServer(layerDescriptor)),
            format: this.getServerImageFormat(this.getServer(layerDescriptor)),
            CQL_FILTER: layerDescriptor.cql,
            cql: layerDescriptor.cql,
            queryable: layerDescriptor.queryable,
            styles:layerDescriptor.defaultStyle
        };
        if (overrides) {
            Ext.apply(params, overrides);
        }
        return params;
    },

    getUri: function(server) {
        return server.uri;
    },

    getServerUri: function(layerDescriptor) {
        var serverUri = this.getUri(this.getServer(layerDescriptor));
        if (layerDescriptor.cache == true) {
            serverUri = window.location.href + proxyCachedURL + encodeURIComponent(serverUri);
        }
        return serverUri;
    },

    getParent: function(layerDescriptor) {
        return layerDescriptor.parent;
    },

    getParentId: function(layerDescriptor) {
        if (this.getParent(layerDescriptor)) {
            return this.getParent(layerDescriptor).id;
        }
    },

    getParentName: function(layerDescriptor) {
        if (this.getParent(layerDescriptor)) {
            return this.getParent(layerDescriptor).name;
        }
    },

    setDomainLayerProperties: function(openLayer, layerDescriptor) {
        openLayer.grailsLayerId = layerDescriptor.id;
        openLayer.server= layerDescriptor.server;

        //injecting credentials for authenticated WMSes.  Openlayer doesn;t
        //provide a way to add header information to a WMS request
        openLayer.proxy(proxyURL);
        openLayer.cql = layerDescriptor.cql;
        openLayer.bboxMinX = layerDescriptor.bboxMinX;
        openLayer.bboxMinY = layerDescriptor.bboxMinY;
        openLayer.bboxMaxX = layerDescriptor.bboxMaxX;
        openLayer.bboxMaxY = layerDescriptor.bboxMaxY;
        openLayer.cache = layerDescriptor.cache;
        openLayer.projection = layerDescriptor.projection;
        openLayer.blacklist = layerDescriptor.blacklist;
        openLayer.abstractTrimmed = layerDescriptor.abstractTrimmed;
        openLayer.metadataUrls = layerDescriptor.metadataUrls;
        openLayer.overrideMetadataUrl = layerDescriptor.overrideMetadataUrl;
        openLayer.parentLayerId = this.getParentId(layerDescriptor);
        openLayer.parentLayerName = this.getParentName(layerDescriptor);
        openLayer.allStyles = layerDescriptor.allStyles;
        openLayer.dimensions = layerDescriptor.dimensions;
        openLayer.layerHierarchyPath = layerDescriptor.layerHierarchyPath;
    },

    getLayerUid: function(openLayer) {
        // layerHierarchyPath is the preferred unique identifier for a layer
        var uri = "UNKNOWN";
        var server = openLayer.server;
        
        if ( openLayer.layerHierarchyPath ) {
            uri = openLayer.layerHierarchyPath;
        }
        else if (server) {
            uri = server.uri;
        }
        else if(openLayer.url)
        {
            uri = openLayer.url;
        }

        return uri + "::" +  openLayer.name + (openLayer.cql ? '::' + openLayer.cql : '');
    },

    containsLayer: function(openLayer) {
        var previousLayer = this.activeLayers[this.getLayerUid(openLayer)];
        if (!previousLayer) {
            return false;
        }
        return this.map.getLayer(previousLayer.id) !== null;
    },

    getOpenLayer: function(layerDescriptor, optionOverrides, paramOverrides) {
        var server = layerDescriptor.server;
        var options = this.getOpenLayerOptions(layerDescriptor, optionOverrides);

        var openLayer = new OpenLayers.Layer.WMS(
            layerDescriptor.title,
            this.getServerUri(layerDescriptor),
            this.getOpenLayerParams(layerDescriptor, paramOverrides),
            options
        );
        this.setDomainLayerProperties(openLayer, layerDescriptor);

        // don't add layer twice
        if (this.containsLayer(openLayer)) {
            Ext.Msg.alert(OpenLayers.i18n('layerExistsTitle'), OpenLayers.i18n('layerExistsMsg'));
            return;
        }
        return openLayer;
    },

    waitForDefaultLayers: function(openLayer, showLoading) {
        this.on('defaultlayersloaded', function() {
            this.addLayer(openLayer, showLoading);
        }, this);
    },

    updateAnimationControlsPanel: function(openLayer){
        
        if (!this.animationControlsPanel.isAnimating()) {
            if (openLayer) {
                if (openLayer.isAnimatable()) {
                    //show the panel for the first time!
                    this.animationControlsPanel.setSelectedLayer(openLayer);
                    this.animationControlsPanel.update();
                    this.animationPanel.setVisible(true);
                }
                else {
                    this.animationPanel.setVisible(false);
                }
            }
            else {
                this.animationControlsPanel.removeAnimation();
            }
        }
    },

    addLayer: function(openLayer, showLoading) {
        this.updateAnimationControlsPanel(openLayer);
        if (!this.containsLayer(openLayer) || (openLayer.isAnimated == true)) {
            if (!this.defaultLayersLoaded) {
                this.waitForDefaultLayers(openLayer, showLoading);
            }
            else {
                this._addLayer(openLayer, showLoading);
            }
        }

        if(openLayer.isNcwms()){
            this.getLayerMetadata(openLayer);
        }
    },

    _addLayer: function(openLayer, showLoading) {
        if (showLoading === true) {
            this.registerLayer(openLayer);
        }
        this.map.addLayer(openLayer);
        this.activeLayers[this.getLayerUid(openLayer)] = openLayer;
        this.fireEvent('layeradded', openLayer);
    },

    getMapExtent: function()  {
        var bounds = this.map.getExtent();
        var maxBounds = this.map.maxExtent;
        var top = Math.min(bounds.top, maxBounds.top);
        var bottom = Math.max(bounds.bottom, maxBounds.bottom);
        var left = Math.max(bounds.left, maxBounds.left);
        var right = Math.min(bounds.right, maxBounds.right);
        return new OpenLayers.Bounds(left, bottom, right, top);
    },

    swapLayers: function(newLayer, oldLayer) {
        // exchange new for old
        var layerLevelIndex = this.map.getLayerIndex(oldLayer);
        var oldLayerId = this.getLayerUid(oldLayer);
        if (this.activeLayers[oldLayerId] !== undefined) {
            this.map.removeLayer(this.activeLayers[oldLayerId]);
            // now that removeLayer has removed the old item in the activeLayers array, swap in the new layer
            this.addLayer(newLayer);
            this.map.setLayerIndex(newLayer, layerLevelIndex);
        }

        Ext.MsgBus.publish("selectedLayerChanged", newLayer);
    },

    zoomToLayer: function(openLayer) {
        if (openLayer) {
            if (this.hasBoundingBox(openLayer)) {
                // build openlayer bounding box
                var bounds = new OpenLayers.Bounds(openLayer.bboxMinX, openLayer.bboxMinY, openLayer.bboxMaxX, openLayer.bboxMaxY);
                // ensure converted into this maps projection. convert metres into lat/lon etc
                bounds.transform(new OpenLayers.Projection(openLayer.projection), this.map.getProjectionObject());

                // openlayers wants left, bottom, right, top
                // dont support NCWMS-1.3.0 until issues resolved http://www.resc.rdg.ac.uk/trac/ncWMS/ticket/187
                if(this.getServer(openLayer).type == "WMS-1.3.0") {
                    bounds =  new OpenLayers.Bounds.fromArray(bounds.toArray(true));
                }

                if (bounds && bounds.getWidth() > 0 && bounds.getHeight() > 0) {
                    this.zoomTo(bounds);
                }
            }
        }
    },

    hasBoundingBox: function(openLayer) {
        return !Ext.isEmpty(openLayer.bboxMinX) && !Ext.isEmpty(openLayer.bboxMinY) && !Ext.isEmpty(openLayer.bboxMaxX) && !Ext.isEmpty(openLayer.bboxMaxY);
    },

    zoomTo: function(bounds, closest) {
        if((Math.abs(bounds.left - bounds.right) < 1) && (Math.abs(bounds.top == bounds.bottom) < 1)){
            this.map.setCenter(bounds.getCenterLonLat(), 3);
        }
        else{
            this.map.zoomToExtent(bounds, closest);
        }
    },

    addGrailsLayer: function (id, layerOptions, layerParams, animated, chosenTimes) {

        Ext.Ajax.request({

            url: 'layer/showLayerByItsId?layerId=' + id,
            layerOptions: layerOptions,
            layerParams: layerParams,
            animated: animated,
            chosenTimes: chosenTimes,
            scope: this,
            success: function(resp, options) {
                var layerDescriptor = Ext.util.JSON.decode(resp.responseText);
                if (layerDescriptor) {
                    this.addMapLayer(layerDescriptor, options.layerOptions, options.layerParams, animated, chosenTimes);
                }
            },
            failure: function(resp) {
                Ext.MessageBox.alert('Error', "Sorry I could not load the requested layer:\n" + resp.responseText);
            }
        });
    },

    addExternalLayer: function(layerDescriptor) {
        var serverUri = this.getServerUri(layerDescriptor);

        Ext.Ajax.request({
            url: 'layer/findLayerAsJson?' + Ext.urlEncode({serverUri: serverUri, name: layerDescriptor.name}),
            scope: this,
            success: function(resp) {
                var grailsDescriptor = Ext.util.JSON.decode(resp.responseText);
                if (grailsDescriptor) {
                    grailsDescriptor.cql = layerDescriptor.cql
                    this.addMapLayer(grailsDescriptor);
                }
            },
            failure: function(resp) {
                this.addMapLayer(layerDescriptor);
            }
        });
    },

    addMapLayer: function(layerDescriptor, layerOptions, layerParams, animated, chosenTimes) {
        var openLayer = this.getOpenLayer(layerDescriptor, layerOptions, layerParams);
        if (openLayer) {
            this.addLayer(openLayer, true);
            // zoom map first. may request less wms tiles first off
            if (this.autoZoom === true) {
                this.zoomToLayer(openLayer);
            }

            if(chosenTimes != undefined){
                this.animationControlsPanel.loadFromSavedMap(openLayer, chosenTimes.split("/"));
            }

            Ext.MsgBus.publish("selectedLayerChanged", openLayer);
        }
    },

    getLayerMetadata: function(openLayer) {
        if (openLayer.params.LAYERS) {
            var url = proxyURL + encodeURIComponent(openLayer.url + "?item=layerDetails&layerName=" + openLayer.params.LAYERS + "&request=GetMetadata");
            // see if this layer is flagged a 'cached' layer. a Cached layer is allready requested through our proxy
            if (openLayer.cache === true) {
                // all parameters passed along here will get added to URL
                url = proxyCachedURL + encodeURIComponent(getUri(getServer(openLayer))) + "&item=layerDetails&layerName=" + openLayer.params.LAYERS + "&request=GetMetadata";
            }

            Ext.Ajax.request({
                url: url,
                success: function(resp) {
                    openLayer.metadata = Ext.util.JSON.decode(resp.responseText);
                    // if this layer has been user selected before loading the metadata
                    // reload,  as the date picker details/ form  will be wrong at the very least!
                    Ext.MsgBus.publish("selectedLayerChanged", openLayer);
                }
            });
        }

        return false;
    },

    removeLayer: function(openLayer, newDetailsPanelLayer) {
        if (openLayer.name != 'OpenLayers.Handler.Path') {
            this.map.removeLayer(openLayer, newDetailsPanelLayer);

            delete this.activeLayers[this.getLayerUid(openLayer)];

			//got to do this here do to wierd way ActiveLayersPanel
			//rearranges layers(removing and adding rather than just seting order)
			if(openLayer.isAnimated)
			{
				this.animationControlsPanel.removeAnimation();
			}
			
			Ext.MsgBus.publish("selectedLayerChanged", newDetailsPanelLayer);

            if(newDetailsPanelLayer != null)
                this.animationPanel.setVisible(newDetailsPanelLayer.isAnimatable());
            else
                this.animationPanel.setVisible(false);
        }
    },

    removeAllLayers: function() {
        // Need to collect the layers first and delete outside a loop over
        // the map.layers property because it updates its internal indices and
        // accordingly skips layers as the loop progresses
    	this.updateLoadingImage("none");
    	
        var layersToRemove = [];
        if(this.animationControlsPanel.isAnimating()){
            this.animationControlsPanel.removeAnimation();
        }

        Ext.each(this.map.layers, function(openLayer, allLayers, index) {
            if(openLayer && !openLayer.isBaseLayer) {
                layersToRemove.push(openLayer);
            }
        }, this);
        this.removeAllLayersIn(layersToRemove);

        Ext.MsgBus.publish("selectedLayerChanged", null);
        this._closeFeatureInfoPopup();
    },

    removeAllLayersIn: function(openLayers) {
        Ext.each(openLayers, function(openLayer, allLayers, index) {
            this.removeLayer(openLayer, null);
        }, this);
    },

    getLayerText: function(layerCount) {
        return layerCount === 1 ? "Layer" : "Layers";
    },

    getLayersLoadingText: function(layerCount) {
        return layerCount === 0 ? "" : layerCount.toString();
    },

    registerLayer: function(openLayer) {
        openLayer.events.register('loadstart', this, this.loadStart);
        openLayer.events.register('loadend', this, this.loadEnd);
    },

    buildLayerLoadingString: function(layerCount) {
        return "Loading " + this.getLayersLoadingText(layerCount) +"  " + this.getLayerText(layerCount) + "\u2026";
    },

    loadStart: function() {
        if (this.layersLoading == 0) {
            this.updateLoadingImage("block");
        }
        this.layersLoading += 1;
        jQuery("#loader p").text(this.buildLayerLoadingString(this.layersLoading));
    },

    loadEnd: function() {
        this.layersLoading -= 1;
        this.layersLoading = Math.max(this.layersLoading, 0);
        jQuery("#loader p").text(this.buildLayerLoadingString(this.layersLoading));
        if (this.layersLoading == 0) {
            if (this.spinnerTimeOut) {
                clearTimeout(this.spinnerTimeOut);
                delete this.spinnerTimeOut;
            }
            this.updateLoadingImage("none");
        }
    },

    updateLoadingImage: function(display) {
        if (display == "none" || !this.isVisible()) {
            jQuery("#loader").hide('slow');
        }
        else {
            if (this.layersLoading >= 0) {
                var spinner = this.spinnerForLayerloading;
                this.spinnerTimeOut = setTimeout(function() {
                    jQuery("#loader").show();
                    spinner.spin(jQuery("#jsloader").get(0));
                }, 2000);
            }
        }
    },

    getViewSize: function() {
        return this.container.getViewSize();
    },
    
     getPageX: function() {
        return this.getPosition()[0];
    },
    
    getPageY: function() {
        return this.getPosition()[1];
    },
   
    onAddLayer: function(layerDesc) {
        this.map.addMapLayer(layerDesc);
    },

    onRemoveLayer: function(openLayer) {
        this.map.removeLayer(openLayer);
    }
});
