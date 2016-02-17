/*global $ L require */

// Load CSS and JS
function loadCss(filename){
    var fileref=document.createElement("link");
    fileref.setAttribute("rel", "stylesheet");
    fileref.setAttribute("type", "text/css");
    fileref.setAttribute("href", filename);
    document.getElementsByTagName( "head" )[0].appendChild( fileref );
}


require.config({
    paths: {
        leaflet: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet'
    },
    shim: {
        leaflet: {
            exports: 'L'
        }
    }
});

function initMap(L, div, lat, lon, zoom, xlim, ylim, eventfunc, k) {
    loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.css');
    $(div).resizable({stop: function() { map.invalidateSize(); }});
    var map = L.map($(div)[0]);
    
    if(xlim,ylim){ //fit to bbox
        map.fitBounds([[ylim[0],xlim[0]],[ylim[1],xlim[1]]]);
    }
    else{ //zoom to lat,lon 
        map.setView([lat,lon], zoom);
    }

    //Register callbacks
    for(var e in eventfunc){
        map.on(e, makeEventFunc(eventfunc[e],map));
    }

    //L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    L.tileLayer('http://{s}.tile.stamen.com/toner-lite/{z}/{x}/{y}.png')
        .addTo(map);
    
    if (!window.rcleaflet) window.rcleaflet = {};
    window.rcleaflet[div] = { 
        'L':L, 'map':map, 'points':[], 'polylines':[],
        'segments':[], 'polygons': [], 'markers':[]
    };
    
    k(null, div);
}

function _genSteps (lat, lon, durations, stepsize) {
    var allsteps = [];
    for(var i=0; i< lat.length-1; i++){
        var s = Math.ceil(durations[i]/stepsize);
        s = Math.max(s,1);
        var d = L.latLng(lat[i+1]-lat[i],lon[i+1]-lon[i]);
        d = L.latLng(d.lat/s,d.lng/s);
        var steps = new Array(s);
        for(var j=0; j < s-1; j++){
            steps[j] = L.latLng(lat[i]+d.lat*(j+1),lon[i]+d.lng*(j+1));
        }
        steps[s-1] = L.latLng(lat[i+1],lon[i+1]);
        allsteps[i] = steps;
    }
    return allsteps;
}

function makeEventFunc(f,obj) {
    return function(){
        f(function(err,res){
            console.log('complete callback',obj,err,res);
        });
    };
};

(function(){
    return {
        map:function(div, lat, lon, zoom, xlim, ylim, eventfunc, k){
            // this serves as an init function,
            // it works because it really blocks
            try{
                var L = window.rcleaflet[div].L;
                initMap(L,div,lat,lon,zoom,xlim,ylim,eventfunc,k);
            }
            catch(e){ // Load Leaflet
                require(['leaflet'],function(L){
                    initMap(L,div,lat,lon,zoom,xlim,ylim,eventfunc,k);
                });
            }
        },

        getCurrentView: function(div, k){
            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;
            var b = map.getBounds();
            var z = map.getZoom();
            var ne = b.getNorthEast();
            var sw = b.getSouthWest();

            k(null, {
                zoom: z,
                ylim:[sw.lat,ne.lat],
                xlim:[sw.lng,ne.lng]
            });          
        },

	remove: function(div, k) {
	    var map = window.rcleaflet[div].map;
	    map.remove();
	    k(null, true);
	},

	panTo: function(div, lat, lon, k) {
	    var map = window.rcleaflet[div].map;
	    var L = window.rcleaflet[div].L;
	    map.panTo(new L.LatLng(lat, lon));
	    k(null, true);
	},
        
        removePolygons: function(div,k){ //temp function
            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;
            
            window.rcleaflet[div].polygons.forEach(function(d){
                map.removeLayer(d);
            });
            k(null,true);
        },

        points:function(div, lat, lon, col, fill, colA, fillA, rad, lwd, 
                        popup, eventfunc, k) {
            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;
            if (!lat.length) {
                lat = [lat];
                lon = [lon];
                popup = [popup];
            }

            for (var i = 0; i < lat.length; i++){
                var opts =  {
                    color: col.charAt ? col : col[i],
                    fillColor: fill.charAt ? fill : fill[i],
                    fillOpacity: fillA.length ? fillA[i] : fillA,
                    opacity: colA.length ? colA[i] : colA,
                    weight: lwd.length ? lwd[i] : lwd
                };
                var r = rad.length? rad[i]:rad; 
                var c = L.circle([lat[i], lon[i]], r , opts);

                if (popup && popup[i]){
                    c.bindPopup(popup[i]);
                }

                //Register callbacks
                for(var e in eventfunc){
                    map.on(e, makeEventFunc(eventfunc[e],c));
                }
                c.addTo(map);
                window.rcleaflet[div].points.push(c);
            }

            k(null, true);
        },
        
        segments:function(div, lat1, lon1, lat2, lon2, col, lty, lwd, k) {
            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;

            if(!lat1.length && !lon1.length &&
               !lat2.length && !lon2.length && !lwd.length){
                //special case for a single element
                lat1 = [lat1];
                lon1 = [lon1];
                lat2 = [lat2];
                lon2 = [lon2];
                lwd = [lwd];
            }
            for(var i=0; i < lat1.length; i++){
                var opts={
                    color: col.charAt ? col : col[i],
                    dashArray: lty.charAt ? lty : lty[i],
                    weight: lwd.length ? lwd[i] : lwd
                };                
                var pl = L.polyline([[lat1[i],lon1[i]],
                                     [lat2[i],lon2[i]]],opts);
                pl.addTo(map);
                window.rcleaflet[div].polylines.push(pl);
            }
            k(null, true);
        },
        
        markers:function(div, lat, lon, popup,iconurl,
                         eventfunc,k) {
            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;
            
            if (!lat.length){ //make them arrays
                lat = [lat];
                lon = [lon];
            }
            
            if(popup && !Array.isArray(popup)){
                popup=Array.apply(null,Array(lat.length)).map(function(d){ 
                    return popup;
                });
            }
            
            if(iconurl && !Array.isArray(iconurl)){
                iconurl=Array.apply(null,Array(lat.length)).map(function(d){ 
                    return iconurl;
                });
            }
            
            for (var i = 0; i < lat.length; i++){
                var myicon= new L.Icon.Default();
                if(iconurl && iconurl[i]){
                    myicon=L.icon({iconUrl:iconurl[i]});
                }

                var m = L.marker([lat[i], lon[i]],{icon:myicon});

                if (popup && popup[i]){
                    m.bindPopup(popup[i]);
                }
                
                //Register callbacks
                for(var e in eventfunc){
                    m.on(e, makeEventFunc(eventfunc[e],m));
                }
                m.addTo(map);
                window.rcleaflet[div].markers.push(m);
            }

            k(null, true);
        },

        polyline:function(div, lat, lon, col, lty, lwd,k) {
            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;
            var points = [];

            for(var i = 0; i < lat.length; i++){
                points.push(L.latLng(lat[i], lon[i]));
            }
            var opts={
                color: col.charAt ? col : col[i],
                dashArray: lty.charAt ? lty : lty[i],
                weight: lwd.length ? lwd[i] : lwd
            };                

            var pl = L.polyline(points, opts);
            pl.addTo(map);
            window.rcleaflet[div].polylines.push(pl);

            k(null, true);
        },

        polygon:function(div, lat, lon, popup, color, opacity,
                         fillColor, fillOpacity, weight, k) {
            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;
            var boundaries = [];
            var points = [];

            for(var i = 0; i < lat.length; i++){
                if (!isNaN(lat[i])){
                    points.push(L.latLng(lat[i], lon[i]));
                }
                else{
                    var dir = points.reduce(function(p,c,i,arr){
                        if (i >= arr.length-1){ //
                            return p;
                        }
                        
                        return p + (arr[i+1].lng - arr[i].lng )*
                            (arr[i+1].lat+arr[i].lat);
                    },0);

                    points.pop();
                    if (dir >= 0){ //clockwise
                        boundaries.push([points.slice()]);
                    }
                    else{  //counter clockwise (hole)
                        boundaries[boundaries.length-1].push(points.slice());
                    }
                    points = [];
                }
            }

            //process the last set of points
            dir = points.reduce(function(p,c,i,arr){
                if (i >= arr.length-1){ //
                    return p;
                }
                return p + (arr[i+1].lng - arr[i].lng )*
                    (arr[i+1].lat + arr[i].lat);
            },0);

            points.pop();
            if (dir >=  0){ //clockwise
                boundaries.push([points.slice()]);
            }
            else{  //counter clockwise (hole)
                boundaries[boundaries.length-1].push(points.slice());
            }

            var mp=L.multiPolygon(boundaries, {color: color,
                                               opacity: opacity,
                                               fillColor: fillColor,
                                               fillOpacity: fillOpacity,
                                               weight: weight });
            if(popup){
                mp.bindPopup(popup);
            }
            mp.addTo(map);
            window.rcleaflet[div].polygons.push(mp);
            
            k(null, true);
        },

        animatedPolyline: function(div,lat,lon,durations,maxpts,
                                   stepsize,delay,col,lty,lwd,k){
            stepsize = stepsize || 1000.0/30;
            delay = delay || 1000;

            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;
            
            var i=0;
            var opts={
                color: col.charAt ? col : col[i],
                dashArray: lty.charAt ? lty : lty[i],
                weight: lwd.length ? lwd[i] : lwd
            };                

            var pl = L.polyline([[lat[0],lon[0]]],opts);
            pl.addTo(map);

            var s = _genSteps(lat,lon,durations,stepsize);

            var start = window.performance.now();
            var ll = pl.getLatLngs();
            var lastp = ll[ll.length-1];
            ll.push(lastp);
            pl.setLatLngs(ll); //dup the last point
            var op = window.performance.now()-start;

            //estimate the required time for setting the polyline
            stepsize -= op;
            stepsize = Math.max(stepsize,0);
            console.log(stepsize);

            window.setTimeout(function(){
                var timer = window.setInterval(function(){
                    var ll = pl.getLatLngs();
                    ll[ll.length-1]=s[0].shift();

                    if (s[0].length < 1) { //last pt of the current interval
                        ll.push(ll[ll.length-1]); //repeat the last pt;
                        s.shift(); //remove the empty list
                    }
                    //set the new latlng
                    if(maxpts >= 1){
                        ll = ll.slice(-maxpts);
                    }
                    pl.setLatLngs(ll);

                    if (s.length < 1){
                        window.clearInterval(timer);
                        ll = pl.getLatLngs();
                        ll.pop();
                        pl.setLatLngs(ll);
                        console.log(pl.getLatLngs());
                    }
                },stepsize);
            },delay);
            k(null, true);
        },

        animatedMarker: function (div,lat, lon, durations,stepsize,delay,k){
            stepsize = stepsize || 1000.0/30;
            delay = delay || 1000;

            var L = window.rcleaflet[div].L;
            var map = window.rcleaflet[div].map;
            var m = L.marker([lat[0],lon[0]]);
            m.addTo(map);

            var s = _genSteps(lat,lon,durations,stepsize);

            var start = window.performance.now();
            var ll = m.getLatLng();
            m.setLatLng(ll); //set position
            var op = window.performance.now()-start;

            //estimate the required time for setting the marker
            stepsize -= op;
            stepsize = Math.max(stepsize,0);
            console.log(stepsize);

            window.setTimeout(function(){
                var timer = window.setInterval(function(){
                    m.setLatLng(s[0].shift());

                    if (s[0].length < 1) { //last pt of the current interval
                        s.shift(); //remove the empty list
                    }
                    if (s.length < 1){
                        window.clearInterval(timer);
                    }
                },stepsize);
            },delay);
            k(null, true);
        }
    };
})();
