/**
 * @fileoverview Base functions for sactraffic.org
 * @requires Google Maps API
 * @requires jQuery
 */

/**
 * Fetches the incident JSON and processes it accordingly.
 */
function get_incidents () {
	jQuery.getJSON("/json/STCC-STCC.json", function (incidents) {
		build_incident_list(incidents);
		
		if (typeof trafficmap != "undefined") trafficmap.update(incidents);
	});
}

/**
 * Returns a GLatLng for a given incident.
 * @param {Object} incident The incidnet to get the location for.
 * @deprecated
 */
function get_location (incident) {
	if (google.maps && incident.TBXY && incident.TBXY != "") {
		var point = tbxy2latlng(incident.TBXY);
		return new GLatLng(point.lat, point.lng);
	} else if (google.maps && incident.GeoCode) {
		var point = incident.GeoCode.split(", ");
		return new GLatLng(point[0], point[1]);
	}

	return null;
}

/**
 * Converts the CHP "TBXY" type coordinated to latitude and longitude.
 * @param {String} tbxy_str The TBXY data from the CHP feed.
 */
function tbxy2latlng (tbxy_str) {
	var tbxy = tbxy_str.split(/:/);

	var lat = tbxy[1] * 0.00000274 +  33.172;
 	var lng = tbxy[0] * 0.0000035  - 144.966;

	return { "lat": lat, "lng": lng }
}

/**
 * Provides an ISO 8601 date formate to the Date object
 */
Date.prototype.getISO8601 = function () {
	var month = (this.getMonth() + 1 < 10) ? "0" + this.getMonth() + 1 : this.getMonth() + 1;
	var day = (this.getDate() < 10) ? "0" + this.getDate() : this.getDate();
	var hours = (this.getHours() < 10) ? "0" + this.getHours() : this.getHours();
	var minutes = (this.getMinutes() < 10) ? "0" + this.getMinutes() : this.getMinutes();
	var seconds = (this.getSeconds() < 10) ? "0" + this.getSeconds() : this.getSeconds();

	var offset = this.getTimezoneOffset() / 60;

	return this.getFullYear() + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds + "-0" + offset + "00";
};