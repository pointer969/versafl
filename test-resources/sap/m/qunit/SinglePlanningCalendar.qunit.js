/*global QUnit, sinon*/
sap.ui.define([
	"sap/ui/qunit/QUnitUtils",
	"jquery.sap.global",
	"sap/m/library",
	"sap/m/SinglePlanningCalendar",
	"sap/m/SinglePlanningCalendarGrid",
	"sap/m/SinglePlanningCalendarDayView",
	"sap/m/SinglePlanningCalendarWeekView",
	"sap/m/PlanningCalendarLegend",
	"sap/ui/unified/CalendarAppointment",
	"sap/ui/unified/CalendarLegendItem",
	"sap/ui/core/InvisibleText",
	'sap/ui/events/KeyCodes',
	"sap/base/Log",
	"sap/ui/core/library"
], function(
	qutils,
	jQuery,
	mobileLibrary,
	SinglePlanningCalendar,
	SinglePlanningCalendarGrid,
	SinglePlanningCalendarDayView,
	SinglePlanningCalendarWeekView,
	PlanningCalendarLegend,
	CalendarAppointment,
	CalendarLegendItem,
	InvisibleText,
	KeyCodes,
	Log,
	coreLibrary
) {
	"use strict";

	QUnit.module("API");

	QUnit.test("setTitle", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			sTitle = "Single Planning Calendar";

		oSPC.setTitle(sTitle);

		//assert
		assert.equal(oSPC._getHeader().getTitle(), sTitle, "The title is set correctly");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("default SatartDate", function (assert) {
		var oSPC = new SinglePlanningCalendar();

		//assert
		assert.ok(oSPC.getStartDate(), "if no date is given, the current date is set as StartDate");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("setStartDate", function (assert) {
		var oDate = new Date(2018, 10, 23),
			oSPC = new SinglePlanningCalendar({
				startDate: oDate,
				views: [
					new SinglePlanningCalendarDayView({
						key: "DayView",
						title: "Day View"
					})
				]
			});

		//assert
		assert.strictEqual(oSPC.getStartDate(), oDate, "StartDate is set correctly");
		assert.equal(oSPC._getHeader().getStartDate().toString(), oDate.toString(), "StartDate is set correctly");
		assert.equal(oSPC._getGrid().getStartDate().toString(), oDate.toString(), "StartDate is set correctly");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("appointments aggregation", function (assert) {
		var oDate = new Date(2018, 11, 24),
			oAppointment = new CalendarAppointment({
				title: "Appointment",
				text: "new appointment",
				type: "Type01",
				icon: "../ui/unified/images/m_01.png",
				color: "#FF0000",
				startDate: new Date(2018, 11, 24, 15, 30, 0),
				endDate: new Date(2018, 11, 24, 16, 30, 0)
			}),
			oSPC = new SinglePlanningCalendar({
				startDate: oDate,
				appointments : [
					oAppointment
				]
			});

		//assert
		assert.strictEqual(oSPC.getAppointments().length, 1, "One appointment is set");
		assert.strictEqual(oSPC._getGrid().getAppointments().length, 1, "One appointment is set to the grid");
		assert.strictEqual(oSPC._getGrid().getAppointments()[0], oAppointment, "Appointment set to the calendar is the same that is set to the grid");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("selectedView", function (assert) {
		var oSPC = new SinglePlanningCalendar();

		//assert
		assert.ok(oSPC.getAssociation("selectedView"), "selectedView is set correctly");
		assert.strictEqual(oSPC.getAssociation("selectedView"), oSPC._oDefaultView.getId(), "selectedView is the default view");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("getSelectedAppointments", function (assert) {
		var oAppointment1 = new CalendarAppointment({
				title: "Appointment1",
				startDate: new Date(2018, 11, 24, 15, 30, 0),
				endDate: new Date(2018, 11, 24, 16, 30, 0)
			}),
			oAppointment2 = new CalendarAppointment({
				title: "Appointment1",
				startDate: new Date(2018, 11, 24, 16, 30, 0),
				endDate: new Date(2018, 11, 24, 17, 30, 0),
				selected: true
			}),
			oSPC = new SinglePlanningCalendar({
				appointments: [
					oAppointment1,
					oAppointment2
				]
			});

		//assert
		assert.ok(oSPC.getSelectedAppointments().length, 1, "one appointment selected");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("setLegend", function (assert){
		// prepare
		var oSPC = new SinglePlanningCalendar(),
			oLegend = new PlanningCalendarLegend();

		// act
		oSPC.setLegend(oLegend);

		//assert
		assert.equal(oSPC.getAssociation("legend"), oLegend.getId(), "the legend is successfully set");

		//cleanup
		oSPC.destroy();
	});

	QUnit.test("setEnableAppointmentsDragAndDrop propagates to the internal grid", function (assert) {
		// arrange
		var oSPC = new SinglePlanningCalendar(),
			oGridSetEnableAppointmentsDragAndDropSpy = this.spy(oSPC._getGrid(), "setEnableAppointmentsDragAndDrop");

		// act
		oSPC.setEnableAppointmentsDragAndDrop(true);

		// assert
		assert.ok(oGridSetEnableAppointmentsDragAndDropSpy.calledWith(true), "setEnableAppointmentsDragAndDrop of the grid is called with right params");

		// cleanup
		oGridSetEnableAppointmentsDragAndDropSpy.restore();
		oSPC.destroy();
	});

	QUnit.test("setEnableAppointmentsResize propagates to the internal grid", function (assert) {
		// arrange
		var oSPC = new SinglePlanningCalendar(),
			oGridSetEnableAppointmentsResizeSpy = this.spy(oSPC._getGrid(), "setEnableAppointmentsResize");

		// act
		oSPC.setEnableAppointmentsResize(true);

		// assert
		assert.ok(oGridSetEnableAppointmentsResizeSpy.calledWith(true), "setEnableAppointmentsResize of the grid is called with right params");

		// cleanup
		oGridSetEnableAppointmentsResizeSpy.restore();
		oSPC.destroy();
	});

	QUnit.test("setEnableAppointmentsCreate propagates to the internal grid", function (assert) {
		// arrange
		var oSPC = new SinglePlanningCalendar(),
			oGridSetEnableAppointmentsCreateSpy = this.spy(oSPC._getGrid(), "setEnableAppointmentsCreate");

		// act
		oSPC.setEnableAppointmentsCreate(true);

		// assert
		assert.ok(oGridSetEnableAppointmentsCreateSpy.calledWith(true), "setEnableAppointmentsCreate of the grid is called with right params");

		// cleanup
		oGridSetEnableAppointmentsCreateSpy.restore();
		oSPC.destroy();
	});

	QUnit.module("Events");

	QUnit.test("appointmentSelect", function (assert) {
		var oAppointment = new CalendarAppointment(),
			oSPC = new SinglePlanningCalendar({
				appointments: [
					oAppointment
				]
			}),
			oFakeEvent = {
				target: {
					parentElement: {
						id: oAppointment.getId()
					},
					classList: {
						contains: function() {
							return false;
						}
					}
				}
			},
			fnFireAppointmentSelectSpy = this.spy(oSPC, "fireAppointmentSelect");

		//act
		oSPC._getGrid().ontap(oFakeEvent);

		//assert
		assert.ok(fnFireAppointmentSelectSpy.calledOnce, "Event was fired");
		assert.ok(fnFireAppointmentSelectSpy.calledWithExactly({
			appointment: oAppointment,
			id: oSPC.getId()
		}), "Event was fired with the correct parameters");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("headerDateSelect", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			oSPCHeaders = oSPC._getGrid()._getColumnHeaders(),
			oStartDate = oSPC.getStartDate(),
			oHeaderDateToSelect = new Date(oStartDate.getFullYear(), oStartDate.getMonth(), oStartDate.getDate()),
			fnFireHeaderDateSelect = this.spy(oSPC, "fireHeaderDateSelect");

		//act
		oSPCHeaders.setDate(oHeaderDateToSelect);
		oSPCHeaders.fireSelect();

		//assert
		assert.ok(fnFireHeaderDateSelect.calledOnce, "Event was fired");
		assert.ok(fnFireHeaderDateSelect.calledWithExactly({
			date: oHeaderDateToSelect,
			id: oSPC.getId()
		}), "Event was fired with the correct parameters");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("startDateChange: on next button press", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			oSPCHeader = oSPC._getHeader(),
			iScrollDays = sap.ui.getCore().byId(oSPC.getAssociation("selectedView")).getScrollEntityCount(),
			oInitialStartDate = oSPC.getStartDate(),
			fnFireStartDateChange = this.spy(oSPC, "fireStartDateChange");

		//act
		oSPCHeader.firePressNext();

		//assert
		assert.ok(fnFireStartDateChange.calledOnce, "Event was fired");
		assert.ok(fnFireStartDateChange.calledWithExactly({
			date: new Date(oInitialStartDate.getFullYear(), oInitialStartDate.getMonth(), oInitialStartDate.getDate() + iScrollDays),
			id: oSPC.getId()
		}), "Event was fired with the correct parameters");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("startDateChange: on previous button press", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			oSPCHeader = oSPC._getHeader(),
			iScrollDays = sap.ui.getCore().byId(oSPC.getAssociation("selectedView")).getScrollEntityCount(),
			oInitialStartDate = oSPC.getStartDate(),
			fnFireStartDateChange = this.spy(oSPC, "fireStartDateChange");

		//act
		oSPCHeader.firePressPrevious();

		//assert
		assert.ok(fnFireStartDateChange.calledOnce, "Event was fired");
		assert.ok(fnFireStartDateChange.calledWithExactly({
			date: new Date(oInitialStartDate.getFullYear(), oInitialStartDate.getMonth(), oInitialStartDate.getDate() - iScrollDays),
			id: oSPC.getId()
		}), "Event was fired with the correct parameters");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("startDateChange: on today button press", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			oSPCHeader = oSPC._getHeader(),
			oInitialStartDate = oSPC.getStartDate(),
			fnFireStartDateChange = this.spy(oSPC, "fireStartDateChange");

		//act
		oSPCHeader.firePressToday();

		//assert
		assert.ok(fnFireStartDateChange.calledOnce, "Event was fired");
		assert.ok(fnFireStartDateChange.calledWithExactly({
			date: oSPC._getSelectedView().calculateStartDate(oInitialStartDate),
			id: oSPC.getId()
		}), "Event was fired with the correct parameters");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("startDateChange: on date select from picker", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			oSPCHeader = oSPC._getHeader(),
			oInitialStartDate = oSPC.getStartDate(),
			fnFireStartDateChange = this.spy(oSPC, "fireStartDateChange");

		//act
		oSPCHeader.fireDateSelect();

		//assert
		assert.ok(fnFireStartDateChange.calledOnce, "Event was fired");
		assert.ok(fnFireStartDateChange.calledWithExactly({
			date: oSPC._getSelectedView().calculateStartDate(oInitialStartDate),
			id: oSPC.getId()
		}), "Event was fired with the correct parameters");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("appointmentDrop is fired when internal grid event appointmentDrop is fired", function (assert) {
		// arrange
		var oSPC = new SinglePlanningCalendar(),
			oGrid = oSPC._getGrid(),
			oFireAppointmentDropSpy = this.spy(oSPC, "fireAppointmentDrop");

		// act
		oGrid.fireEvent("appointmentDrop", {});

		// assert
		assert.equal(oFireAppointmentDropSpy.callCount, 1, "fireAppointmentDrop of the SinglePlanningCalendar is called once");

		// cleanup
		oFireAppointmentDropSpy.restore();
		oSPC.destroy();
	});

	QUnit.test("appointmentResize is fired when internal grid event appointmentResize is fired", function (assert) {
		// arrange
		var oSPC = new SinglePlanningCalendar(),
			oGrid = oSPC._getGrid(),
			oFireAppointmentResizeSpy = this.spy(oSPC, "fireAppointmentResize");

		// act
		oGrid.fireEvent("appointmentResize", {});

		// assert
		assert.equal(oFireAppointmentResizeSpy.callCount, 1, "fireAppointmentResize of the SinglePlanningCalendar is called once");

		// cleanup
		oFireAppointmentResizeSpy.restore();
		oSPC.destroy();
	});

	QUnit.test("appointmentCreate is fired when internal grid event appointmentCreate is fired", function (assert) {
		// arrange
		var oSPC = new SinglePlanningCalendar(),
			oGrid = oSPC._getGrid(),
			oFireAppointmentCreateSpy = this.spy(oSPC, "fireAppointmentCreate");

		// act
		oGrid.fireEvent("appointmentCreate", {});

		// assert
		assert.equal(oFireAppointmentCreateSpy.callCount, 1, "fireAppointmentCreate of the SinglePlanningCalendar is called once");

		// cleanup
		oFireAppointmentCreateSpy.restore();
		oSPC.destroy();
	});

	QUnit.test("cellPress", function (assert) {
		// prepare
		var oSPC = new SinglePlanningCalendar({
				startDate: new Date(2018, 6, 8)
			}),
			oFakeEvent = {
				target: jQuery("<div></div>").attr({
					"data-sap-start-date": "20180708-0300",
					"data-sap-end-date": "20180708-0400",
					"class": "sapMSinglePCRow"
				}).get(0),
				which: KeyCodes.ENTER,
				preventDefault: function() {}
			},
			fnFireGridCellFocusSpy = this.spy(oSPC, "fireEvent");

		// act
		oSPC._getGrid().onkeydown(oFakeEvent);
		// assert

		assert.ok(fnFireGridCellFocusSpy.calledOnce, "The cellPress event was fired");
		assert.ok(fnFireGridCellFocusSpy.calledWithExactly("cellPress", {
			startDate: new Date(2018, 6 , 8, 3),
			endDate: new Date(2018, 6, 8, 4),
			id: oSPC.getId()
		}), "Event was fired with the correct parameters");

		// cleanup
		oSPC.destroy();
	});

	QUnit.test("borderReached: when focus is on appointment and we are navigating in backward direction on week view", function(assert) {
		// prepare
		var oAppointment = new CalendarAppointment({
				startDate: new Date(2018, 6, 8, 5),
				endDate: new Date(2018, 6, 8, 6)
			}),
			oSPC = new SinglePlanningCalendar({
				startDate: new Date(2018, 6, 8),
				appointments: [oAppointment]
			}),
			oFakeEvent = {
				target: {
					id: oAppointment.getId(),
					classList: {
						contains: function() {
							return false;
						}
					},
					which: KeyCodes.ARROW_LEFT
				},
				preventDefault: function() {}
			},
			fnBorderReachedCallbackSpy = this.spy();

		oSPC._getGrid().attachEvent("borderReached", fnBorderReachedCallbackSpy);

		// act
		oSPC._getGrid().onsapleft(oFakeEvent);

		// assert
		assert.ok(fnBorderReachedCallbackSpy.calledOnce, "borderReached callback is called");
		assert.deepEqual(oSPC.getStartDate(), new Date(2018, 6, 1), "Start date is changed correctly");
		assert.equal(
			oSPC._sGridCellFocusSelector,
			"[data-sap-start-date='20180707-0500'].sapMSinglePCRow",
			"Start date is changed correctly"
		);

		// cleanup
		oSPC.destroy();
	});

	QUnit.test("borderReached: when focus is on appointment and we are navigating in forward direction on week view", function(assert) {
		// prepare
		var oAppointment = new CalendarAppointment({
				startDate: new Date(2018, 6, 14, 5),
				endDate: new Date(2018, 6, 14, 6)
			}),
			oSPC = new SinglePlanningCalendar({
				startDate: new Date(2018, 6, 8),
				appointments: [oAppointment]
			}),
			oFakeEvent = {
				target: {
					id: oAppointment.getId(),
					classList: {
						contains: function() {
							return false;
						}
					},
					which: KeyCodes.ARROW_RIGHT
				},
				preventDefault: function() {}
			},
			fnBorderReachedCallbackSpy = this.spy();

		oSPC._getGrid().attachEvent("borderReached", fnBorderReachedCallbackSpy);

		// act
		oSPC._getGrid().onsapright(oFakeEvent);

		// assert
		assert.ok(fnBorderReachedCallbackSpy.calledOnce, "borderReached callback is called");
		assert.deepEqual(oSPC.getStartDate(), new Date(2018, 6, 15), "Start date is changed correctly");
		assert.equal(
			oSPC._sGridCellFocusSelector,
			"[data-sap-start-date='20180715-0500'].sapMSinglePCRow",
			"Start date is changed correctly"
		);

		// cleanup
		oSPC.destroy();
	});

	QUnit.test("borderReached: when focus is on grid cell and we are navigation in backward direction on week view", function(assert) {
		// prepare
		var oSPC = new SinglePlanningCalendar({
				startDate: new Date(2018, 6, 8)
			}),
			oFakeEvent = {
				target: jQuery("<div></div>").attr({
					"data-sap-start-date": "20180708-0300",
					"data-sap-end-date": "20180708-0400",
					"class": "sapMSinglePCRow"
				}).get(0),
				which: KeyCodes.ARROW_LEFT,
				preventDefault: function() {}
			},
			fnBorderReachedCallbackSpy = this.spy();

		oSPC._getGrid().attachEvent("borderReached", fnBorderReachedCallbackSpy);

		// act
		oSPC._getGrid().onsapleft(oFakeEvent);

		// assert
		assert.ok(fnBorderReachedCallbackSpy.calledOnce, "borderReached callback is called");
		assert.deepEqual(oSPC.getStartDate(), new Date(2018, 6, 1), "Start date is changed correctly");
		assert.equal(
			oSPC._sGridCellFocusSelector,
			"[data-sap-start-date='20180707-0300'].sapMSinglePCRow",
			"Start date is changed correctly"
		);

		// cleanup
		oSPC.destroy();
	});

	QUnit.test("borderReached: when focus is on grid cell and we are navigation in forward direction on week view", function(assert) {
		// prepare
		var oSPC = new SinglePlanningCalendar({
				startDate: new Date(2018, 6, 8)
			}),
			oFakeEvent = {
				target: jQuery("<div></div>").attr({
					"data-sap-start-date": "20180714-0300",
					"data-sap-end-date": "20180714-0400",
					"class": "sapMSinglePCRow"
				}).get(0),
				which: KeyCodes.ARROW_RIGHT,
				preventDefault: function() {}
			},
			fnBorderReachedCallbackSpy = this.spy();

		oSPC._getGrid().attachEvent("borderReached", fnBorderReachedCallbackSpy);

		// act
		oSPC._getGrid().onsapright(oFakeEvent);

		// assert
		assert.ok(fnBorderReachedCallbackSpy.calledOnce, "borderReached callback is called");
		assert.deepEqual(oSPC.getStartDate(), new Date(2018, 6, 15), "Start date is changed correctly");
		assert.equal(
			oSPC._sGridCellFocusSelector,
			"[data-sap-start-date='20180715-0300'].sapMSinglePCRow",
			"Start date is changed correctly"
		);

		// cleanup
		oSPC.destroy();
	});

	QUnit.module("Classes");

	QUnit.test("Class for hidden actionsToolbar", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			$oSPCRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		$oSPCRef = oSPC.$();

		assert.ok($oSPCRef.hasClass("sapMSinglePCActionsHidden"), "Class for hidden actions is applied when they are empty");

		oSPC.destroy();
	});

	QUnit.test("Class for non-hidden actionsToolbar", function (assert) {
		var oSPC = new SinglePlanningCalendar({ title: "Something" }),
			$oSPCRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		$oSPCRef = oSPC.$();

		assert.notOk($oSPCRef.hasClass("sapMSinglePCActionsHidden"),
			"Class for hidden actions isn't applied when they aren't empty");

		oSPC.destroy();
	});

	QUnit.test("Initial classes for stickyMode: None (Default)", function (assert) {
		// Prepare
		var oSPC = new SinglePlanningCalendar(),
			$oSPCRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		$oSPCRef = oSPC.$();

		// Assert
		assert.notOk($oSPCRef.hasClass("sapMSinglePCStickyAll"), "sapMSinglePCStickyAll class isn't applied");
		assert.notOk($oSPCRef.hasClass("sapMSinglePCStickyNavBarAndColHeaders"), "sapMSinglePCStickyNavBarAndColHeaders class isn't applied");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("Initial classes for stickyMode: All", function (assert) {
		// Prepare
		var oSPC = new SinglePlanningCalendar({ stickyMode: "All" }),
			$oSPCRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		$oSPCRef = oSPC.$();

		// Assert
		assert.ok($oSPCRef.hasClass("sapMSinglePCStickyAll"), "sapMSinglePCStickyAll class is applied");
		assert.notOk($oSPCRef.hasClass("sapMSinglePCStickyNavBarAndColHeaders"), "sapMSinglePCStickyNavBarAndColHeaders class isn't applied");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("Initial classes for stickyMode: NavBarAndColHeaders", function (assert) {
		// Prepare
		var oSPC = new SinglePlanningCalendar({ stickyMode: "NavBarAndColHeaders" }),
			$oSPCRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		$oSPCRef = oSPC.$();

		// Assert
		assert.notOk($oSPCRef.hasClass("sapMSinglePCStickyAll"), "sapMSinglePCStickyAll class isn't applied");
		assert.ok($oSPCRef.hasClass("sapMSinglePCStickyNavBarAndColHeaders"), "sapMSinglePCStickyNavBarAndColHeaders class is applied");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("Classes application when stickyMode is changed runtime", function (assert) {
		// Prepare
		var oSPC = new SinglePlanningCalendar(),
			$oSPCRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		// Act
		oSPC.setStickyMode("All");
		sap.ui.getCore().applyChanges();
		$oSPCRef = oSPC.$();

		// Assert
		assert.ok($oSPCRef.hasClass("sapMSinglePCStickyAll"), "sapMSinglePCStickyAll class is applied");
		assert.notOk($oSPCRef.hasClass("sapMSinglePCStickyNavBarAndColHeaders"), "sapMSinglePCStickyNavBarAndColHeaders class isn't applied");

		// Act
		oSPC.setStickyMode("NavBarAndColHeaders");
		sap.ui.getCore().applyChanges();
		$oSPCRef = oSPC.$();

		// Assert
		assert.notOk($oSPCRef.hasClass("sapMSinglePCStickyAll"), "sapMSinglePCStickyAll class isn't applied");
		assert.ok($oSPCRef.hasClass("sapMSinglePCStickyNavBarAndColHeaders"), "sapMSinglePCStickyNavBarAndColHeaders class is applied");

		// Act
		oSPC.setStickyMode("None");
		sap.ui.getCore().applyChanges();
		$oSPCRef = oSPC.$();

		// Assert
		assert.notOk($oSPCRef.hasClass("sapMSinglePCStickyAll"), "sapMSinglePCStickyAll class isn't applied");
		assert.notOk($oSPCRef.hasClass("sapMSinglePCStickyNavBarAndColHeaders"), "sapMSinglePCStickyNavBarAndColHeaders class isn't applied");

		// Clean up
		oSPC.destroy();
	});

	QUnit.module("Views");

	QUnit.test("addView", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			oDayView = new SinglePlanningCalendarDayView({
				key: "DayView",
				title: "Day View"
			}),
			oViewsButton;

		//assert
		assert.strictEqual(oSPC.getAggregation("views").length, 0, "No view is set");

		//act
		oSPC.addView(oDayView);
		oViewsButton = oSPC._getHeader()._getOrCreateViewSwitch();

		//assert
		assert.strictEqual(oSPC.getAggregation("views").length, 1, "One view is set");
		assert.strictEqual(oSPC.getAggregation("views")[0].getKey(), "DayView", "View with key 'DayView' is set");
		assert.strictEqual(oViewsButton.getItems().length, 1, "One button is set in the 'view switch'");
		assert.strictEqual(oViewsButton.getItems()[0].getKey(), "DayView", "DayView button is set in the 'view switch'");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("addView with duplicate key", function (assert) {
		var oDayView = new SinglePlanningCalendarDayView({
				key: "DayView",
				title: "Day View"
			}),
			oDayViewDuplicate = new SinglePlanningCalendarDayView({
				key: "DayView",
				title: "Second Day View"
			}),
			oSPC = new SinglePlanningCalendar({
				views: [oDayView]
			}),
			oErrorLogSpy = sinon.spy(Log, "error");

		//assert
		assert.ok(!oSPC.addView(oDayViewDuplicate), "the view with same key was not added");
		assert.strictEqual(oErrorLogSpy.callCount, 1, "Error: 'There is an existing view with the same key.' was logged");

		//clean up
		oSPC.destroy();
		Log.error.restore();
	});

	QUnit.test("insertView", function (assert) {
		var oDayView = new SinglePlanningCalendarDayView({
				key: "DayView",
				title: "Day View"
			}),
			oWeekView = new SinglePlanningCalendarWeekView({
				key: "WeekView",
				title: "Week View"
			}),
			oSPC = new SinglePlanningCalendar({
				views: [oDayView]
			}),
			oViewsButton = oSPC._getHeader()._getOrCreateViewSwitch();

		//assert
		assert.strictEqual(oSPC.getAggregation("views")[0].getKey(), "DayView", "'DayView' is on first position");
		assert.strictEqual(oViewsButton.getItems()[0].getKey(), "DayView", "DayView button is set in the 'view switch' on first position");

		//act
		oSPC.insertView(oWeekView, 0);

		//assert
		assert.strictEqual(oSPC.getAggregation("views")[0].getKey(), "WeekView", "'WeekView' is inserted on first position");
		assert.strictEqual(oSPC.getAggregation("views")[1].getKey(), "DayView", "'DayView' is now on second position");
		assert.strictEqual(oViewsButton.getItems()[0].getKey(), "WeekView", "WeekView button is set in the 'view switch' on first position");
		assert.strictEqual(oViewsButton.getItems()[1].getKey(), "DayView", "DayView button is set in the 'view switch' is now on second position");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("removeView", function (assert) {
		var oDayView = new SinglePlanningCalendarDayView({
				key: "DayView",
				title: "Day View"
			}),
			oSPC = new SinglePlanningCalendar({
				views: [oDayView]
			});

		//act
		oSPC.removeView(oDayView);

		//assert
		assert.strictEqual(oSPC.getAggregation("views").length, 0, "Day view is removed");
		assert.strictEqual(oSPC._oDefaultView.getId(), oSPC.getAssociation("selectedView"), "selectedView is the default view");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("removeAllViews", function (assert) {
		var oDayView = new SinglePlanningCalendarDayView({
				key: "DayView",
				title: "Day View"
			}),
			oSPC = new SinglePlanningCalendar({
				views: [oDayView]
			}),
			oViewsButton = oSPC._getHeader()._getOrCreateViewSwitch();

		//act
		oSPC.removeAllViews();

		//assert
		assert.strictEqual(oSPC.getAggregation("views"), null, "All views are removed");
		assert.strictEqual(oViewsButton.getItems().length, 0, "Button in the 'view switch' was removed");
		assert.strictEqual(oSPC._oDefaultView.getId(), oSPC.getAssociation("selectedView"), "selectedView is the default view");

		//clean up
		oSPC.destroy();
	});

	QUnit.test("destroyViews", function (assert) {
		var oDayView = new SinglePlanningCalendarDayView({
				key: "DayView",
				title: "Day View"
			}),
			oSPC = new SinglePlanningCalendar({
				views: [oDayView]
			});

		//act
		oSPC.destroyViews();

		//assert
		assert.strictEqual(oSPC.getAggregation("views"), null, "All views are destroyed");
		assert.strictEqual(oSPC._oDefaultView.getId(), oSPC.getAssociation("selectedView"), "selectedView is the default view");

		//clean up
		oSPC.destroy();
	});

	QUnit.module("Accessibility");

	QUnit.test("tabindex", function (assert) {
		// Prepare
		var oCalendarStartDate = new Date(2018, 11, 24),
			oAppointment = new CalendarAppointment({
				title: "Appointment",
				startDate: new Date(2018, 11, 24, 15, 30, 0),
				endDate: new Date(2018, 11, 24, 16, 30, 0)
			}),
			oBlocker = new CalendarAppointment({
				title: "Blocker",
				startDate: new Date(2018, 11, 24, 0, 0, 0),
				endDate: new Date(2018, 11, 24, 0, 0, 0)
			}),
			oSPC = new SinglePlanningCalendar({
				startDate: oCalendarStartDate,
				appointments: [
					oBlocker,
					oAppointment
				]
			});

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		// Assert
		assert.strictEqual(oAppointment.$().attr("tabindex"), "0", "Appointments are tabbable");
		assert.strictEqual(oBlocker.$().attr("tabindex"), "0", "Blockers are tabbable");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("start/end date + legend information", function (assert) {
		// Prepare
		var oCalendarStartDate = new Date(2018, 11, 24),
			oStartDate = new Date(2018, 11, 24, 15, 30, 0),
			oEndDate = new Date(2018, 11, 24, 16, 30, 0),
			oAppointment = new CalendarAppointment("test-appointment", {
				title: "Appointment",
				startDate: oStartDate,
				endDate: oEndDate,
				type: "Type01"
			}),
			oAppointmentWithNoCorresspondingLegendItem = new CalendarAppointment("test-appointment2", {
				title: "Appointment",
				startDate: oStartDate,
				endDate: oEndDate,
				type: "Type02"
			}),
			oLegendItem = new CalendarLegendItem({
				type: "Type01",
				text: "Type Private Appointment"
			}),
			oLegend = new PlanningCalendarLegend({
				appointmentItems: [
					oLegendItem
				]
			}),
			oSPC = new SinglePlanningCalendar({
				startDate: oCalendarStartDate,
				appointments: [
					oAppointment,
					oAppointmentWithNoCorresspondingLegendItem
				],
				legend: oLegend
			}),
			oSPCGrid = oSPC._getGrid(),
			// Expecting start/end information to look like this: "Start Time: *date here*; End Time: *date here*"
			sExpectedInfo = oSPCGrid._oUnifiedRB.getText("CALENDAR_START_TIME") + ": " +
							oSPCGrid._oFormatAriaApp.format(oStartDate) + "; " +
							oSPCGrid._oUnifiedRB.getText("CALENDAR_END_TIME") + ": " +
							oSPCGrid._oFormatAriaApp.format(oEndDate) + "; ";

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		// Assert
		assert.strictEqual(jQuery("#test-appointment-Descr").html(), sExpectedInfo + oLegendItem.getText(),
			"Information for appointment's start/end date + legend is present in the DOM");
		assert.strictEqual(jQuery("#test-appointment2-Descr").html(), sExpectedInfo + oAppointmentWithNoCorresspondingLegendItem.getType(),
			"When the appointment has no corresponding legend item, its own type goes to the aria");
		assert.ok(oAppointment.$().attr("aria-labelledby") !== -1, "The appointment has reference to that information");

		// Act
		oLegend.destroy();
		sap.ui.getCore().applyChanges();

		// Assert
		assert.strictEqual(jQuery("#test-appointment-Descr").html(), sExpectedInfo + oAppointment.getType(),
			"when the legend is destroyed, the aria contains the correct info");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("Root element ARIA", function (assert) {
		// Prepare
		var oSPC = new SinglePlanningCalendar(),
			sHeaderId = oSPC._getHeader()._getOrCreateTitleControl().getId(),
			sNowMarkerTextId = oSPC._getGrid().getId() + "-nowMarkerText",
			$oSPCRef,
			aAriaLabelledBy;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		$oSPCRef = oSPC.$();
		aAriaLabelledBy = $oSPCRef.attr("aria-labelledby");

		// Assert
		assert.strictEqual($oSPCRef.attr("role"), "region", "Correct ARIA role applied");
		assert.strictEqual($oSPCRef.attr("aria-roledescription"), oSPC._oRB.getText("SPC_CONTROL_NAME"),
				"Custom control name applied");
		assert.ok(aAriaLabelledBy.indexOf(sHeaderId) > -1, "SPC is labelled by its title");
		assert.ok(aAriaLabelledBy.indexOf(sNowMarkerTextId) > -1, "SPC is labelled by the now marker's text");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("Toolbars ARIA", function (assert) {
		// Prepare
		var oSPC = new SinglePlanningCalendar({
				title: "A random title"		// Actions toolbar will be hidden without it
			}),
			oHeader = oSPC._getHeader(),
			oActionsToolbar = oHeader.getAggregation("_actionsToolbar"),
			sActionsToolbarLabelId = InvisibleText.getStaticId("sap.m", "SPC_ACTIONS_TOOLBAR"),
			oNavigationToolbar = oHeader.getAggregation("_navigationToolbar"),
			sNavigationToolbarLabelId = InvisibleText.getStaticId("sap.m", "SPC_NAVIGATION_TOOLBAR");

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		// Assert
		assert.ok(oActionsToolbar.getAriaLabelledBy().indexOf(sActionsToolbarLabelId) > -1,
				"Actions toolbar has a hidden label");
		assert.ok(oNavigationToolbar.getAriaLabelledBy().indexOf(sNavigationToolbarLabelId) > -1,
				"Navigation toolbar has a hidden label");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("Navigation buttons ARIA", function (assert) {
		// Prepare
		var oCore = sap.ui.getCore(),
			oSPC = new SinglePlanningCalendar(),
			oHeader = oSPC._getHeader(),
			sNavigationToolbarId = oHeader.getAggregation("_navigationToolbar").getId(),
			oPreviousButton = oCore.byId(sNavigationToolbarId + "-PrevBtn"),
			oNextButton = oCore.byId(sNavigationToolbarId + "-NextBtn"),
			sTodayButtonLabelId = InvisibleText.getStaticId("sap.m", "PCH_NAVIGATE_TO_TODAY"),
			sPickerButtonLabelId = InvisibleText.getStaticId("sap.m", "PCH_SELECT_RANGE");

		oSPC.placeAt("qunit-fixture");
		oCore.applyChanges();

		// Assert
		assert.strictEqual(oPreviousButton.getTooltip(), oSPC._oRB.getText("PCH_NAVIGATE_BACKWARDS"),
				"Icon-only button 'Previous' has appropriate tooltip");
		assert.strictEqual(oNextButton.getTooltip(), oSPC._oRB.getText("PCH_NAVIGATE_FORWARD"),
				"Icon-only button 'Next' has appropriate tooltip");

		assert.ok(oHeader._oTodayBtn.getAriaLabelledBy().indexOf(sTodayButtonLabelId) > -1,
				"Button 'Today' has appropriate hidden label");
		assert.ok(oHeader._oPickerBtn.getAriaLabelledBy().indexOf(sPickerButtonLabelId) > -1,
				"Picker button has appropriate hidden label");
		assert.strictEqual(oHeader._oPickerBtn.$().attr("aria-haspopup"), "dialog",
				"Picker button indicates that it will open a calendar");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("Column headers area ARIA", function (assert) {
		// Prepare
		var oSPC = new SinglePlanningCalendar(),
			sColumnHeadersAreaLabelId = InvisibleText.getStaticId("sap.m", "PLANNINGCALENDAR_DAYS"),
			$oColumnHeadersAreaRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		$oColumnHeadersAreaRef = oSPC.$().find(".sapMSinglePCColumnHeader");

		// Assert
		assert.strictEqual($oColumnHeadersAreaRef.attr("role"), "grid", "Column headers area has correct ARIA role");
		assert.ok($oColumnHeadersAreaRef.attr("aria-labelledby").indexOf(sColumnHeadersAreaLabelId) > -1,
				"Column headers area has appropriate hidden label");

		// Cleanup
		oSPC.destroy();
	});

	QUnit.test("Blockers area ARIA", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			sBlockersAreaLabelId = InvisibleText.getStaticId("sap.m", "SPC_BLOCKERS"),
			$oBlockersAreaRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		$oBlockersAreaRef = oSPC.$().find(".sapMSinglePCBlockers");

		// Assert
		assert.strictEqual($oBlockersAreaRef.attr("role"), "grid", "Blockers area has correct ARIA role");
		assert.ok($oBlockersAreaRef.attr("aria-labelledby").indexOf(sBlockersAreaLabelId) > -1,
			"Blockers area has appropriate hidden label");

		// Cleanup
		oSPC.destroy();
	});

	QUnit.test("Blockers area ARIA", function (assert) {
		var oSPC = new SinglePlanningCalendar(),
			sAppointmentsAreaLabelId = InvisibleText.getStaticId("sap.m", "SPC_APPOINTMENTS"),
			$oAppointmentsAreaRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		$oAppointmentsAreaRef = oSPC.$().find(".sapMSinglePCColumns");

		// Assert
		assert.strictEqual($oAppointmentsAreaRef.attr("role"), "grid", "Appointments area has correct ARIA role");
		assert.ok($oAppointmentsAreaRef.attr("aria-labelledby").indexOf(sAppointmentsAreaLabelId) > -1,
			"Appointments area has appropriate hidden label");

		// Cleanup
		oSPC.destroy();
	});

	QUnit.test("Appointment ARIA", function (assert) {
		// Prepare
		var oCalendarStartDate = new Date(2018, 11, 24),
			oAppointment = new CalendarAppointment({
				title: "Appointment",
				startDate: new Date(2018, 11, 24, 15, 30, 0),
				endDate: new Date(2018, 11, 24, 16, 30, 0)
			}),
			oSPC = new SinglePlanningCalendar({
				startDate: oCalendarStartDate,
				appointments: oAppointment
			}),
			sAppointmentLabelId = InvisibleText.getStaticId("sap.ui.unified", "APPOINTMENT"),
			$oAppointmentRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		$oAppointmentRef = oAppointment.$();

		// Assert
		assert.strictEqual($oAppointmentRef.attr("role"), "gridcell", "Appointments have correct ARIA role");
		assert.ok($oAppointmentRef.attr("aria-labelledby").indexOf(sAppointmentLabelId) > -1,
				"Appointments have an appropriate hidden label");

		// Clean up
		oSPC.destroy();
	});

	QUnit.test("Blocker ARIA", function (assert) {
		// Prepare
		var oCalendarStartDate = new Date(2018, 11, 24),
			oBlocker = new CalendarAppointment({
				title: "Blocker",
				startDate: new Date(2018, 11, 24, 0, 0, 0),
				endDate: new Date(2018, 11, 25, 0, 0, 0)
			}),
			oSPC = new SinglePlanningCalendar({
				startDate: oCalendarStartDate,
				appointments: oBlocker
			}),
			sBlockerLabelId = InvisibleText.getStaticId("sap.ui.unified", "APPOINTMENT"),
			$oBlockerRef;

		oSPC.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		$oBlockerRef = oBlocker.$();

		// Assert
		assert.strictEqual($oBlockerRef.attr("role"), "gridcell", "Blockers have correct ARIA role");
		assert.ok($oBlockerRef.attr("aria-labelledby").indexOf(sBlockerLabelId) > -1,
			"Blockers have an appropriate hidden label");

		// Clean up
		oSPC.destroy();
	});

	QUnit.module("Misc");

	QUnit.test("isAllDayAppointment", function (assert) {
		// Prepare
		var oSPC = new SinglePlanningCalendar(),
			oGrid = oSPC._getGrid(),
			oStartDate = new Date(2017, 1, 1, 1, 1),
			oStartDateFullDay = new Date(2017, 1, 1, 0, 0),
			oEndDate = new Date(2017, 1, 2, 2, 2),
			oEndDateFullDay = new Date(2017, 1, 2, 0, 0);

		// Assert
		assert.equal(oGrid.isAllDayAppointment(oStartDate, oEndDate), false, "The appointment is not full day");
		assert.equal(oGrid.isAllDayAppointment(oStartDateFullDay, oEndDateFullDay), true, "The appointment is full day");

		// Clean up
		oSPC.destroy();
	});

	QUnit.module("Visibility of actions toolbar", {
		beforeEach: function () {
			this.oSPC = new SinglePlanningCalendar().placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();
		},
		afterEach: function () {
			this.oSPC.destroy();
		}
	});

	QUnit.test("The actions toolbar is not visible when there are no title, actions and views set", function (assert) {
		//assert
		assert.equal(this.oSPC._getHeader()._getActionsToolbar().getProperty("visible"), false, "the actions toolbar is not visible");
	});

	QUnit.test("The actions toolbar is visible when only title is set", function (assert) {
		// Arrange
		this.oSPC.setTitle("SPC title");
		sap.ui.getCore().applyChanges();

		//assert
		assert.equal(this.oSPC._getHeader()._getActionsToolbar().getProperty("visible"), true, "the actions toolbar is visible");
	});

	QUnit.test("The actions toolbar is visible when actions are set", function (assert) {
		// Arrange
		this.oSPC.addAction(new sap.m.Button({
			text: "SPC button"
		}));
		sap.ui.getCore().applyChanges();

		//assert
		assert.equal(this.oSPC._getHeader()._getActionsToolbar().getProperty("visible"), true, "the actions toolbar is visible");
	});

	QUnit.test("The actions toolbar is not visible when only one view is set", function (assert) {
		// Arrange
		this.oSPC.addView(new SinglePlanningCalendarDayView({
			key: "DayView",
			title: "Day View"
		}));
		sap.ui.getCore().applyChanges();

		//assert
		assert.equal(this.oSPC._getHeader()._getActionsToolbar().getProperty("visible"), false, "the actions toolbar is not visible");
	});

	QUnit.test("The actions toolbar is visible when more than one view is set", function (assert) {
		// Arrange
		this.oSPC.addView(new SinglePlanningCalendarDayView({
			key: "DayView",
			title: "Day View"
		}));
		this.oSPC.addView(new SinglePlanningCalendarWeekView({
			key: "WeekView",
			title: "Week View"
		}));
		sap.ui.getCore().applyChanges();

		//assert
		assert.equal(this.oSPC._getHeader()._getActionsToolbar().getProperty("visible"), true, "the actions toolbar is visible");
	});

	QUnit.module("Resize Appointments", {
		beforeEach: function() {
			this.oSPCGrid = new SinglePlanningCalendarGrid({
				startDate: new Date(2017, 10, 13, 0, 0, 0)
			});
		},
		afterEach: function() {
			this.oSPCGrid.destroy();
			this.oSPCGrid = null;
		}
	});

	QUnit.test("_calcResizeNewHoursAppPos: Calculate new size of the appointment", function(assert) {
		// arrange
		var	oAppStartDate = new Date(2017, 10, 13, 1, 0, 0),
			oAppEndDate = new Date(2017, 10, 13, 2, 0, 0),
			newAppPos;

		// act - resize appointment's end to 5 o'clock (10 x 30 mins)
		newAppPos = this.oSPCGrid._calcResizeNewHoursAppPos(oAppStartDate, oAppEndDate, 9, true);

		// assert
		assert.deepEqual(newAppPos.startDate, oAppStartDate, "Start date should not be changed");
		assert.deepEqual(newAppPos.endDate, new Date(2017, 10, 13, 5, 0, 0), "End date hour is correct");

		// act - resize appointment's end to preceed the appointment's start
		newAppPos = this.oSPCGrid._calcResizeNewHoursAppPos(oAppStartDate, oAppEndDate, 0, true);

		// assert
		assert.deepEqual(newAppPos.startDate, new Date(2017, 10, 13, 0, 0, 0), "Start date hout is correct");
		assert.deepEqual(newAppPos.endDate, oAppStartDate, "End date hour is correct");

		// act - resize appointment's start to 0:30
		newAppPos = this.oSPCGrid._calcResizeNewHoursAppPos(oAppStartDate, oAppEndDate, 1, false);

		// assert
		assert.deepEqual(newAppPos.startDate, new Date(2017, 10, 13, 0, 30, 0), "Start date hour is correct");
		assert.deepEqual(newAppPos.endDate, oAppEndDate, "End date should not be changed");

		// act - resize appointment's start to go after the appointment's end
		newAppPos = this.oSPCGrid._calcResizeNewHoursAppPos(oAppStartDate, oAppEndDate, 4, false);

		// assert
		assert.deepEqual(newAppPos.startDate, oAppEndDate, "Start date hout is correct");
		assert.deepEqual(newAppPos.endDate, new Date(2017, 10, 13, 2, 30, 0), "End date hour is correct");
	});
});
