"""Model classes for SacTraffic."""

from datetime import datetime, timedelta

from google.appengine.ext import db
from google.appengine.api import memcache

class CHPData(db.Model):
	"""Holds the last successful CHP data fetch."""
	data = db.TextProperty(required=True)
	updated = db.DateTimeProperty(auto_now=True)

	def put(self):
		"""Stick the updated date into memcache on put()."""
		memcache.set("%s-updated" % self.key().id_or_name(), self.updated)
		db.Model.put(self)


class CHPIncident(db.Model):
	"""Represents a CHP Incident."""
	CenterID = db.StringProperty(required=True)
	DispatchID = db.StringProperty(required=True)
	LogID = db.StringProperty(required=True)
	LogTime = db.DateTimeProperty()
	LogType = db.StringProperty()
	LogTypeID = db.StringProperty()
	Location = db.StringProperty()
	Area = db.StringProperty()
	ThomasBrothers = db.StringProperty()
	TBXY = db.StringProperty()
	LogDetails = db.BlobProperty()
	geolocation = db.GeoPtProperty()
	updated = db.DateTimeProperty(auto_now=True)

	@property
	def status(self):
		if self.LogTime > datetime.utcnow() - timedelta(minutes=5):
			# less than 5 min old == new
			return 'new'

		chp_data_last_updated = memcache.get("chp_data-updated")
		if chp_data_last_updated is None:
			chp_data = CHPData.get_by_key_name("chp_data")
			memcache.add("chp_data-updated", chp_data.updated)
			chp_data_last_updated = chp_data.updated

		if self.updated < chp_data_last_updated - timedelta(minutes=15):
			# not updated w/in 15 min of the last successful update == inactive
			# 15 min assumes 3 misses on a 5 min cron cycle.
			return 'inactive'

		# what's left... active
		return 'active'


class Camera(db.Model):
	"""Represents a live camera."""
	name = db.StringProperty()
	url = db.LinkProperty()
	geolocation = db.GeoPtProperty()
	width = db.IntegerProperty()
	height = db.IntegerProperty()
	is_online = db.BooleanProperty()
	updated = db.DateTimeProperty(auto_now=True)

