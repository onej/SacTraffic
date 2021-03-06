/**
 * @fileoverview Contains code defining the TrafficMap class.
 * @requires Google Maps API
 * @requires jQuery
 */

/**
 * Creates a new traffic map.
 * @class Represents a traffic map.
 * @param {String} elementId An ID to load the map into.
 * @param {Object} [defaultState] Default state for the map.
 * @param {Boolean} [defaultState.live_cams] To show the live cameras.
 * @param {Boolean} [defaultState.traffic] To show the traffic overlay.
 */
var TrafficMap = function (elementId, defaultState) {
	this.loadState(defaultState);
	this.center = new google.maps.LatLng(38.56, -121.40);
	this.live_cams = [];
	this.traffic_overlay = null;
	this.marker_list = {};
	this.cameraInfoWindow = new google.maps.InfoWindow();

	// Set up the map icons
	this.default_icon = new google.maps.MarkerImage('/images/map_markers.png',
		new google.maps.Size(18, 18),
		new google.maps.Point(18, 0),
		new google.maps.Point(9, 9));

	this.accident_icon = new google.maps.MarkerImage('/images/map_markers.png',
		new google.maps.Size(18, 18),
		new google.maps.Point(0, 0),
		new google.maps.Point(9, 9));

	this.default_icon_shadow = new google.maps.MarkerImage('/images/map_markers.png',
		new google.maps.Size(23, 23),
		new google.maps.Point(60, 0),
		new google.maps.Point(9, 9));

	var sactrafficMapStyle = [
		{
			featureType: "landscape",
			elementType: "all",
			stylers: [
				{ lightness: 100 }
			]
		},
		{
			featureType: "road.highway",
			elementType: "geometry",
			stylers: [
				{ hue: "#ff0000" },
				{ saturation: -25 }
			]
		},
		{
			featureType: "road.arterial",
			elementType: "geometry",
			stylers: [
				{ saturation: -100 },
				{ visibility: "simplified" }
			]
		},
		{
			featureType: "road.arterial",
			elementType: "labels",
			stylers: [
				{ saturation: -100 },
				{ lightness: 10 }
			]
		}
	];
	var sactrafficMapType = new google.maps.StyledMapType(sactrafficMapStyle, {name: "SacTraffic"});

	var mapOptions = {
		zoom: 11,
		center: this.center,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		streetViewControl: false,
		mapTypeControl: false,
		scrollwheel: false,
		navigationControlOptions: {
			style: google.maps.NavigationControlStyle.SMALL
		}
	};

	this.gmap = new google.maps.Map(document.getElementById(elementId), mapOptions);
	this.gmap.mapTypes.set('sactraffic', sactrafficMapType);
	this.gmap.setMapTypeId('sactraffic');

	// Save the map's center after a user drag...
	var self = this;
	google.maps.event.addListener(this.gmap, "dragend", function() {
		self.center = self.gmap.getCenter();
	});

	// Setup the map buttons.
	this.make_traffic_button();
	this.make_camera_button();

	// Set initial map state
	if (this.getState('live_cams')) {
		this.show_live_cams();
	}

	if (this.getState('traffic')) {
		this.show_gtraffic();
	}
}

/**
 * Makes a show/hide traffic button to enable/disable the traffic overlay
 * on the map.
 * @returns {DOMelement}
 */
TrafficMap.prototype.make_traffic_button = function () {
	var self = this;
	var button_container = document.createElement('div');
	button_container.style.paddingBottom = "2px";
	button_container.style.paddingTop = "2px";

	this.traffic_button = jQuery('<div/>').html("Show Traffic").click(function () {
		if (self.getState('traffic')) {
			self.hide_gtraffic();
		} else {
			self.show_gtraffic();
		}
	}).addClass('awesome blue').appendTo(button_container);

	this.gmap.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(button_container);
};

/**
 * Makes a show/hide camera button to enable/disable the live camera markers
 * on the map.
 * @returns {DOMelement}
 */
TrafficMap.prototype.make_camera_button = function () {
	var self = this;
	var button_container = document.createElement('div');
	button_container.style.paddingBottom = "2px";
	button_container.style.paddingTop = "2px";

	this.camera_button = jQuery('<div/>').html("Show Cameras").click(function () {
		if (self.getState('live_cams')) {
			self.hide_live_cams();
		} else {
			self.show_live_cams();
		}
	}).addClass('awesome blue').appendTo(button_container);

	this.gmap.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(button_container);
};

/**
 * Update incident data.
 * @param {Incidents} incidents The incidents object fetched via AJAX.
 */
TrafficMap.prototype.update = function (incidents) {
	this.hide_incidents();
	this.marker_list = {};

	for (var x = 0, xl = incidents.length; x < xl; x++) {
		var incident = incidents.getIncident(x);

		if (incident.status != "inactive" && incident.geolocation && incident.LogType != "Media Information") {
			var marker = this.make_marker(incident);
			this.marker_list[incident.ID] = marker;
		}
	}
};

/**
 * Show a single incident on the map.
 * @param {Incidents} incidents The incidents object fetched via AJAX.
 * @param {String} incident_id The incident ID to show.
 */
TrafficMap.prototype.show_incident = function (incidents, incident_id) {
	for (var x = 0, xl = incidents.length; x < xl; x++) {
		var incident = incidents[x];
		if (incident.ID == incident_id) {
			if (incident.geolocation) {
				var marker = this.make_marker(incident);
				this.center = marker.getPosition();
				this.recenter();
				this.gmap.setZoom(13);
			}
			break;
		}
	}
};

/**
 * Shows the live cams.
 */
TrafficMap.prototype.show_live_cams = function () {
	if (this.live_cams.length === 0) {
		var self = this;

		jQuery.ajax({
			url: "/cameras.txt",
			dataType: "text",
			success: function (cameras) {
				var camera_icon = new google.maps.MarkerImage("/images/map_markers.png",
					new google.maps.Size(24, 24),
					new google.maps.Point(36, 0),
					new google.maps.Point(12, 12));

				var rows = cameras.split(/\n/);
				for (var x = 1, xl = rows.length; x < xl; x++) {
					if (rows[x] === '' || rows[x].match(/^#/)) {
						continue;
					}

					var fields = rows[x].split(/,/);
					var camera = {
						name: fields[0],
						url: fields[1],
						location: {
							lat: fields[2],
							lon: fields[3]
						}
					};

					self.live_cams.push(make_camera_marker(camera));
				}

				function make_camera_marker (camera) {
					var marker = new google.maps.Marker({
						position: new google.maps.LatLng(camera.location.lat, camera.location.lon),
						icon: camera_icon,
						title: camera.name,
						map: self.gmap
					});

					google.maps.event.addListener(marker, 'click', function() {
						self.cameraInfoWindow.setContent('<div class="camera marker"><div class="name">Live Video</div><div class="button"><div class="awesome blue" onclick="window.open(\'' +  camera.url + '\')">' + camera.name + '</div></div>');
						self.cameraInfoWindow.open(self.gmap, marker);
					});

					return marker;
				}

			}
		});
	} else {
		for (var x = 0, xl = this.live_cams.length; x < xl; x++) {
			var cam_marker = this.live_cams[x];
			cam_marker.setMap(this.gmap);
		}
	}

	this.camera_button.html('Hide Cameras');
	this.setState('live_cams', true);
};

/**
 * Hides the live cams.
 */
TrafficMap.prototype.hide_live_cams = function () {
	for (var x = 0, xl = this.live_cams.length; x < xl; x++) {
		var cam_marker = this.live_cams[x];
		cam_marker.setMap(null);
	}

	this.camera_button.html('Show Cameras');
	this.setState('live_cams', false);
};

/**
 * Shows Google traffic info.
 */
TrafficMap.prototype.show_gtraffic = function () {
	this.traffic_overlay = new google.maps.TrafficLayer();
	this.traffic_overlay.setMap(this.gmap);

	this.traffic_button.html('Hide Traffic');
	this.setState('traffic', true);
};

/**
 * Hides Google traffic info.
 */
TrafficMap.prototype.hide_gtraffic = function () {
	if (this.traffic_overlay) {
		this.traffic_overlay.setMap(null);
	}

	this.traffic_button.html('Show Traffic');
	this.setState('traffic', false);
};

/**
 * Centers the map on the given incident ID.
 * @param {String} incident_id The incident ID to center on.
 */
TrafficMap.prototype.center_on_id = function (incident_id) {
	if (this.marker_list[incident_id]) {
		this.gmap.panTo(this.marker_list[incident_id].getPosition());
	}
};

/**
 * Recenters the map on the saved center.
 */
TrafficMap.prototype.recenter = function () {
	this.gmap.panTo(this.center);
};

TrafficMap.prototype.centerOnGeo = function (lat, lon) {
	this.gmap.panTo(new google.maps.LatLng(lat, lon));
};

/**
 * Initially loads map state from localSupport, falls back to given defaults.
 * @param {Object} defaultState Default state to use if none saved.
 */
TrafficMap.prototype.loadState = function (defaultState) {
	var state = null;

	// Try localStorage first
	if ('localStorage' in window && window['localStorage'] !== null) {
		state = JSON.parse(localStorage.getItem('trafficmap_state')) || null;
	}

	// If localStorage didn't work try some defaults...
	if (!state && typeof(defaultState) === 'object') {
		state = defaultState;
	}

	this._mapstate = state || {};
};

/**
 * Getter for map state.
 * @param {String} key The key to get.
 * @return {Any} The value.
 */
TrafficMap.prototype.getState = function (key) {
	return this._mapstate[key];
};

/**
 * Setter for map state.  Also saved to localStorage if possible.
 * @param {String} key The key to set.
 * @param {Any} value The value to set.
 */
TrafficMap.prototype.setState = function (key, value) {
	this._mapstate[key] = value;
	if ('localStorage' in window && window['localStorage'] !== null) {
		localStorage.setItem('trafficmap_state', JSON.stringify(this._mapstate));
	}
};

/**
 * Hides the CHP incidents.
 */
TrafficMap.prototype.hide_incidents = function () {
	for (var id in this.marker_list) {
		var marker = this.marker_list[id];
		marker.setMap(null);
	}
};

/**
 * Makes a GMarker for a given incident.
 * @param {Incident} incident The incident.
 * @returns {GMarker}
 */
TrafficMap.prototype.make_marker = function (incident) {
	var self = this;
	var icon = this.default_icon;
	var incident_date = new Date(incident.LogTime * 1000);

	if (/Traffic Hazard|Disabled Vehicle/.test(incident.LogType)) {
		// Hazard icon...
		// Note: placeholder, we don't actually have a hazard icon
	} else if (/Collision|Fatality|Hit \& Run/.test(incident.LogType)) {
		// Collision icon...
		icon = this.accident_icon;
	}

	var marker = new google.maps.Marker({
		position: new google.maps.LatLng(incident.geolocation.lat, incident.geolocation.lon),
		icon: icon,
		shadow: this.default_icon_shadow,
		title: incident.LogType,
		map: this.gmap
	});

	var infowindow = new google.maps.InfoWindow({
		content: '<div class="marker"><div class="logtype">' + incident.LogType + '</div><div class="location">' + incident.Location + '</div><div class="logtime">' + incident_date.getPrettyDateTime() + '</div></div>'
	});

	google.maps.event.addListener(marker, 'click', function() {
		infowindow.open(self.gmap, marker);
	});

	return marker;
};
