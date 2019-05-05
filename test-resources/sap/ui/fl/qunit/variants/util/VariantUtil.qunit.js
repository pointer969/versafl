/* global QUnit */

sap.ui.define([
	"sap/ui/fl/variants/util/VariantUtil",
	"sap/ui/fl/Utils",
	"sap/ui/core/routing/HashChanger",
	"sap/ui/core/routing/History",
	"sap/ui/thirdparty/jquery",
	"sap/ui/base/ManagedObjectObserver",
	"sap/ui/base/ManagedObject",
	"sap/ui/thirdparty/sinon-4"
],
function(
	VariantUtil,
	Utils,
	HashChanger,
	History,
	jQuery,
	ManagedObjectObserver,
	ManagedObject,
	sinon
) {
	"use strict";

	var sandbox = sinon.sandbox.create();
	var sVariantParameterName = "sap-ui-fl-control-variant-id";
	QUnit.module("Given an instance of VariantModel", {
		before: function() {
			this.oAppComponent = new ManagedObject("appComponent");
		},
		beforeEach: function () {
			this._oHashRegister = {
				currentIndex: undefined,
				hashParams : [],
				variantControlIds : []
			};
			this.fnConstructorObserverSpy = sandbox.spy(sap.ui.base, "ManagedObjectObserver");
			this.fnDestroyObserverSpy = sandbox.spy(ManagedObjectObserver.prototype, "observe");
			this.fnDestroyUnobserverSpy = sandbox.spy(ManagedObjectObserver.prototype, "unobserve");
		},
		afterEach: function () {
			sandbox.restore();
		}
	}, function () {
		QUnit.test("when calling 'getCurrentHashParamsFromRegister' with oHashRegister.currentIndex not set to null", function (assert) {
			this._oHashRegister = {
				currentIndex: 0,
				hashParams : [
					["expectedParameter1", "expectedParameter2"],
					["unExpectedParameter"]
				]
			};
			assert.deepEqual(VariantUtil.getCurrentHashParamsFromRegister.call(this), ["expectedParameter1", "expectedParameter2"], "then expected parameters are returned");
		});

		QUnit.test("when calling 'getCurrentHashParamsFromRegister' with oHashRegister.currentIndex set to -1", function (assert) {
			this._oHashRegister = {
				currentIndex: -1,
				hashParams : [
					["expectedParameter1", "expectedParameter2"],
					["unExpectedParameter"]
				]
			};
			assert.deepEqual(VariantUtil.getCurrentHashParamsFromRegister.call(this), undefined);
		});

		QUnit.test("when calling 'getCurrentHashParamsFromRegister' with oHashRegister.currentIndex set to non-numeric value", function (assert) {
			this._oHashRegister = {
				currentIndex: 'zero',
				hashParams : [
					["expectedParameter1", "expectedParameter2"],
					["unExpectedParameter"]
				]
			};
			assert.deepEqual(VariantUtil.getCurrentHashParamsFromRegister.call(this), undefined);
		});

		QUnit.test("when calling 'initializeHashRegister' with oHashRegister.currentIndex set to null", function (assert) {
			sandbox.stub(VariantUtil, "_setOrUnsetCustomNavigationForParameter");
			VariantUtil.initializeHashRegister.call(this);
			var oHashRegister = {
				currentIndex: null,
				hashParams: [],
				variantControlIds: []
			};
			assert.deepEqual(this._oHashRegister, oHashRegister, "then hash register object initialized");
			assert.ok(VariantUtil._setOrUnsetCustomNavigationForParameter.calledOnce, "then VariantUtil._setOrUnsetCustomNavigationForParameter() called once");
			assert.ok(VariantUtil._setOrUnsetCustomNavigationForParameter.calledOn(this), "then VariantUtil._setOrUnsetCustomNavigationForParameter() called once");
		});

		QUnit.test("when calling 'attachHashHandlers' with _oHashRegister.currentIndex set to null", function (assert) {
			assert.expect(7);
			var done = assert.async();
			var iIndex = 0;
			var aHashEvents = [{
				name: "hashReplaced",
				handler: "_handleHashReplaced"
			}, {
				name: "hashChanged",
				handler: "_navigationHandler"
			}];

			this._oHashRegister.currentIndex = null;
			VariantUtil.initializeHashRegister.call(this);
			sandbox.stub(VariantUtil, "_navigationHandler").callsFake(function() {
				assert.ok(true, "then VariantUtil._navigationHandler() was called initially on attaching hash handler functions");
			});

			sandbox.stub(HashChanger, "getInstance").returns({
				attachEvent: function (sEvtName, fnEventHandler) {
					assert.strictEqual(sEvtName, aHashEvents[iIndex].name, "then '" + aHashEvents[iIndex].name + "' attachEvent is called for HashChanger.getInstance()");
					assert.strictEqual(fnEventHandler.toString(), VariantUtil[aHashEvents[iIndex].handler].toString(), "then VariantUtil." + aHashEvents[iIndex].handler + " attached to '" + aHashEvents[iIndex].name + "'  event");
					if (iIndex === 1) {
						done();
					}
					iIndex++;
				}
			});

			VariantUtil.attachHashHandlers.call(this);
			var aCallArgs = this.fnDestroyObserverSpy.getCall(0).args;
			assert.deepEqual(aCallArgs[0], this.oAppComponent, "then ManagedObjectObserver observers the AppComponent");
			assert.strictEqual(aCallArgs[1].destroy, true, "then ManagedObjectObserver observers the destroy() method");
			this.oComponentDestroyObserver.unobserve(this.oAppComponent, {destroy:true}); // remove component observer
		});

		QUnit.test("when Component is destroyed after 'attachHashHandlers' was already called", function (assert) {
			assert.expect(10);
			var iIndex = 0;
			this._oHashRegister.currentIndex = null;
			var aHashEvents = [{
				name: "hashReplaced",
				handler: "_handleHashReplaced"
			}, {
				name: "hashChanged",
				handler: "_navigationHandler"
			}];

			VariantUtil.initializeHashRegister.call(this);
			sandbox.stub(VariantUtil, "_navigationHandler");
			sandbox.stub(HashChanger, "getInstance").returns({
				attachEvent: function () {
				},
				detachEvent: function (sEvtName, fnEventHandler) {
					assert.strictEqual(sEvtName, aHashEvents[iIndex].name, "then '" + aHashEvents[iIndex].name + "' detachEvent is called for HashChanger.getInstance()");
					assert.strictEqual(fnEventHandler.toString(), VariantUtil[aHashEvents[iIndex].handler].toString(), "then VariantUtil." + aHashEvents[iIndex].handler + " detached for '" + aHashEvents[iIndex].name + "' event");
					iIndex++;
				}
			});

			this.destroy = function() {
				assert.ok(true, "then the VariantModel passed as context is destroyed");
			};

			this.oChangePersistence = {
				resetVariantMap: function() {
					assert.ok(true, "then resetMap() of the variant controller was called");
				}
			};
			VariantUtil.attachHashHandlers.call(this);

			sandbox.stub(VariantUtil, "_setOrUnsetCustomNavigationForParameter").callsFake(function(bSet) {
				assert.strictEqual(bSet, false, "then _setOrUnsetCustomNavigationForParameter called with a false value");
			});
			var fnVariantSwitchPromiseStub = sandbox.stub();
			this._oVariantSwitchPromise = new Promise(function (resolve) {
				setTimeout(function () {
					resolve();
				}, 0);
			}).then(fnVariantSwitchPromiseStub);

			this.oAppComponent.destroy();

			return this._oVariantSwitchPromise.then(function() {
				var aCallArgs = this.fnDestroyUnobserverSpy.getCall(0).args;
				assert.deepEqual(aCallArgs[0], this.oAppComponent, "then ManagedObjectObserver unobserve() was called for the AppComponent");
				assert.strictEqual(aCallArgs[1].destroy, true, "then ManagedObjectObserver unobserve() was called for the destroy() method");
				assert.ok(fnVariantSwitchPromiseStub.calledBefore(this.fnDestroyUnobserverSpy), "then first variant switch was resolved and then component's destroy callback was called");
			}.bind(this));
		});

		QUnit.test("when calling 'attachHashHandlers' with _oHashRegister.currentIndex not set to null", function (assert) {
			this._oHashRegister.currentIndex = 0;
			sandbox.stub(VariantUtil, "_navigationHandler");
			VariantUtil.attachHashHandlers.call(this);
			assert.strictEqual(VariantUtil._navigationHandler.callCount, 0, "then VariantUtil._navigationHandler() not called");
		});

		QUnit.test("when calling '_setOrUnsetCustomNavigationForParameter' with ShellNavigation service, to register a navigation filter", function (assert) {
			var fnRegisterNavigationFilter = sandbox.stub();
			sandbox.stub(Utils, "getUshellContainer").returns({
				getService: function() {
					return {
						registerNavigationFilter: fnRegisterNavigationFilter
					};
				}
			});
			VariantUtil._setOrUnsetCustomNavigationForParameter.call(this, true);
			assert.strictEqual(fnRegisterNavigationFilter.getCall(0).args[0].toString(), VariantUtil._navigationFilter.toString(),
				"then the VariantUtil._navigationFilter() is passed to registerNavigationFilter of ShellNavigation service");
		});

		QUnit.test("when calling '_setOrUnsetCustomNavigationForParameter' with ShellNavigation service, to deregister a navigation filter", function (assert) {
			var fnUnRegisterNavigationFilter = sandbox.stub();
			sandbox.stub(Utils, "getUshellContainer").returns({
				getService: function() {
					return {
						unregisterNavigationFilter: fnUnRegisterNavigationFilter
					};
				}
			});
			VariantUtil._setOrUnsetCustomNavigationForParameter.call(this, false);
			assert.strictEqual(fnUnRegisterNavigationFilter.getCall(0).args[0].toString(), VariantUtil._navigationFilter.toString(),
				"then the VariantUtil._navigationFilter() is passed to unregisterNavigationFilter of ShellNavigation service");
		});

		QUnit.test("when calling 'updateHasherEntry' to update the URL with a hash register update", function (assert) {
			var mPropertyBag = {
				component: { id : "TestComponent" },
				parameters: ["testParam1", "testParam2"],
				ignoreRegisterUpdate: false,
				updateURL: true
			};

			this._oHashRegister.currentIndex = 0;

			sandbox.stub(Utils, "setTechnicalURLParameterValues");

			VariantUtil.updateHasherEntry.call(this, mPropertyBag);
			assert.ok(Utils.setTechnicalURLParameterValues.calledWithExactly(mPropertyBag.component, sVariantParameterName, mPropertyBag.parameters),
				"then Utils.setTechnicalURLParameterValues() with the required parameters");
			assert.deepEqual(this._oHashRegister.hashParams[this._oHashRegister.currentIndex], mPropertyBag.parameters, "then hash register for the current index was updated");
		});

		QUnit.test("when calling 'updateHasherEntry' to update the URL without a hash register update", function (assert) {
			var mPropertyBag = {
				component: { id : "TestComponent" },
				parameters: ["testParam1", "testParam2"],
				ignoreRegisterUpdate: true,
				updateURL: true
			};

			this._oHashRegister.currentIndex = 0;

			sandbox.stub(Utils, "setTechnicalURLParameterValues");

			VariantUtil.updateHasherEntry.call(this, mPropertyBag);
			assert.ok(Utils.setTechnicalURLParameterValues.calledWithExactly(mPropertyBag.component, sVariantParameterName, mPropertyBag.parameters),
				"then Utils.setTechnicalURLParameterValues() with the required parameters");
			assert.notOk(this._oHashRegister.hashParams[this._oHashRegister.currentIndex], "then hash register for the current index was not updated");
		});

		QUnit.test("when calling 'updateHasherEntry' without a component", function (assert) {
			var mPropertyBag = {
				parameters: ["testParam1", "testParam2"],
				updateURL: true
			};
			this.oAppComponent = { id : "TestComponent" };

			sandbox.stub(Utils, "setTechnicalURLParameterValues");

			VariantUtil.updateHasherEntry.call(this, mPropertyBag);
			assert.ok(Utils.setTechnicalURLParameterValues.calledWithExactly(this.oAppComponent, sVariantParameterName, mPropertyBag.parameters),
				"then Utils.setTechnicalURLParameterValues() with the required parameters");
		});

		QUnit.test("when calling 'updateHasherEntry' to update hash register without a URL update", function (assert) {
			var mPropertyBag = {
				component: { id : "TestComponent" },
				parameters: ["testParam1", "testParam2"]
			};

			this._oHashRegister.currentIndex = 0;

			sandbox.stub(Utils, "setTechnicalURLParameterValues");

			VariantUtil.updateHasherEntry.call(this, mPropertyBag);
			assert.strictEqual(Utils.setTechnicalURLParameterValues.callCount, 0,
				"then Utils.setTechnicalURLParameterValues() not called");
			assert.deepEqual(this._oHashRegister.hashParams[this._oHashRegister.currentIndex], mPropertyBag.parameters, "then hash register for the current index was updated");
		});

		QUnit.test("when calling '_navigationHandler' with _oHashRegister.currentIndex set to null and 'Unknown' navigation direction", function (assert) {
			var sExistingParameters = "newEntry1::'123'/'456',  newEntry2::'abc'/'xyz'";
			this._oHashRegister.currentIndex = null;
			sandbox.stub(History, "getInstance").returns({
				getDirection: function () {
					return "Unknown";
				}
			});

			this.updateHasherEntry = sandbox.stub();

			var oMockParsedURL = {
				params: { }
			};
			oMockParsedURL.params[sVariantParameterName] = [encodeURIComponent(sExistingParameters)];

			sandbox.stub(Utils, "getParsedURLHash").returns(oMockParsedURL);

			VariantUtil._navigationHandler.call(this);
			assert.strictEqual(this._oHashRegister.currentIndex, 0, "then the oHashRegister.currentIndex is initialized to 0");
			assert.ok(this.updateHasherEntry.calledWithExactly({
				parameters: [sExistingParameters],
				updateURL: false
			}), "then VarintModel.updateHasherEntry() called with the required decoded URI parameters");
		});

		QUnit.test("when calling '_navigationHandler' with parsed URL hash returning undefined", function (assert) {
			this._oHashRegister.currentIndex = null;
			this.updateHasherEntry = sandbox.stub();
			sandbox.stub(Utils, "getParsedURLHash").returns(undefined);

			VariantUtil._navigationHandler.call(this);
			assert.ok(this.updateHasherEntry.called, "then no errors occur");
		});

		QUnit.test("when calling '_navigationHandler' with _oHashRegister.currentIndex > 0 and 'Unknown' navigation direction", function (assert) {
			var sExistingParameters = "newEntry1::'123'/'456',  newEntry2::'abc'/'xyz'";
			this._oHashRegister = {
				currentIndex: 5,
				hashParams: [["Test0"], ["Test1"], ["Test2"]],
				variantControlIds: [["variantManagement0"], ["variantManagement1"], ["variantManagement2"]]
			};
			this.updateHasherEntry = sandbox.stub();
			this.switchToDefaultForVariant = sandbox.stub();
			sandbox.stub(History, "getInstance").returns({
				getDirection: function () {
					return "Unknown";
				}
			});

			var oMockParsedURL = {
				params: { }
			};
			oMockParsedURL.params[sVariantParameterName] = [encodeURIComponent(sExistingParameters)];

			sandbox.stub(Utils, "getParsedURLHash").returns(oMockParsedURL);

			VariantUtil._navigationHandler.call(this);
			assert.deepEqual(this._oHashRegister.hashParams, [], "then _oHashRegister.hashParams is reset");
			assert.deepEqual(this._oHashRegister.variantControlIds, [], "then _oHashRegister.variantControlIds is reset");
			assert.strictEqual(this.switchToDefaultForVariant.getCall(0).args.length, 0, "then  VariantModel.switchToDefaultForVariant() called with no parameters");
			assert.strictEqual(this._oHashRegister.currentIndex, 0, "then the oHashRegister.currentIndex is reset to 0");
			assert.ok(this.updateHasherEntry.calledWithExactly({
				parameters: [sExistingParameters],
				updateURL: false
			}), "then VariantModel.updateHasherEntry() called with new decoded variant URI parameters, no URL update and _oHashRegister update");
		});

		QUnit.test("when calling '_navigationHandler' with _oHashRegister.currentIndex > 0 and 'Backwards' navigation direction", function (assert) {
			this._oHashRegister = {
				currentIndex: 2,
				hashParams: [
					[],
					["backwardParameter"]
				],
				variantControlIds: [["variantManagement0"], ["variantManagement1", "variantManagement2"]]
			};
			this.updateHasherEntry = sandbox.stub();
			sandbox.stub(History, "getInstance").returns({
				getDirection: function () {
					return "Backwards";
				}
			});

			VariantUtil._navigationHandler.call(this);
			assert.strictEqual(this._oHashRegister.currentIndex, 1, "then the oHashRegister.currentIndex is decreased by 1");
			assert.ok(this.updateHasherEntry.calledWithExactly({
				parameters: this._oHashRegister.hashParams[1],
				updateURL: true,
				ignoreRegisterUpdate: true
			}), "then VariantModel.updateHasherEntry() called with variant hash parameters from previous index, URL update and no _oHashRegister update");
		});

		QUnit.test("when calling '_navigationHandler' with _oHashRegister.currentIndex set to 0 and 'Backwards' navigation direction", function (assert) {
			this._oHashRegister = {
				currentIndex: 0
			};
			this.updateHasherEntry = sandbox.stub();
			sandbox.stub(History, "getInstance").returns({
				getDirection: function () {
					return "Backwards";
				}
			});

			VariantUtil._navigationHandler.call(this);
			assert.strictEqual(this._oHashRegister.currentIndex, -1, "then the oHashRegister.currentIndex is decreased by 1");
			assert.ok(this.updateHasherEntry.calledWithExactly({
				parameters: [],
				updateURL: true,
				ignoreRegisterUpdate: true
			}), "then VariantModel.updateHasherEntry() called with empty variant hash parameters, URL update and no _oHashRegister update");
		});

		QUnit.test("when calling '_navigationHandler' with 'Forwards' navigation direction", function (assert) {
			this._oHashRegister = {
				currentIndex: 0,
				hashParams: [
					[],
					["forwardParameter"]
				],
				variantControlIds: [["variantManagement0", "variantManagement1"], ["variantManagement2"]]
			};
			this.updateHasherEntry = sandbox.stub();
			sandbox.stub(History, "getInstance").returns({
				getDirection: function () {
					return "Forwards";
				}
			});

			VariantUtil._navigationHandler.call(this);
			assert.strictEqual(this._oHashRegister.currentIndex, 1, "then the oHashRegister.currentIndex is increased by 1");
			assert.ok(this.updateHasherEntry.calledWithExactly({
				parameters: this._oHashRegister.hashParams[1],
				updateURL: true,
				ignoreRegisterUpdate: true
			}), "then VariantModel.updateHasherEntry() called with variant hash parameters from next index, URL update and no _oHashRegister update");
		});

		QUnit.test("when calling '_navigationHandler' with 'NewEntry' navigation direction, with no existing parameters for the new index", function (assert) {
			var sExistingParameters = "newEntry1::'123'/'456',  newEntry2::'abc'/'xyz'";
			this._oHashRegister = {
				currentIndex: 0,
				hashParams: [],
				variantControlIds: []
			};
			this.updateHasherEntry = sandbox.stub();

			var oMockParsedURL = {
				params: { }
			};
			oMockParsedURL.params[sVariantParameterName] = [encodeURIComponent(sExistingParameters)];

			sandbox.stub(Utils, "getParsedURLHash").returns(oMockParsedURL);

			sandbox.stub(History, "getInstance").returns({
				getDirection: function () {
					return "NewEntry";
				}
			});

			VariantUtil._navigationHandler.call(this);
			assert.strictEqual(this._oHashRegister.currentIndex, 1, "then the oHashRegister.currentIndex is increased by 1");
			assert.ok(this.updateHasherEntry.calledWithExactly({
				parameters: [sExistingParameters],
				updateURL: false
			}), "then VariantModel.updateHasherEntry() called with the decoded variant URI parameters from next index, no URL update and no _oHashRegister update");
		});

		QUnit.test("when calling '_navigationHandler' with 'NewEntry' navigation direction, with existing parameters for the new index", function (assert) {
			var sExistingParameters = "newEntry1::'123'/'456',  newEntry2::'abc'/'xyz'";
			this._oHashRegister = {
				currentIndex: 0,
				hashParams: [
					["existingParameter1"],
					["existingParameter2", "existingParameter3"]
				],
				variantControlIds: [["variantManagement0"], ["variantManagement1", "variantManagement2"]]
			};
			this.switchToDefaultForVariantManagement = sandbox.stub();
			this.updateHasherEntry = sandbox.stub();

			var oMockParsedURL = {
				params: { }
			};
			oMockParsedURL.params[sVariantParameterName] = [encodeURIComponent(sExistingParameters)];

			sandbox.stub(Utils, "getParsedURLHash").returns(oMockParsedURL);

			sandbox.stub(History, "getInstance").returns({
				getDirection: function () {
					return "NewEntry";
				}
			});

			VariantUtil._navigationHandler.call(this);
			assert.strictEqual(this._oHashRegister.currentIndex, 1, "then the oHashRegister.currentIndex is increased by 1");
			assert.ok(this.updateHasherEntry.calledWithExactly({
				parameters: [sExistingParameters],
				updateURL: false
			}), "then VariantModel.updateHasherEntry() called with the decoded variant URI parameters from next index, no URL update and no _oHashRegister update");
			assert.ok(this.switchToDefaultForVariantManagement.getCall(0).calledWithExactly("variantManagement1"), "then VariantModel.switchToDefaultForVariant() called with existing hash parameters for the incremented index");
			assert.ok(this.switchToDefaultForVariantManagement.getCall(1).calledWithExactly("variantManagement2"), "then VariantModel.switchToDefaultForVariant() called with existing hash parameters for the incremented index");
		});

		QUnit.test("when calling '_navigationHandler' by HashChanger 'hashChanged' event, when hash was replaced", function (assert) {
			var oEventReturn = {
				newHash: "newMockHash"
			};
			var oHashChanger = HashChanger.getInstance();
			var oHashRegister = {
				currentIndex: 999,
				hashParams: [
					["existingParameter1"]
				],
				variantControlIds: [["variantManagement0"]]
			};
			this._oHashRegister = jQuery.extend(true, {}, oHashRegister);

			sandbox.spy(VariantUtil, "_navigationHandler");
			oHashChanger.attachEvent("hashChanged", VariantUtil._navigationHandler, this);
			VariantUtil._handleHashReplaced.call(this, {
				getParameter : function() {
					return oEventReturn.newHash;
				}
			});
			assert.strictEqual(this._sReplacedHash, oEventReturn.newHash, "then initially when hash is replaced, _sReplacedHash set to the replaced hash");
			HashChanger.getInstance().fireEvent("hashChanged", oEventReturn);
			assert.strictEqual(this._sReplacedHash, undefined, "then _sReplacedHash doesn't exist, after HashChanger 'hashChanged' event was fired");
			assert.deepEqual(this._oHashRegister, oHashRegister, "then _oHashRegister values remain unchanged");
		});

		QUnit.test("when '_handleHashReplaced' is called from the HashChanger 'hashReplaced' event", function (assert) {
			var oEventReturn = {
				sHash: "newMockHash"
			};
			this._oHashRegister = {
				currentIndex: null,
				hashParams: [],
				variantControlIds: []
			};
			sandbox.stub(VariantUtil, "_navigationHandler");
			VariantUtil.attachHashHandlers.call(this);
			HashChanger.getInstance().fireEvent("hashReplaced", oEventReturn);
			assert.strictEqual(this._sReplacedHash, oEventReturn.sHash, "then hash is replaced, _sReplacedHash set to the replaced hash");
		});

		QUnit.test("when '_adjustForDuplicateParameters' is called with an array of URL parameters containing a duplicate", function (assert) {
			var aExistingParameters = ["existingParameter2", "existingParameter3"];
			var aResultantParameters = aExistingParameters.slice(0);

			this.oData = {
				"sVariantManagementReference": {
					currentVariant: "existingParameter3",
					variants: [
						{key: "existingParameter2"},
						{key: "existingParameter3"}
					]
				}
			};
			var bRestartRequired = VariantUtil._adjustForDuplicateParameters.call(this, aResultantParameters);
			aExistingParameters.splice(0, 1);
			assert.strictEqual(bRestartRequired, true, "then restart required is returned, since the URL parameters are adjusted");
			assert.deepEqual(aResultantParameters, aExistingParameters, "then the duplicate URL parameter is removed");
		});

		QUnit.test("when '_adjustForDuplicateParameters' is called with an array of URL parameters containing no duplicate", function (assert) {
			var aExistingParameters = ["existingParameter2", "existingParameter3"];
			var aResultantParameters = aExistingParameters.slice(0);

			this.oData = {
				"sVariantManagementReference": {
					currentVariant: "existingParameter2",
					variants: [
						{key: "existingParameter2"},
						{key: "existingParameter4"}
					]
				}
			};
			var bRestartRequired = VariantUtil._adjustForDuplicateParameters.call(this, aResultantParameters);

			assert.strictEqual(bRestartRequired, false, "then no restart required is returned, since the URL parameters are not adjusted");
			assert.deepEqual(aResultantParameters, aExistingParameters, "then the URL parameters are unchanged");
		});

		QUnit.test("when '_adjustForDuplicateParameters' is called with an array of only one URL parameter", function (assert) {
			var aExistingParameters = ["existingParameter2"];
			var aResultantParameters = aExistingParameters.slice(0);

			var bRestartRequired = VariantUtil._adjustForDuplicateParameters.call(this, aResultantParameters);

			assert.notOk(bRestartRequired, "then no restart required is returned, since the URL parameters are not adjusted");
			assert.deepEqual(aResultantParameters, aExistingParameters, "then the URL parameters are unchanged");
		});

	});

	QUnit.module("Given an instance of VariantModel and a function is registered as a navigation filter", {
		beforeEach: function (assert) {
			var sCustomStatus = "Custom";
			var sDefaultStatus = "Continue";
			sandbox.stub(Utils, "getUshellContainer").returns({
				getService: function(sName) {
					if (sName === "URLParsing") {
						return {
							parseShellHash: function(oHashParams) {
								return {
									params: oHashParams.params,
									appSpecificRoute: oHashParams.appSpecificRoute,
									misMatchingProperty: oHashParams.misMatchingProperty
								};
							}
						};
					} else if (sName === "ShellNavigation") {
						return {
							NavigationFilterStatus: {
								Continue: sDefaultStatus,
								Custom: sCustomStatus
							},
							hashChanger: {
								fireEvent: function(sEventName, oHashObject) {
									assert.strictEqual(sEventName, "hashChanged", "hashChanged event was fired for ShellNavigation.hashChanger");
									assert.deepEqual(oHashObject, {
										newHash: "newHashAppRoute",
										oldHash: "oldHashAppRoute"
									}, "then the correct payload was passed to the hashChanged event");
								}
							}
						};
					}
				}
			});

			this.oCustomNavigationStatus = {
				status: sCustomStatus
			};
			this.sDefaultStatus = sDefaultStatus;
		},
		afterEach: function () {
			sandbox.restore();
		}
	}, function () {
		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with hashes which cannot be parsed ", function (assert) {
			assert.expect(1);
			Utils.getUshellContainer.returns({
				getService: function(sName) {
					if (sName === "URLParsing") {
						return {
							parseShellHash: function(oHashParams) { } // returns undefined
						};
					}  else if (sName === "ShellNavigation") {
						return {
							NavigationFilterStatus: {
								Continue: this.sDefaultStatus,
								Custom: this.oCustomNavigationStatus.status
							}
						};
					}
				}.bind(this)
			});

			var vStatus = VariantUtil._navigationFilter.call(this, { }, { });
			assert.deepEqual(vStatus, this.sDefaultStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with old hash containing variant parameters only", function (assert) {
			assert.expect(3);

			var oOldHash = {
				params: { },
				appSpecificRoute: "XXoldHashAppRoute"
			};
			oOldHash.params[sVariantParameterName] = ["testParam1"];

			var oNewHash = {
				params: { },
				appSpecificRoute: "XXnewHashAppRoute"
			};
			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.deepEqual(vStatus, this.oCustomNavigationStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with new hash containing variant parameters only", function (assert) {
			assert.expect(3);
			var oOldHash = {
				params: { },
				appSpecificRoute: "XXoldHashAppRoute"
			};
			var oNewHash = {
				params: { },
				appSpecificRoute: "XXnewHashAppRoute"
			};
			oNewHash.params[sVariantParameterName] = ["testParam1"];

			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.deepEqual(vStatus, this.oCustomNavigationStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with both old and new hash containing variant parameters", function (assert) {
			assert.expect(3);
			var oOldHash = {
				params: { },
				appSpecificRoute: "XXoldHashAppRoute"
			};
			oOldHash.params[sVariantParameterName] = ["testParam1"];

			var oNewHash = {
				params: { },
				appSpecificRoute: "XXnewHashAppRoute"
			};
			oNewHash.params[sVariantParameterName] = ["testParam2"];

			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.deepEqual(vStatus, this.oCustomNavigationStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with both old and new hash containing same variant parameters", function (assert) {
			assert.expect(1);
			var oOldHash = {
				params: { },
				appSpecificRoute: "XXoldHashAppRoute"
			};
			oOldHash.params[sVariantParameterName] = ["testParam1"];

			var oNewHash = {
				params: { },
				appSpecificRoute: "XXnewHashAppRoute"
			};
			oNewHash.params[sVariantParameterName] = ["testParam1"];

			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.deepEqual(vStatus, this.sDefaultStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with both old and new hash containing variant parameters containing different parsed properties", function (assert) {
			assert.expect(1);
			var oOldHash = {
				params: { },
				appSpecificRoute: "XXoldHashAppRoute",
				misMatchingProperty: "mismatch1"
			};
			oOldHash.params[sVariantParameterName] = ["testParam1"];

			var oNewHash = {
				params: { },
				appSpecificRoute: "XXnewHashAppRoute",
				misMatchingProperty: "mismatch2"
			};
			oNewHash.params[sVariantParameterName] = ["testParam2"];

			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.deepEqual(vStatus, this.sDefaultStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with both old and new hash not containing variant parameters", function (assert) {
			assert.expect(1);
			var oOldHash = {
				params: { },
				appSpecificRoute: "XXoldHashAppRoute"
			};
			var oNewHash = {
				params: { },
				appSpecificRoute: "XXnewHashAppRoute"
			};
			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.strictEqual(vStatus, this.sDefaultStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with old hash having other parameters and new hash containing only variant parameter", function (assert) {
			assert.expect(1);
			var oOldHash = {
				params: {
					testParamName1: "testParamValue1",
					testParamName2: "testParamValue2"
				},
				appSpecificRoute: "XXoldHashAppRoute"
			};
			var oNewHash = {
				params: { },
				appSpecificRoute: "XXnewHashAppRoute"
			};
			oNewHash.params[sVariantParameterName] = ["testParam1"];

			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.strictEqual(vStatus, this.sDefaultStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with old hash containing only variant parameter and the new hash containing other parameters", function (assert) {
			assert.expect(1);
			var oOldHash = {
				params: { },
				appSpecificRoute: "XXoldHashAppRoute"
			};
			oOldHash.params[sVariantParameterName] = ["testParam1"];

			var oNewHash = {
				params: {
					testParamName1: "testParamValue1",
					testParamName2: "testParamValue2"
				},
				appSpecificRoute: "XXnewHashAppRoute"
			};

			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.strictEqual(vStatus, this.sDefaultStatus, "then the correct status object was returned");
		});

		QUnit.test("when '_navigationFilter' is called from ushell ShellNavigation service, with variant parameters along with other parameters", function (assert) {
			assert.expect(1);
			var oOldHash = {
				params: { },
				appSpecificRoute: "XXoldHashAppRoute"
			};
			oOldHash.params[sVariantParameterName] = ["testParam1"];

			var oNewHash = {
				params: {
					testParamName: "testParamValue"
				},
				appSpecificRoute: "XXnewHashAppRoute"
			};
			oNewHash.params[sVariantParameterName] = ["testParam2"];

			var vStatus = VariantUtil._navigationFilter.call(this, oNewHash, oOldHash);
			assert.strictEqual(vStatus, this.sDefaultStatus, "then the correct status object was returned");
		});
	});

	function fnCreateComponentMockup(mTechnicalParameters) {
		return {
			getComponentData: function(){
				return {
					technicalParameters: mTechnicalParameters
				};
			}
		};
	}

	QUnit.module("get URL technical parameter values for control variant", {
		beforeEach: function () {
			this._oHashRegister = {
				currentIndex: undefined,
				hashParams : [],
				variantControlIds : []
			};
			this.oAppComponent = { };
		},
		afterEach: function () {
			sandbox.restore();
		}
	}, function () {
		QUnit.test("when calling 'getCurrentControlVariantId' with a Component containing a valid URL parameter", function(assert){
			var sVariantTechnicalParameterName = VariantUtil.variantTechnicalParameterName;
			var oComponentMock, mParameters = {};
			mParameters[sVariantTechnicalParameterName] = ["value1,value2"];
			mParameters["second-tech-parameter"] = ["value3"];
			oComponentMock = fnCreateComponentMockup(mParameters);
			assert.deepEqual(VariantUtil.getCurrentControlVariantId(oComponentMock),
				"value1,value2",
				"then the function returns the first value of the control variant technical parameter");
		});

		QUnit.test("when calling 'getCurrentControlVariantId' with technical parameters not existing", function(assert){
			var oComponentMock = fnCreateComponentMockup({});
			assert.strictEqual(VariantUtil.getCurrentControlVariantId(oComponentMock), undefined,
				"then the function returns undefined");
		});

		QUnit.test("when calling 'getCurrentControlVariantId' with an invalid component", function(assert){
			var oComponentMock = {};
			assert.strictEqual(VariantUtil.getCurrentControlVariantId(oComponentMock), undefined,
				"then the function returns undefined");
		});
	});

	QUnit.done(function() {
		jQuery("#qunit-fixture").hide();
	});
});