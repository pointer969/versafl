/*global QUnit, window */

sap.ui.define([
	"sap/ui/qunit/QUnitUtils",
	"sap/ui/unified/CalendarOneMonthInterval",
	"sap/ui/unified/calendar/CalendarDate",
	"sap/ui/unified/CalendarAppointment",
	"sap/m/PlanningCalendar",
	"sap/m/PlanningCalendarRow",
	"sap/m/SearchField",
	"sap/m/Button",
	"sap/ui/unified/DateTypeRange",
	"sap/ui/unified/library",
	"sap/base/Log"
], function(qutils, CalendarOneMonthInterval, CalendarDate, CalendarAppointment, PlanningCalendar,
	PlanningCalendarRow, SearchField, Button, DateTypeRange, unifiedLibrary, Log) {
	"use strict";

	// set language to en-US, since we have specific language strings tested
	sap.ui.getCore().getConfiguration().setLanguage("en_US");

	var CalendarDayType = unifiedLibrary.CalendarDayType;
	//the SUT won't be destroyed when single test is run
	var bSkipDestroy = !!jQuery.sap.getUriParameters().get("testId");

	QUnit.module("Private API", {
		beforeEach: function () {
			this.oPCStartDate = new Date(2015, 0, 1, 8, 0, 0);
			this.oPC = new PlanningCalendar('pc1', {
				startDate: this.oPCStartDate,
				viewKey: sap.ui.unified.CalendarIntervalType.OneMonth,
				rows: [
					new PlanningCalendarRow("pc1-Row1", {
						icon: "sap-icon://employee",
						title: "Max Mustermann",
						text: "Musterteam",
						tooltip: "Header tooltip",
						intervalHeaders: [
							new CalendarAppointment("pc1-row1-R1H1", {
								startDate: new Date(2015, 0, 1, 9, 0),
								endDate: new Date(2015, 0, 1, 11, 0),
								type: CalendarDayType.Type02,
								title: "SAPUI5",
								tooltip: "Test",
								icon: "sap-icon://sap-ui5"
							})
						],
						appointments: [
							new CalendarAppointment("pc1-row1-R1A1", {
								startDate: new Date(2015, 0, 1, 8, 0),
								endDate: new Date(2015, 0, 1, 9, 0),
								type: CalendarDayType.Type01,
								title: "App 1",
								icon: "../../ui/unified/images/m_01.png",
								tooltip: "Tooltip",
								text: "Text"
							}),
							new CalendarAppointment("pc1-row1-R1A2", {
								startDate: new Date(2015, 0, 1, 7, 0),
								endDate: new Date(2015, 0, 1, 11, 0),
								type: CalendarDayType.Type02,
								title: "App 2",
								icon: "sap-icon://home",
								tooltip: "Tooltip",
								text: "Text",
								tentative: true
							}),
							new CalendarAppointment("pc1-row1-R1A3", {
								startDate: new Date(2015, 0, 2, 8, 30),
								endDate: new Date(2015, 0, 2, 9, 30),
								type: CalendarDayType.Type03,
								title: "App3",
								icon: "sap-icon://home",
								tooltip: "Tooltip"
							}),
							new CalendarAppointment("pc1-row1-R1A4", {
								startDate: new Date(2014, 6, 1),
								endDate: new Date(2014, 6, 2),
								type: CalendarDayType.Type04,
								title: "Meeting 4",
								tooltip: "Tooltip 4",
								selected: true
							})
						]
					}),
					new PlanningCalendarRow("pc1-Row2", {
						icon: "../../ui/unified/images/m_01.png",
						title: "Edward",
						text: "the great",
						tooltip: "Header tooltip",
						nonWorkingDays: [2, 3],
						nonWorkingHours: [11, 12],
						intervalHeaders: [
							new CalendarAppointment("pc1-row2-R2H1", {
								startDate: new Date(2015, 0, 2),
								endDate: new Date(2015, 0, 2, 23, 59),
								type: CalendarDayType.Type01,
								title: "SAPUI5",
								tooltip: "Test",
								icon: "sap-icon://sap-ui5"
							})
						],
						appointments: [
							new CalendarAppointment("pc1-row2-R2A1", {
								startDate: new Date(2015, 0, 1),
								endDate: new Date(2015, 0, 2, 23, 59),
								type: CalendarDayType.Type01,
								title: "App 1",
								tooltip: "Tooltip",
								text: "Text"
							})
						]
					})
				],
				specialDates: [
					new DateTypeRange("pc1-SD1", {
						startDate: new Date(2015, 0, 6),
						type: CalendarDayType.Type01,
						tooltip: "Heilige 3 Könige"
					}),
					new DateTypeRange("pc1-SD2", {
						startDate: new Date(2015, 0, 1, 12, 0),
						endDate: new Date(2015, 0, 1, 14, 0),
						type: CalendarDayType.Type02,
						tooltip: "Lunch"
					})
				],
				toolbarContent: [new SearchField(), new Button()],
				appointmentSelect: function (oEvent) {
					Log.info("Appointment select event fired");
				},
				startDateChange: function (oEvent) {
					Log.info("Start date change event fired");
				},
				rowSelectionChange: function (oEvent) {
					Log.info("Row selection change event fired");
				},
				viewChange: function (oEvent) {
					Log.info("ViewChange event fired");
				},
				intervalSelect: function (oEvent) {
					Log.info("IntervalSelect event fired");
				}
			});
			this.oPC.placeAt("content");
			sap.ui.getCore().applyChanges();
			this.sut = this.oPC.getAggregation("table").getAggregation("infoToolbar").getContent()[1];
			this.sutMonth = this.sut.getAggregation("month")[0];
		},
		afterEach: function () {
			if (!bSkipDestroy) {
				this.oPC.destroy();
			}
			this.oPC = undefined;
		}
	});

	QUnit.test("_focusDateExtend sets correct focused dates", function(assert) {
		//prepare
		var oSut = this.oPC._oOneMonthInterval,
				oSpyDatesRow_setDate = this.spy(this.sutMonth, "setDate"),
				oSpy_setFocusedDate = this.spy(oSut, "_setFocusedDate");
		oSut._oFocusDateOneMonth = new CalendarDate(2015, 0, 31);

		//act
		oSut._focusDateExtend();

		//assert
		assert.equal(oSpy_setFocusedDate.callCount, 1, "When this._oFocusedDateOneMonth present, it is set as focused date " +
		"(call to _setFocusedDate)");
		assert.equal(oSpy_setFocusedDate.getCall(0).args[0].toUTCJSDate().toString(), new Date(Date.UTC(2015, 0, 31)).toString(),
				"_setFocusedDate should be called with certain date parameter");

		assert.equal(oSpyDatesRow_setDate.callCount, 1, "When this._oFocusedDateOneMonth present, it is set to " +
		"datesrow(call to DatesRow#.setDate)");
		assert.equal(oSpyDatesRow_setDate.getCall(0).args[0].toString(), new Date(2015, 0, 31).toString(),
				"DatesRow#setDate should be called with certain date parameter");
	});

	QUnit.test("'_shiftStartFocusDates' shifts startDate and focusedDate according to given amount of time", function(assert) {
		//prepare
		var oSut = this.oPC._oOneMonthInterval,
			oSpy_setFocusedDate = this.spy(oSut, "_setFocusedDate"),
			oSpy_setStartDate = this.spy(oSut, "_setStartDate"),
			oStartDate = new CalendarDate(2014, 11, 1),
			oFocusedDate = new CalendarDate(2014, 11, 1),
			iDays;

		iDays = 31; //to move to the next month
		oSut._shiftStartFocusDates(oStartDate, oFocusedDate, iDays);

		//assert
		assert.equal(oSpy_setFocusedDate.getCall(0).args[0].toUTCJSDate().toString(),
				new Date(Date.UTC(2015, 0, 1)).toString(),
				"_setFocusedDate should be called with certain date parameter");
		assert.equal(oSpy_setStartDate.getCall(0).args[0].toUTCJSDate().toString(),
				new Date(Date.UTC(2015, 0, 1)).toString(),
				"_setStartDate should be called with certain date parameter");

		iDays = -31; //to move to the previous month
		oSut._shiftStartFocusDates(oStartDate, oFocusedDate, iDays);

		//assert
		assert.equal(oSpy_setFocusedDate.getCall(0).args[0].toUTCJSDate().toString(),
				new Date(Date.UTC(2014, 11, 1)).toString(),
				"_setFocusedDate should be called with certain date parameter");
		assert.equal(oSpy_setStartDate.getCall(0).args[0].toUTCJSDate().toString(),
				new Date(Date.UTC(2014, 11, 1)).toString(),
				"_setStartDate should be called with certain date parameter");
	});

	QUnit.test("'_shiftStartFocusDates' sets focused date correctly when the previous one is 31st of" +
		"the previous month", function(assert) {
		//prepare
		var oSut = this.oPC._oOneMonthInterval,
			oSpy_setFocusedDate = this.spy(oSut, "_setFocusedDate"),
			oStartDate = new CalendarDate(2017, 0, 1),
			oFocusedDate = new CalendarDate(2017, 0, 31),
			iDays;

		//act
		iDays = 31; //to move to the next month
		oSut._shiftStartFocusDates(oStartDate, oFocusedDate, iDays);

		//assert
		assert.equal(oSpy_setFocusedDate.getCall(0).args[0].toString(),
			new CalendarDate(2017, 1, 1).toString(),
			"the previously selected date was Jan 31st, shift to the right sets the focus to Feb 1st");
	});

	QUnit.test("navigation via right arrow works correctly", function(assert) {
		//prepare
		var oSut = this.oPC._oOneMonthInterval,
			oStartDate = new CalendarDate(2017, 0, 1),
			oFocusedDate = new CalendarDate(2017, 0, 31),
			iDays;

		//act
		iDays = 31; //to move to the next month
		oSut._shiftStartFocusDates(oStartDate, oFocusedDate, iDays); //navigate to Feb 1st
		oSut._shiftStartFocusDates(oStartDate, oFocusedDate, iDays); //navigate to March 1st

		//assert
		assert.equal(jQuery('#' + oSut.getId() + '-content div:visible:last')[0].textContent,
			"31Fri", "the last visible date is March 31st");
	});

	QUnit.module("Calendar Picker");
	QUnit.test("Chosen date from the date picker is set as start date of the underying view.", function(assert) {
		// arrange
		var $Date,
			oCalP = new CalendarOneMonthInterval("CalP",{
						startDate: new Date("2017", "7", "9"),
						pickerPopup: true
					}).placeAt("qunit-fixture");

		sap.ui.getCore().applyChanges();

		assert.ok(!jQuery("#CalP--Cal").get(0), "Calendar3: Calendar picker not initial rendered");
		qutils.triggerEvent("click", "CalP--Head-B1");
		assert.ok(jQuery("#CalP--Cal").get(0), "Calendar picker rendered");
		assert.equal(jQuery("#CalP--Cal").parent().attr("id"), "sap-ui-static", "Calendar picker rendered in static area");
		assert.ok(jQuery(jQuery("#CalP--Cal").get(0)).is(":visible"), "Calendar picker visible");

		// select May 2017
		$Date = jQuery("#CalP--Cal--MP-m4");
		$Date.focus();
		qutils.triggerKeyboardEvent($Date[0], jQuery.sap.KeyCodes.ENTER, false, false, false);

		assert.equal(sap.ui.getCore().byId("CalP").getStartDate().getMonth(), 4, "start date is set correctly");

		assert.ok(jQuery("#CalP--Cal").get(0), "Calendar picker still rendered after closing");
		assert.ok(!jQuery(jQuery("#CalP--Cal").get(0)).is(":visible"), "Calendar picker not visible after closing");

		// clean
		oCalP.destroy();
	});


	QUnit.test("fireStartDateChange", function(assert) {
		// arrange
		var $Date, oCalStartDate,
			oCalP = new CalendarOneMonthInterval("CalP",{
						startDate: new Date("2015", "7", "9"),
						pickerPopup: true
					}),
			oSpyFireDateChange = this.spy(oCalP, "fireStartDateChange");

		oCalP.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		assert.ok(!jQuery("#CalP--Cal").get(0), "Calendar picker not initial rendered");
		qutils.triggerEvent("click", "CalP--Head-B1");

		// click on Year button inside calendar picker
		qutils.triggerEvent("click", "CalP--Cal--Head-B2");
		// click on 2016
		$Date = jQuery("#CalP--Cal--YP-y20160101");
		$Date.focus();
		qutils.triggerKeyboardEvent($Date[0], jQuery.sap.KeyCodes.ENTER, false, false, false);

		// click on September
		$Date = jQuery("#CalP--Cal--MP-m8");
		$Date.focus();
		qutils.triggerKeyboardEvent($Date[0], jQuery.sap.KeyCodes.ENTER, false, false, false);

		oCalStartDate = sap.ui.getCore().byId("CalP").getStartDate();

		assert.equal(oCalStartDate.getMonth(), 8, "start date, month is set correctly");
		assert.equal(oCalStartDate.getFullYear(), 2016, "start date, year is set correctly");
		assert.strictEqual(oSpyFireDateChange.callCount, 1, "CalendarOneMonthInterval 'fireStartDateChange' was called once after selecting month, year and date");

		// clean
		oCalP.destroy();
	});


	QUnit.test("User opens the picker but escapes it - click outside for desktop or click cancel button", function(assert) {
		// arrange
		var oSpyCancel = this.spy(sap.ui.unified.CalendarOneMonthInterval.prototype, "fireCancel");
		var oCalP = new CalendarOneMonthInterval("CalP",{
			pickerPopup: true
			}).placeAt("qunit-fixture");

		sap.ui.getCore().applyChanges();

		qutils.triggerEvent("click", "CalP--Head-B1");
		assert.ok(jQuery(jQuery("#CalP--Cal").get(0)).is(":visible"), "Calendar picker visible");

		sap.ui.test.qunit.triggerKeydown(sap.ui.getCore().byId("CalP").getFocusDomRef(), jQuery.sap.KeyCodes.ESCAPE);
		assert.ok(!jQuery(jQuery("#CalP--Cal").get(0)).is(":visible"), "Calendar picker not visible after closing");
		assert.strictEqual(oSpyCancel.callCount, 1, "CalendarOneMonthInterval 'fireCancel' was called once");

		// clean
		oCalP.destroy();
	});


	QUnit.test("Text of the direct navigation button is correct", function(assert) {
		// arrange
		var $Date,
			oCalP = new CalendarOneMonthInterval("CalP",{
						startDate: new Date("2017", "4", "11"),
						pickerPopup: true
					}).placeAt("qunit-fixture");

		sap.ui.getCore().applyChanges();

		qutils.triggerEvent("click", "CalP--Head-B1");

		// click on December
		$Date = jQuery("#CalP--Cal--MP-m11");
		$Date.focus();
		qutils.triggerKeyboardEvent($Date[0], jQuery.sap.KeyCodes.ENTER, false, false, false);

		assert.strictEqual(jQuery("#CalP--Head-B1").text(), "December 2017", "button text is correct");

		// clean
		oCalP.destroy();
	});


	QUnit.test("The user can select month & year, but cannot select dates", function(assert) {
		// arrange
		var oCalP = new CalendarOneMonthInterval("CalP",{
						startDate: new Date("2017", "4", "11"),
						pickerPopup: true
					}).placeAt("qunit-fixture");

		sap.ui.getCore().applyChanges();

		qutils.triggerEvent("click", "CalP--Head-B1");

		assert.ok(jQuery("#CalP--Cal--MP").is(":visible"), "month picker is initialy visible");
		assert.ok(!jQuery("#CalP--Cal--Head-B0").is(":visible"), "day button is not visible");
		assert.ok(!jQuery("#CalP--Cal--Head-B1").is(":visible"), "month button is not visible");
		assert.ok(jQuery("#CalP--Cal--Head-B2").is(":visible"), "year button is visible");

		sap.ui.test.qunit.triggerKeydown(sap.ui.getCore().byId("CalP").getFocusDomRef(), jQuery.sap.KeyCodes.ESCAPE);

		// clean
		oCalP.destroy();
	});


	QUnit.test("Changing of the pickerPopup mode doesn't break min and max date inside yearPicker aggregation", function(assert) {
		// arrange
		var oCalP = new CalendarOneMonthInterval("CalP",{
			pickerPopup: false
			}),
			oYearPicker = oCalP.getAggregation("yearPicker");

		// initialy the yearPicker has default values for min and max year
		assert.strictEqual(oYearPicker._oMinDate.getYear(), 1, "min year is set to 1");
		assert.strictEqual(oYearPicker._oMaxDate.getYear(), 9999, "max year is set to 9999");

		// change the pickerPopup to true, this will destroy the yearPicker aggregation
		oCalP.setPickerPopup(true);
		// set new min and max dates
		oCalP.setMinDate(new Date("2015", "7", "13", "8", "0", "0"));
		oCalP.setMaxDate(new Date("2017", "7", "13", "8", "0", "0"));

		// return pickrPopup property to true, this will create the yearPicker aggregation
		oCalP.setPickerPopup(false);
		oYearPicker = oCalP.getAggregation("yearPicker");

		// check if the yearPicker has the newly setted min and max date of the Interval control
		assert.strictEqual(oYearPicker._oMinDate.getYear(), 2015, "min year is set to 2015");
		assert.strictEqual(oYearPicker._oMaxDate.getYear(), 2017, "max year is set to 2017");

		// clean
		oCalP.destroy();
	});


	QUnit.test("Changing of the pickerPopup mode doesn't break min and max date inside calendarPicker aggregation", function(assert) {
		// arrange
		var oCalPicker,
			oCalP = new CalendarOneMonthInterval("CalP",{
				pickerPopup: true
			}).placeAt("qunit-fixture");

		sap.ui.getCore().applyChanges();

		// open calendarPicker
		qutils.triggerEvent("click", "CalP--Head-B1");

		oCalPicker = oCalP.getAggregation("calendarPicker");

		// initialy the yearPicker has default values for min and max year
		assert.strictEqual(oCalPicker._oMinDate.getYear(), 1, "min year is set to 1");
		assert.strictEqual(oCalPicker._oMaxDate.getYear(), 9999, "max year is set to 9999");

		// close calendarPicker
		sap.ui.test.qunit.triggerKeydown(sap.ui.getCore().byId("CalP").getFocusDomRef(), jQuery.sap.KeyCodes.ESCAPE);
		sap.ui.getCore().applyChanges();

		// change the pickerPopup to false
		oCalP.setPickerPopup(false);
		// set new min and max dates
		oCalP.setMinDate(new Date("2015", "7", "13", "8", "0", "0"));
		oCalP.setMaxDate(new Date("2017", "7", "13", "8", "0", "0"));

		// return pickerPopup property to true, this will create the calendarPicker aggregation
		oCalP.setPickerPopup(true);

		// open calendarPicker
		qutils.triggerEvent("click", "CalP--Head-B1");

		oCalPicker = oCalP.getAggregation("calendarPicker");

		// check if the yearPicker has the newly setted min and max date of the Interval control
		assert.strictEqual(oCalPicker._oMinDate.getYear(), 2015, "min year is set to 2015");
		assert.strictEqual(oCalPicker._oMaxDate.getYear(), 2017, "max year is set to 2017");

		sap.ui.test.qunit.triggerKeydown(sap.ui.getCore().byId("CalP").getFocusDomRef(), jQuery.sap.KeyCodes.ESCAPE);
		// clean
		oCalP.destroy();
	});

	QUnit.test("Triggering button receives the focus on picker ESC", function(assert) {
		// arrange
			var oCalP = new CalendarOneMonthInterval("CalP",{
				pickerPopup: true
			}).placeAt("qunit-fixture");

		sap.ui.getCore().applyChanges();

		// open calendarPicker
		qutils.triggerEvent("click", "CalP--Head-B1");

		// close calendarPicker
		sap.ui.test.qunit.triggerKeydown(document.activeElement, jQuery.sap.KeyCodes.ESCAPE);

		// check if the triggering button receives the focus after picker close
		assert.strictEqual(document.activeElement.id, oCalP.getAggregation("header").getDomRef("B1").id, "After picker close the triggering button receives the focus");

		// clean
		oCalP.destroy();
	});

});