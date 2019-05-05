/*global QUnit*/
var iOriginalMaxDepth = QUnit.dump.maxDepth;
QUnit.dump.maxDepth = 10;

sap.ui.define([
	"sap/ui/fl/ChangePersistence",
	"sap/ui/fl/Utils",
	"sap/ui/fl/Change",
	"sap/ui/fl/Variant",
	"sap/ui/fl/LrepConnector",
	"sap/ui/fl/Cache",
	"sap/ui/fl/registry/Settings",
	"sap/m/MessageBox",
	"sap/ui/core/Component",
	"sap/base/Log",
	"sap/ui/thirdparty/jquery",
	"sap/ui/thirdparty/sinon-4",
	"sap/base/util/merge"
],
function (
	ChangePersistence,
	Utils,
	Change,
	Variant,
	LrepConnector,
	Cache,
	Settings,
	MessageBox,
	Component,
	Log,
	jQuery,
	sinon,
	fnBaseUtilMerge
) {
	"use strict";

	var sandbox = sinon.sandbox.create();
	var controls = [];

	QUnit.module("sap.ui.fl.ChangePersistence", {
		beforeEach: function () {
			this._mComponentProperties = {
				name: "MyComponent",
				appVersion: "1.2.3"
			};
			this.oChangePersistence = new ChangePersistence(this._mComponentProperties);
			this._oComponentInstance = sap.ui.component({
				name: "sap/ui/fl/qunit/integration/testComponentComplex"
			});
			Utils.setMaxLayerParameter("USER");
		},
		afterEach: function () {
			sandbox.restore();

			controls.forEach(function(control){
				control.destroy();
			});
		}
	}, function() {
		QUnit.test("Shall be instantiable", function (assert) {
			assert.ok(this.oChangePersistence, "Shall create a new instance");
		});

		QUnit.test("the cache key is returned asynchronous", function (assert) {
			var sChacheKey = "abc123";

			var oMockedWrappedContent = {
				changes: [{}],
				etag: "abc123",
				status: "success"
			};
			var oMockedAppComponent = {
				getComponentData: function() {
					return {};
				}
			};

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));

			return this.oChangePersistence.getCacheKey(oMockedAppComponent).then(function (oCacheKeyResponse) {
				assert.equal(oCacheKeyResponse, sChacheKey);
			});
		});

		QUnit.test("the cache key returns a tag if no cache key could be determined", function (assert) {
			var oMockedWrappedContent = {
				changes: [{}],
				etag: "",
				status: "success"
			};

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));

			return this.oChangePersistence.getCacheKey().then(function (oCacheKeyResponse) {
				assert.equal(oCacheKeyResponse, Cache.NOTAG);
			});
		});

		QUnit.test("when getChangesForComponent is called with no change cacheKey", function (assert) {
			var oSettingsStoreInstanceStub = sandbox.stub(Settings, "_storeInstance");
			return this.oChangePersistence.getChangesForComponent({cacheKey : "<NO CHANGES>"}).then(function (aChanges) {
				assert.equal(aChanges.length, 0, "then empty array is returned");
				assert.equal(oSettingsStoreInstanceStub.callCount, 0 , "the _storeInstance function of the fl.Settings was not called.");
			});
		});


		QUnit.test("when getChangesForComponent is called with _bHasChangesOverMaxLayer set and ignoreMaxLayerParameter is passed as true", function (assert) {
			this.oChangePersistence._bHasChangesOverMaxLayer = true;

			var oMockedWrappedContent = {
				changes: {
					changes: ["mockChange"]
				}
			};

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));

			return this.oChangePersistence.getChangesForComponent({ignoreMaxLayerParameter: true}).then(function (sResponse) {
				assert.strictEqual(sResponse, this.oChangePersistence.HIGHER_LAYER_CHANGES_EXIST, "then the correct response is returned");
				assert.notOk(this.oChangePersistence._bHasChangesOverMaxLayer, "then _bHasChangesOverMaxLayer is unset");
			}.bind(this));
		});

		QUnit.test("when getChangesForComponent is called with an embedded component as a parameter", function (assert) {
			assert.expect(2);
			var oAppComponent = {
				getModel: function(sModelName) {
					if (sModelName === "i18nFlexVendor") {
						assert.ok(true, "then getModel() was called on the app component");
					}
				},
				getComponentData: function() {
					return {
						technicalParameters: ["mockTechnicalParameter"]
					};
				}
			};

			var oWrappedFileContent = {
				messagebundle: "mockMessageBundle",
				changes: {
					changes: [],
					variantSection: { "mockVariantManagement":{} }
				}
			};

			var oComponent = {
				id: "mockComponent"
			};

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oWrappedFileContent));
			sandbox.stub(Utils, "getAppComponentForControl").withArgs(oComponent).returns(oAppComponent);
			var fnSetChangeFileContentStub = sandbox.stub(this.oChangePersistence._oVariantController, "checkAndSetVariantContent");

			return this.oChangePersistence.getChangesForComponent({ component: oComponent })
				.then(function () {
					assert.ok(fnSetChangeFileContentStub.calledWith(oWrappedFileContent, oAppComponent.getComponentData().technicalParameters), "then the technical parameters from the app component were passed to the variant controller");
				});
		});

		QUnit.test("when getChangesForComponent is called with a variantSection when changes section is not empty", function (assert) {
			var oMockedWrappedContent = {
				"changes" : {
					"changes": [{
						fileType: "change",
						selector: {
							id: "controlId"
						}
					}],
					"variantSection" : {
						"variantManagementId" : {
							"variants" : [{
								"content" : {
									"content" : {
										"title": "variant 0"
									},
									"fileName": "variant0"
								},
								"controlChanges" : [],
								"variantChanges" : {}
							},
								{
									"content" : {
										"content" : {
											"title": "variant 1"
										},
										"fileName": "variant1"
									},
									"controlChanges" : [],
									"variantChanges" : {}
								}]
						}
					}
				}
			};

			var fnSetChangeFileContentSpy = sandbox.spy(this.oChangePersistence._oVariantController, "checkAndSetVariantContent");
			var fnLoadInitialChangesStub = sandbox.stub(this.oChangePersistence._oVariantController, "loadInitialChanges").returns([]);
			var fnApplyChangesOnVariantManagementStub = sandbox.stub(this.oChangePersistence._oVariantController, "_applyChangesOnVariantManagement");
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));

			return this.oChangePersistence.getChangesForComponent().then(function () {
				assert.ok(fnSetChangeFileContentSpy.calledOnce, "then VariantController.checkAndSetVariantContent() was called once since file content was not set");
				assert.ok(fnLoadInitialChangesStub.calledOnce, "then loadDefaultChanges of VariantManagement called for the first time");
				assert.ok(fnApplyChangesOnVariantManagementStub.calledOnce, "then applyChangesOnVariantManagement called once for one variant management reference, as file content is not set");
			}).then(function () {
				this.oChangePersistence.getChangesForComponent().then(function () {
					assert.ok(fnSetChangeFileContentSpy.calledTwice, "then VariantController.checkAndSetVariantContent() was called again");
					assert.ok(fnLoadInitialChangesStub.calledTwice, "then loadDefaultChanges of VariantManagement was called again");
					assert.ok(fnApplyChangesOnVariantManagementStub.calledOnce, "then applyChangesOnVariantManagement was not called again as file content was set");
				});
			}.bind(this));
		});

		QUnit.test("when getChangesForComponent is called with a variantSection and changes section is empty", function (assert) {
			var oMockedWrappedContent = {
				"changes" : {
					"changes": [],
					"variantSection" : {
						"variantManagementId" : {
							"variants" : [{
								"content" : {
									"content" : {
										"title": "variant 0"
									},
									"fileName": "variant0"
								},
								"controlChanges" : [],
								"variantChanges" : {}
							},
								{
									"content" : {
										"content" : {
											"title": "variant 1"
										},
										"fileName": "variant1"
									},
									"controlChanges" : [],
									"variantChanges" : {}
								}]
						}
					}
				}
			};

			var fnSetChangeFileContentSpy = sandbox.spy(this.oChangePersistence._oVariantController, "checkAndSetVariantContent");
			var fnLoadInitialChangesStub = sandbox.stub(this.oChangePersistence._oVariantController, "loadInitialChanges").returns([]);
			var fnApplyChangesOnVariantManagementStub = sandbox.stub(this.oChangePersistence._oVariantController, "_applyChangesOnVariantManagement");
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));

			return this.oChangePersistence.getChangesForComponent().then(function () {
				assert.ok(fnSetChangeFileContentSpy.calledOnce, "then VariantController.checkAndSetVariantContent() was called once since file content was not set");
				assert.ok(fnLoadInitialChangesStub.calledOnce, "then loadDefaultChanges of VariantManagement called for the first time");
				assert.ok(fnApplyChangesOnVariantManagementStub.calledOnce, "then applyChangesOnVariantManagement called once for one variant management reference, as file content is not set");
				assert.notOk(fnSetChangeFileContentSpy.getCall(0).args[1], "then technical parameters were not passed, since not available");
			}).then(function () {
				this.oChangePersistence.getChangesForComponent().then(function () {
					assert.ok(fnSetChangeFileContentSpy.calledTwice, "then VariantController.checkAndSetVariantContent() was called again");
					assert.ok(fnLoadInitialChangesStub.calledTwice, "then loadDefaultChanges of VariantManagement was called again");
					assert.ok(fnApplyChangesOnVariantManagementStub.calledOnce, "then applyChangesOnVariantManagement was not called again as file content was set");
				});
			}.bind(this));
		});

		QUnit.test("when getChangesForComponent is called twice with a variantSection", function (assert) {
			var oMockedWrappedContent = {
				"changes" : {
					"changes": [],
					"variantSection" : {
						"variantManagementId" : {
							"variants" : [{
								"content" : {
									"content" : {
										"title": "variant 0"
									},
									"fileName": "variantManagementId"
								},
								"controlChanges" : [{
									"fileName": "controlChange0",
									"fileType": "change",
									"selector": {
										"id": "dummy_selector"
									},
									"variantReference": "variantManagementId",
									"layer": "CUSTOMER_BASE"
								}],
								"variantChanges" : {}
							}]
						}
					}
				}
			};

			sandbox.stub(this.oChangePersistence._oVariantController, "_applyChangesOnVariantManagement");
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));

			function getChangesForComponentAssertions(aChanges, assert) {
				assert.ok(true, "then after getChangesForComponent call");
				assert.equal(aChanges.length, 1, "then one change is returned");
				assert.ok(aChanges[0] instanceof Change, "then the change is an instance of Change");
				assert.equal(aChanges[0].getDefinition().fileName, "controlChange0", "then the change is correctly assembled");
			}

			return this.oChangePersistence.getChangesForComponent()
			.then(function(aChanges) {
				getChangesForComponentAssertions(aChanges, assert);
			})
			.then(function() {
				return this.oChangePersistence.getChangesForComponent();
			}.bind(this))
			.then(function(aChanges) {
				getChangesForComponentAssertions(aChanges, assert);
			});
		});

		QUnit.test("when getChangesForComponent is called with a variantSection and component data", function (assert) {
			var oMockedWrappedContent = {
				"changes" : {
					"changes": [],
					"variantSection" : {
						"variantManagementId" : {}
					}
				}
			};

			var fnSetChangeFileContentStub = sandbox.stub(this.oChangePersistence._oVariantController, "checkAndSetVariantContent");
			sandbox.stub(this.oChangePersistence._oVariantController, "loadInitialChanges").returns([]);
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));
			var mPropertyBag = {
				componentData : {
					technicalParameters : {
						"sap-ui-fl-control-variant-id" : ["variantID"]
					}
				}
			};

			return this.oChangePersistence.getChangesForComponent(mPropertyBag).then(function () {
				assert.strictEqual(fnSetChangeFileContentStub.getCall(0).args[1], mPropertyBag.componentData.technicalParameters, "then technical parameters were passed if present");
			});
		});

		QUnit.test("when getChangesForComponent is called with a variantSection and a component containing technical parameters", function (assert) {
			var oMockedWrappedContent = {
				"changes" : {
					"changes": [],
					"variantSection" : {
						"variantManagementId" : {}
					}
				}
			};

			var fnSetChangeFileContentStub = sandbox.stub(this.oChangePersistence._oVariantController, "checkAndSetVariantContent");
			sandbox.stub(this.oChangePersistence._oVariantController, "loadInitialChanges").returns([]);
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));
			var mPropertyBag = {
				component : {
					getComponentData : function() {
						return {
							technicalParameters: {
								"sap-ui-fl-control-variant-id": ["variantID"]
							}
						};
					}
				}
			};
			sandbox.stub(Utils, "getAppComponentForControl").returns(mPropertyBag.component);

			return this.oChangePersistence.getChangesForComponent(mPropertyBag).then(function () {
				assert.deepEqual(fnSetChangeFileContentStub.getCall(0).args[1], mPropertyBag.component.getComponentData().technicalParameters, "then technical parameters were passed if present");
			});
		});

		QUnit.test("when getChangesForComponent is called with global control change and control changes in different variants", function (assert) {
			var oWrappedContent = {
				changes: {
					changes: [
						{
							"fileName": "dummyChange0",
							"fileType": "change",
							"selector": {
								"id": "dummy_selector"
							},
							"layer": "CUSTOMER_BASE"
						}
					],
					variantSection: {
						"varMgmt": {
							"variants": [
								{
									"content": {
										"fileName": "varMgmt",
										"content": {
											"title": "Standard"
										},
										"variantManagementReference": "varMgmt"
									},
									"controlChanges": [],
									"variantChanges": []
								},
								{
									"content": {
										"fileName": "variant0",
										"content": {
											"title": "variant 0"
										},
										"layer": "CUSTOMER_BASE",
										"variantManagementReference": "varMgmt",
										"variantReference": "varMgmt"
									},
									"controlChanges": [{
										"fileName": "controlChange0",
										"fileType": "change",
										"selector": {
											"id": "dummy_selector"
										},
										"variantReference": "variant0",
										"layer": "CUSTOMER_BASE"
									}],
									"variantChanges": {
										"setTitle": [{
											"fileName": "variantChange0",
											"fileType": "ctrl_variant_change",
											"layer": "CUSTOMER_BASE",
											"selector": {
												"id": "variant0"
											}
										}]
									}
								}, {
									"content": {
										"content": {
											"title": "variant 1"
										},
										"fileName": "variant1",
										"fileType": "ctrl_variant",
										"layer": "VENDOR",
										"variantManagementReference": "varMgmt"
									},
									"controlChanges": [{
										"fileName": "controlChange1",
										"fileType": "change",
										"selector": {
											"id": "dummy_selector"
										},
										"variantReference": "variant1",
										"layer": "CUSTOMER_BASE"
									},
									{
										"fileName": "controlChange2",
										"fileType": "change",
										"selector": {
											"id": "dummy_selector"
										},
										"variantReference": "variant1",
										"layer": "CUSTOMER_BASE"
									}],
									"variantChanges": {
										"setTitle": [
											{
												"fileName": "variantChange1",
												"fileType": "ctrl_variant_change",
												"selector": {
													"id": "variant1"
												},
												"layer": "VENDOR"
											}
										],
										"setVisible": [
											{
												"fileName": "variantChange2",
												"fileType": "ctrl_variant_change",
												"selector": {
													"id": "variant1"
												},
												"content": {
													"visible": false,
													"createdByReset": true
												},
												"layer": "CUSTOMER"
											}
										]
									}
								}
							],
							"variantManagementChanges": {
								"setDefault" : [
									{
										"fileName": "setDefault",
										"fileType": "ctrl_variant_management_change",
										"layer": "VENDOR",
										"content": {
											"defaultVariant":"variant0"
										},
										"selector": {
											"id": "varMgmt"
										}
									}
								]
							}
						}
					}
				}
			};
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oWrappedContent));
			return this.oChangePersistence.getChangesForComponent().then(function (aChanges) {
				var mVariantControllerContent = this.oChangePersistence._oVariantController.getChangeFileContent();
				assert.equal(aChanges[0].getId(), oWrappedContent.changes.changes[0].fileName, "then global control change is received");
				assert.equal(aChanges[1].getId(), mVariantControllerContent["varMgmt"].variants[1].controlChanges[0].getId(), "then control change for default variant is received, which is also set to the variantController");
				assert.ok(aChanges[0] instanceof Change, "then global control change is instance of sap.ui.fl.Change");
				assert.ok(aChanges[1] instanceof Change, "then control change is instance of sap.ui.fl.Change");
			}.bind(this));
		});

		QUnit.test("when _getAllCtrlVariantChanges is called with max layer parameter, standard variant, variant (layer above) with no setVisible, variant (max layer) with setVisible on the layer above, variant (max layer) with setVisible on max layer", function(assert) {
			var mVariantSection = {
				"variantManagementId": {
					"variants": [
						{
							"content": {
								"fileName": "variantManagementId",
								"content": {
									"title": "variant 0"
								},
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [],
							"variantChanges": []
						},
						{
							"content": {
								"fileName": "variant0",
								"content": {
									"title": "variant 0"
								},
								"layer": "CUSTOMER_BASE",
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [{
								"variantReference": "variant0",
								"fileName": "controlChange0",
								"fileType": "change",
								"layer": "CUSTOMER_BASE"
							}],
							"variantChanges": {
								"setTitle": [{
									"fileName": "variantChange0",
									"fileType": "ctrl_variant_change",
									"layer": "CUSTOMER_BASE",
									"selector": {
										"id": "variant0"
									}
								}]
							}
						}, {
							"content": {
								"content": {
									"title": "variant 1"
								},
								"fileName": "variant1",
								"fileType": "ctrl_variant",
								"layer": "VENDOR",
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [
								{
									"variantReference": "variant1",
									"fileName": "controlChange2",
									"fileType": "change",
									"layer": "CUSTOMER"
								},
								{
									"variantReference": "variant1",
									"fileName": "controlChange3",
									"fileType": "change",
									"layer": "VENDOR"
								}
							],
							"variantChanges": {
								"setTitle": [
									{
										"fileName": "variantChange1",
										"fileType": "ctrl_variant_change",
										"selector": {
											"id": "variant1"
										},
										"layer": "VENDOR"
									}
								],
								"setVisible": [
									{
										"fileName": "variantChange2",
										"fileType": "ctrl_variant_change",
										"selector": {
											"id": "variant1"
										},
										"content": {
											"visible": false,
											"createdByReset": true
										},
										"layer": "CUSTOMER"
									}
								]
							}
						},
						{
							"content": {
								"content": {
									"title": "variant 2"
								},
								"fileName": "variant2",
								"fileType": "ctrl_variant",
								"layer": "VENDOR",
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [ ],
							"variantChanges": {
								"setVisible": [
									{
										"fileName": "variantChange3",
										"fileType": "ctrl_variant_change",
										"selector": {
											"id": "variant2"
										},
									"content": {
										"visible": false,
										"createdByReset": true
									},
										"layer": "VENDOR"
									}
								]
							}
						}
					],
					"variantManagementChanges": {
						"setDefault" : [
							{
								"fileName": "setDefault",
								"fileType": "ctrl_variant_management_change",
								"layer": "VENDOR",
								"content": {
									"defaultVariant":"variant0"
								},
								"selector": {
									"id": "variantManagementId"
								}
							}
						]
					}
				}
			};
			Utils.setMaxLayerParameter("VENDOR");
			var mExpectedParameter = jQuery.extend(true, {}, mVariantSection);

			//Deleting all changes below VENDOR layer
			mExpectedParameter["variantManagementId"].variants[2].controlChanges.splice(0, 1);
			mExpectedParameter["variantManagementId"].variants[2].variantChanges.setVisible.splice(0, 1);
			mExpectedParameter["variantManagementId"].variants.splice(1, 1);

			//File names considering setVisible and max-layer both
			var aExpectedChangesFileNames = ["variantChange1", "variant1", "controlChange3", "setDefault"];

			assert.equal(mVariantSection["variantManagementId"].variants.length, 4, "then initially 4 variants exist in the passed parameter");

			var aChanges = this.oChangePersistence._getAllCtrlVariantChanges(mVariantSection, true);

			assert.equal(aChanges.length, 4, "then 4 changes are received which comply to max layer parameter, setVisible not considered");
			assert.deepEqual(
				aChanges.map(function(oChange) {
					return oChange.fileName;
				}),
				aExpectedChangesFileNames
			);
			assert.equal(mVariantSection["variantManagementId"].variants.length, 3, "then the original parameter object has 3 variants left");
			assert.deepEqual(mVariantSection, mExpectedParameter, "then the original parameter object filtered out all changes from layer(s) above");
		});

		QUnit.test("when _getAllCtrlVariantChanges is called with current layer (CUSTOMER) parameter, standard variant, VENDOR variant, CUSTOMER variant, CUSTOMER variant with setVisible on CUSTOMER layer", function(assert) {
			var mVariantSection = {
				"variantManagementId": {
					"variants": [
						{
							"content": {
								"fileName": "variantManagementId",
								"content": {
									"title": "variant 0"
								},
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [],
							"variantChanges": []
						},
						{
							"content": {
								"fileName": "variant0",
								"content": {
									"title": "variant 0"
								},
								"layer": "VENDOR",
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [{
								"variantReference": "variant0",
								"fileName": "controlChange0",
								"fileType": "change",
								"layer": "VENDOR"
							}],
							"variantChanges": {
								"setTitle": [{
									"fileName": "variantChange0",
									"fileType": "ctrl_variant_change",
									"layer": "CUSTOMER",
									"selector": {
										"id": "variant0"
									}
								}]
							}
						}, {
							"content": {
								"content": {
									"title": "variant 1"
								},
								"fileName": "variant1",
								"fileType": "ctrl_variant",
								"layer": "CUSTOMER",
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [
								{
									"variantReference": "variant1",
									"fileName": "controlChange2",
									"fileType": "change",
									"layer": "CUSTOMER"
								},
								{
									"variantReference": "variant1",
									"fileName": "controlChange3",
									"fileType": "change",
									"layer": "USER"
								}
							],
							"variantChanges": {
								"setTitle": [
									{
										"fileName": "variantChange1",
										"fileType": "ctrl_variant_change",
										"selector": {
											"id": "variant1"
										},
										"layer": "CUSTOMER"
									}
								],
								"setFavorite": [
									{
										"fileName": "variantChange2",
										"fileType": "ctrl_variant_change",
										"selector": {
											"id": "variant1"
										},
										"layer": "USER"
									}
								]
							}
						},
						{
							"content": {
								"content": {
									"title": "variant 2"
								},
								"fileName": "variant2",
								"fileType": "ctrl_variant",
								"layer": "CUSTOMER",
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [ ],
							"variantChanges": {
								"setVisible": [
									{
										"fileName": "variantChange3",
										"fileType": "ctrl_variant_change",
										"selector": {
											"id": "variant2"
										},
										"content": {
											"visible": false,
											"createdByReset": false
										},
										"layer": "CUSTOMER"
									}
								]
							}
						}
					],
					"variantManagementChanges": {
						"setDefault" : [
							{
								"fileName": "setDefault",
								"fileType": "ctrl_variant_management_change",
								"layer": "CUSTOMER",
								"content": {
									"defaultVariant":"variant0"
								},
								"selector": {
									"id": "variantManagementId"
								}
							}
						]
					}
				}
			};

			var mExpectedParameter = jQuery.extend(true, {}, mVariantSection);

			//Deleting all changes not on CUSTOMER layer
			mExpectedParameter["variantManagementId"].variants[2].controlChanges.splice(1, 1);
			mExpectedParameter["variantManagementId"].variants[2].variantChanges.setFavorite.splice(0, 1);
			mExpectedParameter["variantManagementId"].variants.splice(1, 1);

			//File names considering setVisible and current layer both
			var aExpectedChangesFileNames = ["variantChange1", "variant1", "controlChange2", "variantChange3", "variant2", "setDefault"];

			assert.equal(mVariantSection["variantManagementId"].variants.length, 4, "then initially 4 variants exist in the passed parameter");

			var aChanges = this.oChangePersistence._getAllCtrlVariantChanges(mVariantSection, false, "CUSTOMER");

			assert.equal(aChanges.length, 6, "then 6 changes are received which comply to current layer parameter, only setVisible on same layer considered");
			assert.deepEqual(
				aChanges.map(function(oChange) {
					return oChange.fileName;
				}),
				aExpectedChangesFileNames
			);
			assert.equal(mVariantSection["variantManagementId"].variants.length, 3, "then the original parameter object has 3 variants left");
			assert.deepEqual(mVariantSection, mExpectedParameter, "then the original parameter object filtered out all changes not from the current layer");
		});

		QUnit.test("when _getAllCtrlVariantChanges is called with a USER layer change, with max layer set to a layer below (e.g. CUSTOMER)", function(assert){
			var mVariantSection = {
				"variantManagementId": {
					"variants": [
						{
							"content": {
								"fileName": "variantManagementId",
								"content": {
									"title": "variant 0"
								},
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [],
							"variantChanges": []
						},
						{
							"content": {
								"fileName": "variant0",
								"content": {
									"title": "variant 0"
								},
								"layer": "CUSTOMER",
								"variantManagementReference": "variantManagementId"
							},
							"controlChanges": [{
								"variantReference": "variant0",
								"fileName": "controlChange0",
								"fileType": "change",
								"layer": "USER"
							}],
							"variantChanges": {
								"setTitle": [{
									"fileName": "variantChange0",
									"fileType": "ctrl_variant_change",
									"layer": "USER",
									"selector": {
										"id": "variant0"
									}
								}]
							}
						}
					],
					"variantManagementChanges": {
						"setDefault" : []
					}
				}
			};
			Utils.setMaxLayerParameter("CUSTOMER");
			sandbox.spy(this.oChangePersistence, "_filterChangeForMaxLayer");
			sandbox.spy(this.oChangePersistence, "_getLayerFromChangeOrChangeContent");

			this.oChangePersistence._getAllCtrlVariantChanges(mVariantSection, true);
			assert.strictEqual(this.oChangePersistence._filterChangeForMaxLayer.callCount, 3, "then _filterChangeForMaxLayer() was called thrice for three changes");
			assert.strictEqual(this.oChangePersistence._getLayerFromChangeOrChangeContent.getCall(0).args[0].fileName, "variant0", "then _getLayerFromChangeOrChangeContent() was called for the variant");
			assert.strictEqual(this.oChangePersistence._getLayerFromChangeOrChangeContent.getCall(1).args[0].fileName, "variantChange0", "then _getLayerFromChangeOrChangeContent() was called called for the variant change");
			assert.strictEqual(this.oChangePersistence._getLayerFromChangeOrChangeContent.getCall(2).args[0].fileName, "controlChange0", "then _getLayerFromChangeOrChangeContent() was called for the control change");
			assert.strictEqual(this.oChangePersistence._bHasChangesOverMaxLayer, true, "then the flag _bHasChangesOverMaxLayer is set");

		});
		QUnit.test("when getChangesForComponent is called with a change instance already existing in the Cache response", function(assert) {
			var oExistingChangeInstance = new Change({
				"variantReference":"variantManagementId",
				"fileName":"controlChange0",
				"fileType":"change",
				"content":{},
				"selector":{
					"id":"selectorId"
				}
			});

			var oMockedWrappedContent = {
				"changes" : {
					"changes": [],
					"variantSection" : {
						"variantManagementId" : {
							"variants" : [
								{
									"content" : {
										"fileName": "variantManagementId",
										"content" : {
											"title": "variant 0"
										},
										"fileType": "ctrl_variant",
										"variantManagementReference": "variantManagementId"
									},
									"controlChanges": [oExistingChangeInstance],
									"variantChanges": {}
								}
							],
							"variantManagementChanges": {}
						}
					}
				}
			};

			sandbox.spy(this.oChangePersistence, "_getAllCtrlVariantChanges");
			sandbox.spy(this.oChangePersistence._oVariantController, "checkAndSetVariantContent");

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));
			return this.oChangePersistence.getChangesForComponent({includeCtrlVariants: true}).then(function(aChanges) {
				assert.strictEqual(aChanges.length, 1, "then one change was returned");
				assert.ok(aChanges[0].sId, oExistingChangeInstance.sId, "then no new change instance was created");
			});
		});
		QUnit.test("when getChangesForComponent is called with no pre-existing change instance", function(assert) {
			var oMockedWrappedContent = {
				"changes" : {
					"changes": [],
					"variantSection" : {
						"variantManagementId" : {
							"variants" : [
								{
									"content" : {
										"fileName": "variantManagementId",
										"content" : {
											"title": "variant 0"
										},
										"fileType": "ctrl_variant",
										"variantManagementReference": "variantManagementId"
									},
									"controlChanges": [{
										"variantReference":"variantManagementId",
										"fileName":"controlChange0",
										"fileType":"change",
										"content":{},
										"selector":{
											"id":"selectorId"
										}
									}],
									"variantChanges": {}
								}
							],
							"variantManagementChanges": {}
						}
					}
				}
			};

			sandbox.stub(Cache, "getChangesFillingCache").resolves(oMockedWrappedContent);
			sandbox.stub(Cache, "setVariantManagementSection");
			return this.oChangePersistence.getChangesForComponent({includeCtrlVariants: true}).then(function(aChanges) {
				var mVariantControllerMap = this.oChangePersistence._oVariantController.getChangeFileContent();
				var sChangeInstanceId = aChanges[0].sId;
				assert.strictEqual(aChanges.length, 1, "then one change was returned");
				assert.ok(aChanges[0] instanceof Change, "then a change instance was returned");
				assert.strictEqual(mVariantControllerMap["variantManagementId"].variants[0].controlChanges[0].getId(), aChanges[0].getId(), "then variant change content was replaced with a change instance");
				assert.ok(Cache.setVariantManagementSection.calledWith(this._mComponentProperties, mVariantControllerMap), "then Cache.setVariantManagementSection was called to sync the variant section");
				return this.oChangePersistence.getChangesForComponent({includeCtrlVariants: true}).then(function(aChanges) {
					assert.strictEqual(aChanges.length, 1, "then one change was returned");
					assert.strictEqual(aChanges[0].sId, sChangeInstanceId, "then the existing change instance was returned");
				});
			}.bind(this));
		});
		QUnit.test("when getChangesForComponent is called with includeCtrlVariants and includeVariants set to true", function(assert) {
			var oMockedWrappedContent = {
				"changes" : {
					"changes": [
						{
							"fileName": "change0",
							"fileType": "change",
							"selector": {
								"id": "controlId"
							}
						}
					],
					"variantSection" : {
						"variantManagementId" : {
							"variants" : [
								{
									"content" : {
										"fileName": "variant0",
										"content" : {
											"title": "variant 0"
										},
										"fileType": "ctrl_variant",
										"variantManagementReference": "variantManagementId"
									},
									"controlChanges": [
										{
											"variantReference":"variant0",
											"fileName":"controlChange0",
											"fileType":"change",
											"content":{},
											"selector":{
												"id":"selectorId"
											}
										}
									],
									"variantChanges": {
										"setTitle": [
											{
												"fileName":"variantChange0",
												"fileType": "ctrl_variant_change",
												"selector": {
													"id" : "variant0"
												}
											}
										]
									},
									"changes" : []
								},
								{
									"content" : {
										"content" : {
											"title": "variant 1"
										},
										"fileName": "variant1",
										"fileType": "ctrl_variant",
										"variantManagementReference": "variantManagementId"
									},
									"controlChanges": [
									],
									"variantChanges": {
										"setTitle": [
											{
												"fileName":"variantChange1",
												"fileType": "ctrl_variant_change",
												"selector": {
													"id" : "variant1"
												}
											}
										],
										"setVisible": [
											{
												"fileName":"variantChange2",
												"fileType": "ctrl_variant_change",
												"selector": {
													"id" : "variant2_invisible"
												},
												"content": {
													"visible": false,
													"createdByReset": false
												}
											}
										]
									}
								},
								{
									"content" : {
										"content" : {
											"title": "variant 2"
										},
										"fileName": "variant2_invisible",
										"fileType": "ctrl_variant",
										"variantManagementReference": "variantManagementId"
									},
									"controlChanges": [
										{
											"variantReference":"variant2",
											"fileName":"controlChange1",
											"fileType":"change",
											"content":{},
											"selector":{
												"id":"selectorId"
											}
										}
									],
									"variantChanges": {
										"setVisible": [
											{
												"fileName":"variantChange3",
												"fileType": "ctrl_variant_change",
												"selector": {
													"id" : "variant2_invisible"
												},
												"content": {
													"visible": false,
													"createdByReset": true
												}
											}
										]
									}
								}
							],
							"variantManagementChanges": {
								"setDefault" : [{
									"fileName": "setDefault",
									"fileType": "ctrl_variant_management_change",
									"content": {
										"defaultVariant":"variant0"
									},
									"selector": {
										"id": "variantManagementId"
									}
								}]
							}
						}
					}
				}
			};
			var fnGetCtrlVariantChangesSpy = sandbox.spy(this.oChangePersistence, "_getAllCtrlVariantChanges");
			var fnSetChangeFileContentSpy = sandbox.spy(this.oChangePersistence._oVariantController, "checkAndSetVariantContent");
			var oInvisibleVariant = oMockedWrappedContent.changes.variantSection.variantManagementId.variants[2];
			var aInvisibleChangeFileNames = [
				oInvisibleVariant.content.fileName,
				oInvisibleVariant.controlChanges[0].fileName,
				oInvisibleVariant.variantChanges.setVisible[0].fileName
			];

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oMockedWrappedContent));
			return this.oChangePersistence.getChangesForComponent({includeCtrlVariants: true, includeVariants: true}).then(function(aChanges) {
				var aFilteredChanges = aChanges.filter( function (oChange) {
					return aInvisibleChangeFileNames.indexOf(oChange.getId()) > -1;
				});
				assert.ok(aFilteredChanges.length === 0, "then no changes belonging to invisible variant returned");
				assert.equal(aChanges.length, 8, "then all the visible variant related changes are part of the response");
				assert.ok(fnSetChangeFileContentSpy.calledAfter(fnGetCtrlVariantChangesSpy), "then VariantController.checkAndSetVariantContent called after _getAllCtrlVariantChanges is called (for max-layer/current filtering)");
			});
		});

		QUnit.test("when getChangesForComponent is called without includeCtrlVariants, max layer and current layer parameters", function(assert) {

			var fnGetCtrlVariantChangesSpy = sandbox.spy(this.oChangePersistence, "_getAllCtrlVariantChanges");

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(
				{
					changes: {
						changes : [
							{
								"fileName": "change0",
								"fileType": "change",
								"selector": {
									"id": "controlId"
								}
							}
						]
					}
				}
			));
			return this.oChangePersistence.getChangesForComponent().then(function() {
				assert.equal(fnGetCtrlVariantChangesSpy.callCount, 0, "then  _getAllCtrlVariantChanges is not called");
			});
		});

		QUnit.test("getChangesForComponent shall not bind the messagebundle as a json model into app component if no VENDOR change is available", function(assert) {
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({
				changes: { changes: [] },
				messagebundle: {"i_123": "translatedKey"}
			}));
			var mPropertyBag = {};
			mPropertyBag.component = this._oComponentInstance;
			return this.oChangePersistence.getChangesForComponent(mPropertyBag).then(function() {
				var oModel = this._oComponentInstance.getModel("i18nFlexVendor");
				assert.equal(oModel, undefined);
			}.bind(this));
		});

		QUnit.test("getChangesForComponent shall not bind the messagebundle as a json model into app component if no VENDOR change is available", function(assert) {
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({
				changes: { changes: [{
					fileType: "change",
					selector: {
						id: "controlId"
					},
					layer : "VENDOR"
				}] },
				messagebundle: {"i_123": "translatedKey"}
			}));
			var mPropertyBag = {};
			mPropertyBag.component = this._oComponentInstance;
			return this.oChangePersistence.getChangesForComponent(mPropertyBag).then(function() {
				var oModel = this._oComponentInstance.getModel("i18nFlexVendor");
				assert.notEqual(oModel, undefined);
			}.bind(this));
		});

		QUnit.test("getChangesForComponent shall return the changes for the component", function(assert) {
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({changes: {changes: []}}));

			return this.oChangePersistence.getChangesForComponent().then(function(changes) {
				assert.ok(changes);
			});
		});

		QUnit.test("getChangesForComponent shall return the changes for the component when variantSection is empty", function(assert) {
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(
				{
					changes: {
						changes: [
							{
								fileName: "change1",
								fileType: "change",
								selector: {
									id: "controlId"
								}
							}]
					},
					variantSection : {}
				}));

			return this.oChangePersistence.getChangesForComponent().then(function(changes) {
				assert.strictEqual(changes.length, 1, "Changes is an array of length one");
				assert.ok(changes[0] instanceof Change, "Change is instanceof Change");
			});
		});

		QUnit.test("getChangesForComponent shall return the changes for the component, filtering changes with the current layer (CUSTOMER)", function(assert) {

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({changes: {changes: [
				{
					fileName: "change1",
					layer: "VENDOR",
					fileType: "change",
					selector: {
						id: "controlId"
					}
				},
				{
					fileName: "change2",
					layer: "CUSTOMER",
					fileType: "change",
					selector: {
						id: "controlId1"
					}
				},
				{
					fileName: "change3",
					layer: "USER",
					fileType: "change",
					selector: {
						id: "controlId2"
					}
				}
			]}}));

			return this.oChangePersistence.getChangesForComponent({currentLayer: "CUSTOMER"}).then(function(changes) {
				assert.strictEqual(changes.length, 1, "1 change shall be returned");
				assert.strictEqual(changes[0].getDefinition().layer, "CUSTOMER", "then it returns only current layer (CUSTOMER) changes");
			});
		});

		QUnit.test("getChangesForComponent shall return the changes for the component, not filtering changes with the current layer", function(assert) {

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({changes: {changes: [
				{
					fileName: "change1",
					layer: "VENDOR",
					fileType: "change",
					selector: {
						id: "controlId"
					}
				},
				{
					fileName: "change2",
					layer: "CUSTOMER",
					fileType: "change",
					selector: {
						id: "controlId1"
					}
				},
				{
					fileName: "change3",
					layer: "USER",
					fileType: "change",
					selector: {
						id: "controlId2"
					}
				}
			]}}));

			return this.oChangePersistence.getChangesForComponent().then(function(changes) {
				assert.strictEqual(changes.length, 3, "all the 3 changes shall be returned");
			});
		});

		QUnit.test("After run getChangesForComponent without includeVariants parameter", function(assert) {

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({changes: {changes: [
				{
					fileName: "file1",
					fileType: "change",
					changeType: "defaultVariant",
					layer: "CUSTOMER",
					selector: { persistencyKey: "SmartFilter_Explored" }
				},
				{
					fileName: "file2",
					fileType: "change",
					changeType: "renameGroup",
					layer: "CUSTOMER",
					selector: { id: "controlId1" }
				},
				{
					fileName: "file3",
					filetype: "change",
					changetype: "removeField",
					layer: "customer",
					selector: {}
				},
				{
					fileName: "file4",
					fileType: "variant",
					changeType: "filterBar",
					layer: "CUSTOMER",
					selector: { persistencyKey: "SmartFilter_Explored" }
				},
				{
					fileName: "file6",
					fileType: "variant",
					changeType: "filterBar",
					layer: "CUSTOMER"
				},
				{
					fileName: "file7",
					fileType: "change",
					changeType: "codeExt",
					layer: "CUSTOMER",
					selector: { id: "controlId2" }
				},
				{
					fileType: "somethingelse"
				}
			]}}));

			return this.oChangePersistence.getChangesForComponent().then(function(changes) {
				assert.strictEqual(changes.length, 2, "only standard UI changes were returned, smart variants were excluded");
				assert.ok(changes[0]._oDefinition.fileType === "change", "first change has file type change");
				assert.ok(changes[0].getChangeType() === "renameGroup", "and change type renameGroup");
				assert.ok(changes[1]._oDefinition.fileType === "change", "second change has file type change");
				assert.ok(changes[1].getChangeType() === "codeExt", "and change type codeExt");
			});
		});

		QUnit.test("After run getChangesForComponent with includeVariants parameter", function(assert) {

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({changes: {changes: [
				{
					fileName: "file1",
					fileType: "change",
					changeType: "defaultVariant",
					layer: "CUSTOMER",
					selector: { persistencyKey: "SmartFilter_Explored" }
				},
				{
					fileName: "file2",
					fileType: "change",
					changeType: "defaultVariant",
					layer: "CUSTOMER",
					selector: {}
				},
				{
					fileName: "file3",
					fileType: "change",
					changeType: "renameGroup",
					layer: "CUSTOMER",
					selector: { id: "controlId1" }
				},
				{
					fileName: "file4",
					fileType: "variant",
					changeType: "filterBar",
					layer: "CUSTOMER",
					selector: { persistencyKey: "SmartFilter_Explored" }
				},
				{
					fileName: "file5",
					fileType: "variant",
					changeType: "filterBar",
					layer: "CUSTOMER"
				},
				{
					fileName: "file6",
					fileType: "variant",
					changeType: "filterBar",
					layer: "CUSTOMER"
				},
				{
					fileName: "file7",
					fileType: "change",
					changeType: "codeExt",
					layer: "CUSTOMER",
					selector: { id: "controlId2" }
				},
				{

					fileType: "somethingelse"
				},
				{
					fileName: "file8",
					fileType: "change",
					changeType: "appdescr_changes",
					layer: "CUSTOMER"
				}
			]}}));

			var fnWarningLogStub = sandbox.stub(Log, "warning");

			return this.oChangePersistence.getChangesForComponent({includeVariants : true}).then(function(changes) {
				assert.strictEqual(changes.length, 5, "both standard UI changes and smart variants were returned");
				assert.ok(changes[0]._oDefinition.fileType === "change", "first change has file type change");
				assert.ok(changes[0].getChangeType() === "defaultVariant", "and change type defaultVariant");
				assert.ok(changes[1]._oDefinition.fileType === "change", "second change has file type change");
				assert.ok(changes[1].getChangeType() === "renameGroup", "and change type renameGroup");
				assert.ok(changes[2]._oDefinition.fileType === "variant", "third change has file type variant");
				assert.ok(changes[2].getChangeType() === "filterBar", "and change type filterBar");
				assert.ok(changes[3]._oDefinition.fileType === "change", "forth change has file type change");
				assert.ok(changes[3].getChangeType() === "codeExt", "and change type codeExt");
				assert.ok(changes[4]._oDefinition.fileType === "change", "fifth change has file type change");
				assert.notOk(changes[4].getSelector() , "and does not have selector");
				assert.ok(fnWarningLogStub.calledOnce, "then the a log for warning is called once");
				assert.ok(fnWarningLogStub.calledWith, "A change without fileName is detected and excluded from component: MyComponent", "with correct component name");
			});
		});

		QUnit.test("when getChangesForComponent is called with a max layer parameter and includeCtrlVariants set to true", function(assert) {

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({
				changes: {
					changes: [
						{
							fileName:"change1",
							fileType: "change",
							layer: "USER",
							selector: { id: "controlId" },
							dependentSelector: []
						},
						{
							fileName:"change2",
							fileType: "change",
							layer: "VENDOR",
							selector: { id: "controlId" },
							dependentSelector: []
						},
						{
							fileName:"change3",
							fileType: "change",
							layer: "USER",
							selector: { id: "anotherControlId" },
							dependentSelector: []
						},
						{
							fileName:"change4",
							fileType: "change",
							layer: "CUSTOMER",
							selector: { id: "controlId" },
							dependentSelector: []
						},
						{
							fileName:"change5",
							fileType: "change",
							layer: "PARTNER",
							selector: { id: "controlId" },
							dependentSelector: []
						}
					],
					variantSection: {
						variantManagementId : {}
					}
				}
			}));

			Utils.setMaxLayerParameter("CUSTOMER");
			var aMockVariantChangeContent = [
				{fileName: "mockVarChange0", fileType: "change"},
				{fileName: "mockVarChange1", fileType: "change"}
			];
			sandbox.stub(this.oChangePersistence, "_getAllCtrlVariantChanges")
				.withArgs(sinon.match.any, true)
				.returns(aMockVariantChangeContent);
			sandbox.stub(this.oChangePersistence._oVariantController, "checkAndSetVariantContent");
			sandbox.stub(this.oChangePersistence._oVariantController, "loadInitialChanges");

			return this.oChangePersistence.getChangesForComponent({includeCtrlVariants: true}).then(function(aChanges) {
				assert.strictEqual(aChanges.length, 5, "only changes which are under max layer are returned");
				assert.ok(aChanges[0].getId() === "change2", "with correct ID");
				assert.ok(aChanges[1].getId() === "change4", "with correct ID");
				assert.ok(aChanges[2].getId() === "change5", "with correct ID");
				assert.ok(this.oChangePersistence._getAllCtrlVariantChanges.calledOnce, "then _getCtrlVariantChanges called when max layer parameter is set");
				assert.deepEqual(
					aChanges.slice(3).map(function(oChange) { return oChange.getFileName(); }),
					aMockVariantChangeContent.map(function(oChangeContent) { return oChangeContent.fileName; }),
					"then max layer filtered variant changes are returned"
				);
				assert.strictEqual(this.oChangePersistence._bHasChangesOverMaxLayer, true, "then the flag _bHasChangesOverMaxLayer is set");
			}.bind(this));
		});

		QUnit.test("when _getLayerFromChangeOrChangeContent is called with a change instance", function(assert) {
			var oChange = new Change({
				fileName:"change1",
				layer: "USER",
				selector: { id: "controlId" },
				dependentSelector: []
			});
			assert.strictEqual(this.oChangePersistence._getLayerFromChangeOrChangeContent(oChange), "USER", "then the correct layer is returned");
		});

		QUnit.test("when _getLayerFromChangeOrChangeContent is called with a variant instance", function(assert) {
			var oVariant = new Variant({
				content: {
					fileName: "variant1",
					layer: "USER"
				}
			});
			assert.strictEqual(this.oChangePersistence._getLayerFromChangeOrChangeContent(oVariant), "USER", "then the correct layer is returned");
		});

		QUnit.test("getChangesForComponent shall ignore max layer parameter when current layer is set", function(assert) {

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({changes: {changes: [
				{
					fileName:"change2",
					fileType: "change",
					layer: "VENDOR",
					selector: { id: "controlId" },
					dependentSelector: []
				},
				{
					fileName:"change3",
					fileType: "change",
					layer: "USER",
					selector: { id: "anotherControlId" },
					dependentSelector: []
				},
				{
					fileName:"change4",
					fileType: "change",
					layer: "CUSTOMER",
					selector: { id: "controlId" },
					dependentSelector: []
				},
				{
					fileName:"change5",
					fileType: "change",
					layer: "PARTNER",
					selector: { id: "controlId" },
					dependentSelector: []
				}
			]}}));

			Utils.setMaxLayerParameter("CUSTOMER");

			return this.oChangePersistence.getChangesForComponent({currentLayer: "CUSTOMER"}).then(function(oChanges) {
				assert.strictEqual(oChanges.length, 1, "only changes which are under max layer are returned");
				assert.ok(oChanges[0].getId() === "change4", "with correct ID");
			});
		});

		QUnit.test("getChangesForComponent shall also pass the settings data to the fl.Settings", function(assert) {
			var oFileContent = {
				changes: {
					settings: {
						isKeyUser: true
					}
				}
			};
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oFileContent));
			var oSettingsStoreInstanceStub = sandbox.stub(Settings, "_storeInstance");

			return this.oChangePersistence.getChangesForComponent().then(function() {
				assert.ok(oSettingsStoreInstanceStub.calledOnce, "the _storeInstance function of the fl.Settings was called.");
				var aPassedArguments = oSettingsStoreInstanceStub.getCall(0).args;
				assert.deepEqual(aPassedArguments[0], oFileContent.changes.settings, "the settings content was passed to the function");
			});
		});

		QUnit.test("getChangesForComponent shall also pass the returned data to the fl.Settings, but only if the data comes from the back end", function(assert) {
			var oFileContent = {};
			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve(oFileContent));
			var oSettingsStoreInstanceStub = sandbox.stub(Settings, "_storeInstance");

			return this.oChangePersistence.getChangesForComponent().then(function() {
				assert.ok(oSettingsStoreInstanceStub.notCalled, "the _storeInstance function of the fl.Settings was not called.");
			});
		});

		QUnit.test("getChangesForComponent ignore filtering when ignoreMaxLayerParameter property is available", function(assert) {

			sandbox.stub(Cache, "getChangesFillingCache").returns(Promise.resolve({changes: {changes: [
				{
					fileName:"change1",
					fileType: "change",
					layer: "USER",
					selector: { id: "controlId" },
					dependentSelector: []
				},
				{
					fileName:"change2",
					fileType: "change",
					layer: "VENDOR",
					selector: { id: "controlId" },
					dependentSelector: []
				},
				{
					fileName:"change3",
					fileType: "change",
					layer: "USER",
					selector: { id: "anotherControlId" },
					dependentSelector: []
				},
				{
					fileName:"change4",
					fileType: "change",
					layer: "CUSTOMER",
					selector: { id: "controlId" },
					dependentSelector: []
				},
				{
					fileName:"change5",
					fileType: "change",
					layer: "PARTNER",
					selector: { id: "controlId" },
					dependentSelector: []
				}
			]}}));

			Utils.setMaxLayerParameter("CUSTOMER");

			return this.oChangePersistence.getChangesForComponent({ignoreMaxLayerParameter : true}).then(function(oChanges) {
				assert.strictEqual(oChanges.length, 5, "filtering is ignored, all changes are returned");
			});
		});

		QUnit.test("getChangesForVariant does nothing if entry in variant changes map is available", function(assert) {
			var aStubChanges = [
				{
					fileName:"change1",
					fileType: "change",
					layer: "USER",
					selector: { id: "controlId" },
					dependentSelector: []
				}
			];
			var oStubGetChangesForComponent = sandbox.stub(this.oChangePersistence, "getChangesForComponent");
			this.oChangePersistence._mVariantsChanges["SmartFilterBar"] = aStubChanges;
			return this.oChangePersistence.getChangesForVariant("someProperty", "SmartFilterBar", {}).then(function(aChanges) {
				assert.deepEqual(aChanges, aStubChanges);
				sinon.assert.notCalled(oStubGetChangesForComponent);
			});
		});

		QUnit.test("getChangesForVariant return promise reject when flexibility service is not available", function(assert) {
			var oStubGetChangesForComponent = sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve([]));
			var oStubGetServiceAvailabilityStatus = sandbox.stub(LrepConnector, "isFlexServiceAvailable").returns(Promise.resolve(false));
			return this.oChangePersistence.getChangesForVariant("someProperty", "SmartFilterBar", {}).catch(function() {
				assert.ok(oStubGetChangesForComponent.calledOnce);
				assert.ok(oStubGetServiceAvailabilityStatus.calledOnce);
			});
		});

		QUnit.test("getChangesForVariant return promise reject when flexibility service availability is not definied", function(assert) {
			var oStubGetChangesForComponent = sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve([]));
			var oStubGetServiceAvailabilityStatus = sandbox.stub(LrepConnector, "isFlexServiceAvailable").returns(Promise.resolve(undefined));
			return this.oChangePersistence.getChangesForVariant("someProperty", "SmartFilterBar", {}).then(function() {
				assert.ok(oStubGetChangesForComponent.calledOnce);
				assert.ok(oStubGetServiceAvailabilityStatus.calledOnce);
			});
		});

		QUnit.test("getChangesForVariant return promise resolve with empty object when flexibility service is available", function(assert) {
			var oStubGetChangesForComponent = sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve([]));
			var oStubGetServiceAvailabilityStatus = sandbox.stub(LrepConnector, "isFlexServiceAvailable").returns(Promise.resolve(true));
			return this.oChangePersistence.getChangesForVariant("someProperty", "SmartFilterBar", {}).then(function(aChanges) {
				assert.deepEqual(aChanges, {});
				sinon.assert.calledOnce(oStubGetChangesForComponent);
				sinon.assert.calledOnce(oStubGetServiceAvailabilityStatus);
			});
		});

		QUnit.test("getChangesForVariant call getChangesForComponent and filter results after that if entry in variant changes map is not available", function(assert) {
			var oPromise = new Promise(function(resolve){
				setTimeout(function(){
					resolve({changes: {changes: [
								{
									fileName: "change1",
									fileType: "change",
									changeType: "defaultVariant",
									layer: "CUSTOMER",
									selector: { persistencyKey: "SmartFilter_Explored" },
									originalLanguage: "EN"
								},
								{
									fileName: "change2",
									fileType: "change",
									changeType: "defaultVariant",
									layer: "CUSTOMER",
									selector: {}
								},
								{
									fileName: "change3",
									fileType: "change",
									changeType: "renameGroup",
									layer: "CUSTOMER",
									selector: { id: "controlId1" }
								},
								{
									fileName: "variant1",
									fileType: "variant",
									changeType: "filterBar",
									layer: "CUSTOMER",
									selector: { persistencyKey: "SmartFilter_Explored" },
									originalLanguage: "EN"
								},
								{
									fileName: "variant2",
									fileType: "variant",
									changeType: "filterBar",
									layer: "CUSTOMER"
								},
								{
									fileName: "change4",
									fileType: "change",
									changeType: "codeExt",
									layer: "CUSTOMER",
									selector: { id: "controlId2" }
								},
								{
									fileType: "change",
									changeType: "appdescr_changes",
									layer: "CUSTOMER"
								}
							]}});
				}, 100);
			});
			sandbox.stub(Cache, "getChangesFillingCache").returns(oPromise);
			var oPromise1 = this.oChangePersistence.getChangesForVariant("persistencyKey", "SmartFilter_Explored", {includeVariants: true});
			var oPromise2 = this.oChangePersistence.getChangesForVariant("persistencyKey", "SmartFilter_Explored", {includeVariants: true});
			return Promise.all([oPromise1, oPromise2]).then(function(values){
				assert.ok(values[0] === values[1]);
			});
		});

		QUnit.test("loadChangesMapForComponent shall return a map of changes for the component", function(assert) {
			var oAppComponent = {
				id: "mockAppComponent"
			};
			sandbox.stub(Cache, "getChangesFillingCache").resolves({
				changes: {
					changes: [
						{
							fileName: "change1",
							fileType: "change",
							layer: "USER",
							reference: "appComponentReference",
							selector: {id: "controlId"},
							dependentSelector: []
						},
						{
							fileName: "change2",
							fileType: "change",
							layer: "VENDOR",
							reference: "appComponentReference",
							selector: {id: "controlId"},
							dependentSelector: []
						},
						{
							fileName: "change3",
							fileType: "change",
							layer: "CUSTOMER",
							reference: "appComponentReference",
							selector: {id: "anotherControlId"},
							dependentSelector: []
						}
					]
				}
			});
			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");
			return this.oChangePersistence.loadChangesMapForComponent(oAppComponent, {})
				.then(function (fnGetChangesMap) {
					assert.ok(typeof fnGetChangesMap === "function", "a function is returned");
					var mChanges = fnGetChangesMap().mChanges;
					assert.ok(mChanges);
					assert.ok(mChanges["controlId"]);
					assert.ok(mChanges["anotherControlId"]);
					assert.equal(mChanges["controlId"].length, 2);
					assert.equal(mChanges["anotherControlId"].length, 1);
					assert.ok(mChanges["controlId"][0] instanceof Change, "Change is instanceof Change");
					assert.ok(mChanges["controlId"][1] instanceof Change, "Change is instanceof Change");
					assert.ok(mChanges["anotherControlId"][0] instanceof Change, "Change is instanceof Change");
					assert.ok(mChanges["controlId"].some(function (oChange) {
						return oChange.getId() === "change1";
					}));
					assert.ok(mChanges["controlId"].some(function (oChange) {
						return oChange.getId() === "change2";
					}));
					assert.ok(mChanges["anotherControlId"].some(function (oChange) {
						return oChange.getId() === "change3";
					}));
				});
		});

		QUnit.test("when loadChangesMapForComponent is called with an app component containing a combination of app and embedded component changes", function(assert) {
			var oAppComponent = {
				createId: function(sSelectorId) {
					return "mockAppComponent---" + sSelectorId;
				}
			};
			var oChange1 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange1",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {
						id: "field3-2",
						idIsLocal: true
					},
					dependentSelector: {
						"alias": [{
							id: "group3",
							idIsLocal: true
						}, {
							id: "group2",
							idIsLocal: true
						}]
					}
				})
			);
			var oChange2 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange2",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {
						id: "field3-2",
						idIsLocal: true
					},
					dependentSelector: {
						"alias": [{
							id: "group2",
							idIsLocal: true
						}, {
							id: "group1"
						}],
						"alias2": {
							id: "field3-2",
							idIsLocal: true
						}
					}
				})
			);
			var oChange3 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange3",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "group1"}
				})
			);
			var oChange4 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange4",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {
						id: "embeddedComponent---group1",
						idIsLocal: false //embedded component
					}
				})
			);

			var mExpectedChanges = {
				mChanges: {
					"mockAppComponent---field3-2": [oChange1, oChange2],
					"group1": [oChange3],
					"embeddedComponent---group1": [oChange4]
				},
				mDependencies: {
					"fileNameChange1": {
						"changeObject": oChange1,
						"dependencies": [],
						"controlsDependencies": [{id: "group3", idIsLocal: true}, {id: "group2", idIsLocal: true}]
					},
					"fileNameChange2": {
						"changeObject": oChange2,
						"dependencies": ["fileNameChange1"],
						"controlsDependencies": [{id: "group2", idIsLocal: true}, {id: "group1"}]
					},
					"fileNameChange3": {
						"changeObject": oChange3,
						"dependencies": ["fileNameChange2"]
					}
				},
				mDependentChangesOnMe: {
					"fileNameChange1": ["fileNameChange2"],
					"fileNameChange2": ["fileNameChange3"]
				},
				aChanges: [oChange1, oChange2, oChange3, oChange4]
			};

			sandbox.stub(this.oChangePersistence, "getChangesForComponent").resolves([oChange1, oChange2, oChange3, oChange4]);
			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");
			return this.oChangePersistence.loadChangesMapForComponent(oAppComponent, {})
				.then(function (fnGetChangesMap) {
					assert.ok(typeof fnGetChangesMap === "function", "then a function for changes map returned");
					var mChanges = fnGetChangesMap();
					assert.deepEqual(mChanges, mExpectedChanges, "then the changes map is returned as expected");
				});
		});

		QUnit.test("loadChangesMapForComponent returns a map with dependencies - test2", function (assert) {
			var oAppComponent = {
				id: "mockAppComponent"
			};
			var oChange0 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange0",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "group1"}
				})
			);
			var oChange1 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange1",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "field3-2"},
					dependentSelector: {
						"alias": [{
							id: "group3"
						}, {
							id: "group2"
						}]
					}
				})
			);
			var oChange2 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange2",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "field3-2"},
					dependentSelector: {
						"alias": [{
							id: "group2"
						}, {
							id: "group1"
						}],
						"alias2": {
							id: "field3-2"
						}
					}
				})
			);

			var mExpectedChanges = {
				mChanges: {
					"field3-2": [oChange1, oChange2],
					"group1": [oChange0]
				},
				mDependencies: {
					"fileNameChange1": {
						"changeObject": oChange1,
						"dependencies": [],
						"controlsDependencies": [{id: "group3"}, {id: "group2"}]
					},
					"fileNameChange2": {
						"changeObject": oChange2,
						"dependencies": ["fileNameChange1", "fileNameChange0"],
						"controlsDependencies": [{id: "group2"}, {id: "group1"}]
					}
				},
				mDependentChangesOnMe: {
					"fileNameChange0": ["fileNameChange2"],
					"fileNameChange1": ["fileNameChange2"]
				},
				aChanges: [oChange0, oChange1, oChange2]
			};

			sandbox.stub(this.oChangePersistence, "getChangesForComponent").resolves([oChange0, oChange1, oChange2]);
			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");

			return this.oChangePersistence.loadChangesMapForComponent(oAppComponent, {})
				.then(function (fnGetChangesMap) {
					assert.ok(typeof fnGetChangesMap === "function", "a function is returned");
					assert.deepEqual(fnGetChangesMap(), mExpectedChanges);
				});
		});

		QUnit.test("loadChangesMapForComponent returns a map with dependencies - test3", function (assert) {
			var oAppComponent = {
				id: "mockAppComponent"
			};
			var oChange1 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange1",
					layer: "USER",
					namespace: "namespace",
					selector: {id: "field3-2"},
					reference: "appComponentReference",
					dependentSelector: {
						"alias": {
							id: "group3"
						},
						"alias2": {
							id: "group2"
						}
					}
				})
			);
			var oChange2 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange2",
					layer: "USER",
					namespace: "namespace",
					reference: "appComponentReference",
					selector: {id: "group2"}
				})
			);

			var mExpectedChanges = {
				mChanges: {
					"field3-2": [oChange1],
					"group2": [oChange2]
				},
				mDependencies: {
					"fileNameChange1": {
						"changeObject": oChange1,
						"dependencies": [],
						"controlsDependencies": [{id: "group3"}, {id: "group2"}]
					},
					"fileNameChange2": {
						"changeObject": oChange2,
						"dependencies": ["fileNameChange1"]
					}
				},
				mDependentChangesOnMe: {
					"fileNameChange1": ["fileNameChange2"]
				},
				aChanges: [oChange1, oChange2]
			};

			sandbox.stub(this.oChangePersistence, "getChangesForComponent").resolves([oChange1, oChange2]);
			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");

			return this.oChangePersistence.loadChangesMapForComponent(oAppComponent, {})
				.then(function (fnGetChangesMap) {
					assert.ok(typeof fnGetChangesMap === "function", "a function is returned");
					assert.deepEqual(fnGetChangesMap(), mExpectedChanges);
				});
		});

		QUnit.test("loadChangesMapForComponent returns a map with dependencies - test4", function(assert) {
			var oAppComponent = {
				id: "mockAppComponent"
			};
			var oChange1 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange1",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "group2"}
				})
			);
			var oChange2 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange2",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "field3-2"},
					dependentSelector: {
						"alias": {
							id: "group3"
						},
						"alias2": {
							id: "group2"
						}
					}
				})
			);
			var mExpectedChanges = {
				mChanges: {
					"group2": [oChange1],
					"field3-2": [oChange2]
				},
				mDependencies: {
					"fileNameChange2": {
						"changeObject": oChange2,
						"dependencies": ["fileNameChange1"],
						"controlsDependencies": [{id: "group3"}, {id: "group2"}]
					}
				},
				mDependentChangesOnMe: {
					"fileNameChange1": ["fileNameChange2"]
				},
				aChanges: [oChange1, oChange2]
			};

			sandbox.stub(this.oChangePersistence, "getChangesForComponent").resolves([
				oChange1,
				oChange2
			]);

			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");

			return this.oChangePersistence.loadChangesMapForComponent(oAppComponent, {})
				.then(function (fnGetChangesMap) {
					assert.ok(typeof fnGetChangesMap === "function", "a function is returned");
					assert.deepEqual(fnGetChangesMap(), mExpectedChanges);
				});
		});

		QUnit.test("loadChangesMapForComponent returns a map with dependencies - test5", function(assert) {
			var oAppComponent = {
				id :"mockAppComponent"
			};
			var oChange1 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange1",
					layer: "USER",
					namespace: "namespace",
					reference: "appComponentReference",
					selector: {id: "group2"}
				})
			);
			var oChange2 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange2",
					layer: "USER",
					namespace: "namespace",
					reference: "appComponentReference",
					selector: {id: "group2"}
				})
			);

			var mExpectedChanges = {
				mChanges: {
					"group2": [oChange1, oChange2]
				},
				mDependencies: {
					"fileNameChange2": {
						"changeObject": oChange2,
						"dependencies": ["fileNameChange1"]
					}
				},
				mDependentChangesOnMe: {
					"fileNameChange1": ["fileNameChange2"]
				},
				aChanges: [oChange1, oChange2]
			};

			sandbox.stub(this.oChangePersistence, "getChangesForComponent").resolves([oChange1, oChange2]);
			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");

			return this.oChangePersistence.loadChangesMapForComponent(oAppComponent, {})
				.then(function (fnGetChangesMap) {
					assert.ok(typeof fnGetChangesMap === "function", "a function is returned");
					assert.deepEqual(fnGetChangesMap(), mExpectedChanges);
				});
		});

		QUnit.test("loadChangesMapForComponent adds legacy change only once in case the component prefix matches the app component ID", function(assert) {
			var sAppComponentId = "appComponentId";

			var oComponent = {
				getId: function () {
					return sAppComponentId;
				},
				createId: function (sSuffix) {
					return sAppComponentId + "---" + sSuffix;
				}
			};

			var oChange = new Change({
				fileName:"change1",
				fileType: "change",
				layer: "USER",
				selector: { id: oComponent.createId("controlId") },
				dependentSelector: []
			});

			this.oChangePersistence._addChangeIntoMap(oComponent, oChange);

			assert.equal(Object.keys(this.oChangePersistence._mChanges.mChanges).length, 1, "thje change was written only once");
			assert.equal(this.oChangePersistence._mChanges.mChanges[oComponent.createId("controlId")][0], oChange,
				"the change was written for the selector ID");
		});

		QUnit.test("loadChangesMapForComponent adds legacy change twice in case the component prefix does not match the app component ID", function(assert) {
			var sAppComponentId = "appComponentId";

			var oComponent = {
				getId: function () {
					return sAppComponentId;
				},
				createId: function (sSuffix) {
					return sAppComponentId + "---" + sSuffix;
				}
			};

			var oChange = new Change({
				fileName:"change1",
				fileType: "change",
				layer: "USER",
				selector: { id: "anotherComponentId---controlId" },
				dependentSelector: []
			});

			this.oChangePersistence._addChangeIntoMap(oComponent, oChange);

			assert.equal(Object.keys(this.oChangePersistence._mChanges.mChanges).length, 2, "the change was written twice");
			assert.equal(this.oChangePersistence._mChanges.mChanges["anotherComponentId---controlId"].length, 1,
				"a change was written for the original selector ID");
			assert.equal(this.oChangePersistence._mChanges.mChanges["anotherComponentId---controlId"][0], oChange,
				"the change was written for the original selector ID");
			assert.equal(this.oChangePersistence._mChanges.mChanges["appComponentId---controlId"].length, 1,
				"a change was written for the selector ID concatenated with the app component ID");
			assert.equal(this.oChangePersistence._mChanges.mChanges["appComponentId---controlId"][0], oChange,
				"the change was written for the app selector ID");
		});

		QUnit.test("loadChangesMapForComponent adds non legacy change only once in case the component prefix does not match the app component ID", function(assert) {
			var sAppComponentId = "appComponentId";

			var oComponent = {
				getId: function () {
					return sAppComponentId;
				},
				createId: function (sSuffix) {
					return sAppComponentId + "---" + sSuffix;
				}
			};

			var oChange = new Change({
				fileName:"change1",
				fileType: "change",
				layer: "USER",
				selector: { id: "anotherComponentId---controlId", idIsLocal: false },
				dependentSelector: []
			});

			this.oChangePersistence._addChangeIntoMap(oComponent, oChange);

			assert.equal(Object.keys(this.oChangePersistence._mChanges.mChanges).length, 1, "the change was written only once");
			assert.equal(this.oChangePersistence._mChanges.mChanges["anotherComponentId---controlId"].length, 1,
				"a change was written for the original selector ID");
			assert.equal(this.oChangePersistence._mChanges.mChanges["anotherComponentId---controlId"][0], oChange,
				"the change was written for the original selector ID");
		});

		QUnit.test("copyDependenciesFromInitialChangesMap", function(assert) {
			var oChange0 = {
				getId: function() {
					return "fileNameChange0";
				}
			};
			var oChange1 = {
				getId: function() {
					return "fileNameChange1";
				}
			};
			var oChange2 = {
				getId: function() {
					return "fileNameChange2";
				}
			};
			var mChanges = {
				"field3-2": [oChange1, oChange2],
				"group1": [oChange0]
			};
			var mInitialDependenciesMap = {
				mChanges: mChanges,
				mDependencies: {
					"fileNameChange1": {
						"changeObject": oChange1,
						"dependencies": [],
						"controlsDependencies": ["group3", "group2"]
					},
					"fileNameChange2": {
						"changeObject": oChange2,
						"dependencies": ["fileNameChange1", "fileNameChange0"],
						"controlsDependencies": ["group2", "group1"]
					}
				},
				mDependentChangesOnMe: {
					"fileNameChange0": ["fileNameChange2"],
					"fileNameChange1": ["fileNameChange2"]
				}
			};
			var mCurrentDependenciesMap = {
				mChanges: mChanges,
				mDependencies: {},
				mDependentChangesOnMe: {}
			};
			var mExpectedDependenciesMapAfterFirstChange = {
				mChanges: mChanges,
				mDependencies: {
					"fileNameChange1": {
						"changeObject": oChange1,
						"dependencies": [],
						"controlsDependencies": ["group3", "group2"]
					}
				},
				mDependentChangesOnMe: {}
			};

			var mExpectedDependenciesMapAfterSecondChange = {
				mChanges: mChanges,
				mDependencies: {
					"fileNameChange1": {
						"changeObject": oChange1,
						"dependencies": [],
						"controlsDependencies": ["group3", "group2"]
					},
					"fileNameChange2": {
						"changeObject": oChange2,
						"dependencies": [],
						"controlsDependencies": ["group2", "group1"]
					}
				},
				mDependentChangesOnMe: {}
			};

			this.oChangePersistence._mChangesInitial = mInitialDependenciesMap;
			this.oChangePersistence._mChanges = mCurrentDependenciesMap;
			function fnCallbackTrue() {
				return true;
			}
			function fnCallbackFalse() {
				return false;
			}

			var mUpdatedDependenciesMap = this.oChangePersistence.copyDependenciesFromInitialChangesMap(oChange0, fnCallbackTrue);
			assert.deepEqual(mUpdatedDependenciesMap, mCurrentDependenciesMap, "no dependencies got copied");

			mUpdatedDependenciesMap = this.oChangePersistence.copyDependenciesFromInitialChangesMap(oChange1, fnCallbackTrue);
			assert.deepEqual(mUpdatedDependenciesMap, mExpectedDependenciesMapAfterFirstChange, "all dependencies from change1 got copied");

			mUpdatedDependenciesMap = this.oChangePersistence.copyDependenciesFromInitialChangesMap(oChange2, fnCallbackFalse);
			assert.deepEqual(mUpdatedDependenciesMap, mExpectedDependenciesMapAfterSecondChange, "no dependencies from change2 got copied");

			mUpdatedDependenciesMap = this.oChangePersistence.copyDependenciesFromInitialChangesMap(oChange2, fnCallbackTrue);
			assert.deepEqual(mUpdatedDependenciesMap, mInitialDependenciesMap, "all dependencies from change2 got copied");

			assert.deepEqual(mUpdatedDependenciesMap, this.oChangePersistence._mChanges, "the updated dependencies map is saved in the internal changes map");
		});

		QUnit.test("deleteChanges with bRunTimeCreatedChange parameter set, shall remove the given change from the map", function(assert) {
			var oAppComponent = {
				id :"mockAppComponent"
			};
			sandbox.stub(Cache, "getChangesFillingCache").resolves({
				changes: {
					changes: [
						{
							fileName: "change1",
							fileType: "change",
							selector: {id: "controlId"},
							reference: "appComponentReference",
							dependentSelector: []
						},
						{
							fileName: "change2",
							fileType: "change",
							selector: {id: "controlId"},
							reference: "appComponentReference",
							dependentSelector: []
						},
						{
							fileName: "change3",
							fileType: "change",
							selector: {id: "anotherControlId"},
							reference: "appComponentReference",
							dependentSelector: []
						}
					]
				}
			});

			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");
			sandbox.spy(this.oChangePersistence, "_deleteChangeInMap");

			return this.oChangePersistence.loadChangesMapForComponent(oAppComponent, {})
				.then(function (fnGetChangesMap) {
					var mChanges = fnGetChangesMap().mChanges;
					var oChangeForDeletion = mChanges["controlId"][1]; // second change for 'controlId' shall be removed
					this.oChangePersistence.deleteChange(oChangeForDeletion, true);
					assert.equal(mChanges["controlId"].length, 1, "'controlId' has only one change in the map");
					assert.equal(mChanges["controlId"][0].getId(), "change1", "the change has the ID 'change1'");
					assert.equal(mChanges["anotherControlId"].length, 1, "'anotherControlId' has still one change in the map");
					assert.ok(this.oChangePersistence._deleteChangeInMap.calledWith(oChangeForDeletion, true), "then _deleteChangeInMap() was called with the correct parameters");
				}.bind(this));
		});

		QUnit.test("when getChangesForView is called with a view ID and an app component", function(assert) {
			var oAppComponent = {
				id :"mockAppComponent"
			};

			var oChange1View1 = {
				fileName:"change1View1",
				fileType: "change",
				reference: "appComponentReference",
				selector:{
					id: "view1--view2--button1"
				}
			};

			var oChange1View2 = {
				fileName:"change1View2",
				fileType: "change",
				reference: "appComponentReference",
				selector: {
					id: "view1--button1"
				}
			};

			var oChange2View2 = {
				fileName:"change2View2",
				fileType: "change",
				reference: "appComponentReference",
				selector: {
					id: "view1--button2"
				}
			};

			var oChange1View3 = {
				fileName:"change2View2",
				fileType: "change",
				reference: "appComponentReference",
				selector: {
					id: "view1--view2--button2",
					idIsLocal: false
				}
			};


			sandbox.stub(Cache, "getChangesFillingCache").resolves({
				changes: {
					changes: [oChange1View1, oChange1View2, oChange2View2, oChange1View3]
				}
			});

			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");

			var mPropertyBag = {
				viewId: "view1--view2",
				component: oAppComponent
			};

			return this.oChangePersistence.getChangesForView("view1--view2", mPropertyBag)
				.then(function (aChanges) {
					assert.strictEqual(aChanges.length, 1, "then only one change was returned");
					assert.strictEqual(aChanges[0].getId(), "change1View1", "then only the change with the same view selector prefix and belonging to the passed component was returned");
				});
		});

		QUnit.test("when getChangesForView is called with an embedded component and a view ID existing both for app and embedded components", function(assert) {
			var oEmbeddedComponent = {
				id :"mockEmbeddedComponent"
			};

			var oChange1View1 = {
				fileName:"change1View1",
				fileType: "change",
				reference: "appComponentReference",
				selector:{
					id: "view1--button1",
					idIsLocal: true
				}
			};

			var oChange1View2 = {
				fileName:"change1View2",
				fileType: "change",
				reference: "appComponentReference",
				selector: {
					id: "mockEmbeddedComponent---view1--button1",
					idIsLocal: false
				}
			};

			sandbox.stub(Cache, "getChangesFillingCache").resolves({
				changes: {
					changes: [oChange1View1, oChange1View2]
				}
			});
			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oEmbeddedComponent).returns("embeddedComponentReference");

			var mPropertyBag = {
				viewId: "mockEmbeddedComponent---view1",
				component: oEmbeddedComponent
			};

			return this.oChangePersistence.getChangesForView("embeddedComponent---view1", mPropertyBag)
				.then(function (aChanges) {
					assert.strictEqual(aChanges.length, 1, "then only one change is returned");
					assert.strictEqual(aChanges[0].getId(), "change1View2", "then only the change belonging to the embedded component was returned");
				});
		});

		QUnit.test("_getChangesFromMapByNames returns array of changes with corresponding name", function (assert) {
			var oAppComponent = {
				id: "mockAppComponent"
			};
			var oChange0 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange0",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "group1"}
				})
			);
			var oChange1 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange1",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "field3-2"},
					dependentSelector: {
						"alias": [{
							id: "group3"
						}, {
							id: "group2"
						}]
					}
				})
			);
			var oChange2 = new Change(
				Change.createInitialFileContent({
					id: "fileNameChange2",
					layer: "USER",
					reference: "appComponentReference",
					namespace: "namespace",
					selector: {id: "field3-2"},
					dependentSelector: {
						"alias": [{
							id: "group2"
						}, {
							id: "group1"
						}],
						"alias2": {
							id: "field3-2"
						}
					}
				})
			);
			var aNames = ["fileNameChange0", "fileNameChange2"];
			var aExpectedChanges = [oChange0, oChange2];

			sandbox.stub(this.oChangePersistence, "getChangesForComponent").resolves([oChange0, oChange1, oChange2]);
			sandbox.stub(Utils, "getComponentName").callThrough().withArgs(oAppComponent).returns("appComponentReference");

			return this.oChangePersistence.loadChangesMapForComponent(oAppComponent, {})
				.then(function () {
					return this.oChangePersistence._getChangesFromMapByNames(aNames);
				}.bind(this))
				.then(function (aChanges) {
					assert.deepEqual(aChanges, aExpectedChanges, " 2 changes should be found");
				});
		});

		QUnit.test("when calling transportAllUIChanges successfully", function(assert) {
			var oMockTransportInfo = {
				packageName : "PackageName",
				transport : "transportId"
			};
			var oMockNewChange = {
				packageName : "$TMP",
				fileType : "change",
				id : "changeId2",
				namespace : "namespace",
				getDefinition : function(){
					return {
						packageName : this.packageName,
						fileType : this.fileType
					};
				},
				getId : function(){
					return this.id;
				},
				getNamespace : function(){
					return this.namespace;
				},
				setResponse : function(oDefinition){
					this.packageName = oDefinition.packageName;
				},
				getPackage : function(){
					return this.packageName;
				}
			};

			var oAppVariantDescriptor = {
				packageName : "$TMP",
				fileType : "appdescr_variant",
				fileName : "manifest",
				id : "customer.app.var.id",
				namespace : "namespace",
				getDefinition : function(){
					return {
						fileType : this.fileType,
						fileName : this.fileName
					};
				},
				getNamespace : function(){
					return this.namespace;
				},
				getPackage : function(){
					return this.packageName;
				}
			};

			var aMockLocalChanges = [oMockNewChange];
			var aAppVariantDescriptors = [oAppVariantDescriptor];

			sandbox.stub(Utils, "getClient").returns('');
			var fnOpenTransportSelectionStub = sandbox.stub(this.oChangePersistence._oTransportSelection, "openTransportSelection").returns(Promise.resolve(oMockTransportInfo));
			var fnCheckTransportInfoStub = sandbox.stub(this.oChangePersistence._oTransportSelection, "checkTransportInfo").returns(true);
			var fnGetChangesForComponentStub = sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve(aMockLocalChanges));
			var fnPrepareChangesForTransportStub = sandbox.stub(this.oChangePersistence._oTransportSelection, "_prepareChangesForTransport").returns(Promise.resolve());

			return this.oChangePersistence.transportAllUIChanges(null, null, null, aAppVariantDescriptors).then(function(){
				assert.ok(fnOpenTransportSelectionStub.calledOnce, "then openTransportSelection called once");
				assert.ok(fnCheckTransportInfoStub.calledOnce, "then checkTransportInfo called once");
				assert.ok(fnGetChangesForComponentStub.calledOnce, "then getChangesForComponent called once");
				assert.ok(fnPrepareChangesForTransportStub.calledOnce, "then _prepareChangesForTransport called once");
				assert.ok(fnPrepareChangesForTransportStub.calledWith(oMockTransportInfo, aMockLocalChanges, aAppVariantDescriptors), "then _prepareChangesForTransport called with the transport info and changes array");
			});
		});

		QUnit.test("when calling transportAllUIChanges unsuccessfully", function(assert){
			sandbox.stub(this.oChangePersistence._oTransportSelection, "openTransportSelection").returns(Promise.reject());
			sandbox.stub(MessageBox, "show");
			return this.oChangePersistence.transportAllUIChanges().then(function(sResponse){
				assert.equal(sResponse, "Error", "then Promise.resolve() with error message is returned");
			});
		});

		QUnit.test("when calling transportAllUIChanges successfully, but with cancelled transport selection", function(assert){
			sandbox.stub(this.oChangePersistence._oTransportSelection, "openTransportSelection").returns(Promise.resolve());
			return this.oChangePersistence.transportAllUIChanges().then(function(sResponse){
				assert.equal(sResponse, "Cancel", "then Promise.resolve() with cancel message is returned");
			});
		});

		QUnit.test("when calling resetChanges without generator, selector IDs and change types specified", function (assert) {
			sandbox.stub(Utils.log, "error");
			this.oChangePersistence.resetChanges("VENDOR");
			assert.ok(Utils.log.error.calledWith("Of the generator, selector IDs and change types parameters at least one has to filled"), "then Utils.log.error() is called with an error");
		});

		QUnit.test("when calling resetChanges in VENDOR layer with mix content of $TMP and transported changes", function (assert) {
			var done = assert.async();
			var oMockTransportInfo = {
				packageName : "PackageName",
				transport : "transportId"
			};
			// changes for the component
			var oVENDORChange1 = new Change({
				"fileType": "change",
				"layer": "VENDOR",
				"fileName": "1",
				"namespace": "b",
				"packageName": "$TMP",
				"changeType": "labelChange",
				"creation": "",
				"reference": "",
				"selector": {
					"id": "abc123"
				},
				"content": {
					"something": "createNewVariant"
				}
			});

			var oVENDORChange2 = new Change({
				"fileType": "change",
				"layer": "VENDOR",
				"fileName": "2",
				"namespace": "b",
				"packageName": "c",
				"changeType": "labelChange",
				"creation": "",
				"reference": "",
				"selector": {
					"id": "abc123"
				},
				"content": {
					"something": "createNewVariant"
				}
			});

			var aChanges = [oVENDORChange1, oVENDORChange2];
			sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve(aChanges));
			var aDeletedChangeContentIds = {response : [{name: "1"}, {name: "2"}]};

			// Settings in registry
			var oSetting = {
				isKeyUser: true,
				isAtoAvailable: false,
				isProductiveSystem: function() {return false;},
				hasMergeErrorOccured: function() {return false;},
				isAtoEnabled: function() {return false;}
			};
			sandbox.stub(sap.ui.fl.registry.Settings, "getInstance").returns(Promise.resolve(oSetting));

			// LREP Connector
			var oLrepStub = sandbox.stub(this.oChangePersistence._oConnector, "send").returns(Promise.resolve(aDeletedChangeContentIds));
			var oCacheRemoveChangesStub = sandbox.stub(Cache, "removeChanges");
			var oGetChangesFromMapByNamesStub = sandbox.stub(this.oChangePersistence, "_getChangesFromMapByNames").returns(Promise.resolve());
			var fnOpenTransportSelectionStub = sandbox.stub(this.oChangePersistence._oTransportSelection, "openTransportSelection").returns(Promise.resolve(oMockTransportInfo));

			this.oChangePersistence.resetChanges("VENDOR", "Change.createInitialFileContent").then(function(aChanges) {
				assert.ok(fnOpenTransportSelectionStub.calledOnce, "then openTransportSelection called once");
				assert.ok(oLrepStub.calledOnce, "the LrepConnector is called once");
				assert.equal(oLrepStub.args[0][0],
					"/sap/bc/lrep/changes/?reference=MyComponent&appVersion=1.2.3&layer=VENDOR&changelist=transportId&generator=Change.createInitialFileContent",
					"and with the correct URI");
				assert.equal(oLrepStub.args[0][1], "DELETE", "and with the correct method");
				assert.equal(oCacheRemoveChangesStub.callCount, 0, "the Cache.removeChanges is not called");
				assert.equal(oGetChangesFromMapByNamesStub.callCount, 0,  "the getChangesFromMapByNames is not called");
				assert.deepEqual(aChanges, [], "empty array is returned");
				done();
			});
		});

		QUnit.test("when calling resetChanges in VENDOR layer for transported changes with selector and change type", function (assert) {
			var oMockTransportInfo = {
				packageName : "PackageName",
				transport : "transportId"
			};
			// changes for the component
			var oVENDORChange1 = new Change({
				"fileType": "change",
				"layer": "VENDOR",
				"fileName": "1",
				"namespace": "b",
				"packageName": "$TMP",
				"changeType": "labelChange",
				"creation": "",
				"reference": "",
				"selector": {
					"id": "abc123"
				},
				"content": {
					"something": "createNewVariant"
				}
			});

			var oVENDORChange2 = new Change({
				"fileType": "change",
				"layer": "VENDOR",
				"fileName": "2",
				"namespace": "b",
				"packageName": "c",
				"changeType": "labelChange",
				"creation": "",
				"reference": "",
				"selector": {
					"id": "abc123"
				},
				"content": {
					"something": "createNewVariant"
				}
			});

			var aChanges = [oVENDORChange1, oVENDORChange2];
			sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve(aChanges));
			var aDeletedChangeContentIds = {response: [{name: "1"}, {name: "2"}]};

			// Settings in registry
			var oSetting = {
				isKeyUser: true,
				isAtoAvailable: false,
				isProductiveSystem: function() {return false;},
				hasMergeErrorOccured: function() {return false;},
				isAtoEnabled: function() {return false;}
			};
			sandbox.stub(sap.ui.fl.registry.Settings, "getInstance").returns(Promise.resolve(oSetting));

			// LREP Connector
			var oLrepStub = sandbox.stub(this.oChangePersistence._oConnector, "send").returns(Promise.resolve(aDeletedChangeContentIds));
			var fnOpenTransportSelectionStub = sandbox.stub(this.oChangePersistence._oTransportSelection, "openTransportSelection").returns(Promise.resolve(oMockTransportInfo));
			var oCacheRemoveChangesStub = sandbox.stub(Cache, "removeChanges");
			var oGetChangesFromMapByNamesStub = sandbox.stub(this.oChangePersistence, "_getChangesFromMapByNames").returns(Promise.resolve());

			return this.oChangePersistence.resetChanges("VENDOR", "", ["abc123"], ["labelChange"]).then(function() {
				assert.ok(fnOpenTransportSelectionStub.calledOnce, "then openTransportSelection called once");
				assert.ok(oLrepStub.calledOnce, "the LrepConnector is called once");
				assert.equal(oLrepStub.args[0][0],
					"/sap/bc/lrep/changes/?reference=MyComponent&appVersion=1.2.3&layer=VENDOR&changelist=transportId&selector=abc123&changeType=labelChange",
					"and with the correct URI");
				assert.equal(oLrepStub.args[0][1], "DELETE", "and with the correct method");
				assert.ok(oCacheRemoveChangesStub.calledOnce, "the Cache.removeChanges is called once");
				assert.deepEqual(oCacheRemoveChangesStub.args[0][1], ["1", "2"], "and with the correct names");
				assert.ok(oGetChangesFromMapByNamesStub.calledOnce, "the getChangesFromMapByNames is called once");
				assert.deepEqual(oGetChangesFromMapByNamesStub.args[0][0], ["1", "2"], "and with the correct names");
			});
		});

		QUnit.test("when calling resetChanges in CUSTOMER layer with ATO_NOTIFICATION", function (assert) {
			// changes for the component
			var oUserChange = new Change({
				"fileType": "change",
				"layer": "USER",
				"fileName": "1",
				"namespace": "b",
				"packageName": "c",
				"changeType": "labelChange",
				"creation": "",
				"reference": "",
				"selector": {
					"id": "abc123"
				},
				"content": {
					"something": "createNewVariant"
				}
			});

			var oCUSTOMERChange1 = new Change({
				"fileType": "change",
				"layer": "CUSTOMER",
				"fileName": "2",
				"namespace": "b",
				"packageName": "c",
				"changeType": "labelChange",
				"creation": "",
				"reference": "",
				"selector": {
					"id": "abc123"
				},
				"content": {
					"something": "createNewVariant"
				}
			});

			var oCUSTOMERChange2 = new Change({
				"fileType": "change",
				"layer": "CUSTOMER",
				"fileName": "3",
				"namespace": "b",
				"packageName": "c",
				"changeType": "labelChange",
				"creation": "",
				"reference": "",
				"selector": {
					"id": "abc123"
				},
				"content": {
					"something": "createNewVariant"
				}
			});

			var aChanges = [oCUSTOMERChange1, oUserChange, oCUSTOMERChange2];
			sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve(aChanges));
			var aDeletedChangeContentIds = {response : [{name: "2"}, {name: "3"}]};

			// Settings in registry
			var oSetting = {
				isKeyUser: true,
				isAtoAvailable: true,
				isProductiveSystem: function() {return false;},
				hasMergeErrorOccured: function() {return false;},
				isAtoEnabled: function() {return true;}
			};
			sandbox.stub(sap.ui.fl.registry.Settings, "getInstance").returns(Promise.resolve(oSetting));

			// LREP Connector
			var oLrepStub = sandbox.stub(this.oChangePersistence._oConnector, "send").returns(Promise.resolve(aDeletedChangeContentIds));
			var oCacheRemoveChangesStub = sandbox.stub(Cache, "removeChanges");
			var oGetChangesFromMapByNamesStub = sandbox.stub(this.oChangePersistence, "_getChangesFromMapByNames").returns(Promise.resolve());

			return this.oChangePersistence.resetChanges("CUSTOMER", "Change.createInitialFileContent").then(function(aChanges) {
				assert.ok(oLrepStub.calledOnce, "the LrepConnector is called once");
				assert.equal(oLrepStub.args[0][0],
					"/sap/bc/lrep/changes/?reference=MyComponent&appVersion=1.2.3&layer=CUSTOMER&changelist=ATO_NOTIFICATION&generator=Change.createInitialFileContent",
					"and with the correct URI");
				assert.equal(oLrepStub.args[0][1], "DELETE", "and with the correct method");
				assert.equal(oCacheRemoveChangesStub.callCount, 0, "the Cache.removeChanges is not called");
				assert.equal(oGetChangesFromMapByNamesStub.callCount, 0,  "the getChangesFromMapByNames is not called");
				assert.deepEqual(aChanges, [], "empty array is returned");
			});
		});

		QUnit.test("when calling resetChanges in CUSTOMER layer with selector IDs", function (assert) {

			sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve([]));
			var aDeletedChangeContentIds = {response : [{name: "1"}, {name: "2"}]};

			// Settings in registry
			var oSetting = {
				isKeyUser: true,
				isAtoAvailable: true,
				isProductiveSystem: function() {return false;},
				hasMergeErrorOccured: function() {return false;},
				isAtoEnabled: function() {return true;}
			};
			sandbox.stub(sap.ui.fl.registry.Settings, "getInstance").returns(Promise.resolve(oSetting));
			var oLrepStub = sandbox.stub(this.oChangePersistence._oConnector, "send").returns(Promise.resolve(aDeletedChangeContentIds));
			var oCacheRemoveChangesStub = sandbox.stub(Cache, "removeChanges");
			var oGetChangesFromMapByNamesStub = sandbox.stub(this.oChangePersistence, "_getChangesFromMapByNames").returns(Promise.resolve());
			var aControlIds = [
				"view--control1",
				"view--controlWithNoChanges",
				"feview--control2",
				"feview--controlWithNoChanges"
			];
			return this.oChangePersistence.resetChanges("CUSTOMER", "Change.createInitialFileContent", aControlIds).then(function() {
				assert.ok(oLrepStub.calledOnce, "the LrepConnector is called once");
				assert.equal(oLrepStub.args[0][0],
					"/sap/bc/lrep/changes/?reference=MyComponent&appVersion=1.2.3&layer=CUSTOMER&generator=Change.createInitialFileContent&" +
					"selector=view--control1,view--controlWithNoChanges,feview--control2,feview--controlWithNoChanges",
					"and with the correct URI");
				assert.equal(oLrepStub.args[0][1], "DELETE", "and with the correct method");
				assert.ok(oCacheRemoveChangesStub.calledOnce, "the Cache.removeChanges is called once");
				assert.deepEqual(oCacheRemoveChangesStub.args[0][1], ["1", "2"], "and with the correct names");
				assert.ok(oGetChangesFromMapByNamesStub.calledOnce, "the getChangesFromMapByNames is called once");
				assert.deepEqual(oGetChangesFromMapByNamesStub.args[0][0], ["1", "2"], "and with the correct names");
			});
		});

		QUnit.test("when calling resetChanges in USER layer with selector IDs", function (assert) {

			sandbox.stub(this.oChangePersistence, "getChangesForComponent").returns(Promise.resolve([]));
			var oTransportStub = sandbox.stub(this.oChangePersistence._oTransportSelection, "setTransports");
			var aDeletedChangeContentIds = {response: [{name: "1"}, {name: "2"}]};
			// Settings in registry
			var oSetting = {
				isKeyUser: true,
				isAtoAvailable: true,
				isProductiveSystem: function() {return false;},
				hasMergeErrorOccured: function() {return false;},
				isAtoEnabled: function() {return true;}
			};
			sandbox.stub(sap.ui.fl.registry.Settings, "getInstance").returns(Promise.resolve(oSetting));
			var oLrepStub = sandbox.stub(this.oChangePersistence._oConnector, "send").returns(Promise.resolve(aDeletedChangeContentIds));
			var oCacheRemoveChangesStub = sandbox.stub(Cache, "removeChanges");
			var oGetChangesFromMapByNamesStub = sandbox.stub(this.oChangePersistence, "_getChangesFromMapByNames").returns(Promise.resolve());

			var aControlIds = [
				"view--control1",
				"view--controlWithNoChanges",
				"feview--control2",
				"feview--controlWithNoChanges"
			];
			return this.oChangePersistence.resetChanges("USER", "Change.createInitialFileContent", aControlIds).then(function() {
				assert.equal(oTransportStub.callCount, 0, "no transport data was requested");
				assert.equal(oLrepStub.callCount, 1, "the LrepConnector is called once");
				assert.equal(oLrepStub.args[0][0],
					"/sap/bc/lrep/changes/?reference=MyComponent&appVersion=1.2.3&layer=USER&generator=Change.createInitialFileContent&" +
					"selector=view--control1,view--controlWithNoChanges,feview--control2,feview--controlWithNoChanges",
					"and with the correct URI");
				assert.equal(oLrepStub.args[0][1], "DELETE", "and with the correct method");
				assert.ok(oCacheRemoveChangesStub.calledOnce, "the Cache.removeChanges is called once");
				assert.deepEqual(oCacheRemoveChangesStub.args[0][1], ["1", "2"], "and with the correct names");
				assert.ok(oGetChangesFromMapByNamesStub.calledOnce, "the getChangesFromMapByNames is called once");
				assert.deepEqual(oGetChangesFromMapByNamesStub.args[0][0], ["1", "2"], "and with the correct names");
			});
		});

		QUnit.test("checkForOpenDependenciesForControl", function(assert) {
			var oModifier = {
				getControlIdBySelector: function(oSelector) {
					return oSelector.id;
				}
			};
			this.oChangePersistence._mChanges.mDependencies = {
					"fileNameChange1": {
						"changeObject": {getDependentSelectorList: function() {return ["id"];}}
					},
					"fileNameChange2": {
						"changeObject": {getDependentSelectorList: function() {return ["id2"];}}
					}
				};

			assert.ok(this.oChangePersistence.checkForOpenDependenciesForControl({id: "id"}, oModifier), "the unresolved dependency was found");
			assert.notOk(this.oChangePersistence.checkForOpenDependenciesForControl({id: "anotherId"}, oModifier), "there is no unresolved dependency, so false is returned");
		});
	});

	QUnit.module("sap.ui.fl.ChangePersistence addChange", {
		beforeEach: function () {
			this._mComponentProperties = {
				name : "saveChangeScenario",
				appVersion : "1.2.3"
			};
			sandbox.stub(Utils, "isApplication").returns(false);
			return Component.create({
				name: "sap/ui/fl/qunit/integration/testComponentComplex"
			}).then(function(oComponent) {
				this._oAppComponentInstance = oComponent;
				this._oComponentInstance = Component.get(oComponent.createId("sap.ui.fl.qunit.integration.testComponentReuse"));
				this.oChangePersistence = new ChangePersistence(this._mComponentProperties);
			}.bind(this));
		},
		afterEach: function () {
			sandbox.restore();

		}
	}, function() {
		QUnit.test("When call addChange 3 times, 4 new changes are returned and the dependencies map also got updated", function (assert) {
			var oChangeContent1, oChangeContent2, oChangeContent3, aChanges;

			oChangeContent1 = {
				fileName: "Gizorillus1",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			oChangeContent2 = {
				fileName: "Gizorillus2",
				layer: "VENDOR",
				fileType: "change",
				changeType: "removeField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			oChangeContent3 = {
				fileName: "Gizorillus3",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			var fnAddDirtyChangeSpy = sandbox.spy(this.oChangePersistence, "addDirtyChange");
			var fnAddRunTimeCreatedChangeAndUpdateDependenciesSpy = sandbox.spy(this.oChangePersistence, "_addRunTimeCreatedChangeAndUpdateDependencies");

			//Call CUT
			var newChange1 = this.oChangePersistence.addChange(oChangeContent1, this._oComponentInstance);
			var newChange2 = this.oChangePersistence.addChange(oChangeContent2, this._oComponentInstance);
			var newChange3 = this.oChangePersistence.addChange(oChangeContent3, this._oComponentInstance);

			assert.deepEqual(fnAddDirtyChangeSpy.getCall(0).args[0], oChangeContent1, "then addDirtyChange called with the change content 1");
			assert.deepEqual(fnAddDirtyChangeSpy.getCall(1).args[0], oChangeContent2, "then addDirtyChange called with the change content 2");
			assert.deepEqual(fnAddDirtyChangeSpy.getCall(2).args[0], oChangeContent3, "then addDirtyChange called with the change content 3");
			assert.equal(fnAddRunTimeCreatedChangeAndUpdateDependenciesSpy.callCount, 3, "_addRunTimeCreatedChangeAndUpdateDependencies is called three times");
			aChanges = this.oChangePersistence._aDirtyChanges;
			assert.ok(aChanges);
			assert.strictEqual(aChanges.length, 3);
			assert.strictEqual(aChanges[0].getId(), oChangeContent1.fileName);
			assert.strictEqual(aChanges[0], newChange1);
			assert.strictEqual(aChanges[1].getId(), oChangeContent2.fileName);
			assert.strictEqual(aChanges[1], newChange2);
			assert.strictEqual(aChanges[2].getId(), oChangeContent3.fileName);
			assert.strictEqual(aChanges[2], newChange3);
			//Test dependencies updated
			assert.ok(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus2"]);
			assert.strictEqual(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus2"].changeObject, newChange2);
			assert.ok(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus2"].dependencies);
			assert.strictEqual(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus2"].dependencies.length, 1);
			assert.strictEqual(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus2"].dependencies[0], oChangeContent1.fileName);

			assert.ok(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus3"]);
			assert.strictEqual(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus3"].changeObject, newChange3);
			assert.ok(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus3"].dependencies);
			assert.strictEqual(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus3"].dependencies.length, 2);
			assert.strictEqual(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus3"].dependencies[0], oChangeContent2.fileName);
			assert.strictEqual(this.oChangePersistence._mChangesInitial.mDependencies["Gizorillus3"].dependencies[1], oChangeContent1.fileName);
		});

		QUnit.test("Shall add propagation listener on the app component if an embedded component is passed", function (assert) {
			var oChangeContent = { };
			var done = assert.async();
			sandbox.stub(this.oChangePersistence, "addDirtyChange");
			sandbox.stub(this.oChangePersistence, "_addRunTimeCreatedChangeAndUpdateDependencies");
			sandbox.stub(Utils, "getAppComponentForControl")
				.callThrough()
				.withArgs(this._oComponentInstance)
				.callsFake(done);

			var fnAddPropagationListenerStub = sandbox.spy(this.oChangePersistence, "_addPropagationListener");

			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);
			assert.ok(fnAddPropagationListenerStub.calledOnce, "then _addPropagationListener is called once");
			assert.notOk(fnAddPropagationListenerStub.calledWith(this._oAppComponentInstance), "then _addPropagationListener not called with the embedded component");
		});

		QUnit.test("Shall not add the same change twice", function (assert) {
			// possible scenario: change gets saved, then without reload undo and redo gets called. both would add a dirty change
			var oChangeContent, aChanges;

			oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			var fnAddDirtyChangeSpy = sandbox.spy(this.oChangePersistence, "addDirtyChange");

			var oNewChange = this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);
			var oSecondChange = this.oChangePersistence.addChange(oNewChange, this._oComponentInstance);

			assert.ok(fnAddDirtyChangeSpy.calledWith(oChangeContent), "then addDirtyChange called with the change content");
			assert.ok(fnAddDirtyChangeSpy.callCount, 2, "addDirtyChange was called twice");
			aChanges = this.oChangePersistence._aDirtyChanges;
			assert.ok(aChanges);
			assert.strictEqual(aChanges.length, 1);
			assert.strictEqual(aChanges[0].getId(), oChangeContent.fileName);
			assert.strictEqual(aChanges[0], oNewChange);
			assert.deepEqual(oNewChange, oSecondChange);
		});

		QUnit.test("also adds the flexibility propagation listener in case the application component does not have one yet", function (assert) {
			var aRegisteredFlexPropagationListeners = this._oComponentInstance.getPropagationListeners().filter(function (fnListener) {
				return fnListener._bIsSapUiFlFlexControllerApplyChangesOnControl;
			});

			// check in case the life cycle of flexibility processing changes (possibly incompatible)
			assert.equal(aRegisteredFlexPropagationListeners.length, 0, "no initial propagation listener is present at startup");

			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			aRegisteredFlexPropagationListeners = this._oComponentInstance.getPropagationListeners().filter(function (fnListener) {
				return fnListener._bIsSapUiFlFlexControllerApplyChangesOnControl;
			});

			assert.equal(aRegisteredFlexPropagationListeners.length, 1, "one propagation listener is added");
		});

		QUnit.test("adds the flexibility propagation listener only once even when adding multiple changes", function (assert) {
			var aRegisteredFlexPropagationListeners = this._oComponentInstance.getPropagationListeners().filter(function (fnListener) {
				return fnListener._bIsSapUiFlFlexControllerApplyChangesOnControl;
			});

			// check in case the life cycle of flexibility processing changes (possibly incompatible)
			assert.equal(aRegisteredFlexPropagationListeners.length, 0, "no propagation listener is present at startup");

			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			aRegisteredFlexPropagationListeners = this._oComponentInstance.getPropagationListeners().filter(function (fnListener) {
				return fnListener._bIsSapUiFlFlexControllerApplyChangesOnControl;
			});

			assert.equal(aRegisteredFlexPropagationListeners.length, 1, "one propagation listener is added");
		});

		QUnit.test("also adds the flexibility propagation listener in case the application component does not have one yet (but other listeners)", function (assert) {
			this._oComponentInstance.addPropagationListener(function () {});

			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			var aRegisteredFlexPropagationListeners = this._oComponentInstance.getPropagationListeners().filter(function (fnListener) {
				return fnListener._bIsSapUiFlFlexControllerApplyChangesOnControl;
			});

			assert.equal(aRegisteredFlexPropagationListeners.length, 1, "one propagation listener is added");
		});

		QUnit.test("also adds the flexibility propagation listener in case the application component does not have one yet (but other listeners)", function (assert) {
			var fnAssertFlPropagationListenerCount = function (nNumber, sAssertionText) {
				var aRegisteredFlexPropagationListeners = this._oComponentInstance.getPropagationListeners().filter(function (fnListener) {
					return fnListener._bIsSapUiFlFlexControllerApplyChangesOnControl;
				});
				assert.equal(aRegisteredFlexPropagationListeners.length, nNumber, sAssertionText);
			}.bind(this);

			var fnGetChangesMap = function () {
				return this.oChangePersistence._mChanges;
			}.bind(this);
			var oFlexControllerFactory = sap.ui.require("sap/ui/fl/FlexControllerFactory");
			var oFlexController = oFlexControllerFactory.create(this._mComponentProperties.name, this._mComponentProperties.appVersion);
			var fnPropagationListener = oFlexController.getBoundApplyChangesOnControl(fnGetChangesMap, this._oComponentInstance);

			this._oComponentInstance.addPropagationListener(fnPropagationListener);

			fnAssertFlPropagationListenerCount(1, "one propagation listener was added");

			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			fnAssertFlPropagationListenerCount(1, "no additional propagation listener was added");
		});
	});

	QUnit.module("sap.ui.fl.ChangePersistence saveChanges", {
		beforeEach: function () {
			this._mComponentProperties = {
				name : "saveChangeScenario",
				appVersion : "1.2.3"
			};
			this._oComponentInstance = sap.ui.component({
				name: "sap/ui/fl/qunit/integration/testComponentComplex"
			});
			this.lrepConnectorMock = {
				create: sinon.stub().returns(Promise.resolve()),
				deleteChange: sinon.stub().returns(Promise.resolve()),
				loadChanges: sinon.stub().returns(Promise.resolve({changes: {changes: []}}))
			};
			this.oChangePersistence = new ChangePersistence(this._mComponentProperties);
			this.oChangePersistence._oConnector = this.lrepConnectorMock;

			this.oServer = sinon.fakeServer.create();
		},
		afterEach: function () {
			this.oServer.restore();
			sandbox.restore();
			Cache._entries = {};
		}
	}, function() {
		QUnit.test("Shall save the dirty changes when adding a new change and return a promise", function (assert) {
			var oChangeContent;

			oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			//Call CUT
			return this.oChangePersistence.saveDirtyChanges().then(function(){
				assert.ok(this.lrepConnectorMock.create.calledOnce);
			}.bind(this));
		});

		QUnit.test("(Save As scenario) Shall save the dirty changes for the created app variant when pressing a 'Save As' button and return a promise", function (assert) {
			var oChangeContent;

			oChangeContent = {
				fileName: "Gizorillus",
				layer: "CUSTOMER",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			this.oServer.respondWith([
				200,
				{
					"Content-Type": "application/json",
					"Content-Length": 13,
					"X-CSRF-Token": "0987654321"
				},
				"{ \"changes\":[], \"contexts\":[], \"settings\":{\"isAtoEnabled\":true} }"
			]);

			this.oServer.autoRespond = true;

			var oAddChangeSpy = sandbox.spy(Cache, "addChange");

			//Call CUT
			return this.oChangePersistence.saveDirtyChanges(true).then(function(){
				assert.ok(this.lrepConnectorMock.create.calledOnce);
				assert.equal(oAddChangeSpy.callCount, 0, "then addChange was never called for the change related to app variants");
			}.bind(this));
		});

		QUnit.test("Shall save the dirty changes when deleting a change and return a promise", function (assert) {
			var oChangeContent, oChange;

			oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};
			oChange = new Change(oChangeContent);

			this.oChangePersistence.deleteChange(oChange);

			//Call CUT
			return this.oChangePersistence.saveDirtyChanges().then(function(){
				assert.ok(this.lrepConnectorMock.deleteChange.calledOnce);
				assert.ok(this.lrepConnectorMock.create.notCalled);
			}.bind(this));
		});

		QUnit.test("Shall save the dirty changes in a bulk", function (assert) {
			assert.expect(3);
			// REVISE There might be more elegant implementation
			var oChangeContent1, oChangeContent2, oCreateStub;

			oCreateStub = this.lrepConnectorMock.create;

			oChangeContent1 = {
				fileName: "Gizorillus1",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			oChangeContent2 = {
				fileName: "Gizorillus2",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};
			this.oChangePersistence.addChange(oChangeContent1, this._oComponentInstance);
			this.oChangePersistence.addChange(oChangeContent2, this._oComponentInstance);

			//Call CUT
			return this.oChangePersistence.saveDirtyChanges().then(function(){
				assert.ok(oCreateStub.calledOnce, "the create method of the connector is called once");
				assert.deepEqual(oCreateStub.getCall(0).args[0][0], oChangeContent1, "the first change was processed first");
				assert.deepEqual(oCreateStub.getCall(0).args[0][1], oChangeContent2, "the second change was processed afterwards");
			});
		});

		QUnit.test("(Save As scenario) Shall save the dirty changes for the new created app variant in a bulk when pressing a 'Save As' button", function (assert) {
			assert.expect(3);
			var oChangeContent1, oChangeContent2, oCreateStub;

			oCreateStub = this.lrepConnectorMock.create;

			oChangeContent1 = {
				fileName: "Gizorillus1",
				layer: "CUSTOMER",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			oChangeContent2 = {
				fileName: "Gizorillus2",
				layer: "CUSTOMER",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};
			this.oChangePersistence.addChange(oChangeContent1, this._oComponentInstance);
			this.oChangePersistence.addChange(oChangeContent2, this._oComponentInstance);

			this.oServer.respondWith([
				200,
				{
					"Content-Type": "application/json",
					"Content-Length": 13,
					"X-CSRF-Token": "0987654321"
				},
				"{ \"changes\":[], \"contexts\":[], \"settings\":{\"isAtoEnabled\":true} }"
			]);

			this.oServer.autoRespond = true;

			//Call CUT
			return this.oChangePersistence.saveDirtyChanges(true).then(function(){
				assert.ok(oCreateStub.calledOnce, "the create method of the connector is called once");
				assert.deepEqual(oCreateStub.getCall(0).args[0][0], oChangeContent1, "the first change was processed first");
				assert.deepEqual(oCreateStub.getCall(0).args[0][1], oChangeContent2, "the second change was processed afterwards");
			});
		});

		QUnit.test("after a change creation has been saved, the change shall be added to the cache", function (assert) {
			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			this.oServer.respondWith([
				200,
				{
					"Content-Type": "application/json",
					"Content-Length": 13,
					"X-CSRF-Token": "0987654321"
				},
				"{ \"changes\":[], \"contexts\":[], \"settings\":{\"isAtoEnabled\":true} }"
			]);

			this.oServer.autoRespond = true;

			//Call CUT
			return this.oChangePersistence.getChangesForComponent().then(function() {
				return this.oChangePersistence.saveDirtyChanges();
			}.bind(this))
				.then(this.oChangePersistence.getChangesForComponent.bind(this.oChangePersistence))
				.then(function(aChanges) {
					assert.ok(aChanges.some(function(oChange) {
						return oChange.getId() === "Gizorillus";
					}), "Newly added change shall be added to Cache");
			});
		});

		QUnit.test("Shall not add a variant related change to the cache", function (assert) {
			sandbox.stub(Cache, "setVariantManagementSection");
			var oChangeContent;

			oChangeContent = {
				"content" : {
					"title": "variant 0"
				},
				"fileName": "variant0",
				"fileType": "ctrl_variant",
				"variantManagementReference": "variantManagementId"
			};
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			oChangeContent = {
				"variantReference":"variant0",
				"fileName":"controlChange0",
				"fileType":"change",
				"content":{},
				"selector":{
					"id":"selectorId"
				}
			};
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			oChangeContent = {
				"fileType": "ctrl_variant_change",
				"selector": {
					"id" : "variant0"
				}
			};
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			oChangeContent = {
				"fileName": "setDefault",
				"fileType": "ctrl_variant_management_change",
				"content": {
					"defaultVariant":"variant0"
				},
				"selector": {
					"id": "variantManagementId"
				}
			};
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			var oAddChangeSpy = sandbox.spy(Cache, "addChange");
			return this.oChangePersistence.saveDirtyChanges().then(function(){
				assert.ok(Cache.setVariantManagementSection.calledWith(this.oChangePersistence._mComponent, this.oChangePersistence._oVariantController.getChangeFileContent()), "then variant controller content was synced with the Cache");
				assert.equal(oAddChangeSpy.callCount, 1, "then addChange was only called for the change not related to variants");
			}.bind(this));
		});

		QUnit.test("(Save As scenario) after a change creation has been saved for the new app variant, the change shall not be added to the cache", function (assert) {
			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			//Call CUT
			return this.oChangePersistence.getChangesForComponent().then(function() {
				return this.oChangePersistence.saveDirtyChanges(true);
			}.bind(this))
				.then(this.oChangePersistence.getChangesForComponent.bind(this.oChangePersistence))
				.then(function(aChanges) {
					assert.equal(aChanges.length, 0, "Newly added change shall not be added to Cache");
			});
		});

		QUnit.test("shall remove the change from the dirty changes, after is has been saved", function (assert) {
			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.lrepConnectorMock.loadChanges = sinon.stub().returns(Promise.resolve({changes: {changes: []}}));

			//Call CUT
			return this.oChangePersistence.getChangesForComponent().then(function() {
				this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);
				return this.oChangePersistence.saveDirtyChanges();
			}.bind(this)).then(function() {
				var aDirtyChanges = this.oChangePersistence.getDirtyChanges();
				assert.strictEqual(aDirtyChanges.length, 0);
			}.bind(this));
		});

		QUnit.test("(Save As scenario) shall remove the change from the dirty changes, after it has been saved for the new app variant", function (assert) {
			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.lrepConnectorMock.loadChanges = sinon.stub().returns(Promise.resolve({changes: {changes: []}}));

			this.oServer.respondWith([
				200,
				{
					"Content-Type": "application/json",
					"Content-Length": 13,
					"X-CSRF-Token": "0987654321"
				},
				"{ \"changes\":[], \"contexts\":[], \"settings\":{\"isAtoEnabled\":true} }"
			]);

			this.oServer.autoRespond = true;

			//Call CUT
			return this.oChangePersistence.getChangesForComponent().then(function() {
				this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);
				return this.oChangePersistence.saveDirtyChanges(true);
			}.bind(this)).then(function() {
				var aDirtyChanges = this.oChangePersistence.getDirtyChanges();
				assert.strictEqual(aDirtyChanges.length, 0);
			}.bind(this));
		});

		QUnit.test("shall delete the change from the cache, after a change deletion has been saved", function (assert) {
			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.lrepConnectorMock.loadChanges = sinon.stub().returns(Promise.resolve({changes: {changes: [oChangeContent]}}));

			//Call CUT
			return this.oChangePersistence.getChangesForComponent()
				.then(function(aChanges){
					this.oChangePersistence.deleteChange(aChanges[0]);
					return this.oChangePersistence.saveDirtyChanges();
				}.bind(this))
				.then(this.oChangePersistence.getChangesForComponent.bind(this.oChangePersistence))
				.then(function(aChanges) {
					assert.strictEqual(aChanges.length, 0, "Change shall be deleted from the cache");
				});
		});

		QUnit.test("shall delete a change from the dirty changes, if it has just been added to the dirty changes, having a pending action of NEW", function (assert) {

			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			var oChange = this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);

			//Call CUT
			this.oChangePersistence.deleteChange(oChange);

			var aDirtyChanges = this.oChangePersistence.getDirtyChanges();
			assert.strictEqual(aDirtyChanges.length, 0);
		});

		QUnit.test("shall not change the state of a dirty change in case of a connector error", function (assert) {
			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			var oRaisedError = {messages: [{severity : "Error", text : "Error"}]};
			this.lrepConnectorMock.loadChanges = sinon.stub().returns(Promise.resolve({changes: {changes: [oChangeContent]}}));
			this.lrepConnectorMock.create = sinon.stub().returns(Promise.reject(oRaisedError));
			this._updateCacheAndDirtyStateSpy = sandbox.spy(this.oChangePersistence, "_updateCacheAndDirtyState");

			//Call CUT
			this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);
			return this.oChangePersistence.saveDirtyChanges()
				['catch'](function(oError) {
					assert.equal(oError, oRaisedError, "the error object is correct");
					return this.oChangePersistence.getChangesForComponent();
				}.bind(this))
				.then(function(aChanges) {
					assert.equal(aChanges.length, 1, "Change is not deleted from the cache");
					var aDirtyChanges = this.oChangePersistence.getDirtyChanges();
					assert.equal(aDirtyChanges.length, 1, "Change is still a dirty change");
					assert.equal(this._updateCacheAndDirtyStateSpy.callCount, 0, "no update of cache and dirty state took place");
				}.bind(this));
		});

		QUnit.test("shall keep a change in the dirty changes, if it has a pending action of DELETE", function (assert) {

			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			var oChange = this.oChangePersistence.addChange(oChangeContent, this._oComponentInstance);
			oChange.markForDeletion();

			//Call CUT
			this.oChangePersistence.deleteChange(oChange);

			var aDirtyChanges = this.oChangePersistence.getDirtyChanges();
			assert.strictEqual(aDirtyChanges.length, 1);
		});

		QUnit.test("shall delete a change from the dirty changes after the deletion has been saved", function (assert) {
			var oChangeContent = {
				fileName: "Gizorillus",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			this.lrepConnectorMock.loadChanges = sinon.stub().returns(Promise.resolve({changes: {changes: [oChangeContent]}}));

			return this.oChangePersistence.getChangesForComponent().then(function(aChanges) {
				//Call CUT
				this.oChangePersistence.deleteChange(aChanges[0]);
				return this.oChangePersistence.saveDirtyChanges();
			}.bind(this)).then(function() {
				var aDirtyChanges = this.oChangePersistence.getDirtyChanges();
				assert.strictEqual(aDirtyChanges.length, 0);
			}.bind(this));
		});

		QUnit.test("saveSequenceOfDirtyChanges shall save a sequence of the dirty changes in a bulk", function (assert) {
			assert.expect(3);
			// REVISE There might be more elegant implementation
			var oChangeContent1, oChangeContent2, oChangeContent3, oCreateStub;

			oCreateStub = this.lrepConnectorMock.create;

			oChangeContent1 = {
				fileName: "Gizorillus1",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			oChangeContent2 = {
				fileName: "Gizorillus2",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};

			oChangeContent3 = {
				fileName: "Gizorillus3",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: { "id": "control1" },
				content: { },
				originalLanguage: "DE"
			};
			this.oChangePersistence.addChange(oChangeContent1, this._oComponentInstance);
			this.oChangePersistence.addChange(oChangeContent2, this._oComponentInstance);
			this.oChangePersistence.addChange(oChangeContent3, this._oComponentInstance);

			var aDirtyChanges = [this.oChangePersistence._aDirtyChanges[0], this.oChangePersistence._aDirtyChanges[2]];

			//Call CUT
			return this.oChangePersistence.saveSequenceOfDirtyChanges(aDirtyChanges).then(function(){
				assert.ok(oCreateStub.calledTwice, "the create method of the connector is called for each selected change");
				assert.deepEqual(oCreateStub.getCall(0).args[0], oChangeContent1, "the first change was processed first");
				assert.deepEqual(oCreateStub.getCall(1).args[0], oChangeContent3, "the second change was processed afterwards");
			});
		});

		QUnit.test("addChangeForVariant should add a new change object into variants changes mapp with pending action is NEW", function(assert) {
			var mParameters = {
				id: "changeId",
				type: "filterBar",
				ODataService: "LineItems",
				texts: {variantName: "myVariantName"},
				content: {
					filterBarVariant: {},
					filterbar: [
						{
							group: "CUSTOM_GROUP",
							name: "MyOwnFilterField",
							partOfVariant: true,
							visibleInFilterBar: true
						}
					]
				},
				isVariant: true,
				packageName: "",
				isUserDependend: true
			};
			var sId = this.oChangePersistence.addChangeForVariant("persistencyKey", "SmartFilterbar", mParameters);
			assert.equal(sId, "changeId");
			assert.deepEqual(Object.keys(this.oChangePersistence._mVariantsChanges["SmartFilterbar"]), ["changeId"]);
			assert.equal(this.oChangePersistence._mVariantsChanges["SmartFilterbar"]["changeId"].getPendingAction(), "NEW");
		});

		QUnit.test("saveAllChangesForVariant should use the lrep connector to create the change in the backend if pending action is NEW or delete the change if pending action is DELETE", function(assert) {
			var mParameters = {
				id: "changeId",
				type: "filterBar",
				ODataService: "LineItems",
				texts: {variantName: "myVariantName"},
				content: {
					filterBarVariant: {},
					filterbar: [
						{
							group: "CUSTOM_GROUP",
							name: "MyOwnFilterField",
							partOfVariant: true,
							visibleInFilterBar: true
						}
					]
				},
				isVariant: true,
				packageName: "",
				isUserDependend: true
			};
			var sId = this.oChangePersistence.addChangeForVariant("persistencyKey", "SmartFilterbar", mParameters);
			assert.ok(sId);
			var oChange = this.oChangePersistence._mVariantsChanges["SmartFilterbar"]["changeId"];
			assert.equal(oChange.getPendingAction(), "NEW");
			var oCreateResponse = {response : oChange._oDefinition};
			var oDeleteResponse = {};
			this.lrepConnectorMock.create = sinon.stub().returns(Promise.resolve(oCreateResponse));
			this.lrepConnectorMock.deleteChange = sinon.stub().returns(Promise.resolve(oDeleteResponse));

			return this.oChangePersistence.saveAllChangesForVariant("SmartFilterbar").then(function (aResults) {
				assert.ok(jQuery.isArray(aResults));
				assert.equal(aResults.length, 1);
				assert.strictEqual(aResults[0], oCreateResponse);
				oChange.markForDeletion();
				return this.oChangePersistence.saveAllChangesForVariant("SmartFilterbar").then(function (aResults) {
					assert.ok(jQuery.isArray(aResults));
					assert.equal(aResults.length, 1);
					assert.strictEqual(aResults[0], oDeleteResponse);
					var bIsVariant = true;
					sinon.assert.calledWith(this.lrepConnectorMock.deleteChange, {
						sChangeName: "changeId",
						sChangelist: "",
						sLayer: "CUSTOMER",
						sNamespace: "apps/saveChangeScenario/changes/"
					}, bIsVariant);
					assert.deepEqual(this.oChangePersistence._mVariantsChanges["SmartFilterbar"], {});
				}.bind(this));
			}.bind(this));
		});

		QUnit.test("saveAllChangesForVariant shall reject if the backend raises an error", function(assert) {
			var mParameters = {
				id: "changeId",
				type: "filterBar",
				ODataService: "LineItems",
				texts: {variantName: "myVariantName"},
				content: {
					filterBarVariant: {},
					filterbar: [
						{
							group: "CUSTOM_GROUP",
							name: "MyOwnFilterField",
							partOfVariant: true,
							visibleInFilterBar: true
						}
					]
				},
				isVariant: true,
				packageName: "",
				isUserDependend: true
			};
			var sId = this.oChangePersistence.addChangeForVariant("persistencyKey", "SmartFilterbar", mParameters);
			assert.ok(sId);
			assert.equal(this.oChangePersistence._mVariantsChanges["SmartFilterbar"]["changeId"].getPendingAction(), "NEW");
			this.lrepConnectorMock.create = sinon.stub().returns(Promise.resolve(Promise.reject({
				messages: [
					{text: "Backend says: Boom"}
				]
			})));

			return this.oChangePersistence.saveAllChangesForVariant("SmartFilterbar")['catch'](function(err) {
				assert.equal(err.messages[0].text, "Backend says: Boom");
			});
		});
	});

	QUnit.module("Given map dependencies need to be updated", {
		beforeEach: function () {
			this._mComponentProperties = {
				name: "MyComponent",
				appVersion: "1.2.3"
			};
			this.oChangePersistence = new ChangePersistence(this._mComponentProperties);
			Utils.setMaxLayerParameter("USER");
			var mDependencies = {}, mDependentChangesOnMe = {};

			var oChangeContent1 = {
				fileName: "Gizorillus1",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: {"id": "control1"},
				content: {},
				originalLanguage: "DE"
			};

			var oChangeContent2 = {
				fileName: "Gizorillus2",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: {"id": "control1"},
				content: {},
				originalLanguage: "DE"
			};

			var oChangeContent3 = {
				fileName: "Gizorillus3",
				layer: "VENDOR",
				fileType: "change",
				changeType: "addField",
				selector: {"id": "control1"},
				content: {},
				originalLanguage: "DE"
			};

			this.oChange1 = new Change(oChangeContent1);
			this.oChange2 = new Change(oChangeContent2);
			this.oChange3 = new Change(oChangeContent3);

			mDependencies[this.oChange1.getId()] = {
				"dependencies": [this.oChange2.getId()]
			};
			mDependentChangesOnMe[this.oChange2.getId()] = [this.oChange1.getId(), this.oChange3.getId()];

			this.oChangePersistence._mChanges = {
				"aChanges": [this.oChange1, this.oChange2, this.oChange3],
				"mChanges": {
					"control1": [this.oChange1, this.oChange2]
				 },
				"mDependencies": mDependencies,
				"mDependentChangesOnMe": mDependentChangesOnMe
			};

			this.oChangePersistence._mChangesInitial = fnBaseUtilMerge({}, this.oChangePersistence._mChanges);
		},
		afterEach: function () {
			this.oChange1.destroy();
			this.oChange2.destroy();
			this.oChange3.destroy();
			sandbox.restore();
		}
	}, function() {
		QUnit.test("when '_deleteChangeInMap' is called", function (assert) {
			this.oChangePersistence._deleteChangeInMap(this.oChange1);
			assert.equal(this.oChangePersistence._mChanges.mChanges["control1"].length, 1, "then one change deleted from map");
			assert.strictEqual(this.oChangePersistence._mChanges.mChanges["control1"][0].getId(), this.oChange2.getId(), "then only second change present");
			assert.deepEqual(this.oChangePersistence._mChanges.mDependencies, {}, "then dependencies are cleared for change1");
			assert.equal(this.oChangePersistence._mChanges["mDependentChangesOnMe"][this.oChange2.getId()].length, 1, "then mDependentChangesOnMe for change2 only has one change");
			assert.strictEqual(this.oChangePersistence._mChanges["mDependentChangesOnMe"][this.oChange2.getId()][0], this.oChange3.getId(), "then mDependentChangesOnMe for change2 still has change3");
		});

		QUnit.test("when '_deleteChangeInMap' is called with a change created at runtime", function (assert) {
			this.oChangePersistence._deleteChangeInMap(this.oChange1, true);
			assert.equal(this.oChangePersistence._mChanges.mChanges["control1"].length, 1, "then one change deleted from map");
			assert.strictEqual(this.oChangePersistence._mChanges.mChanges["control1"][0].getId(), this.oChange2.getId(), "then only second change present");
			assert.ok(!jQuery.isEmptyObject(this.oChangePersistence._mChanges.mDependencies), "then dependencies in _mChanges are not cleared for change1");
			assert.ok(jQuery.isEmptyObject(this.oChangePersistence._mChangesInitial.mDependencies), "then dependencies in _mChangesInitial are cleared for change1");
			assert.equal(this.oChangePersistence._mChanges["mDependentChangesOnMe"][this.oChange2.getId()].length, 2, "then _mChanges.mDependentChangesOnMe for change2 is unchanged");
			assert.equal(this.oChangePersistence._mChangesInitial["mDependentChangesOnMe"][this.oChange2.getId()].length, 1, "then _mChangesInitial.mDependentChangesOnMe for change2 has only one change left");
			assert.strictEqual(this.oChangePersistence._mChangesInitial["mDependentChangesOnMe"][this.oChange2.getId()][0], this.oChange3.getId(), "then _mChangesInitial.mDependentChangesOnMe for change2 still has change3");
		});
	});

	QUnit.done(function() {
		jQuery("#qunit-fixture").hide();
		QUnit.dump.maxDepth = iOriginalMaxDepth;
	});
});