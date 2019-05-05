/* global QUnit */

sap.ui.define([
	"sap/ui/fl/variants/VariantModel",
	"sap/ui/fl/variants/VariantManagement",
	"sap/ui/fl/Utils",
	"sap/ui/fl/Change",
	"sap/ui/fl/FlexControllerFactory",
	"sap/ui/fl/variants/util/VariantUtil",
	"sap/ui/core/util/reflection/JsControlTreeModifier",
	"sap/ui/core/BusyIndicator",
	"sap/ui/thirdparty/jquery",
	"sap/ui/thirdparty/sinon-4"
],
function(
	VariantModel,
	VariantManagement,
	Utils,
	Change,
	FlexControllerFactory,
	VariantUtil,
	JsControlTreeModifier,
	BusyIndicator,
	jQuery,
	sinon
) {
	"use strict";

	var sandbox = sinon.sandbox.create();
	sinon.stub(Utils, "getCurrentLayer").returns("CUSTOMER");
	sinon.stub(BusyIndicator, "show");
	sinon.stub(BusyIndicator, "hide");
	var oDummyControl = {
		attachManage: sandbox.stub(),
		detachManage: sandbox.stub(),
		openManagementDialog: sandbox.stub()
	};

	QUnit.module("Given an instance of VariantModel", {
		beforeEach: function() {
			this.oData = {
				"variantMgmtId1": {
					"defaultVariant": "variant1",
					"originalDefaultVariant": "variant1",
					"variants": [
						{
							"author": "SAP",
							"key": "variantMgmtId1",
							"layer": "VENDOR",
							"title": "Standard",
							"favorite": true,
							"visible": true
						}, {
							"author": "Me",
							"key": "variant0",
							"layer": "CUSTOMER",
							"title": "variant A",
							"favorite": true,
							"visible": true
						}, {
							"author": "Me",
							"key": "variant1",
							"layer": "CUSTOMER",
							"title": "variant B",
							"favorite": false,
							"visible": true
						}
					]
				}
			};

			var oManifestObj = {
				"sap.app": {
					id: "MyComponent",
					"applicationVersion": {
						"version": "1.2.3"
					}
				}
			};
			var oManifest = new sap.ui.core.Manifest(oManifestObj);

			this.oComponent = {
				name: "MyComponent",
				appVersion: "1.2.3",
				getId: function() {
					return "RTADemoAppMD";
				},
				getManifest: function() {
					return oManifest;
				},
				getLocalId: function() {}
			};
			sandbox.stub(Utils, "getAppComponentForControl").returns(this.oComponent);
			sandbox.stub(Utils, "getComponentClassName").returns(this.oComponent.name);

			this.oFlexController = FlexControllerFactory.createForControl(this.oComponent, oManifest);
			this.fnRevertChangesStub = sandbox.stub(this.oFlexController, "revertChangesOnControl").resolves();
			this.fnApplyChangesStub = sandbox.stub(this.oFlexController, "applyVariantChanges").resolves();
			this.fnDeleteChangeStub = sandbox.stub(this.oFlexController, "deleteChange");
			sandbox.spy(VariantUtil, "initializeHashRegister");
			sandbox.spy(this.oFlexController._oChangePersistence._oVariantController, "assignResetMapListener");
			this.oModel = new VariantModel(this.oData, this.oFlexController, this.oComponent);
			this.fnLoadSwitchChangesStub = sandbox.stub(this.oModel.oChangePersistence, "loadSwitchChangesMapForComponent").returns({changesToBeReverted:[], changesToBeApplied:[]});
		},
		afterEach: function() {
			sandbox.restore();
			this.oModel.destroy();
			delete this.oFlexController;
		}
	}, function() {
		QUnit.test("when initializing a variant model instance", function(assert) {
			assert.ok(VariantUtil.initializeHashRegister.calledOnce, "then VariantUtil.initializeHashRegister() called once");
			assert.ok(VariantUtil.initializeHashRegister.calledOn(this.oModel), "then VariantUtil.initializeHashRegister() called with VariantModel as context");
		});

		QUnit.test("when listener for variant controller map reset is called", function(assert) {
			var aRevertChanges = ["revertMockChange"];
			var sVariantManagementReference = "variantMgmtId1";
			sandbox.stub(VariantUtil, "updateHasherEntry");
			this.fnLoadSwitchChangesStub.returns({
				changesToBeReverted: aRevertChanges
			});

			var fnResetListener = this.oModel.oVariantController.assignResetMapListener.getCall(0).args[0];
			assert.ok(typeof fnResetListener === "function", "then a listener function was assigned to variant controller map reset");
			return fnResetListener().then(function () {
				assert.ok(this.fnRevertChangesStub.calledWith(aRevertChanges, this.oComponent), "then current variant changes were reverted");
				assert.ok(VariantUtil.updateHasherEntry.calledWith({
					parameters: []
				}), "then hash register was reset");
				assert.strictEqual(this.oData[sVariantManagementReference].variants.length, 1, "then only one variant exists after reset");
				assert.strictEqual(this.oData[sVariantManagementReference].variants[0].key, sVariantManagementReference, "then the only variant existing is standard variant");
			}.bind(this));
		});

		QUnit.test("when variant management control is switched with unsaved personalization changes", function(assert) {
			var done = assert.async();
			var sVariantManagementReference = "variantMgmtId1";
			var sSourceVariantReference = this.oModel.oData[sVariantManagementReference].currentVariant;
			var oVarMgt = new VariantManagement(sVariantManagementReference);
			var aChangesToBeRemoved = ["change1", "change2"];
			oVarMgt.setModel(this.oModel, "$FlexVariants");

			sandbox.stub(this.oModel, "updateCurrentVariant").resolves();
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns(aChangesToBeRemoved);
			sandbox.stub(this.oModel, "_removeDirtyChanges").callsFake(function() {
				assert.deepEqual(arguments[0], aChangesToBeRemoved);
				assert.strictEqual(arguments[1], sVariantManagementReference);
				assert.strictEqual(arguments[2], sSourceVariantReference);
				assert.notOk(this.oModel.oData[sVariantManagementReference].modified, "then variantModel's 'modified' property set back to false");
				oVarMgt.destroy();
				done();
			}.bind(this));

			this.oModel.oData[sVariantManagementReference].currentVariant = "variant0";
			this.oModel.oData[sVariantManagementReference].modified = true; // to mock dirty changes
			this.oModel.checkUpdate(true); // triggers title change and calls _handleCurrentVariantChange
		});

		QUnit.test("when calling 'getData'", function(assert) {
			var sExpectedJSON = '{"variantMgmtId1":{"currentVariant":"variant1","defaultVariant":"variant1","originalCurrentVariant":"variant1","originalDefaultVariant":"variant1","variants":[{"author":"SAP","favorite":true,"key":"variantMgmtId1","layer":"VENDOR","originalFavorite":true,"originalTitle":"Standard","originalVisible":true,"title":"Standard","visible":true},{"author":"Me","favorite":true,"key":"variant0","layer":"CUSTOMER","originalFavorite":true,"originalTitle":"variant A","originalVisible":true,"title":"variant A","visible":true},{"author":"Me","favorite":false,"key":"variant1","layer":"CUSTOMER","originalFavorite":false,"originalTitle":"variant B","originalVisible":true,"title":"variant B","visible":true}]}}';
			var sCurrentVariant = this.oModel.getCurrentVariantReference("variantMgmtId1");
			assert.deepEqual(this.oModel.getData(), JSON.parse(sExpectedJSON));
			assert.equal(sCurrentVariant, "variant1", "then the key of the current variant is returned");
		});

		QUnit.test("when calling 'setModelPropertiesForControl'", function(assert) {
			this.oModel.getData()["variantMgmtId1"]._isEditable = true;
			this.oModel.setModelPropertiesForControl("variantMgmtId1", false, oDummyControl);
			assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, true, "the parameter variantsEditable is initially true");
			this.oModel.setModelPropertiesForControl("variantMgmtId1", true, oDummyControl);
			assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, false, "the parameter variantsEditable is set to false for bDesignTimeMode = true");
			this.oModel.setModelPropertiesForControl("variantMgmtId1", false, oDummyControl);
			assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, true, "the parameter variantsEditable is set to true for bDesignTimeMode = false");
		});

		QUnit.test("when calling 'setModelPropertiesForControl' and variant management control has property editable=false", function(assert) {
			this.oModel.getData()["variantMgmtId1"]._isEditable = false;
			this.oModel.setModelPropertiesForControl("variantMgmtId1", false, oDummyControl);
			assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, false, "the parameter variantsEditable is initially false");
			this.oModel.setModelPropertiesForControl("variantMgmtId1", true, oDummyControl);
			assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, false, "the parameter variantsEditable stays false for bDesignTimeMode = true");
			this.oModel.setModelPropertiesForControl("variantMgmtId1", false, oDummyControl);
			assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, false, "the parameter variantsEditable stays false for bDesignTimeMode = false");
		});

		QUnit.test("when calling 'setModelPropertiesForControl' with updateVariantInURL = true", function(assert) {
			this.oModel.getData()["variantMgmtId1"]._isEditable = true;
			this.oModel.getData()["variantMgmtId1"].updateVariantInURL = true;
			this.oModel.getData()["variantMgmtId1"].currentVariant = "variant0";

			sandbox.stub(this.oModel, "updateHasherEntry");
			sandbox.stub(VariantUtil, "getCurrentHashParamsFromRegister").returns(["currentHash1", "currentHash2"]);
			var mExpectedParameters = {
				parameters:	[],
				updateURL: true,
				ignoreRegisterUpdate: true
			};

			this.oModel.setModelPropertiesForControl("variantMgmtId1", false, oDummyControl);
			assert.strictEqual(VariantUtil.getCurrentHashParamsFromRegister.callCount, 0, "then VariantUtil.getCurrentHashParamsFromRegister not called");
			assert.equal(this.oModel._bDesignTimeMode, false, "the property _bDesignTimeMode is initially false");
			assert.deepEqual(this.oModel.updateHasherEntry.getCall(0).args[0], {},
				"then VariantModel.updateHasherEntry() called with an empty object initially");

			this.oModel.setModelPropertiesForControl("variantMgmtId1", true, oDummyControl);
			assert.strictEqual(VariantUtil.getCurrentHashParamsFromRegister.callCount, 0, "then VariantUtil.getCurrentHashParamsFromRegister not called");
			assert.equal(this.oModel._bDesignTimeMode, true, "the property _bDesignTimeMode is true when adaptation mode is on");
			assert.deepEqual(this.oModel.updateHasherEntry.getCall(1).args[0], mExpectedParameters,
				"then VariantModel.updateHasherEntry() called with empty hash parameters in UI adaptation mode");

			mExpectedParameters.parameters = ["currentHash1", "currentHash2"];
			this.oModel.setModelPropertiesForControl("variantMgmtId1", false, oDummyControl);
			assert.equal(this.oModel._bDesignTimeMode, false, "the property _bDesignTimeMode is set to false when adaptation mode is turned off");
			assert.deepEqual(this.oModel.updateHasherEntry.getCall(2).args[0], mExpectedParameters,
				"then VariantModel.updateHasherEntry() called with current hash parameters when not in UI adaptation mode");
			assert.strictEqual(VariantUtil.getCurrentHashParamsFromRegister.callCount, 1, "then VariantUtil.getCurrentHashParamsFromRegister called once");

			assert.strictEqual(this.oModel.updateHasherEntry.callCount, 3, "then VariantModel._updateVariantInURL() called 3 times");

		});

		QUnit.test("when calling 'switchToDefaultForVariant' for a current variant reference", function(assert) {
			var done = assert.async();
			this.oData["variantMgmtId1"].currentVariant = "variant0";
			sandbox.stub(this.oModel, "updateCurrentVariant").callsFake(
				function (sVariantManagementReference, sVariantReference) {
					return Promise.resolve().then(function () {
						if (sVariantManagementReference === "variantMgmtId1" && sVariantReference === this.oData["variantMgmtId1"].defaultVariant) {
							assert.ok(true, "then the correct variant management and variant references were passed to VariantModel.updateCurrentVariant");
						} else {
							assert.notOk(true, "then the correct variant management and variant references were not passed to VariantModel.updateCurrentVariant");
						}
						done();
					}.bind(this));
				}.bind(this)
			);
			this.oModel.switchToDefaultForVariant("variant0");
		});

		QUnit.test("when calling 'switchToDefaultForVariant' for a variant reference which is not the current variant", function(assert) {
			sandbox.stub(this.oModel, "updateCurrentVariant").returns(Promise.resolve());
			this.oModel.switchToDefaultForVariant("variant0");
			assert.strictEqual(this.oModel.updateCurrentVariant.callCount, 0, "then VariantModel.updateCurrentVariant not called");
		});


		QUnit.test("when calling 'switchToDefaultForVariant' without a variant reference", function(assert) {
			var done = assert.async();
			this.oData["dummy"] = {
				defaultVariant: "dummyDefaultVariant"
			};
			var aVariantManagementReferences = ["variantMgmtId1", "dummy"];
			var i = 0;
			sandbox.stub(this.oModel, "updateCurrentVariant").callsFake(
				function (sVariantManagementReference, sVariantReference) {
					return Promise.resolve().then(function () {
						if (sVariantManagementReference === aVariantManagementReferences[i] && sVariantReference === this.oData[aVariantManagementReferences[i]].defaultVariant) {
							assert.ok(true, "then each for each variant management reference default variant is passed to VariantModel.updateCurrentVariant");
							i++;
						} else {
							assert.notOk(true, "then variant management reference and default variant were not passed to VariantModel.updateCurrentVariant");
						}
						if (i === 1) {
							done();
						}
					}.bind(this));
				}.bind(this)
			);
			this.oModel.switchToDefaultForVariant();
		});

		QUnit.test("when calling 'switchToDefaultForVariantManagement' for a variant management reference", function(assert) {
			sandbox.stub(this.oModel, "updateCurrentVariant").returns(Promise.resolve());
			this.oModel.switchToDefaultForVariantManagement("variantMgmtId1");
			assert.ok(this.oModel.updateCurrentVariant.calledOnceWithExactly("variantMgmtId1", this.oData["variantMgmtId1"].defaultVariant),
				"then VariantModel.updateCurrentVariant called once with the correct parameters");
		});

		QUnit.test("when calling 'getVariantManagementReference'", function(assert) {
			var mVariantManagementReference = this.oModel.getVariantManagementReference("variant1");
			assert.deepEqual(mVariantManagementReference, {
				"variantIndex": 2,
				"variantManagementReference": "variantMgmtId1"
			}, "then the correct variant management reference is returned");
		});

		QUnit.test("when calling 'getVariantProperty' with title as property", function(assert) {
			sandbox.stub(this.oModel.oVariantController, "getVariant").returns(
				{
					content:
						{
							content: {
								title: this.oData["variantMgmtId1"].variants[2].title
							}
						}
				}
			);
			var sPropertyValue = this.oModel.getVariantProperty("variant1", "title");
			assert.equal(sPropertyValue, this.oData["variantMgmtId1"].variants[2].title, "then the correct title value is returned");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setTitle' to add a change", function(assert) {
			var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
			var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			var fnAddDirtyChangeStub = sandbox.stub(this.oModel.oChangePersistence, "addDirtyChange");
			var mPropertyBag = {
				"changeType" : "setTitle",
				"title" : "New Title",
				"layer" : "CUSTOMER",
				"variantReference" : "variant1",
				"appComponent" : this.oComponent
			};

			var oChange = this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, true);
			assert.equal(oChange.getText("title"), mPropertyBag.title, "then the new change created with the new title");
			assert.equal(oChange.getChangeType(), "setTitle", "then the new change created with 'setTitle' as changeType");
			assert.equal(oChange.getFileType(), "ctrl_variant_change", "then the new change created with 'ctrl_variant_change' as fileType");
			assert.ok(fnAddDirtyChangeStub.calledWith(oChange), "then 'FlexController.addDirtyChange called with the newly created change");
			assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].title, mPropertyBag.title, "then the new title updated in the VariantModel");
			assert.ok(fnSetVariantDataStub.calledOnce, "then '_setVariantData' of VariantController called");
			assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setTitle' to delete a change", function(assert) {
			var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
			var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			var fnChangeStub = sandbox.stub().returns({ getDefinition : function() {} });
			var fnDeleteChangeStub = sandbox.stub(this.oModel.oChangePersistence, "deleteChange");
			var mPropertyBag = {
				"changeType" : "setTitle",
				"title" : "Old Title",
				"variantReference" : "variant1",
				"change" : fnChangeStub()
			};

			var oChange = this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, false);
			assert.notOk(oChange, "then no change returned");
			assert.ok(fnDeleteChangeStub.calledWith(mPropertyBag.change), "then 'FlexController.deleteChange' called with the passed change");
			assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].title, mPropertyBag.title, "then the new title updated in the VariantModel");
			assert.ok(fnSetVariantDataStub.callCount, 0, "then '_setVariantData' of VariantController not called");
			assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setFavorite' to add a change", function(assert) {
			var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
			var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			var fnAddDirtyChangeStub = sandbox.stub(this.oModel.oChangePersistence, "addDirtyChange");
			var mPropertyBag = {
				"changeType" : "setFavorite",
				"favorite" : false,
				"layer" : "CUSTOMER",
				"variantReference" : "variant1",
				"appComponent" : this.oComponent
			};

			var oChange = this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, true);
			assert.equal(oChange.getContent().favorite, mPropertyBag.favorite, "then the new change created with the parameter 'favorite' in content");
			assert.equal(oChange.getChangeType(), "setFavorite", "then the new change created with 'setFavorite' as changeType");
			assert.equal(oChange.getFileType(), "ctrl_variant_change", "then the new change created with 'ctrl_variant_change' as fileType");
			assert.ok(fnAddDirtyChangeStub.calledWith(oChange), "then 'FlexController.addDirtyChange called with the newly created change");
			assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].favorite, mPropertyBag.favorite, "then the parameter 'favorite' updated in the VariantModel");
			assert.ok(fnSetVariantDataStub.calledOnce, "then '_setVariantData' of VariantController called");
			assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setFavorite' to delete a change", function(assert) {
			var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
			var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			var fnChangeStub = sandbox.stub().returns({ getDefinition : function() {} });
			var fnDeleteChangeStub = sandbox.stub(this.oModel.oChangePersistence, "deleteChange");
			var mPropertyBag = {
				"changeType" : "setFavorite",
				"favorite" : true,
				"variantReference" : "variant1",
				"change" : fnChangeStub()
			};

			var oChange = this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, false);
			assert.notOk(oChange, "then no change returned");
			assert.ok(fnDeleteChangeStub.calledWith(mPropertyBag.change), "then 'FlexController.deleteChange' called with the passed change");
			assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].favorite, mPropertyBag.favorite, "then the parameter 'favorite' updated in the VariantModel");
			assert.ok(fnSetVariantDataStub.callCount, 0, "then '_setVariantData' of VariantController not called");
			assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setVisible' to add a change", function(assert) {
			var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
			var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			var fnAddDirtyChangeStub = sandbox.stub(this.oModel.oChangePersistence, "addDirtyChange");
			var mPropertyBag = {
				"changeType" : "setVisible",
				"visible" : false,
				"layer" : "CUSTOMER",
				"variantReference" : "variant1",
				"appComponent" : this.oComponent
			};

			var oChange = this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, true);
			assert.equal(oChange.getContent().visible, mPropertyBag.visible, "then the new change created with the parameter 'visible' in content");
			assert.equal(oChange.getChangeType(), "setVisible", "then the new change created with 'setVisible' as changeType");
			assert.equal(oChange.getFileType(), "ctrl_variant_change", "then the new change created with 'ctrl_variant_change' as fileType");
			assert.ok(fnAddDirtyChangeStub.calledWith(oChange), "then 'FlexController.addDirtyChange called with the newly created change");
			assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].visible, mPropertyBag.visible, "then the parameter 'visible' updated in the VariantModel");
			assert.ok(fnSetVariantDataStub.calledOnce, "then '_setVariantData' of VariantController called");
			assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setVisible' to delete a change", function(assert) {
			var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
			var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			var fnChangeStub = sandbox.stub().returns({ getDefinition : function() {} });
			var fnDeleteChangeStub = sandbox.stub(this.oModel.oChangePersistence, "deleteChange");
			var mPropertyBag = {
				"changeType" : "setVisible",
				"visible" : true,
				"variantReference" : "variant1",
				"change" : fnChangeStub()
			};

			var oChange = this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, false);
			assert.notOk(oChange, "then no change returned");
			assert.ok(fnDeleteChangeStub.calledWith(mPropertyBag.change), "then 'FlexController.deleteChange' called with the passed change");
			assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].visible, mPropertyBag.visible, "then the parameter 'visible' updated in the VariantModel");
			assert.ok(fnSetVariantDataStub.callCount, 0, "then '_setVariantData' of VariantController not called");
			assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setDefault' to add a change", function(assert) {
			var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			var fnAddDirtyChangeStub = sandbox.stub(this.oModel.oChangePersistence, "addDirtyChange");
			var mPropertyBag = {
				"changeType" : "setDefault",
				"defaultVariant" : "variant0",
				"layer" : "CUSTOMER",
				"variantManagementReference" : "variantMgmtId1",
				"appComponent" : this.oComponent
			};
			this.oModel.oVariantController._mVariantManagement = {};
			this.oModel.oVariantController._mVariantManagement["variantMgmtId1"] = {defaultVariant : this.oData["variantMgmtId1"].defaultVariant};

			var oChange = this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, true);
			assert.equal(oChange.getContent().defaultVariant, mPropertyBag.defaultVariant, "then the new change created with the parameter 'visible' in content");
			assert.equal(oChange.getChangeType(), "setDefault", "then the new change created with 'setDefault' as changeType");
			assert.equal(oChange.getFileType(), "ctrl_variant_management_change", "then the new change created with 'ctrl_variant_change' as fileType");
			assert.ok(fnAddDirtyChangeStub.calledWith(oChange), "then 'FlexController.addDirtyChange called with the newly created change");
			assert.equal(this.oModel.getData()["variantMgmtId1"].defaultVariant, mPropertyBag.defaultVariant, "then the parameter 'defaultVariant' updated in the VariantModel");
			assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setDefault' to delete a change", function(assert) {
			var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			var fnChangeStub = sandbox.stub().returns({ getDefinition : function() {} });
			var fnDeleteChangeStub = sandbox.stub(this.oModel.oChangePersistence, "deleteChange");
			var mPropertyBag = {
					"changeType" : "setDefault",
					"defaultVariant" : "variant1",
					"variantManagementReference" : "variantMgmtId1",
					"change" : fnChangeStub()
				};
			this.oModel.oVariantController._mVariantManagement = {};
			this.oModel.oVariantController._mVariantManagement["variantMgmtId1"] = {defaultVariant : this.oData["variantMgmtId1"].defaultVariant};

			var oChange = this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, false);
			assert.notOk(oChange, "then no change returned");
			assert.ok(fnDeleteChangeStub.calledWith(mPropertyBag.change), "then 'FlexController.deleteChange' called with the passed change");
			assert.equal(this.oModel.getData()["variantMgmtId1"].defaultVariant, mPropertyBag.defaultVariant, "then the parameter 'defaultVariant' updated in the VariantModel");
			assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setDefault' with different current and default variants, in UI adaptation mode", function(assert) {
			var mPropertyBag = {
				"changeType" : "setDefault",
				"defaultVariant" : "variant1",
				"layer" : "CUSTOMER",
				"variantManagementReference" : "variantMgmtId1",
				"appComponent" : this.oComponent,
				"change" : { getDefinition : function() {} }
			};
			sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			sandbox.stub(VariantUtil, "getCurrentHashParamsFromRegister").returns([]);
			sandbox.stub(this.oModel.oChangePersistence, "addDirtyChange");
			sandbox.stub(this.oModel, "updateHasherEntry");

			// set adaptation mode true
			this.oModel._bDesignTimeMode = true;

			// mock current variant id to make it different
			this.oModel.oData["variantMgmtId1"].currentVariant = "variantCurrent";

			// mock variant controller data
			this.oModel.oVariantController._mVariantManagement = {};
			this.oModel.oVariantController._mVariantManagement["variantMgmtId1"] = {defaultVariant : this.oData["variantMgmtId1"].defaultVariant};

			this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, true);
			assert.ok( this.oModel.updateHasherEntry.calledWithExactly({
				parameters: [this.oModel.oData["variantMgmtId1"].currentVariant],
				updateURL: !this.oModel._bDesignTimeMode
			}), "then the 'updateHasherEntry' called with the current variant id as a parameter in UI adaptation mode");
		});

		QUnit.test("when calling 'setVariantProperties' for 'setDefault' with same current and default variants, in personalization mode", function(assert) {
			var mPropertyBag = {
				"changeType" : "setDefault",
				"defaultVariant" : "variant1",
				"layer" : "CUSTOMER",
				"variantManagementReference" : "variantMgmtId1",
				"appComponent" : this.oComponent,
				"change" : { getDefinition : function() {} }
			};
			sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
			// current variant already exists in hash parameters
			sandbox.stub(VariantUtil, "getCurrentHashParamsFromRegister").returns([this.oData["variantMgmtId1"].currentVariant]);
			sandbox.stub(this.oModel.oChangePersistence, "addDirtyChange");
			sandbox.stub(this.oModel, "updateHasherEntry");

			// set adaptation mode false
			this.oModel._bDesignTimeMode = false;

			// mock variant controller data
			this.oModel.oVariantController._mVariantManagement = {};
			this.oModel.oVariantController._mVariantManagement["variantMgmtId1"] = {defaultVariant : this.oData["variantMgmtId1"].defaultVariant};

			this.oModel.setVariantProperties("variantMgmtId1", mPropertyBag, true);
			assert.ok( this.oModel.updateHasherEntry.calledWithExactly({
				parameters: [],
				updateURL: !this.oModel._bDesignTimeMode
			}), "then the 'updateHasherEntry' called without the current variant id as a parameter in personalization mode");
		});

		QUnit.test("when calling 'updateCurrentVariant' with root app component", function(assert) {
			var fnUpdateCurrentVariantInMapStub = sandbox.stub(this.oModel.oVariantController, "updateCurrentVariantInMap");
			var oSetVariantSwitchPromiseStub = sandbox.stub(this.oFlexController, "setVariantSwitchPromise");

			assert.equal(this.oModel.oData["variantMgmtId1"].currentVariant, "variant1", "then initially current variant is variant1");
			assert.equal(this.oModel.oData["variantMgmtId1"].originalCurrentVariant, "variant1", "then initially original current variant is variant1");

			this.oModel.oData["variantMgmtId1"].updateVariantInURL = true;
			return this.oModel.updateCurrentVariant("variantMgmtId1", "variant0", this.oModel.oAppComponent)
			.then(function() {
				assert.ok(this.fnLoadSwitchChangesStub.calledWith({
					variantManagementReference: "variantMgmtId1",
					currentVariantReference: "variant1",
					newVariantReference: "variant0"
				}), "then ChangePersistence.loadSwitchChangesMapForComponent() called with correct parameters");
				assert.ok(oSetVariantSwitchPromiseStub.calledBefore(this.fnRevertChangesStub), "the promise was first set");
				assert.ok(this.fnLoadSwitchChangesStub.calledOnce, "then loadSwitchChangesMapForComponent called once from ChangePersitence");
				assert.ok(this.fnRevertChangesStub.calledOnce, "then revertChangesOnControl called once in FlexController");
				assert.ok(this.fnApplyChangesStub.calledOnce, "then applyVariantChanges called once in FlexController");
				assert.ok(fnUpdateCurrentVariantInMapStub.calledWith("variantMgmtId1", "variant0"), "then variantController.updateCurrentVariantInMap called with the right parameters");
				assert.equal(this.oModel.oData["variantMgmtId1"].currentVariant, "variant0", "then current variant updated to variant0");
				assert.equal(this.oModel.oData["variantMgmtId1"].originalCurrentVariant, "variant0", "then original current variant updated to variant0");
			}.bind(this));
		});

		QUnit.test("when calling 'updateCurrentVariant' without a root app component", function(assert) {
			var fnUpdateCurrentVariantInMapStub = sandbox.stub(this.oModel.oVariantController, "updateCurrentVariantInMap");
			var oReturnObject = {};

			this.oModel.oData["variantMgmtId1"].updateVariantInURL = true;
			this.fnLoadSwitchChangesStub.returns(oReturnObject);
			return this.oModel.updateCurrentVariant("variantMgmtId1", "variant0")
				.then(function() {
					assert.ok(this.fnLoadSwitchChangesStub.calledWith({
						variantManagementReference: "variantMgmtId1",
						currentVariantReference: "variant1",
						newVariantReference: "variant0"
					}), "then ChangePersistence.loadSwitchChangesMapForComponent() called with correct parameters");
					assert.deepEqual(this.fnRevertChangesStub.getCall(0).args[1], this.oComponent, "then revertChangesOnControl called in FlexController with the correct component");
					assert.deepEqual(this.fnApplyChangesStub.getCall(0).args[1], this.oComponent, "then applyVariantChanges called in FlexController with the correct component");
					assert.ok(fnUpdateCurrentVariantInMapStub.calledWith("variantMgmtId1", "variant0"), "then variantController.updateCurrentVariantInMap called with the right parameters");
				}.bind(this));
		});

		QUnit.test("when calling 'updateCurrentVariant' with dirty changes in current variant", function(assert) {
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges");

			this.oModel.oData["variantMgmtId1"].modified = true;
			assert.equal(this.oModel.oData["variantMgmtId1"].currentVariant, "variant1", "then initially current variant is variant1");
			return this.oModel.updateCurrentVariant("variantMgmtId1", "variant0")
			.then(function() {
				assert.equal(this.oModel.oData["variantMgmtId1"].originalCurrentVariant, "variant0", "then original current variant updated to variant0");
			}.bind(this));
		});

		QUnit.test("when calling 'updateCurrentVariant' twice without waiting for the first one to be finished", function(assert) {
			sandbox.stub(this.oModel.oVariantController, "updateCurrentVariantInMap");
			assert.equal(this.oModel.oData["variantMgmtId1"].currentVariant, "variant1", "then initially current variant is variant1");
			assert.equal(this.oModel.oData["variantMgmtId1"].originalCurrentVariant, "variant1", "then initially original current variant is variant1");

			var oSetVariantSwitchPromiseStub = sandbox.stub(this.oFlexController, "setVariantSwitchPromise");
			this.oFlexController.revertChangesOnControl.restore();
			var oRevertChangesStub = sandbox.stub(this.oFlexController, "revertChangesOnControl")
			.onCall(0).returns(new Promise(function(resolve) {
				setTimeout(function() {
					resolve();
				}, 0);
			}))
			.onCall(1).resolves();
			this.oModel.updateCurrentVariant("variantMgmtId1", "variant2", this.oModel.oAppComponent);
			return this.oModel.updateCurrentVariant("variantMgmtId1", "variant0", this.oModel.oAppComponent)
			.then(this.oModel._oVariantSwitchPromise)
			.then(function() {
				assert.ok(true, "the internal promise '_oVariantSwitchPromise' is resolved");
				assert.equal(this.fnLoadSwitchChangesStub.callCount, 2, "then loadSwitchChangesMapForComponent called twice from ChangePersitence");
				assert.equal(oRevertChangesStub.callCount, 2, "then revertChangesOnControl called twice in FlexController");
				assert.equal(oSetVariantSwitchPromiseStub.callCount, 2, "then oSetVariantSwitchPromiseStub called twice in FlexController");
				assert.equal(this.fnApplyChangesStub.callCount, 2, "then applyVariantChanges called twice in FlexController");
				assert.equal(this.oModel.oData["variantMgmtId1"].currentVariant, "variant0", "then current variant updated to variant0");
				assert.equal(this.oModel.oData["variantMgmtId1"].originalCurrentVariant, "variant0", "then original current variant updated to variant0");
			}.bind(this));
		});

		QUnit.test("when calling 'updateCurrentVariant' twice without waiting for the first one to be failed and finished", function(assert) {
			sandbox.stub(this.oModel.oVariantController, "updateCurrentVariantInMap");
			assert.equal(this.oModel.oData["variantMgmtId1"].currentVariant, "variant1", "then initially current variant is variant1");
			assert.equal(this.oModel.oData["variantMgmtId1"].originalCurrentVariant, "variant1", "then initially original current variant is variant1");

			var oSetVariantSwitchPromiseStub = sandbox.stub(this.oFlexController, "setVariantSwitchPromise");
			this.oFlexController.revertChangesOnControl.restore();
			var oRevertChangesStub = sandbox.stub(this.oFlexController, "revertChangesOnControl")
			.onCall(0).returns(new Promise(function(resolve, reject) {
				setTimeout(function() {
					reject();
				}, 0);
			}))
			.onCall(1).resolves();
			this.oModel.updateCurrentVariant("variantMgmtId1", "variant2", this.oModel.oAppComponent);
			return this.oModel.updateCurrentVariant("variantMgmtId1", "variant0", this.oModel.oAppComponent)
			.then(this.oModel._oVariantSwitchPromise)
			.then(function() {
				assert.ok(true, "the internal promise '_oVariantSwitchPromise' is resolved");
				assert.equal(this.fnLoadSwitchChangesStub.callCount, 2, "then loadSwitchChangesMapForComponent called twice from ChangePersitence");
				assert.equal(oRevertChangesStub.callCount, 2, "then revertChangesOnControl called twice in FlexController");
				assert.equal(oSetVariantSwitchPromiseStub.callCount, 2, "then oSetVariantSwitchPromiseStub called twice in FlexController");
				assert.equal(this.fnApplyChangesStub.callCount, 1, "then applyVariantChanges called only for the first call");
				assert.equal(this.oModel.oData["variantMgmtId1"].currentVariant, "variant0", "then current variant updated to variant0");
				assert.equal(this.oModel.oData["variantMgmtId1"].originalCurrentVariant, "variant0", "then original current variant updated to variant0");
			}.bind(this));
		});

		QUnit.test("when calling '_updateVariantInURL' with no 'sap-ui-fl-control-variant-id' URL parameter", function(assert) {
			var oParameters = {
				params: {
					"sap-ui-fl-control-variant-id": []
				}
			};

			var aModifiedUrlTechnicalParameters = ["variant0"];

			sandbox.stub(this.oModel.oVariantController, "getVariant").withArgs("variantMgmtId1", "variantMgmtId1").returns(true);
			var fnGetParsedURLHashStub = sandbox.stub(Utils, "getParsedURLHash").returns(oParameters);
			var fnUpdateHasherEntryStub = sandbox.stub(this.oModel, "updateHasherEntry");
			var fnGetVariantIndexInURLSpy = sandbox.spy(this.oModel, "getVariantIndexInURL");

			this.oModel._updateVariantInURL("variantMgmtId1", "variant0");
			assert.ok(fnGetParsedURLHashStub.calledOnce, "then url parameters requested once");
			assert.deepEqual(fnGetVariantIndexInURLSpy.returnValues[0], {
				parameters: oParameters.params,
				index: -1
			}, "then VariantModel.getVariantIndexInURL returns the correct parameters and index");
			assert.ok(fnUpdateHasherEntryStub.calledWithExactly({
				parameters: aModifiedUrlTechnicalParameters,
				updateURL: true
			}), "then VariantModel.updateHasherEntry() called with the correct object as parameter");
		});

		QUnit.test("when calling '_updateVariantInURL' with valid 'sap-ui-fl-control-variant-id' encoded URL parameter for the same variant management", function(assert) {
			var aExistingParameters = ["Dummy::'123'/'456'", "variantMgmtId1"];
			var sTargetVariantId = "variant0";
			var oParameters = {
				params: {
					"sap-ui-fl-control-variant-id": aExistingParameters.map( function(sExistingParameter) {
						return encodeURIComponent(sExistingParameter);
					})
				}
			};

			sandbox.stub(this.oModel.oVariantController, "getVariant").withArgs("variantMgmtId1", "variantMgmtId1").returns(true);
			var fnGetParsedURLHashStub = sandbox.stub(Utils, "getParsedURLHash").returns(oParameters);
			var fnUpdateHasherEntryStub = sandbox.stub(this.oModel, "updateHasherEntry");
			var fnGetVariantIndexInURLSpy = sandbox.spy(this.oModel, "getVariantIndexInURL");

			this.oModel._updateVariantInURL("variantMgmtId1", sTargetVariantId);
			assert.ok(fnGetParsedURLHashStub.calledOnce, "then url parameters requested once");
			assert.deepEqual(fnGetVariantIndexInURLSpy.returnValues[0],
				{
					parameters: { "sap-ui-fl-control-variant-id": aExistingParameters },
					index: 1
				}, "then VariantModel.getVariantIndexInURL returns the correct parameters and index");
			assert.ok(fnUpdateHasherEntryStub.calledWithExactly({
				parameters: [aExistingParameters[0], sTargetVariantId],
				updateURL: true
			}), "then VariantModel.updateHasherEntry() called with the correct object as parameter");
		});

		QUnit.test("when calling '_updateVariantInURL' in standalone mode (without a ushell container)", function(assert) {
			var fnGetParsedURLHashStub = sandbox.stub(Utils, "getParsedURLHash").returns({});
			var fnUpdateHasherEntryStub = sandbox.stub(this.oModel, "updateHasherEntry");
			var fnGetVariantIndexInURLSpy = sandbox.spy(this.oModel, "getVariantIndexInURL");

			this.oModel._updateVariantInURL("variantMgmtId1", "variant0");

			assert.ok(fnGetParsedURLHashStub.calledOnce, "then url parameters requested once");
			assert.deepEqual(fnGetVariantIndexInURLSpy.returnValues[0], {
				parameters: undefined,
				index: -1
			}, "then VariantModel.getVariantIndexInURL returns the correct parameters and index");
			assert.strictEqual(fnUpdateHasherEntryStub.callCount, 0, "then VariantModel.updateHasherEntry() not called");
		});

		QUnit.test("when calling '_updateVariantInURL' for the default variant with no 'sap-ui-fl-control-variant-id' URL parameter", function(assert) {
			sandbox.stub(Utils, "getParsedURLHash").returns({
				params: {}
			});
			var fnUpdateHasherEntryStub = sandbox.stub(this.oModel, "updateHasherEntry");

			this.oModel._updateVariantInURL("variantMgmtId1", "variant1"); //default variant

			assert.strictEqual(fnUpdateHasherEntryStub.callCount, 0, "then VariantModel.updateHasherEntry() not called");
		});

		QUnit.test("when calling '_updateVariantInURL' for the default variant with a valid 'sap-ui-fl-control-variant-id' URL parameter for the same variant management", function(assert) {
			sandbox.stub(Utils, "getParsedURLHash").returns({
				params: {
					"sap-ui-fl-control-variant-id": ["Dummy", "variantMgmtId1", "Dummy1"]
				}
			});
			var fnUpdateHasherEntryStub = sandbox.stub(this.oModel, "updateHasherEntry");
			sandbox.stub(this.oModel.oVariantController, "getVariant").withArgs("variantMgmtId1", "variantMgmtId1").returns(true);

			this.oModel._updateVariantInURL("variantMgmtId1", "variant1"); //default variant

			assert.ok(fnUpdateHasherEntryStub.calledWith({
				parameters: ["Dummy", "Dummy1"],
				updateURL: true
			}), "then VariantModel.updateHasherEntry() called with the correct object with a parameter list excluding default variant");
		});

		QUnit.test("when calling '_updateVariantInURL' while in adaptation mode with parameters present in the hash register for the current index", function(assert) {
			// to verify ushell
			sandbox.stub(Utils, "getParsedURLHash").returns({params: true});
			// return parameters saved at the current index of the hash register
			sandbox.stub(VariantUtil, "getCurrentHashParamsFromRegister").returns(["Dummy", "variantMgmtId1", "Dummy1"]);
			sandbox.stub(this.oModel.oVariantController, "getVariant").withArgs("variantMgmtId1", "variantMgmtId1").returns(true);
			var fnUpdateHasherEntryStub = sandbox.stub(this.oModel, "updateHasherEntry");
			this.oModel._bDesignTimeMode = true;

			this.oModel._updateVariantInURL("variantMgmtId1", "variant0");

			assert.ok(fnUpdateHasherEntryStub.calledWith({
				parameters: ["Dummy", "variant0", "Dummy1"],
				updateURL: false
			}), "then VariantModel.updateHasherEntry() called with the update parameter list but the url is not updated");
		});

		QUnit.test("when calling '_updateVariantInURL' while in adaptation mode and there is no parameter saved in the hash register of the current index", function(assert) {
			// to verify ushell
			sandbox.stub(Utils, "getParsedURLHash").returns({params: true});

			var fnUpdateHasherEntryStub = sandbox.stub(this.oModel, "updateHasherEntry");
			this.oModel._bDesignTimeMode = true;

			this.oModel._updateVariantInURL("variantMgmtId1", "variant0");

			assert.ok(fnUpdateHasherEntryStub.calledWith({
				parameters: ["variant0"],
				updateURL: false
			}), "then VariantModel.updateHasherEntry() called with the correct object with an empty parameter list");
		});

		QUnit.test("when calling '_removeDirtyChanges'", function(assert) {
			var oChange1 = new Change({
				"fileName": "change1",
				"selector": {
					"id": "abc123"
				}
			});
			var oChange2 = new Change({
				"fileName": "change2",
				"selector": {
					"id": "abc123"
				}
			});
			var oChange3 = new Change({
				"fileName": "change3",
				"selector": {
					"id": "abc123"
				}
			});
			var oChange4 = new Change({
				"fileName": "change4",
				"selector": {
					"id": "abc123"
				}
			});
			var aDirtyChanges = [oChange2, oChange3, oChange4];

			sandbox.stub(this.oModel.oChangePersistence, "getDirtyChanges").returns(aDirtyChanges);
			sandbox.stub(this.oModel.oVariantController, "removeChangeFromVariant");
			var aChanges = [oChange1, oChange2, oChange3];
			var oMockControlComponent = {id: "mockControlComponent"};

			this.oModel._removeDirtyChanges(aChanges, "variantMgmtId1", this.oModel.oData["variantMgmtId1"].currentVariant, oMockControlComponent);
			assert.ok(this.fnDeleteChangeStub.firstCall.calledWith(aDirtyChanges[0], oMockControlComponent), "and 'deleteChange' once with the first matching dirty change and the passed component");
			assert.ok(this.fnDeleteChangeStub.secondCall.calledWith(aDirtyChanges[1], oMockControlComponent), "and 'deleteChange' once with the second matching dirty change and the passed component");
		});

		QUnit.test("when calling '_duplicateVariant' on the same layer", function(assert) {
			var oSourceVariant = {
				"content": {
					"fileName":"variant0",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"variant2",
					"content":{
						"title":"variant A"
					},
					"selector":{},
					"layer":"CUSTOMER",
					"namespace":"Dummy.Component"
				},
				"controlChanges": [],
				"variantChanges": {}
			};

			var mPropertyBag = {
				newVariantReference: "newVariant",
				sourceVariantReference: "variant0",
				variantManagementReference: "variantMgmtId1",
				layer: "CUSTOMER",
				title: "variant A Copy"
			};

			var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
			oSourceVariantCopy.content.content.title = oSourceVariant.content.content.title + " Copy";
			oSourceVariantCopy.content.fileName = "newVariant";
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns([]);
			sandbox.stub(Utils, "compareAgainstCurrentLayer").returns(0);
			sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);
			var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);
			assert.deepEqual(oDuplicateVariant, oSourceVariantCopy);
		});

		QUnit.test("when calling '_duplicateVariant' from CUSTOMER layer referencing variant on VENDOR layer", function(assert) {
			var oSourceVariant = {
				"content": {
					"fileName":"variant0",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"variant2",
					"content":{
						"title":"variant A"
					},
					"selector":{},
					"layer":"VENDOR",
					"namespace":"Dummy.Component"
				},
				"controlChanges": [],
				"variantChanges": {}
			};

			var mPropertyBag = {
				newVariantReference: "newVariant",
				sourceVariantReference: "variant0",
				variantManagementReference: "variantMgmtId1",
				layer: "VENDOR",
				title: "variant A Copy"
			};

			var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
			oSourceVariantCopy.content.content.title = oSourceVariant.content.content.title + " Copy";
			oSourceVariantCopy.content.fileName = "newVariant";
			oSourceVariantCopy.content.variantReference = "variant0";
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns([]);
			sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);
			var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);
			assert.deepEqual(oDuplicateVariant, oSourceVariantCopy, "then the duplicate variant returned with customized properties");
		});

		QUnit.test("when calling '_duplicateVariant' from CUSTOMER layer with reference to a variant on VENDOR layer with one CUSTOMER and one VENDOR change", function(assert) {
			// non-personalization mode
			this.oModel._bDesignTimeMode = true;
			var oChange0 = new Change({
				"fileName": "change0",
				"selector": {"id": "abc123"},
				"variantReference": "variant0",
				"layer": "CUSTOMER",
				"support": {},
				"reference": "test.Component",
				"packageName": "MockPackageName"
			});
			var oChange1 = new Change({
				"fileName": "change1",
				"selector": {"id": "abc123"},
				"variantReference": "variant0",
				"layer": "VENDOR",
				"support": {},
				"reference": "test.Component"
			});

			var oSourceVariant = {
				"content": {
					"fileName":"variant0",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"variant2",
					"content":{
						"title":"variant A"
					},
					"selector":{},
					"layer":"VENDOR",
					"namespace":"Dummy.Component"
				},
				"controlChanges": [oChange0, oChange1],
				"variantChanges": {}
			};

			var mPropertyBag = {
				newVariantReference: "newVariant",
				sourceVariantReference: "variant0",
				variantManagementReference: "variantMgmtId1",
				layer: "VENDOR",
				title: "variant A Copy"
			};

			var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
			oSourceVariantCopy.content.content.title = oSourceVariant.content.content.title + " Copy";
			oSourceVariantCopy.content.fileName = "newVariant";
			oSourceVariantCopy.content.variantReference = "variant0";

			sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns(oSourceVariant.controlChanges);
			var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);

			assert.deepEqual(oDuplicateVariant.content, oSourceVariantCopy.content, "then the duplicate variant returned with customized properties");
			assert.equal(oDuplicateVariant.controlChanges.length, 1, "then only one change duplicated");
			assert.equal(oDuplicateVariant.controlChanges[0].getDefinition().variantReference, "newVariant", "then the change has the correct variantReference");
			assert.equal(oDuplicateVariant.controlChanges[0].getDefinition().support.sourceChangeFileName, oSourceVariant.controlChanges[0].getDefinition().fileName, "then the fileName of the origin change is written to support object");
			assert.equal(oDuplicateVariant.controlChanges[0].getLayer(), Utils.getCurrentLayer(), "then only the change with the same layer is duplicated");
			assert.equal(oDuplicateVariant.controlChanges[0].getPackage(), "$TMP", "then the package name of the duplicate change was set to $TMP");
			assert.equal(oDuplicateVariant.content.variantReference, oSourceVariant.content.fileName, "then the duplicate variant has reference to the source variant from VENDOR layer");
		});

		QUnit.test("when calling '_duplicateVariant' from USER layer with reference to a variant on VENDOR layer with one USER, one CUSTOMER, one VENDOR change", function(assert) {
			Utils.getCurrentLayer.restore();
			var oChange0 = new Change({
				"fileName": "change0",
				"selector": {"id": "abc123"},
				"variantReference": "variant0",
				"layer": "USER",
				"support": {},
				"reference": "test.Component"
			});
			var oChange1 = new Change({
				"fileName": "change1",
				"selector": {"id": "abc123"},
				"variantReference": "variant0",
				"layer": "CUSTOMER",
				"support": {},
				"reference": "test.Component"
			});
			var oChange2 = new Change({
				"fileName": "change2",
				"selector": {"id": "abc123"},
				"variantReference": "variant0",
				"layer": "VENDOR",
				"support": {},
				"reference": "test.Component"
			});

			var oSourceVariant = {
				"content": {
					"fileName":"variant0",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"variant2",
					"content":{
						"title":"variant A"
					},
					"selector":{},
					"layer":"VENDOR",
					"namespace":"Dummy.Component"
				},
				"controlChanges": [oChange0, oChange1, oChange2],
				"variantChanges": {}
			};

			var mPropertyBag = {
				newVariantReference: "newVariant",
				sourceVariantReference: "variant0",
				variantManagementReference: "variantMgmtId1",
				layer: "VENDOR",
				title: "variant A Copy"
			};

			var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
			oSourceVariantCopy.content.content.title = oSourceVariant.content.content.title + " Copy";
			oSourceVariantCopy.content.fileName = "newVariant";
			oSourceVariantCopy.content.variantReference = "variant0";

			sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns(oSourceVariant.controlChanges);
			var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);

			assert.deepEqual(oDuplicateVariant.content, oSourceVariantCopy.content, "then the duplicate variant returned with customized properties");
			assert.equal(oDuplicateVariant.controlChanges.length, 1, "then only one change duplicated");
			assert.equal(oDuplicateVariant.controlChanges[0].getDefinition().variantReference, "newVariant", "then the change has the correct variantReference");
			assert.equal(oDuplicateVariant.controlChanges[0].getDefinition().support.sourceChangeFileName, oSourceVariant.controlChanges[0].getDefinition().fileName, "then the fileName of the origin change is written to support object");
			assert.equal(oDuplicateVariant.controlChanges[0].getLayer(), Utils.getCurrentLayer(true), "then only the change with the same layer is duplicated");
			assert.equal(oDuplicateVariant.content.variantReference, oSourceVariant.content.fileName, "then the duplicate variant has reference to the source variant from VENDOR layer");
			sinon.stub(Utils, "getCurrentLayer").returns("CUSTOMER");
		});

		QUnit.test("when calling '_duplicateVariant' from CUSTOMER layer with reference to a variant with no layer", function(assert) {
			var oSourceVariant = {
				"content": {
					"fileName":"variant0",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"variant0",
					"content":{
						"title":"variant A"
					},
					"selector":{},
					"namespace":"Dummy.Component"
				},
				"controlChanges": [],
				"variantChanges": {}
			};

			var mPropertyBag = {
				newVariantReference: "newVariant",
				sourceVariantReference: "variant0",
				variantManagementReference: "variantMgmtId1",
				layer: "CUSTOMER",
				title: "variant A Copy"
			};

			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns([]);
			sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);

			var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);
			var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
			oSourceVariantCopy.content.content.title = oSourceVariant.content.content.title + " Copy";
			oSourceVariantCopy.content.fileName = "newVariant";
			oSourceVariantCopy.content.layer = "CUSTOMER";

			assert.deepEqual(oDuplicateVariant, oSourceVariantCopy, "then the duplicate variant returned with customized properties");
		});

		QUnit.test("when calling '_duplicateVariant' from USER layer with reference to a variant with no layer", function(assert) {
			Utils.getCurrentLayer.restore();
			var oSourceVariant = {
				"content": {
					"fileName":"variant0",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"variant0",
					"content":{
						"title":"variant A"
					},
					"selector":{},
					"namespace":"Dummy.Component"
				},
				"controlChanges": [],
				"variantChanges": {}
			};

			var mPropertyBag = {
				newVariantReference: "newVariant",
				sourceVariantReference: "variant0",
				variantManagementReference: "variantMgmtId1",
				layer: "USER",
				title: "variant A Copy"
			};

			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns([]);
			sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);

			var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);
			var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
			oSourceVariantCopy.content.content.title = oSourceVariant.content.content.title + " Copy";
			oSourceVariantCopy.content.fileName = "newVariant";
			oSourceVariantCopy.content.layer = "USER";

			assert.deepEqual(oDuplicateVariant, oSourceVariantCopy, "then the duplicate variant returned with customized properties");
			sinon.stub(Utils, "getCurrentLayer").returns("CUSTOMER");
		});

		QUnit.test("when calling '_duplicateVariant' from CUSTOMER layer with reference to a variant on the same layer", function(assert) {
			// non-personalization mode
			this.oModel._bDesignTimeMode = true;
			var oChange0 = new Change({"fileName":"change0", "selector": {"id": "abc123"}, "variantReference":"variant0", "layer": "CUSTOMER", "support": {}, "reference": "test.Component"});
			var oChange1 = new Change({"fileName":"change1", "selector": {"id": "abc123"}, "variantReference":"variant0", "layer": "CUSTOMER", "support": {}, "reference": "test.Component"});

			var oSourceVariant = {
				"content": {
					"fileName":"variant0",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"variant2",
					"content":{
						"title":"variant A"
					},
					"selector":{},
					"layer":"CUSTOMER",
					"namespace":"Dummy.Component"
				},
				"controlChanges": [oChange0, oChange1],
				"variantChanges": {}
			};

			var mPropertyBag = {
				newVariantReference: "newVariant",
				sourceVariantReference: "variant0",
				variantManagementReference: "variantMgmtId1",
				layer: "CUSTOMER",
				title: "variant A Copy"
			};

			sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns(oSourceVariant.controlChanges);

			var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
			oSourceVariantCopy.content.content.title = oSourceVariant.content.content.title + " Copy";
			oSourceVariantCopy.content.fileName = "newVariant";
			var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);

			assert.deepEqual(oDuplicateVariant.content, oSourceVariantCopy.content, "then the duplicate variant returned with customized properties");
			assert.equal(oDuplicateVariant.controlChanges.length, 2, "then both changes duplicated");
			assert.equal(oDuplicateVariant.controlChanges[0].getDefinition().variantReference, "newVariant", "then the change has the correct variantReference");
			assert.equal(oDuplicateVariant.controlChanges[1].getDefinition().variantReference, "newVariant", "then the change has the correct variantReference");
			assert.equal(oDuplicateVariant.controlChanges[0].getDefinition().support.sourceChangeFileName, oChange0.getDefinition().fileName, "then first duplicate variant change's support.sourceChangeFileName property set to source change's fileName");
			assert.equal(oDuplicateVariant.controlChanges[1].getDefinition().support.sourceChangeFileName, oChange1.getDefinition().fileName, "then second duplicate variant change's support.sourceChangeFileName property set to source change's fileName");
			assert.equal(oDuplicateVariant.content.variantReference, oSourceVariant.content.variantReference, "then the duplicate variant references to the reference of the source variant");
		});

		QUnit.test("when calling '_ensureStandardVariantExists'", function(assert) {
			var oVariantControllerContent = {
				"variants": [{
				"content": {
					"fileName": "mockVariantManagement",
					"fileType": "ctrl_variant",
					"variantManagementReference": "mockVariantManagement",
					"variantReference": "",
					"content": {
						"title": "Standard",
						"favorite": true,
						"visible": true
					}
				},
				"controlChanges": [],
				"variantChanges": {}
			}
			],
				"defaultVariant": "mockVariantManagement",
				"variantManagementChanges": {}
			};

			var oVariantModelResponse = {
				"currentVariant": "mockVariantManagement",
				"originalCurrentVariant": "mockVariantManagement",
				"defaultVariant": "mockVariantManagement",
				"originalDefaultVariant": "mockVariantManagement",
				"variants": [{
					"key": "mockVariantManagement",
					"title": "Standard",
					"originalTitle": "Standard",
					"favorite": true,
					"originalFavorite": true,
					"visible": true,
					"originalVisible": true
				}]
			};

			this.oModel.setData({});
			this.oModel._ensureStandardVariantExists("mockVariantManagement");

			assert.deepEqual(this.oModel.oData["mockVariantManagement"], oVariantModelResponse, "then standard variant entry created for variant model");
			assert.deepEqual(this.oModel.oVariantController._mVariantManagement["mockVariantManagement"], oVariantControllerContent, "then standard variant entry created for variant controller");
		});

		QUnit.test("when calling 'copyVariant'", function(assert) {
			var fnAddVariantToControllerStub = sandbox.stub(this.oModel.oVariantController, "addVariantToVariantManagement").returns(3);
			var oVariantData = {
				"content": {
					"fileName":"variant0",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"",
					"reference":"Dummy.Component",
					"packageName":"$TMP",
					"content":{
						"title":"variant A"
					},
					"layer":"CUSTOMER",
					"texts":{
						"TextDemo": {
							"value": "Text for TextDemo",
							"type": "myTextType"
						}
					},
					"namespace":"Dummy.Component",
					"creation":"",
					"originalLanguage":"EN",
					"conditions":{},
					"support":{
						"generator":"Change.createInitialFileContent",
						"service":"",
						"user":""
					}
				},
				"controlChanges": [],
				"variantChanges": {}
			};
			sandbox.stub(this.oModel, "_duplicateVariant").returns(oVariantData);
			sandbox.stub(JsControlTreeModifier, "getSelector").returns({id: "variantMgmtId1"});
			sandbox.stub(this.oModel.oChangePersistence, "addDirtyChange").returnsArg(0);

			var mPropertyBag = {
				variantManagementReference: "variantMgmtId1",
				appComponent: this.oComponent
			};
			return this.oModel.copyVariant(mPropertyBag).then( function (aChanges) {
				var oVariantDefinition = aChanges[0].getDefinitionWithChanges();

				assert.ok(fnAddVariantToControllerStub.calledOnce, "then function to add variant to VariantController called");

				//Mocking properties set inside Variant.createInitialFileContent
				oVariantData.content.support.sapui5Version = sap.ui.version;
				oVariantData.content.self = oVariantData.content.namespace + oVariantData.content.fileName + "." + "ctrl_variant";

				assert.deepEqual(oVariantDefinition, oVariantData, "then ctrl_variant change prepared with the correct content");

				// mocking "visible" and "favorite" property only required in VariantController map
				oVariantDefinition.content.content.visible = true;
				oVariantDefinition.content.content.favorite = true;

				assert.ok(fnAddVariantToControllerStub.calledWith(oVariantDefinition), "then function to add variant to VariantController called with the correct parameters");
				assert.equal(this.oModel.oData["variantMgmtId1"].variants[3].key, oVariantData.content.fileName, "then variant added to VariantModel");
				assert.equal(aChanges[0].getId(), oVariantData.content.fileName, "then the returned variant is the duplicate variant");
			}.bind(this));
		});

		QUnit.test("when calling 'removeVariant' with a component", function(assert) {
			var fnDeleteChangeStub = sandbox.stub(this.oModel.oChangePersistence, "deleteChange");
			var oChangeInVariant = {
				"fileName": "change0",
				"variantReference": "variant0",
				"layer": "VENDOR",
				getId: function () {
					return this.fileName;
				},
				getVariantReference: function() {
					return this.variantReference;
				}
			};
			var oVariant = {
				"fileName": "variant0",
				getId: function() {
					return this.fileName;
				}
			};
			var aDummyDirtyChanges = [oVariant].concat(oChangeInVariant);

			var fnRemoveVariantToControllerStub = sandbox.stub(this.oModel.oVariantController, "removeVariantFromVariantManagement").returns(2);
			var fnUpdateCurrentVariantSpy = sandbox.spy(this.oModel, "updateCurrentVariant");
			sandbox.stub(this.oModel.oChangePersistence, "getDirtyChanges").returns(aDummyDirtyChanges);

			assert.equal(this.oModel.oData["variantMgmtId1"].variants.length, 3, "then initial length is 3");
			var mPropertyBag = {
				variant: oVariant,
				sourceVariantReference: "sourceVariant",
				variantManagementReference: "variantMgmtId1",
				component: this.oModel.oAppComponent
			};
			return this.oModel.removeVariant(mPropertyBag)
				.then(function () {
					assert.equal(this.oModel.oData["variantMgmtId1"].variants.length, 2, "then one variant removed from VariantModel");
					assert.ok(fnRemoveVariantToControllerStub.calledOnce, "then function to remove variant from VariantController called");
					assert.ok(fnUpdateCurrentVariantSpy.calledWith(mPropertyBag.variantManagementReference, mPropertyBag.sourceVariantReference, mPropertyBag.component),
						"then updateCurrentVariant() called with the correct parameters");
					assert.ok(fnDeleteChangeStub.calledTwice, "then ChangePersistence.deleteChange called twice");
					assert.ok(fnDeleteChangeStub.calledWith(oChangeInVariant), "then ChangePersistence.deleteChange called for change in variant");
					assert.ok(fnDeleteChangeStub.calledWith(oVariant), "then ChangePersistence.deleteChange called for variant");
					assert.ok(fnUpdateCurrentVariantSpy.calledBefore(fnRemoveVariantToControllerStub), "then previous variant is reverted before removing the current variant");
				}.bind(this));
		});

		QUnit.test("when calling 'addChange'", function(assert) {
			var fnAddChangeToVariant = sandbox.stub(this.oModel.oVariantController, "addChangeToVariant");
			var oChange = {
				fileName : "addedChange",
				getVariantReference : function () {
					return "variant1";
				}
			};
			this.oModel.oData["variantMgmtId1"].modified = false;
			this.oModel.oData["variantMgmtId1"].variantsEditable = true;
			this.oModel.addChange(oChange);
			assert.equal(this.oModel.oData["variantMgmtId1"].modified, this.oModel.oData["variantMgmtId1"].variantsEditable, "then modified property equals variantEditable property");
			assert.ok(fnAddChangeToVariant.calledOnce, "then VariantController.addChangeToVariant called once");
			assert.ok(fnAddChangeToVariant.calledWith(oChange), "then VariantController.addChangeToVariant called with the passed change");

		});

		QUnit.test("when calling 'collectModelChanges'", function(assert) {
			this.oModel.getData()["variantMgmtId1"].variants[1].title = "test";
			this.oModel.getData()["variantMgmtId1"].variants[1].favorite = false;
			this.oModel.getData()["variantMgmtId1"].variants[1].visible = false;
			this.oModel.getData()["variantMgmtId1"].defaultVariant = "variant0";

			var aChanges = this.oModel.collectModelChanges("variantMgmtId1", "CUSTOMER");
			assert.equal(aChanges.length, 4, "then 4 changes with mPropertyBags were created");
		});

		QUnit.test("when calling 'manageVariants' in Adaptation mode once with changes and then without changes", function(assert) {
			var sVariantManagementReference = "variantMgmtId1";
			var oVariantManagement = new VariantManagement(sVariantManagementReference);
			var sLayer = "CUSTOMER";
			oVariantManagement.setModel(this.oModel, "$FlexVariants");

			sandbox.stub(oVariantManagement, "openManagementDialog").callsFake(oVariantManagement.fireManage);
			sandbox.stub(this.oModel.oChangePersistence._oVariantController, "_setVariantData");
			sandbox.stub(this.oModel.oChangePersistence._oVariantController, "_updateChangesForVariantManagementInMap");

			this.oModel.setModelPropertiesForControl(sVariantManagementReference, true, oVariantManagement);

			this.oModel.getData()[sVariantManagementReference].variants[1].title = "test";
			this.oModel.getData()[sVariantManagementReference].variants[1].favorite = false;
			this.oModel.getData()[sVariantManagementReference].variants[1].visible = false;
			this.oModel.getData()[sVariantManagementReference].defaultVariant = "variant0";

			return this.oModel.manageVariants(oVariantManagement, sVariantManagementReference, sLayer).then(function(aChanges) {
				assert.equal(aChanges.length, 4, "then 4 changes were returned since changes were made in the manage dialog");
				aChanges.forEach(this.oModel.setVariantProperties.bind(this.oModel, sVariantManagementReference));
				return this.oModel.manageVariants(oVariantManagement, sVariantManagementReference, sLayer).then(function(aChanges) {
					assert.equal(aChanges.length, 0, "then no changes were returned the since no changes were made in the manage dialog");
					oVariantManagement.destroy();
				});
			}.bind(this));
		});

		QUnit.test("when calling '_initializeManageVariantsEvents'", function(assert) {
			assert.notOk(this.oModel.fnManageClick, "the function 'this.fnManageClick' is not available before");
			assert.notOk(this.oModel.fnManageClickRta, "the function 'this.fnManageClickRta' is not available before");
			this.oModel._initializeManageVariantsEvents();
			assert.ok(this.oModel.fnManageClick, "the function 'this.fnManageClick' is available afterwards");
			assert.ok(this.oModel.fnManageClick, "the function 'this.fnManageClick' is available afterwards");
		});

		QUnit.test("when calling '_handleSave' with parameter from SaveAs button and default box checked", function(assert) {
			var done = assert.async();

			var oChange1 = new Change({
				"fileName": "change1",
				"selector": {
					"id": "abc123"
				}
			});
			var oChange2 = new Change({
				"fileName": "change2",
				"selector": {
					"id": "abc123"
				}
			});
			var oChange3 = new Change({
				"fileName": "change3",
				"selector": {
					"id": "abc123"
				}
			});

			var oVariantManagement = new VariantManagement("variantMgmtId1");
			var oCopiedVariantContent = {
				content: {
					title: "Personalization Test Variant",
					variantManagementReference: "variantMgmtId1",
					variantReference: "variant1",
					layer: "USER"
				}
			};
			var oCopiedVariant = new sap.ui.fl.Variant(oCopiedVariantContent);
			var oEvent = {
				getParameter: function(sParameter) {
					if (sParameter === "overwrite") {
						return false;
					} else if (sParameter === "name") {
						return "Test";
					} else if (sParameter === "def") {
						return true;
					}
				},
				getSource: function() {
					return oVariantManagement;
				}
			};

			this.oModel.getData()["variantMgmtId1"].modified = true;

			sandbox.stub(this.oModel, "getLocalId").returns("variantMgmtId1");
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns([oChange1, oChange2, oChange3]);
			sandbox.stub(this.oModel.oChangePersistence, "getDirtyChanges").returns([oCopiedVariant, {fileName: "change1"}, {fileName: "change2"}, {fileName: "change3"}]);
			var fnCopyVariantStub = sandbox.stub(this.oModel, "copyVariant").returns(Promise.resolve([oCopiedVariant, {fileName: "change1"}, {fileName: "change2"}, {fileName: "change3"}]));
			var fnRemoveDirtyChangesStub = sandbox.stub(this.oModel, "_removeDirtyChanges").returns(Promise.resolve());
			var fnSetVariantPropertiesStub = sandbox.stub(this.oModel, "setVariantProperties").returns({fileName: "changeWithSetDefault"});
			var fnSaveSequenceOfDirtyChangesStub = sandbox.stub(this.oModel.oChangePersistence, "saveSequenceOfDirtyChanges").resolves();
			var fnCreateDefaultFileNameSpy = sandbox.spy(Utils, "createDefaultFileName");

			return this.oModel._handleSave(oEvent)
			.then(function() {
				var sNewVariantReference = fnCreateDefaultFileNameSpy.getCall(0).returnValue;
				assert.strictEqual(fnCreateDefaultFileNameSpy.getCall(0).args.length, 0, "then no argument was passed to sap.ui.fl.Utils.createDefaultFileName");
				assert.ok(fnCopyVariantStub.calledOnce, "CopyVariant is called");
				assert.ok(fnCopyVariantStub.calledWith({
					appComponent: this.oComponent,
					layer: Utils.getCurrentLayer(),
					newVariantReference: sNewVariantReference,
					sourceVariantReference: oCopiedVariant.getVariantReference(),
					title: "Test",
					variantManagementReference: "variantMgmtId1"
				}), "CopyVariant is called");


				assert.ok(fnRemoveDirtyChangesStub.calledOnce, "RemoveDirtyChanges is called");
				assert.ok(fnSetVariantPropertiesStub.calledOnce, "SetVariantProperties is called");
				assert.ok(fnSaveSequenceOfDirtyChangesStub.calledOnce, "SaveSequenceOfDirtyChanges is called");
				assert.equal(fnSaveSequenceOfDirtyChangesStub.args[0][0].length, 5, "five dirty changes are saved (new variant, 3 copied ctrl changes, setDefault change");
				assert.equal(fnSaveSequenceOfDirtyChangesStub.args[0][0][4].fileName, "changeWithSetDefault", "the last change is 'setDefault'");
				assert.notOk(this.oModel.getData()["variantMgmtId1"].modified, "finally the model property 'modified' is set to false");
				oVariantManagement.destroy();
				done();
			}.bind(this));
		});

		QUnit.test("when calling '_handleSave' with parameter from SaveAs button and default box unchecked", function(assert) {
			var done = assert.async();

			var oChange1 = new Change({
				"fileName": "change1",
				"selector": {
					"id": "abc123"
				}
			});
			var oChange2 = new Change({
				"fileName": "change2",
				"selector": {
					"id": "abc123"
				}
			});
			var oChange3 = new Change({
				"fileName": "change3",
				"selector": {
					"id": "abc123"
				}
			});

			var oVariantManagement = new VariantManagement("variantMgmtId1");
			var oCopiedVariantContent = {
				content: {
					title: "Personalization Test Variant",
					variantManagementReference: "variantMgmtId1",
					variantReference: "variant1",
					layer: "USER"
				}
			};
			var oCopiedVariant = new sap.ui.fl.Variant(oCopiedVariantContent);
			var oEvent = {
				getParameter: function(sParameter) {
					if (sParameter === "overwrite") {
						return false;
					} else if (sParameter === "name") {
						return "Test";
					} else if (sParameter === "def") {
						return false;
					}
				},
				getSource: function() {
					return oVariantManagement;
				}
			};

			this.oModel.getData()["variantMgmtId1"].modified = true;

			sandbox.stub(this.oModel, "getLocalId").returns("variantMgmtId1");
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns([oChange1, oChange2, oChange3]);
			sandbox.stub(this.oModel.oChangePersistence, "getDirtyChanges").returns([oCopiedVariant, {fileName: "change1"}, {fileName: "change2"}, {fileName: "change3"}]);
			var fnCopyVariantStub = sandbox.stub(this.oModel, "copyVariant").returns(Promise.resolve([oCopiedVariant, {fileName: "change1"}, {fileName: "change2"}, {fileName: "change3"}]));
			var fnRemoveDirtyChangesStub = sandbox.stub(this.oModel, "_removeDirtyChanges").returns(Promise.resolve());
			var fnSetVariantPropertiesStub = sandbox.stub(this.oModel, "setVariantProperties");
			var fnSaveSequenceOfDirtyChangesStub = sandbox.stub(this.oModel.oChangePersistence, "saveSequenceOfDirtyChanges").resolves();

			return this.oModel._handleSave(oEvent).then(function() {
				assert.ok(fnCopyVariantStub.calledOnce, "CopyVariant is called");
				assert.ok(fnRemoveDirtyChangesStub.calledOnce, "RemoveDirtyChanges is called");
				assert.equal(fnSetVariantPropertiesStub.callCount, 0, "SetVariantProperties is not called");
				assert.ok(fnSaveSequenceOfDirtyChangesStub.calledOnce, "SaveSequenceOfDirtyChanges is called");
				assert.notOk(this.oModel.getData()["variantMgmtId1"].modified, "finally the model property 'modified' is set to false");
				oVariantManagement.destroy();
				done();
			}.bind(this));
		});

		QUnit.test("when calling '_handleSave' with parameter from Save button, which calls 'checkDirtyStateForControlModels' later, with no dirty changes existing after Save", function(assert) {
			var oChange1 = new Change({
				"fileName": "change1",
				"selector": {
					"id": "abc123"
				}
			});
			var oChange2 = new Change({
				"fileName": "change2",
				"selector": {
					"id": "abc123"
				}
			});

			var oVariantManagement = new VariantManagement("variantMgmtId1");
			var oEvent = {
				getParameter: function(sParameter) {
					if (sParameter === "overwrite") {
						return true;
					} else if (sParameter === "name") {
						return "Test";
					}
				},
				getSource: function() {
					return oVariantManagement;
				}
			};

			this.oModel.getData()["variantMgmtId1"].modified = true;

			sandbox.stub(this.oModel, "getLocalId").returns("variantMgmtId1");
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns([oChange1, oChange2]);
			var fnCopyVariantStub = sandbox.stub(this.oModel, "copyVariant");
			var fnRemoveDirtyChangesStub = sandbox.stub(this.oModel, "_removeDirtyChanges");
			var fnSetVariantPropertiesStub = sandbox.stub(this.oModel, "setVariantProperties");
			var fnSaveSequenceOfDirtyChangesStub = sandbox.stub(this.oModel.oChangePersistence, "saveSequenceOfDirtyChanges").resolves();
			// only when getting it for the first time, second time they are asked when already saved
			sandbox.stub(this.oModel.oChangePersistence, "getDirtyChanges")
				.callThrough()
				.onFirstCall().returns([oChange1, oChange2]);

			return this.oModel._handleSave(oEvent).then(function() {
				assert.equal(fnCopyVariantStub.callCount, 0, "CopyVariant is not called");
				assert.equal(fnRemoveDirtyChangesStub.callCount, 0, "RemoveDirtyChanges is not called");
				assert.equal(fnSetVariantPropertiesStub.callCount, 0, "SetVariantProperties is not called");
				assert.ok(fnSaveSequenceOfDirtyChangesStub.calledOnce, "SaveAll is called");
				assert.notOk(this.oModel.getData()["variantMgmtId1"].modified, "finally the model property 'modified' is set to false");
				oVariantManagement.destroy();
			}.bind(this));
		});

		QUnit.test("when calling '_handleSave' with parameter from Save button, which calls 'checkDirtyStateForControlModels' later, with dirty changes still existing after Save", function(assert) {
			var oChange1 = new Change({
				"fileName": "change1",
				"selector": {
					"id": "abc123"
				}
			});

			var oVariantManagement = new VariantManagement("variantMgmtId1");
			var oEvent = {
				getParameter: function(sParameter) {
					if (sParameter === "overwrite") {
						return true;
					} else if (sParameter === "name") {
						return "Test";
					}
				},
				getSource: function() {
					return oVariantManagement;
				}
			};

			this.oModel.getData()["variantMgmtId1"].modified = true; // dirty changes exist

			sandbox.stub(this.oModel, "getLocalId").returns("variantMgmtId1");
			sandbox.stub(this.oModel.oVariantController, "getVariantChanges").returns([oChange1]);
			var fnCopyVariantStub = sandbox.stub(this.oModel, "copyVariant");
			var fnRemoveDirtyChangesStub = sandbox.stub(this.oModel, "_removeDirtyChanges");
			var fnSetVariantPropertiesStub = sandbox.stub(this.oModel, "setVariantProperties");
			var fnSaveSequenceOfDirtyChangesStub = sandbox.stub(this.oModel.oChangePersistence, "saveSequenceOfDirtyChanges").resolves();
			// dirty changes always present are not saved
			sandbox.stub(this.oModel.oChangePersistence, "getDirtyChanges").returns([oChange1]);

			return this.oModel._handleSave(oEvent).then(function() {
				assert.equal(fnCopyVariantStub.callCount, 0, "CopyVariant is not called");
				assert.equal(fnRemoveDirtyChangesStub.callCount, 0, "RemoveDirtyChanges is not called");
				assert.equal(fnSetVariantPropertiesStub.callCount, 0, "SetVariantProperties is not called");
				assert.ok(fnSaveSequenceOfDirtyChangesStub.calledOnce, "SaveAll is called");
				assert.ok(this.oModel.getData()["variantMgmtId1"].modified, "the model property 'modified' is still set to true");
				oVariantManagement.destroy();
			}.bind(this));
		});

		QUnit.test("when calling '_getVariantTitleCount' with a title having 2 occurrences", function(assert) {
			this.oModel.oData["variantMgmtId1"].variants.push({
				title: "SampleTitle Copy(5)",
				visible: true
			}, {
				title: "SampleTitle Copy(5)",
				visible: true
			});
			assert.strictEqual(this.oModel._getVariantTitleCount("SampleTitle Copy(5)", "variantMgmtId1"), 2, "then 2 occurrences returned");
			this.oModel.oData["variantMgmtId1"].variants.splice(3, 1);
		});

		QUnit.test("when calling '_getVariantTitleCount' with a title having 4 occurrences with different cases of characters", function(assert) {
			this.oModel.oData["variantMgmtId1"].variants.push({
				title: "Test",
				visible: true
			}, {
				title: "TEST",
				visible: true
			}, {
				title: "tesT",
				visible: true
			}, {
				title: "test",
				visible: true
			});
			assert.strictEqual(this.oModel._getVariantTitleCount("TeSt", "variantMgmtId1"), 4, "then 4 occurrences returned");
			this.oModel.oData["variantMgmtId1"].variants.splice(3, 4);
		});

		QUnit.test("when calling 'getVariant' without a variant management reference", function(assert) {
			sandbox.stub(this.oModel.oVariantController, "getVariant").callsFake(function(){
				assert.ok(this.oModel.getVariantManagementReference.calledOnce, "then variant management reference calculated");
				assert.equal(arguments[0], "varMgmtRef", "then correct variant management reference received");
				assert.equal(arguments[1], "varRef", "then correct variant reference received");
			}.bind(this));
			sandbox.stub(this.oModel, "getVariantManagementReference").returns({
				variantManagementReference: "varMgmtRef"
			});
			this.oModel.getVariant("varRef");
		});
	});

	QUnit.module("Given a VariantModel with no data and a VariantManagement control", {
		beforeEach : function() {
			this.oData = {};

			var oManifestObj = {
				"sap.app": {
					id: "MyComponent",
					"applicationVersion": {
						"version": "1.2.3"
					}
				}
			};
			var oManifest = new sap.ui.core.Manifest(oManifestObj);
			this.oVariantManagement = new VariantManagement("varMgmtRef1");
			var oComponent = {
				name: "MyComponent",
				appVersion: "1.2.3",
				getId: function() {
					return "RTADemoAppMD";
				},
				getManifest: function() {
					return oManifest;
				},
				getLocalId: function(sId) {
					if (sId === this.oVariantManagement.getId()) {
						return "localId";
					}
					return null;
				}.bind(this)
			};
			this.fnGetAppComponentForControlStub = sandbox.stub(Utils, "getAppComponentForControl").returns(oComponent);
			sandbox.stub(Utils, "getComponentClassName").returns("MyComponent");

			this.oFlexController = FlexControllerFactory.createForControl(oComponent, oManifest);
			this.oModel = new VariantModel(this.oData, this.oFlexController, oComponent);
			this.fnLoadSwitchChangesStub = sandbox.stub(this.oModel.oChangePersistence, "loadSwitchChangesMapForComponent").returns({aRevert:[], aNew:[]});
			this.fnRevertChangesStub = sandbox.stub(this.oFlexController, "revertChangesOnControl");
			this.fnApplyChangesStub = sandbox.stub(this.oFlexController, "applyVariantChanges");
		},
		afterEach : function() {
			sandbox.restore();
			this.oModel.destroy();
			this.oVariantManagement.destroy();
			delete this.oFlexController;
		}
	}, function() {
		QUnit.test("when calling 'setModel' of VariantManagement control", function(assert) {
			var fnRegisterToModelSpy = sandbox.spy(this.oModel, "registerToModel");
			sandbox.stub(this.oModel, "getVariantManagementReferenceForControl").returns("varMgmtRef1");
			this.oVariantManagement.setModel(this.oModel, "$FlexVariants");

			assert.equal(this.oModel.getCurrentVariantReference("varMgmtRef1"), "varMgmtRef1", "then the Current Variant is set to the standard variant");
			assert.ok(fnRegisterToModelSpy.calledOnce, "then registerToModel called once, when VariantManagement control setModel is called");
			assert.ok(fnRegisterToModelSpy.calledWith(this.oVariantManagement), "then registerToModel called with VariantManagement control");
		});

		QUnit.test("when calling 'getVariantManagementReferenceForControl' with a variant management control where app component couldn't be retrieved", function(assert) {
			this.fnGetAppComponentForControlStub.returns(null);
			assert.strictEqual(this.oModel.getVariantManagementReferenceForControl(this.oVariantManagement), this.oVariantManagement.getId(), "then control's id is returned");
		});

		QUnit.test("when calling 'getVariantManagementReferenceForControl' with a variant management control with no app component prefix", function(assert) {
			assert.strictEqual(this.oModel.getVariantManagementReferenceForControl({getId: function() { return "mockControl"; }}), "mockControl", "then control's id is returned");
		});

		QUnit.test("when calling 'getVariantManagementReferenceForControl' with a variant management control with an app component prefix", function(assert) {
			assert.strictEqual(this.oModel.getVariantManagementReferenceForControl(this.oVariantManagement), "localId", "then the local id of the control is retuned");
		});
	});

	QUnit.done(function() {
		jQuery("#qunit-fixture").hide();
	});
});