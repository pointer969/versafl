/* global QUnit */

sap.ui.define([
	"sap/ui/rta/appVariant/manageApps/webapp/controller/ManageApps.controller",
	"sap/ui/rta/appVariant/Utils",
	"sap/ui/rta/appVariant/AppVariantUtils",
	"sap/ui/rta/appVariant/Feature",
	"sap/ui/rta/Utils",
	"sap/ui/core/Control",
	"sap/ui/base/Event",
	"sap/base/Log",
	"sap/ui/thirdparty/jquery",
	"sap/ui/thirdparty/sinon-4"
], function (
	ManageAppsController,
	AppVariantOverviewUtils,
	AppVariantUtils,
	RtaAppVariantFeature,
	RtaUtils,
	Control,
	Event,
	Log,
	jQuery,
	sinon
) {
	"use strict";

	var sandbox = sinon.sandbox.create();

	QUnit.module("Given that a ManageApps controller is instantiated", {
		afterEach: function () {
			sandbox.restore();
		},
		after: function() {
			jQuery("#sapUiBusyIndicator").hide();
		}
	}, function() {
		QUnit.test("when onInit is called in case app variants exist", function(assert) {
			var oViewStub = new Control();
			var oManageAppsController = new ManageAppsController();

			sandbox.stub(oManageAppsController, "getView").returns(oViewStub);

			var fnSimulatedOwnerComponent = {
				getIdRunningApp : function() {
					return "id1";
				},
				getIsOverviewForKeyUser : function() {
					return true;
				}
			};

			sandbox.stub(oManageAppsController, "getOwnerComponent").returns(fnSimulatedOwnerComponent);

			var highlightAppVariantSpy = sandbox.stub(oManageAppsController, "_highlightNewCreatedAppVariant").resolves();

			var aAppVariantOverviewAttributes = [
				{
					appId : "id1",
					title : "title1",
					subTitle : "subTitle1",
					description : "description1",
					icon : "sap-icon://history",
					originalId : "id1",
					isOriginal : true,
					typeOfApp : "Original App",
					descriptorUrl : "url1"
				},
				{
					appId : "id2",
					title : "title2",
					subTitle : "subTitle2",
					description : "description2",
					icon : "sap-icon://history",
					originalId : "id1",
					isOriginal : false,
					typeOfApp : "App Variant",
					descriptorUrl : "url2"
				},
				{
					appId : "id3",
					title : "title3",
					subTitle : "subTitle3",
					description : "description3",
					icon : "sap-icon://history",
					originalId : "id1",
					isOriginal : false,
					typeOfApp : "App Variant",
					descriptorUrl : "url3"
				}
			];

			var getAppVariantOverviewSpy = sandbox.stub(AppVariantOverviewUtils, "getAppVariantOverview").resolves(aAppVariantOverviewAttributes);

			return oManageAppsController.onInit().then(function() {
				assert.ok(highlightAppVariantSpy.calledOnce, "the _highlightNewCreatedAppVariant method is called once");
				assert.ok(getAppVariantOverviewSpy.calledOnce, "the getAppVariantOverview method is called once");
			});
		});

		QUnit.test("when onInit is called in case no app variants exist", function(assert) {
			var oViewStub = new Control();
			var oManageAppsController = new ManageAppsController();

			sandbox.stub(oManageAppsController, "getView").returns(oViewStub);

			var fnSimulatedOwnerComponent = {
				getIdRunningApp : function() {
					return "id1";
				},
				getIsOverviewForKeyUser : function() {
					return true;
				}
			};

			sandbox.stub(oManageAppsController, "getOwnerComponent").returns(fnSimulatedOwnerComponent);

			var highlightAppVariantSpy = sandbox.stub(oManageAppsController, "_highlightNewCreatedAppVariant").resolves();

			var aAppVariantOverviewAttributes = [];

			var showMessageWhenNoAppVariantsSpy = sandbox.stub(oManageAppsController, "_showMessageWhenNoAppVariantsExist");

			sandbox.stub(RtaUtils, "_showMessageBox").resolves(true);

			var getAppVariantOverviewSpy = sandbox.stub(AppVariantOverviewUtils, "getAppVariantOverview").resolves(aAppVariantOverviewAttributes);

			return oManageAppsController.onInit().then(function() {
				assert.notOk(highlightAppVariantSpy.calledOnce, "the _highlightNewCreatedAppVariant method is not called");
				assert.ok(getAppVariantOverviewSpy.calledOnce, "the getAppVariantOverview method is called once");
				assert.ok(showMessageWhenNoAppVariantsSpy.calledOnce, "the showMessageWhenNoAppVariantsSpy method is called once");
			});
		});

		QUnit.test("when onInit is called and failed", function(assert) {
			var oViewStub = new Control();
			var oManageAppsController = new ManageAppsController();

			sandbox.stub(oManageAppsController, "getView").returns(oViewStub);

			var fnSimulatedOwnerComponent = {
				getIdRunningApp : function() {
					return "id1";
				},
				getIsOverviewForKeyUser : function() {
					return true;
				}
			};

			sandbox.stub(oManageAppsController, "getOwnerComponent").returns(fnSimulatedOwnerComponent);

			var highlightAppVariantSpy = sandbox.stub(oManageAppsController, "_highlightNewCreatedAppVariant").resolves();

			var showMessageWhenNoAppVariantsSpy = sandbox.stub(oManageAppsController, "_showMessageWhenNoAppVariantsExist");

			sandbox.stub(RtaUtils, "_showMessageBox").resolves(true);
			sandbox.stub(AppVariantUtils, "showRelevantDialog").returns(Promise.reject(false));
			var getAppVariantOverviewSpy = sandbox.stub(AppVariantOverviewUtils, "getAppVariantOverview").returns(Promise.reject("Server error"));
			sandbox.stub(Log,"error").callThrough().withArgs("App variant error: ", "Server error").returns();

			return oManageAppsController.onInit().catch(function(bSuccess) {
				assert.equal(bSuccess, false, "Error: An unexpected exception occured" );
				assert.ok(highlightAppVariantSpy.notCalled, "the _highlightNewCreatedAppVariant method is not called");
				assert.ok(getAppVariantOverviewSpy.calledOnce, "the getAppVariantOverview method is called once");
				assert.ok(showMessageWhenNoAppVariantsSpy.notCalled, "the showMessageWhenNoAppVariantsSpy method is not called");
			});
		});

		QUnit.test("when saveAsAppVariant is called", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var modelPropertySpy = sandbox.stub(oManageAppsController, "getModelProperty");

			modelPropertySpy.onFirstCall().returns("descriptorUrl");

			var oButton = {
				getBindingContext : function() {
					return {
						sPath : "/appVariants/0"
					};
				}
			};

			var oEmptyEvent = new Event("emptyEventId", oButton, {
				button : oButton
			});

			var oResult = {
				response: {
					"sap.app" : {
						id : "testId"
					},
					"sap.ui5" : {
						componentName : "id1"
					}
				}
			};

			var getDescriptorSpy = sandbox.stub(AppVariantOverviewUtils, "sendRequest").resolves(oResult);

			var onSaveAsSpy = sandbox.stub(RtaAppVariantFeature, "onSaveAsFromOverviewDialog").resolves();

			return oManageAppsController.saveAsAppVariant(oEmptyEvent).then(function() {
				assert.ok(getDescriptorSpy.calledOnce, "the getDescriptor is called once");
				assert.ok(onSaveAsSpy.calledOnce, "the onSaveAs method is called once");
			});
		});

		QUnit.test("when copyId is called", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var modelPropertySpy = sandbox.stub(oManageAppsController, "getModelProperty");

			modelPropertySpy.onFirstCall().returns("Idcopied");

			var oButton = {
				getBindingContext : function() {
					return {
						sPath : "/appVariants/0"
					};
				}
			};

			var oEmptyEvent = new Event("emptyEventId", oButton, {
				button : oButton
			});


			oManageAppsController.copyId(oEmptyEvent);
			assert.ok(modelPropertySpy.calledOnce, "the modelProperty method is called once");
		});

		QUnit.test("when deleteAppVariant is called for app variant which is not being adapted", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var modelPropertySpy = sandbox.stub(oManageAppsController, "getModelProperty");
			modelPropertySpy.onFirstCall().returns("appVarID");
			modelPropertySpy.onSecondCall().returns(false);
			modelPropertySpy.onThirdCall().returns(undefined);

			var oButton = {
				getBindingContext : function() {
					return {
						sPath : "/appVariants/0"
					};
				}
			};

			var oEmptyEvent = new Event("emptyEventId", oButton, {
				button : oButton
			});


			var fnTriggerDeleteAppVariantFromLREP = sandbox.stub(AppVariantUtils, "triggerDeleteAppVariantFromLREP").resolves();
			var fnOnGetOverview = sandbox.stub(RtaAppVariantFeature, "onGetOverview").resolves();

			sandbox.stub(AppVariantUtils, "showRelevantDialog").resolves();

			return oManageAppsController.deleteAppVariant(oEmptyEvent).then(function() {
				assert.ok(fnTriggerDeleteAppVariantFromLREP.calledOnce, "then fnTriggerDeleteAppVariantFromLREP is called once");
				assert.ok(fnOnGetOverview.calledOnceWith(true), "the onGetOverview method is called once with correct parameters");
			});
		});

		QUnit.test("when deleteAppVariant is called for app variant which is being currently adapted", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var modelPropertySpy = sandbox.stub(oManageAppsController, "getModelProperty");
			modelPropertySpy.onFirstCall().returns("appVarID");
			modelPropertySpy.onSecondCall().returns(true);
			modelPropertySpy.onThirdCall().returns("Currently Adapting");

			var oButton = {
				getBindingContext : function() {
					return {
						sPath : "/appVariants/0"
					};
				}
			};

			var oEmptyEvent = new Event("emptyEventId", oButton, {
				button : oButton
			});


			var fnTriggerDeleteAppVariantFromLREP = sandbox.stub(AppVariantUtils, "triggerDeleteAppVariantFromLREP").resolves();
			var fnNavigateToFLPHomepage = sandbox.stub(AppVariantUtils, "navigateToFLPHomepage").resolves();

			sandbox.stub(AppVariantUtils, "showRelevantDialog").resolves();

			return oManageAppsController.deleteAppVariant(oEmptyEvent).then(function() {
				assert.ok(fnTriggerDeleteAppVariantFromLREP.calledOnce, "then fnTriggerDeleteAppVariantFromLREP is called once");
				assert.ok(fnNavigateToFLPHomepage.calledOnce, "the navigateToFLPHomepage method is called once");
			});
		});

		QUnit.test("when onMenuAction is called and copy id is pressed", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var oEmptyEvent = new Event("emptyEventId", new sap.m.Menu(), {
				item : new sap.m.MenuItem({text: "Copy ID"})
			});

			var fnCopyID = sandbox.stub(oManageAppsController, "copyId");

			oManageAppsController.onMenuAction(oEmptyEvent);
			assert.ok(fnCopyID.calledOnce, "then copyId is called once");
		});

		QUnit.test("when onMenuAction is called and saveAsAppVariant is pressed", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var oEmptyEvent = new Event("emptyEventId", new sap.m.Menu(), {
				item : new sap.m.MenuItem({text: "Save As"})
			});

			var fnSaveAsAppVariant = sandbox.stub(oManageAppsController, "saveAsAppVariant");

			oManageAppsController.onMenuAction(oEmptyEvent);
			assert.ok(fnSaveAsAppVariant.calledOnce, "then saveAsAppVariant is called once");
		});

		QUnit.test("when onMenuAction is called and handleUiAdaptation is pressed", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var oEmptyEvent = new Event("emptyEventId", new sap.m.Menu(), {
				item : new sap.m.MenuItem({text: "Adapt UI"})
			});

			var fnHandleUiAdaptation = sandbox.stub(oManageAppsController, "handleUiAdaptation");

			oManageAppsController.onMenuAction(oEmptyEvent);
			assert.ok(fnHandleUiAdaptation.calledOnce, "then handleUiAdaptation is called once");
		});

		QUnit.test("when onMenuAction is called and deleteAppVariant is pressed", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var oEmptyEvent = new Event("emptyEventId", new sap.m.Menu(), {
				item : new sap.m.MenuItem({text: "Delete App Variant"})
			});

			var fnDeleteAppVariant = sandbox.stub(oManageAppsController, "deleteAppVariant");

			oManageAppsController.onMenuAction(oEmptyEvent);
			assert.ok(fnDeleteAppVariant.calledOnce, "then deleteAppVariant is called once");
		});
	});

	QUnit.module("Given that a ManageApps controller is instantiated", {
		beforeEach: function () {
			window.bUShellNavigationTriggered = false;
			this.originalUShell = sap.ushell;
			// this overrides the ushell globally => we need to restore it!

			sap.ushell = Object.assign({}, sap.ushell, {
				Container : {
					getService: function () {
						return {
							toExternal : function() {
								window.bUShellNavigationTriggered = true;
							}
						};
					}
				}
			});
		},
		afterEach: function () {
			sandbox.restore();
			sap.ushell = this.originalUShell;
			delete window.bUShellNavigationTriggered;
		}
	}, function() {
		QUnit.test("when handleUiAdaptation is called", function(assert) {
			var oManageAppsController = new ManageAppsController();

			var modelPropertySpy = sandbox.stub(oManageAppsController, "getModelProperty");

			modelPropertySpy.onFirstCall().returns("SemObj");
			modelPropertySpy.onSecondCall().returns("Action");
			modelPropertySpy.onThirdCall().returns({
				"saveAs" : "customer.id"
			});

			var oButton = {
				getBindingContext : function() {
					return {
						sPath : "/appVariants/0"
					};
				}
			};

			var oEmptyEvent = new Event("emptyEventId", oButton, {
				button : oButton
			});

			oManageAppsController.handleUiAdaptation(oEmptyEvent);

			assert.ok(modelPropertySpy.calledThrice, "the getModelProperty is called three times");
		});
	});

	QUnit.done(function () {
		jQuery("#qunit-fixture").hide();
	});

});
