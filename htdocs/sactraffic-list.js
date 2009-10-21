/**
 * @fileoverview Functions for showing CHP incidents on sactraffic.org
 * @requires jQuery
 */

var showing_details = new Object();

function build_incident_list (incidents) {
	jQuery('.incidents').empty();
	jQuery('#mediainfo').empty();

	$.each(incidents, function(i, incident) {
		if (incident.LogType == "Media Information") {
			if (incident.LogDetails.details.length > 0) {
				display_details(incident.LogDetails.details).appendTo('#mediainfo');
				jQuery('#mediainfo').show();
			}
		} else {
			var incident_ul = (i < 4) ? '#incidents_above' : '#incidents_below';
			var incident_li = display_incident(incident);

			incident_li.appendTo(incident_ul);
		}
	});

	jQuery('.incidents li:last-child').addClass('last');
};

function display_incident (incident) {
	var incident_date = new Date(incident.LogTimeEpoch * 1000);

	var latlng = get_location(incident);
	var show_speed = (incident.LogDetails.details.length > 1) ? "slow" : "fast";
	var detail_message = (incident.LogDetails.details.length > 0) ? 'Click for incident details (' + incident.LogDetails.details.length + ')' : '';
	var details = display_details(incident.LogDetails.details);
	if (showing_details[incident.ID]) details.show();

	var incident_li = jQuery('<li/>').attr('id', incident.ID).attr('title', detail_message).addClass('vevent').append(
		jQuery('<span/>').addClass('logtype summary').html(incident.LogType)
	).append(
		jQuery('<br/>')
	).append(
		jQuery('<span/>').addClass('location').html(incident.Location + "<br/>" + incident.Area)
	).append(
		jQuery('<button/>').html('Show on map').click(
			function () {
				jQuery(this).parent().click();
				location = "http://maps.google.com/maps?q=" + latlng.toUrlValue();
			}
		)
	).append(
		jQuery('<br/>')
	).append(
		jQuery('<span/>').addClass('logtime').html(incident.LogTime)
	).append(
		jQuery('<span/>').addClass('dtstart').html(incident_date.getISO8601())
	).append(
		details
	).hover(
		function () {
			if (trafficmap && latlng) trafficmap.gmap.panTo(latlng);
		},
		function () {
			if (trafficmap && latlng) trafficmap.gmap.panTo(trafficmap.center)
		}
	).click(function () {
		if (incident.LogDetails.details.length > 0) {
			details.toggle(show_speed);
			showing_details[incident.ID] = (showing_details[incident.ID]) ? false : true;
		}
	}).css('background', '#f3f3f3').css('padding', '4px 0 3px 5px');

	if (latlng) {
		var incident_icon = "/images/incident.png";
		if (/Traffic Hazard|Disabled Vehicle/.test(incident.LogType))
			incident_icon = "/images/incident.png";
		else if (/Collision/.test(incident.LogType))
			incident_icon = "/images/accident.png";
		
		jQuery('<img/>')
			.attr('src', incident_icon)
			.attr('height', '18')
			.attr('width', '18')
			.prependTo(incident_li);

		jQuery('<span/>').addClass('geo').append(
			jQuery('<span/>').addClass('latitude').html(latlng.lat())
		).append(
			jQuery('<span/>').addClass('longitude').html(latlng.lng())
		).appendTo(incident_li)
	}

	return incident_li;
}

function display_details (details) {
	var details_ul = jQuery('<ul/>').addClass('details');

	$.each(details, function(i, detail) {
		jQuery('<li/>').append(
			jQuery('<span/>').addClass('detailtime').html(detail.DetailTime)
		).append(
			jQuery('<span/>').addClass('incidentdetail').html(detail.IncidentDetail.replace(/(\*.+?\*)/, '<span class="alert">$1</span>'))
		).appendTo(details_ul);
	});

	return details_ul;
}
