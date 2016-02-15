(function() {
  window.shared || (window.shared = {});

  var QuadConverter = window.shared.QuadConverter = {
    // Fills in data points for start of the school year (8/15) and for current day.
    // Also collapses multiple events on the same day.
    // TODO(kr) should extract this, simplify and test it more thoroughly
    convert: function(attendanceEvents, nowDate, dateRange) {
      var currentYearStart = this.schoolYearStart(moment(nowDate));
      var schoolYearStarts = this.allSchoolYearStarts(dateRange);
      var sortedAttendanceEvents = _.sortBy(attendanceEvents, 'occurred_at');

      var quads = [];
      schoolYearStarts.sort().forEach(function(schoolYearStart) {
        var yearAttendanceEvents = sortedAttendanceEvents.filter(function(attendanceEvent) {
          return this.schoolYearStart(moment(attendanceEvent.occurred_at)) === schoolYearStart;
        }, this);
        var cumulativeEventQuads = this.toCumulativeQuads(yearAttendanceEvents);
        var startOfYearQuad = [schoolYearStart, 8, 15, 0];
        quads.push(startOfYearQuad);
        cumulativeEventQuads.forEach(function(cumulativeQuad) { quads.push(cumulativeQuad); });
        var lastValue = (cumulativeEventQuads.length === 0) ? 0 : _.last(cumulativeEventQuads)[3];
        if (schoolYearStart === currentYearStart) {
          quads.push([nowDate.getFullYear(), nowDate.getMonth() + 1, nowDate.getDate(), lastValue]);
        }
      }, this);

      return _.sortBy(quads, function(quad) { return new Date(quad[0], quad[1], quad[2]) });
    },

    schoolYearStart: function(eventMoment) {
      var year = eventMoment.year();
      var startOfSchoolYear = moment(new Date(year, 7, 15));
      var isEventDuringFall = eventMoment.clone().diff(startOfSchoolYear, 'days') > 0;
      return (isEventDuringFall) ? year : year - 1;
    },

    allSchoolYearStarts: function(dateRange) {
      var schoolYearStarts = dateRange.map(function(date) {
        return this.schoolYearStart(moment(date));
      }, this);
      return _.range(schoolYearStarts[0], schoolYearStarts[1] + 1);
    },

    toCumulativeQuads: function(yearAttendanceEvents) {
      var cumulativeValue = 0;
      var quads = [];
      _.sortBy(yearAttendanceEvents, 'occurred_at').forEach(function(attendanceEvent) {
        var occurrenceDate = moment(attendanceEvent.occurred_at).toDate();
        cumulativeValue = cumulativeValue + 1;
        
        // collapse consecutive events on the same day
        var lastQuad = _.last(quads);
        if (lastQuad && lastQuad[0] === occurrenceDate.getFullYear() && lastQuad[1] === occurrenceDate.getMonth() + 1 && lastQuad[2] === occurrenceDate.getDate()) {
          lastQuad[3] = cumulativeValue;
        } else {
          quads.push([occurrenceDate.getFullYear(), occurrenceDate.getMonth() + 1, occurrenceDate.getDate(), cumulativeValue]);
        }
      });

      return quads;
    }
  };
})();