Portal.ui.openlayers.MapControls = Ext.extend(Object, {

    constructor: function(cfg) {
        var config = Ext.apply({}, cfg);
        Portal.ui.openlayers.MapControls.superclass.constructor.call(this, config);

        Ext.QuickTips.init();
        
        var container = document.getElementById("navtoolbar");                
                
        var pan = new OpenLayers.Control.Navigation({
            title: 'Pan Control'
        } );
        var zoom = new OpenLayers.Control.ZoomBox({
            title: "Zoom and centre [shift + mouse drag]"
        });
        var toolPanel = new OpenLayers.Control.Panel({
            defaultControl: pan,
            div: container
        });
        toolPanel.addControls( [ zoom,pan] );
        
        this.controls = [
            new OpenLayers.Control.Attribution(),
            new OpenLayers.Control.PanZoomBar(),
            new OpenLayers.Control.MousePosition(),
            new OpenLayers.Control.ScaleLine(),
            new OpenLayers.Control.OverviewMap({
                autoPan: true,
                minRectSize: 30,
                mapOptions:{
                    resolutions: [0.3515625, 0.17578125, 0.087890625, 0.0439453125, 0.02197265625, 0.010986328125, 0.0054931640625, 0.00274658203125, 0.001373291015625, 0.0006866455078125, 0.00034332275390625,  0.000171661376953125]
                }
            }),
            toolPanel
        ];
        
        this.options = {
            theme: null,
            controls: this.controls,
            displayProjection: new OpenLayers.Projection("EPSG:4326"),
            prettyStateKeys: true, // for pretty permalinks,
            resolutions: [  0.17578125, 0.087890625, 0.0439453125, 0.02197265625, 0.010986328125, 0.0054931640625, 0.00274658203125, 0.001373291015625, 0.0006866455078125, 0.00034332275390625,  0.000171661376953125]
        };
    }   
});

Portal.ui.openlayers.ClickControl = Ext.extend(OpenLayers.Control, {
    defaultHandlerOptions: {
        'single': true,
        'double': true,
        'pixelTolerance': 0,
        'stopSingle': false,
        'stopDouble': false
    },

    constructor: function (options) {
        this.handlerOptions = Ext.apply({}, this.defaultHandlerOptions);
        OpenLayers.Control.prototype.initialize.apply(this, arguments);

        this.handler = new OpenLayers.Handler.Click(
            this,
            {
                click: this.onClick
            },
            this.handlerOptions
        );
    }

});
