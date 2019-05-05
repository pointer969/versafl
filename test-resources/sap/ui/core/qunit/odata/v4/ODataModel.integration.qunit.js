/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"jquery.sap.global",
	"sap/base/Log",
	"sap/base/util/uid",
	"sap/m/ColumnListItem",
	"sap/m/CustomListItem",
	"sap/m/Text",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/View",
	"sap/ui/model/ChangeReason",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/ui/model/odata/OperationMode",
	"sap/ui/model/odata/v4/AnnotationHelper",
	"sap/ui/model/odata/v4/ODataListBinding",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/test/TestUtils",
	// load Table resources upfront to avoid loading times > 1 second for the first test using Table
	"sap/ui/table/Table"
], function (jQuery, Log, uid, ColumnListItem, CustomListItem, Text, Controller, View, ChangeReason,
		Filter, FilterOperator, Sorter, OperationMode, AnnotationHelper, ODataListBinding,
		ODataModel, TestUtils) {
	/*global QUnit, sinon */
	/*eslint max-nested-callbacks: 0, no-warning-comments: 0, no-sparse-arrays: 0 */
	"use strict";

	var sClassName = "sap.ui.model.odata.v4.lib._V2MetadataConverter",
		sDefaultLanguage = sap.ui.getCore().getConfiguration().getLanguage(),
		sInvalidModel = "/invalid/model/",
		sSalesOrderService = "/sap/opu/odata4/sap/zui5_testv4/default/sap/zui5_epm_sample/0002/",
		sTeaBusi = "/sap/opu/odata4/IWBEP/TEA/default/IWBEP/TEA_BUSI/0001/",
		rTransientPredicate = /\(\$uid=[-\w]+\)/g;

	/**
	 * Creates a V4 OData model for <code>serviceroot.svc</code>
	 * (com.odata.v4.mathias.BusinessPartnerTest).
	 *
	 * @param {object} [mModelParameters] Map of parameters for model construction to enhance and
	 *   potentially overwrite the parameters groupId, operationMode, serviceUrl,
	 *   synchronizationMode which are set by default
	 * @returns {ODataModel} The model
	 */
	function createBusinessPartnerTestModel(mModelParameters) {
		return createModel("/serviceroot.svc/", mModelParameters);
	}

	/**
	 * Creates a V4 OData model.
	 *
	 * @param {string} sServiceUrl The service URL
	 * @param {object} [mModelParameters] Map of parameters for model construction to enhance and
	 *   potentially overwrite the parameters groupId, operationMode, serviceUrl,
	 *   synchronizationMode which are set by default
	 * @returns {sap.ui.model.odata.v4.ODataModel} The model
	 */
	function createModel(sServiceUrl, mModelParameters) {
		var mDefaultParameters = {
				groupId : "$direct",
				operationMode : OperationMode.Server,
				serviceUrl : sServiceUrl,
				synchronizationMode : "None"
			};

		return new ODataModel(jQuery.extend(mDefaultParameters, mModelParameters));
	}

	/**
	 * Creates a V4 OData model for <code>TEA_BUSI</code>.
	 *
	 * @param {object} [mModelParameters] Map of parameters for model construction to enhance and
	 *   potentially overwrite the parameters groupId, operationMode, serviceUrl,
	 *   synchronizationMode which are set by default
	 * @returns {sap.ui.model.odata.v4.ODataModel} The model
	 */
	function createTeaBusiModel(mModelParameters) {
		return createModel(sTeaBusi, mModelParameters);
	}

	/**
	 * Creates a V4 OData model for <code>zui5_epm_sample</code>.
	 *
	 * @param {object} [mModelParameters] Map of parameters for model construction to enhance and
	 *   potentially overwrite the parameters groupId, operationMode, serviceUrl,
	 *   synchronizationMode which are set by default
	 * @returns {ODataModel} The model
	 */
	function createSalesOrdersModel(mModelParameters) {
		return createModel(sSalesOrderService, mModelParameters);
	}

	/**
	 * Creates a V4 OData model for special cases (not backed by Gateway).
	 *
	 * @param {object} [mModelParameters] Map of parameters for model construction to enhance and
	 *   potentially overwrite the parameters groupId, operationMode, serviceUrl,
	 *   synchronizationMode which are set by default
	 * @returns {ODataModel} The model
	 */
	function createSpecialCasesModel(mModelParameters) {
		return createModel("/special/cases/", mModelParameters);
	}

	/**
	 *  Create a view with a relative ODataListBinding which is ready to create a new entity.
	 *
	 * @param {object} oTest The QUnit test object
	 * @param {object} assert The QUnit assert object
	 * @returns {Promise} A promise that is resolved when the view is created and ready to create
	 *   a relative entity
	 */
	function prepareTestForCreateOnRelativeBinding(oTest, assert) {
		var oModel = createTeaBusiModel({updateGroupId : "update"}),
			sView = '\
<FlexBox id="form" binding="{path : \'/TEAMS(\\\'42\\\')\',\
	parameters : {$expand : {TEAM_2_EMPLOYEES : {$select : \'ID,Name\'}}}}">\
	<Table id="table" items="{TEAM_2_EMPLOYEES}">\
		<columns><Column/><Column/></columns>\
		<ColumnListItem>\
			<Text id="id" text="{ID}" />\
			<Text id="text" text="{Name}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>';

		oTest.expectRequest("TEAMS('42')?$expand=TEAM_2_EMPLOYEES($select=ID,Name)", {
				"TEAM_2_EMPLOYEES" : [
					{"ID" : "2", "Name" : "Frederic Fall"}
				]
			})
			.expectChange("id", ["2"])
			.expectChange("text", ["Frederic Fall"]);

		return oTest.createView(assert, sView, oModel);
	}

	/**
	 * @param {function} [fnCallback]
	 *   A callback function
	 * @param {number} [iDelay=5]
	 *   A delay in milliseconds
	 * @returns {Promise}
	 *   A promise which resolves with the result of the given callback or undefined after the given
	 *   delay
	 */
	function resolveLater(fnCallback, iDelay) {
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve(fnCallback && fnCallback());
			}, iDelay || 5);
		});
	}

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4.ODataModel.integration", {
		beforeEach : function () {
			// We use a formatter to check for property changes. However before the formatter is
			// called, the value is passed through the type's formatValue
			// (see PropertyBinding#_toExternalValue). Ensure that this result is predictable.
			sap.ui.getCore().getConfiguration().setLanguage("en-US");

			// These metadata files are _always_ faked, the query option "realOData" is ignored
			TestUtils.useFakeServer(this._oSandbox, "sap/ui/core/qunit", {
				"/invalid/model/" : {code : 500},
				"/invalid/model/$metadata" : {code : 500},
				"/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/$metadata"
					: {source : "model/GWSAMPLE_BASIC.metadata.xml"},
				"/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/annotations.xml"
					: {source : "model/GWSAMPLE_BASIC.annotations.xml"},
				"/sap/opu/odata4/IWBEP/TEA/default/IWBEP/TEA_BUSI/0001/$metadata"
					: {source : "odata/v4/data/metadata.xml"},
				"/sap/opu/odata4/IWBEP/TEA/default/IWBEP/TEA_BUSI/0001/$metadata?c1=a&c2=b"
					: {source : "odata/v4/data/metadata.xml"},
				"/sap/opu/odata4/IWBEP/TEA/default/iwbep/tea_busi_product/0001/$metadata"
					: {source : "odata/v4/data/metadata_tea_busi_product.xml"},
				"/sap/opu/odata/IWFND/RMTSAMPLEFLIGHT/$metadata"
					: {source : "model/RMTSAMPLEFLIGHT.metadata.xml"},
				"/sap/opu/odata4/sap/zui5_testv4/default/iwbep/common/0001/$metadata"
					: {source : "odata/v4/data/metadata_codelist.xml"},
				"/sap/opu/odata4/sap/zui5_testv4/default/sap/zui5_epm_sample/0002/$metadata"
					: {source : "odata/v4/data/metadata_zui5_epm_sample.xml"},
				"/sap/opu/odata4/sap/zui5_testv4/default/sap/zui5_epm_sample/0002/$metadata?sap-client=123"
					: {source : "odata/v4/data/metadata_zui5_epm_sample.xml"},
				"/serviceroot.svc/$metadata"
					: {source : "odata/v4/data/BusinessPartnerTest.metadata.xml"},
				"/special/cases/$metadata"
					: {source : "odata/v4/data/metadata_special_cases.xml"},
				"/special/cases/$metadata?sap-client=123"
					: {source : "odata/v4/data/metadata_special_cases.xml"},
				"/special/countryoforigin/$metadata"
					: {source : "odata/v4/data/metadata_countryoforigin.xml"}
			});
			this.oLogMock = this.mock(Log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();

			// Counter for batch requests
			this.iBatchNo = 0;
			// maps $batch number to an error response object which replaces all responses for
			// the requests contained in that $batch
			this.mBatch2Error = {};
			// {map<string, string[]>}
			// this.mChanges["id"] is a list of expected changes for the property "text" of the
			// control with ID "id"
			this.mChanges = {};
			// {map<string, true>}
			// If an ID is in this.mIgnoredChanges, change events with null are ignored
			this.mIgnoredChanges = {};
			// {map<string, string[][]>}
			// this.mListChanges["id"][i] is a list of expected changes for the property "text" of
			// the control with ID "id" in row i
			this.mListChanges = {};
			// A list of expected messages
			this.aMessages = [];
			// The number of pending responses checkFinish has to wait for
			this.iPendingResponses = 0;
			// A list of expected requests with the properties method, url, headers, response
			this.aRequests = [];
		},

		afterEach : function (assert) {
			var iLocks;

			if (this.oView) {
				// avoid calls to formatters by UI5 localization changes in later tests
				this.oView.destroy();
			}
			if (this.oModel) {
				if (this.oModel.aLockedGroupLocks) {
					iLocks = this.oModel.aLockedGroupLocks.filter(function (oGroupLock) {
						if (oGroupLock.isLocked()) {
							assert.ok(false, "GroupLock remained: " + oGroupLock);

							return true;
						}
					}).length;
					assert.strictEqual(iLocks, 0, "No remaining locks");
				}
				this.oModel.destroy();
			}
			// reset the language
			sap.ui.getCore().getConfiguration().setLanguage(sDefaultLanguage);
		},

		/**
		 * Adds a Text control with its text property bound to the given property path to the given
		 * form in the view created by {@link #createView}.
		 * Sets a formatter so that {@link #expectChange} can be used to expect change events on the
		 * text property.
		 *
		 * @param {object} oForm The form control
		 * @param {string} sPropertyPath The property path to bind the text property
		 * @param {object} assert The QUnit assert object
		 * @returns {string} The ID of the text control which can be used for {@link #expectChange}
		 */
		addToForm : function (oForm, sPropertyPath, assert) {
			var sId = "id" + sPropertyPath.replace("/", "_"),
				oText = new Text({
					id : this.oView.createId(sId),
					text : "{" + sPropertyPath + "}"
				});

			// attach formatter to check value for dynamically created control
			this.setFormatter(assert, oText, sId);
			oForm.addItem(oText);

			return sId;
		},

		/**
		 * Adds a cell with a text control with its text property bound to the given property path
		 * to the template control of the given table in the view created by {@link #createView}.
		 * Recreates the list binding as only then changes to the aggregation's template control are
		 * applied.
		 * Sets a formatter so that {@link #expectChange} can be used to expect change events on the
		 * text property.
		 *
		 * @param {object} oTable The table control
		 * @param {string} sPropertyPath The property path to bind the text property
		 * @param {object} assert The QUnit assert object
		 * @returns {string} The ID of the text control which can be used for {@link #expectChange}
		 */
		addToTable : function (oTable, sPropertyPath, assert) {
			var sId = "id" + sPropertyPath.replace("/", "_"),
				bRelative = oTable.getBinding("items").isRelative(),
				oTemplate = oTable.getBindingInfo("items").template,
				oText = new Text({
					id : this.oView.createId(sId),
					text : "{" + sPropertyPath + "}"
				});

			// attach formatter to check value for dynamically created control
			this.setFormatter(assert, oText, sId, true);
			oTemplate.addCell(oText);
			// ensure template control is not destroyed on re-creation of the "items" aggregation
			delete oTable.getBindingInfo("items").template;
			// It is not possible to modify the aggregation's template on an existing binding.
			// Hence, we have to re-create.
			oTable.bindItems(jQuery.extend({}, oTable.getBindingInfo("items"),
				{suspended : !bRelative, template : oTemplate}));

			return sId;
		},

		/**
		 * Checks that the given promise is rejected and the passed result is a cancellation error
		 * and nothing else.
		 *
		 * @param {object} assert The QUnit assert object
		 * @param {Promise} oPromise The promise to be checked
		 * @returns {Promise} A promise that resolves after the check is done
		 */
		checkCanceled : function (assert, oPromise) {
			return oPromise.then(function () {
				assert.ok(false, "unexpected success, 'canceled error' expected");
			}, function (oError) {
				assert.strictEqual(oError.canceled, true);
			});
		},

		/**
		 * Checks the messages and finishes the test if no pending changes are left, all
		 * expected requests have been received and the expected number of messages have been
		 * reported.
		 *
		 * @param {object} assert The QUnit assert object
		 */
		checkFinish : function (assert) {
			var sControlId, aExpectedValuesPerRow, i;

			if (this.aRequests.length || this.iPendingResponses) {
				return;
			}
			if (sap.ui.getCore().getMessageManager().getMessageModel().getObject("/").length
					< this.aMessages.length) {
				return; // expected messages still missing
			}
			for (sControlId in this.mChanges) {
				if (!this.hasOnlyOptionalChanges(sControlId)) {
					if (this.mChanges[sControlId].length) {
						return;
					}
					delete this.mChanges[sControlId];
				}
			}
			for (sControlId in this.mListChanges) {
				// Note: This may be a sparse array
				aExpectedValuesPerRow = this.mListChanges[sControlId];
				for (i in aExpectedValuesPerRow) {
					if (aExpectedValuesPerRow[i].length) {
						return;
					}
					delete aExpectedValuesPerRow[i];
				}
				delete this.mListChanges[sControlId];
			}
			if (sap.ui.getCore().getUIDirty()) {
				setTimeout(this.checkFinish.bind(this, assert), 1);

				return;
			}
			if (this.resolve) {
				this.checkMessages(assert);
				this.resolve();
				this.resolve = null;
			}
		},

		/**
		 * Checks that exactly the expected messages have been reported, the order doesn't matter.
		 *
		 * @param {object} assert The QUnit assert object
		 */
		checkMessages : function (assert) {
			var aCurrentMessages = sap.ui.getCore().getMessageManager().getMessageModel()
					.getObject("/").map(function (oMessage) {
						var sTarget = oMessage.getTarget()
								.replace(rTransientPredicate, "($uid=...)");

						return {
							code : oMessage.getCode(),
							descriptionUrl : oMessage.getDescriptionUrl(),
							message : oMessage.getMessage(),
							persistent : oMessage.getPersistent(),
							target : sTarget,
							technical : oMessage.getTechnical(),
							type : oMessage.getType()
						};
					}).sort(compareMessages),
				aExpectedMessages = this.aMessages.slice().sort(compareMessages);

			function compareMessages(oMessage1, oMessage2) {
				return oMessage1.message.localeCompare(oMessage2.message);
			}

			assert.deepEqual(aCurrentMessages, aExpectedMessages,
				this.aMessages.length + " expected messages in message manager");
		},

		/**
		 * Creates a view with a numeric property, "enters" incorrect text to reach an invalid data
		 * state, calls resetChanges at the given object and checks that the control gets another
		 * change event.
		 *
		 * @param {object} assert The QUnit assert object
		 * @param {function} fnGetResetable The function to determine the object to call
		 *   resetChanges at. The function gets the view as parameter.
		 * @returns {Promise} A promise that is resolved when the change event has been fired
		 */
		checkResetInvalidDataState : function (assert, fnGetResetable) {
			var oModel = createTeaBusiModel({updateGroupId : "update"}),
				sView = '\
<FlexBox id="form" binding="{/EMPLOYEES(\'2\')}">\
	<Text id="age" text="{AGE}" />\
</FlexBox>',
				that = this;

			this.expectRequest("EMPLOYEES('2')", {"AGE" : 32})
				.expectChange("age", "32");

			return this.createView(assert, sView, oModel).then(function () {
				var oBinding = that.oView.byId("age").getBinding("text"),
					fnFormatter = oBinding.fnFormatter;

				delete oBinding.fnFormatter;
				assert.throws(function () {
					oBinding.setExternalValue("bad");
				});
				assert.ok(oBinding.getDataState().isControlDirty());

				oBinding.fnFormatter = fnFormatter;

				that.expectChange("age", "32");

				// code under test
				// Note: $direct would be an "Invalid group ID" here
				fnGetResetable(that.oView).resetChanges();

				return that.waitForChanges(assert);
			});
		},

		/**
		 * Checks that the given value is the expected one for the control.
		 *
		 * @param {object} assert The QUnit assert object
		 * @param {string} sValue The value
		 * @param {string} sControlId The control ID
		 * @param {number|string} [vRow] The row index in case the control's binding is below a
		 *   list binding or the path of the row's context (for example in the tests of the
		 *   ODataMetaModel), otherwise <code>undefined</code>.
		 */
		checkValue : function (assert, sValue, sControlId, vRow) {
			var sExpectedValue,
				aExpectedValues = vRow === undefined
					? this.mChanges[sControlId]
					: this.mListChanges[sControlId] && this.mListChanges[sControlId][vRow],
				sVisibleId = vRow === undefined ? sControlId : sControlId + "[" + vRow + "]";

			if (!aExpectedValues || !aExpectedValues.length) {
				if (!(sControlId in this.mIgnoredChanges && sValue === null)) {
					assert.ok(false, sVisibleId + ": " + JSON.stringify(sValue) + " (unexpected)");
				}
			} else {
				sExpectedValue = aExpectedValues.shift();
				// Note: avoid bad performance of assert.strictEqual(), e.g. DOM manipulation
				if (sValue !== sExpectedValue || vRow === undefined || typeof vRow !== "number"
						|| vRow < 10) {
					assert.strictEqual(sValue, sExpectedValue,
						sVisibleId + ": " + JSON.stringify(sValue));
				}
			}
			this.checkFinish(assert);
		},

		/**
		 * Checks the control's value state after waiting some time for the control to set it.
		 *
		 * @param {object} assert The QUnit assert object
		 * @param {string|sap.m.InputBase} vControl The control ID or an instance of InputBase
		 * @param {sap.ui.core.ValueState} sState The expected value state
		 * @param {string} sText The expected text
		 *
		 * @returns {Promise} A promise resolving when the check is done
		 */
		checkValueState : function (assert, vControl, sState, sText) {
			var oControl = typeof vControl === "string" ? this.oView.byId(vControl) : vControl;

			return resolveLater(function () {
				assert.strictEqual(oControl.getValueState(), sState,
					oControl.getId() + ": value state: " + oControl.getValueState());
				assert.strictEqual(oControl.getValueStateText(), sText,
					oControl.getId() + ": value state text: " + oControl.getValueStateText());
			});
		},

		/**
		 * Searches the incoming request in the list of expected requests by comparing the URL.
		 * Removes the found request from the list.
		 *
		 * @param {object} oActualRequest The actual request
		 * @returns {object} The matching expected request or undefined if none was found
		 */
		consumeExpectedRequest : function (oActualRequest) {
			var oExpectedRequest, i;

			if (this.aRequests.length === 1) {
				return this.aRequests.shift(); // consume the one and only candidate to get a diff
			}
			for (i = 0; i < this.aRequests.length; i += 1) {
				oExpectedRequest = this.aRequests[i];
				if (oExpectedRequest.url === oActualRequest.url) {
					this.aRequests.splice(i, 1);
					return oExpectedRequest;
				}
			}
		},

		/**
		 * Creates a V4 OData model for V2 service <code>RMTSAMPLEFLIGHT</code>.
		 *
		 * @param {object} mModelParameters Map of parameters for model construction to enhance and
		 *   potentially overwrite the parameters groupId, operationMode, serviceUrl,
		 *   synchronizationMode which are set by default
		 * @returns {ODataModel} The model
		 */
		createModelForV2FlightService : function (mModelParameters) {
			var oLogMock = this.oLogMock;

			// The following warnings are logged when the RMTSAMPLEFLIGHT metamodel is loaded
			["semantics", "creatable", "creatable", "semantics", "semantics", "value-list",
				"value-list", "label", "label", "value-list", "value-list", "value-list",
				"value-list", "value-list", "value-list", "value-list", "label", "label",
				"supported-formats", "addressable", "value-list"
			].forEach(function (sAnnotation) {
				oLogMock.expects("warning")
					.withExactArgs("Unsupported annotation 'sap:" + sAnnotation + "'",
						sinon.match.string, sClassName);
			});

			mModelParameters = jQuery.extend({}, {odataVersion : "2.0"}, mModelParameters);

			return createModel("/sap/opu/odata/IWFND/RMTSAMPLEFLIGHT/", mModelParameters);
		},

		/**
		 * Creates a V4 OData model for V2 service <code>GWSAMPLE_BASIC</code>.
		 *
		 * @param {object} mModelParameters Map of parameters for model construction to enhance and
		 *   potentially overwrite the parameters groupId, operationMode, serviceUrl,
		 *   synchronizationMode which are set by default
		 * @returns {ODataModel} The model
		 */
		createModelForV2SalesOrderService : function (mModelParameters) {
			var oLogMock = this.oLogMock;

			// The following warnings are logged when the GWSAMPLE_BASIC metamodel is loaded
			["filterable", "sortable"].forEach(function (sAnnotation) {
				oLogMock.expects("warning")
					.withExactArgs("Unsupported SAP annotation at a complex type in"
						+ " '/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/$metadata'",
						"sap:" + sAnnotation + " at property 'GWSAMPLE_BASIC.CT_String/String'",
						sClassName);
			});

			mModelParameters = jQuery.extend({}, {odataVersion : "2.0"}, mModelParameters);

			return createModel("/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/", mModelParameters);
		},

		/**
		 * Helper to create a third sales order in a table. Performs checks on change events,
		 * requests and $count.
		 *
		 * @returns {sap.ui.model.odata.v4.Context} Context of the created sales order
		 */
		createThird : function () {
			this.expectChange("count", "4")
				.expectChange("id", ["", "44", "43", "42"])
				.expectChange("note", ["New 3", "New 2", "New 1", "First SalesOrder"]);

			return this.oView.byId("table").getBinding("items").create({Note : "New 3"}, true);
		},

		/**
		 * Helper to create two sales orders in a table, saved after each create. Performs checks on
		 * change events, requests and $count.
		 *
		 * @param {object} assert The QUnit assert object
		 * @returns {Promise} Promise resolving when the test is through
		 */
		createTwiceSaveInBetween : function (assert) {
			var oBinding,
				oCreatedContext,
				oModel = createSalesOrdersModel({
					autoExpandSelect : true,
					updateGroupId : "update"
				}),
				sView = '\
<Text id="count" text="{$count}"/>\
<Table id="table" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
</Table>',
				that = this;

			this.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=100", {
//					"@odata.count" : "1", // short read no $count parameter needed
					"value" : [{
						"Note" : "First SalesOrder",
						"SalesOrderID" : "42"
					}]
				})
				.expectChange("count")
				.expectChange("id", ["42"])
				.expectChange("note", ["First SalesOrder"]);

			return this.createView(assert, sView, oModel).then(function () {
				oBinding = that.oView.byId("table").getBinding("items");

				that.expectChange("count", "1");

				that.oView.byId("count").setBindingContext(oBinding.getHeaderContext());

				return that.waitForChanges(assert);
			}).then(function () {
				that.expectChange("count", "2")
					.expectChange("id", ["", "42"])
					.expectChange("note", ["New 1", "First SalesOrder"]);

				oCreatedContext = oBinding.create({Note : "New 1"}, true);

				return that.waitForChanges(assert);
			}).then(function () {
				that.expectRequest({
						method : "POST",
						url : "SalesOrderList",
						payload : {"Note" : "New 1"}
					}, {
						"Note" : "New 1",
						"SalesOrderID" : "43"
					})
					.expectChange("id", "43", 0);

				return Promise.all([
					oCreatedContext.created(),
					that.oModel.submitBatch("update"),
					that.waitForChanges(assert)
				]);
			}).then(function () {
				that.expectChange("count", "3")
					.expectChange("id", ["", "43", "42"])
					.expectChange("note", ["New 2", "New 1", "First SalesOrder"]);

				oCreatedContext = oBinding.create({Note : "New 2"}, true);

				return that.waitForChanges(assert);
			}).then(function () {
				that.expectRequest({
						method : "POST",
						url : "SalesOrderList",
						payload : {"Note" : "New 2"}
					}, {
						"Note" : "New 2",
						"SalesOrderID" : "44"
					})
					.expectChange("id", "44", 0);

				return Promise.all([
					oCreatedContext.created(),
					that.oModel.submitBatch("update"),
					that.waitForChanges(assert)
				]);
			});
		},

		/**
		 * Creates the view and attaches it to the model. Checks that the expected requests (see
		 * {@link #expectRequest} are fired and the controls got the expected changes (see
		 * {@link #expectChange}).
		 *
		 * @param {object} assert The QUnit assert object
		 * @param {string} sViewXML The view content as XML
		 * @param {sap.ui.model.odata.v4.ODataModel} [oModel] The model; it is attached to the view
		 *   and to the test instance.
		 *   If no model is given, the <code>TEA_BUSI</code> model is created and used.
		 * @param {object} [oController]
		 *   An object defining the methods and properties of the controller
		 * @returns {Promise} A promise that is resolved when the view is created and all expected
		 *   values for controls have been set
		 */
		createView : function (assert, sViewXML, oModel, oController) {
			var fnLockGroup,
				that = this;

			/*
			 * Stub function for _Requestor#sendBatch. Checks that all requests in the batch are as
			 * expected.
			 *
			 * @param {object[]} aRequests The array of requests in a $batch
			 * @returns {Promise} A promise on the array of batch responses
			 */
			function checkBatch(aRequests) {
				/*
				 * @param {object[]} aRequests The array of requests in a $batch or in a change set
				 * @param {number} [iChangeSetNo] Number of the change set in the current batch, in
				 * 	 case aRequests are the requests of a change set. Note: Change sets are
				 * 	 numbered starting with 1, just as batches.
				 * @returns {Promise} A promise on the array of batch responses
				 */
				function processRequests(aRequests0, iChangeSetNo) {
					return Promise.all(aRequests0.map(function (oRequest, i) {
						return Array.isArray(oRequest)
							? processRequests(oRequest, i + 1)
							: checkRequest(oRequest.method, oRequest.url, oRequest.headers,
								oRequest.body, undefined, iChangeSetNo || i + 1
							).then(function (oResponse) {
								var mHeaders = {};

								if (oResponse.messages) {
									mHeaders["sap-messages"] = oResponse.messages;
								}
								return {
									headers : mHeaders,
									status : 200,
									responseText : JSON.stringify(oResponse.body)
								};
							});
					}));
				}

				that.iBatchNo += 1;

				return processRequests(aRequests).then(function (aResponses) {
					var oErrorResponse = that.mBatch2Error[that.iBatchNo];

					if (oErrorResponse) {
						return [oErrorResponse];
					}
					return aResponses;
				});
			}

			/*
			 * Stub function for _Requestor#sendRequest. Checks that the expected request arrived
			 * and returns a promise for its response.
			 *
			 * @param {string} sMethod The request method
			 * @param {string} sUrl The request URL
			 * @param {object} mHeaders The headers (including various generic headers)
			 * @param {object|string} [vPayload] The payload (string from the requestor, object from
			 *   checkBatch)
			 * @param {string} [sOriginalResourcePath]
			 *  The path by which the resource has originally been requested
			 * @returns {Promise} A promise resolving with an object having following properties:
			 *  - body: The response body of the matching request
			 *  - messages: The messages contained in the "sap-messages" response header
			 *  - resourcePath: The value of "sUrl"
			 *  If the response (see expectRequest) is of type "Error" the promise rejects with the
			 *  error. If the response is of type "Error" and the error has a property
			 *  "errorResponse" then the content of "errorResponse" is stored in "mBatch2Error" for
			 *  the current $batch and the promise resolves with the content of "errorResponse" as
			 *  "body".
			 * @param {string} [sOriginalResourcePath] The path by which the resource has originally
			 *   been requested
			 * @param {number} [iChangeSetNo] Number of the change set in the current batch which
			 *   the request is expected to belong to
			 * @returns {Promise} A promise on an object with the response in the property "body"
			 */
			function checkRequest(sMethod, sUrl, mHeaders, vPayload, sOriginalResourcePath,
					iChangeSetNo) {
				var oActualRequest = {
						method : sMethod,
						url : sUrl,
						headers : mHeaders,
						payload : typeof vPayload === "string" ? JSON.parse(vPayload) : vPayload
					},
					oExpectedRequest = that.consumeExpectedRequest(oActualRequest),
					sIfMatchValue,
					oResponse,
					mResponseHeaders,
					bWaitForResponse = true;

				function checkFinish() {
					if (!that.aRequests.length && !that.iPendingResponses) {
						// give some time to process the response
						setTimeout(that.checkFinish.bind(that, assert), 0);
					}
				}

				delete mHeaders["Accept"];
				delete mHeaders["Accept-Language"];
				delete mHeaders["Content-Type"];
				// if "If-Match" is an object the "@odata.etag" property contains the etag
				if (mHeaders["If-Match"] && typeof mHeaders["If-Match"] === "object") {
					sIfMatchValue = mHeaders["If-Match"]["@odata.etag"];
					if (sIfMatchValue === undefined) {
						delete mHeaders["If-Match"];
					} else {
						mHeaders["If-Match"] = sIfMatchValue;
					}
				}
				if (oExpectedRequest) {
					oResponse = oExpectedRequest.response;
					bWaitForResponse = !(oResponse && typeof oResponse.then === "function");
					mResponseHeaders = oExpectedRequest.responseHeaders;
					delete oExpectedRequest.response;
					delete oExpectedRequest.responseHeaders;
					if (oExpectedRequest.batchNo) {
						oActualRequest.batchNo = that.iBatchNo;
					}
					if (oExpectedRequest.changeSetNo) {
						oActualRequest.changeSetNo = iChangeSetNo;
					}
					assert.deepEqual(oActualRequest, oExpectedRequest, sMethod + " " + sUrl);
				} else {
					assert.ok(false, sMethod + " " + sUrl + " (unexpected)");
					oResponse = {value : []}; // dummy response to avoid further errors
					mResponseHeaders = {};
				}

				if (bWaitForResponse) {
					that.iPendingResponses += 1;
				} else {
					checkFinish();
				}

				return Promise.resolve(oResponse).then(function (oResponseBody) {
					if (oResponseBody instanceof Error) {
						if (oResponseBody.errorResponse) {
							// single error response for a request within a successful $batch
							oResponseBody = oResponseBody.errorResponse;
							that.mBatch2Error[that.iBatchNo] = oResponseBody;
						} else {
							oResponseBody.requestUrl = that.oModel.sServiceUrl + sUrl;
							oResponseBody.resourcePath = sOriginalResourcePath;
							throw oResponseBody;
						}
					}

					return {
						body : oResponseBody,
						messages : mResponseHeaders["sap-messages"],
						resourcePath : sUrl
					};
				}).finally(function () {
					if (bWaitForResponse) {
						that.iPendingResponses -= 1;
					}
					// Waiting may be over after the promise has been handled
					checkFinish();
				});
			}

			// A wrapper for ODataModel#lockGroup that attaches a stack trace to the lock
			function lockGroup() {
				var oError,
					oLock = fnLockGroup.apply(this, arguments);

				if (!oLock.sStack) {
					oError = new Error();
					if (oError.stack) {
						oLock.sStack = oError.stack.split("\n").slice(2).join("\n");
					}
				}

				return oLock;
			}

			this.oModel = oModel || createTeaBusiModel();
			if (this.oModel.submitBatch) {
				// stub request methods for the requestor prototype to also check requests from
				// "hidden" model instances like the code list model
				this.mock(Object.getPrototypeOf(this.oModel.oRequestor)).expects("sendBatch")
					.atLeast(0).callsFake(checkBatch);
				this.mock(Object.getPrototypeOf(this.oModel.oRequestor)).expects("sendRequest")
					.atLeast(0).callsFake(checkRequest);
				fnLockGroup = this.oModel.lockGroup;
				this.oModel.lockGroup = lockGroup;
			} // else: it's a meta model
			//assert.ok(true, sViewXML); // uncomment to see XML in output, in case of parse issues

			return View.create({
				type : "XML",
				controller : oController && new (Controller.extend(uid(), oController))(),
				definition :
					'<mvc:View xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc" xmlns:t="sap.ui.table">'
						+ sViewXML
						+ '</mvc:View>'
			}).then(function (oView) {
				Object.keys(that.mChanges).forEach(function (sControlId) {
					var oControl = oView.byId(sControlId);

					if (oControl) {
						that.setFormatter(assert, oControl, sControlId);
					}
				});
				Object.keys(that.mListChanges).forEach(function (sControlId) {
					var oControl = oView.byId(sControlId);

					if (oControl) {
						that.setFormatter(assert, oControl, sControlId, true);
					}
				});

				oView.setModel(that.oModel);
				// enable parse error messages in the message manager
				sap.ui.getCore().getMessageManager().registerObject(oView, true);
				// Place the view in the page so that it is actually rendered. In some situations,
				// esp. for the table.Table this is essential.
				oView.placeAt("qunit-fixture");
				that.oView = oView;

				return that.waitForChanges(assert);
			});
		},

		/**
		 * The following code (either {@link #createView} or anything before
		 * {@link #waitForChanges}) is expected to set a value (or multiple values) at the property
		 * "text" of the control with the given ID. <code>vValue</code> must be a list with expected
		 * values for each row if the control is created via a template in a list.
		 *
		 * You must call the function before {@link #createView}, even if you do not expect a change
		 * to the control's value initially. This is necessary because createView must attach a
		 * formatter function to the binding info before the bindings are created in order to see
		 * the change. If you do not expect a value initially, leave out the vValue parameter.
		 *
		 * Examples:
		 * this.expectChange("foo", "bar"); // expect value "bar" for the control with ID "foo"
		 * this.expectChange("foo"); // listen to changes for the control with ID "foo", but do not
		 *                           // expect a change (in createView)
		 * this.expectChange("foo", false); // listen to changes for the control with ID "foo", but
		 *                                 // do not expect a change (in createView). To be used if
		 *                                 // the control is a template within a table.
		 * this.expectChange("foo", ["a", "b"]); // expect values for two rows of the control with
		 *                                       // ID "foo"; may be combined with an offset vRow
		 * this.expectChange("foo", ["a",,"b"]); // expect values for the rows 0 and 2 of the
		 *                                       // control with the ID "foo", because this is a
		 *                                       // sparse array in which index 1 is unset
		 * this.expectChange("foo", "c", 2); // expect value "c" for control with ID "foo" in row 2
		 * this.expectChange("foo", "d", "/MyEntitySet/ID");
		 *                                 // expect value "d" for control with ID "foo" in a
		 *                                 // metamodel table on "/MyEntitySet/ID"
		 * this.expectChange("foo", "bar").expectChange("foo", "baz"); // expect 2 changes for "foo"
		 * this.expectChange("foo", null, null); // table.Table sets the binding context on an
		 *                                       // existing row to null when scrolling
		 * this.expectChange("foo", null); // row is deleted in table.Table so that its context is
		 *                                 // destroyed
		 *
		 * @param {string} sControlId The control ID
		 * @param {string|string[]|boolean} [vValue] The expected value, a list of expected values
		 *   or <code>false</code> to enforce listening to a template control.
		 * @param {number|string} [vRow] The row index (for the model) or the path of its parent
		 *   context (for the metamodel), in case that a change is expected for a single row of a
		 *   list (in this case <code>vValue</code> must be a string).
		 * @returns {object} The test instance for chaining
		 */
		expectChange : function (sControlId, vValue, vRow) {
			var aExpectations, i;

			// Ensures that oObject[vProperty] is an array and returns it
			function array(oObject, vProperty) {
				oObject[vProperty] = oObject[vProperty] || [];

				return oObject[vProperty];
			}

			if (arguments.length === 3) {
				aExpectations = array(this.mListChanges, sControlId);
				if (Array.isArray(vValue)) {
					for (i = 0; i < vValue.length; i += 1) {
						if (i in vValue) {
							// This may create a sparse array this.mListChanges[sControlId]
							array(aExpectations, vRow + i).push(vValue[i]);
						}
					}
				} else {
					// This may create a sparse array this.mListChanges[sControlId]
					array(aExpectations, vRow).push(vValue);
				}
			} else if (Array.isArray(vValue)) {
				aExpectations = array(this.mListChanges, sControlId);
				for (i = 0; i < vValue.length; i += 1) {
					if (i in vValue) {
						array(aExpectations, i).push(vValue[i]);
					}
				}
			} else if (vValue === false) {
				array(this.mListChanges, sControlId);
			} else {
				aExpectations = array(this.mChanges, sControlId);
				if (arguments.length > 1) {
					aExpectations.push(vValue);
				}
			}

			return this;
		},

		/**
		 * The following code (either {@link #createView} or anything before
		 * {@link #waitForChanges}) is expected to report exactly the given messages. All expected
		 * messages should have a different message text.
		 *
		 * @param {object[]} aExpectedMessages The expected messages (with properties code, message,
		 *   target, persistent, technical and type corresponding the getters of
		 *   sap.ui.core.message.Message)
		 * @returns {object} The test instance for chaining
		 */
		expectMessages : function (aExpectedMessages) {
			this.aMessages = aExpectedMessages.map(function (oMessage) {
				oMessage.descriptionUrl = oMessage.descriptionUrl || undefined;
				oMessage.technical = oMessage.technical || false;
				return oMessage;
			});

			return this;
		},

		/**
		 * The following code (either {@link #createView} or anything before
		 * {@link #waitForChanges}) is expected to perform the given request.
		 *
		 * @param {string|object} vRequest The request with the properties "method", "url" and
		 *   "headers". A string is interpreted as URL with method "GET". Spaces inside the URL are
		 *   percent encoded automatically.
		 * @param {object|Promise} [oResponse] The response message to be returned from the
		 *   requestor or a promise on it.
		 * @param {object} [mResponseHeaders] The response headers to be returned from the
		 *   requestor.
		 * @returns {object} The test instance for chaining
		 */
		expectRequest : function (vRequest, oResponse, mResponseHeaders) {
			if (typeof vRequest === "string") {
				vRequest = {
					method : "GET",
					url : vRequest
				};
			}
			// ensure that these properties are defined (required for deepEqual)
			vRequest.headers = vRequest.headers || {};
			vRequest.payload = vRequest.payload || undefined;
			vRequest.responseHeaders = mResponseHeaders || {};
			vRequest.response = oResponse;
			vRequest.url = vRequest.url.replace(/ /g, "%20");
			this.aRequests.push(vRequest);

			return this;
		},

		/**
		 * Returns whether expected changes for the control are only optional null values.
		 *
		 * @param {string} sControlId The control ID
		 * @returns {boolean} Whether expected changes for the control are only optional null values
		 */
		hasOnlyOptionalChanges : function (sControlId) {
			return this.bNullOptional &&
				this.mChanges[sControlId].every(function (vValue) {
					return vValue === null;
				});
		},

		/**
		 * Allows that the property "text" of the control with the given ID is set to undefined or
		 * null. This may happen when the property is part of a list, this list is reset and the
		 * request to deliver the new value is slowed down due to a group lock. (Then the row
		 * context might be destroyed in a prerendering task.)
		 *
		 * @param {string} sControlId The control ID
		 * @returns {object} The test instance for chaining
		 */
		ignoreNullChanges : function (sControlId) {
			this.mIgnoredChanges[sControlId] = true;

			return this;
		},

		/**
		 * Removes the control with the given ID from the given form in the view created by
		 * {@link #createView}.
		 *
		 * @param {object} oForm The form control
		 * @param {string} sControlId The ID of the control to remove
		 */
		removeFromForm : function (oForm, sControlId) {
			oForm.removeItem(this.oView.createId(sControlId));
		},

		/**
		 * Removes the control with the given ID from the given form in the view created by
		 * {@link #createView}.
		 * Recreates the list binding as only then changes to the aggregation's template control are
		 * applied.
		 *
		 * @param {object} oTable The table control
		 * @param {string} sControlId The ID of the control to remove
		 */
		removeFromTable : function (oTable, sControlId) {
			var bRelative = oTable.getBinding("items").isRelative(),
				oTemplate = oTable.getBindingInfo("items").template;

			oTemplate.removeCell(this.oView.byId(sControlId));
			// ensure template control is not destroyed on re-creation of the "items" aggregation
			delete oTable.getBindingInfo("items").template;
			oTable.bindItems(jQuery.extend({}, oTable.getBindingInfo("items"),
				{suspended : !bRelative, template : oTemplate}));
		},

		/**
		 * Sets the formatter function which calls {@link #checkValue} for the given control.
		 * Note that you may only use controls that have a 'text' or a 'value' property.
		 *
		 * @param {object} assert The QUnit assert object
		 * @param {sap.ui.base.ManagedObject} oControl The control
		 * @param {string} sControlId The (symbolic) control ID for which changes are expected
		 * @param {boolean} [bInList] Whether the control resides in a list item
		 */
		setFormatter : function (assert, oControl, sControlId, bInList) {
			var oBindingInfo = oControl.getBindingInfo("text") || oControl.getBindingInfo("value"),
				fnOriginalFormatter = oBindingInfo.formatter,
				oType = oBindingInfo.type,
				bIsCompositeType = oType && oType.getMetadata().isA("sap.ui.model.CompositeType"),
				that = this;

			oBindingInfo.formatter = function (sValue) {
				var oContext = bInList && this.getBindingContext();

				if (fnOriginalFormatter) {
					sValue = fnOriginalFormatter.apply(this, arguments);
				} else if (bIsCompositeType) {
					// composite type at binding with type and no original formatter: call the
					// type's formatValue, as CompositeBinding#getExternalValue calls only the
					// formatter if it is set
					sValue = oType.formatValue.call(oType, Array.prototype.slice.call(arguments),
						"string");
				}
				// CompositeType#formatValue is called each time a part changes; we expect null if
				// not all parts are set as it is the case for sap.ui.model.odata.type.Unit.
				// Only check the value once all parts are available.
				if (!bIsCompositeType || sValue !== null) {
					that.checkValue(assert, sValue, sControlId,
						oContext && (oContext.getIndex ? oContext.getIndex() : oContext.getPath()));
				}

				return sValue;
			};
		},

		/**
		 * Waits for the expected requests and changes.
		 *
		 * @param {object} assert The QUnit assert object
		 * @param {boolean} [bNullOptional] Whether a non-list change to a null value is optional
		 * @returns {Promise} A promise that is resolved when all requests have been responded and
		 *   all expected values for controls have been set
		 */
		waitForChanges : function (assert, bNullOptional) {
			var that = this;

			return new Promise(function (resolve) {
				that.resolve = resolve;
				that.bNullOptional = bNullOptional;
				// After three seconds everything should have run through
				// Resolve to have the missing requests and changes reported
				setTimeout(resolve, 3000);
				that.checkFinish(assert);
			}).then(function () {
				var sControlId, aExpectedValuesPerRow, i, j;

				// Report missing requests
				that.aRequests.forEach(function (oRequest) {
					assert.ok(false, oRequest.method + " " + oRequest.url + " (not requested)");
				});
				// Report missing changes
				for (sControlId in that.mChanges) {
					if (that.hasOnlyOptionalChanges(sControlId)) {
						delete that.mChanges[sControlId];
						continue;
					}
					for (i in that.mChanges[sControlId]) {
						assert.ok(false, sControlId + ": " + that.mChanges[sControlId][i]
							+ " (not set)");
					}
				}
				for (sControlId in that.mListChanges) {
					// Note: This may be a sparse array
					aExpectedValuesPerRow = that.mListChanges[sControlId];
					for (i in aExpectedValuesPerRow) {
						for (j in aExpectedValuesPerRow[i]) {
							assert.ok(false, sControlId + "[" + i + "]: "
								+ aExpectedValuesPerRow[i][j] + " (not set)");
						}
					}
				}
				that.checkMessages(assert);
			});
		}
	});

	/**
	 *
	 * Creates a test with the given title and executes viewStart with the given parameters.
	 *
	 * @param {string} sTitle The title of the test case
	 * @param {string} sView The XML snippet of the view
	 * @param {object} mResponseByRequest A map containing the request as key
	 *   and response as value
	 * @param {object|object[]} mValueByControl A map or an array of maps containing control id as
	 *   key and the expected control values as value
	 * @param {string|sap.ui.model.odata.v4.ODataModel} [vModel]
	 *   The model (or the name of a function at <code>this</code> which creates it); it is attached
	 *   to the view and to the test instance.
	 *   If no model is given, the <code>TEA_BUSI</code> model is created and used.
	 * @param {function} [fnAssert]
	 *   A function containing additional assertions such as expected log messages which is called
	 *   just before view creation with the test as "this"
	 */
	function testViewStart(sTitle, sView, mResponseByRequest, mValueByControl, vModel, fnAssert) {

		QUnit.test(sTitle, function (assert) {
			var sControlId, sRequest, that = this;

			function expectChanges(mValueByControl) {
				for (sControlId in mValueByControl) {
					that.expectChange(sControlId, mValueByControl[sControlId]);
				}
			}

			for (sRequest in mResponseByRequest) {
				this.expectRequest(sRequest, mResponseByRequest[sRequest]);
			}
			if (Array.isArray(mValueByControl)) {
				mValueByControl.forEach(expectChanges);
			} else {
				expectChanges(mValueByControl);
			}
			if (typeof vModel === "string") {
				vModel = this[vModel]();
			}
			if (fnAssert) {
				fnAssert.call(this);
			}

			return this.createView(assert, sView, vModel);
		});
	}

	//*********************************************************************************************
	// Scenario: Minimal test for an absolute ODataPropertyBinding. This scenario is comparable with
	// "FavoriteProduct" in the SalesOrders application.
	testViewStart("Absolute ODPB",
		'<Text id="text" text="{/EMPLOYEES(\'2\')/Name}" />',
		{"EMPLOYEES('2')/Name" : {"value" : "Frederic Fall"}},
		{"text" : "Frederic Fall"}
	);

	//*********************************************************************************************
	// Scenario: Minimal test for an absolute ODataContextBinding without own parameters containing
	// a relative ODataPropertyBinding. The SalesOrders application does not have such a scenario.
	testViewStart("Absolute ODCB w/o parameters with relative ODPB", '\
<FlexBox binding="{/EMPLOYEES(\'2\')}">\
	<Text id="text" text="{Name}" />\
</FlexBox>',
		{"EMPLOYEES('2')" : {"Name" : "Frederic Fall"}},
		{"text" : "Frederic Fall"}
	);

	//*********************************************************************************************
	// Scenario: Minimal test for an absolute ODataContextBinding with own parameters containing
	// a relative ODataPropertyBinding. The SalesOrders application does not have such a scenario.
	testViewStart("Absolute ODCB with parameters and relative ODPB", '\
<FlexBox binding="{path : \'/EMPLOYEES(\\\'2\\\')\', parameters : {$select : \'Name\'}}">\
	<Text id="text" text="{Name}" />\
</FlexBox>',
		{"EMPLOYEES('2')?$select=Name" : {"Name" : "Frederic Fall"}},
		{"text" : "Frederic Fall"}
	);

	//*********************************************************************************************
	// Scenario: Minimal test for an absolute ODataListBinding without own parameters containing
	// a relative ODataPropertyBinding. This scenario is comparable with the suggestion list for
	// the "Buyer ID" while creating a new sales order in the SalesOrders application.
	// * Start the application and click on "Create sales order" button.
	// * Open the suggestion list for the "Buyer ID"
	testViewStart("Absolute ODLB w/o parameters and relative ODPB", '\
<Table items="{/EMPLOYEES}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>',
		{"EMPLOYEES?$skip=0&$top=100" :
			{"value" : [{"Name" : "Frederic Fall"}, {"Name" : "Jonathan Smith"}]}},
		{"text" : ["Frederic Fall", "Jonathan Smith"]}
	);

	//*********************************************************************************************
	// Scenario: Minimal test for an absolute ODataListBinding with own parameters containing
	// a relative ODataPropertyBinding. This scenario is comparable with the "Sales Orders" list in
	// the SalesOrders application.
	testViewStart("Absolute ODLB with parameters and relative ODPB", '\
<Table items="{path : \'/EMPLOYEES\', parameters : {$select : \'Name\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>',
		{"EMPLOYEES?$select=Name&$skip=0&$top=100" :
			{"value" : [{"Name" : "Frederic Fall"}, {"Name" : "Jonathan Smith"}]}},
		{"text" : ["Frederic Fall", "Jonathan Smith"]}
	);

	//*********************************************************************************************
	// Scenario: Static and dynamic filters and sorters at absolute ODataListBindings influence
	// the query. This scenario is comparable with the "Sales Orders" list in the SalesOrders
	// application.
	// * Static filters ($filter system query option) are and-combined with dynamic filters (filter
	//   parameter)
	// * Static sorters ($orderby system query option) are appended to dynamic sorters (sorter
	//   parameter)
	testViewStart("Absolute ODLB with Filters and Sorters with relative ODPB", '\
<Table items="{path : \'/EMPLOYEES\', parameters : {\
			$select : \'Name\',\
			$filter : \'TEAM_ID eq 42\',\
			$orderby : \'Name desc\'\
		},\
		filters : {path : \'AGE\', operator : \'GT\', value1 : 21},\
		sorter : {path : \'AGE\'}\
	}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>',
		{"EMPLOYEES?$select=Name&$filter=AGE gt 21 and (TEAM_ID eq 42)&$orderby=AGE,Name desc&$skip=0&$top=100" :
			{"value" : [{"Name" : "Frederic Fall"}, {"Name" : "Jonathan Smith"}]}},
		{"text" : ["Frederic Fall", "Jonathan Smith"]}
	);

	//*********************************************************************************************
	// Scenario: Dependent list binding with own parameters causes a second request.
	// This scenario is similar to the "Sales Order Line Items" in the SalesOrders application.
	testViewStart("Absolute ODCB with parameters and relative ODLB with parameters", '\
<FlexBox binding="{path : \'/EMPLOYEES(\\\'2\\\')\', parameters : {$select : \'Name\'}}">\
	<Text id="name" text="{Name}" />\
	<Table items="{path : \'EMPLOYEE_2_EQUIPMENTS\', parameters : {$select : \'Category\'}}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="category" text="{Category}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
		{
			"EMPLOYEES('2')?$select=Name" : {"Name" : "Frederic Fall"},
			"EMPLOYEES('2')/EMPLOYEE_2_EQUIPMENTS?$select=Category&$skip=0&$top=100" :
				{"value" : [{"Category" : "Electronics"}, {"Category" : "Furniture"}]}
		},
		{"name" : "Frederic Fall", "category" : ["Electronics", "Furniture"]}
	);

	//*********************************************************************************************
	// Scenario: Function import.
	// This scenario is similar to the "Favorite product ID" in the SalesOrders application. In the
	// SalesOrders application the binding context is set programmatically. This example directly
	// triggers the function import.
	testViewStart("FunctionImport", '\
<FlexBox binding="{/GetEmployeeByID(EmployeeID=\'2\')}">\
	<Text id="text" text="{Name}" />\
</FlexBox>',
		{"GetEmployeeByID(EmployeeID='2')" : {"Name" : "Frederic Fall"}},
		{"text" : "Frederic Fall"}
	);

	//*********************************************************************************************
	// Scenario: Failure to read from an ODataListBinding returning a bound message
	QUnit.test("ODLB: read failure & message", function (assert) {
		var oError = new Error("Failure"),
			sView = '\
<Table items="{/EMPLOYEES}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>';

		oError.error = {
			"code" : "CODE",
			"message" : "Could not read",
			"target" : "('42')/Name"
		};
		this.oLogMock.expects("error")
			.withExactArgs("Failed to get contexts for " + sTeaBusi
				+ "EMPLOYEES with start index 0 and length 100", sinon.match(oError.message),
				"sap.ui.model.odata.v4.ODataListBinding");
		this.expectRequest("EMPLOYEES?$skip=0&$top=100", oError)
			.expectMessages([{
				"code" : "CODE",
				"message" : "Could not read",
				"persistent" : true,
				"target" : "/EMPLOYEES('42')/Name",
				"technical" : true,
				"type" : "Error"
			}]);

		return this.createView(assert, sView);
	});

	//*********************************************************************************************
	// Scenario: Failure to read from an ODataContextBinding returning a bound message
	QUnit.test("ODCB: read failure & message", function (assert) {
		var oError = new Error("Failure"),
			sView = '\
<FlexBox binding="{/EMPLOYEES(\'42\')}">\
	<Text id="text" text="{Name}" />\
</FlexBox>';

		oError.error = {
			"code" : "CODE",
			"message" : "Could not read",
			"target" : "Name"
		};
		this.oLogMock.expects("error")
			.withExactArgs("Failed to read path /EMPLOYEES('42')", sinon.match(oError.message),
				"sap.ui.model.odata.v4.ODataContextBinding");
		this.oLogMock.expects("error")
			.withExactArgs("Failed to read path /EMPLOYEES('42')/Name", sinon.match(oError.message),
				"sap.ui.model.odata.v4.ODataPropertyBinding");
		this.expectRequest("EMPLOYEES('42')", oError)
			.expectMessages([{
				"code" : "CODE",
				"message" : "Could not read",
				"persistent" : true,
				"target" : "/EMPLOYEES('42')/Name",
				"technical" : true,
				"type" : "Error"
			}]);

		return this.createView(assert, sView);
	});

	//*********************************************************************************************
	// Scenario: Failure to read from an ODataPropertyBinding returning a bound message
	QUnit.test("ODPB: read failure & message", function (assert) {
		var oError = new Error("Failure"),
			sView = '<Text id="text" text="{/EMPLOYEES(\'42\')/Name}" />';

		oError.error = {
			"code" : "CODE",
			"message" : "Could not read",
			"target" : ""
		};
		this.oLogMock.expects("error")
			.withExactArgs("Failed to read path /EMPLOYEES('42')/Name", sinon.match(oError.message),
				"sap.ui.model.odata.v4.ODataPropertyBinding");
		this.expectRequest("EMPLOYEES('42')/Name", oError)
			.expectMessages([{
				"code" : "CODE",
				"message" : "Could not read",
				"persistent" : true,
				"target" : "/EMPLOYEES('42')/Name",
				"technical" : true,
				"type" : "Error"
			}]);

		return this.createView(assert, sView);
	});

	//*********************************************************************************************
	// Scenario: inherit query options (see ListBinding sample application)
	// If there is a relative binding without an own cache and the parent binding defines $orderby
	// or $filter for that binding, then these values need to be considered if that binding gets
	// dynamic filters or sorters.
	// See ListBinding sample application:
	// * Start the application; the employee list of the team is initially sorted by "City"
	// * Sort by any other column (e.g. "Employee Name" or "Age") and check that the "City" is taken
	//   as a secondary sort criterion
	// In this test dynamic filters are used instead of dynamic sorters
	QUnit.test("Relative ODLB inherits parent OBCB's query options on filter", function (assert) {
		var sView = '\
<FlexBox binding="{path : \'/TEAMS(\\\'42\\\')\',\
	parameters : {$expand : {TEAM_2_EMPLOYEES : {$orderby : \'AGE\', $select : \'Name\'}}}}">\
	<Table id="table" items="{TEAM_2_EMPLOYEES}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="text" text="{Name}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS('42')?$expand=TEAM_2_EMPLOYEES($orderby=AGE;$select=Name)", {
				"TEAM_2_EMPLOYEES" : [
					{"Name" : "Frederic Fall"},
					{"Name" : "Jonathan Smith"},
					{"Name" : "Peter Burke"}
				]
			})
			.expectChange("text", ["Frederic Fall", "Jonathan Smith", "Peter Burke"]);

		return this.createView(assert, sView).then(function () {
			that.expectRequest("TEAMS('42')/TEAM_2_EMPLOYEES?$orderby=AGE&$select=Name"
					+ "&$filter=AGE gt 42&$skip=0&$top=100", {
					"value" : [
						{"Name" : "Frederic Fall"},
						{"Name" : "Peter Burke"}
					]
				})
				.expectChange("text", "Peter Burke", 1);

			// code under test
			that.oView.byId("table").getBinding("items")
				.filter(new Filter("AGE", FilterOperator.GT, 42));

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Refresh single row after it has been updated with a value which doesn't match the table's
	// filter anymore. In this case we expect the single row to disappear.
	QUnit.test("Context#refresh(undefined, true)", function (assert) {
		var sView = '\
<Table id="table"\
		items="{\
			path : \'/EMPLOYEES\',\
			filters : {path : \'AGE\', operator : \'GT\', value1 : \'42\'},\
			sorter : {path : \'AGE\'},\
			parameters : {foo : \'bar\'}\
		}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
		<Input id="age" value="{AGE}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("EMPLOYEES?foo=bar&$orderby=AGE&$filter=AGE gt 42"
				+ "&$select=AGE,ID,Name&$skip=0&$top=100", {
				"value" : [
					{"@odata.etag" : "ETag0", "ID" : "0", "Name" : "Frederic Fall", "AGE" : 70},
					{"ID" : "1", "Name" : "Jonathan Smith", "AGE" : 50},
					{"ID" : "2", "Name" : "Peter Burke", "AGE" : 77}
				]
			})
			.expectChange("text", ["Frederic Fall", "Jonathan Smith", "Peter Burke"])
			.expectChange("age", ["70", "50", "77"]);

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}))
			.then(function () {
				that.expectRequest({
						method : "PATCH",
						url : "EMPLOYEES('0')?foo=bar",
						headers : {"If-Match" : "ETag0"},
						payload : {"AGE" : 10}
					}, {
						"AGE" : 10
					})
					.expectChange("age", "10", 0); // caused by setValue

				that.oView.byId("table").getItems()[0].getCells()[1].getBinding("value")
					.setValue(10);

				return that.waitForChanges(assert);
			}).then(function () {
				var oContext = that.oView.byId("table").getItems()[0].getBindingContext();

				that.expectRequest("EMPLOYEES?foo=bar"
						+ "&$filter=(AGE gt 42) and ID eq '0'"
						+ "&$select=AGE,ID,Name", {"value" : []})
					.expectChange("text", ["Jonathan Smith", "Peter Burke"])
					.expectChange("age", ["50", "77"]);

				// code under test
				oContext.refresh(undefined, true);

				return that.waitForChanges(assert);
			}).then(function () {
				var oContext = that.oView.byId("table").getItems()[0].getBindingContext();

				that.expectRequest("EMPLOYEES?foo=bar"
						+ "&$filter=(AGE gt 42) and ID eq '1'"
						+ "&$select=AGE,ID,Name", {
						"value" : [{
							"ID" : "1",
							"Name" : "Jonathan Smith",
							"AGE" : 51
						}]
					})
					.expectChange("age", "51", 0);

				// code under test
				oContext.refresh(undefined, true);

				return that.waitForChanges(assert);
			});
	});

	//*********************************************************************************************
	// Refresh a single row with a bound message and check that the message is not duplicated.
	// Refreshing a single line in a collection must not remove messages for other lines.
	QUnit.test("Context#refresh() with messages", function (assert) {
		var sView = '\
<Table id="table"\
		items="{\
			path : \'/EMPLOYEES\',\
			parameters : {$select : \'__CT__FAKE__Message/__FAKE__Messages\'}\
		}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text text="{ID}" />\
	</ColumnListItem>\
</Table>',
			oMessage1 = {
				"code" : "2",
				"message" : "Another Text",
				"persistent" : false,
				"target" : "/EMPLOYEES('1')/ID",
				"type" : "Warning"
			},
			oResponseMessage0 = {
				"code" : "1",
				"message" : "Text",
				"numericSeverity" : 3,
				"target" : "ID",
				"transition" : false
			},
			oResponseMessage0AfterRefresh = {
				"code" : "1",
				"message" : "Text after refresh",
				"numericSeverity" : 3,
				"target" : "ID",
				"transition" : false
			},
			oResponseMessage1 = {
				"code" : "2",
				"message" : "Another Text",
				"numericSeverity" : 3,
				"target" : "ID",
				"transition" : false
			},
			that = this;

		this.expectRequest("EMPLOYEES?$select=ID,__CT__FAKE__Message/__FAKE__Messages"
					+ "&$skip=0&$top=100", {
				"value" : [{
					"ID" : "0",
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [oResponseMessage0]
					}
				}, {
					"ID" : "1",
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [oResponseMessage1]
					}
				}]
			})
			.expectMessages([{
				"code" : "1",
				"message" : "Text",
				"persistent" : false,
				"target" : "/EMPLOYEES('0')/ID",
				"type" : "Warning"
			}, oMessage1]);

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}))
			.then(function () {
				var oContext = that.oView.byId("table").getItems()[0].getBindingContext();

				that.expectRequest("EMPLOYEES('0')"
							+ "?$select=ID,__CT__FAKE__Message/__FAKE__Messages", {
						"ID" : "0",
						"__CT__FAKE__Message" : {
							"__FAKE__Messages" : [oResponseMessage0AfterRefresh]
						}
					})
				.expectMessages([{
					"code" : "1",
					"message" : "Text after refresh",
					"persistent" : false,
					"target" : "/EMPLOYEES('0')/ID",
					"type" : "Warning"
				}, oMessage1]);

				// code under test
				oContext.refresh();

				return that.waitForChanges(assert);
			});
	});

	//*********************************************************************************************
	// Refresh a single row that has been removed in between. Check the bound message of the error
	// response.
	QUnit.test("Context#refresh() error messages", function (assert) {
		var oError = new Error("404 Not Found"),
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{/EMPLOYEES}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Input value="{ID}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		oError.error = {
			code : "CODE",
			message : "Not found",
			target : "ID"
		};
		this.expectRequest("EMPLOYEES?$select=ID&$skip=0&$top=100", {
				"value" : [{"ID" : "0"}]
			});

		return this.createView(assert, sView, oModel).then(function () {
			that.oLogMock.expects("error")
				.withExactArgs("Failed to refresh entity: /EMPLOYEES('0')[0]",
					sinon.match("404 Not Found"), "sap.ui.model.odata.v4.ODataListBinding");
			that.expectRequest("EMPLOYEES('0')?$select=ID", oError)
				.expectMessages([{
					"code" : "CODE",
					"message" : "Not found",
					"persistent" : true,
					"target" : "/EMPLOYEES('0')/ID",
					"technical" : true,
					"type" : "Error"
				}]);

			// code under test
			that.oView.byId("table").getItems()[0].getBindingContext().refresh();

			return that.waitForChanges(assert);
		}).then(function () {

			return that.checkValueState(assert,
				that.oView.byId("table").getItems("items")[0].getCells()[0], "Error", "Not found");
		});
	});

	//*********************************************************************************************
	// Scenario: Refreshing (a single entry of) a table must not cause "failed to drill-down" errors
	// if data of a dependent binding has been deleted in between.
	// This scenario is similar to the deletion of a sales order line item in the SalesOrders
	// application. Deleting a sales order line item also deletes the corresponding schedule. After
	// the deletion the application automatically refreshes the sales order which the item has
	// belonged to.
	[function (oTable) {
		this.expectRequest("EMPLOYEES('0')?$select=AGE,ID,Name",
				{"ID" : "0", "Name" : "Frederic Fall", "AGE" : 70})
			.expectRequest("EMPLOYEES('0')/EMPLOYEE_2_EQUIPMENTS?"
				+ "$select=Category,ID,Name&$skip=0&$top=100", {
				"value" : [{
					"Category" : "Electronics",
					"ID" : "1",
					"Name" : "Office PC"
				}]
			});

		oTable.getItems()[0].getBindingContext().refresh();
	}, function (oTable) {
		this.expectRequest("EMPLOYEES?$select=AGE,ID,Name&$skip=0&$top=100", {
				"value" : [{"ID" : "0", "Name" : "Frederic Fall", "AGE" : 70}]
			})
			.expectRequest("EMPLOYEES('0')/EMPLOYEE_2_EQUIPMENTS?"
				+ "$select=Category,ID,Name&$skip=0&$top=100", {
				"value" : [{
					"Category" : "Electronics",
					"ID" : "1",
					"Name" : "Office PC"
				}]
			});
		oTable.getBinding("items").refresh();
	}].forEach(function (fnRefresh, i) {
		QUnit.test("refresh: No drill-down error for deleted data #" + i, function (assert) {
			var sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\', templateShareable : false}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
		<Text id="age" text="{AGE}" />\
	</ColumnListItem>\
</Table>\
<Table id="detailTable" items="{path : \'EMPLOYEE_2_EQUIPMENTS\',\
		parameters : {$$ownRequest : true}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="equipmentName" text="{Name}" />\
	</ColumnListItem>\
</Table>',
				that = this;

			this.expectRequest("EMPLOYEES?$select=AGE,ID,Name&$skip=0&$top=100", {
					"value" : [{
						"ID" : "0",
						"Name" : "Frederic Fall",
						"AGE" : 70
					}]
				})
				.expectChange("text", ["Frederic Fall"])
				.expectChange("age", ["70"])
				.expectChange("equipmentName", []);

			return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}))
				.then(function () {
					that.expectRequest("EMPLOYEES('0')/EMPLOYEE_2_EQUIPMENTS?"
							+ "$select=Category,ID,Name&$skip=0&$top=100", {
							"value" : [{
								"Category" : "Electronics",
								"ID" : "1",
								"Name" : "Office PC"
							}, {
								"Category" : "Electronics",
								"ID" : "2",
								"Name" : "Tablet X"
							}]
						})
						.expectChange("equipmentName", ["Office PC", "Tablet X"]);
					that.oView.byId("detailTable").setBindingContext(
						that.oView.byId("table").getItems()[0].getBindingContext());

					return that.waitForChanges(assert);
				}).then(function () {
					fnRefresh.call(that, that.oView.byId("table"));

					return that.waitForChanges(assert);
				});
		});
	});

	//*********************************************************************************************
	// Scenario: Sort a list and select a list entry to see details
	// See SalesOrders application:
	// * Start the application with realOData=true so that sorting by "Gross Amount" is enabled
	// * Sort by "Gross Amount"
	// * Select a sales order and see that sales order details are fitting to the selected sales
	//   order
	// This test is a simplification of that scenario with a different service.
	QUnit.test("Absolute ODLB with sort, relative ODCB resolved on selection", function (assert) {
		var sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\', parameters : {$expand : \'EMPLOYEE_2_MANAGER\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="name" text="{Name}" />\
	</ColumnListItem>\
</Table>\
<FlexBox id="form" binding="{EMPLOYEE_2_MANAGER}">\
	<Text id="id" text="{ID}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES?$expand=EMPLOYEE_2_MANAGER&$skip=0&$top=100", {
				"value" : [
					{"Name" : "Jonathan Smith", "EMPLOYEE_2_MANAGER" : {"ID" : "2"}},
					{"Name" : "Frederic Fall", "EMPLOYEE_2_MANAGER" : {"ID" : "1"}}
				]
			})
			.expectChange("id")
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"]);

		return this.createView(assert, sView).then(function () {
			that.expectRequest("EMPLOYEES?$expand=EMPLOYEE_2_MANAGER&$orderby=Name&"
					+ "$skip=0&$top=100", {
					"value" : [
						{"Name" : "Frederic Fall", "EMPLOYEE_2_MANAGER" : {"ID" : "1"}},
						{"Name" : "Jonathan Smith", "EMPLOYEE_2_MANAGER" : {"ID" : "2"}}
					]
				})
				.expectChange("name", ["Frederic Fall", "Jonathan Smith"]);

			// code under test
			that.oView.byId("table").getBinding("items").sort(new Sorter("Name"));

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("id", "2");

			// code under test
			that.oView.byId("form").setBindingContext(
				that.oView.byId("table").getBinding("items").getCurrentContexts()[1]);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("id", "1");

			// code under test
			that.oView.byId("form").setBindingContext(
				that.oView.byId("table").getBinding("items").getCurrentContexts()[0]);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Refresh an ODataListBinding
	// See SalesOrders application:
	// * Start the application
	// * Click on "Refresh sales orders" button
	// This test is a simplification of that scenario with a different service.
	QUnit.test("Absolute ODLB refresh", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\', \
		parameters : {$select : \'__CT__FAKE__Message/__FAKE__Messages\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="name" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest(
			"EMPLOYEES?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages&$skip=0&$top=100", {
				"value" : [{
					"ID" : "1",
					"Name" : "Jonathan Smith",
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [{
							"code" : "1",
							"message" : "Text",
							"numericSeverity" : 3,
							"target" : "Name",
							"transition" : false
						}]
					}
				}, {
					"ID" : "2",
					"Name" : "Frederic Fall",
					"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
				}]
			})
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"])
			.expectMessages([{
				"code" : "1",
				"message" : "Text",
				"persistent" : false,
				"target" : "/EMPLOYEES('1')/Name",
				"type" : "Warning"
			}]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest(
				"EMPLOYEES?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages&$skip=0&$top=100", {
					"value" : [{
						"Name" : "Frederic Fall",
						"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
					}, {
						"Name" : "Peter Burke",
						"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
					}]
				})
				.expectChange("name", ["Frederic Fall", "Peter Burke"])
				.expectMessages([]);

			// code under test
			that.oView.byId("table").getBinding("items").refresh();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Messages for collection entries without key properties
	QUnit.test("Absolute ODLB: messages for entries without key properties", function (assert) {
		var oMessage1 = {
				"code" : "1",
				"message" : "Text",
				"persistent" : false,
				"target" : "/EMPLOYEES/1/Name",
				"type" : "Warning"
			},
			oMessage2 = {
				"code" : "2",
				"message" : "Text2",
				"persistent" : false,
				"target" : "/EMPLOYEES/2/Name",
				"type" : "Warning"
			},
			sView = '\
<t:Table id="table" rows="{\
			path : \'/EMPLOYEES\',\
			parameters : {$select : \'Name,__CT__FAKE__Message/__FAKE__Messages\'}\
		}"\ threshold="0" visibleRowCount="2">\
	<t:Column>\
		<t:template>\
			<Text id="name" text="{Name}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			that = this;

		this.expectRequest(
			"EMPLOYEES?$select=Name,__CT__FAKE__Message/__FAKE__Messages&$skip=0&$top=2", {
				"value" : [{
					"Name" : "Jonathan Smith",
					"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
				}, {
					"Name" : "Frederic Fall",
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [{
							"code" : "1",
							"message" : "Text",
							"transition" : false,
							"target" : "Name",
							"numericSeverity" : 3
						}]
					}
				}]
			})
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"])
			.expectMessages([oMessage1]);

		return this.createView(assert, sView, createTeaBusiModel()).then(function () {
			var oTable = that.oView.byId("table");

			that.expectRequest(
				"EMPLOYEES?$select=Name,__CT__FAKE__Message/__FAKE__Messages&$skip=2&$top=1", {
					"value" : [{
						"Name" : "Peter Burke",
						"__CT__FAKE__Message" : {
							"__FAKE__Messages" : [{
								"code" : "2",
								"message" : "Text2",
								"transition" : false,
								"target" : "Name",
								"numericSeverity" : 3
							}]
						}
					}]
				})
				.expectChange("name", null, null)
				.expectChange("name", "Frederic Fall", 1)
				.expectChange("name", "Peter Burke", 2)
				.expectMessages([oMessage1, oMessage2]);

			oTable.setFirstVisibleRow(1);
			return that.waitForChanges(assert);
		});
		//TODO: using an index for a bound message leads to a wrong target if for example
		//      an entity with a lower index gets deleted, see CPOUI5UISERVICESV3-413
	});

	//*********************************************************************************************
	// Scenario: Refresh an ODataContextBinding with a message, the entity is deleted in between
	QUnit.test("Absolute ODCB refresh & message", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="form" binding="{path : \'/EMPLOYEES(\\\'2\\\')\', \
	parameters : {$select : \'__CT__FAKE__Message/__FAKE__Messages\'}}">\
	<Text id="text" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('2')?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages", {
				"ID" : "1",
				"Name" : "Jonathan Smith",
				"__CT__FAKE__Message" : {
					"__FAKE__Messages" : [{
						"code" : "1",
						"message" : "Text",
						"numericSeverity" : 3,
						"target" : "Name",
						"transition" : false
					}]
				}
			})
			.expectChange("text", "Jonathan Smith")
			.expectMessages([{
				"code" : "1",
				"message" : "Text",
				"persistent" : false,
				"target" : "/EMPLOYEES('2')/Name",
				"type" : "Warning"
			}]);

		return this.createView(assert, sView, oModel).then(function () {
			var oError = new Error("Employee does not exist");

			that.oLogMock.expects("error").withExactArgs("Failed to read path /EMPLOYEES('2')",
				sinon.match(oError.message), "sap.ui.model.odata.v4.ODataContextBinding");
			that.oLogMock.expects("error").withExactArgs("Failed to read path /EMPLOYEES('2')/Name",
				sinon.match(oError.message), "sap.ui.model.odata.v4.ODataPropertyBinding");
			that.expectRequest(
				"EMPLOYEES('2')?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages", oError)
				.expectChange("text", null)
				.expectMessages([{
					"code" : undefined,
					"message" : "Employee does not exist",
					"persistent" : true,
					"target" : "",
					"technical" : true,
					"type" : "Error"
				}]);

			// code under test
			that.oView.byId("form").getObjectBinding().refresh();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Refresh an ODataContextBinding
	// The SalesOrders application does not have such a scenario.
	[false, true].forEach(function (bViaContext) {
		QUnit.test("Absolute ODCB refresh, via bound context " + bViaContext, function (assert) {
			var sView = '\
<FlexBox id="form" binding="{/EMPLOYEES(\'2\')}">\
	<Text id="text" text="{Name}" />\
</FlexBox>',
				that = this;

			this.expectRequest("EMPLOYEES('2')", {"Name" : "Jonathan Smith"})
				.expectChange("text", "Jonathan Smith");

			return this.createView(assert, sView).then(function () {
				var oBinding = that.oView.byId("form").getObjectBinding();

				that.expectRequest("EMPLOYEES('2')", {"Name" : "Jonathan Smith"})
					.expectChange("text", "Jonathan Smith");

				// code under test
				if (bViaContext) {
					oBinding.getBoundContext().refresh();
				} else {
					oBinding.refresh();
				}

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Refresh an ODataPropertyBinding
	// See SalesOrders application:
	// * Start the application
	// * Click on "Refresh favorite product" button
	// This test is a simplification of that scenario with a different service.
	QUnit.test("Absolute ODPB refresh", function (assert) {
		var sView = '<Text id="name" text="{/EMPLOYEES(\'2\')/Name}" />',
			that = this;

		this.expectRequest("EMPLOYEES('2')/Name", {"value" : "Jonathan Smith"})
			.expectChange("name", "Jonathan Smith");

		return this.createView(assert, sView).then(function () {
			that.expectRequest("EMPLOYEES('2')/Name", {"value" : "Jonathan Schmidt"})
				.expectChange("name", "Jonathan Schmidt");

			// code under test
			that.oView.byId("name").getBinding("text").refresh();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Action Imports
	// See ListBinding application:
	// * Start the application
	// * Click on "Budget" button
	// * In the "Change Team Budget" dialog enter a "Budget" and press "Change" button
	QUnit.test("ActionImport", function (assert) {
		var sView = '\
<FlexBox id="form" binding="{/ChangeTeamBudgetByID(...)}">\
	<Input id="name" value="{Name}" />\
</FlexBox>',
			oModelMessage = {
				code : "1",
				message : "Warning Text",
				persistent : false,
				target : "/ChangeTeamBudgetByID(...)/Name",
				type : "Warning"
			},
			oResponseMessage = {
				code : "1",
				message : "Warning Text",
				numericSeverity : 3,
				target : "Name",
				transition : false
			},
			that = this;

		this.expectChange("name", null);

		return this.createView(assert, sView).then(function () {
			that.expectRequest({
					method : "POST",
					url : "ChangeTeamBudgetByID",
					payload : {
						"Budget" : "1234.1234",
						"TeamID" : "TEAM_01"
					}
				}, {
					"Name" : "Business Suite",
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [oResponseMessage]
					}
				})
				.expectMessages([oModelMessage])
				.expectChange("name", "Business Suite");

			return Promise.all([
				// code under test
				that.oView.byId("form").getObjectBinding()
					.setParameter("TeamID", "TEAM_01")
					.setParameter("Budget", "1234.1234")
					.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			return that.checkValueState(assert, "name", "Warning", "Warning Text");
		});
	});

	//*********************************************************************************************
	// Scenario: Changing the binding parameters causes a refresh of the table
	// The SalesOrders application does not have such a scenario.
	QUnit.test("Absolute ODLB changing parameters", function (assert) {
		var sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\', parameters : {$select : \'Name\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="name" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("EMPLOYEES?$select=Name&$skip=0&$top=100", {
				"value" : [
					{"Name" : "Jonathan Smith"},
					{"Name" : "Frederic Fall"}
				]
			})
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"]);

		return this.createView(assert, sView).then(function () {
			that.expectRequest("EMPLOYEES?$select=ID,Name&$search=Fall&$skip=0&$top=100", {
					"value" : [{"ID" : "2", "Name" : "Frederic Fall"}]
				})
				.expectChange("name", ["Frederic Fall"]);

			// code under test
			that.oView.byId("table").getBinding("items").changeParameters({
				"$search" : "Fall", "$select" : "ID,Name"});

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Changing the binding parameters causes a refresh of the form
	// The SalesOrders application does not have such a scenario.
	QUnit.test("Absolute ODCB changing parameters", function (assert) {
		var sView = '\
<FlexBox id="form" binding="{/EMPLOYEES(\'2\')}">\
	<Text id="text" text="{Name}" />\
</FlexBox>',
			that = this;

		that.expectRequest("EMPLOYEES('2')", {"Name" : "Jonathan Smith"})
			.expectChange("text", "Jonathan Smith");

		return this.createView(assert, sView).then(function () {
			that.expectRequest("EMPLOYEES('2')?$apply=foo", {"Name" : "Jonathan Schmidt"})
				.expectChange("text", "Jonathan Schmidt");

			// code under test
			that.oView.byId("form").getObjectBinding().changeParameters({"$apply" : "foo"});

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario:
	// A table uses the list binding with extended change detection, but not all key properties of
	// the displayed entity are known on the client, so that the key predicate cannot be determined.
	// In 1.44 this caused the problem that the table did not show any row. (Not reproducible with
	// Gateway services, because they always deliver all key properties, selected or not.)
	QUnit.test("Absolute ODLB with ECD, missing key column", function (assert) {
		// Note: The key property of the EMPLOYEES set is 'ID'
		var sView = '\
<Table growing="true" items="{path : \'/EMPLOYEES\', parameters : {$select : \'Name\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="name" text="{Name}" />\
	</ColumnListItem>\
</Table>';

		this.expectRequest("EMPLOYEES?$select=Name&$skip=0&$top=20", {
				"value" : [
					{"Name" : "Jonathan Smith"},
					{"Name" : "Frederic Fall"}
				]
			})
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"]);

		return this.createView(assert, sView);
	});

	//*********************************************************************************************
	// Scenario: SalesOrders app
	// * Select a sales order so that items are visible
	// * Filter in the items, so that there are less
	// * See that the count decreases
	// The test simplifies it: It filters in the sales orders list directly
	QUnit.test("ODLB: $count and filter()", function (assert) {
		var sView = '\
<Text id="count" text="{$count}"/>\
<Table id="table" items="{path : \'/SalesOrderList\', parameters : {$select : \'SalesOrderID\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		that.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=100", {
				"value" : [
					{"SalesOrderID" : "0500000001"},
					{"SalesOrderID" : "0500000002"}
				]
			})
			.expectChange("count")
			.expectChange("id", ["0500000001", "0500000002"]);

		return this.createView(assert, sView, createSalesOrdersModel()).then(function () {
			that.expectChange("count", "2");

			// code under test
			that.oView.byId("count").setBindingContext(
				that.oView.byId("table").getBinding("items").getHeaderContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("SalesOrderList?$select=SalesOrderID&$filter=SalesOrderID gt"
					+ " '0500000001'&$skip=0&$top=100",
					{"value" : [{"SalesOrderID" : "0500000002"}]}
				)
				.expectChange("count", "1")
				.expectChange("id", ["0500000002"]);

			// code under test
			that.oView.byId("table").getBinding("items")
				.filter(new Filter("SalesOrderID", FilterOperator.GT, "0500000001"));

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: SalesOrders app
	// * Sort the sales orders
	// * Delete a sales order
	// * See that the count decreases
	// The delete is used to change the count (to see that it is still updated)
	QUnit.test("ODLB: $count and sort()", function (assert) {
		var sView = '\
<Text id="count" text="{$count}"/>\
<Table id="table" items="{path : \'/SalesOrderList\', parameters : {$select : \'SalesOrderID\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>',
		that = this;

		this.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=100", {
				"value" : [
					{"SalesOrderID" : "0500000001"},
					{"SalesOrderID" : "0500000002"}
				]
			})
			.expectChange("count") // ensures that count is observed
			.expectChange("id", ["0500000001", "0500000002"]);

		return this.createView(assert, sView, createSalesOrdersModel()).then(function () {
			that.expectChange("count", "2");

			// code under test
			that.oView.byId("count").setBindingContext(
				that.oView.byId("table").getBinding("items").getHeaderContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("SalesOrderList?$select=SalesOrderID&$orderby=SalesOrderID desc"
					+ "&$skip=0&$top=100", {
					"value" : [
						{"SalesOrderID" : "0500000002"},
						{"SalesOrderID" : "0500000001"}
					]
				})
				.expectChange("id", ["0500000002", "0500000001"]);

			// code under test
			that.oView.byId("table").getBinding("items").sort(new Sorter("SalesOrderID", true));

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('0500000002')"
				})
				.expectChange("count", "1")
				.expectChange("id", ["0500000001"]);

			return Promise.all([
				// code under test
				that.oView.byId("table").getItems()[0].getBindingContext().delete(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: (not possible with the SalesOrders app)
	// * Add a filter to the sales orders list using changeParameters(), so that there are less
	// * See that the count decreases
	QUnit.test("ODLB: $count and changeParameters()", function (assert) {
		var sView = '\
<Text id="count" text="{$count}"/>\
<Table id="table" items="{path : \'/SalesOrderList\', parameters : {$select : \'SalesOrderID\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		that.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=100", {
				"value" : [
					{"SalesOrderID" : "0500000001"},
					{"SalesOrderID" : "0500000002"}
				]
			})
			.expectChange("count")
			.expectChange("id", ["0500000001", "0500000002"]);

		return this.createView(assert, sView, createSalesOrdersModel()).then(function () {
			that.expectChange("count", "2");

			// code under test
			that.oView.byId("count").setBindingContext(
				that.oView.byId("table").getBinding("items").getHeaderContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("SalesOrderList?$select=SalesOrderID"
					+ "&$filter=SalesOrderID gt '0500000001'&$skip=0&$top=100",
					{"value" : [{"SalesOrderID" : "0500000002"}]}
				)
				.expectChange("count", "1")
				.expectChange("id", ["0500000002"]);

			// code under test
			that.oView.byId("table").getBinding("items")
				.changeParameters({$filter : "SalesOrderID gt '0500000001'"});

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete multiple entities in a table. Ensure that the request to fill the gap uses
	// the correct index.
	// JIRA: CPOUI5UISERVICESV3-1769
	// BCP:  1980007571
	QUnit.test("multiple delete: index for gap-filling read requests", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" growing="true" growingThreshold="3" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		that.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=3", {
				"value" : [
					{"SalesOrderID" : "0500000001"},
					{"SalesOrderID" : "0500000002"},
					{"SalesOrderID" : "0500000003"}
				]
			})
			.expectChange("id", ["0500000001", "0500000002", "0500000003"]);

		return this.createView(assert, sView, oModel).then(function () {
			var aItems = that.oView.byId("table").getItems();

			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('0500000002')"
				})
				.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('0500000003')"
				})
				.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=1&$top=2", {
					"value" : [
						{"SalesOrderID" : "0500000004"}
					]
				})
				.expectChange("id", "0500000004", 1);

			// code under test
			return Promise.all([
				aItems[1].getBindingContext().delete(),
				aItems[2].getBindingContext().delete(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete in a growing table and then let it grow. Ensure that the gap caused by the
	// delete is filled.
	// JIRA: CPOUI5UISERVICESV3-1769
	// BCP:  1980007571
	QUnit.test("growing while deleting: index for gap-filling read request", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			oTable,
			sView = '\
<Table id="table" growing="true" growingThreshold="3" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		that.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=3", {
				"value" : [
					{"SalesOrderID" : "0500000001"},
					{"SalesOrderID" : "0500000002"},
					{"SalesOrderID" : "0500000003"}
				]
			})
			.expectChange("id", ["0500000001", "0500000002", "0500000003"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oDeletePromise;

			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('0500000002')"
				})
				.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=2&$top=4", {
					"value" : [
						{"SalesOrderID" : "0500000004"}
					]
				})
				.expectChange("id", "0500000004", 2);

			oTable = that.oView.byId("table");

			// code under test
			oDeletePromise = oTable.getItems()[1].getBindingContext().delete();
			that.oView.byId("table-trigger").firePress();

			return Promise.all([
				oDeletePromise,
				that.waitForChanges(assert)
			]);
		}).then(function () {
			assert.deepEqual(
				oTable.getBinding("items").getCurrentContexts().map(function (oContext) {
					return oContext.getPath();
				}),
				[
					"/SalesOrderList('0500000001')",
					"/SalesOrderList('0500000003')",
					"/SalesOrderList('0500000004')"
				]
			);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete an entity in a growing table via refresh and let the table grow at the same
	// time.
	// JIRA: CPOUI5UISERVICESV3-1795
	QUnit.test("growing while deleting: adjust the pending read request", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			oTable,
			sView = '\
<Table id="table" growing="true" growingThreshold="3" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		that.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=3", {
				"value" : [
					{"SalesOrderID" : "0500000001"},
					{"SalesOrderID" : "0500000002"},
					{"SalesOrderID" : "0500000003"}
				]
			})
			.expectChange("id", ["0500000001", "0500000002", "0500000003"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("SalesOrderList?$select=SalesOrderID"
					+ "&$filter=SalesOrderID eq '0500000002'", {
					"value" : []
				})
				.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=3&$top=3", {
					"value" : [
						{"SalesOrderID" : "0500000004"}
					]
				})
				// this request is sent because the length is not yet known when the change event
				// for the delete is fired (it wouldn't come with $count)
				.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=5&$top=1", {
					"value" : []
				})
				.expectChange("id", null) // from deleting the item '0500000002'
				.expectChange("id", "0500000004", 2);

			oTable = that.oView.byId("table");

			// code under test
			oTable.getItems()[1].getBindingContext().refresh(undefined, true);
			that.oView.byId("table-trigger").firePress();

			return that.waitForChanges(assert);
		}).then(function () {
			assert.deepEqual(
				oTable.getBinding("items").getCurrentContexts().map(function (oContext) {
					return oContext.getPath();
				}), [
					"/SalesOrderList('0500000001')",
					"/SalesOrderList('0500000003')",
					"/SalesOrderList('0500000004')"
				]
			);
		});
	});

	//*********************************************************************************************
	// Scenario: SalesOrders app
	// * Select a sales order
	// * Refresh the sales order list
	// * See that the count of the items is still visible
	// The key point is that the parent of the list is a ContextBinding.
	QUnit.test("ODLB: refresh via parent context binding, shared cache", function (assert) {
		var sView = '\
<FlexBox id="form" binding="{path :\'/SalesOrderList(\\\'0500000001\\\')\', \
		parameters : {$expand : {SO_2_SOITEM : {$select : \'ItemPosition\'}}}}">\
	<Text id="count" text="{headerContext>$count}"/>\
	<Table id="table" items="{SO_2_SOITEM}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="item" text="{ItemPosition}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('0500000001')?$expand=SO_2_SOITEM($select=ItemPosition)",
			{
				"SalesOrderID" : "0500000001",
				"SO_2_SOITEM" : [
					{"ItemPosition" : "0000000010"},
					{"ItemPosition" : "0000000020"},
					{"ItemPosition" : "0000000030"}
				]
			})
			.expectChange("count")
			.expectChange("item", ["0000000010", "0000000020", "0000000030"]);

		return this.createView(assert, sView, createSalesOrdersModel()
		).then(function () {
			that.expectChange("count", "3");

			// code under test
			that.oView.setModel(that.oView.getModel(), "headerContext");
			that.oView.byId("count").setBindingContext(
				that.oView.byId("table").getBinding("items").getHeaderContext(),
					"headerContext");

			return that.waitForChanges(assert);
		}).then(function () {
			// Respond with one employee less to show that the refresh must destroy the bindings for
			// the last row. Otherwise the property binding for that row will cause a "Failed to
			// drill down".
			that.expectRequest(
				"SalesOrderList('0500000001')?$expand=SO_2_SOITEM($select=ItemPosition)", {
					"SalesOrderID" : "0500000001",
					"SO_2_SOITEM" : [
						{"ItemPosition" : "0000000010"},
						{"ItemPosition" : "0000000030"}
					]
				})
				.expectChange("count", "2")
				.expectChange("item", "0000000030", 1);

			// code under test
			that.oView.byId("form").getObjectBinding().refresh();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Refresh a suspended ODCB with a dependent ODLB having a cache. See that both caches
	// are refreshed when resuming. See CPOUI5UISERVICESV3-1179
	QUnit.test("Refresh a suspended binding hierarchy", function (assert) {
		var oBinding,
			oModel = createSalesOrdersModel({autoExpandSelect : true}),
			bPropertyEvent,
			bTableEvent,
			sView = '\
<FlexBox id="form" binding="{/SalesOrderList(\'0500000001\')}">\
	<Text id="note" text="{Note}"/>\
	<Text id="count" text="{headerContext>$count}"/>\
	<Table id="table" items="{path : \'SO_2_SOITEM\', parameters : {$$ownRequest : true}}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="item" text="{ItemPosition}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('0500000001')?$select=Note,SalesOrderID",
				{"SalesOrderID" : "0500000001", "Note" : "initial"})
			.expectRequest("SalesOrderList('0500000001')/SO_2_SOITEM?$select=ItemPosition,"
				+ "SalesOrderID&$skip=0&$top=100", {
					"value" : [
						{"ItemPosition" : "0000000010"},
						{"ItemPosition" : "0000000020"}
					]
			})
			.expectChange("count")
			.expectChange("note", "initial")
			.expectChange("item", ["0000000010", "0000000020"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oCount = that.oView.byId("count");

			that.expectChange("count", "2");

			oCount.setModel(that.oView.getModel(), "headerContext");
			oCount.setBindingContext(
				that.oView.byId("table").getBinding("items").getHeaderContext(),
				"headerContext");

			return that.waitForChanges(assert);
		}).then(function () {
			oBinding = that.oView.byId("form").getObjectBinding();

			// code under test
			oBinding.suspend();
			oBinding.refresh();

			// Do not immediately resume to see that no requests are triggered by refresh
			return resolveLater();
		}).then(function () {
			that.expectRequest("SalesOrderList('0500000001')?$select=Note,SalesOrderID",
					{"SalesOrderID" : "0500000001", "Note" : "refreshed"})
				.expectRequest("SalesOrderList('0500000001')/SO_2_SOITEM?$select=ItemPosition,"
					+ "SalesOrderID&$skip=0&$top=100", {
						"value" : [
							{"ItemPosition" : "0000000010"},
							{"ItemPosition" : "0000000020"},
							{"ItemPosition" : "0000000030"}
						]
				})
				.expectChange("count", "3")
				.expectChange("note", "refreshed")
				.expectChange("item", "0000000030", 2);

			// expect event only for ODLB because ODCB doesn't fire a change event
			that.oView.byId("table").getBinding("items")
				.attachEventOnce("refresh", function (oEvent) {
					bTableEvent = true;
					assert.strictEqual(oEvent.getParameter("reason"), ChangeReason.Refresh,
						"Table change event");
			});

			that.oView.byId("note").getBinding("text")
				.attachEventOnce("change", function (oEvent) {
					bPropertyEvent = true;
					assert.strictEqual(oEvent.getParameter("reason"), ChangeReason.Refresh,
						"ID property change event");
			});

			// code under test
			oBinding.resume();

			return that.waitForChanges(assert);
		}).then(function () {
			assert.ok(bTableEvent, "got TableEvent");
			assert.ok(bPropertyEvent, "got PropertyEvent");
		});
	});

	//*********************************************************************************************
	// Scenario: Modify a property which does not belong to the parent binding's entity
	QUnit.test("Modify a foreign property", function (assert) {
		var sView = '\
<Table id="table" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Input id="item" value="{SO_2_BP/CompanyName}" />\
	</ColumnListItem>\
</Table>',
			oModel = createSalesOrdersModel({autoExpandSelect : true}),
			that = this;

		this.expectRequest("SalesOrderList?$select=SalesOrderID"
				+ "&$expand=SO_2_BP($select=BusinessPartnerID,CompanyName)&$skip=0&$top=100", {
				"value" : [{
					"SalesOrderID" : "0500000002",
					"SO_2_BP" : {
						"@odata.etag" : "ETag",
						"BusinessPartnerID" : "42",
						"CompanyName" : "Foo"
					}
				}]
			})
			.expectChange("item", ["Foo"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "BusinessPartnerList('42')",
					headers : {"If-Match" : "ETag"},
					payload : {"CompanyName" : "Bar"}
				}, {
					"CompanyName" : "Bar"
				})
				.expectChange("item", "Bar", 0);

			that.oView.byId("table").getItems()[0].getCells()[0].getBinding("value")
				.setValue("Bar");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Modify a property, the server responds with 204 (No Content) on the PATCH request.
	// Sample for this behavior: OData V4 TripPin service from odata.org
	QUnit.test("Modify a property, server responds with 204 (No Content)", function (assert) {
		var sView = '<FlexBox binding="{/EMPLOYEES(\'2\')}">\
						<Input id="text" value="{Name}" />\
					</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('2')", {"Name" : "Jonathan Smith"})
			.expectChange("text", "Jonathan Smith");

		return this.createView(assert, sView).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "EMPLOYEES('2')",
					payload : {"Name" : "Jonathan Schmidt"}
				}, /*empty 204 response*/ undefined)
				.expectChange("text", "Jonathan Schmidt");

			// code under test
			that.oView.byId("text").getBinding("value").setValue("Jonathan Schmidt");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Read and modify an entity with key aliases
	QUnit.test("Entity with key aliases", function (assert) {
		var sView = '\
<Table id="table" items="{/EntitiesWithComplexKey}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Input id="item" value="{Value}" />\
	</ColumnListItem>\
</Table>',
			oModel = createSpecialCasesModel({autoExpandSelect : true}),
			that = this;

		this.expectRequest("EntitiesWithComplexKey?$select=Key/P1,Key/P2,Value&$skip=0&$top=100", {
				"value" : [{
					"Key" : {
						"P1" : "foo",
						"P2" : 42
					},
					"Value" : "Old",
					"@odata.etag" : "ETag"
				}]
			})
			.expectChange("item", ["Old"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "EntitiesWithComplexKey(Key1='foo',Key2=42)",
					headers : {"If-Match" : "ETag"},
					payload : {"Value" : "New"}
				}, {
					"Value" : "New"
				})
				.expectChange("item", "New", 0);

			that.oView.byId("table").getItems()[0].getCells()[0].getBinding("value")
				.setValue("New");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Create a sales order w/o key properties, enter a note, then submit the batch
	[false, true].forEach(function (bSkipRefresh) {
		QUnit.test("Create with user input - bSkipRefresh: " + bSkipRefresh, function (assert) {
			var oCreatedContext,
				oModel = createSalesOrdersModel({
					autoExpandSelect : true,
					updateGroupId : "update"
				}),
				sView = '\
<Table id="table" items="{/SalesOrderList}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Input id="note" value="{Note}" />\
		<Text id="companyName" binding="{SO_2_BP}" text="{CompanyName}"/>\
	</ColumnListItem>\
</Table>',
				that = this;

			this.expectRequest("SalesOrderList?$select=Note,SalesOrderID"
					+ "&$expand=SO_2_BP($select=BusinessPartnerID,CompanyName)&$skip=0&$top=100", {
					"value" : [{
						"Note" : "foo",
						"SalesOrderID" : "42",
						"SO_2_BP" : {
							"BusinessPartnerID" : "123",
							"CompanyName" : "SAP"
						}
					}]
				})
				.expectChange("note", ["foo"])
				// companyName is embedded in a context binding; index not considered in test
				// framework
				.expectChange("companyName", "SAP");

			return this.createView(assert, sView, oModel).then(function () {
				var oTable = that.oView.byId("table");

				that.expectChange("note", ["bar", "foo"])
					.expectChange("note", "baz", 0)
					.expectChange("companyName", null)
					.expectChange("companyName", "SAP");

				oCreatedContext = oTable.getBinding("items").create({Note : "bar"}, bSkipRefresh);
				oTable.getItems()[0].getCells()[0].getBinding("value").setValue("baz");

				return that.waitForChanges(assert);
			}).then(function () {
				that.expectRequest({
						method : "POST",
						url : "SalesOrderList",
						payload : {"Note" : "baz"}
					}, {
						"Note" : "from server",
						"SalesOrderID" : "43"
					})
					.expectChange("note", "from server", 0);
				if (!bSkipRefresh){
					that.expectRequest("SalesOrderList('43')?$select=Note,SalesOrderID"
							+ "&$expand=SO_2_BP($select=BusinessPartnerID,CompanyName)", {
							"Note" : "fresh from server",
							"SalesOrderID" : "43",
							"SO_2_BP" : {
								"BusinessPartnerID" : "456",
								"CompanyName" : "ACM"
							}
						})
						.expectChange("note", "fresh from server", 0)
						.expectChange("companyName", "ACM");
				}

				return Promise.all([
					oCreatedContext.created(),
					that.oModel.submitBatch("update"),
					that.waitForChanges(assert)
				]);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Create multiple w/o refresh: (2) Create two new entities without save in between,
	// save (CPOUI5UISERVICESV3-1759)
	QUnit.test("Create multiple w/o refresh, with $count: (2)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			sView = '\
<Text id="count" text="{$count}"/>\
<Table id="table" items="{path : \'/SalesOrderList\', parameters : {$count : true}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("SalesOrderList?$count=true&$select=Note,SalesOrderID&$skip=0&$top=100",
			{
				"@odata.count" : "1",
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("count")
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oBinding = that.oView.byId("table").getBinding("items");

			assert.strictEqual(oBinding.getLength(), 1);

			that.expectChange("count", "1");

			that.oView.byId("count").setBindingContext(oBinding.getHeaderContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("count", "2")
				.expectChange("id", ["", "42"])
				.expectChange("note", ["New 1", "First SalesOrder"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);

			assert.strictEqual(oBinding.getLength(), 2);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("count", "3")
				.expectChange("id", "", 1)
				.expectChange("id", "42", 2)
				.expectChange("note", ["New 2", "New 1", "First SalesOrder"]);

			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);

			assert.strictEqual(oBinding.getLength(), 3);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectRequest({
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 2"}
				}, {
					"Note" : "New 2",
					"SalesOrderID" : "44"
				})
				.expectChange("id", ["44", "43"]);

			return Promise.all([
				oCreatedContext0.created(),
				oCreatedContext1.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			assert.strictEqual(oBinding.getLength(), 3);
		});
	});

	//*********************************************************************************************
	// Scenario: Create multiple w/o refresh: (3) Start with (2), Create third entity, save, delete
	// third created entity, save (CPOUI5UISERVICESV3-1759)
	QUnit.test("Create multiple w/o refresh: (3)", function (assert) {
		var oCreatedContext,
			that = this;

		return this.createTwiceSaveInBetween(assert).then(function () {
			oCreatedContext = that.createThird();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 3"}
				}, {
					"Note" : "New 3",
					"SalesOrderID" : "45"
				})
				.expectChange("id", "45", 0);

			return Promise.all([
				oCreatedContext.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('45')"
				})
				.expectChange("count", "3")
				.expectChange("id", null) // events for unresolved ODPB after deletion
				.expectChange("note", null)
				.expectChange("id", ["44", "43", "42"])
				.expectChange("note", ["New 2", "New 1", "First SalesOrder"]);

			return Promise.all([
				oCreatedContext.delete("$auto"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Create multiple w/o refresh: create thrice, then delete last
	// (4a) Start with (2), Create third entity, no save, reset changes via binding, save
	// (4b) Start with (2), Create third entity, no save, reset changes via model, save
	// (5) Start with (2), Create third entity, no save, delete third created entity
	// CPOUI5UISERVICESV3-1759
[
	"Create multiple w/o refresh: (4a)",
	"Create multiple w/o refresh: (4b)",
	"Create multiple w/o refresh: (5)"
].forEach(function (sTitle, i) {
	QUnit.test(sTitle, function (assert) {
		var oCreatedContext,
			that = this;

		function deleteSalesOrder() {
			if (i === 0) {
				that.oView.byId("table").getBinding("items").resetChanges();
			} else if (i === 1) {
				that.oModel.resetChanges();
			} else if (i === 2) {
				return oCreatedContext.delete("$auto");
			}
		}

		return this.createTwiceSaveInBetween(assert).then(function () {
			oCreatedContext = that.createThird();

			return that.waitForChanges(assert);
		}).then(function () {
			// no request
			that.expectChange("count", "3")
				.expectChange("id", ["44", "43", "42"])
				.expectChange("note", ["New 2", "New 1", "First SalesOrder"]);

			return Promise.all([
				oCreatedContext.created().catch(function () {/* avoid uncaught (in promise) */}),
				deleteSalesOrder(),
				that.waitForChanges(assert)
			]);
		});
	});
});

	//*********************************************************************************************
	// Scenario: Create multiple w/o refresh: (6) Start with (2), create third entity, save, delete
	// second entity (CPOUI5UISERVICESV3-1759)
	QUnit.test("Create multiple w/o refresh: (6)", function (assert) {
		var oCreatedContext,
			that = this;

		return this.createTwiceSaveInBetween(assert).then(function () {
			oCreatedContext = that.createThird();

			that.expectRequest({
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 3"}
				}, {
					"Note" : "New 3",
					"SalesOrderID" : "45"
				})
				.expectChange("id", "45", 0);

			return Promise.all([
				oCreatedContext.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('44')"
				})
				.expectChange("count", "3")
				.expectChange("id", null) // events for unresolved ODPB after deletion
				.expectChange("note", null)
				.expectChange("id", [, "43", "42"])
				.expectChange("note", [, "New 1", "First SalesOrder"]);

			return Promise.all([
				that.oView.byId("table").getItems()[1].getBindingContext().delete("$auto"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Create multiple w/o refresh: (7) Create thrice without save, delete second entity,
	// check remaining contexts are still transient and reference the expected data. Read next
	// elements from server.
	// CPOUI5UISERVICESV3-1759, CPOUI5UISERVICESV3-1784
	QUnit.test("Create multiple w/o refresh, with $count: (7)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			sView = '\
<Text id="count" text="{$count}"/>\
<Table id="table" growing="true" growingThreshold="2"\
		items="{path : \'/SalesOrderList\', parameters : {$count : true}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("SalesOrderList?$count=true&$select=Note,SalesOrderID&$skip=0&$top=2", {
				"@odata.count" : "3",
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}, {
					"Note" : "Second SalesOrder",
					"SalesOrderID" : "43"
				}]
			})
			.expectChange("count")
			.expectChange("id", ["42", "43"])
			.expectChange("note", ["First SalesOrder", "Second SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oBinding = that.oView.byId("table").getBinding("items");

			that.expectChange("count", "3");

			that.oView.byId("count").setBindingContext(oBinding.getHeaderContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("count", "4")
				.expectChange("id", "", 0)
				.expectChange("note", "New 1", 0);

			// never persisted or deleted
			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("count", "5")
				.expectChange("id", "", 0)
				.expectChange("note", "New 2", 0);

			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("count", "6")
				.expectChange("id", "", 0)
				.expectChange("note", "New 3", 0);

			// never persisted or deleted
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("count", "5")
				.expectChange("id", "", 1)
				.expectChange("note", "New 1", 1);

			return Promise.all([
				oCreatedContext1.created().catch(function () {/* avoid uncaught (in promise) */}),
				oCreatedContext1.delete("$auto"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(oCreatedContext2.getProperty("Note"), "New 3");
			// ensure consistency of cached data;
			// when using key predicate, it does not matter, if the object is contained in the array
			// of the collection or not, as long as it is contained in $byPredicate map, that object
			// is used. Only with index path it is possible to see a potential mismatch between
			// the array of contexts in the ODataListBinding and the collection in the cache.
			assert.strictEqual(oCreatedContext2.getProperty("/SalesOrderList/-2/Note"), "New 3");

			assert.strictEqual(oCreatedContext0.isTransient(), true);
			assert.strictEqual(oCreatedContext0.getProperty("Note"), "New 1");
			assert.strictEqual(oCreatedContext0.getProperty("/SalesOrderList/-1/Note"), "New 1");

			that.expectChange("id", "42", 2)
				.expectChange("note", "First SalesOrder", 2)
				.expectChange("id", "43", 3)
				.expectChange("note", "Second SalesOrder", 3);

			// show more items
			that.oView.byId("table-trigger").firePress();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("SalesOrderList?$count=true&$select=Note,SalesOrderID"
					+ "&$skip=2&$top=1", {
					"@odata.count" : "3",
					"value" : [{
						"Note" : "Third SalesOrder",
						"SalesOrderID" : "44"
					}]
				})
				.expectChange("id", "44", 4)
				.expectChange("note", "Third SalesOrder", 4);

			// show more items - ensure correct server side index for reading more elements
			that.oView.byId("table-trigger").firePress();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (1)
	//  List binding: relative without cache
	//  Number of transient: 0
	//  Delete: Context.delete as Context.refresh(bAllowRemoval=true) is not possible
	//  Table control: sap.m.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (1)", function (assert) {
		var oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<Table id="table" growing="true" items="{BP_2_SO}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')?$select=BusinessPartnerID"
				+ "&$expand=BP_2_SO($select=Note,SalesOrderID)", {
				"BusinessPartnerID" : "4711",
				"BP_2_SO" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding;

			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("items");

			that.expectChange("id", ["", "", ""])
				.expectChange("note", ["New 3", "New 2", "New 1"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 2"}
				}, {
					"Note" : "New 2",
					"SalesOrderID" : "44"
				})
				.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 3"}
				}, {
					"Note" : "New 3",
					"SalesOrderID" : "45"
				})
				.expectChange("id", ["45", "44", "43"]);

			return Promise.all([
				oCreatedContext0.created(),
				oCreatedContext1.created(),
				oCreatedContext2.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('44')"
				})
				.expectChange("id", null) // events for unresolved ODPB after deletion
				.expectChange("note", null)
				//TODO: Unexpected change events for unchanged rows 0,1 -> CPOUI5UISERVICESV3-1810
				.expectChange("id", ["45", "43"])
				.expectChange("note", ["New 3", "New 1"]);

			return Promise.all([
				oTable.getItems()[1].getBindingContext().delete("$auto"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (2)
	//  List binding: absolute
	//  Number of transient: 2
	//  Delete: Context.delete
	//  Table control: sap.ui.table.Table
	//  Additional tests: update last, transient: update of POST payload expected
	// CPOUI5UISERVICESV3-1792
	//TODO Runs unstable, probably due to use of GridTable with setFirstVisibleRow
	QUnit.skip("All pairs test for multi create (2)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<t:Table id="table" rows="{/SalesOrderList}" visibleRowCount="2">\
	<t:Column>\
		<t:template>\
			<Text id="id" text="{SalesOrderID}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Input id="note" value="{Note}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			that = this;

		this.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=102", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("rows");

			that.expectChange("id", ["", "42"])
				.expectChange("note", ["New 1", "First SalesOrder"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectChange("id", "43", 0);

			return Promise.all([
				oCreatedContext0.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectChange("id", ["", ""])
				.expectChange("note", ["New 3", "New 2"]);

			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			var aRows = oTable.getRows();

			// check row here because table calls getContexts for event ChangeReason.Add async.
			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(aRows[1].getBindingContext(), oCreatedContext1);

			that.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("id", "43", 1)
				.expectChange("note", "New 1", 1);

			return Promise.all([
				oCreatedContext1.created().catch(function () {/* avoid uncaught (in promise) */}),
				oCreatedContext1.delete("$auto"),
				that.waitForChanges(assert, true)
			]);
		}).then(function () {
			that.expectChange("id", [, "43", "42"])
				.expectChange("note", [, "New 1", "First SalesOrder"]);

			oTable.setFirstVisibleRow(1);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("id", ["", "43"])
				.expectChange("note", ["New 3", "New 1"]);

			oTable.setFirstVisibleRow(0);

			return that.waitForChanges(assert);
		}).then(function () {
			var aRows = oTable.getRows();

			// table calls getContexts after setFirstVisibleRow asynchronously
			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext2, "1");
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(aRows[1].getBindingContext(), oCreatedContext0, "2");
			assert.strictEqual(oCreatedContext0.isTransient(), false);

			that.expectRequest({
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 3 - Changed"}
				}, {
					"Note" : "New 3 - Changed",
					"SalesOrderID" : "44"
				})
				.expectChange("id", "44", 0)
				.expectChange("note", "New 3 - Changed", 0);

			aRows[0].getCells()[1].getBinding("value").setValue("New 3 - Changed");

			return Promise.all([
				oCreatedContext2.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext2, "1");
			assert.strictEqual(oCreatedContext2.isTransient(), false);
			assert.strictEqual(aRows[1].getBindingContext(), oCreatedContext0, "2");
			assert.strictEqual(oCreatedContext0.isTransient(), false);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (3)
	//  List binding: relative with cache
	//  Number of transient: 0
	//  Delete: Context.delete
	//  Table control: sap.ui.table.Table
	// CPOUI5UISERVICESV3-1792
	//TODO Runs unstable, probably due to use of GridTable with setFirstVisibleRow
	QUnit.skip("All pairs test for multi create (3)", function (assert) {
		var oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<t:Table id="table" rows="{path : \'BP_2_SO\', parameters : {$$ownRequest : true}}"\
			threshold="0" visibleRowCount="2">\
		<t:Column>\
			<t:template>\
				<Text id="id" text="{SalesOrderID}" />\
			</t:template>\
		</t:Column>\
		<t:Column>\
			<t:template>\
				<Text id="note" text="{Note}" />\
			</t:template>\
		</t:Column>\
	</t:Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')/BP_2_SO?$select=Note,SalesOrderID"
				+ "&$skip=0&$top=2", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding;

			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("rows");

			that.expectChange("id", ["", ""])
				.expectChange("note", ["New 3", "New 2"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 2"}
				}, {
					"Note" : "New 2",
					"SalesOrderID" : "44"
				})
				.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 3"}
				}, {
					"Note" : "New 3",
					"SalesOrderID" : "45"
				})
				.expectChange("id", ["45", "44"]);

			return Promise.all([
				oCreatedContext0.created(),
				oCreatedContext1.created(),
				oCreatedContext2.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			assert.strictEqual(oTable.getRows()[1].getBindingContext(), oCreatedContext1);

			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('44')"
				})
				.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("id", "43", 1)
				.expectChange("note", "New 1", 1);

			return Promise.all([
				oCreatedContext1.delete("$auto"),
				that.waitForChanges(assert, true)
			]);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), false);
			assert.strictEqual(aRows[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);

			that.expectChange("id", [, "43", "42"])
				.expectChange("note", [, "New 1", "First SalesOrder"]);

			oTable.setFirstVisibleRow(1);

			return that.waitForChanges(assert);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aRows[1].getBindingContext().isTransient(), undefined);
		}).then(function () {
			that.expectChange("id", ["45", "43"])
				.expectChange("note", ["New 3", "New 1"]);

			oTable.setFirstVisibleRow(0);

			return that.waitForChanges(assert);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), false);
			assert.strictEqual(aRows[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (4)
	//  List binding: relative with cache
	//  Number of transient: 1
	//  Delete: Context.delete
	//  Table control: sap.m.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (4)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect: true,
				updateGroupId: "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<Table id="table" growing="true"\
		items="{path : \'BP_2_SO\', parameters : {$$ownRequest : true}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')/BP_2_SO?$select=Note,SalesOrderID"
				+ "&$skip=0&$top=20", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("items");

			that.expectChange("id", ["", ""])
				.expectChange("note", ["New 2", "New 1"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 2"}
				}, {
					"Note" : "New 2",
					"SalesOrderID" : "44"
				})
				.expectChange("id", ["44", "43"]);

			return Promise.all([
				oCreatedContext0.created(),
				oCreatedContext1.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			//TODO: Unexpected change events for unchanged rows 1,2 -> CPOUI5UISERVICESV3-1810
			that.expectChange("id", ["", "44", "43"])
				.expectChange("note", ["New 3", "New 2", "New 1"]);

			// never persisted or deleted
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('44')"
				})
				.expectChange("id", null) // events for unresolved ODPB after deletion
				.expectChange("note", null);
			// no change event: getContexts with E.C.D. returns a diff containing one delete only

			oCreatedContext1.delete("$auto");

			return that.waitForChanges(assert);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems.length, 3);
			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(aItems[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aItems[2].getBindingContext().isTransient(), undefined);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (5)
	//  List binding: absolute
	//  Number of transient: 0
	//  Delete: Context.delete
	//  Table control: sap.m.Table
	//  Additional tests: update last, persisted: PATCH expected
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (5)", function (assert) {
		var oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<Table id="table" growing="true" growingThreshold="2"\
	items="{parameters : {$filter : \'contains(Note,\\\'SalesOrder\\\')\'},\
		path : \'/SalesOrderList\'}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Input id="note" value="{Note}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("SalesOrderList?$filter=contains(Note,'SalesOrder')"
					+ "&$select=Note,SalesOrderID&$skip=0&$top=2", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}, {
					"Note" : "Second SalesOrder",
					"SalesOrderID" : "43"
				}]
			})
			.expectChange("id", ["42", "43"])
			.expectChange("note", ["First SalesOrder", "Second SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding;

			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("items");

			that.expectChange("id", ["", ""])
				.expectChange("note", ["New 3", "New 2"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "44"
				})
				.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 2"}
				}, {
					"Note" : "New 2",
					"SalesOrderID" : "45"
				})
				.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 3"}
				}, {
					"Note" : "New 3",
					"SalesOrderID" : "46"
				})
				.expectChange("id", ["46", "45"]);

			return Promise.all([
				oCreatedContext0.created(),
				oCreatedContext1.created(),
				oCreatedContext2.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('45')"
				})
				// change event for children of the destroyed context; parent context is already
				// destroyed when formatter is called
				.expectChange("id", null)
				.expectChange("note", null)
				//TODO: Unexpected change events for unchanged rows 0,1 -> CPOUI5UISERVICESV3-1810
				.expectChange("id", ["46", "44"])
				.expectChange("note", ["New 3", "New 1"]);

			return Promise.all([
				oCreatedContext1.delete("$auto"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('46')",
					payload : {"Note" : "New 3 - Changed"}
				}, {
					"Note" : "New 3 - Changed",
					"SalesOrderID" : "46"
				})
				.expectChange("note", "New 3 - Changed", 0);

			oTable.getItems()[0].getCells()[1].getBinding("value").setValue("New 3 - Changed");

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems.length, 2, "growingThreshold=2");
			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), false);
			assert.strictEqual(aItems[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
		}).then(function () {
			that.expectChange("id", [,, "42", "43"])
				.expectChange("note", [,, "First SalesOrder", "Second SalesOrder"]);

			that.oView.byId("table-trigger").firePress();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("SalesOrderList?$filter=(contains(Note,'SalesOrder'))"
					+ "and not(SalesOrderID eq '46' or SalesOrderID eq '44')"
					+ "&$select=Note,SalesOrderID&$skip=2&$top=2", {
					"value" : []
				});

			that.oView.byId("table-trigger").firePress();

			return that.waitForChanges(assert);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems.length, 4);
			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), false);
			assert.strictEqual(aItems[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aItems[2].getBindingContext().isTransient(), undefined);
			assert.strictEqual(aItems[3].getBindingContext().isTransient(), undefined);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (6)
	//  List binding: absolute
	//  Number of transient: 1
	//  Delete: Context.refresh(bAllowRemoval=true)
	//  Table control: sap.ui.table.Table
	// CPOUI5UISERVICESV3-1792
	//TODO Runs unstable, probably due to use of GridTable with setFirstVisibleRow
	QUnit.skip("All pairs test for multi create (6)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<t:Table id="table" rows="{/SalesOrderList}" visibleRowCount="2">\
	<t:Column>\
		<t:template>\
			<Text id="id" text="{SalesOrderID}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="note" text="{Note}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			that = this;

		this.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=102", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("rows");

			that.expectChange("note", ["New 2", "New 1"])
				.expectChange("id", ["", ""]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 2"}
				}, {
					"Note" : "New 2",
					"SalesOrderID" : "44"
				})
				.expectChange("id", ["44", "43"]);

			return Promise.all([
				oCreatedContext0.created(),
				oCreatedContext1.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectChange("id", ["", "44"])
				.expectChange("note", ["New 3", "New 2"]);

			// never persisted or deleted
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			assert.strictEqual(oTable.getRows()[1].getBindingContext(), oCreatedContext1);

			that.expectRequest("SalesOrderList?$select=Note,SalesOrderID&"
						+ "$filter=SalesOrderID%20eq%20'44'", {
					"value" : []
				})
				.expectChange("id", null) // for the deleted row
				.expectChange("note", null)
				.expectChange("id", "43", 1)
				.expectChange("note", "New 1", 1);

			return Promise.all([
				oCreatedContext1.refresh("$auto", true/*bAllowRemoval*/),
				that.waitForChanges(assert, true)
			]);
		}).then(function () {
			that.expectChange("id", [, "43", "42"])
				.expectChange("note", [, "New 1", "First SalesOrder"]);

			oTable.setFirstVisibleRow(1);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("id", ["", "43"])
				.expectChange("note", ["New 3", "New 1"]);

			oTable.setFirstVisibleRow(0);

			return that.waitForChanges(assert);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(aRows[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (7)
	//  List binding: relative without cache
	//  Number of transient: 3
	//  Delete: ODataModel.resetChanges
	//  Table control: sap.ui.table.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (7)", function (assert) {
		var oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect: true,
				updateGroupId: "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<t:Table id="table" rows="{BP_2_SO}" visibleRowCount="2">\
		<t:Column>\
			<t:template>\
				<Text id="id" text="{SalesOrderID}" />\
			</t:template>\
		</t:Column>\
		<t:Column>\
			<t:template>\
				<Text id="note" text="{Note}" />\
			</t:template>\
		</t:Column>\
	</t:Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')?$select=BusinessPartnerID"
				+ "&$expand=BP_2_SO($select=Note,SalesOrderID)", {
				"BusinessPartnerID" : "4711",
				"BP_2_SO" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}, { // Second sales order to avoid an empty row in table after resetChanges();
					 // an empty row results in not deterministic change event, e.g. id[null] = null
					"Note" : "Second SalesOrder",
					"SalesOrderID" : "43"
				}]
			})
			.expectChange("id", ["42", "43"])
			.expectChange("note", ["First SalesOrder", "Second SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding;

			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("rows");

			that.expectChange("id", ["", ""])
				.expectChange("note", ["New 3", "New 2"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("id", ["42", "43"])
				.expectChange("note", ["First SalesOrder", "Second SalesOrder"]);

			oModel.resetChanges();

			return Promise.all([
				oCreatedContext0.created().catch(function () {/* avoid uncaught (in promise) */}),
				oCreatedContext1.created().catch(function () {/* avoid uncaught (in promise) */}),
				oCreatedContext2.created().catch(function () {/* avoid uncaught (in promise) */}),
				that.waitForChanges(assert, true)
			]);
			// scrolling not possible: only one entry
		});
	});


	//*********************************************************************************************
	// Scenario: All pairs test for multi create (8)
	//  List binding: relative with cache
	//  Number of transient: 2
	//  Delete: ODataListBinding.resetChanges
	//  Table control: sap.m.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (8)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<Table id="table" growing="true"\
		items="{path : \'BP_2_SO\', parameters : {$$ownRequest : true}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')/BP_2_SO?$select=Note,SalesOrderID"
				+ "&$skip=0&$top=20", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("items");

			that.expectChange("id", "", 0)
				.expectChange("note", "New 1", 0);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectChange("id", "43", 0);

			return Promise.all([
				oCreatedContext0.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			//TODO: Unexpected change events for unchanged row 2 -> CPOUI5UISERVICESV3-1810
			that.expectChange("id", ["", "", "43"])
				.expectChange("note", ["New 3", "New 2", "New 1"]);

			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems.length, 4);
			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(aItems[1].getBindingContext(), oCreatedContext1);
			assert.strictEqual(oCreatedContext1.isTransient(), true);
			assert.strictEqual(aItems[2].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aItems[3].getBindingContext().isTransient(), undefined);

			// no change event: getContexts with E.C.D. returns a diff containing one delete only

			oBinding.resetChanges();

			return Promise.all([
				that.checkCanceled(assert, oCreatedContext1.created()),
				that.checkCanceled(assert, oCreatedContext2.created())
			]);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems.length, 2);
			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aItems[1].getBindingContext().isTransient(), undefined);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (9)
	//  List binding: relative without cache
	//  Number of transient: 3
	//  Delete: Context.delete
	//  Table control: sap.m.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (9)", function (assert) {
		var oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<Table id="table" growing="true" items="{BP_2_SO}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="id" text="{SalesOrderID}" />\
			<Text id="note" text="{Note}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')?$select=BusinessPartnerID"
				+ "&$expand=BP_2_SO($select=Note,SalesOrderID)", {
				"BusinessPartnerID" : "4711",
				"BP_2_SO" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding;

			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("items");

			that.expectChange("id", ["", "", ""])
				.expectChange("note", ["New 3", "New 2", "New 1"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			// no change event: getContexts with E.C.D. returns a diff containing one delete only

			return Promise.all([
				oCreatedContext1.created().catch(function () {/* avoid uncaught (in promise) */}),
				oCreatedContext1.delete("$auto"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(aItems[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), true);
			assert.strictEqual(aItems[2].getBindingContext().isTransient(), undefined);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (10)
	//  List binding: absolute
	//  Number of transient: 3
	//  Delete: ODataListBinding.resetChanges
	//  Table control: sap.ui.table.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (10)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<t:Table id="table" rows="{/SalesOrderList}" visibleRowCount="2">\
	<t:Column>\
		<t:template>\
			<Text id="id" text="{SalesOrderID}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="note" text="{Note}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			that = this;

		this.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=102", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}, { // Second sales order to avoid an empty row in table after resetChanges();
					// an empty row results in not deterministic change event, e.g. id[null] = null
					"Note" : "Second SalesOrder",
					"SalesOrderID" : "41"
				}]
			})
			.expectChange("id", ["42", "41"])
			.expectChange("note", ["First SalesOrder", "Second SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("rows");

			that.expectChange("note", ["New 3", "New 2"])
				.expectChange("id", ["", ""]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("id", ["42", "41"])
				.expectChange("note", ["First SalesOrder", "Second SalesOrder"]);

			oBinding.resetChanges();

			return Promise.all([
				oCreatedContext0.created().catch(function () {/* avoid uncaught (in promise) */}),
				oCreatedContext1.created().catch(function () {/* avoid uncaught (in promise) */}),
				oCreatedContext2.created().catch(function () {/* avoid uncaught (in promise) */}),
				that.waitForChanges(assert, true)
			]);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext().isTransient(), undefined);
			assert.strictEqual(aRows[1].getBindingContext().isTransient(), undefined);
		});
		// scrolling not possible: only one entry
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (11)
	//  List binding: relative without cache
	//  Number of transient: 2
	//  Delete: ODataListBinding.resetChanges
	//  Table control: sap.m.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (11)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<Table id="table" growing="true" items="{BP_2_SO}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')?$select=BusinessPartnerID"
				+ "&$expand=BP_2_SO($select=Note,SalesOrderID)", {
				"BusinessPartnerID" : "4711",
				"BP_2_SO" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("items");

			that.expectChange("id", "", 0)
				.expectChange("note", "New 1", 0);

			oCreatedContext0 = oTable.getBinding("items").create({Note : "New 1"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectChange("id", "43", 0);

			return Promise.all([
				oCreatedContext0.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			//TODO: Unexpected change events for unchanged row 2 -> CPOUI5UISERVICESV3-1810
			that.expectChange("id", ["", "", "43"])
				.expectChange("note", ["New 3", "New 2", "New 1"]);

			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			// no change event: getContexts with E.C.D. returns a diff containing two deletes only
			oBinding.resetChanges();

			return Promise.all([
				that.checkCanceled(assert, oCreatedContext1.created()),
				that.checkCanceled(assert, oCreatedContext2.created()),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aItems[1].getBindingContext().isTransient(), undefined);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (12)
	//  List binding: relative with cache
	//  Number of transient: 3
	//  Delete: ODataModel.resetChanges
	//  Table control: sap.m.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (12)", function (assert) {
		var oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<Table id="table" growing="true"\
		items="{path : \'BP_2_SO\', parameters : {$$ownRequest : true}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')/BP_2_SO?$select=Note,SalesOrderID"
				+ "&$skip=0&$top=20", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding;

			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("items");

			that.expectChange("id", ["", "", ""])
				.expectChange("note", ["New 3", "New 2", "New 1"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems.length, 4);
			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(aItems[1].getBindingContext(), oCreatedContext1);
			assert.strictEqual(oCreatedContext1.isTransient(), true);
			assert.strictEqual(aItems[2].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), true);
			assert.strictEqual(aItems[3].getBindingContext().isTransient(), undefined);

			// no change event: getContexts with E.C.D. returns a diff containing three deletes only
			oModel.resetChanges();

			return Promise.all([
				that.checkCanceled(assert, oCreatedContext0.created()),
				that.checkCanceled(assert, oCreatedContext1.created()),
				that.checkCanceled(assert, oCreatedContext2.created())
			]);
		}).then(function () {
			assert.strictEqual(oTable.getItems()[0].getBindingContext().isTransient(), undefined);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (13)
	//  List binding: absolute
	//  Number of transient: 2
	//  Delete: ODataModel.resetChanges
	//  Table control: sap.ui.table.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (13)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<t:Table id="table" rows="{/SalesOrderList}" visibleRowCount="2">\
	<t:Column>\
		<t:template>\
			<Text id="id" text="{SalesOrderID}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="note" text="{Note}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			that = this;

		this.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=102", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("rows");

			that.expectChange("note", ["New 1", "First SalesOrder"])
				.expectChange("id", ["", "42"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectChange("id", "43", 0);

			return Promise.all([
				oCreatedContext0.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectChange("id", ["", ""])
				.expectChange("note", ["New 3", "New 2"]);

			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("note", ["New 1", "First SalesOrder"])
				.expectChange("id", ["43", "42"]);

			oModel.resetChanges();

			return Promise.all([
				oCreatedContext1.created().catch(function () {/* avoid uncaught (in promise) */}),
				oCreatedContext2.created().catch(function () {/* avoid uncaught (in promise) */}),
				that.waitForChanges(assert, true)
			]);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aRows[1].getBindingContext().isTransient(), undefined);
		});
		// scrolling not possible: only two entries
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (14)
	//  List binding: relative without cache
	//  Number of transient: 1
	//  Delete: Context.delete
	//  Table control: sap.ui.table.Table
	// CPOUI5UISERVICESV3-1792
	//TODO Runs unstable, probably due to use of GridTable with setFirstVisibleRow
	QUnit.skip("All pairs test for multi create (14)", function (assert) {
		var oBinding,
			oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'4711\')}">\
	<t:Table id="table" rows="{BP_2_SO}" visibleRowCount="2">\
		<t:Column>\
			<t:template>\
				<Text id="id" text="{SalesOrderID}" />\
			</t:template>\
		</t:Column>\
		<t:Column>\
			<t:template>\
				<Text id="note" text="{Note}" />\
			</t:template>\
		</t:Column>\
	</t:Table>\
</FlexBox>',
			that = this;

		this.expectRequest("BusinessPartnerList('4711')?$select=BusinessPartnerID"
					+ "&$expand=BP_2_SO($select=Note,SalesOrderID)", {
				"BusinessPartnerID" : "4711",
				"BP_2_SO" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("rows");

			that.expectChange("id", ["", ""])
				.expectChange("note", ["New 2", "New 1"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectRequest({
					method : "POST",
					url : "BusinessPartnerList('4711')/BP_2_SO",
					payload : {"Note" : "New 2"}
				}, {
					"Note" : "New 2",
					"SalesOrderID" : "44"
				})
				.expectChange("id", "44", 0)
				.expectChange("id", "43", 1);

			return Promise.all([
				oCreatedContext0.created(),
				oCreatedContext1.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectChange("id", ["", "44"])
				.expectChange("note", ["New 3", "New 2"]);

			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "SalesOrderList('44')"
				})
				.expectChange("id", null)
				.expectChange("note", null)
				.expectChange("id", "43", 1)
				.expectChange("note", "New 1", 1);

			return Promise.all([
				oCreatedContext1.delete("$auto"),
				that.waitForChanges(assert, true)
			]);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(aRows[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
		}).then(function () {
			that.expectChange("id", [, "43", "42"])
				.expectChange("note", [, "New 1", "First SalesOrder"]);

			oTable.setFirstVisibleRow(1);

			return that.waitForChanges(assert);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aRows[1].getBindingContext().isTransient(), undefined);
		}).then(function () {
			that.expectChange("id", ["", "43"])
				.expectChange("note", ["New 3", "New 1"]);

			oTable.setFirstVisibleRow(0);

			return that.waitForChanges(assert);
		}).then(function () {
			var aRows = oTable.getRows();

			assert.strictEqual(aRows.length, 2);
			assert.strictEqual(aRows[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), true);
			assert.strictEqual(aRows[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
		});
	});

	//*********************************************************************************************
	// Scenario: All pairs test for multi create (15)
	//  List binding: absolute
	//  Number of transient: 0
	//  Delete: Context.refresh(bAllowRemoval=true)
	//  Table control: sap.m.Table
	// CPOUI5UISERVICESV3-1792
	QUnit.test("All pairs test for multi create (15)", function (assert) {
		var oCreatedContext0,
			oCreatedContext1,
			oCreatedContext2,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<Table id="table" growing="true" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=20", {
				"value" : [{
					"Note" : "First SalesOrder",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("id", ["42"])
			.expectChange("note", ["First SalesOrder"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding;

			oTable = that.oView.byId("table");
			oBinding = oTable.getBinding("items");

			that.expectChange("id", ["", "", ""])
				.expectChange("note", ["New 3", "New 2", "New 1"]);

			oCreatedContext0 = oBinding.create({Note : "New 1"}, true);
			oCreatedContext1 = oBinding.create({Note : "New 2"}, true);
			oCreatedContext2 = oBinding.create({Note : "New 3"}, true);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 1"}
				}, {
					"Note" : "New 1",
					"SalesOrderID" : "43"
				})
				.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 2"}
				}, {
					"Note" : "New 2",
					"SalesOrderID" : "44"
				})
				.expectRequest({
					batchNo : 1,
					method : "POST",
					url : "SalesOrderList",
					payload : {"Note" : "New 3"}
				}, {
					"Note" : "New 3",
					"SalesOrderID" : "45"
				})
				.expectChange("id", ["45", "44", "43"]);

			return Promise.all([
				oCreatedContext0.created(),
				oCreatedContext1.created(),
				oCreatedContext2.created(),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("SalesOrderList?$select=Note,SalesOrderID&"
					+ "$filter=SalesOrderID%20eq%20'44'", {
					"value" : []
				})
				//TODO: Unexpected change events for unchanged rows 0,1 -> CPOUI5UISERVICESV3-1810
				.expectChange("id", ["45", "43"])
				.expectChange("note", ["New 3", "New 1"]);

			return Promise.all([
				oCreatedContext1.refresh("$auto", true/*bAllowRemoval*/),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			var aItems = oTable.getItems();

			assert.strictEqual(aItems.length, 3);
			assert.strictEqual(aItems[0].getBindingContext(), oCreatedContext2);
			assert.strictEqual(oCreatedContext2.isTransient(), false);
			assert.strictEqual(aItems[1].getBindingContext(), oCreatedContext0);
			assert.strictEqual(oCreatedContext0.isTransient(), false);
			assert.strictEqual(aItems[2].getBindingContext().isTransient(), undefined);
		});
	});

	//*********************************************************************************************
	// Scenario: Create a business partner w/o key properties, enter an address (complex property),
	// then submit the batch
	QUnit.test("Create with default value in a complex property", function (assert) {
		var oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			sView = '\
<Table id="table" items="{/BusinessPartnerList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Input id="city" value="{Address/City}" />\
		<Input id="longitude" value="{Address/GeoLocation/Longitude}" />\
	</ColumnListItem>\
</Table>',

			that = this;

		this.expectRequest("BusinessPartnerList?$select=Address/City,Address/GeoLocation/Longitude,"
					+ "BusinessPartnerID&$skip=0&$top=100", {
				"value" : [{
					"Address" : {
						"City" : "Walldorf",
						"GeoLocation" : null
					},
					"BusinessPartnerID" : "42"
				}]
			})
			.expectChange("city", ["Walldorf"])
			.expectChange("longitude", [null]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectChange("city", ["", "Walldorf"])
				.expectChange("longitude", ["0.000000000000", null]);

			oTable = that.oView.byId("table");
			oTable.getBinding("items").create();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("city", "Heidelberg", 0)
				.expectChange("longitude", "8.700000000000", 0);

			oTable.getItems()[0].getCells()[0].getBinding("value").setValue("Heidelberg");
			oTable.getItems()[0].getCells()[1].getBinding("value").setValue("8.7");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "BusinessPartnerList",
					payload : {
						"Address" : {
							"City" : "Heidelberg",
							"GeoLocation" : {"Longitude" : "8.7"}
						}
					}
				}, {
					"Address" : {
						"City" : "Heidelberg",
						"GeoLocation" : {"Longitude" : "8.69"}
					},
					"BusinessPartnerID" : "43"
				})
				// Note: This additional request will be eliminated by CPOUI5UISERVICESV3-1436
				.expectRequest("BusinessPartnerList('43')?$select=Address/City,"
						+ "Address/GeoLocation/Longitude,BusinessPartnerID", {
					"Address" : {
						"City" : "Heidelberg",
						"GeoLocation" : {"Longitude" : "8.69"}
					},
					"BusinessPartnerID" : "43"
				})
				.expectChange("longitude", "8.690000000000", 0);

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Create a sales order line item, enter a quantity, then submit the batch. Expect the
	// quantity unit to be sent, too.
	QUnit.test("Create with default value in a currency/unit", function (assert) {
		var sView = '\
<Table id="table" items="{/SalesOrderList(\'42\')/SO_2_SOITEM}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Input id="quantity" value="{Quantity}" />\
		<Text id="unit" text="{QuantityUnit}" />\
	</ColumnListItem>\
</Table>',
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			oTable,
			that = this;

		this.expectRequest("SalesOrderList('42')/SO_2_SOITEM?$select=ItemPosition,Quantity,"
			+ "QuantityUnit,SalesOrderID&$skip=0&$top=100", {
				"value" : [{
					"SalesOrderID" : "42",
					"ItemPosition" : "0010",
					"Quantity" : "1.000",
					"QuantityUnit" : "DZ"
				}]
			})
			.expectChange("quantity", ["1.000"])
			.expectChange("unit", ["DZ"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectChange("quantity", [null, "1.000"])
				.expectChange("unit", ["EA", "DZ"]);

			oTable = that.oView.byId("table");
			oTable.getBinding("items").create();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("quantity", "2.000", 0);

			oTable.getItems()[0].getCells()[0].getBinding("value").setValue("2.000");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "SalesOrderList('42')/SO_2_SOITEM",
					payload : {
						"Quantity" : "2.000",
						"QuantityUnit" : "EA"
					}
				}, {
					"SalesOrderID" : "42",
					"ItemPosition" : "0020",
					"Quantity" : "2.000",
					"QuantityUnit" : "EA"
				})
				// Note: This additional request will be eliminated by CPOUI5UISERVICESV3-1436
				.expectRequest("SalesOrderList('42')/SO_2_SOITEM(SalesOrderID='42',"
						+ "ItemPosition='0020')?$select=ItemPosition,Quantity,QuantityUnit,"
						+ "SalesOrderID", {
					"SalesOrderID" : "42",
					"ItemPosition" : "0020",
					"Quantity" : "2.000",
					"QuantityUnit" : "EA"
				});

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Failure when creating a sales order line item. Observe the message.
	QUnit.test("Create error", function (assert) {
		var oError = new Error("Failure"),
			oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/SalesOrderList(\'42\')}">\
	<Table id="table" items="{SO_2_SOITEM}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text text="{ItemPosition}" />\
			<Input value="{ProductID}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('42')?$select=SalesOrderID"
			+ "&$expand=SO_2_SOITEM($select=ItemPosition,ProductID,SalesOrderID)", {
				"SalesOrderID" : "42",
				"SO_2_SOITEM" : []
			});

		return this.createView(assert, sView, oModel).then(function () {
			that.oLogMock.expects("error")
				.withExactArgs("POST on 'SalesOrderList('42')/SO_2_SOITEM' failed; "
					+ "will be repeated automatically", sinon.match("Failure"),
					"sap.ui.model.odata.v4.ODataParentBinding");
			oError.error = {
				code : "CODE",
				message : "Enter a product ID",
				target : "ProductID"
			};
			that.expectRequest({
					method : "POST",
					url : "SalesOrderList('42')/SO_2_SOITEM",
					payload : {}
				}, oError)
				.expectMessages([{
					code : "CODE",
					message : "Enter a product ID",
					persistent : true,
					target : "/SalesOrderList('42')/SO_2_SOITEM($uid=...)/ProductID",
					technical : true,
					type : "Error"
				}]);

			return Promise.all([
				that.oView.byId("table").getBinding("items").create(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			return that.checkValueState(assert,
				that.oView.byId("table").getItems("items")[0].getCells()[1] , "Error",
				"Enter a product ID");
		});
	});

	//*********************************************************************************************
	// Scenario: Read a sales order line item via a navigation property, enter an invalid quantity.
	// Expect an error response with a bound and unbound error in the details, and that existing
	// messages are not deleted.
	// The navigation property is necessary so that read path and patch path are different.
	QUnit.test("Read a sales order line item, enter an invalid quantity", function (assert) {
		var sView = '\
<FlexBox binding="{\
		path : \'/BusinessPartnerList(\\\'1\\\')/BP_2_SO(\\\'42\\\')/SO_2_SOITEM(\\\'0010\\\')\',\
		parameters : {$select : \'Messages\'}}">\
	<Input id="quantity" value="{Quantity}"/>\
	<Text id="unit" text="{QuantityUnit}"/>\
</FlexBox>',
			oError = new Error("Error occurred while processing the request"),
			oExpectedMessage = {
				"code" : "23",
				"message" : "Enter a minimum quantity of 2",
				"persistent" : false,
				"target" : "/BusinessPartnerList('1')/BP_2_SO('42')/SO_2_SOITEM('0010')/Quantity",
				"technical" : false,
				"type" : "Warning"
			},
			oModel = createSalesOrdersModel({
				autoExpandSelect : true
			}),
			that = this;

		oError.error = {
			"code" : "top",
			"message" : "Error occurred while processing the request",
			"details" : [{
				"code" : "bound",
				"message" : "Value must be greater than 0",
				"@Common.longtextUrl" : "../Messages(1)/LongText",
				"@Common.numericSeverity" : 4,
				"target" : "Quantity"
			}, {
				"code" : "unbound",
				"message" : "Some unbound warning",
				"@Common.numericSeverity" : 3
			}]
		};

		this.expectRequest("BusinessPartnerList('1')/BP_2_SO('42')/SO_2_SOITEM('0010')"
			+ "?$select=ItemPosition,Messages,Quantity,QuantityUnit,SalesOrderID", {
				"SalesOrderID" : "42",
				"ItemPosition" : "0010",
				"Quantity" : "1.000",
				"QuantityUnit" : "DZ",
				"Messages" : [{
					"code" : "23",
					"message" : "Enter a minimum quantity of 2",
					"numericSeverity" : 3,
					"target" : "Quantity"
				}]
			})
			.expectChange("quantity", "1.000")
			.expectChange("unit", "DZ")
			.expectMessages([oExpectedMessage]);

		return this.createView(assert, sView, oModel).then(function () {

			that.oLogMock.expects("error").twice() // TODO twice?
				.withExactArgs("Failed to update path /BusinessPartnerList('1')/BP_2_SO('42')"
					+ "/SO_2_SOITEM('0010')/Quantity",
					sinon.match(oError.message), "sap.ui.model.odata.v4.ODataPropertyBinding");
			that.expectChange("quantity", "0.000")
				.expectRequest({
						method : "PATCH",
						url : "SalesOrderList('42')/SO_2_SOITEM('0010')",
						payload : {
							"Quantity" : "0.000",
							"QuantityUnit" : "DZ"
						}
					},
					oError)
				.expectMessages([
					oExpectedMessage, {
						"code" : "top",
						"message" : "Error occurred while processing the request",
						"persistent" : true,
						"target" : "",
						"technical" : true,
						"type" : "Error"
					}, {
						"code" : "unbound",
						"message" : "Some unbound warning",
						"persistent" : true,
						"target" : "",
						"type" : "Warning"
					}, {
						"code" : "bound",
						"descriptionUrl" : sSalesOrderService + "Messages(1)/LongText",
						"message" : "Value must be greater than 0",
						"persistent" : true,
						"target" :
							"/BusinessPartnerList('1')/BP_2_SO('42')/SO_2_SOITEM('0010')/Quantity",
						"type" : "Error"
					}]);

			that.oView.byId("quantity").getBinding("value").setValue("0.000");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Modify two properties of a sales order, then submit the batch
	QUnit.test("Merge PATCHes", function (assert) {
		var sEtag = "ETag",
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			sView = '\
<FlexBox binding="{/SalesOrderList(\'42\')}">\
	<Input id="note" value="{Note}"/>\
	<Input id="amount" value="{GrossAmount}"/>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('42')?$select=GrossAmount,Note,SalesOrderID", {
				"@odata.etag" : sEtag,
				"GrossAmount" : "1000.00",
				"Note" : "Note",
				"SalesOrderID" : "42"
			})
			.expectChange("note", "Note")
			.expectChange("amount", "1,000.00");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : sEtag},
					payload : {
						GrossAmount : "1234.56",
						Note : "Changed Note"
					}
				}, {
					GrossAmount : "1234.56",
					Note : "Changed Note From Server"
				})
				.expectChange("amount", "1,234.56")
				.expectChange("note", "Changed Note")
				.expectChange("note", "Changed Note From Server");

			that.oView.byId("amount").getBinding("value").setValue("1234.56");
			that.oView.byId("note").getBinding("value").setValue("Changed Note");

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Merge PATCHes for different entities even if there are other changes in between
	QUnit.test("Merge PATCHes for different entities", function (assert) {
		var oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			sView = '\
<Table id="table" items="{/SalesOrderList}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Input id="amount" value="{GrossAmount}"/>\
		<Input id="note" value="{Note}"/>\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest(
			"SalesOrderList?$select=GrossAmount,Note,SalesOrderID&$skip=0&$top=100", {
				value : [{
					"@odata.etag" : "ETag0",
					"GrossAmount" : "1000.00",
					"Note" : "Note0",
					"SalesOrderID" : "41"
				},{
					"@odata.etag" : "ETag1",
					"GrossAmount" : "150.00",
					"Note" : "Note1",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("amount", ["1,000.00", "150.00"])
			.expectChange("note", ["Note0", "Note1"]);

		return this.createView(assert, sView, oModel).then(function () {
			var aTableItems = that.oView.byId("table").getItems(),
				oBindingAmount0 = aTableItems[0].getCells()[0].getBinding("value"),
				oBindingAmount1 = aTableItems[1].getCells()[0].getBinding("value"),
				oBindingNote0 = aTableItems[0].getCells()[1].getBinding("value"),
				oBindingNote1 = aTableItems[1].getCells()[1].getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('41')",
					headers : {"If-Match" : "ETag0"},
					payload : {
						GrossAmount : "123.45",
						Note : "Note02"
					}
				}, {
					GrossAmount : "123.45",
					Note : "Note02"
				})
				.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag1"},
					payload : {
						GrossAmount : "456.78",
						Note : "Note12"
					}
				}, {
					GrossAmount : "456.78",
					Note : "Note12"
				})
				.expectChange("amount", ["123.45", "456.78"])
				.expectChange("note", ["Note01", "Note11"])
				.expectChange("note", ["Note02", "Note12"]);

			// Code under test
			oBindingAmount0.setValue("123.45");
			oBindingAmount1.setValue("456.78");
			oBindingNote0.setValue("Note01");
			oBindingNote1.setValue("Note11");
			oBindingNote1.setValue("Note12");
			oBindingNote0.setValue("Note02");

			return Promise.all([
				oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Error response for a change set without contend-ID
	// Without target $<content-ID> in the error response we can not assign the error to the
	// right request -> all requests in the change set are rejected with the same error;
	// the error is logged for each request in the change set, but it is reported only once to
	// the message model
	QUnit.test("Error response for a change set w/o content-ID", function (assert) {
		var oError = new Error("Failure"),
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			sView = '\
<Table id="table" items="{/SalesOrderList}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Input id="amount" value="{GrossAmount}"/>\
	</ColumnListItem>\
</Table>',
			that = this;

		oError.errorResponse = {
			headers : {
				"Content-Type" : "application/json;odata.metadata=minimal;charset=utf-8"
			},
			responseText : '{"error":{"code":"CODE","message":"Value 4.22 not allowed"}}',
			status : 400,
			statusText : "Bad Request"
		};

		this.expectRequest(
			"SalesOrderList?$select=GrossAmount,SalesOrderID&$skip=0&$top=100", {
				value : [{
					"@odata.etag" : "ETag0",
					"GrossAmount" : "4.1",
					"SalesOrderID" : "41"
				},{
					"@odata.etag" : "ETag1",
					"GrossAmount" : "4.2",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("amount", ["4.10", "4.20"]);

		return this.createView(assert, sView, oModel).then(function () {
			var aTableItems = that.oView.byId("table").getItems(),
				oBindingAmount0 = aTableItems[0].getCells()[0].getBinding("value"),
				oBindingAmount1 = aTableItems[1].getCells()[0].getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('41')",
					headers : {"If-Match" : "ETag0"},
					payload : {
						GrossAmount : "4.11"
					}
				}, /*not relevant as $batch uses oError.errorResponse for response*/undefined)
				.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag1"},
					payload : {
						GrossAmount : "4.22"
					}
				}, oError)
				.expectChange("amount", ["4.11", "4.22"])
				.expectMessages([{
					"code" : "CODE",
					"message" : "Value 4.22 not allowed",
					"persistent" : true,
					"target" : "",
					"technical" : true,
					"type" : "Error"
				}]);

			that.oLogMock.expects("error")
				.withExactArgs("Failed to update path /SalesOrderList('41')/GrossAmount",
					sinon.match("Value 4.22 not allowed"),
					"sap.ui.model.odata.v4.ODataPropertyBinding");
			that.oLogMock.expects("error")
				.withExactArgs("Failed to update path /SalesOrderList('42')/GrossAmount",
					sinon.match("Value 4.22 not allowed"),
					"sap.ui.model.odata.v4.ODataPropertyBinding");

			// Code under test
			oBindingAmount0.setValue("4.11");
			oBindingAmount1.setValue("4.22");

			return Promise.all([
				oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Modify a property while an update request is not yet resolved. Determine the ETag
	// as late as possible
	QUnit.test("Lazy determination of ETag while PATCH", function (assert) {
		var oBinding,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			fnRespond,
			oSubmitBatchPromise,
			sView = '\
<FlexBox binding="{/SalesOrderList(\'42\')}">\
	<Input id="note" value="{Note}"/>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('42')?$select=Note,SalesOrderID", {
				"@odata.etag" : "ETag0",
				"Note" : "Note",
				"SalesOrderID" : "42"
			})
			.expectChange("note", "Note");

		return this.createView(assert, sView, oModel).then(function () {
			oBinding = that.oView.byId("note").getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag0"},
					payload : {Note : "Changed Note"}
				}, new Promise(function (resolve, reject) {
					fnRespond = resolve.bind(null, {
						"@odata.etag" : "ETag1",
						Note : "Changed Note From Server"
					});
				}))
				.expectChange("note", "Changed Note");

			oBinding.setValue("Changed Note");
			oSubmitBatchPromise = that.oModel.submitBatch("update");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag1"},
					payload : {Note : "Changed Note while $batch is running"}
				}, {
					"@odata.etag" : "ETag2",
					Note : "Changed Note From Server - 2"
				})
				.expectChange("note", "Changed Note while $batch is running")
				// TODO as long as there are PATCHes in the queue, don't overwrite user input
				.expectChange("note", "Changed Note From Server")
				.expectChange("note", "Changed Note From Server - 2");

			oBinding.setValue("Changed Note while $batch is running");

			fnRespond();

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert),
				oSubmitBatchPromise
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Execute a bound action while an update request for the entity is not yet
	// resolved. Determine the ETag as late as possible.
	QUnit.test("Lazy determination of ETag while ODataContextBinding#execute", function (assert) {
		var sAction = "com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee",
			oBinding,
			oExecutePromise,
			oModel = createTeaBusiModel({updateGroupId : "update"}),
			fnRespond,
			oSubmitBatchPromise,
			sView = '\
<FlexBox binding="{/EMPLOYEES(\'1\')}">\
	<Input id="name" value="{Name}" />\
	<FlexBox id="action" \
			binding="{' + sAction + '(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="teamId" text="{TEAM_ID}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('1')", {
				"Name" : "Jonathan Smith",
				"@odata.etag" : "ETag0"
			})
			.expectChange("name", "Jonathan Smith")
			.expectChange("teamId", null);

		return this.createView(assert, sView, oModel).then(function () {
			oBinding = that.oView.byId("name").getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "EMPLOYEES('1')",
					headers : {"If-Match" : "ETag0"},
					payload : {Name : "Jonathan Mueller"}
				}, new Promise(function (resolve, reject) {
					fnRespond = resolve.bind(null, {
						"@odata.etag" : "ETag1",
						Name : "Jonathan Mueller"
					});
				}))
				.expectChange("name", "Jonathan Mueller"); // triggered by setValue

			oBinding.setValue("Jonathan Mueller");

			oSubmitBatchPromise = that.oModel.submitBatch("update");

			return that.waitForChanges(assert);
		}).then(function () {
			oExecutePromise = that.oView.byId("action").getObjectBinding()
				.setParameter("TeamID", "42").execute("update");

			fnRespond();

			return Promise.all([
				oSubmitBatchPromise,
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					headers : {"If-Match" : "ETag1"},
					url : "EMPLOYEES('1')/" + sAction,
					payload : {"TeamID" : "42"}
				}, {
					"TEAM_ID" : "42"
				}).expectChange("teamId", "42");

			return Promise.all([
				that.oModel.submitBatch("update"),
				oExecutePromise,
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Modify a property while an update request is not yet resolved. The second PATCH
	// request must wait for the first one to finish and use the eTag returned in its response.
	// A third PATCH request which also waits goes into a separate change set when submitBatch
	// has been called before it was created (CPOUI5UISERVICESV3-1531).
	QUnit.test("PATCH entity, two subsequent PATCHes on this entity wait", function (assert) {
		var oBinding,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			aPromises = [],
			fnRespond,
			sView = '\
<FlexBox binding="{/SalesOrderList(\'42\')}">\
	<Input id="note" value="{Note}"/>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('42')?$select=Note,SalesOrderID", {
				"@odata.etag" : "ETag0",
				"Note" : "Note",
				"SalesOrderID" : "42"
			})
			.expectChange("note", "Note");

		return this.createView(assert, sView, oModel).then(function () {
			oBinding = that.oView.byId("note").getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag0"},
					payload : {Note : "Changed Note"}
				}, new Promise(function (resolve, reject) {
					fnRespond = resolve.bind(null, {
						"@odata.etag" : "ETag1",
						Note : "Changed Note From Server"
					});
				}))
				.expectChange("note", "Changed Note");

			oBinding.setValue("Changed Note");
			aPromises.push(that.oModel.submitBatch("update"));

			return that.waitForChanges(assert);
		}).then(function () {
			var oMetaModel = oModel.getMetaModel(),
				fnFetchObject = oMetaModel.fetchObject,
				oMetaModelMock = that.mock(oMetaModel);

			that.expectChange("note", "(1) Changed Note while $batch is running");

			// enforce delayed creation of PATCH request for setValue: submitBatch is called
			// *before* this request is created, but the request is in the change set which is
			// the current one before the submitBatch
			oMetaModelMock.expects("fetchObject")
				.withExactArgs("/SalesOrderList/Note")
				.callsFake(function () {
					return resolveLater(fnFetchObject.bind(oMetaModel, "/SalesOrderList/Note"));
				});

			oBinding.setValue("(1) Changed Note while $batch is running");
			aPromises.push(that.oModel.submitBatch("update"));

			oMetaModelMock.restore();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("note", "(2) Changed Note while $batch is running");

			oBinding.setValue("(2) Changed Note while $batch is running");
			aPromises.push(that.oModel.submitBatch("update"));

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("note", "Changed Note From Server")
				.expectRequest({
					changeSetNo : 1,
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag1"},
					payload : {Note : "(1) Changed Note while $batch is running"}
				}, {
					"@odata.etag" : "ETag2",
					Note : "(1) Changed Note From Server - 2"
				})
				.expectRequest({
					changeSetNo : 2,
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag1"},
					payload : {Note : "(2) Changed Note while $batch is running"}
				}, {
					"@odata.etag" : "ETag2",
					Note : "(2) Changed Note From Server - 2"
				})
				.expectChange("note", "(1) Changed Note From Server - 2")
				.expectChange("note", "(2) Changed Note From Server - 2");

			fnRespond();
			aPromises.push(that.waitForChanges(assert));

			return Promise.all(aPromises);
		});
	});

	//*********************************************************************************************
	// Scenario: While update for entity1 is on the wire (request1), update both entity1 and entity2
	// in one batch (request2). Then update entity2 (request3).
	// request2 and request3 wait for request1 to return *and* apply the response to the cache;
	// the PATCHes of request2 and request3 are merged and use the ETag from the response to
	// request1.
	QUnit.test("1=PATCH e1, 2=PATCH(e1,e2), 3=PATCH e2: request sequence 1,2,3", function (assert) {
		var oBinding42,
			oBinding77,
			oModel = createSalesOrdersModel({
				autoExpandSelect : true,
				updateGroupId : "update"
			}),
			aPromises = [],
			fnRespond42,
			sView = '\
<FlexBox binding="{/SalesOrderList(\'42\')}">\
	<Input id="note42" value="{Note}"/>\
</FlexBox>\
<FlexBox binding="{/SalesOrderList(\'77\')}">\
	<Input id="note77" value="{Note}"/>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('42')?$select=Note,SalesOrderID", {
				"@odata.etag" : "42ETag0",
				"Note" : "Note42",
				"SalesOrderID" : "42"
			})
			.expectChange("note42", "Note42")
			.expectRequest("SalesOrderList('77')?$select=Note,SalesOrderID", {
				"@odata.etag" : "77ETag0",
				"Note" : "Note77",
				"SalesOrderID" : "77"
			})
			.expectChange("note77", "Note77");

		return this.createView(assert, sView, oModel).then(function () {
			oBinding42 = that.oView.byId("note42").getBinding("value");
			oBinding77 = that.oView.byId("note77").getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "42ETag0"},
					payload : {Note : "42Changed Note"}
				}, new Promise(function (resolve, reject) {
					fnRespond42 = resolve.bind(null, {
						"@odata.etag" : "42ETag1",
						Note : "42Changed Note From Server"
					});
				}))
				.expectChange("note42", "42Changed Note");

			oBinding42.setValue("42Changed Note");
			aPromises.push(that.oModel.submitBatch("update"));

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("note42", "(1) 42Changed Note while $batch is running")
				.expectChange("note77", "(1) 77Changed Note while $batch is running");

			oBinding42.setValue("(1) 42Changed Note while $batch is running");
			oBinding77.setValue("(1) 77Changed Note while $batch is running");
			aPromises.push(that.oModel.submitBatch("update"));

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("note77", "77Changed Note");

			oBinding77.setValue("77Changed Note");
			aPromises.push(that.oModel.submitBatch("update"));

			return that.waitForChanges(assert);
		}).then(function () {
			//TODO suppress change event for outdated value "42Changed Note From Server"
			that.expectChange("note42", "42Changed Note From Server")
				.expectRequest({
					changeSetNo : 1,
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "42ETag1"},
					payload : {Note : "(1) 42Changed Note while $batch is running"}
				}, {
					"@odata.etag" : "42ETag2",
					Note : "42Changed Note From Server - 1"
				})
				.expectRequest({
					changeSetNo : 1,
					method : "PATCH",
					url : "SalesOrderList('77')",
					headers : {"If-Match" : "77ETag0"},
					payload : {Note : "(1) 77Changed Note while $batch is running"}
				}, {
					"@odata.etag" : "77ETag1",
					Note : "(1) 77Changed Note From Server - 1"
				})
				.expectRequest({
					changeSetNo : 2,
					method : "PATCH",
					url : "SalesOrderList('77')",
					headers : {"If-Match" : "77ETag0"},
					payload : {Note : "77Changed Note"}
				}, {
					"@odata.etag" : "77ETag1",
					Note : "(2) 77Changed Note From Server - 1"
				})
				.expectChange("note42", "42Changed Note From Server - 1")
				.expectChange("note77", "(1) 77Changed Note From Server - 1")
				.expectChange("note77", "(2) 77Changed Note From Server - 1");

			fnRespond42();
			aPromises.push(that.waitForChanges(assert));

			return Promise.all(aPromises);
		});
	});

	//*********************************************************************************************
	// Scenario: Support of Draft: Test eventing for PATCH requests
	["update", "$auto"].forEach(function (sUpdateGroupId) {
		var sTitle = "Support of Draft: Test eventing for PATCH requests; updateGroupId = "
				+ sUpdateGroupId;

		QUnit.test(sTitle, function (assert) {
			var fnAfterPatchCompleted,
				oBatchPromise0,
				oBatchPromise1,
				oError = new Error("500 Service not available"),
				oModel = createSalesOrdersModel({
					autoExpandSelect : true,
					updateGroupId : sUpdateGroupId
				}),
				oParentBinding,
				iPatchCompleted = 0,
				iPatchSent = 0,
				fnReject,
				fnRespond,
				sView = '\
<FlexBox binding="{/SalesOrderList(\'42\')}" id="parent">\
	<Input id="lifecycleStatus" value="{LifecycleStatus}"/>\
	<Input id="note" value="{Note}"/>\
</FlexBox>',
				that = this;

			function getWaitForPatchCompletedPromise() {
				return new Promise(function (resolve) {
					fnAfterPatchCompleted = resolve;
				});
			}

			this.expectRequest("SalesOrderList('42')?$select=LifecycleStatus,Note,SalesOrderID", {
					"@odata.etag" : "ETag0",
					"LifecycleStatus" : "N",
					"Note" : "Note",
					"SalesOrderID" : "42"
				})
				.expectChange("lifecycleStatus", "N")
				.expectChange("note", "Note");

			return this.createView(assert, sView, oModel).then(function () {
				oParentBinding = that.oView.byId("parent").getElementBinding();

				oParentBinding.attachPatchCompleted(function (oEvent) {
					assert.strictEqual(oEvent.getSource(), oParentBinding);
					iPatchCompleted += 1;
					if (fnAfterPatchCompleted) {
						fnAfterPatchCompleted();
						fnAfterPatchCompleted = undefined;
					}
				});
				oParentBinding.attachPatchSent(function (oEvent) {
					assert.strictEqual(oEvent.getSource(), oParentBinding);
					iPatchSent += 1;
				});

				that.expectRequest({
						method : "PATCH",
						url : "SalesOrderList('42')",
						headers : {"If-Match" : "ETag0"},
						payload : {Note : "Changed Note"}
					}, new Promise(function (resolve, reject) {
						fnReject = reject;
					}))
					.expectChange("note", "Changed Note");

				that.oView.byId("note").getBinding("value").setValue("Changed Note");
				if (sUpdateGroupId === "update") {
					oBatchPromise0 = that.oModel.submitBatch(sUpdateGroupId).then(function () {
						assert.ok(false, "unexpected success");
					}, function () {
						assert.ok(true, "first batch failed as expected");
					});
				}

				return that.waitForChanges(assert);
			}).then(function () {
				var oPromise = getWaitForPatchCompletedPromise();

				assert.strictEqual(iPatchSent, 1, "patchSent 1");
				assert.strictEqual(iPatchCompleted, 0, "patchCompleted 0");

				// don't care about other parameters
				that.oLogMock.expects("error").withArgs("$batch failed");
				that.oLogMock.expects("error")
					.withArgs("Failed to update path /SalesOrderList('42')/Note");

				fnReject(oError);

				return oPromise;
			}).then(function () {
				assert.strictEqual(iPatchSent, 1, "patchSent 1");
				assert.strictEqual(iPatchCompleted, 1, "patchCompleted 1");

				that.expectMessages([{
						"code" : undefined,
						"message" : "500 Service not available",
						"persistent" : true,
						"target" : "",
						"technical" : true,
						"type" : "Error"
					}, {
						"code" : undefined,
						"message" : "HTTP request was not processed because $batch failed",
						"persistent" : true,
						"target" : "",
						"technical" : true,
						"type" : "Error"
					}])
					.expectChange("lifecycleStatus", "P")
					.expectRequest({
						method : "PATCH",
						url : "SalesOrderList('42')",
						headers : {"If-Match" : "ETag0"},
						payload : {
							LifecycleStatus : "P",
							Note : "Changed Note"
						}
					}, new Promise(function (resolve, reject) {
						fnRespond = resolve.bind(null, {
							"@odata.etag" : "ETag1",
							LifecycleStatus : "P",
							Note : "Changed Note From Server"
						});
					}));

				that.oView.byId("lifecycleStatus").getBinding("value").setValue("P");

				if (sUpdateGroupId === "update") {
					oBatchPromise1 = that.oModel.submitBatch(sUpdateGroupId);
				}

				return that.waitForChanges(assert);
			}).then(function () {
				var oPromise = getWaitForPatchCompletedPromise();

				assert.strictEqual(iPatchSent, 2, "patchSent 2");
				assert.strictEqual(iPatchCompleted, 1, "patchCompleted 1");

				that.expectChange("note", "Changed Note From Server");

				fnRespond();
				return Promise.all([
					oBatchPromise0,
					oBatchPromise1,
					oPromise,
					that.waitForChanges(assert)
				]);
			}).then(function () {
				assert.strictEqual(iPatchSent, 2, "patchSent 2");
				assert.strictEqual(iPatchCompleted, 2, "patchCompleted 2");
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Enable autoExpandSelect mode for an ODataContextBinding with relative
	// ODataPropertyBindings
	// The SalesOrders application does not have such a scenario.
	QUnit.test("Auto-$expand/$select: Absolute ODCB with relative ODPB", function (assert) {
		var sView = '\
<FlexBox binding="{path : \'/EMPLOYEES(\\\'2\\\')\', parameters : {$select : \'AGE,ROOM_ID\'}}">\
	<Text id="name" text="{Name}" />\
	<Text id="city" text="{LOCATION/City/CITYNAME}" />\
</FlexBox>';

		this.expectRequest("EMPLOYEES('2')?$select=AGE,ID,LOCATION/City/CITYNAME,Name,ROOM_ID", {
				"Name" : "Frederic Fall",
				"LOCATION" : {"City" : {"CITYNAME" : "Walldorf"}}
			})
			.expectChange("name", "Frederic Fall")
			.expectChange("city", "Walldorf");

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}));
	});

	//*********************************************************************************************
	// Scenario: Enable autoExpandSelect mode for an ODataContextBinding with relative
	// ODataPropertyBindings. Refreshing the view is also working.
	// The SalesOrders application does not have such a scenario.
	QUnit.test("Auto-$expand/$select: Absolute ODCB, refresh", function (assert) {
		var sView = '\
<FlexBox id="form" binding="{path : \'/EMPLOYEES(\\\'2\\\')\', parameters : {$select : \'AGE\'}}">\
	<Text id="name" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('2')?$select=AGE,ID,Name", {
				"Name" : "Jonathan Smith"
			})
			.expectChange("name", "Jonathan Smith");

		return this.createView(
			assert, sView, createTeaBusiModel({autoExpandSelect : true})
		).then(function () {
			that.expectRequest("EMPLOYEES('2')?$select=AGE,ID,Name", {
					"Name" : "Jonathan Schmidt"
				})
				.expectChange("name", "Jonathan Schmidt");

			// code under test
			that.oView.byId("form").getObjectBinding().refresh();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Enter an invalid value for worker-age for an ODataPropertyBinding and check that
	// ODatePropertyBinding.resetChanges() restores the value before.
	// The Types application does NOT have such a scenario.
	//*********************************************************************************************
	QUnit.test("reset invalid data state via property binding", function (assert) {
		return this.checkResetInvalidDataState(assert, function (oView) {
			return oView.byId("age").getBinding("text");
		});
	});

	//*********************************************************************************************
	// Scenario: Enter an invalid value for worker-age for an ODataPropertyBinding and check that
	// parent ODataContextBinding.resetChanges() restores the value before.
	// The Types application does have such a scenario (within the V4 view).
	//*********************************************************************************************
	QUnit.test("reset invalid data state via context binding", function (assert) {
		return this.checkResetInvalidDataState(assert, function (oView) {
			return oView.byId("form").getObjectBinding();
		});
	});

	//*********************************************************************************************
	// Scenario: Enter an invalid value for worker-age for an ODataPropertyBinding and check that
	// ODataModel.resetChanges() restores the value before.
	// The Types application does have such a scenario (within the V4 view).
	//*********************************************************************************************
	QUnit.test("reset invalid data state via model", function (assert) {
		return this.checkResetInvalidDataState(assert, function (oView) {
			return oView.getModel();
		});
	});

	//*********************************************************************************************
	// Scenario: Metadata access to MANAGERS which is not loaded yet.
	QUnit.test("Metadata access to MANAGERS which is not loaded yet", function (assert) {
		var sView = '\
<Table id="table" items="{/MANAGERS}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="item" text="{@sapui.name}" />\
	</ColumnListItem>\
</Table>',
			oModel = createTeaBusiModel().getMetaModel();

		this.expectChange("item", "ID", "/MANAGERS/ID")
			.expectChange("item", "TEAM_ID", "/MANAGERS/TEAM_ID")
			.expectChange("item", "Manager_to_Team", "/MANAGERS/Manager_to_Team");

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: Metadata property access to product name. It should be updated via one change
	// event.
	QUnit.test("Metadata: Product name", function (assert) {
		var sView = '<Text id="product" text="{/Equipments/EQUIPMENT_2_PRODUCT/@sapui.name}" />',
			oModel = createTeaBusiModel().getMetaModel();

		this.expectChange("product",
			"com.sap.gateway.default.iwbep.tea_busi_product.v0001.Product");

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: Metadata property access to product name. It should be updated via one change
	// event.
	QUnit.test("Metadata: Product name via form", function (assert) {
		var sView = '\
<FlexBox binding="{/Equipments/EQUIPMENT_2_PRODUCT/}">\
	<Text id="product" text="{@sapui.name}" />\
</FlexBox>',
			oModel = createTeaBusiModel().getMetaModel();

		this.expectChange("product",
			"com.sap.gateway.default.iwbep.tea_busi_product.v0001.Product");

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: Metadata access to Managers which is not loaded yet. The binding is unresolved
	// initially and gets a context later. Then switch to Products (becoming asynchronous again).
	QUnit.test("Metadata: Manager -> Product", function (assert) {
		var sView = '\
<Table id="table" items="{}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="item" text="{@sapui.name}" />\
	</ColumnListItem>\
</Table>',
			oModel = createTeaBusiModel().getMetaModel(),
			that = this;

		this.expectChange("item", false);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectChange("item", "ID", "/MANAGERS/ID")
				.expectChange("item", "TEAM_ID", "/MANAGERS/TEAM_ID")
				.expectChange("item", "Manager_to_Team", "/MANAGERS/Manager_to_Team");

			that.oView.byId("table").setBindingContext(oModel.getContext("/MANAGERS"));

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("item", "ID", "/Equipments/EQUIPMENT_2_PRODUCT/ID")
				.expectChange("item", "Name", "/Equipments/EQUIPMENT_2_PRODUCT/Name")
				.expectChange("item", "SupplierIdentifier",
					"/Equipments/EQUIPMENT_2_PRODUCT/SupplierIdentifier")
				.expectChange("item", "ProductPicture",
					"/Equipments/EQUIPMENT_2_PRODUCT/ProductPicture")
				.expectChange("item", "PRODUCT_2_CATEGORY",
					"/Equipments/EQUIPMENT_2_PRODUCT/PRODUCT_2_CATEGORY")
				.expectChange("item", "PRODUCT_2_SUPPLIER",
					"/Equipments/EQUIPMENT_2_PRODUCT/PRODUCT_2_SUPPLIER");

			that.oView.byId("table")
				.setBindingContext(oModel.getContext("/Equipments/EQUIPMENT_2_PRODUCT"));

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Avoid duplicate call to computed annotation
	QUnit.test("Avoid duplicate call to computed annotation", function (assert) {
		var oModel = createTeaBusiModel().getMetaModel(),
			sView = '\
<Text id="text"\
	text="{/MANAGERS/TEAM_ID@@sap.ui.model.odata.v4.AnnotationHelper.getValueListType}"/>';

		this.mock(AnnotationHelper).expects("getValueListType").returns("foo");
		this.expectChange("text", "foo");

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: Enable autoExpandSelect mode for an ODataContextBinding with relative
	// ODataPropertyBindings where the paths of the relative bindings lead to a $expand
	// The SalesOrders application does not have such a scenario.
	QUnit.test("Auto-$expand/$select: Absolute ODCB with relative ODPB, $expand required",
			function (assert) {
		var sView = '\
<FlexBox id="form" binding="{path : \'/EMPLOYEES(\\\'2\\\')\',\
			parameters : {\
				$expand : {\
					EMPLOYEE_2_TEAM : {$select : \'Team_Id\'}\
				},\
				$select : \'AGE\'\
			}\
		}">\
	<Text id="name" text="{EMPLOYEE_2_TEAM/Name}" />\
	<Text id="TEAM_ID" text="{EMPLOYEE_2_TEAM/TEAM_2_MANAGER/TEAM_ID}" />\
</FlexBox>';

		this.expectRequest("EMPLOYEES('2')?$expand=EMPLOYEE_2_TEAM($select=Name,Team_Id"
				+ ";$expand=TEAM_2_MANAGER($select=ID,TEAM_ID))&$select=AGE,ID", {
				"AGE" : 32,
				"EMPLOYEE_2_TEAM" : {
					"Name" : "SAP NetWeaver Gateway Content",
					"Team_Id" : "TEAM_03",
					"TEAM_2_MANAGER" : {
						"TEAM_ID" : "TEAM_03"
					}
				}
			})
			.expectChange("name", "SAP NetWeaver Gateway Content")
			.expectChange("TEAM_ID", "TEAM_03");

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}));
	});

	//*********************************************************************************************
	// Scenario: Enable autoExpandSelect mode for dependent ODataContextBindings. The inner
	// ODataContextBinding can use its parent binding's cache => it creates no own request.
	QUnit.test("Auto-$expand/$select: Dependent ODCB",
			function (assert) {
		var sView = '\
<FlexBox binding="{path : \'/EMPLOYEES(\\\'2\\\')\',\
			parameters : {\
				$expand : {\
					EMPLOYEE_2_MANAGER : {$select : \'ID\'}\
				},\
				$select : \'AGE\'\
			}\
		}">\
	<FlexBox binding="{EMPLOYEE_2_TEAM}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="name" text="{Name}" />\
	</FlexBox>\
</FlexBox>';

		this.expectRequest("EMPLOYEES('2')?$expand=EMPLOYEE_2_MANAGER"
				+ "($select=ID),EMPLOYEE_2_TEAM($select=Name,Team_Id)&$select=AGE,ID", {
				"AGE" : 32,
				"EMPLOYEE_2_MANAGER" : {
					"ID" : "2"
				},
				"EMPLOYEE_2_TEAM" : {
					"Name" : "SAP NetWeaver Gateway Content"
				}
			})
			.expectChange("name", "SAP NetWeaver Gateway Content");

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}));
	});

	//*********************************************************************************************
	// Scenario: create an entity on a relative binding without an own cache and check that
	// hasPendingChanges is working
	// None of our applications has such a scenario.
	QUnit.test("Create on a relative binding; check hasPendingChanges()", function (assert) {
		var oTeam2EmployeesBinding,
			oTeamBinding,
			that = this;

		return prepareTestForCreateOnRelativeBinding(this, assert).then(function () {
			oTeam2EmployeesBinding = that.oView.byId("table").getBinding("items");
			oTeamBinding = that.oView.byId("form").getObjectBinding();
			// insert new employee at first row
			that.expectChange("id", "", 0)
				.expectChange("text", "John Doe", 0)
				.expectChange("id", "2", 1)
				.expectChange("text", "Frederic Fall", 1);
			oTeam2EmployeesBinding.create({"ID" : null, "Name" : "John Doe"});

			// code under test
			assert.ok(oTeam2EmployeesBinding.hasPendingChanges(), "pending changes; new entity");
			assert.ok(oTeamBinding.hasPendingChanges(), "pending changes; new entity");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "TEAMS('42')/TEAM_2_EMPLOYEES",
					payload : {
						"ID" : null,
						"Name" : "John Doe"
					}
				}, {
					"ID" : "7",
					"Name" : "John Doe"
				})
				.expectChange("id", "7", 0);

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			// code under test
			assert.notOk(oTeam2EmployeesBinding.hasPendingChanges(), "no more pending changes");
			assert.notOk(oTeamBinding.hasPendingChanges(), "no more pending changes");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario:
	QUnit.test("setContext on relative binding is forbidden", function (assert) {
		var oTeam2EmployeesBinding,
			that = this;

		return prepareTestForCreateOnRelativeBinding(this, assert).then(function () {
			oTeam2EmployeesBinding = that.oView.byId("table").getBinding("items");
			that.oView.byId("form").getObjectBinding();
			// insert new employee at first row
			that.expectChange("id", "", 0)
				.expectChange("text", "John Doe", 0)
				.expectChange("id", "2", 1)
				.expectChange("text", "Frederic Fall", 1);
			oTeam2EmployeesBinding.create({"ID" : null, "Name" : "John Doe"});

			return that.waitForChanges(assert);
		}).then(function () {
			assert.throws(function () {
				that.oView.byId("form").bindElement("/TEAMS('43')",
					{$expand : {TEAM_2_EMPLOYEES : {$select : 'ID,Name'}}});
			}, new Error("setContext on relative binding is forbidden if a transient entity exists"
				+ ": sap.ui.model.odata.v4.ODataListBinding: /TEAMS('42')|TEAM_2_EMPLOYEES"));

			// Is needed for afterEach, to avoid that destroy is called twice
			that.oView.byId("form").getObjectBinding().destroy = function () {};
		});
	});

	//*********************************************************************************************
	// Scenario: create an entity on a relative binding without an own cache and reset changes or
	// delete the newly created entity again
	// None of our applications has such a scenario.
	[true, false].forEach(function (bUseReset) {
		var sTitle = "Create on a relative binding; " + (bUseReset ? "resetChanges()" : "delete");

		QUnit.test(sTitle, function (assert) {
			var oNewContext,
				oTeam2EmployeesBinding,
				oTeamBinding,
				that = this;

			return prepareTestForCreateOnRelativeBinding(this, assert).then(function () {
				oTeam2EmployeesBinding = that.oView.byId("table").getBinding("items");
				oTeamBinding = that.oView.byId("form").getObjectBinding();

				that.expectChange("id", "", 0)
					.expectChange("text", "John Doe", 0)
					.expectChange("id", "2", 1)
					.expectChange("text", "Frederic Fall", 1);

				oNewContext = oTeam2EmployeesBinding.create({"ID" : null, "Name" : "John Doe"});
				oNewContext.created().catch(function (oError) {
					assert.ok(true, oError); // promise rejected because request is canceled below
				});
				assert.ok(oTeam2EmployeesBinding.hasPendingChanges(),
					"binding has pending changes");
				assert.ok(oTeamBinding.hasPendingChanges(), "parent has pending changes");

				return that.waitForChanges(assert);
			}).then(function () {
				var oPromise;

				that.expectChange("id", "2", 0)
					.expectChange("text", "Frederic Fall", 0);

				// code under test
				if (bUseReset) {
					oTeam2EmployeesBinding.resetChanges();
				} else {
					oPromise = oNewContext.delete("$direct");
				}

				assert.notOk(oTeam2EmployeesBinding.hasPendingChanges(), "no pending changes");
				assert.notOk(oTeamBinding.hasPendingChanges(), "parent has no pending changes");

				return Promise.all([
					oPromise,
					that.waitForChanges(assert)
				]);
			}).then(function () {
				return oNewContext.created().then(function () {
					assert.notOk("unexpected success");
				}, function (oError) {
					assert.strictEqual(oError.canceled, true, "Create canceled");
				});
			});
		});
	});

	//*********************************************************************************************
	// Scenario: bound action (success and failure)
	QUnit.test("Bound action", function (assert) {
		var sView = '\
<FlexBox binding="{/EMPLOYEES(\'1\')}">\
	<Text id="name" text="{Name}" />\
	<Input id="status" value="{STATUS}" />\
	<FlexBox id="action" \
			binding="{com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="teamId" text="{TEAM_ID}" />\
	</FlexBox>\
</FlexBox>',
			sUrl = "EMPLOYEES('1')/com.sap.gateway.default.iwbep.tea_busi.v0001"
				+ ".AcChangeTeamOfEmployee",
			that = this;

		this.expectRequest("EMPLOYEES('1')", {
				"Name" : "Jonathan Smith",
				"STATUS" : "",
				"@odata.etag" : "ETag"
			})
			.expectChange("name", "Jonathan Smith")
			.expectChange("status", "")
			.expectChange("teamId", null);

		return this.createView(assert, sView).then(function () {
			that.expectRequest({
					method : "POST",
					headers : {"If-Match" : "ETag"},
					url : sUrl,
					payload : {"TeamID" : "42"}
				}, {
					"TEAM_ID" : "42"
				})
				.expectChange("teamId", "42");

			return Promise.all([
				that.oView.byId("action").getObjectBinding().setParameter("TeamID", "42").execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			var oError = new Error("Missing team ID");

			oError.error = {
				message : "Missing team ID",
				target : "TeamID",
				details : [{
					message : "Illegal Status",
					"@Common.numericSeverity" : 4,
					target : "EMPLOYEE/STATUS"
				}, {
					message : "Target resolved to ''",
					"@Common.numericSeverity" : 4,
					target : "EMPLOYEE"
				}]
			};
			that.oLogMock.expects("error").withExactArgs("Failed to execute /" + sUrl + "(...)",
				sinon.match(oError.message), "sap.ui.model.odata.v4.ODataContextBinding");
			that.oLogMock.expects("error").withExactArgs(
				"Failed to read path /" + sUrl + "(...)/TEAM_ID", sinon.match(oError.message),
				"sap.ui.model.odata.v4.ODataPropertyBinding");
			that.expectRequest({
					method : "POST",
					headers : {"If-Match" : "ETag"},
					url : sUrl,
					payload : {"TeamID" : ""}
				}, oError) // simulates failure
				.expectMessages([{
					"code" : undefined,
					"message" : "Missing team ID",
					"persistent" : true,
					"target" : "",
					"technical" : true,
					"type" : "Error"
				}, {
					"code" : undefined,
					"message" : "Illegal Status",
					"persistent" : true,
					"target" : "/EMPLOYEES('1')/STATUS",
					"type" : "Error"
				}, {
					"code" : undefined,
					"message" : "Target resolved to ''",
					"persistent" : true,
					"target" : "/EMPLOYEES('1')",
					"type" : "Error"
				}])
				.expectChange("teamId", null); // reset to initial state

			return Promise.all([
				that.oView.byId("action").getObjectBinding().setParameter("TeamID", "").execute()
					.then(function () {
						assert.ok(false, "Unexpected success");
					}, function (oError0) {
						assert.strictEqual(oError0, oError);
					}),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			return that.checkValueState(assert, "status", "Error", "Illegal Status");
		});
	});

	//*********************************************************************************************
	// Scenario: Call a bound action on a collection and check that return value context has right
	// path and messages are reported as expected. Refreshing the return value context updates also
	// messages properly. (CPOUI5UISERVICESV3-1674)
	QUnit.test("Bound action on collection", function (assert) {
		var oExecutePromise,
			oModel = createSpecialCasesModel({autoExpandSelect : true}),
			oReturnValueContext,
			sView = '\
<Table id="table" items="{path : \'/Artists\', parameters : {$select : \'Messages\'}}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Text id="name" text="{Name}" />\
	</ColumnListItem>\
</Table>\
<Text id="nameCreated" text="{Name}" />',
			that = this;

		this.expectRequest("Artists?$select=ArtistID,IsActiveEntity,Messages,Name&$skip=0&$top=100",
			{
				"value" : [{
					"@odata.etag" : "ETag",
					"ArtistID" : "XYZ",
					"IsActiveEntity" : true,
					"Messages" : [],
					"Name" : "Missy Eliot"
				}]
			})
			.expectChange("name", "Missy Eliot")
			.expectChange("nameCreated", false);

		return this.createView(assert, sView, oModel).then(function () {
			var oHeaderContext = that.oView.byId("table").getBinding("items").getHeaderContext();

			that.expectRequest({
					method : "POST",
					headers : {},
					url : "Artists/special.cases.Create?"
						+ "$select=ArtistID,IsActiveEntity,Messages,Name",
					payload : {}
				}, {
					"@odata.etag" : "ETagAfterCreate",
					"ArtistID" : "ABC",
					"IsActiveEntity" : false,
					"Messages" : [{
						"code" : "23",
						"message" : "Just A Message",
						"numericSeverity" : 1,
						"transition" : false,
						"target" : "Name"
					}],
					"Name" : "Queen"
				}).expectMessages([{
					code : "23",
					message : "Just A Message",
					target : "/Artists(ArtistID='ABC',IsActiveEntity=false)/Name",
					persistent : false,
					type : "Success"
				}]);

			oExecutePromise = that.oModel.bindContext("special.cases.Create(...)", oHeaderContext,
				{$$inheritExpandSelect : true}).execute();

			return Promise.all([
				oExecutePromise,
				that.waitForChanges(assert)
			]);
		}).then(function (aPromiseResults) {
			oReturnValueContext = aPromiseResults[0];

			that.expectChange("nameCreated", "Queen");

			that.oView.byId("nameCreated").setBindingContext(oReturnValueContext);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='ABC',IsActiveEntity=false)?"
					+ "$select=ArtistID,IsActiveEntity,Messages,Name", {
					"@odata.etag" : "ETagAfterRefresh",
					"ArtistID" : "ABC",
					"IsActiveEntity" : true,
					"Messages" : [{
						"code" : "23",
						"message" : "Just Another Message",
						"numericSeverity" : 1,
						"transition" : false,
						"target" : "Name"
					}],
					"Name" : "After Refresh"
				})
				.expectChange("nameCreated", "After Refresh")
				.expectMessages([{
					code : "23",
					message : "Just Another Message",
					target : "/Artists(ArtistID='ABC',IsActiveEntity=false)/Name",
					persistent : false,
					type : "Success"
				}]);

			oReturnValueContext.refresh();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Call bound action on a context of a relative ListBinding
	QUnit.test("Read entity for a relative ListBinding, call bound action", function (assert) {
		var oModel = createTeaBusiModel(),
			that = this,
			sView = '\
<FlexBox id="form" binding="{path : \'/TEAMS(\\\'42\\\')\',\
	parameters : {$expand : {TEAM_2_EMPLOYEES : {$select : \'ID\'}}}}">\
	<Table id="table" items="{TEAM_2_EMPLOYEES}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="id" text="{ID}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>';

		this.expectRequest("TEAMS('42')?$expand=TEAM_2_EMPLOYEES($select=ID)", {
				"TEAM_2_EMPLOYEES" : [{"ID" : "2"}]
			})
			.expectChange("id", ["2"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oEmployeeContext = that.oView.byId("table").getItems()[0].getBindingContext(),
				oAction = that.oModel.bindContext(
					"com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee(...)",
					oEmployeeContext);

			that.expectRequest({
					method : "POST",
					url : "TEAMS('42')/TEAM_2_EMPLOYEES('2')/"
						+ "com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee",
					payload : {"TeamID" : "TEAM_02"}
				}, {
					"ID" : "2"
				});
			oAction.setParameter("TeamID", "TEAM_02");

			return Promise.all([
				// code under test
				oAction.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Execute a bound action for an entity in a list binding and afterwards call refresh
	// with bAllowRemoval=true for the context the entity is pointing to. If the entity is gone from
	// the list binding no error should happen because of the just deleted context.
	QUnit.test("Bound action with context refresh which removes the context", function (assert) {
		var oAction,
			oContext,
			oExecutionPromise,
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table"\
		items="{\
			path : \'/EMPLOYEES\',\
			filters : {path : \'TEAM_ID\', operator : \'EQ\', value1 : \'77\'},\
			parameters : {$count : true}\
		}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
		<Text id="teamId" text="{TEAM_ID}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("EMPLOYEES?$count=true&$filter=TEAM_ID eq '77'&$select=ID,Name,TEAM_ID"
				+ "&$skip=0&$top=100", {
				"@odata.count" : 3,
				"value" : [
					{"ID" : "0", "Name" : "Frederic Fall", "TEAM_ID" : "77"},
					{"ID" : "1", "Name" : "Jonathan Smith","TEAM_ID" : "77"},
					{"ID" : "2", "Name" : "Peter Burke", "TEAM_ID" : "77"}
				]
			})
			.expectChange("text", ["Frederic Fall", "Jonathan Smith", "Peter Burke"])
			.expectChange("teamId", ["77", "77", "77"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "POST",
					url : "EMPLOYEES('0')/com.sap.gateway.default.iwbep.tea_busi.v0001"
						+ ".AcChangeTeamOfEmployee",
					payload : {"TeamID" : "42"}
				}, {
					"TEAM_ID" : "42"
				})
				.expectRequest("EMPLOYEES?$filter=(TEAM_ID eq '77') and ID eq '0'"
					+ "&$select=ID,Name,TEAM_ID", {"value" : []})
				.expectChange("text", ["Jonathan Smith", "Peter Burke"]);

			oContext = that.oView.byId("table").getItems()[0].getBindingContext();
			oAction = oModel.bindContext("com.sap.gateway.default.iwbep.tea_busi.v0001"
				+ ".AcChangeTeamOfEmployee(...)", oContext);

			// code under test
			oExecutionPromise = oAction.setParameter("TeamID", "42").execute();
			oContext.refresh(undefined, true);

			return Promise.all([
				oExecutionPromise,
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: overloaded bound action
	// Note: there are 3 binding types for __FAKE__AcOverload, but only Worker has Is_Manager
	QUnit.test("Bound action w/ overloading", function (assert) {
		var sView = '\
<FlexBox binding="{/EMPLOYEES(\'1\')}">\
	<Text id="name" text="{Name}" />\
	<FlexBox id="action" \
			binding="{com.sap.gateway.default.iwbep.tea_busi.v0001.__FAKE__AcOverload(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="isManager" text="{Is_Manager}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('1')", {
				"Name" : "Jonathan Smith",
				"@odata.etag" : "ETag"
			})
			.expectChange("name", "Jonathan Smith")
			.expectChange("isManager", null);

		return this.createView(assert, sView).then(function () {
			that.expectRequest({
					method : "POST",
					headers : {"If-Match" : "ETag"},
					url : "EMPLOYEES('1')/com.sap.gateway.default.iwbep.tea_busi.v0001"
						+ ".__FAKE__AcOverload",
					payload : {"Message" : "The quick brown fox jumps over the lazy dog"}
				}, {
					"Is_Manager" : true
				})
				.expectChange("isManager", "Yes");

			return Promise.all([
				// code under test
				that.oView.byId("action").getObjectBinding()
					.setParameter("Message", "The quick brown fox jumps over the lazy dog")
					.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Enable autoExpandSelect on an operation
	QUnit.test("Auto-$expand/$select: Function import", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="function" binding="{/GetEmployeeByID(...)}">\
	<Text id="name" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectChange("name", null);
		return this.createView(assert, sView, oModel).then(function () {
//TODO the query options for the function import are not enhanced
//			that.expectRequest("GetEmployeeByID(EmployeeID='1')?$select=ID,Name", {
			that.expectRequest("GetEmployeeByID(EmployeeID='1')", {
					"Name" : "Jonathan Smith"
				})
				.expectChange("name", "Jonathan Smith");

			return Promise.all([
				// code under test
				that.oView.byId("function").getObjectBinding()
					.setParameter("EmployeeID", "1")
					.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Instance annotation in child path
	QUnit.test("Auto-$expand/$select: Instance annotation in child path", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/EMPLOYEES(\'2\')}">\
	<Text id="ETag" text="{\
		path : \'@odata.etag\',\
		type : \'sap.ui.model.odata.type.String\'}" />\
</FlexBox>';

		this.expectRequest("EMPLOYEES('2')", {
				"@odata.etag" : "ETagValue"
			})
			.expectChange("ETag", "ETagValue");

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: Enable autoExpandSelect mode for dependent ODataContextBindings. The inner
	// ODataContextBinding *cannot* use its parent binding's cache due to conflicting query options
	// => it creates an own cache and request.
	QUnit.test("Auto-$expand/$select: Dependent ODCB with own request", function (assert) {
		var sView = '\
<FlexBox binding="{path : \'/EMPLOYEES(\\\'2\\\')\',\
			parameters : {\
				$expand : {\
					EMPLOYEE_2_MANAGER : {$select : \'ID\'},\
					EMPLOYEE_2_TEAM : {\
						$expand : {\
							TEAM_2_EMPLOYEES : {\
								$orderby : \'AGE\'\
							}\
						}\
					}\
				}\
			}\
		}">\
	<FlexBox binding="{path : \'EMPLOYEE_2_TEAM\',\
				parameters : {\
					$expand : {\
						TEAM_2_EMPLOYEES : {\
							$orderby : \'AGE desc\'\
						}\
					}\
				}\
			}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="name" text="{Name}" />\
	</FlexBox>\
	<Text id="age" text="{AGE}" />\
</FlexBox>';

		this.expectRequest("EMPLOYEES('2')/EMPLOYEE_2_TEAM"
				+ "?$expand=TEAM_2_EMPLOYEES($orderby=AGE desc)&$select=Name,Team_Id", {
				"Name" : "SAP NetWeaver Gateway Content",
				"TEAM_2_EMPLOYEES" : [
					{"AGE" : 32},
					{"AGE" : 29}
				]
			})
			.expectRequest("EMPLOYEES('2')?$expand=EMPLOYEE_2_MANAGER($select=ID),"
				+ "EMPLOYEE_2_TEAM($expand=TEAM_2_EMPLOYEES($orderby=AGE))&$select=AGE,ID", {
				"AGE" : 32,
				"EMPLOYEE_2_MANAGER" : {
					"ID" : "2"
				},
				"EMPLOYEE_2_TEAM" : {
					"TEAM_2_EMPLOYEES" : [
						{"AGE" : 29},
						{"AGE" : 32}
					]
				}
			})
			.expectChange("name", "SAP NetWeaver Gateway Content")
			.expectChange("age", "32");

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}));
	});

	//*********************************************************************************************
	// Scenario: Auto-$expand/$select: Absolute ODataListBinding considers $filter set via API,
	// i.e. it changes the initially aggregated query options. Note: It is also possible to remove
	// a filter which must lead to removal of the $filter option.
	QUnit.test("Absolute ODLB with auto-$expand/$select: filter via API", function (assert) {
		var sView = '\
<Table id="table"\
		items="{\
			path : \'/EMPLOYEES\',\
			filters : {path : \'AGE\', operator : \'LT\', value1 : \'77\'},\
			parameters : {$orderby : \'Name\', $select : \'AGE\'}\
		}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("EMPLOYEES?$orderby=Name&$select=AGE,ID,Name&$filter=AGE lt 77"
				+ "&$skip=0&$top=100", {
				"value" : [
					{"Name" : "Frederic Fall"},
					{"Name" : "Jonathan Smith"},
					{"Name" : "Peter Burke"}
				]
			})
			.expectChange("text", ["Frederic Fall", "Jonathan Smith", "Peter Burke"]);

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}))
			.then(function () {
				that.expectRequest("EMPLOYEES?$orderby=Name&$select=AGE,ID,Name"
						+ "&$filter=AGE gt 42&$skip=0&$top=100", {
						"value" : [
							{"Name" : "Frederic Fall"},
							{"Name" : "Peter Burke"}
						]
					})
					.expectChange("text", "Peter Burke", 1);

				// code under test
				that.oView.byId("table").getBinding("items")
					.filter(new Filter("AGE", FilterOperator.GT, 42));

				return that.waitForChanges(assert);
			})
			.then(function () {
				that.expectRequest("EMPLOYEES?$orderby=Name&$select=AGE,ID,Name&$skip=0&$top=100", {
						"value" : [
							{"Name" : "Frederic Fall"},
							{"Name" : "Jonathan Smith"},
							{"Name" : "Peter Burke"}
						]
					})
					.expectChange("text", "Jonathan Smith", 1)
					.expectChange("text", "Peter Burke", 2);

				// code under test
				that.oView.byId("table").getBinding("items").filter(/*no filter*/);

				return that.waitForChanges(assert);
			});
	});

	//*********************************************************************************************
	// Scenario: Auto-$expand/$select: Relative ODataListBinding considers $filter set via API, i.e.
	// it changes the initially aggregated query options and creates a separate cache/request.
	QUnit.test("ODLB with auto-$expand/$select below ODCB: filter via API", function (assert) {
		var sView = '\
<FlexBox binding="{/TEAMS(\'2\')}">\
	<Table id="table" items="{path : \'TEAM_2_EMPLOYEES\', parameters : {$orderby : \'Name\'}}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="text" text="{Name}" />\
		</ColumnListItem>\
	</Table>\
	<Text id="name" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS('2')?$select=Name,Team_Id"
				+ "&$expand=TEAM_2_EMPLOYEES($orderby=Name;$select=ID,Name)", {
				"Name" : "Team 2",
				"Team_Id" : "2",
				"TEAM_2_EMPLOYEES" : [
					{"Name" : "Frederic Fall"},
					{"Name" : "Jonathan Smith"},
					{"Name" : "Peter Burke"}
				]
			})
			.expectChange("name", "Team 2")
			.expectChange("text", ["Frederic Fall", "Jonathan Smith", "Peter Burke"]);

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}))
			.then(function () {
				that.expectRequest("TEAMS('2')/TEAM_2_EMPLOYEES?$orderby=Name&$select=ID,Name"
						+ "&$filter=AGE gt 42&$skip=0&$top=100", {
						"value" : [
							{"Name" : "Frederic Fall"},
							{"Name" : "Peter Burke"}
						]
					})
					.expectChange("text", "Peter Burke", 1);

				// code under test
				that.oView.byId("table").getBinding("items")
					.filter(new Filter("AGE", FilterOperator.GT, 42));

				return that.waitForChanges(assert);
			});
	});

	//*********************************************************************************************
	// Scenario: child binding has $apply and would need $expand therefore it cannot use its
	// parent binding's cache
	testViewStart("Auto-$expand/$select: no $apply inside $expand", '\
<FlexBox binding="{/TEAMS(\'42\')}">\
	<Table items="{path : \'TEAM_2_EMPLOYEES\', parameters : {$apply : \'filter(AGE lt 42)\'}}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="text" text="{Name}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>', {
		"TEAMS('42')/TEAM_2_EMPLOYEES?$apply=filter(AGE lt 42)&$select=ID,Name&$skip=0&$top=100" : {
			"value" : [
				{"Name" : "Frederic Fall"},
				{"Name" : "Peter Burke"}
			]
		}
	}, {"text" :  ["Frederic Fall", "Peter Burke"]}, createTeaBusiModel({autoExpandSelect : true}));

	//*********************************************************************************************
	// Scenario: child binding cannot use its parent list binding's cache (for whatever reason)
	// but must not compute the canonical path for the virtual context
	QUnit.test("Auto-$expand/$select: no canonical path for virtual context", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table items="{/TEAMS}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<List items="{path : \'TEAM_2_EMPLOYEES\',\
			parameters : {$apply : \'filter(AGE lt 42)\'}, templateShareable : false}">\
			<CustomListItem>\
				<Text id="text" text="{Name}" />\
			</CustomListItem>\
		</List>\
	</ColumnListItem>\
</Table>';

		this.expectRequest("TEAMS?$select=Team_Id&$skip=0&$top=100", {
				"value" : [
					{"Team_Id" : "TEAM_01"}
				]
			})
			.expectRequest("TEAMS('TEAM_01')/TEAM_2_EMPLOYEES?$apply=filter(AGE lt 42)"
				+ "&$select=ID,Name&$skip=0&$top=100", {
				"value" : [
					{"Name" : "Frederic Fall"},
					{"Name" : "Peter Burke"}
				]
			})
			.expectChange("text", ["Frederic Fall", "Peter Burke"]);

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: master/detail where the detail does not need additional $expand/$select and thus
	// should reuse its parent's cache
	QUnit.test("Auto-$expand/$select: simple master/detail", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="master" items="{/TEAMS}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text0" text="{Team_Id}" />\
	</ColumnListItem>\
</Table>\
<FlexBox id="detail" binding="{}">\
	<Text id="text1" text="{Team_Id}" />\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS?$select=Team_Id&$skip=0&$top=100", {
				"value" : [{
					"Team_Id" : "TEAM_01"
				}]
			})
			.expectChange("text0", ["TEAM_01"])
			.expectChange("text1"); // expect a later change

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("master").getItems()[0].getBindingContext();

			that.expectChange("text1", "TEAM_01");

			that.oView.byId("detail").setBindingContext(oContext);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: master/detail where the detail needs additional $expand/$select and thus cannot
	// reuse its parent's cache
	QUnit.test("Auto-$expand/$select: master/detail with separate requests", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="master" items="{/TEAMS}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text0" text="{Team_Id}" />\
	</ColumnListItem>\
</Table>\
<FlexBox id="detail" binding="{}">\
	<Text id="text1" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS?$select=Team_Id&$skip=0&$top=100", {
				"value" : [{
					"Team_Id" : "TEAM_01"
				}]
			})
			.expectChange("text0", ["TEAM_01"])
			.expectChange("text1"); // expect a later change

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("master").getItems()[0].getBindingContext();

			that.expectRequest("TEAMS('TEAM_01')?$select=Name,Team_Id", {
					"Team_Id" : "TEAM_01",
					"Name" : "Team #1"
				})
				.expectChange("text1", "Team #1");

			that.oView.byId("detail").setBindingContext(oContext);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Enable autoExpandSelect mode for use with factory function to create a listBinding
	QUnit.test("Auto-$expand/$select: use factory function", function (assert) {
		var that = this,
			sView = '\
<Table id="table" items="{\
		factory : \'.employeesListFactory\',\
		parameters : {\
			$select : \'AGE,ID\'\
		},\
		path : \'/EMPLOYEES\'\
	}">\
	<columns><Column/></columns>\
</Table>',
			oController = {
				employeesListFactory : function (sID, oContext) {
					var sAge,
						oListItem;

					sAge = oContext.getProperty("AGE");
					if (sAge > 30) {
						oListItem = new Text(sID, {
							text : "{AGE}"
						});
					} else {
						oListItem = new Text(sID, {
							text : "{ID}"
						});
					}
					that.setFormatter(assert, oListItem, "text", true);

					return new ColumnListItem({cells : [oListItem]});
				}
			};

		this.expectRequest("EMPLOYEES?$select=AGE,ID&$skip=0&$top=100", {
				"value" : [
					{"AGE" : 29, "ID" : "R2D2"},
					{"AGE" : 36, "ID" : "C3PO"}
				]
			})
			.expectChange("text", ["R2D2", "36"]);

		return this.createView(assert, sView, createTeaBusiModel({autoExpandSelect : true}),
			oController);
	});

	//*********************************************************************************************
	// Scenario: trying to call submitBatch() synchronously after delete(), but there is no way...
	QUnit.test("submitBatch() after delete()", function (assert) {
		var sView = '\
<FlexBox binding="{/TEAMS(\'42\')}" id="form">\
	<Text id="text" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS('42')", {
				"Team_Id" : "TEAM_01",
				"Name" : "Team #1"
			})
			.expectChange("text", "Team #1");

		return this.createView(assert, sView).then(function () {
			var oContext = that.oView.byId("form").getBindingContext(),
				oPromise;

			that.expectRequest({
					method : "DELETE",
					url : "TEAMS('42')"
				})
				.expectChange("text", null);

			// Note: "the resulting group ID must be '$auto' or '$direct'"
			// --> no way to call submitBatch()!
			oPromise = oContext.delete(/*sGroupId*/);
			assert.throws(function () {
				oContext.getModel().submitBatch("$direct");
			});

			return Promise.all([
				oPromise,
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: call submitBatch() synchronously after changeParameters (BCP 1770236987)
	[false, true].forEach(function (bAutoExpandSelect) {
		var sTitle = "submitBatch after changeParameters, autoExpandSelect = " + bAutoExpandSelect;

		QUnit.test(sTitle, function (assert) {
			var mFrederic = {
					"ID" : "2",
					"Name" : "Frederic Fall"
				},
				mJonathan = {
					"ID" : "3",
					"Name" : "Jonathan Smith"
				},
				oModel = createTeaBusiModel({autoExpandSelect : bAutoExpandSelect}),
				sUrlPrefix = bAutoExpandSelect
					? "EMPLOYEES?$select=ID,Name&"
					: "EMPLOYEES?",
				sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\', parameters : {$$groupId : \'group\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>',
				that = this;

			this.expectChange("text", false);

			return this.createView(assert, sView, oModel).then(function () {
				that.expectRequest({
						method : "GET",
						url : sUrlPrefix + "$skip=0&$top=100"
					}, {
						"value" : [mFrederic, mJonathan]
					})
					.expectChange("text", ["Frederic Fall", "Jonathan Smith"]);

				return Promise.all([
					oModel.submitBatch("group"),
					that.waitForChanges(assert)
				]);
			}).then(function () {
				var oListBinding = that.oView.byId("table").getBinding("items");

				that.expectRequest({
						method : "GET",
						url : sUrlPrefix + "$orderby=Name desc&$skip=0&$top=100"
					}, {
						"value" : [mJonathan, mFrederic]
					})
					.expectChange("text", ["Jonathan Smith", "Frederic Fall"]);

				oListBinding.changeParameters({
					"$orderby" : "Name desc"
				});

				return Promise.all([
					oModel.submitBatch("group"),
					that.waitForChanges(assert)
				]);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: call submitBatch() synchronously after resume w/ auto-$expand/$select
	QUnit.test("submitBatch after resume w/ auto-$expand/$select", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table"\
		items="{path : \'/EMPLOYEES\', parameters : {$$groupId : \'group\'}, suspended : true}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectChange("text", false);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "GET",
					url : "EMPLOYEES?$select=ID,Name&$skip=0&$top=100"
				}, {
					"value" : [
						{"ID" : "2", "Name" : "Frederic Fall"},
						{"ID" : "3", "Name" : "Jonathan Smith"}
					]
				})
				.expectChange("text", ["Frederic Fall", "Jonathan Smith"]);

			that.oView.byId("table").getBinding("items").resume();

			return Promise.all([
				oModel.submitBatch("group"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Change a property in a dependent binding below a list binding with an own cache and
	// change the list binding's row (-> the dependent binding's context)
	// TODO hasPendingChanges does work properly with changes in hidden caches if dependency between
	// bindings get lost e.g. if context of a dependent binding is reset (set to null or undefined).
	QUnit.test("Pending change in hidden cache", function (assert) {
		var oListBinding,
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="teamSet" items="{/TEAMS}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="teamId" text="{Team_Id}" />\
	</ColumnListItem>\
</Table>\
<Table id="employeeSet" items="{path : \'TEAM_2_EMPLOYEES\', parameters : {$orderby : \'Name\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="employeeId" text="{ID}" />\
	</ColumnListItem>\
</Table>\
<VBox id="objectPage" binding="{path : \'\', parameters : {$$updateGroupId : \'update\'}}">\
	<Input id="employeeName" value="{Name}"/>\
</VBox>',
			that = this;

		this.expectRequest("TEAMS?$select=Team_Id&$skip=0&$top=100", {
				value : [
					{"Team_Id" : "1"},
					{"Team_Id" : "2"}
				]
			})
			.expectChange("teamId", ["1", "2"])
			.expectChange("employeeId", false)
			.expectChange("employeeName");

		return this.createView(assert, sView, oModel).then(function () {
			oListBinding = that.oView.byId("teamSet").getBinding("items");

			that.expectRequest(
				"TEAMS('1')/TEAM_2_EMPLOYEES?$orderby=Name&$select=ID&$skip=0&$top=100", {
					value : [
						{ID : "01"},
						{ID : "02"}
					]
				})
				.expectChange("employeeId", ["01", "02"]);

			// "select" the first row in the team table
			that.oView.byId("employeeSet").setBindingContext(
				that.oView.byId("teamSet").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("TEAMS('1')/TEAM_2_EMPLOYEES('01')?$select=ID,Name", {
					ID : "01",
					Name : "Frederic Fall",
					"@odata.etag" : "ETag"
				})
				.expectChange("employeeName", "Frederic Fall");

			// "select" the first row in the employee table
			that.oView.byId("objectPage").setBindingContext(
				that.oView.byId("employeeSet").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("employeeName", "foo");

			// Modify the employee name in the object page
			that.oView.byId("employeeName").getBinding("value").setValue("foo");
			assert.ok(oListBinding.hasPendingChanges());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest(
				"TEAMS('2')/TEAM_2_EMPLOYEES?$orderby=Name&$select=ID&$skip=0&$top=100", {
					value : [
						{ID : "03"},
						{ID : "04"}
					]
				})
				.expectChange("employeeId", ["03", "04"])
				.expectChange("employeeName", null);

			// "select" the second row in the team table
			that.oView.byId("employeeSet").setBindingContext(
				that.oView.byId("teamSet").getItems()[1].getBindingContext());
			assert.notOk(oListBinding.hasPendingChanges(),
				"Binding lost context -> no pending changes");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("TEAMS('2')/TEAM_2_EMPLOYEES('03')?$select=ID,Name", {
					ID : "03",
					Name : "Jonathan Smith",
					"@odata.etag" : "ETag"
				})
				.expectChange("employeeName", "Jonathan Smith");

			// "select" the first row in the employee table
			that.oView.byId("objectPage").setBindingContext(
				that.oView.byId("employeeSet").getItems()[0].getBindingContext());
			assert.ok(oListBinding.hasPendingChanges(),
				"Binding hierarchy restored -> has pending changes");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					headers : {"If-Match" : "ETag"},
					method : "PATCH",
					payload : {"Name" : "foo"},
					url : "EMPLOYEES('01')"
				});

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			// no requests because cache is reused
			that.expectChange("employeeId", ["01", "02"])
				.expectChange("employeeName", null);

			// code under test
			that.oView.byId("employeeSet").setBindingContext(
				that.oView.byId("teamSet").getItems()[0].getBindingContext());

			assert.notOk(oListBinding.hasPendingChanges(), "no pending changes after submitBatch");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("employeeName", "foo");
			that.oView.byId("objectPage").setBindingContext(
				that.oView.byId("employeeSet").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Usage of Any/All filter values on the list binding
	[{
		filter : new Filter({
			condition : new Filter("soitem/GrossAmount", FilterOperator.GT, "1000"),
			operator : FilterOperator.Any,
			path : "SO_2_SOITEM",
			variable : "soitem"
		}),
		request : "SO_2_SOITEM/any(soitem:soitem/GrossAmount gt 1000)"
	}, {
		filter : new Filter({
			condition : new Filter({
				and : true,
				filters : [
					new Filter("soitem/GrossAmount", FilterOperator.GT, "1000"),
					new Filter("soitem/NetAmount", FilterOperator.LE, "3000")
				]
			}),
			operator : FilterOperator.Any,
			path : "SO_2_SOITEM",
			variable : "soitem"
		}),
		request : "SO_2_SOITEM/any(soitem:soitem/GrossAmount gt 1000 and"
			+ " soitem/NetAmount le 3000)"
	}, {
		filter : new Filter({
			condition : new Filter({
				filters : [
					new Filter("soitem/GrossAmount", FilterOperator.GT, "1000"),
					new Filter({operator : FilterOperator.Any, path : "soitem/SOITEM_2_SCHDL"})
				]
			}),
			operator : FilterOperator.Any,
			path : "SO_2_SOITEM",
			variable : "soitem"
		}),
		request : "SO_2_SOITEM/any(soitem:soitem/GrossAmount gt 1000 or"
			+ " soitem/SOITEM_2_SCHDL/any())"
	}, {
		filter : new Filter({
			condition : new Filter({
				filters : [
					new Filter("soitem/GrossAmount", FilterOperator.GT, "1000"),
					new Filter({
						condition : new Filter({
							and : true,
							filters : [
								new Filter("schedule/DeliveryDate", FilterOperator.LT,
									"2017-01-01T05:50Z"),
								new Filter("soitem/GrossAmount", FilterOperator.LT, "2000")
							]
						}),
						operator : FilterOperator.All,
						path : "soitem/SOITEM_2_SCHDL",
						variable : "schedule"
					})
				]
			}),
			operator : FilterOperator.Any,
			path : "SO_2_SOITEM",
			variable : "soitem"
		}),
		request : "SO_2_SOITEM/any(soitem:soitem/GrossAmount gt 1000 or"
			+ " soitem/SOITEM_2_SCHDL/all(schedule:schedule/DeliveryDate lt 2017-01-01T05:50Z"
			+ " and soitem/GrossAmount lt 2000))"
	}].forEach(function (oFixture) {
		QUnit.test("filter all/any on list binding " + oFixture.request, function (assert) {
			var sView = '\
<Table id="table" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>',
				that = this;

			this.expectRequest("SalesOrderList?$skip=0&$top=100", {
					"value" : [
						{"SalesOrderID" : "0"},
						{"SalesOrderID" : "1"},
						{"SalesOrderID" : "2"}
					]
				})
				.expectChange("text", ["0", "1", "2"]);

			return this.createView(assert, sView, createSalesOrdersModel()).then(function () {
				that.expectRequest("SalesOrderList?$filter=" + oFixture.request
						+ "&$skip=0&$top=100", {
						"value" : [
							{"SalesOrderID" : "0"},
							{"SalesOrderID" : "2"}
						]
					})
					.expectChange("text", "2", 1);

				// code under test
				that.oView.byId("table").getBinding("items").filter(oFixture.filter);

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Check that the context paths use key predicates if the key properties are delivered
	// in the response. Check that an expand spanning a complex type does not lead to failures.
	QUnit.test("Context Paths Using Key Predicates", function (assert) {
		var sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\',\
		parameters : {$expand : {\'LOCATION/City/EmployeesInCity\' : {$select : [\'Name\']}}, \
		$select : [\'ID\', \'Name\']}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("EMPLOYEES?$expand=LOCATION/City/EmployeesInCity($select=Name)"
				+ "&$select=ID,Name&$skip=0&$top=100", {
				"value" : [{
					"ID" : "1",
					"Name" : "Frederic Fall",
					"LOCATION" : {
						"City" : {
							"EmployeesInCity" : [
								{"Name" : "Frederic Fall"},
								{"Name" : "Jonathan Smith"}
							]
						}
					}
				}, {
					"ID" : "2",
					"Name" : "Jonathan Smith",
					"LOCATION" : {
						"City" : {
							"EmployeesInCity" : [
								{"Name" : "Frederic Fall"},
								{"Name" : "Jonathan Smith"}
							]
						}
					}
				}]
			})
			.expectChange("text", ["Frederic Fall", "Jonathan Smith"]);

		return this.createView(assert, sView).then(function () {
			assert.deepEqual(that.oView.byId("table").getItems().map(function (oItem) {
				return oItem.getBindingContext().getPath();
			}), ["/EMPLOYEES('1')", "/EMPLOYEES('2')"]);
		});
	});

	//*********************************************************************************************
	// Scenario: stream property with @odata.mediaReadLink
	QUnit.test("stream property with @odata.mediaReadLink", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Equipments(\'1\')/EQUIPMENT_2_PRODUCT}">\
	<Text id="url" text="{ProductPicture/Picture}"/>\
</FlexBox>';

		this.expectRequest(
			"Equipments('1')/EQUIPMENT_2_PRODUCT?$select=ID,ProductPicture/Picture", {
				"@odata.context" : "../$metadata#Equipments('1')/EQUIPMENT_2_PRODUCT",
				"ID" : "42",
				"ProductPicture" : {
					"Picture@odata.mediaReadLink" : "ProductPicture('42')"
				}
			})
			.expectChange("url",
				"/sap/opu/odata4/IWBEP/TEA/default/IWBEP/TEA_BUSI/0001/ProductPicture('42')");

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: update a quantity. The corresponding unit of measure must be sent, too.
	QUnit.test("Update quantity", function (assert) {
		var sView = '\
<FlexBox binding="{/SalesOrderList(\'42\')/SO_2_SOITEM(\'10\')}">\
	<Input id="quantity" value="{Quantity}"/>\
	<Text id="quantityUnit" text="{QuantityUnit}"/>\
</FlexBox>',
			oModel = createSalesOrdersModel({autoExpandSelect : true}),
			that = this;

		this.expectRequest("SalesOrderList('42')/SO_2_SOITEM('10')?"
				+ "$select=ItemPosition,Quantity,QuantityUnit,SalesOrderID", {
				"@odata.etag" : "ETag",
				"Quantity" : "10.000",
				"QuantityUnit" : "EA"
			})
			.expectChange("quantity", "10.000")
			.expectChange("quantityUnit", "EA");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')/SO_2_SOITEM('10')",
					headers : {"If-Match" : "ETag"},
					payload : {
						"Quantity" : "11.000",
						"QuantityUnit" : "EA"
					}
				}, {
					"@odata.etag" : "changed",
					"Quantity" : "11.000",
					"QuantityUnit" : "EA"
				})
				.expectChange("quantity", "11.000");

			that.oView.byId("quantity").getBinding("value").setValue("11.000");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: PATCH an entity which is read via navigation from a complex type
	QUnit.test("PATCH entity below a complex type", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/EMPLOYEES(\'1\')}">\
	<Table id="table" items="{LOCATION/City/EmployeesInCity}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Input id="room" value="{ROOM_ID}"/>\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('1')?$select=ID"
				+ "&$expand=LOCATION/City/EmployeesInCity($select=ID,ROOM_ID)", {
				"ID" : "1",
				"LOCATION" : {
					"City" : {
						"EmployeesInCity" : [{
							"ID" : "1",
							"ROOM_ID" : "1.01",
							"@odata.etag" : "ETag"
						}]
					}
				}
			})
			.expectChange("room", ["1.01"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "EMPLOYEES('1')",
					headers : {"If-Match" : "ETag"},
					payload : {"ROOM_ID" : "1.02"}
				})
				.expectChange("room", "1.02", 0);

			that.oView.byId("table").getItems()[0].getCells()[0].getBinding("value")
				.setValue("1.02");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: test conversion of $select and $expand for V2 Adapter
	// Usage of service: /sap/opu/odata/IWBEP/GWSAMPLE_BASIC/
	QUnit.test("V2 Adapter: select in expand", function (assert) {
		var sView = '\
<FlexBox id="form" binding="{path :\'/SalesOrderSet(\\\'0500000001\\\')\', \
		parameters : {\
			$expand : {ToLineItems : {$select : \'ItemPosition\'}}, \
			$select : \'SalesOrderID\'\
		}}">\
	<Text id="id" text="{path : \'SalesOrderID\', type : \'sap.ui.model.odata.type.String\'}" />\
	<Table id="table" items="{ToLineItems}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="item" text="{path : \'ItemPosition\',\
				type : \'sap.ui.model.odata.type.String\'}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			oModel = this.createModelForV2SalesOrderService({
				annotationURI : "/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/annotations.xml"
			});

		this.expectRequest("SalesOrderSet('0500000001')?$expand=ToLineItems"
				+ "&$select=ToLineItems/ItemPosition,SalesOrderID", {
				"d" : {
					"__metadata" : {
						"type" : "GWSAMPLE_BASIC.SalesOrder"
					},
					"SalesOrderID" : "0500000001",
					"ToLineItems" : {
						"results" : [{
							"__metadata" : {
								"type" : "GWSAMPLE_BASIC.SalesOrderLineItem"
							},
							"ItemPosition" : "0000000010"
						}, {
							"__metadata" : {
								"type" : "GWSAMPLE_BASIC.SalesOrderLineItem"
							},
							"ItemPosition" : "0000000020"
						}, {
							"__metadata" : {
								"type" : "GWSAMPLE_BASIC.SalesOrderLineItem"
							},
							"ItemPosition" : "0000000030"
						}]
					}
				}
			})
			.expectChange("id", "0500000001")
			.expectChange("item", ["0000000010", "0000000020", "0000000030"]);

		// code under test
		return this.createView(assert, sView, oModel).then(function () {
			assert.deepEqual(
				oModel.getMetaModel().getObject(
					"/SalesOrderSet/NetAmount@Org.OData.Measures.V1.ISOCurrency"),
				{"$Path" : "CurrencyCode"});
		});
	});

	//*********************************************************************************************
	// Scenario: test conversion of $orderby for V2 Adapter
	// Usage of service: /sap/opu/odata/IWBEP/GWSAMPLE_BASIC/
	QUnit.test("V2 Adapter: $orderby", function (assert) {
		var sView = '\
<Table id="table" items="{path :\'/SalesOrderSet\',\
		parameters : {\
			$select : \'SalesOrderID\',\
			$orderby : \'SalesOrderID\'\
		}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>',
			oModel = this.createModelForV2SalesOrderService({
				annotationURI : "/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/annotations.xml"
			});

		this.expectRequest("SalesOrderSet?$orderby=SalesOrderID&$select=SalesOrderID"
				+ "&$skip=0&$top=100", {
				"d" : {
					"results" : [{
						"__metadata" : {
							"type" : "GWSAMPLE_BASIC.SalesOrder"
						},
						"SalesOrderID" : "0500000001"
					}, {
						"__metadata" : {
							"type" : "GWSAMPLE_BASIC.SalesOrder"
						},
						"SalesOrderID" : "0500000002"
					}, {
						"__metadata" : {
							"type" : "GWSAMPLE_BASIC.SalesOrder"
						},
						"SalesOrderID" : "0500000003"
					}]
				}
			})
			.expectChange("id", ["0500000001", "0500000002", "0500000003"]);

		// code under test
		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	[{
		binding : "CreatedAt ge 2017-05-23T00:00:00Z",
		request : "CreatedAt ge datetime'2017-05-23T00:00:00'"
	}, {
		binding : "Note eq null",
		request : "Note eq null"
	}, {
		binding : "2017-05-23T00:00:00Z ge CreatedAt",
		request : "datetime'2017-05-23T00:00:00' ge CreatedAt"
	}, {
		binding : "Note eq null and 2017-05-23T00:00:00Z ge CreatedAt",
		request : "Note eq null and datetime'2017-05-23T00:00:00' ge CreatedAt"
	}, {
		binding : "Note eq null or 2017-05-23T00:00:00Z ge CreatedAt",
		request : "Note eq null or datetime'2017-05-23T00:00:00' ge CreatedAt"
	}, {
		binding : "Note eq null or not (2017-05-23T00:00:00Z ge CreatedAt)",
		request : "Note eq null or not (datetime'2017-05-23T00:00:00' ge CreatedAt)"
	}].forEach(function (oFixture) {
		// Scenario: test conversion of $filter for V2 Adapter
		// Usage of service: /sap/opu/odata/IWBEP/GWSAMPLE_BASIC/
		QUnit.test("V2 Adapter: $filter=" + oFixture.binding, function (assert) {
			var sView = '\
<Table id="table" items="{path :\'/SalesOrderSet\',\
		parameters : {\
			$select : \'SalesOrderID\',\
			$filter : \'' + oFixture.binding + '\'\
		}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>';

			this.expectRequest("SalesOrderSet?$filter=" + oFixture.request + "&$select=SalesOrderID"
					+ "&$skip=0&$top=100", {
					"d" : {
						"results" : [{
							"__metadata" : {
								"type" : "GWSAMPLE_BASIC.SalesOrder"
							},
							"SalesOrderID" : "0500000001"
						}, {
							"__metadata" : {
								"type" : "GWSAMPLE_BASIC.SalesOrder"
							},
							"SalesOrderID" : "0500000002"
						}, {
							"__metadata" : {
								"type" : "GWSAMPLE_BASIC.SalesOrder"
							},
							"SalesOrderID" : "0500000003"
						}]
					}
				})
				.expectChange("id", ["0500000001", "0500000002", "0500000003"]);

			// code under test
			return this.createView(assert, sView, this.createModelForV2SalesOrderService());
		});
	});

	//*********************************************************************************************
	// Scenario: Minimal test for two absolute ODataPropertyBindings using different direct groups.
	QUnit.test("Absolute ODPBs using different $direct groups", function (assert) {
		var sView = '\
<Text id="text1" text="{\
	path : \'/EMPLOYEES(\\\'2\\\')/Name\',\
	parameters : {$$groupId : \'group1\'}}" />\
<Text id="text2" text="{\
	path : \'/EMPLOYEES(\\\'3\\\')/Name\',\
	parameters : {$$groupId : \'group2\'}}"\
/>';

		this.expectRequest({
				url : "EMPLOYEES('2')/Name",
				method : "GET"
			}, {
				value : "Frederic Fall"
			})
			.expectRequest({
				url : "EMPLOYEES('3')/Name",
				method : "GET"
			}, {
				value : "Jonathan Smith"
			})
			.expectChange("text1", "Frederic Fall")
			.expectChange("text2", "Jonathan Smith");

		return this.createView(assert, sView,
			createTeaBusiModel({
				groupProperties : {
					"group1" : {submit : "Direct"},
					"group2" : {submit : "Direct"}
				}
			})
		);
	});

	//*********************************************************************************************
	// Scenario: Minimal test for two absolute ODataPropertyBindings using different auto groups.
	// For group Ids starting with name "$auto." the submit mode will be set to auto automatically.
	QUnit.test("Absolute ODPBs using different '$auto.X' groups", function (assert) {
		var sView = '\
<Text id="text1" text="{\
	path : \'/EMPLOYEES(\\\'2\\\')/Name\',\
	parameters : {$$groupId : \'$auto.1\'}}" />\
<Text id="text2" text="{\
	path : \'/EMPLOYEES(\\\'3\\\')/Name\',\
	parameters : {$$groupId : \'$auto.2\'}}"\
/>';

		this.expectRequest({
				url : "EMPLOYEES('2')/Name",
				method : "GET",
				batchNo : 1
			}, {
				value : "Frederic Fall"
			})
			.expectRequest({
				url : "EMPLOYEES('3')/Name",
				method : "GET",
				batchNo : 2
			}, {
				value : "Jonathan Smith"
			})
			.expectChange("text1", "Frederic Fall")
			.expectChange("text2", "Jonathan Smith");

		return this.createView(assert, sView, createTeaBusiModel({}));
	});

	//*********************************************************************************************
	// Scenario: sap.ui.table.Table with VisibleRowCountMode="Auto" only calls ODLB.getContexts()
	// after rendering (via setTimeout). This must not lead to separate requests for each table
	// cell resp. console errors due to data access via virtual context.
	// BCP 1770367083
	// Also tests that key properties are $select'ed for a sap.ui.table.Table with query options
	// different from $expand and $select in the binding parameters of the rows aggregation.
	QUnit.test("sap.ui.table.Table with VisibleRowCountMode='Auto'", function (assert) {
		var sView = '\
<t:Table id="table" rows="{path : \'/EMPLOYEES\', parameters : {$filter : \'AGE gt 42\'}}"\
		visibleRowCountMode="Auto">\
	<t:Column>\
		<t:label>\
			<Label text="Name"/>\
		</t:label>\
		<t:template>\
			<Text id="text" text="{Name}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			oModel = createTeaBusiModel({autoExpandSelect : true});

		this.expectRequest("EMPLOYEES?$filter=AGE gt 42&$select=ID,Name&$skip=0&$top=105", {
				"value" : [
					{"Name" : "Frederic Fall"},
					{"Name" : "Jonathan Smith"}
				]
			})
			.expectChange("text", ["Frederic Fall", "Jonathan Smith"]);

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: a ManagedObject instance with a relative object binding (using
	// cross-service navigation) and a property binding (maybe even at the same time)
	// Note: ID will not fail, it is also present on EQUIPMENT! SupplierIdentifier is "unique"
	QUnit.test("Relative object binding & property binding: separate control", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			oText = new Text(),
			sView = '\
<FlexBox binding="{/Equipments(Category=\'Electronics\',ID=1)}">\
	<FlexBox binding="{EQUIPMENT_2_PRODUCT}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="text" text="{SupplierIdentifier}" />\
	</FlexBox>\
</FlexBox>';

		this.expectRequest("Equipments(Category='Electronics',ID=1)?$select=Category,ID"
				+ "&$expand=EQUIPMENT_2_PRODUCT($select=ID,SupplierIdentifier)", {
				"Category" : "Electronics",
				"ID" : 1,
				"EQUIPMENT_2_PRODUCT" : {
					"ID" : 2, // Edm.Int32
					"SupplierIdentifier" : 42 // Edm.Int32
				}
			})
			// Note: sap.m.Text#text turns value into string!
			.expectChange("text", oText.validateProperty("text", 42));

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	QUnit.test("Relative object binding & property binding: same control", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			oText = new Text(),
			sView = '\
<FlexBox binding="{/Equipments(Category=\'Electronics\',ID=1)}">\
	<Text binding="{EQUIPMENT_2_PRODUCT}" id="text" text="{SupplierIdentifier}" />\
</FlexBox>';

		this.expectRequest("Equipments(Category='Electronics',ID=1)?$select=Category,ID"
				+ "&$expand=EQUIPMENT_2_PRODUCT($select=ID,SupplierIdentifier)", {
				"Category" : "Electronics",
				"ID" : 1,
				"EQUIPMENT_2_PRODUCT" : {
					"ID" : 2, // Edm.Int32
					"SupplierIdentifier" : 42 // Edm.Int32
				}
			})
			// Note: sap.m.Text#text turns value into string!
			.expectChange("text", oText.validateProperty("text", 42));

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: a ManagedObject instance with a relative object binding
	// *using cross-service navigation*
	// and a property binding at the same time, inside a list binding
	// Note: ID will not fail, it is also present on EQUIPMENT! SupplierIdentifier is "unique"
	QUnit.test("Relative object binding & property binding within a list (1)", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			oText = new Text(),
			sView = '\
<Table items="{/Equipments}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text binding="{EQUIPMENT_2_PRODUCT}" id="text" text="{SupplierIdentifier}" />\
	</ColumnListItem>\
</Table>';

		this.expectRequest("Equipments?$select=Category,ID&"
				+ "$expand=EQUIPMENT_2_PRODUCT($select=ID,SupplierIdentifier)"
				+ "&$skip=0&$top=100", {
				value : [{
					"Category" : "Electronics",
					"ID" : 1,
					"EQUIPMENT_2_PRODUCT" : {
						"ID" : 2, // Edm.Int32
						"SupplierIdentifier" : 42 // Edm.Int32
					}
				}]
			})
			.expectChange("text", oText.validateProperty("text", 42));

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: a ManagedObject instance with a relative object binding
	// *w/o cross-service navigation*
	// and a property binding at the same time, inside a list binding
	// Note: ID will not fail, it is also present on EQUIPMENT! AGE is "unique"
	QUnit.test("Relative object binding & property binding within a list (2)", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			oText = new Text(),
			sView = '\
<Table items="{/Equipments}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text binding="{EQUIPMENT_2_EMPLOYEE}" id="text" text="{AGE}" />\
	</ColumnListItem>\
</Table>';

		this.expectRequest("Equipments?$select=Category,ID&"
				+ "$expand=EQUIPMENT_2_EMPLOYEE($select=AGE,ID)"
				+ "&$skip=0&$top=100", {
				value : [{
					"Category" : "Electronics",
					"ID" : 1,
					"EQUIPMENT_2_EMPLOYEE" : {
						"ID" : "0815", // Edm.String
						"AGE" : 42 // Edm.Int16
					}
				}]
			})
			// Note: change does not appear inside a list binding, it's inside the context binding!
			.expectChange("text", oText.validateProperty("text", 42));

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: a ManagedObject instance with a relative object binding (w/o
	// cross-service navigation) and a property binding at the same time, inside a list binding
	// Note: ID will not fail, it is also present on EQUIPMENT! AGE is "unique"
	QUnit.test("Relative object binding & property binding within a list (3)", function (assert) {
		var oText = new Text(),
			sView = '\
<Table items="{/Equipments}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text binding="{EQUIPMENT_2_EMPLOYEE}" id="text" text="{AGE}" />\
	</ColumnListItem>\
</Table>';

		this.expectRequest("Equipments?$skip=0&$top=100", {
				value : [{
					"Category" : "Electronics",
					"ID" : 1,
					"EQUIPMENT_2_EMPLOYEE" : {
						"ID" : "0815", // Edm.String
						"AGE" : 42 // Edm.Int16
					}
				}]
			})
			// Note: change does not appear inside a list binding, it's inside the context binding!
			.expectChange("text", oText.validateProperty("text", 42));

		return this.createView(assert, sView);
	});

	//*********************************************************************************************
	// Scenario: Object binding provides access to some collection and you then want to filter on
	//   that collection; inspired by https://github.com/SAP/openui5/issues/1763
	QUnit.test("Filter collection provided via object binding", function (assert) {
		var sView = '\
<VBox id="vbox" binding="{parameters : {$expand : \'TEAM_2_EMPLOYEES\'},\
		path : \'/TEAMS(\\\'42\\\')\'}">\
	<Table items="{TEAM_2_EMPLOYEES}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="id" text="{ID}" />\
		</ColumnListItem>\
	</Table>\
</VBox>',
			that = this;

		// Note: for simplicity, autoExpandSelect : false but still most properties are omitted
		this.expectRequest("TEAMS('42')?$expand=TEAM_2_EMPLOYEES", {
				"TEAM_2_EMPLOYEES" : [
					{"ID" : "1"},
					{"ID" : "2"},
					{"ID" : "3"}
				]
			})
			.expectChange("id", ["1", "2", "3"]);

		return this.createView(assert, sView).then(function () {
			that.expectRequest("TEAMS('42')?$expand=TEAM_2_EMPLOYEES($filter=ID eq '2')", {
					"TEAM_2_EMPLOYEES" : [{
						"ID" : "2"
					}]
				})
				.expectChange("id", ["2"]);

			that.oView.byId("vbox").getObjectBinding()
				.changeParameters({$expand : "TEAM_2_EMPLOYEES($filter=ID eq '2')"});

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Behaviour of a deferred bound function
	QUnit.test("Bound function", function (assert) {
		var sView = '\
<FlexBox binding="{/EMPLOYEES(\'1\')}">\
	<FlexBox id="function" \
		binding="{com.sap.gateway.default.iwbep.tea_busi.v0001.FuGetEmployeeSalaryForecast(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="status" text="{STATUS}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectChange("status", null);

		return this.createView(assert, sView).then(function () {
			that.expectRequest("EMPLOYEES('1')/com.sap.gateway.default.iwbep.tea_busi.v0001"
					+ ".FuGetEmployeeSalaryForecast()", {
					"STATUS" : "42"
				})
				.expectChange("status", "42");

			return Promise.all([
				// code under test
				that.oView.byId("function").getObjectBinding().execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Operation binding for a function, first it is deferred, later is has been executed.
	//   Show interaction of setParameter(), execute() and refresh().
	QUnit.test("Function binding: setParameter, execute and refresh", function (assert) {
		var oFunctionBinding,
			sView = '\
<FlexBox id="function" binding="{/GetEmployeeByID(...)}">\
	<Text id="name" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectChange("name", null);

		return this.createView(assert, sView).then(function () {
			oFunctionBinding = that.oView.byId("function").getObjectBinding();

			oFunctionBinding.refresh(); // MUST NOT trigger a request!

			that.expectRequest("GetEmployeeByID(EmployeeID='1')", {
					"Name" : "Jonathan Smith"
				})
				.expectChange("name", "Jonathan Smith");

			return Promise.all([
				oFunctionBinding.setParameter("EmployeeID", "1").execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("GetEmployeeByID(EmployeeID='1')", {
					"Name" : "Frederic Fall"
				})
				.expectChange("name", "Frederic Fall");
			oFunctionBinding.refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			oFunctionBinding.setParameter("EmployeeID", "2");

			oFunctionBinding.refresh(); // MUST NOT trigger a request!

			that.expectRequest("GetEmployeeByID(EmployeeID='2')", {
					"Name" : "Peter Burke"
				})
				.expectChange("name", "Peter Burke");

			return Promise.all([
				oFunctionBinding.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("GetEmployeeByID(EmployeeID='2')", {
					"Name" : "Jonathan Smith"
				})
				.expectChange("name", "Jonathan Smith");
			oFunctionBinding.refresh();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Operation binding for a function, first it is deferred, later is has been executed.
	//   Show interaction of setParameter(), execute() and changeParameters().
	QUnit.test("Function binding: setParameter, execute and changeParameters", function (assert) {
		var oFunctionBinding,
			sView = '\
<FlexBox id="function" binding="{/GetEmployeeByID(...)}">\
	<Text id="name" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectChange("name", null);

		return this.createView(assert, sView).then(function () {
			oFunctionBinding = that.oView.byId("function").getObjectBinding();

			oFunctionBinding.changeParameters({$select: "Name"}); // MUST NOT trigger a request!

			that.expectRequest("GetEmployeeByID(EmployeeID='1')?$select=Name", {
					"Name" : "Jonathan Smith"
				})
				.expectChange("name", "Jonathan Smith");

			return Promise.all([
				oFunctionBinding.setParameter("EmployeeID", "1").execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("GetEmployeeByID(EmployeeID='1')?$select=ID,Name", {
					"Name" : "Frederic Fall"
				})
				.expectChange("name", "Frederic Fall");
			oFunctionBinding.changeParameters({$select: "ID,Name"});

			return that.waitForChanges(assert);
		}).then(function () {
			oFunctionBinding.setParameter("EmployeeID", "2");

			// MUST NOT trigger a request!
			oFunctionBinding.changeParameters({$select: "Name"});

			that.expectRequest("GetEmployeeByID(EmployeeID='2')?$select=Name", {
					"Name" : "Peter Burke"
				})
				.expectChange("name", "Peter Burke");

			return Promise.all([
				oFunctionBinding.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("GetEmployeeByID(EmployeeID='2')?$select=ID,Name", {
					"Name" : "Jonathan Smith"
				})
				.expectChange("name", "Jonathan Smith");
			oFunctionBinding.changeParameters({$select : "ID,Name"});

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: ODataListBinding contains ODataContextBinding contains ODataPropertyBinding;
	//   only one cache; refresh()
	QUnit.test("refresh on dependent bindings", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sUrl = "TEAMS('42')?$select=Team_Id&$expand=TEAM_2_MANAGER($select=ID)",
			sView = '\
<FlexBox binding="{/TEAMS(\'42\')}">\
	<FlexBox binding="{TEAM_2_MANAGER}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="id" text="{ID}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest(sUrl, {
				"Team_Id" : "42",
				"TEAM_2_MANAGER" : {
					"ID" : "1"
				}
			})
			.expectChange("id", "1");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest(sUrl, {
					"Team_Id" : "42",
					"TEAM_2_MANAGER" : {
						"ID" : "2"
					}
				})
				.expectChange("id", "2");

			oModel.refresh();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: sap.chart.Chart wants to read all data w/o paging
	QUnit.test("no paging", function (assert) {
		var fnGetContexts = ODataListBinding.prototype.getContexts,
			sView = '\
<Table id="table" items="{/TEAMS}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{Team_Id}" />\
	</ColumnListItem>\
</Table>';

		this.mock(ODataListBinding.prototype).expects("getContexts").atLeast(1).callsFake(
			function (iStart, iLength, iMaximumPrefetchSize) {
				// this is how the call by sap.chart.Chart should look like --> GET w/o $top!
				return fnGetContexts.call(this, iStart, iLength, Infinity);
			});
		this.expectRequest("TEAMS", {
				"value" : [{
					"Team_Id" : "TEAM_00"
				}, {
					"Team_Id" : "TEAM_01"
				}, {
					"Team_Id" : "TEAM_02"
				}]
			})
			.expectChange("id", ["TEAM_00", "TEAM_01", "TEAM_02"]);

		return this.createView(assert, sView);
	});

	//*********************************************************************************************
	// Scenario: some custom control wants to read all data, and it gets a lot
	QUnit.test("read all data", function (assert) {
		var i, n = 5000,
			aIDs = new Array(n),
			aValues = new Array(n),
			sView = '\
<List id="list">\
</List>',
			that = this;

		for (i = 0; i < n; i += 1) {
			aIDs[i] = "TEAM_" + i;
			aValues[i] = {"Team_Id" : aIDs[i]};
		}

		return this.createView(assert, sView).then(function () {
			var oText = new Text("id", {text : "{Team_Id}"});

			that.setFormatter(assert, oText, "id", true);
			that.expectRequest("TEAMS", {
					"value" : aValues
				})
				.expectChange("id", aIDs);

			that.oView.byId("list").bindItems({
				length : Infinity, // code under test
				path : "/TEAMS",
				template : new CustomListItem({content : [oText]})
			});

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: read all data w/o a control on top
	QUnit.test("read all data w/o a control on top", function (assert) {
		var done = assert.async(),
			i, n = 10000,
			aIDs = new Array(n),
			aValues = new Array(n),
			that = this;

		for (i = 0; i < n; i += 1) {
			aIDs[i] = "TEAM_" + i;
			aValues[i] = {"Team_Id" : aIDs[i]};
		}

		return this.createView(assert, "").then(function () {
			var oListBinding = that.oModel.bindList("/TEAMS");

			that.expectRequest("TEAMS", {"value" : aValues});

			oListBinding.getContexts(0, Infinity);
			oListBinding.attachEventOnce("change", function () {
				oListBinding.getContexts(0, Infinity).forEach(function (oContext, i) {
					var sId = oContext.getProperty("Team_Id");

					// Note: avoid bad performance of assert.strictEqual(), e.g. DOM manipulation
					if (sId !== aIDs[i]) {
						assert.strictEqual(sId, aIDs[i]);
					}
				});
				done();
			});

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: ODataListBinding contains ODataContextBinding contains ODataPropertyBinding;
	//   only one cache; hasPendingChanges()
	QUnit.test("hasPendingChanges on dependent bindings", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sUrl = "SalesOrderList?$select=SalesOrderID"
				+ "&$expand=SO_2_BP($select=BusinessPartnerID,CompanyName)&$skip=0&$top=100",
			sView = '\
<Table id="table" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Input binding="{SO_2_BP}" value="{CompanyName}"/>\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest(sUrl, {
				value : [{
					"SalesOrderID" : "42",
					"SO_2_BP" : {
						"BusinessPartnerID" : "1",
						"CompanyName" : "Foo, Inc",
						"@odata.etag" : "ETag"
					}
				}]
			});

		return this.createView(assert, sView, oModel).then(function () {
			var oText = that.oView.byId("table").getItems()[0].getCells()[0];

			that.expectRequest({
					method : "PATCH",
					url : "BusinessPartnerList('1')",
					headers : {"If-Match" : "ETag"},
					payload : {"CompanyName" : "Bar, Inc"}
				}, {});

			oText.getBinding("value").setValue("Bar, Inc");

			// code under test
			assert.strictEqual(oText.getElementBinding().hasPendingChanges(), true);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Support expression binding in ODataModel.integration.qunit
	testViewStart("Expression binding",
		'<Text id="text" text="{= \'Hello, \' + ${/EMPLOYEES(\'2\')/Name} }" />',
		{"EMPLOYEES('2')/Name" : {"value" : "Frederic Fall"}},
		{"text" : "Hello, Frederic Fall"}
	);

	//*********************************************************************************************
	// Scenario: Support expression binding on a list in ODataModel.integration.qunit
	// Note: Use "$\{Name}" to avoid that Maven replaces "sap.ui.core"
	testViewStart("Expression binding in a list", '\
<Table items="{/EMPLOYEES}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{= \'Hello, \' + $\{Name} }" />\
	</ColumnListItem>\
</Table>',
		{"EMPLOYEES?$skip=0&$top=100" :
			{"value" : [{"Name" : "Frederic Fall"}, {"Name" : "Jonathan Smith"}]}},
		{"text" : ["Hello, Frederic Fall", "Hello, Jonathan Smith"]}
	);

	//*********************************************************************************************
	// Scenario: Enable auto-$expand/$select mode for an ODataContextBinding with relative
	// ODataPropertyBindings to a advertised action
	testViewStart("Auto-$expand/$select: relative ODPB to advertised action",'\
<FlexBox binding="{path : \'/EMPLOYEES(\\\'2\\\')\', parameters : {$select : \'AGE\'}}">\
	<Text id="name" text="{Name}" />\
	<Text id="adAction1"\
		text="{= %{#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsOccupied}\
			? \'set to occupied\' : \'\'}" />\
	<Text id="adAction2"\
		text="{= %{#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable}\
			? \'set to available\' : \'\'}" />\
</FlexBox>', {
			"EMPLOYEES('2')?$select=AGE,ID,Name,com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable,com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsOccupied" : {
				"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {},
				"AGE" : 32,
				"Name" : "Frederic Fall"
			}
		}, [{
			"adAction1" : "",
			"adAction2" : "set to available",
			"name" : "Frederic Fall"
		}], createTeaBusiModel({autoExpandSelect : true})
	);

	//*********************************************************************************************
	// Scenario: updates for advertised action's title caused by: refresh, side effect of edit,
	// bound action
	// CPOUI5UISERVICESV3-905, CPOUI5UISERVICESV3-1714
	//
	// TODO automatic type determination cannot handle #com...AcSetIsAvailable/title
	// TODO neither can autoExpandSelect
	QUnit.test("Advertised actions: title updates", function (assert) {
		var oModel = createTeaBusiModel(),
			sView = '\
<FlexBox binding="{/EMPLOYEES(\'2\')}" id="form">\
	<Input id="name" value="{Name}" />\
	<Text id="title" text="{\
		path : \'#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable/title\',\
		type : \'sap.ui.model.odata.type.String\'}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('2')", {
				"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {
					"title": "First Title"
				},
				"ID" : "2",
				"Name" : "Frederic Fall"
			})
			.expectChange("name", "Frederic Fall")
			.expectChange("title", "First Title");

		return this.createView(assert, sView, oModel).then(function () {
			var oContextBinding = that.oView.byId("form").getObjectBinding();

			that.expectRequest("EMPLOYEES('2')", {
					"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {
						"title": "Second Title"
					},
					"ID" : "2",
					"Name" : "Frederic Fall"
				})
				.expectChange("name", "Frederic Fall")
				.expectChange("title", "Second Title");

			// code under test
			oContextBinding.refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					"method": "PATCH",
					"payload": {
						"Name": "Frederic Spring"
					},
					"url": "EMPLOYEES('2')"
				}, {
					"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {
						"title": "Third Title"
					}
//					"ID" : "2",
//					"Name" : "Frederic Spring"
				})
				.expectChange("name", "Frederic Spring")
				.expectChange("title", "Third Title");

			// code under test
			that.oView.byId("name").getBinding("value").setValue("Frederic Spring");

			return that.waitForChanges(assert);
		}).then(function () {
			var sActionName = "com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee",
				oContext = that.oView.byId("form").getObjectBinding().getBoundContext(),
				oActionBinding = oModel.bindContext(sActionName + "(...)", oContext);

			that.expectRequest({
					"method": "POST",
					"payload": {
						"TeamID": "TEAM_02"
					},
					"url": "EMPLOYEES('2')/" + sActionName
				}, {
					"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {
						"title": "Fourth Title"
					},
					"ID" : "2",
					"Name" : "Frederic Winter"
				})
				.expectChange("name", "Frederic Winter")
				.expectChange("title", "Fourth Title");

			// code under test
			oActionBinding.setParameter("TeamID", "TEAM_02").execute();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: updates for advertised action (as an object) caused by: refresh, side effect of
	// edit, bound action
	// CPOUI5UISERVICESV3-905, CPOUI5UISERVICESV3-1714
	QUnit.test("Advertised actions: object updates", function (assert) {
		var oModel = createTeaBusiModel(),
			sView = '\
<FlexBox binding="{/EMPLOYEES(\'2\')}" id="form">\
	<Text id="enabled"\
		text="{= %{#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable} ? 1 : 0 }" />\
	<Input id="name" value="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('2')", {
				"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {},
				"ID" : "2",
				"Name" : "Frederic Fall"
			})
			.expectChange("enabled", 1)
			.expectChange("name", "Frederic Fall");

		return this.createView(assert, sView, oModel).then(function () {
			var oContextBinding = that.oView.byId("form").getObjectBinding();

			that.expectRequest("EMPLOYEES('2')", {
					"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : null,
					"ID" : "2",
					"Name" : "Frederic Fall"
				})
				// Note: "<code>false</code> to enforce listening to a template control" --> use 0!
				.expectChange("enabled", 0)
				.expectChange("name", "Frederic Fall");

			// code under test
			oContextBinding.refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					"method": "PATCH",
					"payload": {
						"Name": "Frederic Spring"
					},
					"url": "EMPLOYEES('2')"
				}, {
					"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {}
//					"ID" : "2",
//					"Name" : "Frederic Spring"
				})
				.expectChange("enabled", 1)
				.expectChange("name", "Frederic Spring");

			// code under test
			that.oView.byId("name").getBinding("value").setValue("Frederic Spring");

			return that.waitForChanges(assert);
		}).then(function () {
			var sActionName = "com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee",
				oContext = that.oView.byId("form").getObjectBinding().getBoundContext(),
				oActionBinding = oModel.bindContext(sActionName + "(...)", oContext);

			that.expectRequest({
					"method": "POST",
					"payload": {
						"TeamID": "TEAM_02"
					},
					"url": "EMPLOYEES('2')/" + sActionName
				}, {
					"ID" : "2",
					"Name" : "Frederic Winter"
				})
				.expectChange("enabled", 0)
				.expectChange("name", "Frederic Winter");

			// code under test
			oActionBinding.setParameter("TeamID", "TEAM_02").execute();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: updates for advertised action (as an object) incl. its title caused by bound action
	// (refresh for sure works, side effect of edit works the same as bound action)
	// CPOUI5UISERVICESV3-905, CPOUI5UISERVICESV3-1714
	QUnit.test("Advertised actions: object & title updates", function (assert) {
		var oActionBinding,
			sActionName = "com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee",
			oModel = createTeaBusiModel(),
			sView = '\
<FlexBox binding="{/EMPLOYEES(\'2\')}" id="form">\
	<Text id="enabled"\
		text="{= %{#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable} ? 1 : 0 }" />\
	<Text id="title" text="{\
		path : \'#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable/title\',\
		type : \'sap.ui.model.odata.type.String\'}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('2')", {
				"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {
					"title": "First Title"
				},
				"ID" : "2"
			})
			.expectChange("enabled", 1)
			.expectChange("title", "First Title");

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("form").getObjectBinding().getBoundContext();

			oActionBinding = oModel.bindContext(sActionName + "(...)", oContext);
			that.expectRequest({
					"method": "POST",
					"payload": {},
					"url": "EMPLOYEES('2')/" + sActionName
				}, {
					"ID" : "2"
				})
				.expectChange("enabled", 0)
				.expectChange("title", null);

			// code under test
			oActionBinding.execute();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					"method": "POST",
					"payload": {},
					"url": "EMPLOYEES('2')/" + sActionName
				}, {
					"#com.sap.gateway.default.iwbep.tea_busi.v0001.AcSetIsAvailable" : {
						"title": "Second Title"
					},
					"ID" : "2"
				})
				.expectChange("enabled", 1)
				.expectChange("title", "Second Title");

			// code under test
			oActionBinding.execute();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: master/detail with V2 adapter where the detail URI must be adjusted for V2
	// Additionally properties of a contained complex type are used with auto-$expand/$select
	QUnit.test("V2 adapter: master/detail", function (assert) {
		var oModel = this.createModelForV2FlightService({autoExpandSelect : true}),
			sView = '\
<Table id="master" items="{/FlightCollection}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="carrid" text="{carrid}" />\
	</ColumnListItem>\
</Table>\
<FlexBox id="detail" binding="{}">\
	<Text id="cityFrom" text="{flightDetails/cityFrom}" />\
	<Text id="cityTo" text="{flightDetails/cityTo}" />\
</FlexBox>',
			that = this;

		this.expectRequest("FlightCollection?$select=carrid,connid,fldate&$skip=0&$top=100", {
				"d" : {
					"results" : [{
						"__metadata" : {
							"type" : "RMTSAMPLEFLIGHT.Flight"
						},
						"carrid" : "AA",
						"connid" : "0017",
						"fldate" : "/Date(1502323200000)/"
					}]
				}
			})
			.expectChange("carrid", ["AA"])
			.expectChange("cityFrom") // expect a later change
			.expectChange("cityTo"); // expect a later change

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("master").getItems()[0].getBindingContext();

			that.expectRequest("FlightCollection(carrid='AA',connid='0017',fldate=datetime"
					+ "'2017-08-10T00%3A00%3A00')?$select=carrid,connid,fldate,flightDetails", {
					"d" : {
						"__metadata" : {
							"type" : "RMTSAMPLEFLIGHT.Flight"
						},
						"carrid" : "AA",
						"connid" : "0017",
						"fldate" : "/Date(1502323200000)/",
						"flightDetails" : {
							"__metadata" : {
								"type" : "RMTSAMPLEFLIGHT.FlightDetails"
							},
							"cityFrom" : "New York",
							"cityTo" : "Los Angeles"
						}
					}
				})
				.expectChange("cityFrom", "New York")
				.expectChange("cityTo", "Los Angeles");

			that.oView.byId("detail").setBindingContext(oContext);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="GET"> in V2 Adapter
	// Usage of service: /sap/opu/odata/IWFND/RMTSAMPLEFLIGHT/
	QUnit.test("V2 Adapter: FunctionImport", function (assert) {
		var oModel = this.createModelForV2FlightService(),
			that = this;

		// code under test
		return this.createView(assert, '', oModel).then(function () {
			var oContextBinding = oModel.bindContext("/GetAvailableFlights(...)");

			that.expectRequest("GetAvailableFlights?fromdate=datetime'2017-08-10T00:00:00'"
					+ "&todate=datetime'2017-08-10T23:59:59'"
					+ "&cityfrom='new york'&cityto='SAN FRANCISCO'", {
					"d" : {
						"results" : [{
							"__metadata" : {
								"type" : "RMTSAMPLEFLIGHT.Flight"
							},
							"carrid" : "AA",
							"connid" : "0017",
							"fldate" : "/Date(1502323200000)/"
						}, {
							"__metadata" : {
								"type" : "RMTSAMPLEFLIGHT.Flight"
							},
							"carrid" : "DL",
							"connid" : "1699",
							"fldate" : "/Date(1502323200000)/"
						}, {
							"__metadata" : {
								"type" : "RMTSAMPLEFLIGHT.Flight"
							},
							"carrid" : "UA",
							"connid" : "3517",
							"fldate" : "/Date(1502323200000)/"
						}]
					}
				});

			return Promise.all([
				oContextBinding
					.setParameter("fromdate", "2017-08-10T00:00:00Z")
					.setParameter("todate", "2017-08-10T23:59:59Z")
					.setParameter("cityfrom", "new york")
					.setParameter("cityto", "SAN FRANCISCO")
					.execute(),
				that.waitForChanges(assert)
			]).then(function () {
				var oListBinding = oModel.bindList("value", oContextBinding.getBoundContext()),
					aContexts = oListBinding.getContexts(0, Infinity);

				aContexts.forEach(function (oContext, i) {
					// Note: This just illustrates the status quo. It is not meant to say this must
					// be kept stable.
					assert.strictEqual(oContext.getPath(), "/GetAvailableFlights(...)/value/" + i);
					assert.strictEqual(oContext.getProperty("fldate"), "2017-08-10T00:00:00Z");
				});
			});
		});
	});

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="GET" ReturnType="Edm.DateTime"> in V2 Adapter
	QUnit.test("V2 Adapter: bound function returns primitive", function (assert) {
		var oModel = this.createModelForV2FlightService(),
			sView = '\
<FlexBox binding="{/NotificationCollection(\'foo\')}">\
	<Text id="updated" text="{= %{updated} }" />\
	<FlexBox id="function" binding="{RMTSAMPLEFLIGHT.__FAKE__FunctionImport(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="value" text="{= %{value} }" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("NotificationCollection('foo')", {
				"d" : {
					"__metadata" : {
						"type" : "RMTSAMPLEFLIGHT.Notification"
					},
					"ID" : "foo",
					"updated" : "/Date(1502323200000)/"
				}
			})
			.expectChange("updated", "2017-08-10T00:00:00Z")
			.expectChange("value", undefined);

		// code under test
		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("__FAKE__FunctionImport?ID='foo'", {
					"d" : { // Note: DataServiceVersion : 1.0
						"__FAKE__FunctionImport" : "/Date(1502323200000)/"
					}
				})
				.expectChange("value", "2017-08-10T00:00:00Z");

			return Promise.all([
				that.oView.byId("function").getObjectBinding().execute(),
				that.waitForChanges(assert)
			]);
		});
	});
	//TODO support also "version 2.0 JSON representation of a property"?

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="GET" ReturnType="Collection(Edm.DateTime)"> in V2
	// Adapter
	// Usage of service: /sap/opu/odata/IWFND/RMTSAMPLEFLIGHT/
	QUnit.test("V2 Adapter: FunctionImport returns Collection(Edm.DateTime)", function (assert) {
		var oModel = this.createModelForV2FlightService(),
			that = this;

		// code under test
		return this.createView(assert, '', oModel).then(function () {
			var oContextBinding = oModel.bindContext("/__FAKE__GetAllFlightDates(...)");

			that.expectRequest("__FAKE__GetAllFlightDates", {
					"d" : { // Note: DataServiceVersion : 2.0
						"results" : [
							"/Date(1502323200000)/",
							"/Date(1502323201000)/",
							"/Date(1502323202000)/"
						]
					}
				});

			return Promise.all([
				oContextBinding.execute(),
				that.waitForChanges(assert)
			]).then(function () {
				var oListBinding = oModel.bindList("value", oContextBinding.getBoundContext()),
					aContexts = oListBinding.getContexts(0, Infinity);

				aContexts.forEach(function (oContext, i) {
					// Note: This just illustrates the status quo. It is not meant to say this must
					// be kept stable.
					assert.strictEqual(oContext.getPath(),
						"/__FAKE__GetAllFlightDates(...)/value/" + i);
					assert.strictEqual(oContext.getProperty(""), "2017-08-10T00:00:0" + i + "Z");
				});
			});
		});
	});

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="GET" ReturnType="Collection(FlightDetails)"> in V2
	// Adapter
	// Usage of service: /sap/opu/odata/IWFND/RMTSAMPLEFLIGHT/
	QUnit.test("V2 Adapter: FunctionImport returns Collection(ComplexType)", function (assert) {
		var oModel = this.createModelForV2FlightService(),
			that = this;

		// code under test
		return this.createView(assert, '', oModel).then(function () {
			var oContextBinding = oModel.bindContext("/__FAKE__GetFlightDetailsByCarrier(...)");

			that.expectRequest("__FAKE__GetFlightDetailsByCarrier?carrid='AA'", {
					"d" : { // Note: DataServiceVersion : 2.0
						"results" : [{
							"__metadata" : { // just like result of GetFlightDetails
								"type" : "RMTSAMPLEFLIGHT.FlightDetails"
							},
							"arrivalTime" : "PT14H00M00S",
							"departureTime" : "PT11H00M00S"
						}, {
							"__metadata" : {
								"type" : "RMTSAMPLEFLIGHT.FlightDetails"
							},
							"arrivalTime" : "PT14H00M01S",
							"departureTime" : "PT11H00M01S"
						}, {
							"__metadata" : {
								"type" : "RMTSAMPLEFLIGHT.FlightDetails"
							},
							"arrivalTime" : "PT14H00M02S",
							"departureTime" : "PT11H00M02S"
						}]
					}
				});

			return Promise.all([
				oContextBinding.setParameter("carrid", "AA").execute(),
				that.waitForChanges(assert)
			]).then(function () {
				var oListBinding = oModel.bindList("value", oContextBinding.getBoundContext()),
					aContexts = oListBinding.getContexts(0, Infinity);

				aContexts.forEach(function (oContext, i) {
					// Note: This just illustrates the status quo. It is not meant to say this must
					// be kept stable.
					assert.strictEqual(oContext.getPath(),
						"/__FAKE__GetFlightDetailsByCarrier(...)/value/" + i);
					assert.strictEqual(oContext.getProperty("arrivalTime"), "14:00:0" + i);
					assert.strictEqual(oContext.getProperty("departureTime"), "11:00:0" + i);
				});
			});
		});
	});

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="GET" sap:action-for="..."> in V2 Adapter
	// Usage of service: /sap/opu/odata/IWFND/RMTSAMPLEFLIGHT/
	//TODO $metadata of <FunctionImport> is broken, key properties and parameters do not match!
	// --> server expects GetFlightDetails?airlineid='AA'&connectionid='0017'&fldate=datetime'...'
	QUnit.test("V2 Adapter: bound function", function (assert) {
		var oModel = this.createModelForV2FlightService(),
			sView = '\
<FlexBox binding="{/FlightCollection(carrid=\'AA\',connid=\'0017\',fldate=2017-08-10T00:00:00Z)}">\
	<Text id="carrid" text="{carrid}" />\
	<FlexBox id="function" binding="{RMTSAMPLEFLIGHT.GetFlightDetails(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="distance" text="{distance}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("FlightCollection(carrid='AA',connid='0017'"
				+ ",fldate=datetime'2017-08-10T00%3A00%3A00')", {
				"d" : {
					"__metadata" : {
						"type" : "RMTSAMPLEFLIGHT.Flight"
					},
					"carrid" : "AA",
					"connid" : "0017",
					"fldate" : "/Date(1502323200000)/"
				}
			})
			.expectChange("carrid", "AA")
			.expectChange("distance", null);

		// code under test
		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("GetFlightDetails?carrid='AA'&connid='0017'"
					+ "&fldate=datetime'2017-08-10T00:00:00'", {
					"d" : {
						"GetFlightDetails" : {
							"__metadata" : {
								"type" : "RMTSAMPLEFLIGHT.FlightDetails"
							},
							"countryFrom" : "US",
							"cityFrom" : "new york",
							"airportFrom" : "JFK",
							"countryTo" : "US",
							"cityTo" : "SAN FRANCISCO",
							"airportTo" : "SFO",
							"flightTime" : 361,
							"departureTime" : "PT11H00M00S",
							"arrivalTime" : "PT14H01M00S",
							"distance" : "2572.0000",
							"distanceUnit" : "SMI",
							"flightType" : "",
							"period" : 0
						}
					}
				})
				.expectChange("distance", "2,572.0000");

			return Promise.all([
				that.oView.byId("function").getObjectBinding().execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="POST"> in V2 Adapter
	QUnit.test("V2 Adapter: ActionImport", function (assert) {
		var oContextBinding,
			oModel = this.createModelForV2FlightService(),
			that = this;

		// code under test
		return this.createView(assert, '', oModel).then(function () {
			oContextBinding = oModel.bindContext("/__FAKE__ActionImport(...)");

			that.expectRequest({
					method : "POST",
					url : "__FAKE__ActionImport?carrid='AA'"
						+ "&guid=guid'0050568D-393C-1ED4-9D97-E65F0F3FCC23'"
						+ "&fldate=datetime'2017-08-10T00:00:00'&flightTime=42"
				}, {
					"d" : {
						"__metadata" : {
							"type" : "RMTSAMPLEFLIGHT.Flight"
						},
						"carrid" : "AA",
						"connid" : "0017",
						"fldate" : "/Date(1502323200000)/",
						"PRICE" : "2222.00",
						"SEATSMAX" : 320
					}
				});

			return Promise.all([
				oContextBinding
					.setParameter("carrid", "AA")
					.setParameter("guid", "0050568D-393C-1ED4-9D97-E65F0F3FCC23")
					.setParameter("fldate", "2017-08-10T00:00:00Z")
					.setParameter("flightTime", 42)
					.execute(),
				that.waitForChanges(assert)]);
		}).then(function () {
			var oContext = oContextBinding.getBoundContext();

			assert.strictEqual(oContext.getProperty("carrid"), "AA");
			assert.strictEqual(oContext.getProperty("connid"), "0017");
			assert.strictEqual(oContext.getProperty("fldate"), "2017-08-10T00:00:00Z");
			assert.strictEqual(oContext.getProperty("SEATSMAX"), 320);

			// Note: this is async due to type retrieval
			return oContext.requestProperty("PRICE", true).then(function (sValue) {
				assert.strictEqual(sValue, "2,222.00");
			});
		});
	});

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="POST" sap:action-for="..."> in V2 Adapter
	// Usage of service: /sap/opu/odata/IWBEP/GWSAMPLE_BASIC/
	QUnit.test("V2 Adapter: bound action", function (assert) {
		var oModel = this.createModelForV2SalesOrderService(),
			sView = '\
<FlexBox binding="{/SalesOrderSet(\'0815\')}">\
	<Text id="id0" text="{SalesOrderID}" />\
	<FlexBox id="action" binding="{GWSAMPLE_BASIC.SalesOrder_Confirm(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="id1" text="{SalesOrderID}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderSet('0815')", {
				"d" : {
					"__metadata" : {
						"type" : "GWSAMPLE_BASIC.SalesOrder"
					},
					"SalesOrderID" : "0815"
				}
			})
			.expectChange("id0", "0815")
			.expectChange("id1", null);

		// code under test
		return this.createView(assert, sView, oModel).then(function () {
			var oContextBinding = that.oView.byId("action").getObjectBinding();

			that.expectRequest({
					method : "POST",
					url : "SalesOrder_Confirm?SalesOrderID='0815'"
				}, {
					"d" : {
						"__metadata" : {
							"type" : "GWSAMPLE_BASIC.SalesOrder"
						},
						"SalesOrderID" : "08/15",
						"CreatedAt" : "/Date(1502323200000)/"
					}
				})
				.expectChange("id1", "08/15");

			return Promise.all([
				oContextBinding.execute(),
				that.waitForChanges(assert)
			]).then(function () {
				assert.strictEqual(
					oContextBinding.getBoundContext().getProperty("CreatedAt"),
					"2017-08-10T00:00:00.0000000Z");
			});
		});
	});

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="POST" sap:action-for="..."> in V2 Adapter (w/o
	// reading binding parameter first!)
	// Usage of service: /sap/opu/odata/IWBEP/GWSAMPLE_BASIC/
	QUnit.skip("V2 Adapter: bound action on context w/o read", function (assert) {
		var oModel = this.createModelForV2SalesOrderService(),
			oParentContext = oModel.bindContext("/SalesOrderLineItemSet(\'0815\',\'10\')/ToHeader")
				.getBoundContext(),
			that = this;

		return this.createView(assert, "", oModel).then(function () {
			//TODO In the V2 adapter case a function import is used instead of a bound action. So we
			// need the key predicates which sometimes cannot be parsed from the URL. Trigger this
			// request and wait for the result before calling the function import.
			//TODO What about the ETag which might be got from this fresh request? Really use it?
			that.expectRequest("SalesOrderLineItemSet(\'0815\',\'10\')/ToHeader", {
					"d" : {
						"__metadata" : {
							"type" : "GWSAMPLE_BASIC.SalesOrder"
						},
						"SalesOrderID" : "0815"
					}
				})
				.expectRequest({
					method : "POST",
					url : "SalesOrder_Confirm?SalesOrderID='0815'"
				}, {
					"d" : {
						"__metadata" : {
							"type" : "GWSAMPLE_BASIC.SalesOrder"
						},
						"SalesOrderID" : "08/15"
					}
				});

			return Promise.all([
				// code under test
				oModel.bindContext("GWSAMPLE_BASIC.SalesOrder_Confirm(...)", oParentContext)
					.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: <FunctionImport m:HttpMethod="PUT" sap:action-for="..."> in V2 Adapter
	// Usage of service: /sap/opu/odata/IWFND/RMTSAMPLEFLIGHT/
	//TODO $metadata of <FunctionImport> is broken, key properties and parameters do not match!
	// --> server expects UpdateAgencyPhoneNo?agency_id='...'
	QUnit.test("V2 Adapter: bound action w/ PUT", function (assert) {
		var oModel = this.createModelForV2FlightService(),
			sView = '\
<FlexBox binding="{/TravelAgencies(\'00000061\')}">\
	<Text id="oldPhone" text="{TELEPHONE}" />\
	<FlexBox id="action" binding="{RMTSAMPLEFLIGHT.UpdateAgencyPhoneNo(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="newPhone" text="{TELEPHONE}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("TravelAgencies('00000061')", {
				"d" : {
					"__metadata" : {
						"type" : "RMTSAMPLEFLIGHT.Travelagency"
					},
					"agencynum" : "00000061",
					"NAME" : "Fly High",
					"TELEPHONE" : "+49 2102 69555"
				}
			})
			.expectChange("oldPhone", "+49 2102 69555")
			.expectChange("newPhone", null);

		// code under test
		return this.createView(assert, sView, oModel).then(function () {
			var oContextBinding = that.oView.byId("action").getObjectBinding();

			that.expectRequest({
					method : "PUT",
					url : "UpdateAgencyPhoneNo?agencynum='00000061'"
						+ "&telephone='%2B49 (0)2102 69555'"
				}, {
					"d" : {
						"__metadata" : {
							"type" : "RMTSAMPLEFLIGHT.Travelagency"
						},
						"agencynum" : "00000061",
						"NAME" : "Fly High",
						"TELEPHONE" : "+49 (0)2102 69555"
					}
				})
				.expectChange("newPhone", "+49 (0)2102 69555");

			return Promise.all([
				oContextBinding.setParameter("telephone", "+49 (0)2102 69555").execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Initially suspended context binding is resumed w/ or w/o refresh
	[true, false].forEach(function (bRefresh) {
		var sTitle = "suspend/resume: suspended context binding, refresh=" + bRefresh;

		QUnit.test(sTitle, function (assert) {
			var oModel = createTeaBusiModel({autoExpandSelect : true}),
				sView = '\
<FlexBox id="form" binding="{path : \'/Equipments(Category=\\\'Electronics\\\',ID=1)\', \
		suspended : true}">\
	<Text id="text" text="{Category}" />\
</FlexBox>',
				that = this;

			this.expectChange("text"); // expect no change initially

			return this.createView(assert, sView, oModel).then(function () {
				var oBinding = that.oView.byId("form").getObjectBinding();

				that.expectRequest("Equipments(Category='Electronics',ID=1)"
						+ "?$select=Category,ID", {
						"Category" : "Electronics",
						"ID" : 1
					})
					.expectChange("text", "Electronics");

				if (bRefresh) {
					oBinding.refresh();
				}
				oBinding.resume();

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: FlexBox with initially suspended context binding is changed by adding and removing
	//   a form field. After resume, one request reflecting the changes is sent and the added field
	//   is updated.
	[false, true].forEach(function (bRefresh) {
		var sTitle = "suspend/resume: changes for suspended context binding, refresh=" + bRefresh;

		QUnit.test(sTitle, function (assert) {
			var oModel = createTeaBusiModel({autoExpandSelect : true}),
				sView = '\
<FlexBox id="form" binding="{path : \'/Equipments(Category=\\\'Electronics\\\',ID=1)\', \
		suspended : true}">\
	<Text id="idCategory" text="{Category}" />\
	<Text id="idEmployeeId" text="{EmployeeId}" />\
</FlexBox>',
				that = this;

			this.expectChange("idCategory"); // expect no change initially

			return this.createView(assert, sView, oModel).then(function () {
				var oForm = that.oView.byId("form"),
					sId;

				sId = that.addToForm(oForm, "Name", assert);
				that.removeFromForm(oForm, "idEmployeeId");
				that.expectRequest("Equipments(Category='Electronics',ID=1)?"
						+ "$select=Category,ID,Name", {
						"Category" : "Electronics",
						"ID" : 1,
						"Name" : "Office PC"
					})
					.expectChange("idCategory", "Electronics")
					.expectChange(sId, "Office PC");

				if (bRefresh) {
					oForm.getObjectBinding().refresh();
				}
				oForm.getObjectBinding().resume();

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Minimal test for an absolute ODataPropertyBinding. This scenario is comparable with
	// "FavoriteProduct" in the SalesOrders application.
	testViewStart("V2 Adapter: Absolute ODataPropertyBinding",
		'<Text id="text" text="{= %{/ProductSet(\'HT-1000\')/CreatedAt} }" />',
		{"ProductSet('HT-1000')/CreatedAt" : {"d" : {"CreatedAt" : "/Date(1502323200000)/"}}},
		{"text" : "2017-08-10T00:00:00.0000000Z"},
		"createModelForV2SalesOrderService"
	);

	//*********************************************************************************************
	// Scenario: Absolute ODataPropertyBinding with custom query options. CPOUI5UISERVICESV3-1590.
	testViewStart("Absolute ODataPropertyBinding with custom query options",
		'<Text id="text" text="{path: \'/TEAMS(\\\'42\\\')/Name\',\
			parameters : {custom : \'foo\', c2 : \'x\'}}"/>',
		{"TEAMS('42')/Name?c1=a&c2=x&custom=foo" : {"value" : "Business Suite"}},
		{"text" : "Business Suite"},
		createModel(sTeaBusi + "?c1=a&c2=b")
	);

	//*********************************************************************************************
	// Scenario: Relative ODataPropertyBinding with parameters like custom query options or
	// $$groupId never sends own request. CPOUI5UISERVICESV3-1590.
	testViewStart("Relative ODataPropertyBinding with parameters",
		'<FlexBox binding="{/TEAMS(\'42\')}">\
			<Text id="text" text="{path: \'Name\',\
				parameters : {custom : \'foo\', $$groupId : \'binding\'}}" />\
		</FlexBox>',
		{"TEAMS('42')" : {"Name" : "Business Suite"}},
		{"text" : "Business Suite"},
		createTeaBusiModel()
	);

	//*********************************************************************************************
	// Scenario: Table with suspended list binding is changed by adding and removing a column. After
	//   resume, a request reflecting the changes is sent.
	[false, true].forEach(function (bRefresh) {
		var sTitle = "suspend/resume: suspended list binding, refresh=" + bRefresh;

		QUnit.test(sTitle, function (assert) {
			var oModel = createTeaBusiModel({autoExpandSelect : true}),
				sView = '\
<Table id="table" items="{path : \'/Equipments\', suspended : true, templateShareable : false}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="idCategory" text="{Category}" />\
			<Text id="idEmployeeId" text="{EmployeeId}" />\
		</ColumnListItem>\
	</items>\
</Table>',
				that = this;

			this.expectChange("idCategory", [])
				.expectChange("idEmployeeId", []);

			return this.createView(assert, sView, oModel).then(function () {
				var sId0,
					sId1,
					oTable = that.oView.byId("table");

				sId0 = that.addToTable(oTable, "Name", assert);
				sId1 = that.addToTable(oTable, "EQUIPMENT_2_EMPLOYEE/Name", assert);
				that.removeFromTable(oTable, "idEmployeeId");

				that.expectRequest("Equipments?$select=Category,ID,Name"
						+ "&$expand=EQUIPMENT_2_EMPLOYEE($select=ID,Name)&$skip=0&$top=100", {
						value : [{
							"Category" : "Electronics",
							"ID" : 1,
							"Name" : "Office PC",
							"EQUIPMENT_2_EMPLOYEE" : {
								"ID" : "2",
								"Name" : "Frederic Fall"
							}
						}, {
							"Category" : "Vehicle",
							"ID" : 2,
							"Name" : "VW Golf 2.0",
							"EQUIPMENT_2_EMPLOYEE" : {
								"ID" : "3",
								"Name" : "Jonathan Smith"
							}
						}]
					})
					.expectChange("idCategory", ["Electronics", "Vehicle"])
					.expectChange(sId0, ["Office PC", "VW Golf 2.0"])
					.expectChange(sId1, ["Frederic Fall", "Jonathan Smith"]);

				if (bRefresh) {
					oTable.getBinding("items").refresh();
				}
				oTable.getBinding("items").resume();

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: FlexBox with context binding is suspended after initialization and then changed by
	//   adding and removing a form field. After resume, a new request reflecting the changes is
	//   sent and the added field is updated.
	[false, true].forEach(function (bRefresh) {
		var sTitle = "suspend/resume: *not* suspended context binding, refresh=" + bRefresh;

		QUnit.test(sTitle, function (assert) {
			var oModel = createTeaBusiModel({autoExpandSelect : true}),
				sView = '\
<FlexBox id="form" binding="{/Equipments(Category=\'Electronics\',ID=1)}">\
	<Text id="idCategory" text="{Category}" />\
	<Text id="idEmployeeId" text="{EmployeeId}" />\
</FlexBox>',
				that = this;

			this.expectRequest("Equipments(Category='Electronics',ID=1)"
					+ "?$select=Category,EmployeeId,ID", {
					"Category" : "Electronics",
					"EmployeeId" : "0001",
					"ID" : 1
				})
				.expectChange("idCategory", "Electronics")
				.expectChange("idEmployeeId", "0001");

			return this.createView(assert, sView, oModel).then(function () {
				var oForm = that.oView.byId("form"),
					sId;

				oForm.getObjectBinding().suspend();
				sId = that.addToForm(oForm, "Name", assert);
				that.removeFromForm(oForm, "idEmployeeId");
				that.expectRequest("Equipments(Category='Electronics',ID=1)?$select=Category,ID,Name", {
						"Category" : "Electronics",
						"ID" : 1,
						"Name" : "Office PC"
					})
					.expectChange(sId, "Office PC");

				if (bRefresh) {
					oForm.getObjectBinding().refresh();
				}
				oForm.getObjectBinding().resume();

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Table with list binding is suspended after initialization and then changed by
	//   adding and removing a column. After resume, a new request reflecting the changes is
	//   sent and the added column is updated.
	[false, true].forEach(function (bRefresh) {
		QUnit.test("suspend/resume: *not* suspended list binding", function (assert) {
			var oModel = createTeaBusiModel({autoExpandSelect : true}),
				sView = '\
<Table id="table" items="{path : \'/Equipments\', templateShareable : false}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="idCategory" text="{Category}" />\
			<Text id="idEmployeeId" text="{EmployeeId}" />\
		</ColumnListItem>\
	</items>\
</Table>',
				that = this;

			this.expectRequest("Equipments?$select=Category,EmployeeId,ID&$skip=0&$top=100", {
					value : [{
						"Category" : "Electronics",
						"EmployeeId" : "0001",
						"ID" : 1
					}, {
						"Category" : "Vehicle",
						"EmployeeId" : "0002",
						"ID" : 2
					}]
				})
				.expectChange("idCategory", ["Electronics", "Vehicle"])
				.expectChange("idEmployeeId", ["0001", "0002"]);

			return this.createView(assert, sView, oModel).then(function () {
				var sId0,
					sId1,
					oTable = that.oView.byId("table");

				sId0 = that.addToTable(oTable, "Name", assert);
				sId1 = that.addToTable(oTable, "EQUIPMENT_2_EMPLOYEE/Name", assert);
				that.removeFromTable(oTable, "idEmployeeId");

				that.expectRequest("Equipments?$select=Category,ID,Name"
						+ "&$expand=EQUIPMENT_2_EMPLOYEE($select=ID,Name)&$skip=0&$top=100", {
						value : [{
							"Category" : "Electronics",
							"ID" : 1,
							"Name" : "Office PC",
							"EQUIPMENT_2_EMPLOYEE" : {
								"ID" : "2",
								"Name" : "Frederic Fall"
							}
						}, {
							"Category" : "Vehicle",
							"ID" : 2,
							"Name" : "VW Golf 2.0",
							"EQUIPMENT_2_EMPLOYEE" : {
								"ID" : "3",
								"Name" : "Jonathan Smith"
							}
						}]
					})
					.expectChange("idCategory", ["Electronics", "Vehicle"])
					.expectChange(sId0, ["Office PC", "VW Golf 2.0"])
					.expectChange(sId1, ["Frederic Fall", "Jonathan Smith"]);

				if (bRefresh) {
					oTable.getBinding("items").refresh();
				}
				oTable.getBinding("items").resume();

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Outer form with context binding is suspended after initialization; outer form
	//   contains inner form. Both forms are then changed by adding and removing a form field.
	//   After resume, a new request reflecting the changes is sent and the added fields are
	//   updated.
	[false, true].forEach(function (bRefresh) {
		var sTitle = "suspend/resume: dependent context bindings, refresh=" + bRefresh;

		QUnit.test(sTitle, function (assert) {
			var oModel = createTeaBusiModel({autoExpandSelect : true}),
				sView = '\
<FlexBox id="outerForm" binding="{/Equipments(Category=\'Electronics\',ID=1)}">\
	<Text id="idEquipmentName" text="{Name}" />\
	<FlexBox id="innerForm" binding="{EQUIPMENT_2_EMPLOYEE}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="idEmployeeName" text="{Name}" />\
		<Text id="idManagerId" text="{MANAGER_ID}" />\
	</FlexBox>\
</FlexBox>',
				that = this;

			this.expectRequest("Equipments(Category='Electronics',ID=1)?$select=Category,ID,Name"
					+ "&$expand=EQUIPMENT_2_EMPLOYEE($select=ID,MANAGER_ID,Name)", {
					"Category" : "Electronics",
					"ID" : 1,
					"Name" : "Office PC",
					"EQUIPMENT_2_EMPLOYEE" : {
						"ID" : "2",
						"MANAGER_ID" : "5",
						"Name" : "Frederic Fall"
					}
				})
				.expectChange("idEquipmentName", "Office PC")
				.expectChange("idEmployeeName", "Frederic Fall")
				.expectChange("idManagerId", "5");

			return this.createView(assert, sView, oModel).then(function () {
				var oOuterForm = that.oView.byId("outerForm"),
					oInnerForm = that.oView.byId("innerForm"),
					sIdEmployeeId,
					sIdAge;

				oOuterForm.getObjectBinding().suspend();
				sIdEmployeeId = that.addToForm(oOuterForm, "EmployeeId", assert);
				that.removeFromForm(oOuterForm, "idEquipmentName");
				sIdAge = that.addToForm(oInnerForm, "AGE", assert);
				that.removeFromForm(oInnerForm, "idManagerId");
				that.expectRequest("Equipments(Category='Electronics',ID=1)"
						+ "?$select=Category,EmployeeId,ID"
						+ "&$expand=EQUIPMENT_2_EMPLOYEE($select=AGE,ID,Name)", {
						"Category" : "Electronics",
						"EmployeeId" : "0002",
						"ID" : "1",
						"EQUIPMENT_2_EMPLOYEE" : {
							"AGE" : 32,
							"ID" : "2",
							"Name" : "Frederic Fall"
						}
					})
					.expectChange(sIdEmployeeId, "0002")
					.expectChange(sIdAge, "32");

				if (bRefresh) {
					oOuterForm.getObjectBinding().refresh();
				}
				oOuterForm.getObjectBinding().resume();

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Outer form with context binding is suspended after initialization; outer form
	//   contains inner table. Both form and table are then changed by adding and removing a form
	//   field resp. a table column.
	//   After resume, a new request reflecting the changes is sent and the added field/column is
	//   updated.
	QUnit.test("suspend/resume: context binding with dependent list binding", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="form" binding="{/TEAMS(\'TEAM_01\')}">\
	<Text id="idMemberCount" text="{MEMBER_COUNT}" />\
	<Table id="table" items="{path : \'TEAM_2_EMPLOYEES\', templateShareable : false}">\
		<columns><Column/><Column/></columns>\
		<ColumnListItem>\
			<Text id="idAge" text="{AGE}" />\
			<Text id="idName" text="{Name}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS('TEAM_01')?$select=MEMBER_COUNT,Team_Id"
				+ "&$expand=TEAM_2_EMPLOYEES($select=AGE,ID,Name)", {
				"Team_Id" : "TEAM_01",
				"MEMBER_COUNT" : 2,
				"TEAM_2_EMPLOYEES" : [{
					"ID" : "1",
					"Name" : "Frederic Fall",
					"AGE" : 52
				}, {
					"ID" : "3",
					"Name" : "Jonathan Smith",
					"AGE" : 56
				}]
			})
			.expectChange("idMemberCount", "2")
			.expectChange("idAge", ["52", "56"])
			.expectChange("idName", ["Frederic Fall", "Jonathan Smith"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oForm = that.oView.byId("form"),
				sIdManagerId,
				sIdStatus,
				oTable = that.oView.byId("table");

			oForm.getObjectBinding().suspend();
			sIdManagerId = that.addToForm(oForm, "MANAGER_ID", assert);
			that.removeFromForm(oForm, "idMemberCount");
			sIdStatus = that.addToTable(oTable, "STATUS", assert);
			that.removeFromTable(oTable, "idAge");
			that.expectRequest("TEAMS('TEAM_01')?$select=MANAGER_ID,Team_Id"
					+ "&$expand=TEAM_2_EMPLOYEES($select=ID,Name,STATUS)", {
					"Team_Id" : "TEAM_01",
					"MANAGER_ID" : "3",
					"TEAM_2_EMPLOYEES" : [{
						"ID" : "1",
						"Name" : "Frederic Fall",
						"STATUS" : "Available"
					}, {
						"ID" : "3",
						"Name" : "Jonathan Smith",
						"STATUS" : "Occupied"
					}]
				})
				.expectChange(sIdManagerId, "3")
				.expectChange("idName", ["Frederic Fall", "Jonathan Smith"])
				.expectChange(sIdStatus, ["Available", "Occupied"]);

			oForm.getObjectBinding().resume();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Outer form with context binding is suspended after initialization; outer form
	// contains inner table. The inner table is sorted resulting in a different order.
	QUnit.test("suspend/resume: sort dependent list binding", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="form" binding="{/TEAMS(\'TEAM_01\')}">\
	<Text id="idMemberCount" text="{MEMBER_COUNT}" />\
	<Table id="table" items="{path : \'TEAM_2_EMPLOYEES\', templateShareable : false,\
			parameters : {$$ownRequest : true}}">\
		<columns><Column/><Column/></columns>\
		<ColumnListItem>\
			<Text id="idAge" text="{AGE}" />\
			<Text id="idName" text="{Name}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS('TEAM_01')?$select=MEMBER_COUNT,Team_Id", {
				"Team_Id" : "TEAM_01",
				"MEMBER_COUNT" : 2
			})
			.expectRequest("TEAMS('TEAM_01')/TEAM_2_EMPLOYEES?$select=AGE,ID,Name"
				+ "&$skip=0&$top=100", {
				"value" : [{
					"ID" : "1",
					"Name" : "Frederic Fall",
					"AGE" : 56
				}, {
					"ID" : "3",
					"Name" : "Jonathan Smith",
					"AGE" : 52
				}]
			})
			.expectChange("idMemberCount", "2")
			.expectChange("idAge", ["56", "52"])
			.expectChange("idName", ["Frederic Fall", "Jonathan Smith"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oFormBinding = that.oView.byId("form").getObjectBinding();

			that.expectRequest("TEAMS('TEAM_01')?$select=MEMBER_COUNT,Team_Id", {
					"Team_Id" : "TEAM_01",
					"MEMBER_COUNT" : 2
				})
				.expectRequest("TEAMS('TEAM_01')/TEAM_2_EMPLOYEES?$select=AGE,ID,Name&$orderby=AGE"
					+ "&$skip=0&$top=100", {
					"value" : [{
						"ID" : "3",
						"Name" : "Jonathan Smith",
						"AGE" : 52
					}, {
						"ID" : "1",
						"Name" : "Frederic Fall",
						"AGE" : 56
					}]
				})
				.expectChange("idAge", ["52", "56"])
				.expectChange("idName", ["Jonathan Smith", "Frederic Fall"]);

			oFormBinding.suspend();
			that.oView.byId("table").getBinding("items").sort(new Sorter("AGE"));
			oFormBinding.resume();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: List binding of a table is suspended and then resumed with no change to the table,
	//    so that the list binding is not re-created. Property bindings from existing rows must not
	//    call checkUpdate in resumeInternal while the list binding is "empty" as it has not yet
	//    fired a change event. This would lead to "Failed to drill-down" errors.
	QUnit.test("suspend/resume: no checkUpdate for existing property bindings in a list binding",
			function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/Equipments\', templateShareable : false}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="idEquipmentName" text="{Name}" />\
		</ColumnListItem>\
	</items>\
</Table>',
			that = this;

		this.expectRequest("Equipments?$select=Category,ID,Name&$skip=0&$top=100", {
				value : [{
					"Category" : "Electronics",
					"ID" : 1,
					"Name" : "Office PC"
				}, {
					"Category" : "Electronics",
					"ID" : 2,
					"Name" : "Tablet X"
				}]
			})
			.expectChange("idEquipmentName", ["Office PC", "Tablet X"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oListBinding = that.oView.byId("table").getBinding("items");

			oListBinding.suspend();

			that.expectRequest("Equipments?$select=Category,ID,Name&$skip=0&$top=100", {
					value : [{
						"Category" : "Electronics",
						"ID" : 1,
						"Name" : "Office PC"
					}, {
						"Category" : "Electronics",
						"ID" : 2,
						"Name" : "Tablet X"
					}]
				});

			oListBinding.resume();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Operation binding for a function, first it is deferred, later is has been executed.
	//   Show interaction of execute() and suspend()/resume(); setParameter() has been tested
	//   for refresh() already, see test "Function binding: setParameter, execute and refresh".
	QUnit.test("Function binding: execute and suspend/resume", function (assert) {
		var oEmployeeBinding,
			sFunctionName = "com.sap.gateway.default.iwbep.tea_busi.v0001"
				+ ".FuGetEmployeeSalaryForecast",
			sView = '\
<FlexBox id="employee" binding="{/EMPLOYEES(\'2\')}">\
	<Text id="salary" text="{SALARY/YEARLY_BONUS_AMOUNT}" />\
	<FlexBox id="function" binding="{' + sFunctionName + '(...)}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="forecastSalary" text="{SALARY/YEARLY_BONUS_AMOUNT}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('2')", {
				"SALARY" : {
					"YEARLY_BONUS_AMOUNT" : 100
				}
			})
			.expectChange("salary", "100")
			.expectChange("forecastSalary", null);

		return this.createView(assert, sView).then(function () {
			that.expectRequest("EMPLOYEES('2')", {
					"SALARY" : {
						"YEARLY_BONUS_AMOUNT" : 100
					}
				});

			oEmployeeBinding = that.oView.byId("employee").getObjectBinding();
			oEmployeeBinding.suspend();
			oEmployeeBinding.resume(); // MUST NOT trigger a request for the bound function!

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("EMPLOYEES('2')/" + sFunctionName + "()", {
					"SALARY" : {
						"YEARLY_BONUS_AMOUNT" : 142
					}
				})
				.expectChange("forecastSalary", "142");

			return Promise.all([
				that.oView.byId("function").getObjectBinding().execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("EMPLOYEES('2')", {
					"SALARY" : {
						"YEARLY_BONUS_AMOUNT" : 110
					}
				})
				.expectRequest("EMPLOYEES('2')/" + sFunctionName + "()", {
					"SALARY" : {
						"YEARLY_BONUS_AMOUNT" : 150
					}
				})
				.expectChange("salary", "110")
				.expectChange("forecastSalary", "150");

			oEmployeeBinding.suspend();
			oEmployeeBinding.resume();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Master table with list binding is suspended after initialization. Detail form for
	//   "selected" context from table is then changed by adding and removing a form field; table
	//   remains unchanged.
	//   After resume, *separate* new requests for the master table and the details form are sent;
	//   the request for the form reflects the changes. The field added to the form is updated.
	// JIRA bug 1169
	// Ensure separate requests for master-detail scenarios with auto-$expand/$select and
	// suspend/resume
	QUnit.test("suspend/resume: master list binding with details context binding, only context"
			+ " binding is adapted", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/Equipments\', templateShareable : false}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="idEquipmentName" text="{Name}" />\
		</ColumnListItem>\
	</items>\
</Table>\
<FlexBox id="form" binding="{path : \'EQUIPMENT_2_EMPLOYEE\', parameters : {$$ownRequest : true}}">\
	<Text id="idName" text="{Name}" />\
	<Text id="idAge" text="{AGE}" />\
</FlexBox>',
			that = this;

		this.expectRequest("Equipments?$select=Category,ID,Name&$skip=0&$top=100", {
				value : [{
					"Category" : "Electronics",
					"ID" : 1,
					"Name" : "Office PC"
				}, {
					"Category" : "Electronics",
					"ID" : 2,
					"Name" : "Tablet X"
				}]
			})
			.expectChange("idEquipmentName", ["Office PC", "Tablet X"])
			.expectChange("idName")
			.expectChange("idAge");

		return this.createView(assert, sView, oModel).then(function () {
			var oForm = that.oView.byId("form");

			oForm.setBindingContext(that.oView.byId("table").getBinding("items")
				.getCurrentContexts()[0]);

			that.expectRequest("Equipments(Category='Electronics',ID=1)/EQUIPMENT_2_EMPLOYEE"
					+ "?$select=AGE,ID,Name", {
					"AGE" : 52,
					"ID" : "2",
					"Name" : "Frederic Fall"
				})
				.expectChange("idName", "Frederic Fall")
				.expectChange("idAge", "52");

			return that.waitForChanges(assert).then(function () {
				var sIdManagerId;

				// no change in table, only in contained form
				oForm.getObjectBinding().getRootBinding().suspend();
				sIdManagerId = that.addToForm(oForm, "MANAGER_ID", assert);
				that.removeFromForm(oForm, "idAge");

				that.expectRequest("Equipments?$select=Category,ID,Name&$skip=0&$top=100", {
						value : [{
							"Category" : "Electronics",
							"ID" : 1,
							"Name" : "Office PC"
						}, {
							"Category" : "Electronics",
							"ID" : 2,
							"Name" : "Tablet X"
						}]
					})
					.expectRequest("Equipments(Category='Electronics',ID=1)/EQUIPMENT_2_EMPLOYEE"
						+ "?$select=ID,MANAGER_ID,Name", {
						"ID" : "2",
						"Name" : "Frederic Fall",
						"MANAGER_ID" : "1"
					})
					.expectChange(sIdManagerId, "1");

				oForm.getObjectBinding().getRootBinding().resume();

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: call filter, sort, changeParameters on a suspended ODLB
	QUnit.test("suspend/resume: call read APIs on a suspended ODLB", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/BusinessPartnerList\', suspended : true}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="id" text="{BusinessPartnerID}" />\
		</ColumnListItem>\
	</items>\
</Table>',
			that = this;

		this.expectChange("id", false);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding = that.oView.byId("table").getBinding("items");

			oBinding.filter(new Filter("BusinessPartnerRole", FilterOperator.EQ, "01"))
				.sort(new Sorter("CompanyName"))
				.changeParameters({$filter : "BusinessPartnerID gt '0100000001'"});

			that.expectRequest("BusinessPartnerList?$filter=BusinessPartnerRole eq '01' "
				+ "and (BusinessPartnerID gt '0100000001')&$orderby=CompanyName"
				+ "&$select=BusinessPartnerID&$skip=0&$top=100", {
					value : [{
						"BusinessPartnerID": "0100000002"
					}, {
						"BusinessPartnerID": "0100000003"
					}]
				})
				.expectChange("id", [
					"0100000002",
					"0100000003"
				]);

			oBinding.attachEventOnce("change", function (oEvent) {
				assert.strictEqual(oEvent.getParameter("reason"), ChangeReason.Filter);
			});

			// code under test
			oBinding.resume();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: ODM#refresh ignores suspended bindings
	// A suspended binding should not be considered when refreshing via ODM#refresh
	QUnit.test("ODM#refresh ignores suspended bindings", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/BusinessPartnerList\', suspended : true}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="id" text="{BusinessPartnerID}" />\
		</ColumnListItem>\
	</items>\
</Table>',
			that = this;

		this.expectChange("id", false);

		return this.createView(assert, sView, oModel).then(function () {

			// code under test
			that.oModel.refresh("foo");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: call setAggregation on a suspended ODLB
	QUnit.test("suspend/resume: call setAggregation on a suspended ODLB", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/BusinessPartnerList\', suspended : true}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="id" text="{BusinessPartnerID}" />\
			<Text id="role" text="{BusinessPartnerRole}" />\
		</ColumnListItem>\
	</items>\
</Table>',
			that = this;

		this.expectChange("id", false);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding = that.oView.byId("table").getBinding("items");

			oBinding.setAggregation({groupLevels : ["BusinessPartnerRole"]});

			that.expectRequest("BusinessPartnerList?$apply=groupby((BusinessPartnerRole))"
				+ "&$select=BusinessPartnerID,BusinessPartnerRole&$count=true"
				+ "&$skip=0&$top=100", {
					value : [{
						"BusinessPartnerID": "0100000000",
						"BusinessPartnerRole": "01"
					}, {
						"BusinessPartnerID": "0100000001",
						"BusinessPartnerRole": "02"
					}]
				})
				.expectChange("id", [
					"0100000000",
					"0100000001"
				]);

			oBinding.attachEventOnce("change", function (oEvent) {
				assert.strictEqual(oEvent.getParameter("reason"), ChangeReason.Change);
			});

			// code under test
			oBinding.resume();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: call changeParameters on a suspended ODCB
	QUnit.test("suspend/resume: call changeParameters on a suspended ODCB", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="form" binding="{/SalesOrderList(\'42\')}">\
	<Text id="id" text="{SalesOrderID}"/>\
	<Table id="table" items="{SO_2_SOITEM}">\
		<columns><Column/></columns>\
		<items>\
			<ColumnListItem>\
				<Text id="pos" text="{ItemPosition}" />\
			</ColumnListItem>\
		</items>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('42')?$select=SalesOrderID"
			+ "&$expand=SO_2_SOITEM($select=ItemPosition,SalesOrderID)", {
				"SalesOrderID" : "42",
				"SO_2_SOITEM" : [{"SalesOrderID" : "42", "ItemPosition" : "10"}]
			})
			.expectChange("id", "42")
			.expectChange("pos", ["10"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oBinding = that.oView.byId("form").getElementBinding();

			oBinding.suspend();
			oBinding.changeParameters({"custom": "invalid"}); // just to call it twice
			oBinding.changeParameters({"custom": "option"});

			that.expectRequest("SalesOrderList('42')?custom=option&$select=SalesOrderID"
				+ "&$expand=SO_2_SOITEM($select=ItemPosition,SalesOrderID)", {
					"SalesOrderID" : "42",
					"SO_2_SOITEM" : [{"SalesOrderID" : "42", "ItemPosition" : "10"}]
				});

			// code under test
			oBinding.resume();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Deferred operation binding returns a collection. A dependent list binding for
	// "value" with auto-$expand/$select displays the result.
	QUnit.test("Deferred operation returns collection, auto-$expand/$select", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/GetSOContactList(...)}" id="function">\
	<Table items="{value}">\
		<columns><Column/></columns>\
		<items>\
			<ColumnListItem>\
				<Text id="id" text="{ContactGUID}" />\
			</ColumnListItem>\
		</items>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectChange("id", false);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("GetSOContactList(SalesOrderID='0500000001')", {
					value : [
						{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c591d177"},
						{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c591f177"},
						{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c5921177"}
					]
				})
				.expectChange("id", [
					"fa163e7a-d4f1-1ee8-84ac-11f9c591d177",
					"fa163e7a-d4f1-1ee8-84ac-11f9c591f177",
					"fa163e7a-d4f1-1ee8-84ac-11f9c5921177"
				]);

			return Promise.all([
				// code under test
				that.oView.byId("function").getObjectBinding()
					.setParameter("SalesOrderID", "0500000001")
					.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: List binding for non-deferred function call which returns a collection, with
	// auto-$expand/$select.
	QUnit.test("List: function returns collection, auto-$expand/$select", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<Table items="{/GetSOContactList(SalesOrderID=\'0500000001\')}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="id" text="{ContactGUID}" />\
		</ColumnListItem>\
	</items>\
</Table>';

		this.expectRequest("GetSOContactList(SalesOrderID='0500000001')?$select=ContactGUID"
				+ "&$skip=0&$top=100", {
				value : [
					{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c591d177"},
					{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c591f177"},
					{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c5921177"}
				]
			})
			.expectChange("id", [
				"fa163e7a-d4f1-1ee8-84ac-11f9c591d177",
				"fa163e7a-d4f1-1ee8-84ac-11f9c591f177",
				"fa163e7a-d4f1-1ee8-84ac-11f9c5921177"
			]);

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: ODataContextBinding for non-deferred function call which returns a collection. A
	// dependent list binding for "value" with auto-$expand/$select displays the result.
	// github.com/SAP/openui5/issues/1727
	QUnit.test("Context: function returns collection, auto-$expand/$select", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/GetSOContactList(SalesOrderID=\'0500000001\')}" id="function">\
	<Table items="{value}">\
		<columns><Column/></columns>\
		<items>\
			<ColumnListItem>\
				<Text id="id" text="{ContactGUID}" />\
			</ColumnListItem>\
		</items>\
	</Table>\
</FlexBox>';

		this.expectChange("id", false);

		this.expectRequest("GetSOContactList(SalesOrderID='0500000001')?$select=ContactGUID", {
				value : [
					{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c591d177"},
					{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c591f177"},
					{"ContactGUID" : "fa163e7a-d4f1-1ee8-84ac-11f9c5921177"}
				]
			})
			.expectChange("id", [
				"fa163e7a-d4f1-1ee8-84ac-11f9c591d177",
				"fa163e7a-d4f1-1ee8-84ac-11f9c591f177",
				"fa163e7a-d4f1-1ee8-84ac-11f9c5921177"
			]);

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: ODataContextBinding for non-deferred bound function call which returns a
	// collection. A dependent list binding for "value" with auto-$expand/$select displays the
	// result.
	QUnit.test("Context: bound function returns coll., auto-$expand/$select", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sFunctionName = "com.sap.gateway.default.iwbep.tea_busi.v0001"
				+ ".__FAKE__FuGetEmployeesByManager",
			sView = '\
<FlexBox binding="{/MANAGERS(\'1\')/' + sFunctionName + '()}" id="function">\
	<Table items="{value}">\
		<columns><Column/><Column/></columns>\
		<items>\
			<ColumnListItem>\
				<Text id="id" text="{ID}" />\
				<Text id="name" text="{Name}" />\
			</ColumnListItem>\
		</items>\
	</Table>\
</FlexBox>';

		this.expectRequest("MANAGERS('1')/" + sFunctionName + "()?$select=ID,Name", {
				value : [{
					"ID" : "3",
					"Name" : "Jonathan Smith"
				}, {
					"ID" : "6",
					"Name" : "Susan Bay"
				}]
			})
			.expectChange("id", ["3", "6"])
			.expectChange("name", ["Jonathan Smith", "Susan Bay"]);

		return this.createView(assert, sView, oModel);
	});
	//TODO Gateway says "Expand/Select not supported for functions"!
	//TODO Gateway says "System query options not supported for functions"!
	// --> TripPinRESTierService is OK with both!
	// http://services.odata.org/TripPinRESTierService/(S(...))/People('russellwhyte')/Trips(1)/
	// Microsoft.OData.Service.Sample.TrippinInMemory.Models.GetInvolvedPeople()
	// ?$count=true&$select=UserName&$skip=1

	//*********************************************************************************************
	// Scenario: Delete an entity via a context binding and check that bindings to properties of
	// this entity are notified even if they have a child path of the context binding without being
	// dependent to it.
	QUnit.test("notify non-dependent bindings after deletion", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/SalesOrderList(\'0500000000\')}" id="form">\
	<FlexBox id="businessPartner" binding="{SO_2_BP}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="phoneNumber" text="{PhoneNumber}" />\
	</FlexBox>\
	<Text id="companyName" text="{SO_2_BP/CompanyName}" />\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('0500000000')?$select=SalesOrderID"
				+ "&$expand=SO_2_BP($select=BusinessPartnerID,CompanyName,PhoneNumber)", {
				"SalesOrderID" : "0500000000",
				"SO_2_BP" : {
					"@odata.etag" : "ETag",
					"BusinessPartnerID" : "0100000000",
					"CompanyName" : "SAP",
					"PhoneNumber" : "06227747474"
				}
			})
			.expectChange("companyName", "SAP")
			.expectChange("phoneNumber", "06227747474");

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("businessPartner").getBindingContext();

			that.expectRequest({
					headers : {"If-Match" : "ETag"},
					method : "DELETE",
					url : "BusinessPartnerList('0100000000')"
				})
				// Note: The value of the property binding is undefined because there is no
				// explicit cache value for it, but the type's formatValue converts this to null.
				.expectChange("companyName", null)
				.expectChange("phoneNumber", null);

			return Promise.all([
				// code under test
				oContext.delete(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: BCP 1870017061
	// Master/Detail, object page with a table.Table: When changing the entity for the object page
	// the property bindings below the table's list binding complained about an invalid path in
	// deregisterChange. This scenario only simulates the object page, the contexts from the master
	// list are hardcoded to keep the test small.
	QUnit.test("deregisterChange", function (assert) {
		var oModel = createSalesOrdersModel(),
			sView = '\
<FlexBox id="form">\
	<t:Table rows="{path : \'SO_2_SOITEM\', parameters : {$$updateGroupId : \'update\'}}">\
		<t:Column>\
			<t:template>\
				<Text id="position" text="{ItemPosition}" />\
			</t:template>\
		</t:Column>\
	</t:Table>\
</FlexBox>',
			that = this;

		this.expectChange("position", false);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("SalesOrderList('0500000000')/SO_2_SOITEM?$skip=0&$top=110", {
					"value" : [{
						"ItemPosition" : "10",
						"SalesOrderID" : "0500000000"
					}]
				})
				.expectChange("position", ["10"]);

			that.oView.byId("form").bindElement("/SalesOrderList('0500000000')");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("SalesOrderList('0500000001')/SO_2_SOITEM?$skip=0&$top=110", {
					"value" : [{
						"ItemPosition" : "20",
						"SalesOrderID" : "0500000001"
					}]
				})
				// "position" temporarily loses its binding context and thus fires a change event
				.expectChange("position", null, null)
				.expectChange("position", ["20"]);

			that.oView.byId("form").bindElement("/SalesOrderList('0500000001')");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	QUnit.test("delayed create", function (assert) {
		var oModel = createSalesOrdersModel(),
			sView = '<FlexBox id="form" binding="{/SalesOrderList(\'0500000000\')}"/>',
			that = this;

		return this.createView(assert, sView, oModel).then(function () {
			var oParentBinding = that.oView.byId("form").getElementBinding(),
				oListBinding = that.oModel.bindList("SO_2_SOITEM", oParentBinding.getBoundContext(),
					undefined, undefined, {$$updateGroupId : "update"});

			that.expectRequest({
					method : "POST",
					url : "SalesOrderList('0500000000')/SO_2_SOITEM",
					payload : {}
				}, {
					"SalesOrderID" : "0500000000",
					"ItemPosition" : "0010"
				});

			oListBinding.create();

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	QUnit.test("delayed execute", function (assert) {
		var sAction = "SalesOrderList('0500000000')/"
				+ "com.sap.gateway.default.zui5_epm_sample.v0002.SalesOrder_Cancel",
			oModel = createSalesOrdersModel(),
			sView = '<FlexBox id="form" binding="{/' + sAction + '(...)}"/>',
			that = this;

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "POST",
					url : sAction,
					payload : {}
				}, {
					"SalesOrderID" : "0500000000"
				});

			return Promise.all([
				that.oView.byId("form").getElementBinding().execute("update"),
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Refresh using a group with submit mode 'API'. The view contains one context binding
	// without children. Hence the binding doesn't trigger a request, but its lock must be released.
	QUnit.test("ODCB: delayed refresh", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/BusinessPartnerList(\'0100000000\')}">\
	<Text id="company" text="{CompanyName}"/>\
</FlexBox>\
<FlexBox binding="{/SalesOrderList}"/>',
			that = this;

		this.expectRequest("BusinessPartnerList('0100000000')"
				+ "?$select=BusinessPartnerID,CompanyName", {
				"BusinessPartnerID" : "0100000000",
				"CompanyName" : "SAP AG"
			})
			.expectChange("company", "SAP AG");

		return this.createView(assert, sView, oModel).then(function () {

			that.expectRequest("BusinessPartnerList('0100000000')"
					+ "?$select=BusinessPartnerID,CompanyName", {
					"BusinessPartnerID" : "0100000000",
					"CompanyName" : "SAP SE"
				})
				.expectChange("company", "SAP SE");

			that.oModel.refresh("update");

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Refresh using a group with submit mode 'API'. The model contains one list binding
	// without a control. Hence getContexts() is not called and no request is triggered. But the
	// lock must be released.
	QUnit.test("ODLB: delayed refresh", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="note" text="{Note}"/>\
		</ColumnListItem>\
	</items>\
</Table>',
			that = this;

		this.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=100", {
				value : [{
					"SalesOrderID" : "0500000000",
					"Note" : "Note"
				}]
			})
			.expectChange("note", ["Note"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.oModel.bindList("/BusinessPartnerList"); // a list binding w/ no control behind

			that.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=100", {
					value : [{
						"SalesOrderID" : "0500000000",
						"Note" : "Note updated"
					}]
				})
				.expectChange("note", ["Note updated"]);

			that.oModel.refresh("update");

			return Promise.all([
				that.oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: change the filter on a list binding with submit group 'API' and immediately call
	// submitBatch. The resulting GET request becomes asynchronous because it requires additional
	// metadata. Check that the request is sent with this batch nevertheless.
	// In a second step call filter on a list binding w/o control. Verify that the queue does not
	// remain blocked, although there is no getContexts and no GET request.
	QUnit.test("ODLB: delayed filter", function (assert) {
		var sView = '\
<Table id="table" items="{path : \'/Equipments\', parameters : {$$groupId : \'api\'}}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="name" text="{Name}"/>\
		</ColumnListItem>\
	</items>\
</Table>',
			that = this;

		this.expectChange("name", false);

		return this.createView(assert, sView).then(function () {

			that.expectRequest("Equipments?$skip=0&$top=100", {
					value : [{
						"Category" : "1",
						"ID" : "2",
						"Name" : "Foo"
					}]
				})
				.expectChange("name", ["Foo"]);

			return Promise.all([
				that.oModel.submitBatch("api"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("Equipments?"
					+ "$filter=EQUIPMENT_2_PRODUCT/ID eq 42&$skip=0&$top=100", {
					value : [{
						"Name" : "Bar"
					}]
				})
				.expectChange("name", ["Bar"]);

			that.oView.byId("table").getBinding("items")
				.filter(new Filter("EQUIPMENT_2_PRODUCT/ID", "EQ", 42));

			return Promise.all([
				that.oModel.submitBatch("api"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			var oListBinding = that.oModel.bindList("/Equipments", undefined, undefined, undefined,
					{$$groupId : 'api'});

			that.expectRequest("Equipments?$skip=0&$top=100", {
					value : [{
						"Name" : "Foo"
					}]
				})
				// The field is reset first, because the filter request is delayed until the next
				// prerendering task
				.ignoreNullChanges("name")
				.expectChange("name", ["Foo"]);

			// This binding has no control -> no request, but timeout of group lock expected
			oListBinding.filter(new Filter("Name", "GT", "M"));
			that.oView.byId("table").getBinding("items").filter(null);

			return Promise.all([
				that.oModel.submitBatch("api"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: sap.ui.table.Table with VisibleRowCountMode="Auto" and submit group 'API'
	// In the first step resume and immediately call submitBatch.
	// In the second step synchronously refresh with another group ID, change the filter and call
	// submitBatch. Check that the filter request is sent with this batch nevertheless.
	// Two issues have to be solved: the lock for the filter must win over the one for refresh and
	// the lock must not be removed again before the table becomes active.
	//
	//TODO enable this test again once the following issue is fixed: table calls ODLB#getContexts
	// while binding is still suspended, which is currently forbidden
	//ODataListBinding.getContexts (ODataListBinding.js?eval:1004)
	//Table._getContexts (Table.js?eval:2154)
	//Table._getRowContexts (Table.js?eval:2233)
	//Table._updateRows (Table.js?eval:3511)
	//Table._updateTableSizes (Table.js?eval:1503)
	//Promise.then (async)
	//Table.onAfterRendering (Table.js?eval:1402)
	QUnit.skip("ODLB: resume/refresh/filter w/ submitBatch on a table.Table", function (assert) {
		var oListBinding,
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<t:Table id="table" visibleRowCountMode="Auto"\
		rows="{path : \'/Equipments\', parameters : {$$groupId : \'api\'}, suspended : true}">\
	<t:Column>\
		<t:label>\
			<Label text="Name"/>\
		</t:label>\
		<t:template>\
			<Text id="name" text="{Name}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			that = this;

		this.expectChange("name", false);

		return this.createView(assert, sView, oModel).then(function () {
			oListBinding = that.oView.byId("table").getBinding("rows");

			that.expectRequest("Equipments?$select=Category,ID,Name&$skip=0&$top=105", {
					value : [{
						"Category" : "1",
						"ID" : "2",
						"Name" : "Foo"
					}]
				})
				.expectChange("name", ["Foo"]);

			oListBinding.resume();

			return Promise.all([
				that.oModel.submitBatch("api"),
				that.waitForChanges(assert)
			]);
		}).then(function () {

			that.expectRequest("Equipments?$select=Category,ID,Name"
					+ "&$filter=EQUIPMENT_2_PRODUCT/ID eq 42&$skip=0&$top=105", {
					value : [{
						"Category" : "1",
						"ID" : "2",
						"Name" : "Bar"
					}]
				})
				.expectChange("name", ["Bar"]);

			oListBinding.refresh("foo");
			oListBinding.filter(new Filter("EQUIPMENT_2_PRODUCT/ID", "EQ", 42));

			return Promise.all([
				that.oModel.submitBatch("api"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Binding-specific parameter $$aggregation is used (CPOUI5UISERVICESV3-1195)
	//TODO support $filter : \'GrossAmount gt 0\',\
	QUnit.test("Analytics by V4: $$aggregation w/ groupLevels", function (assert) {
		var sView = '\
<t:Table id="table" rows="{path : \'/SalesOrderList\',\
		parameters : {\
			$$aggregation : {\
				aggregate : {\
					GrossAmount : {subtotals : true},\
					NetAmount : {}\
				},\
				group : {\
					CurrencyCode : {},\
					LifecycleStatus : {}\
				},\
				groupLevels : [\'LifecycleStatus\']\
			},\
			$orderby : \'LifecycleStatus desc,ItemPosition asc\'\
		}}" threshold="0" visibleRowCount="3">\
	<t:Column>\
		<t:template>\
			<Text id="isExpanded" text="{= %{@$ui5.node.isExpanded} }" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="isTotal" text="{= %{@$ui5.node.isTotal} }" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="level" text="{= %{@$ui5.node.level} }" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="lifecycleStatus" text="{LifecycleStatus}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="grossAmount" text="{= %{GrossAmount}}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			oModel = createSalesOrdersModel(),
			that = this;

		this.expectRequest("SalesOrderList?$apply=groupby((LifecycleStatus),aggregate(GrossAmount))"
				+ "/orderby(LifecycleStatus desc)&$count=true&$skip=0&$top=3", {
				"@odata.count" : "26",
				"value" : [
					{"GrossAmount" : 1, "LifecycleStatus" : "Z"},
					{"GrossAmount" : 2, "LifecycleStatus" : "Y"},
					{"GrossAmount" : 3, "LifecycleStatus" : "X"}
				]
			})
			.expectChange("isExpanded", [false, false, false])
			.expectChange("isTotal", [true, true, true])
			.expectChange("level", [1, 1, 1])
			.expectChange("grossAmount", [1, 2, 3])
			.expectChange("lifecycleStatus", ["Z", "Y", "X"]);

		return this.createView(assert, sView, oModel).then(function () {
			var oTable = that.oView.byId("table"),
				oListBinding = oTable.getBinding("rows");

			oListBinding.getCurrentContexts().forEach(function (oContext, i) {
				assert.strictEqual(oContext.getPath(),
					"/SalesOrderList(LifecycleStatus='" + "ZYX"[i] + "')");
			});

			that.expectRequest("SalesOrderList?"
					+ "$apply=groupby((LifecycleStatus),aggregate(GrossAmount))"
					+ "/orderby(LifecycleStatus desc)&$count=true&$skip=7&$top=3", {
					"@odata.count" : "26",
					"value" : [
						{"GrossAmount" : 7, "LifecycleStatus" : "T"},
						{"GrossAmount" : 8, "LifecycleStatus" : "S"},
						{"GrossAmount" : 9, "LifecycleStatus" : "R"}
					]
				});
			for (var i = 0; i < 3; i += 1) {
				that.expectChange("isExpanded", undefined, null)
					.expectChange("isTotal", undefined, null)
					.expectChange("level", undefined, null)
					.expectChange("grossAmount", undefined, null)
					.expectChange("lifecycleStatus", null, null);
			}
			that.expectChange("isExpanded", [false, false, false], 7)
				.expectChange("isTotal", [true, true, true], 7)
				.expectChange("level", [1, 1, 1], 7)
				.expectChange("grossAmount", [7, 8, 9], 7)
				.expectChange("lifecycleStatus", ["T", "S", "R"], 7);

			that.oView.byId("table").setFirstVisibleRow(7);

			return that.waitForChanges(assert).then(function () {
				that.expectRequest("SalesOrderList?$apply=groupby((LifecycleStatus))"
						+ "/orderby(LifecycleStatus desc)&$count=true&$skip=7&$top=3", {
						"@odata.count" : "26",
						"value" : [
							{"LifecycleStatus" : "T"},
							{"LifecycleStatus" : "S"},
							{"LifecycleStatus" : "R"}
						]
					})
					.expectChange("isExpanded", [false, false, false], 7)
					.expectChange("isTotal", [true, true, true], 7)
					.expectChange("level", [1, 1, 1], 7)
					.expectChange("lifecycleStatus", ["T", "S", "R"], 7);

				oTable.removeColumn(4).destroy(); // GrossAmount
				oListBinding.setAggregation({groupLevels : ["LifecycleStatus"]});

				return that.waitForChanges(assert).then(function () {
					assert.throws(function () {
						oListBinding.changeParameters({$apply : "groupby((LifecycleStatus))"});
					}, new Error("Cannot combine $$aggregation and $apply"));
					assert.throws(function () {
						oListBinding.setAggregation({
							aggregate : {
								GrossAmount : {grandTotal : true}
							},
							groupLevels : ["LifecycleStatus"]
						});
					}, new Error("Cannot combine visual grouping with grand total"));
					// Note: oListBinding is now in an undefined state, do not use anymore!
				});
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Binding-specific parameter $$aggregation is used; no visual grouping,
	// but a grand total row (CPOUI5UISERVICESV3-1418) which is fixed at the top; first visible
	// row starts at 1 and then we scroll up; headerContext>$count is also used
	[false, true].forEach(function (bCount) {
		var sTitle = "Analytics by V4: $$aggregation grandTotal w/o groupLevels; $count : "
				+ bCount;

		QUnit.test(sTitle, function (assert) {
			var sBasicPath
					= "BusinessPartners?$apply=groupby((Country,Region),aggregate(SalesNumber))"
					+ "/filter(SalesNumber%20gt%200)/orderby(Region%20desc)",
				oGrandTotalRow = {
					"SalesNumber" : 351,
					"SalesNumber@odata.type" : "#Decimal"
				},
				oListBinding,
				oTable,
				sView = '\
<Text id="count" text="{$count}"/>\
<t:Table fixedRowCount="1" firstVisibleRow="1" id="table" rows="{path : \'/BusinessPartners\',\
		parameters : {\
			$$aggregation : {\
				aggregate : {\
					SalesNumber : {grandTotal : true}\
				},\
				group : {\
					Country : {},\
					Region : {}\
				}\
			},\
			$count : ' + bCount + ',\
			$filter : \'SalesNumber gt 0\',\
			$orderby : \'Region desc\'\
		}}" threshold="0" visibleRowCount="5">\
	<t:Column>\
		<t:template>\
			<Text id="country" text="{Country}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="region" text="{Region}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="salesNumber" text="{SalesNumber}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
				that = this;

			if (bCount) {
				oGrandTotalRow["UI5__count"] =  "26";
				oGrandTotalRow["UI5__count@odata.type"] = "#Decimal";
			}
			this.expectRequest(sBasicPath + "/concat(aggregate(SalesNumber"
					+ (bCount ? ",$count as UI5__count" : "") + "),top(0))", {
					"value" : [oGrandTotalRow]
				})
				.expectRequest(sBasicPath + "/skip(1)/top(4)", {
					"value" : [
						{"Country" : "b", "Region" : "Y", "SalesNumber" : 2},
						{"Country" : "c", "Region" : "X", "SalesNumber" : 3},
						{"Country" : "d", "Region" : "W", "SalesNumber" : 4},
						{"Country" : "e", "Region" : "V", "SalesNumber" : 5}
					]
				})
				.expectChange("count")
				.expectChange("country", ["",, "b", "c", "d", "e"])
				.expectChange("region", ["",, "Y", "X", "W", "V"])
				.expectChange("salesNumber", ["351",, "2", "3", "4", "5"]);

			return this.createView(assert, sView, createBusinessPartnerTestModel())
			.then(function () {
				oTable = that.oView.byId("table");
				oListBinding = oTable.getBinding("rows");

				if (bCount) {
					assert.strictEqual(oListBinding.isLengthFinal(), true, "length is final");
					assert.strictEqual(oListBinding.getLength(), 27,
						"length includes grand total row");

					// Note: header context gives count of leaves (w/o grand total)
					that.expectChange("count", "26");
				} else {
					assert.strictEqual(oListBinding.isLengthFinal(), false, "length unknown");
					assert.strictEqual(oListBinding.getLength(), 1 + 5 + 10, "estimated length");

					that.oLogMock.expects("error").withExactArgs(
						"Failed to drill-down into $count, invalid segment: $count",
						// Note: toString() shows realistic (first) request w/o skip/top
						"/serviceroot.svc/" + sBasicPath + "/concat(aggregate(SalesNumber"
							+ (bCount ? ",$count%20as%20UI5__count" : "") + "),identity)",
						"sap.ui.model.odata.v4.lib._Cache");
				}

				that.oView.byId("count").setBindingContext(oListBinding.getHeaderContext());

				return that.waitForChanges(assert);
			}).then(function () {
				that.expectRequest(sBasicPath + "/top(1)", {
						"value" : [
							{"Country" : "a", "Region" : "Z", "SalesNumber" : 1}
						]
					})
					.expectChange("country", null, null)
					.expectChange("region", null, null)
					.expectChange("salesNumber", null, null)
					.expectChange("country", ["a", "b", "c", "d"], 1)
					.expectChange("region", ["Z", "Y", "X", "W"], 1)
					.expectChange("salesNumber", ["1", "2", "3", "4"], 1);

				oTable.setFirstVisibleRow(0);

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Binding-specific parameter $$aggregation is used; no visual grouping,
	// but a grand total row (CPOUI5UISERVICESV3-1418) which is not fixed at the top; first visible
	// row starts at 1 and then we scroll up; headerContext>$count is also used
	[false, true].forEach(function (bCount) {
		var sTitle = "Analytics by V4: $$aggregation grandTotal w/o groupLevels; $count : "
				+ bCount + "; grandTotal row not fixed";

		QUnit.test(sTitle, function (assert) {
			var sBasicPath
					= "BusinessPartners?$apply=groupby((Country,Region),aggregate(SalesNumber))"
					+ "/filter(SalesNumber%20gt%200)/orderby(Region%20desc)",
				oListBinding,
				oTable,
				aValues = [
					{"Country" : "a", "Region" : "Z", "SalesNumber" : 1},
					{"Country" : "b", "Region" : "Y", "SalesNumber" : 2},
					{"Country" : "c", "Region" : "X", "SalesNumber" : 3},
					{"Country" : "d", "Region" : "W", "SalesNumber" : 4},
					{"Country" : "e", "Region" : "V", "SalesNumber" : 5}
				],
				sView = '\
<Text id="count" text="{$count}"/>\
<t:Table fixedRowCount="0" firstVisibleRow="1" id="table" rows="{path : \'/BusinessPartners\',\
		parameters : {\
			$$aggregation : {\
				aggregate : {\
					SalesNumber : {grandTotal : true}\
				},\
				group : {\
					Country : {},\
					Region : {}\
				}\
			},\
			$count : ' + bCount + ',\
			$filter : \'SalesNumber gt 0\',\
			$orderby : \'Region desc\'\
		}}" threshold="0" visibleRowCount="5">\
	<t:Column>\
		<t:template>\
			<Text id="country" text="{Country}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="region" text="{Region}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="salesNumber" text="{SalesNumber}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
				that = this;

			if (bCount) {
				aValues.unshift({"UI5__count" : "26", "UI5__count@odata.type" : "#Decimal"});
			}
			this.expectRequest(
					sBasicPath + (bCount
						? "/concat(aggregate($count as UI5__count),top(5))"
						: "/top(5)"),
					{"value" : aValues})
				.expectChange("count")
				.expectChange("country", ["a", "b", "c", "d", "e"], 1)
				.expectChange("region", ["Z", "Y", "X", "W", "V"], 1)
				.expectChange("salesNumber", ["1", "2", "3", "4", "5"], 1);

			return this.createView(assert, sView, createBusinessPartnerTestModel())
			.then(function () {
				oTable = that.oView.byId("table");
				oListBinding = oTable.getBinding("rows");

				if (bCount) {
					assert.strictEqual(oListBinding.isLengthFinal(), true, "length is final");
					assert.strictEqual(oListBinding.getLength(), 27,
						"length includes grand total row");

					// Note: header context gives count of leaves (w/o grand total)
					that.expectChange("count", "26");
				} else {
					assert.strictEqual(oListBinding.isLengthFinal(), false, "length unknown");
					assert.strictEqual(oListBinding.getLength(), 1 + 5 + 10, "estimated length");

					that.oLogMock.expects("error").withExactArgs(
						"Failed to drill-down into $count, invalid segment: $count",
						// Note: toString() shows realistic (first) request w/o skip/top
						"/serviceroot.svc/" + sBasicPath + "/concat(aggregate(SalesNumber"
							+ (bCount ? ",$count%20as%20UI5__count" : "") + "),identity)",
						"sap.ui.model.odata.v4.lib._Cache");
				}

				that.oView.byId("count").setBindingContext(oListBinding.getHeaderContext());

				return that.waitForChanges(assert);
			}).then(function () {
				that.expectRequest(sBasicPath + "/concat(aggregate(SalesNumber),top(0))", {
						"value" : [{
							"SalesNumber" : 351,
							"SalesNumber@odata.type" : "#Decimal"
						}]
					})
					.expectChange("country", null, null)
					.expectChange("region", null, null)
					.expectChange("salesNumber", null, null)
					.expectChange("country", ["", "a", "b", "c", "d"])
					.expectChange("region", ["", "Z", "Y", "X", "W"])
					.expectChange("salesNumber", ["351", "1", "2", "3", "4"]);

				oTable.setFirstVisibleRow(0);

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Binding-specific parameter $$aggregation is used; no visual grouping,
	// but a grand total row using with/as (CPOUI5UISERVICESV3-1418)
	QUnit.test("Analytics by V4: $$aggregation grandTotal w/o groupLevels using with/as",
			function (assert) {
		var sView = '\
<t:Table rows="{path : \'/BusinessPartners\',\
		parameters : {\
			$$aggregation : {\
				aggregate : {\
					SalesAmountSum : {\
						grandTotal : true,\
						name : \'SalesAmount\',\
						with : \'sap.unit_sum\'\
					},\
					SalesNumber : {}\
				},\
				group : {\
					Region : {}\
				}\
			},\
			$filter : \'SalesAmountSum gt 0\',\
			$orderby : \'SalesAmountSum asc\'\
		}}" threshold="0" visibleRowCount="5">\
	<t:Column>\
		<t:template>\
			<Text id="region" text="{Region}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="salesNumber" text="{SalesNumber}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="salesAmountSum" text="{= %{SalesAmountSum} }" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="salesAmountCurrency"\
				text="{= %{SalesAmountSum@Analytics.AggregatedAmountCurrency} }" />\
		</t:template>\
	</t:Column>\
</t:Table>';

		this.expectRequest("BusinessPartners?$apply=groupby((Region)"
				+ ",aggregate(SalesAmount with sap.unit_sum as SalesAmountSum,SalesNumber))"
				+ "/filter(SalesAmountSum gt 0)/orderby(SalesAmountSum asc)"
				+ "/concat(aggregate(SalesAmountSum with sap.unit_sum as "
				+ "UI5grand__SalesAmountSum),top(4))", {
				"value" : [{
						"UI5grand__SalesAmountSum" : 351,
						"UI5grand__SalesAmountSum@Analytics.AggregatedAmountCurrency" : "EUR",
						//TODO this should be used by auto type detection
						"UI5grand__SalesAmountSum@odata.type" : "#Decimal"
					}, {
						"Region" : "Z",
						"SalesNumber" : 1,
						"SalesAmountSum" : 1,
						"SalesAmountSum@Analytics.AggregatedAmountCurrency" : "EUR"
					}, {
						"Region" : "Y",
						"SalesNumber" : 2,
						"SalesAmountSum" : 2,
						"SalesAmountSum@Analytics.AggregatedAmountCurrency" : "EUR"
					}, {
						"Region" : "X",
						"SalesNumber" : 3,
						"SalesAmountSum" : 3,
						"SalesAmountSum@Analytics.AggregatedAmountCurrency" : "EUR"
					}, {
						"Region" : "W",
						"SalesNumber" : 4,
						"SalesAmountSum" : 4,
						"SalesAmountSum@Analytics.AggregatedAmountCurrency" : "EUR"
					}
				]
			})
			.expectChange("region", ["", "Z", "Y", "X", "W"])
			.expectChange("salesNumber", [null, "1", "2", "3", "4"])
			.expectChange("salesAmountSum", [351, 1, 2, 3, 4])
			.expectChange("salesAmountCurrency", ["EUR", "EUR", "EUR", "EUR", "EUR"]);

		return this.createView(assert, sView, createBusinessPartnerTestModel());
	});

	//*********************************************************************************************
	// Scenario: Binding-specific parameter $$aggregation is used without group or groupLevels
	// Note: usage of min/max simulates a Chart, which would actually call ODLB#updateAnalyticalInfo
	[false, true].forEach(function (bCount) {
		var sTitle = "Analytics by V4: $$aggregation, aggregate but no group; $count : " + bCount;

		QUnit.test(sTitle, function (assert) {
			var oMinMaxElement = {
					"UI5min__AGE" : 42,
					"UI5max__AGE" : 77
				},
				sView = '\
<t:Table id="table" rows="{path : \'/SalesOrderList\',\
		parameters : {\
			$$aggregation : {\
				aggregate : {\
					GrossAmount : {\
						min : true,\
						max : true\
					}\
				}\
			},\
			$count : ' + bCount + '\
		}}" threshold="0" visibleRowCount="1">\
	<t:Column>\
		<t:template>\
			<Text id="grossAmount" text="{= %{GrossAmount}}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
				oModel = createSalesOrdersModel(),
				that = this;

			if (bCount) {
				oMinMaxElement["UI5__count"] = "1";
				oMinMaxElement["UI5__count@odata.type"] = "#Decimal";
			}
			this.expectRequest("SalesOrderList?$apply=aggregate(GrossAmount)"
					+ "/concat(aggregate(GrossAmount with min as UI5min__GrossAmount,"
					+ "GrossAmount with max as UI5max__GrossAmount"
					+ (bCount ? ",$count as UI5__count" : "") + "),top(1))", {
					"value" : [oMinMaxElement, {"GrossAmount" : 1}]
				})
				.expectChange("grossAmount", 1);

			return this.createView(assert, sView, oModel).then(function () {
				var oTable = that.oView.byId("table"),
					oListBinding = oTable.getBinding("rows");

				// w/o min/max: no _AggregationCache, system query options are used
				that.expectRequest("SalesOrderList?" + (bCount ? "$count=true&" : "")
					+ "$apply=aggregate(GrossAmount)&$skip=0&$top=1", {
						"@odata.count" : "1",
						"value" : [{"GrossAmount" : 2}]
					})
					.expectChange("grossAmount", 2);

				oListBinding.setAggregation({
					aggregate : {GrossAmount : {}}
				});
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Application tries to overwrite client-side instance annotations.
	QUnit.test("@$ui5.* is write-protected", function (assert) {
		var oModel = createTeaBusiModel(),
			sView = '\
<FlexBox binding="{/MANAGERS(\'1\')}" id="form">\
	<Input id="foo" value="{= %{@$ui5.foo} }" />\
	<Text id="id" text="{ID}" />\
</FlexBox>',
			that = this;

		this.expectRequest("MANAGERS('1')", {
				"@$ui5.foo" : 42,
				"ID" : "1"
			})
			.expectChange("foo", 42)
			.expectChange("id", "1");

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("form").getBindingContext(),
				oMatcher = sinon.match(
					"/MANAGERS('1')/@$ui5.foo: Not a (navigation) property: @$ui5.foo"),
				oPropertyBinding = that.oView.byId("foo").getBinding("value");

			assert.strictEqual(oPropertyBinding.getValue(), 42);
			that.oLogMock.expects("error")
				.withExactArgs("Not a (navigation) property: @$ui5.foo", oMatcher,
					"sap.ui.model.odata.v4.ODataMetaModel");
			that.oLogMock.expects("error")
				.withExactArgs("Failed to update path /MANAGERS('1')/@$ui5.foo", oMatcher,
					"sap.ui.model.odata.v4.ODataPropertyBinding");

			// code under test
			oPropertyBinding.setValue(0);

			// code under test
			oContext.getObject()["@$ui5.foo"] = 1; // just changing a clone

			assert.strictEqual(oContext.getProperty("@$ui5.foo"), 42);
		});
	});

	//*********************************************************************************************
	// Scenario: Application tries to create client-side instance annotations via ODLB#create.
	QUnit.test("@$ui5.* is write-protected for ODLB#create", function (assert) {
		var sView = '\
<Table id="table" items="{path : \'/Equipments\', parameters : {$$updateGroupId : \'never\'}}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="name" text="{Name}"/>\
		</ColumnListItem>\
	</items>\
</Table>',
			that = this;

		this.expectRequest("Equipments?$skip=0&$top=100", {
				value : [{
					"ID" : "2",
					"Name" : "Foo"
				}]
			})
			.expectChange("name", ["Foo"]);

		return this.createView(assert, sView).then(function () {
			var oContext,
				oListBinding = that.oView.byId("table").getBinding("items"),
				oInitialData = {
					"ID" : "99",
					"Name" : "Bar",
					"@$ui5.foo" : "baz"
				};

			that.expectChange("name", ["Bar", "Foo"]);

			// code under test
			oContext = oListBinding.create(oInitialData);

			// code under test
			assert.strictEqual(oContext.getProperty("@$ui5.foo"), undefined);
		});
	});

	//*********************************************************************************************
	// Scenario: Application tries to read private client-side instance annotations.
	QUnit.test("@$ui5._ is read-protected", function (assert) {
		var oModel = createTeaBusiModel(),
			sView = '\
<FlexBox binding="{/MANAGERS(\'1\')}" id="form">\
	<Text id="predicate" text="{= %{@$ui5._/predicate} }" />\
	<Text id="id" text="{ID}" />\
</FlexBox>',
			that = this;

		this.expectRequest("MANAGERS('1')", {
				"ID" : "1"
			})
			.expectChange("predicate", undefined) // binding itself is "code under test"
			.expectChange("id", "1");
		this.oLogMock.expects("error").withExactArgs(
				"Failed to drill-down into @$ui5._/predicate, invalid segment: @$ui5._",
				"/sap/opu/odata4/IWBEP/TEA/default/IWBEP/TEA_BUSI/0001/MANAGERS('1')",
				"sap.ui.model.odata.v4.lib._Cache")
			.thrice(); // binding, getProperty, requestProperty

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("form").getBindingContext();

			// code under test
			assert.notOk("@$ui5._" in oContext.getObject());

			// code under test
			assert.strictEqual(oContext.getProperty("@$ui5._/predicate"), undefined);

			// code under test
			return oContext.requestProperty("@$ui5._/predicate").then(function (vResult) {
				assert.strictEqual(vResult, undefined);

				// code under test
				return oContext.requestObject().then(function (oParent) {
					assert.notOk("@$ui5._" in oParent);
				});
			});
		});
	});

	//*********************************************************************************************
	[
		// Scenario: flat list with aggregated data via $apply, can be combined with $count,
		// $filter, $orderby and system query options are still used (also for $skip, $top)
		"Flat list with aggregated data",
		// Scenario: same as before, but via ODLB#updateAnalyticalInfo; in other words:
		// a hypothetical chart w/ paging, but w/o min/max; initial $skip > 0!
		"ODLB#updateAnalyticalInfo without min/max"
	].forEach(function (sTitle, i) {
		QUnit.test(sTitle, function (assert) {
			var aAggregation = [{ // dimension
					grouped : false,
					inResult : true,
					name : "LifecycleStatus"
				}, { // measure
					name : "GrossAmount",
					total : false
				}],
				sBasicPath = "SalesOrderList?$count=true&$filter=GrossAmount lt 42"
					+ "&$orderby=LifecycleStatus desc"
					+ "&$apply=groupby((LifecycleStatus),aggregate(GrossAmount))",
				sView = '\
<Text id="count" text="{$count}"/>\
<t:Table firstVisibleRow="1" id="table" rows="{path : \'/SalesOrderList\',\
		parameters : {\
			$count : true,\
			$filter : \'GrossAmount lt 42\',\
			$orderby : \'LifecycleStatus desc\'\
' + (i === 0 ? ",$apply : 'groupby((LifecycleStatus),aggregate(GrossAmount))'" : "") + '\
		}}" threshold="0" visibleRowCount="4">\
	<t:Column>\
		<t:template>\
			<Text id="lifecycleStatus" text="{LifecycleStatus}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="grossAmount" text="{GrossAmount}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
				that = this;

			if (i > 0) {
				// for simulating Chart, call #updateAnalyticalInfo _before_ #getContexts
				this.mock(ODataListBinding.prototype)
					.expects("getContexts")
					.withExactArgs(1, 4, 0)
					.callsFake(function () {
						this.updateAnalyticalInfo(aAggregation);
						ODataListBinding.prototype.getContexts.restore();

						return this.getContexts.apply(this, arguments);
					});
			}
			this.expectRequest(sBasicPath + "&$skip=1&$top=4", {
					"@odata.count" : "26",
					"value" : [
						{"GrossAmount" : 2, "LifecycleStatus" : "Y"},
						{"GrossAmount" : 3, "LifecycleStatus" : "X"},
						{"GrossAmount" : 4, "LifecycleStatus" : "W"},
						{"GrossAmount" : 5, "LifecycleStatus" : "V"}
					]
				})
				.expectChange("count")
				.expectChange("grossAmount", ["2.00", "3.00", "4.00", "5.00"], 1)
				.expectChange("lifecycleStatus", ["Y", "X", "W", "V"], 1);

			return this.createView(assert, sView, createSalesOrdersModel()).then(function () {
				that.expectChange("count", "26");

				that.oView.byId("count").setBindingContext(
					that.oView.byId("table").getBinding("rows").getHeaderContext());

				return that.waitForChanges(assert);
			}).then(function () {
				// no additional request for same aggregation data
				that.oView.byId("table").getBinding("rows").updateAnalyticalInfo(aAggregation);

				return that.waitForChanges(assert);
			}).then(function () {
				that.expectRequest(sBasicPath + "&$skip=0&$top=1", {
						"@odata.count" : "26",
						"value" : [{
							"GrossAmount" : 1,
							"LifecycleStatus" : "Z"
						}]
					});
				that.expectChange("grossAmount", null, null)
					.expectChange("lifecycleStatus", null, null);
				that.expectChange("grossAmount", ["1.00", "2.00", "3.00", "4.00"])
					.expectChange("lifecycleStatus", ["Z", "Y", "X", "W"]);

				that.oView.byId("table").setFirstVisibleRow(0);

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Simulate a chart that requests minimum and maximum values for a measure via
	// #updateAnalyticalInfo; initial $skip > 0!
	//
	//TODO this should work the same for an initially suspended binding where #updateAnalyticalInfo
	// is called before #resume, see CPOUI5UISERVICESV3-1754 (PS2 of the change contains that test);
	// currently sap.ui.table.Table interferes with suspend/resume, see skipped test
	// "ODLB: resume/refresh/filter w/ submitBatch on a table.Table"
	QUnit.test("ODLB#updateAnalyticalInfo with min/max", function (assert) {
		var aAggregation = [{ // dimension
				grouped : false,
				inResult : true,
				name : "Name"
			}, { // measure
				max : true,
				min : true,
				name : "AGE",
				total : false
			}],
			oMeasureRangePromise,
			sView = '\
<Text id="count" text="{$count}"/>\
<t:Table firstVisibleRow="1" id="table" rows="{\
			path : \'/EMPLOYEES\',\
			parameters : {$count : true},\
			filters : {path : \'AGE\', operator : \'GE\', value1 : 30},\
			sorter : {path : \'AGE\'}\
		}" threshold="0" visibleRowCount="3">\
	<t:Column>\
		<t:template>\
			<Text id="text" text="{Name}" />\
		</t:template>\
	</t:Column>\
	<t:Column>\
		<t:template>\
			<Text id="age" text="{AGE}" />\
		</t:template>\
	</t:Column>\
</t:Table>',
			that = this;

		// for simulating Chart, call #updateAnalyticalInfo _before_ #getContexts
		this.mock(ODataListBinding.prototype)
			.expects("getContexts")
			.withExactArgs(1, 3, 0)
			.callsFake(function () {
				oMeasureRangePromise = this.updateAnalyticalInfo(aAggregation)
					.measureRangePromise.then(function (mMeasureRange) {
						assert.deepEqual(mMeasureRange, {
							AGE : {
								max : 77,
								min : 42
							}
						});
					});
				ODataListBinding.prototype.getContexts.restore();

				return this.getContexts.apply(this, arguments);
			});
		this.expectRequest("EMPLOYEES?$apply=groupby((Name),aggregate(AGE))"
				+ "/filter(AGE ge 30)/orderby(AGE)"
				+ "/concat(aggregate(AGE with min as UI5min__AGE,"
				+ "AGE with max as UI5max__AGE,$count as UI5__count)"
				+ ",skip(1)/top(3))", {
				"value" : [{
						// the server response may contain additional data for example @odata.id or
						// type information "UI5min__AGE@odata.type" : "#Int16"
						"@odata.id" : null,
						"UI5min__AGE@odata.type" : "#Int16",
						"UI5min__AGE" : 42,
						"UI5max__AGE" : 77,
						"UI5__count" : "4",
						"UI5__count@odata.type" : "#Decimal"
					},
					{"ID" : "1", "Name" : "Jonathan Smith", "AGE" : 50},
					{"ID" : "0", "Name" : "Frederic Fall", "AGE" : 70},
					{"ID" : "2", "Name" : "Peter Burke", "AGE" : 77}
				]
			})
			.expectChange("count")
			.expectChange("text", ["Jonathan Smith", "Frederic Fall", "Peter Burke"], 1)
			.expectChange("age", ["50", "70", "77"], 1);

		return this.createView(assert, sView, createTeaBusiModel()).then(function () {
			that.expectChange("count", "4");

			that.oView.byId("count").setBindingContext(
				that.oView.byId("table").getBinding("rows").getHeaderContext());

			return that.waitForChanges(assert);
		}).then(function () {
			// no additional request for same aggregation data
			that.oView.byId("table").getBinding("rows").updateAnalyticalInfo(aAggregation);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("EMPLOYEES?$apply=groupby((Name),aggregate(AGE))"
					// Note: for consistency, we prefer filter() over $filter here
					// (same for orderby() vs. $orderby and skip/top)
					+ "/filter(AGE ge 30)/orderby(AGE)/top(1)", {
					"value" : [{
						"ID" : "3",
						"Name" : "John Field",
						"AGE" : 42
					}]
				})
				.expectChange("text", null, null)
				.expectChange("age", null, null)
				.expectChange("text", ["John Field", "Jonathan Smith", "Frederic Fall"])
				.expectChange("age", ["42", "50", "70"]);

			that.oView.byId("table").setFirstVisibleRow(0);

			return that.waitForChanges(assert);
		}).then(function () {
			return oMeasureRangePromise; // no child left behind :-)
		});
	});

	//*********************************************************************************************
	// Scenario: Simulate a chart that requests minimum and maximum values for a measure via
	// #updateAnalyticalInfo on a suspended binding
	// JIRA: CPOUI5UISERVICESV3-1754
	QUnit.test("ODLB#updateAnalyticalInfo with min/max while suspended", function (assert) {
		var aAggregation = [{ // dimension
				grouped : false,
				inResult : true,
				name : "Name"
			}, { // measure
				max : true,
				min : true,
				name : "AGE",
				total : false
			}],
			sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\', suspended : true}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
		<Text id="age" text="{AGE}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectChange("text", false)
			.expectChange("age", false);

		return this.createView(assert, sView, createTeaBusiModel()).then(function () {
			var oListBinding = that.oView.byId("table").getBinding("items"),
				oMeasureRangePromise;

			that.expectRequest("EMPLOYEES?$apply=groupby((Name),aggregate(AGE))"
					+ "/concat(aggregate(AGE with min as UI5min__AGE,AGE with max as UI5max__AGE)"
					+ ",top(100))", {
					"value" : [{
							// the server response may contain additional data for example
							// @odata.id or type information "UI5min__AGE@odata.type" : "#Int16"
							"@odata.id" : null,
							"UI5min__AGE@odata.type" : "#Int16",
							"UI5min__AGE" : 42,
							"UI5max__AGE" : 77
						},
						{"ID" : "1", "Name" : "Jonathan Smith", "AGE" : 50},
						{"ID" : "0", "Name" : "Frederic Fall", "AGE" : 70},
						{"ID" : "2", "Name" : "Peter Burke", "AGE" : 77}
					]
				})
				.expectChange("text", ["Jonathan Smith", "Frederic Fall", "Peter Burke"])
				.expectChange("age", ["50", "70", "77"]);

			// code under test
			oMeasureRangePromise
				= oListBinding.updateAnalyticalInfo(aAggregation).measureRangePromise;

			// code under test
			oListBinding.resume();

			return Promise.all([oMeasureRangePromise, that.waitForChanges(assert)]);
		}).then(function (aResults) {
			var mMeasureRange = aResults[0];

			assert.deepEqual(mMeasureRange, {
				AGE : {
					max : 77,
					min : 42
				}
			});
		});
	});

	//*********************************************************************************************
	// Scenario: bindElement is called twice for the items aggregation of a sap.m.Table.
	// ManagedObject#bindObject (which is the same as #bindElement) first unbinds and then binds
	// the element again if an element binding exists. The second bindElement on "unbind" calls
	// ODLB#getContexts which must reset the previous data needed for ECD so that the diff is
	// properly computed.
	// BCP 1870081505
	QUnit.test("bindElement called twice on table", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			oTable,
			// Note: table must be "growing" otherwise it does not use ECD
			sView = '\
<Table id="table" items="{TEAM_2_EMPLOYEES}" growing="true">\
	<columns>\
		<Column><Text text="Employee Name"/></Column>\
	</columns>\
	<ColumnListItem>\
		<Text id="name" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectChange("name", false);

		return this.createView(assert, sView, oModel).then(function () {
			// Here it is essential that createView renders the table, as
			// GrowingEnablement#updateItems only performs ECD if the associated control's method
			// getItemsContainerDomRef returns a truthy value
			oTable = that.oView.byId("table");
			that.expectRequest("TEAMS('TEAM_01')?$select=Team_Id"
					+ "&$expand=TEAM_2_EMPLOYEES($select=ID,Name)", {
					"Team_Id" : "TEAM_01",
					TEAM_2_EMPLOYEES : [{
						"ID" : "3",
						"Name" : "Jonathan Smith"
					}]
				})
				.expectChange("name", ["Jonathan Smith"]);

			// code under test
			oTable.bindElement("/TEAMS('TEAM_01')");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("TEAMS('TEAM_01')?$select=Team_Id"
					+ "&$expand=TEAM_2_EMPLOYEES($select=ID,Name)", {
					"Team_Id" : "TEAM_01",
					TEAM_2_EMPLOYEES : [{
						"ID" : "3",
						"Name" : "Jonathan Smith"
					}]
				})
				.expectChange("name", ["Jonathan Smith"]);

			// code under test
			oTable.bindElement("/TEAMS('TEAM_01')");

			return that.waitForChanges(assert);
		}).then(function () {
			assert.strictEqual(oTable.getItems().length, 1, "The one entry is still displayed");
		});
	});

	//*********************************************************************************************
	// Scenario: Update a property via a control and check that the control contains the value
	// afterwards. Reason: ManagedObject#updateModelProperty fetches the updated model value and
	// sets it in the control after setting it in the model. ODataPropertyBinding#setValue must not
	// become asynchronous in this case; otherwise the control gets the old value.
	//
	// We need two text fields: The one used to observe change events cannot be used for setText
	// because our test framework attaches a formatter.
	QUnit.test("Update model property via control", function (assert) {
		var oModel = createTeaBusiModel(),
			sView = '\
<FlexBox binding="{/TEAMS(\'1\')}" id="form">\
	<Text id="Team_Id" text="{Team_Id}" />\
	<Text id="Name" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS('1')", {
				"Team_Id" : "1",
				"Name" : "Old Name"
			})
			.expectChange("Team_Id", "1");

		return this.createView(assert, sView, oModel).then(function () {
			var oText = that.oView.byId("Name");

			that.expectRequest({
					method : "PATCH",
					url : "TEAMS('1')",
					payload : {"Name" : "New Name"}
				}, {
					"Team_Id" : "1",
					"Name" : "New Name"
				});

			oText.setText("New Name");
			assert.strictEqual(oText.getText(), "New Name");
		});
	});

	//*********************************************************************************************
	// Scenario: Object page bound to active entity: Call the "Edit" bound action on an active
	// entity which responds with the inactive entity. The execute for the "Edit" operation binding
	// resolves with the context for the inactive entity. Data for the inactive entity is displayed
	// when setting this context on the object page. It can be edited and side effects can be
	// requested. The controls on the object page bound to the return value context are cleared when
	// the return value context is destroyed by e.g. resetting the context of the operation binding.
	// The second test uses a bound function instead of an action to check that the different
	// access to the cache also works.
	[{
		operation : "EditAction",
		method : "POST"
	}, {
		operation : "GetDraft",
		method : "GET"
	}].forEach(function (oFixture, i) {
		QUnit.test("bound operation: execute resolves with V4 context, " + i, function (assert) {
			var oModel = createSpecialCasesModel({autoExpandSelect : true}),
				oOperation,
				sRequestPath = "Artists(ArtistID='42',IsActiveEntity=true)/special.cases."
					+ oFixture.operation + (oFixture.method === "GET" ? "()" : ""),
				sView = '\
<FlexBox id="objectPage">\
	<Text id="city" text="{Address/City}" />\
	<Text id="id" text="{ArtistID}" />\
	<Text id="isActive" text="{IsActiveEntity}" />\
	<Input id="name" value="{Name}" />\
</FlexBox>',
				that = this;

			this.expectChange("city")
				.expectChange("id")
				.expectChange("isActive")
				.expectChange("name");

			return this.createView(assert, sView, oModel).then(function () {
				that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)?"
						+ "$select=Address/City,ArtistID,IsActiveEntity,Name", {
						"Address" : {
							"City" : "Liverpool"
						},
						"ArtistID" : "42",
						"IsActiveEntity" : true,
						"Name" : "Hour Frustrated"
					})
					.expectChange("city", "Liverpool")
					.expectChange("id", "42")
					.expectChange("isActive", "Yes")
					.expectChange("name", "Hour Frustrated");

				that.oView.setBindingContext(
					oModel.bindContext("/Artists(ArtistID='42',IsActiveEntity=true)")
						.getBoundContext());

				return that.waitForChanges(assert);
			}).then(function () {
				oOperation = that.oModel.bindContext("special.cases." + oFixture.operation
					+ "(...)", that.oView.getBindingContext(), {
						$select : "Address/City,ArtistID,IsActiveEntity,Name,Messages"
					});

				that.expectRequest({
					method : oFixture.method,
					url : sRequestPath
						+ "?$select=Address/City,ArtistID,IsActiveEntity,Messages,Name",
					payload : oFixture.method === "GET" ? undefined : {}
				}, {
					"Address" : {
						"City" : "Liverpool"
					},
					"ArtistID" : "42",
					"IsActiveEntity" : false,
					"Name" : "Hour Frustrated",
					"Messages" : [{
						"code" : "23",
						"message" : "Just A Message",
						"numericSeverity" : 1,
						"transition" : true,
						"target" : "Name"
					}]
				}).expectMessages([{
					code : "23",
					message : "Just A Message",
					target : "/Artists(ArtistID='42',IsActiveEntity=false)/Name",
					persistent : true,
					type : "Success"
				}]);

				// code under test
				return Promise.all([
					oOperation.execute(),
					that.waitForChanges(assert)
				]);
			}).then(function (aPromiseResults) {
				var oInactiveArtistContext = aPromiseResults[0];

				that.expectChange("isActive", "No");

				that.oView.byId("objectPage").setBindingContext(oInactiveArtistContext);

				return that.waitForChanges(assert);
			}).then(function () {
				that.expectRequest({
						method : "PATCH",
						url : "Artists(ArtistID='42',IsActiveEntity=false)",
						headers : {},
						payload : {"Name" : "foo"}
					}, {
						"Name" : "foo"
					})
					.expectChange("name", "foo");

				// code under test: editing values is possible on the returned entity
				that.oView.byId("name").getBinding("value").setValue("foo");

				return that.waitForChanges(assert);
			}).then(function () {
				var oInactiveArtistContext = that.oView.byId("objectPage").getBindingContext();

				that.expectRequest("Artists(ArtistID='42',IsActiveEntity=false)"
						+ "?$select=Address/City,Name", {
						"Address" : {
							"City" : "London"
						},
						"Name" : "bar" // unrealistic side effect
					})
					.expectChange("city", "London")
					.expectChange("name", "bar");

				return Promise.all([
					// code under test
					oInactiveArtistContext.requestSideEffects([{
						$PropertyPath : "Address/City"
					}, {
						$PropertyPath : "Name"
					}]),
					that.waitForChanges(assert)
				]);
			}).then(function () {
				that.expectChange("city", null)
					.expectChange("id", null)
					.expectChange("isActive", null)
					.expectChange("name", null);

				// code under test: destroy return value context
				oOperation.setContext(undefined);

				return that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Object page bound to active entity: Call the "Edit" bound action on an active
	// entity which responds with the inactive entity. The execute for the "Edit" operation binding
	// resolves with the context for the inactive entity. Data for the inactive entity is displayed
	// when setting this context on the object page. Then call the "Activate" bound action to switch
	// back to the active entity. The actions are part of the form.
	// CPOUI5UISERVICESV3-1712
	QUnit.test("bound operation: switching between active and inactive entity", function (assert) {
		var oHiddenBinding, // to be kept in the controller
			oModel = createSpecialCasesModel({autoExpandSelect : true}),
			mNames = {
				"23" : "The Rolling Stones",
				"42" : "The Beatles"
			},
			mPrices = {
				"23" : "12.99",
				"42" : "9.99"
			},
			oObjectPage,
			sView = '\
<Table id="table" items="{path : \'/Artists\', parameters : {$filter : \'IsActiveEntity\'}}">\
	<columns><Column/></columns>\
	<items>\
		<ColumnListItem>\
			<Text id="listId" text="{ArtistID}"/>\
		</ColumnListItem>\
	</items>\
</Table>\
<FlexBox id="objectPage" binding="{}">\
	<Text id="id" text="{ArtistID}" />\
	<Text id="isActive" text="{IsActiveEntity}" />\
	<Input id="name" value="{Name}" />\
	<Table items="{path : \'_Publication\', parameters : {$$ownRequest : true}}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Input id="price" value="{Price}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		function expectArtistRequest(sId, bIsActive) {
			that.expectRequest("Artists(ArtistID='" + sId + "',IsActiveEntity=" + bIsActive
				+ ")?$select=ArtistID,IsActiveEntity,Name", {
					"ArtistID" : sId,
					"IsActiveEntity" : bIsActive,
					"Name" : mNames[sId]
				})
				.expectChange("id", sId)
				.expectChange("isActive", bIsActive ? "Yes" : "No")
				.expectChange("name", mNames[sId]);
		}

		function expectPublicationRequest(sId, bIsActive) {
			that.expectRequest("Artists(ArtistID='" + sId + "',IsActiveEntity=" + bIsActive
				+ ")/_Publication?$select=Price,PublicationID&$skip=0&$top=100", {
					value : [{
						"Price" : mPrices[sId],
						"PublicationID" : "42-0"
					}]
				})
				.expectChange("price", [mPrices[sId]]);
		}

		/*
		 * Fires the given action on the given entity, set the object page to its return value
		 * context and wait for the expected changes.
		 *
		 * @param {string} sAction - The name of the action
		 * @param {string} sId - The artist ID
		 * @param {string} [sName] - The resulting artist's name if it differs from the default
		 * @returns {Promise} - A promise that waits for the expected changes
 		 */
		function action(sAction, sId, sName) {
			var bIsActive = sAction === "ActivationAction", // The resulting artist's bIsActive
				// TODO The object page's parent context may be the return value context of the
				//   previous operation. By using it as parent for the new operation we build a long
				//   chain of bindings that we never release as long as we switch between draft and
				//   active entity. -> CPOUI5UISERVICESV3-1746
				oEntityContext = oObjectPage.getObjectBinding().getContext(),
				oAction = that.oModel.bindContext("special.cases." + sAction + "(...)",
					oEntityContext, {
						$$inheritExpandSelect : true
					});

			that.expectRequest({
					method : "POST",
					url : "Artists(ArtistID='" + sId + "',IsActiveEntity=" + !bIsActive
						+ ")/special.cases." + sAction + "?$select=ArtistID,IsActiveEntity,Name",
					payload : {}
				}, {
					"ArtistID" : sId,
					"IsActiveEntity" : bIsActive,
					"Name" : sName || mNames[sId]
				});

			// code under test
			return Promise.all([
				oAction.execute(),
				that.waitForChanges(assert)
			]).then(function (aPromiseResults) {
				var oReturnValueContext = aPromiseResults[0];

				that.expectChange("isActive", bIsActive ? "Yes" : "No");
				expectPublicationRequest(sId, bIsActive);

				return bindObjectPage(oReturnValueContext, true);
			});
		}

		/*
		 * Binds the object page. A return value context directly becomes the binding context of the
		 * object page. Everything else becomes the parent context of the hidden binding, which
		 * itself becomes the parent binding of the object page.
		 *
		 * @param {string|sap.ui.model.odata.v4.Context} vSource
		 *   The source, either a path or a list context or a return value context
		 * @param {boolean} bIsReturnValueContext
		 *   Whether vSource is a return value context
		 * @returns {Promise}
		 *   A promise that waits for the expected changes
		 */
		function bindObjectPage(vSource, bIsReturnValueContext) {
			var oInnerContext,
				oOuterContext;

			if (bIsReturnValueContext) {
				oInnerContext = vSource;
			} else {
				oOuterContext = typeof vSource === "string"
					? that.oModel.createBindingContext(vSource)
					: vSource;
				oHiddenBinding.setContext(oOuterContext);
				oInnerContext = oHiddenBinding.getBoundContext();
			}
			oObjectPage.setBindingContext(oInnerContext);

			if (vSource) {
				assert.ok(oObjectPage.getObjectBinding().isPatchWithoutSideEffects(),
					oObjectPage.getObjectBinding() + " has $$patchWithoutSideEffects");
			}
			return that.waitForChanges(assert);
		}

		// start here :-)
		this.expectRequest("Artists?$filter=IsActiveEntity&$select=ArtistID,IsActiveEntity"
			+ "&$skip=0&$top=100", {
				"value" : [{"ArtistID" : "42", "IsActiveEntity" : true}]
			})
			.expectChange("listId", ["42"])
			.expectChange("id")
			.expectChange("isActive")
			.expectChange("name")
			.expectChange("price", false);

		return this.createView(assert, sView, oModel).then(function () {
			var oRowContext;

			// create the hidden binding when creating the controller
			oHiddenBinding = that.oModel.bindContext("", undefined,
				{$$patchWithoutSideEffects : true});
			oObjectPage = that.oView.byId("objectPage"); // just to keep the test shorter

			expectArtistRequest("42", true);
			expectPublicationRequest("42", true);

			// first start with the list
			oRowContext = that.oView.byId("table").getItems()[0].getBindingContext();
			return bindObjectPage(oRowContext, false);
		}).then(function () {
			return action("EditAction", "42");
		}).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "Artists(ArtistID='42',IsActiveEntity=false)",
					payload : {"Name" : "The Beatles (modified)"}
				}, {})
				.expectChange("name", "The Beatles (modified)");

			that.oView.byId("name").getBinding("value").setValue("The Beatles (modified)");
			return that.waitForChanges(assert);
		}).then(function () {
			return action("ActivationAction", "42", "The Beatles (modified)");
		}).then(function () {
			expectArtistRequest("23", false);
			expectPublicationRequest("23", false);

			// now start directly with the entity
			return bindObjectPage("/Artists(ArtistID='23',IsActiveEntity=false)");
		}).then(function () {
			return action("ActivationAction", "23");
		}).then(function () {
			return action("EditAction", "23");
		}).then(function () {
			var oRowContext;

			that.expectChange("id", "42")
				.expectChange("isActive", "Yes")
				.expectChange("name", "The Beatles");
			expectPublicationRequest("42", true);

			// Now return to the artist from the list.
			// There is no request for the artist; its cache is reused.
			// The publication is requested again, it was relative to a return value context before
			// and the return value context ID changed.
			// The list must be updated manually.
			oRowContext = that.oView.byId("table").getItems()[0].getBindingContext();
			return bindObjectPage(oRowContext, false);
		}).then(function () {
			// clear the object page
			that.expectChange("id", null)
				.expectChange("isActive", null)
				.expectChange("name", null);

			return bindObjectPage(null, false);
		});
	});

	//*********************************************************************************************
	// Scenario: Object page bound to an active entity and its navigation property is $expand'ed via
	// an own request. Trigger "Edit" bound action to start editing using a return value context and
	// modify a property in the entity referenced by the navigation property. Activate the inactive
	// entity via a bound action using another return value context.
	// The elements referenced via the navigation property must not be taken from the cache.
	// See CPOUI5UISERVICESV3-1686.
	QUnit.test("return value contexts: don't reuse caches if context changed", function (assert) {
		var oActiveArtistContext,
			oInactiveArtistContext,
			oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="objectPage">\
	<Text id="id" text="{ArtistID}" />\
	<Text id="isActive" text="{IsActiveEntity}" />\
	<Input id="name" value="{Name}" />\
	<Table id="table" items="{\
			path : \'_Publication\',\
			parameters : {$$ownRequest : true}\
		}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Input id="price" value="{Price}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;
		this.expectChange("id")
			.expectChange("isActive")
			.expectChange("name")
			.expectChange("price", []);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/_Publication"
					+ "?$select=Price,PublicationID&$skip=0&$top=100", {
					value : [{
						"Price" : "9.99",
						"PublicationID" : "42-0"
					}]
				})
				.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
					+ "?$select=ArtistID,IsActiveEntity,Name", {
					"ArtistID" : "42",
					"IsActiveEntity" : true,
					"Name" : "Hour Frustrated"
				})
				.expectChange("id", "42")
				.expectChange("isActive", "Yes")
				.expectChange("name", "Hour Frustrated")
				.expectChange("price", ["9.99"]);

			oActiveArtistContext = oModel.bindContext("/Artists(ArtistID='42',IsActiveEntity=true)")
				.getBoundContext();
			that.oView.setBindingContext(oActiveArtistContext);

			return that.waitForChanges(assert);
		}).then(function () {
			var oOperation = that.oModel.bindContext("special.cases.EditAction(...)",
					that.oView.getBindingContext(), {$$inheritExpandSelect : true});

			that.expectRequest({
					method : "POST",
					url : "Artists(ArtistID='42',IsActiveEntity=true)/special.cases.EditAction"
						+ "?$select=ArtistID,IsActiveEntity,Name",
					payload : {}
				}, {
					"ArtistID" : "42",
					"IsActiveEntity" : false,
					"Name" : "Hour Frustrated"
				});

			return Promise.all([
				// code under test
				oOperation.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function (aPromiseResults) {
			oInactiveArtistContext = aPromiseResults[0];

			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=false)/_Publication"
					+ "?$select=Price,PublicationID&$skip=0&$top=100", {
					value : [{
						"Price" : "9.99",
						"PublicationID" : "42-0"
					}]
				})
				.expectChange("isActive", "No")
				.expectChange("price", ["9.99"]);

			that.oView.setBindingContext(oInactiveArtistContext);

			return that.waitForChanges(assert);
		}).then(function () {
			var oBinding = that.oView.byId("table").getItems()[0].getCells()[0].getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "Artists(ArtistID='42',IsActiveEntity=false)/_Publication('42-0')",
					payload : {"Price" : "8.88"}
				}, {
					"@odata.etag" : "ETag1",
					"Price" : "8.88"
				})
				.expectChange("price", "8.88", 0);

			oBinding.setValue("8.88");

			return that.waitForChanges(assert);
		}).then(function () {
			// switching back to active context takes values from cache
			that.expectChange("isActive", "Yes")
				.expectChange("price", ["9.99"]);

			that.oView.setBindingContext(oActiveArtistContext);

			return that.waitForChanges(assert);
		}).then(function () {
			// switching back to inactive context takes values also from cache
			that.expectChange("isActive", "No")
				.expectChange("price", ["8.88"]);

			that.oView.setBindingContext(oInactiveArtistContext);

			return that.waitForChanges(assert);
		}).then(function () {
			var oOperation = that.oModel.bindContext("special.cases.ActivationAction(...)",
					that.oView.getBindingContext(), {$$inheritExpandSelect : true});

			that.expectRequest({
					method : "POST",
					url : "Artists(ArtistID='42',IsActiveEntity=false)"
						+ "/special.cases.ActivationAction?$select=ArtistID,IsActiveEntity,Name",
					payload : {}
				}, {
					"ArtistID" : "42",
					"IsActiveEntity" : true,
					"Name" : "Hour Frustrated"
				});

			return Promise.all([
				// code under test
				oOperation.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function (aPromiseResults) {
			var oNewActiveArtistContext = aPromiseResults[0];

			// new active artist context causes dependent binding to reload data
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/_Publication"
					+ "?$select=Price,PublicationID&$skip=0&$top=100", {
					value : [{
						"Price" : "8.88",
						"PublicationID" : "42-0"
					}]
				})
				.expectChange("isActive", "Yes")
				.expectChange("price", ["8.88"]);

			that.oView.setBindingContext(oNewActiveArtistContext);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Master list and details containing a dependent table with an own request. Use
	// cached values in dependent table if user switches between entries in the master list.
	// See CPOUI5UISERVICESV3-1686.
	QUnit.test("Reuse caches in dependent tables w/ own request while switching master list entry",
			function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{/EMPLOYEES}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="name" text="{Name}" />\
	</ColumnListItem>\
</Table>\
<FlexBox id="form" binding="{path : \'\', parameters : {$$ownRequest : true}}">\
	<Text id="managerId" text="{EMPLOYEE_2_MANAGER/ID}" />\
	<Table items="{path : \'EMPLOYEE_2_EQUIPMENTS\', parameters : {$$ownRequest : true}}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="equipmentId" text="{ID}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES?$select=ID,Name&$skip=0&$top=100", {
				"value" : [
					{"ID" : "42", "Name" : "Jonathan Smith"},
					{"ID" : "43", "Name" : "Frederic Fall"}
				]
			})
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"])
			.expectChange("managerId")
			.expectChange("equipmentId", false);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("EMPLOYEES('42')?$select=ID&$expand=EMPLOYEE_2_MANAGER($select=ID)",
				{
					"ID" : "42",
					"EMPLOYEE_2_MANAGER" : {
						"ID" : "1"
					}
				})
				.expectRequest("EMPLOYEES('42')/EMPLOYEE_2_EQUIPMENTS?$select=Category,ID"
					+ "&$skip=0&$top=100", {
					"value" : [
						{"Category" : "Electronics", "ID" : 99},
						{"Category" : "Electronics", "ID" : 98}
					]
				})
				.expectChange("managerId", "1")
				.expectChange("equipmentId", ["99", "98"]);

			// code under test
			that.oView.byId("form").setBindingContext(
				that.oView.byId("table").getBinding("items").getCurrentContexts()[0]);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("EMPLOYEES('43')/EMPLOYEE_2_EQUIPMENTS?$select=Category,ID"
					+ "&$skip=0&$top=100", {
					"value" : [
						{"Category" : "Electronics", "ID" : 97},
						{"Category" : "Electronics", "ID" : 96}
					]
				})
				.expectRequest("EMPLOYEES('43')?$select=ID&$expand=EMPLOYEE_2_MANAGER($select=ID)",
				{
					"ID" : "43",
					"EMPLOYEE_2_MANAGER" : {
						"ID" : "2"
					}
				})
				.expectChange("managerId", "2")
				.expectChange("equipmentId", ["97", "96"]);

			// code under test
			that.oView.byId("form").setBindingContext(
				that.oView.byId("table").getBinding("items").getCurrentContexts()[1]);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("managerId", "1")
				.expectChange("equipmentId", ["99", "98"]);

			// code under test - no request!
			that.oView.byId("form").setBindingContext(
				that.oView.byId("table").getBinding("items").getCurrentContexts()[0]);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Object page bound to active entity with a navigation property $expand'ed via
	// auto-$expand/$select. The "Edit" bound action on the active entity has the binding parameter
	// $$inheritExpandSelect set so that it triggers the POST request with the same $expand and
	// $select parameters used for loading the active entity. This way, all fields in the object
	// page can be populated from the bound action response.
	// Read side effects which include navigation properties while there are pending changes.
	QUnit.test("bound operation: $$inheritExpandSelect", function (assert) {
		var fnDataReceived = this.spy(),
			fnDataRequested = this.spy(),
			oJustAMessage = {
				code : "23",
				message : "Just A Message",
				target : "/Artists(ArtistID='42',IsActiveEntity=false)/Name",
				persistent : true,
				type : "Success"
			},
			oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="objectPage">\
	<Text id="id" text="{ArtistID}" />\
	<Text id="isActive" text="{IsActiveEntity}" />\
	<Input id="name" value="{Name}" />\
	<Text id="inProcessByUser" text="{DraftAdministrativeData/InProcessByUser}" />\
</FlexBox>',
			that = this;

		this.expectChange("id")
			.expectChange("isActive")
			.expectChange("name")
			.expectChange("inProcessByUser");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)?custom=foo"
					+ "&$select=ArtistID,IsActiveEntity,Messages,Name"
					+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)", {
					"ArtistID" : "42",
					"DraftAdministrativeData" : null,
					"IsActiveEntity" : true,
					"Name" : "Hour Frustrated"
				})
				.expectChange("id", "42")
				.expectChange("isActive", "Yes")
				.expectChange("name", "Hour Frustrated");

			that.oView.setBindingContext(
				oModel.bindContext("/Artists(ArtistID='42',IsActiveEntity=true)", null,
						{"custom" : "foo", "$select" : "Messages"})
					.getBoundContext());

			return that.waitForChanges(assert);
		}).then(function () {
			var oOperation = that.oModel.bindContext("special.cases.EditAction(...)",
					that.oView.getBindingContext(), {$$inheritExpandSelect : true});

			oOperation.attachDataReceived(fnDataReceived);
			oOperation.attachDataRequested(fnDataRequested);
			that.expectRequest({
					method : "POST",
					url : "Artists(ArtistID='42',IsActiveEntity=true)/special.cases.EditAction"
						+ "?$select=ArtistID,IsActiveEntity,Messages,Name"
						+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)",
					payload : {}
				}, {
					"@odata.etag" : "ETag0",
					"ArtistID" : "42",
					"DraftAdministrativeData" : {
						"DraftID" : "1",
						"InProcessByUser" : "JOHNDOE"
					},
					"IsActiveEntity" : false,
					"Messages" : [{
						"code" : "23",
						"message" : "Just A Message",
						"numericSeverity" : 1,
						"target" : "Name",
						"transition" : true
					}],
					"Name" : "Hour Frustrated"
				})
				.expectMessages([oJustAMessage]);

			return Promise.all([
				// code under test
				oOperation.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function (aPromiseResults) {
			var oInactiveArtistContext = aPromiseResults[0];

			that.expectChange("isActive", "No")
				.expectChange("inProcessByUser", "JOHNDOE");

			that.oView.setBindingContext(oInactiveArtistContext);

			return that.waitForChanges(assert);
		}).then(function () {
			return that.checkValueState(assert, "name", "Success", "Just A Message");
		}).then(function () {
			var oInactiveArtistContext = that.oView.getBindingContext();

			that.expectChange("name", "TAFKAP")
				.expectRequest({
					method : "PATCH",
					url : "Artists(ArtistID='42',IsActiveEntity=false)",
					headers : {"If-Match" : "ETag0"},
					payload : {"Name" : "TAFKAP"}
				}, {/* response does not matter here */});

			that.oView.byId("name").getBinding("value").setValue("TAFKAP");

			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=false)"
				+ "?$select=DraftAdministrativeData"
				+ "&$expand=DraftAdministrativeData($select=InProcessByUser)", {
					"DraftAdministrativeData" : {
						"InProcessByUser" : "bar"
					}
				})
				.expectChange("inProcessByUser", "bar");
				// no change in messages

			return Promise.all([
				// code under test
				oInactiveArtistContext.requestSideEffects([{
					$PropertyPath : "DraftAdministrativeData/InProcessByUser"
				}]),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			assert.strictEqual(fnDataReceived.callCount, 0, "no dataReceived");
			assert.strictEqual(fnDataRequested.callCount, 0, "no dataRequested");

			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=false)"
					+ "?$select=ArtistID,IsActiveEntity,Messages,Name"
					+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)", {
					"ArtistID" : "42",
					"DraftAdministrativeData" : {
						"DraftID" : "1",
						"InProcessByUser" : "JOHNDOE"
					},
					"IsActiveEntity" : false,
					"Messages" : [],
					"Name" : "Changed"
				})
				.expectChange("name", "Changed")
				//TODO unexpected change events -> CPOUI5UISERVICESV3-1572
				.expectChange("id", "42")
				.expectChange("isActive", "No")
				.expectChange("inProcessByUser", "JOHNDOE");
				// no change in messages

			// code under test
			that.oView.getBindingContext().refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			var oOperation = that.oModel.bindContext("special.cases.ActivationAction(...)",
					that.oView.getBindingContext(), {$$inheritExpandSelect : true});

			assert.strictEqual(fnDataReceived.callCount, 1, "dataReceived");
			assert.strictEqual(fnDataRequested.callCount, 1, "dataRequested");
			that.expectRequest({
					method : "POST",
					url : "Artists(ArtistID='42',IsActiveEntity=false)"
						+ "/special.cases.ActivationAction"
						+ "?$select=ArtistID,IsActiveEntity,Messages,Name"
						+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)",
					payload : {}
				}, {
					"ArtistID" : "42",
					"DraftAdministrativeData" : {
						"DraftID" : "1",
						"InProcessByUser" : ""
					},
					"IsActiveEntity" : true,
					"Messages" : [],
					"Name" : "Hour Frustrated"
				});
				// no change in messages

			return Promise.all([
				oOperation.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Call an action which returns the binding parameter as return value. Expect that
	// the result is copied back to the binding parameter.
	QUnit.test("bound operation: copy result into context", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/SalesOrderList(\'42\')}">\
	<Text id="id" text="{SalesOrderID}" />\
	<Text id="LifecycleStatusDesc" text="{LifecycleStatusDesc}" />\
	<FlexBox id="action"\
		binding="{com.sap.gateway.default.zui5_epm_sample.v0002.SalesOrder_Confirm(...)}">\
		<layoutData><FlexItemData/></layoutData>\
	</FlexBox>\
</FlexBox>',
			that = this;

		that.expectRequest("SalesOrderList('42')?$select=LifecycleStatusDesc,SalesOrderID", {
				"SalesOrderID" : "42",
				"LifecycleStatusDesc" : "New"
			})
			.expectChange("id", "42")
			.expectChange("LifecycleStatusDesc", "New");

		return this.createView(assert, sView, oModel).then(function () {
			var oOperation = that.oView.byId("action").getObjectBinding();

			that.expectRequest({
					method : "POST",
					url : "SalesOrderList('42')/"
							+ "com.sap.gateway.default.zui5_epm_sample.v0002.SalesOrder_Confirm",
					payload : {}
				}, {
					"SalesOrderID" : "42",
					"LifecycleStatusDesc" : "Confirmed"
				})
				.expectChange("LifecycleStatusDesc", "Confirmed");

			return Promise.all([
				// code under test
				oOperation.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete return value context obtained from bound action execute.
	QUnit.test("bound operation: delete return value context", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="objectPage">\
	<Text id="id" text="{ArtistID}" />\
	<Text id="isActive" text="{IsActiveEntity}" />\
	<Text id="name" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectChange("id")
			.expectChange("isActive")
			.expectChange("name");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
					+ "?$select=ArtistID,IsActiveEntity,Name", {
					"ArtistID" : "42",
					"IsActiveEntity" : true,
					"Name" : "Hour Frustrated"
				})
				.expectChange("id", "42")
				.expectChange("isActive", "Yes")
				.expectChange("name", "Hour Frustrated");

			that.oView.setBindingContext(
				oModel.bindContext("/Artists(ArtistID='42',IsActiveEntity=true)")
					.getBoundContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "POST",
					url : "Artists(ArtistID='42',IsActiveEntity=true)/special.cases.EditAction",
					payload : {}
				}, {
					"ArtistID" : "42",
					"IsActiveEntity" : false,
					"Name" : "Hour Frustrated"
				});

			return Promise.all([
				that.oModel
					.bindContext("special.cases.EditAction(...)", that.oView.getBindingContext())
					.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function (aPromiseResults) {
			var oInactiveArtistContext = aPromiseResults[0];

			that.expectChange("isActive", "No");

			that.oView.byId("objectPage").setBindingContext(oInactiveArtistContext);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "Artists(ArtistID='42',IsActiveEntity=false)"
				})
				.expectChange("id", null)
				.expectChange("isActive", null)
				.expectChange("name", null);

			return Promise.all([
				// code under test
				that.oView.byId("objectPage").getBindingContext().delete(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Execute bound action with context for which no data has been read yet.
	QUnit.test("bound operation: execute bound action on context w/o read", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			oParentContext = oModel.bindContext("/Artists(ArtistID='42',IsActiveEntity=true)")
				.getBoundContext(),
			that = this;

		return this.createView(assert, "", oModel).then(function () {
			that.expectRequest({
					method: "POST",
					url: "Artists(ArtistID='42',IsActiveEntity=true)/special.cases.EditAction",
					payload: {}
				}, {
					"ArtistID" : "42",
					"IsActiveEntity" : false
				});

			return Promise.all([
				// code under test
				oModel.bindContext("special.cases.EditAction(...)", oParentContext).execute(),
				that.waitForChanges(assert)
			]);
		}).then(function (aPromiseResults) {
			var oInactiveArtistContext = aPromiseResults[0];

			assert.strictEqual(oInactiveArtistContext.getProperty("IsActiveEntity"), false);
		});
	});

	//*********************************************************************************************
	// Scenario: Create entity for an absolute ListBinding, save the new entity and call a bound
	// action for the new non-transient entity
	QUnit.test("Create absolute, save and call action", function (assert) {
		var oCreatedContext,
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			that = this,
			sView = '\
<Table id="table" items="{/TEAMS}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="Team_Id" text="{Team_Id}" />\
	</ColumnListItem>\
</Table>';

		this.expectRequest("TEAMS?$select=Team_Id&$skip=0&$top=100", {
				"value" : [{"Team_Id" : "42"}]
			})
			.expectChange("Team_Id", ["42"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "POST",
					url : "TEAMS",
					payload : {"Team_Id" : "new"}
				}, {
					"Team_Id" : "newer"
				})
				.expectChange("Team_Id", "new", 0)
				.expectChange("Team_Id", ["newer", "42"])
				.expectRequest("TEAMS('newer')?$select=Team_Id", {
					"Team_Id" : "newer"
				});

			oCreatedContext =  that.oView.byId("table").getBinding("items").create({
				"Team_Id" : "new"
			});

			return Promise.all([oCreatedContext.created(), that.waitForChanges(assert)]);
		}).then(function () {
			var oAction = oModel.bindContext("com.sap.gateway.default.iwbep.tea_busi.v0001."
					+ "AcChangeManagerOfTeam(...)", oCreatedContext);

			assert.strictEqual(oCreatedContext.getPath(), "/TEAMS('newer')");

			that.expectRequest({
					method : "POST",
					url : "TEAMS('newer')/com.sap.gateway.default.iwbep.tea_busi.v0001."
						+ "AcChangeManagerOfTeam",
					payload : {"ManagerID" : "01"}
			});
			oAction.setParameter("ManagerID", "01");


			return Promise.all([
				// code under test
				oAction.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Create entity for a relative ListBinding, save the new entity and call action
	// import for the new non-transient entity
	QUnit.test("Create relative, save and call action", function (assert) {
		var oCreatedContext,
			oModel = createTeaBusiModel(),
			oTeam2EmployeesBinding,
			that = this,
			sView = '\
<FlexBox id="form" binding="{path : \'/TEAMS(\\\'42\\\')\',\
	parameters : {$expand : {TEAM_2_EMPLOYEES : {$select : \'ID\'}}}}">\
	<Table id="table" items="{TEAM_2_EMPLOYEES}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="id" text="{ID}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>';

		this.expectRequest("TEAMS('42')?$expand=TEAM_2_EMPLOYEES($select=ID)", {
				"TEAM_2_EMPLOYEES" : [
					{"ID" : "2"}
				]
			})
			.expectChange("id", ["2"]);

		return this.createView(assert, sView, oModel).then(function () {
			// create new relative entity
			that.expectRequest({
					method : "POST",
					url : "TEAMS('42')/TEAM_2_EMPLOYEES",
					payload : {"ID" : null}
				}, {
					"ID" : "7"
				})
				.expectChange("id", "", 0) // from setValue(null)
				.expectChange("id", ["7", "2"]);
			oTeam2EmployeesBinding = that.oView.byId("table").getBinding("items");
			oCreatedContext = oTeam2EmployeesBinding.create({"ID" : null});

			return Promise.all([oCreatedContext.created(), that.waitForChanges(assert)]);
		}).then(function () {
			var oAction = that.oModel.bindContext(
					"com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee(...)",
					oCreatedContext);

			assert.strictEqual(oCreatedContext.getPath(), "/TEAMS('42')/TEAM_2_EMPLOYEES('7')");

			that.expectRequest({
					method : "POST",
					url : "TEAMS('42')/TEAM_2_EMPLOYEES('7')/"
						+ "com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee",
					payload : {"TeamID" : "TEAM_02"}
				}, {
					"ID" : "7"
				});
			oAction.setParameter("TeamID", "TEAM_02");

			return Promise.all([
				// code under test
				oAction.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Create a new entity on an absolute ListBinding, save the new entity and call bound
	// action for the new non-transient entity
	// Afterwards create a new entity on a containment relative to the just saved absolute entity,
	// save the containment and call a bound function on the new non-transient contained entity
	QUnit.test("Create absolute and contained entity, save and call bound action/function",
			function (assert) {
		var oCreatedItemContext,
			oCreatedSOContext,
			oItemBinding,
			oModel = createSalesOrdersModel({autoExpandSelect : true}),
			that = this,
			sView = '\
<Table id="SalesOrders" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="SalesOrderID" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>\
<Table id="LineItems" items="{SO_2_SOITEM}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Text id="ItemSalesOrderID" text="{SalesOrderID}" />\
		<Text id="ItemPosition" text="{ItemPosition}" />\
	</ColumnListItem>\
</Table>';

		this.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=100", {
				"value" : [{"SalesOrderID" : "42"}]
			})
			.expectChange("SalesOrderID", ["42"])
			.expectChange("ItemPosition", []);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest({
					method : "POST",
					url : "SalesOrderList",
					payload : {"SalesOrderID" : "newID"}
				}, {
					"SalesOrderID" : "43"
				})
				.expectChange("SalesOrderID", "newID", 0) // from create()
				.expectChange("SalesOrderID", ["43", "42"])
				.expectRequest("SalesOrderList('43')?$select=SalesOrderID", {
					"SalesOrderID" : "43"
				});

			oCreatedSOContext = that.oView.byId("SalesOrders").getBinding("items").create({
				"SalesOrderID" : "newID"
			});

			return Promise.all([oCreatedSOContext.created(), that.waitForChanges(assert)]);
		}).then(function () {
			// set context for line items after sales order is created
			that.expectRequest("SalesOrderList('43')/SO_2_SOITEM?$select=ItemPosition,"
					+ "SalesOrderID&$skip=0&$top=100", {
					"value" : []
				});
			oItemBinding = that.oView.byId("LineItems").getBinding("items");
			oItemBinding.setContext(oCreatedSOContext);

			return that.waitForChanges(assert);
		}).then(function () {
			// create a sales order line item
			that.expectRequest({
					method : "POST",
					url : "SalesOrderList('43')/SO_2_SOITEM",
					payload : {
						"SalesOrderID" : "43",
						"ItemPosition" : "newPos"
					}
				}, {
					"SalesOrderID" : "43",
					"ItemPosition" : "10"
				})
				.expectChange("ItemPosition", "newPos", 0)
				.expectChange("ItemPosition", "10", 0);

			oCreatedItemContext =  oItemBinding.create({
				"SalesOrderID" : "43",
				"ItemPosition" : "newPos"
			});

			return Promise.all([oCreatedItemContext.created(), that.waitForChanges(assert)]);
		}).then(function () {
			// confirm created sales order (call action on created context)
			var oAction = oModel.bindContext("com.sap.gateway.default.zui5_epm_sample"
					+ ".v0002.SalesOrder_Confirm(...)", oCreatedSOContext);

			that.expectRequest({
					method : "POST",
					url : "SalesOrderList('43')/com.sap.gateway.default.zui5_epm_sample"
						+ ".v0002.SalesOrder_Confirm",
					payload : {}
				}, {
					"SalesOrderID" : "43"
				});

			return Promise.all([
				// code under test
				oAction.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			// check availability (call function on created containment)
			var oFunction = oModel.bindContext("com.sap.gateway.default.zui5_epm_"
					+ "sample.v0002.SalesOrderLineItem_CheckAvailability(...)",
					oCreatedItemContext);

			that.expectRequest({
					method : "GET",
					url : "SalesOrderList('43')/SO_2_SOITEM(SalesOrderID='43'"
						+ ",ItemPosition='10')/com.sap.gateway.default.zui5_epm_"
						+ "sample.v0002.SalesOrderLineItem_CheckAvailability()"
				}, {
					value : "5.0"
				});

			return Promise.all([
				// code under test
				oFunction.execute(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	["$direct", "$auto"].forEach(function (sGroupId){
		QUnit.test("Unbound messages in response: " + sGroupId, function (assert) {
			var oModel = createTeaBusiModel({"groupId" : sGroupId}),
				sView = '\
<FlexBox binding="{path : \'/TEAMS(\\\'42\\\')/TEAM_2_MANAGER\',\
	parameters : {custom : \'foo\'}}">\
	<Text id="id" text="{ID}" />\
</FlexBox>';

			this.expectRequest("TEAMS('42')/TEAM_2_MANAGER?custom=foo", {"ID" : "23"}, {
					"sap-messages" : JSON.stringify([
						{"code" : "foo-42", "message" : "text0", "numericSeverity" : 3,
							"longtextUrl" : "../Messages(1)/LongText/$value"},
						{"code" : "foo-77", "message" : "text1", "numericSeverity" : 2}
					])
				})
				.expectMessages([{
					"code" : "foo-42",
					"descriptionUrl" : sTeaBusi + "Messages(1)/LongText/$value",
					"message" : "text0",
					"persistent" : true,
					"target" : "",
					"type" : "Warning"
				}, {
					"code" : "foo-77",
					"message" : "text1",
					"persistent" : true,
					"target" : "",
					"type" : "Information"
				}])
				.expectChange("id", "23");

			return this.createView(assert, sView, oModel);
		});
	});

	//*********************************************************************************************
	// Scenario: Master/detail. Select the first row in the master table, the detail list returns
	// an item with a message. Select the second row in the master table, the message remains
	// although the item is no longer displayed. Now sort the detail table (which refreshes it) and
	// the message is gone.
	QUnit.test("Master/Detail & messages", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/TEAMS\', templateShareable : false}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="text" text="{Name}" />\
	</ColumnListItem>\
</Table>\
<Table id="detailTable" items="{path : \'TEAM_2_EMPLOYEES\', \
		parameters : {$select : \'__CT__FAKE__Message/__FAKE__Messages\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="Name" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("TEAMS?$select=Name,Team_Id&$skip=0&$top=100", {
				value : [
					{"Team_Id" : "Team_01", "Name" : "Team 01"},
					{"Team_Id" : "Team_02", "Name" : "Team 02"}
				]
			})
			.expectChange("text", ["Team 01", "Team 02"])
			.expectChange("Name", false);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("TEAMS('Team_01')/TEAM_2_EMPLOYEES"
					+ "?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages&$skip=0&$top=100", {
					value : [{
						"ID" : "1",
						"Name" : "Peter Burke",
						"__CT__FAKE__Message" : {
							"__FAKE__Messages" : [{
								"code" : "1",
								"message" : "Text",
								"numericSeverity" : 3,
								"target" : "Name",
								"transition" : false
							}]
						}
					}]
				})
				.expectChange("Name", ["Peter Burke"])
				.expectMessages([{
					"code" : "1",
					"message" : "Text",
					"persistent" : false,
					"target" : "/TEAMS('Team_01')/TEAM_2_EMPLOYEES('1')/Name",
					"type" : "Warning"
				}]);

			that.oView.byId("detailTable").setBindingContext(
				that.oView.byId("table").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("TEAMS('Team_02')/TEAM_2_EMPLOYEES"
					+ "?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages&$skip=0&$top=100", {
					value : []
				})
				.expectChange("Name", []);
				// no change in messages

			that.oView.byId("detailTable").setBindingContext(
				that.oView.byId("table").getItems()[1].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("TEAMS('Team_02')/TEAM_2_EMPLOYEES"
					+ "?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages"
					+ "&$orderby=Name&$skip=0&$top=100", {
					value : []
				})
				.expectMessages([]); // message is gone

			that.oView.byId("detailTable").getBinding("items").sort(new Sorter("Name"));

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario:
	// Two Master/Detail binding hierarchies for sales orders and sales order line items. When
	// refreshing a single sales order, line items requests are triggered and messages are updated
	// only for this single sales order and its dependent sales order line items. For other sales
	// orders and their dependent sales order line items cached data is not discarded and messages
	// are kept untouched. If there are unresolved bindings, their cached data which depends on the
	// refreshed sales order is discarded and the corresponding messages are removed. Resolved
	// bindings for other binding hierarchies are not affected. (CPOUI5UISERVICESV3-1575)
	QUnit.test("sap.ui.model.odata.v4.Context#refresh: caches and messages", function (assert) {
		var sView = '\
<Table id="tableSalesOrder" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="salesOrder" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>\
<Table id="tableSOItems" items="{\
			path : \'SO_2_SOITEM\',\
			parameters : {\
				$$ownRequest : true,\
				$select : \'Messages\'\
			}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="note" text="{Note}" />\
	</ColumnListItem>\
</Table>\
<!-- same paths in different control hierarchies -->\
<Table id="tableSalesOrder2" items="{/SalesOrderList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="salesOrder2" text="{SalesOrderID}" />\
	</ColumnListItem>\
</Table>\
<!-- to determine which request is fired the second table requests only 5 entries -->\
<Table id="tableSOItems2" growing="true" growingThreshold="5"\
		items="{path : \'SO_2_SOITEM\', parameters : {}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="note2" text="{Note}" />\
	</ColumnListItem>\
</Table>',
			oExpectedMessage0 = {
				"code" : "1",
				"message" : "Message0",
				"persistent" : false,
				"target" : "/SalesOrderList('0500000347')"
					+ "/SO_2_SOITEM(SalesOrderID='0500000347',ItemPosition='0')/Note",
				"type" : "Warning"
			},
			oModel = createSalesOrdersModel({autoExpandSelect : true}),
			that = this;

		that.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=100", {
					"value" : [
						{"SalesOrderID" : "0500000347"},
						{"SalesOrderID" : "0500000348"}
					]
				})
			.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=100", {
					"value" : [
						{"SalesOrderID" : "0500000347"},
						{"SalesOrderID" : "0500000348"}
					]
				})
			.expectChange("salesOrder", ["0500000347", "0500000348"])
			.expectChange("note", [])
			.expectChange("salesOrder2", ["0500000347", "0500000348"])
			.expectChange("note2", []);

		return this.createView(assert, sView, oModel).then(function () {
			// Select the first sales order in both hierarchies to get their items and messages
			that.expectRequest("SalesOrderList('0500000347')/SO_2_SOITEM"
					+ "?$select=ItemPosition,Note,SalesOrderID&$skip=0&$top=5", {
					"value" : [
						{"ItemPosition" : "0", "Note" : "Test1", "SalesOrderID" : "0500000347"},
						{"ItemPosition" : "1", "Note" : "Test2", "SalesOrderID" : "0500000347"}
					]
				})
				.expectRequest("SalesOrderList('0500000347')/SO_2_SOITEM"
					+ "?$select=ItemPosition,Messages,Note,SalesOrderID&$skip=0&$top=100", {
					"value" : [{
						"ItemPosition" : "0",
						"Messages" : [{
							"code" : "1",
							"message" : "Message0",
							"numericSeverity" : 3,
							"target" : "Note",
							"transition" : false
						}],
						"Note" : "Test1",
						"SalesOrderID" : "0500000347"
					}, {
						"ItemPosition" : "1",
						"Messages" : [],
						"Note" : "Test2",
						"SalesOrderID" : "0500000347"
					}]
				})
				.expectChange("note", ["Test1", "Test2"])
				.expectChange("note2", ["Test1", "Test2"])
				.expectMessages([oExpectedMessage0]);

			that.oView.byId("tableSOItems").setBindingContext(
				that.oView.byId("tableSalesOrder").getItems()[0].getBindingContext());
			that.oView.byId("tableSOItems2").setBindingContext(
				that.oView.byId("tableSalesOrder2").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			// Select the second sales order to get its items and messages
			that.expectRequest("SalesOrderList('0500000348')/SO_2_SOITEM"
					+ "?$select=ItemPosition,Messages,Note,SalesOrderID&$skip=0&$top=100", {
					"value" : [{
						"ItemPosition" : "0",
						"Messsages" : [],
						"Note" : "Test3",
						"SalesOrderID" : "0500000348"
					}, {
						"ItemPosition" : "1",
						"Messages" : [{
							"code" : "1",
							"message" : "Message1",
							"numericSeverity" : 3,
							"target" : "Note",
							"transition" : false
						}],
						"Note" : "Test4",
						"SalesOrderID" : "0500000348"
					}]
				})
				.expectChange("note", ["Test3", "Test4"])
				.expectMessages([oExpectedMessage0, {
					"code" : "1",
					"message" : "Message1",
					"persistent" : false,
					"target" : "/SalesOrderList('0500000348')"
						+ "/SO_2_SOITEM(SalesOrderID='0500000348',ItemPosition='1')/Note",
					"type" : "Warning"
				}]);

			// code under test
			that.oView.byId("tableSOItems").setBindingContext(
				that.oView.byId("tableSalesOrder").getItems()[1].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			// refresh the second sales order; the message for the first sales order is kept
			that.expectRequest("SalesOrderList('0500000348')?$select=SalesOrderID", {
					"SalesOrderID" : "0500000348"})
				.expectRequest("SalesOrderList('0500000348')/SO_2_SOITEM"
					+ "?$select=ItemPosition,Messages,Note,SalesOrderID&$skip=0&$top=100", {
					"value" : [{
						"ItemPosition" : "0",
						"Messages" : [],
						"Note" : "Test3a",
						"SalesOrderID" : "0500000348"
					}, {
						"ItemPosition" : "1",
						"Messages" : [],
						"Note" : "Test4a",
						"SalesOrderID" : "0500000348"
					}]
				})
				.expectChange("note", ["Test3a", "Test4a"])
				.expectMessages([oExpectedMessage0]);

			// code under test
			that.oView.byId("tableSalesOrder").getItems()[1].getBindingContext().refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			// select the first sales order again; no requests, the cache for the items is still
			// alive
			that.expectChange("note", ["Test1", "Test2"]);
				// no change in messages

			// code under test
			that.oView.byId("tableSOItems").setBindingContext(
				that.oView.byId("tableSalesOrder").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			// remove the binding context for the sales order items to get an unresolved binding
			// with caches
			that.expectChange("note", []);
				// no change in messages

			that.oView.byId("tableSOItems").setBindingContext(null);

			return that.waitForChanges(assert);
		}).then(function () {
			// refresh the first sales order, caches and messages of unresolved bindings for this
			// sales order are discarded
			that.expectRequest("SalesOrderList('0500000347')?$select=SalesOrderID", {
					"SalesOrderID" : "0500000347"})
				.expectMessages([]);

			that.oView.byId("tableSalesOrder").getItems()[0].getBindingContext().refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			// select the first sales order to get its items and messages, request is
			// triggered because the cache for the sales order line items is discarded
			that.expectRequest("SalesOrderList('0500000347')/SO_2_SOITEM"
					+ "?$select=ItemPosition,Messages,Note,SalesOrderID&$skip=0&$top=100", {
					"value" : [{
						"ItemPosition" : "0",
						"Messages" : [{
							"code" : "1",
							"message" : "Message0",
							"numericSeverity" : 3,
							"target" : "Note",
							"transition" : false
						}],
						"Note" : "Test1",
						"SalesOrderID" : "0500000347"
					}, {
						"ItemPosition" : "1",
						"Messages" : [],
						"Note" : "Test2",
						"SalesOrderID" : "0500000347"
					}]
				})
				.expectChange("note", ["Test1", "Test2"])
				.expectMessages([oExpectedMessage0]);

			// code under test
			that.oView.byId("tableSOItems").setBindingContext(
				that.oView.byId("tableSalesOrder").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			// select the second sales order again; no requests, cache is still alive
			that.expectChange("note", ["Test3a", "Test4a"]);
				// no change in messages

			// code under test
			that.oView.byId("tableSOItems").setBindingContext(
				that.oView.byId("tableSalesOrder").getItems()[1].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			// remove the binding context for the items of the second binding hierarchy
			that.expectChange("note2", []);
				// no change in messages

			that.oView.byId("tableSOItems2").setBindingContext(null);

			return that.waitForChanges(assert);
		}).then(function () {
			// select the same sales order again in the second binding hierarchy; no requests, cache
			// is still alive; cache was not affected by refreshing sales order "0500000347" in the
			// first binding hierarchy
			that.expectChange("note2", ["Test1", "Test2"]);
				// no change in messages

			that.oView.byId("tableSOItems2").setBindingContext(
				that.oView.byId("tableSalesOrder2").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		}).then(function () {
			// remove the binding context for the items of the binding hierarchy
			that.expectChange("note", []);
				// no change in messages

			that.oView.byId("tableSOItems").setBindingContext(null);

			return that.waitForChanges(assert);
		}).then(function () {
			// Refresh the whole binding
			that.expectRequest("SalesOrderList?$select=SalesOrderID&$skip=0&$top=100", {
					"value" : [
						{"SalesOrderID" : "0500000347"},
						{"SalesOrderID" : "0500000348"}
					]
				})
				.expectMessages([]);

			that.oView.byId("tableSalesOrder").getBinding("items").refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			// select the same sales order again in the binding hierarchy, new request is sent;
			//TODO if Binding.refresh considers unbound bindings this request is expected.
			// Will be fixed with CPOUI5UISERVICESV3-1701
/*			that.expectRequest("SalesOrderList('0500000347')/SO_2_SOITEM"
					+ "?$select=ItemPosition,Messages,Note,SalesOrderID&$skip=0&$top=100", {
					"value" : [
						{"ItemPosition" : "0", "Note" : "Test1", "SalesOrderID" : "0500000347"},
						{"ItemPosition" : "1", "Note" : "Test2", "SalesOrderID" : "0500000347"}
					]
				})
*/
			that.expectChange("note", ["Test1", "Test2"]);

			that.oView.byId("tableSOItems").setBindingContext(
				that.oView.byId("tableSalesOrder").getItems()[0].getBindingContext());

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Change a property in a dependent binding with an own cache below a list binding.
	// Unset the binding context for the dependent binding and expect that there are still pending
	// changes for the formerly set context. Set the binding context to the second entry of the
	// equipments table and refresh the context of the second entry and expect that refresh is
	// possible. (CPOUI5UISERVICESV3-1575)
	QUnit.test("Context: Pending change in a hidden cache", function (assert) {
		var oContext0,
			oContext1,
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="equipments" items="{/Equipments}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{ID}" />\
	</ColumnListItem>\
</Table>\
<VBox id="employeeDetails"\
		binding="{path : \'EQUIPMENT_2_EMPLOYEE\', parameters : {$$updateGroupId : \'foo\'\}}">\
	<Input id="employeeName" value="{Name}"/>\
</VBox>',
			that = this;

		this.expectRequest("Equipments?$select=Category,ID&$skip=0&$top=100", {
				value : [
					{"Category" : "Electronics", "ID" : 23},
					{"Category" : "Vehicle", "ID" : 42}
				]
			})
			.expectChange("id", ["23", "42"])
			.expectChange("employeeName");

		return this.createView(assert, sView, oModel).then(function () {
			oContext0 = that.oView.byId("equipments").getItems()[0].getBindingContext();

			that.expectRequest("Equipments(Category='Electronics',ID=23)/EQUIPMENT_2_EMPLOYEE?"
					+ "$select=ID,Name", {
					"ID" : "1",
					"Name" : "John Smith"
				})
				.expectChange("employeeName", "John Smith");

			// select the first row in the equipments table
			that.oView.byId("employeeDetails").setBindingContext(oContext0);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("employeeName", "Peter Burke");

			// change the name of the employee
			that.oView.byId("employeeName").getBinding("value").setValue("Peter Burke");

			assert.ok(oContext0.hasPendingChanges());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("employeeName", null);

			that.oView.byId("employeeDetails").setBindingContext(null);

			assert.ok(oContext0.hasPendingChanges());
			assert.throws(function () {
				oContext0.refresh();
			}, /Cannot refresh entity due to pending changes:/);

			//TODO: hasPendingChanges on binding will be fixed with CPOUI5UISERVICESV3-1701
//			assert.ok(that.oView.byId("equipments").getBinding("items").hasPendingChanges());

			return that.waitForChanges(assert);
		}).then(function () {
			oContext1 = that.oView.byId("equipments").getItems()[1].getBindingContext();

			that.expectRequest("Equipments(Category='Vehicle',ID=42)/EQUIPMENT_2_EMPLOYEE?"
					+ "$select=ID,Name", {
					"ID" : "2",
					"Name" : "Frederic Fall"
				})
				.expectChange("employeeName", "Frederic Fall");

			// select the second row in the equipments table
			that.oView.byId("employeeDetails").setBindingContext(oContext1);

			// code under test
			assert.ok(that.oView.byId("equipments").getBinding("items").hasPendingChanges());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("Equipments(Category='Vehicle',ID=42)?$select=Category,ID", {
					"Category" : "Vehicle",
					"ID" : 42
				})
				.expectRequest("Equipments(Category='Vehicle',ID=42)/EQUIPMENT_2_EMPLOYEE?"
					+ "$select=ID,Name", {
					"ID" : "2",
					"Name" : "Frederic Fall"
				});

			// refresh the second row in the equipments table
			oContext1.refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("employeeName", "Peter Burke");

			// select the first row in the equipments table
			that.oView.byId("employeeDetails").setBindingContext(oContext0);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete an entity with messages from an ODataListBinding
	QUnit.test("Delete an entity with messages from an ODataListBinding", function (assert) {
		var oDeleteMessage = {
				code : "top",
				message : "Error occurred while processing the request",
				persistent : true,
				target : "/EMPLOYEES('1')",
				technical : true,
				type : "Error"
			},
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			oReadMessage = {
				"code" : "1",
				"message" : "Text",
				"persistent" : false,
				"target" : "/EMPLOYEES('1')/Name",
				"type" : "Warning"
			},
			sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\', \
		parameters : {$select : \'__CT__FAKE__Message/__FAKE__Messages\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="name" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("EMPLOYEES?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages"
				+ "&$skip=0&$top=100", {
				"value" : [{
					"ID" : "1",
					"Name" : "Jonathan Smith",
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [{
							"code" : "1",
							"message" : "Text",
							"numericSeverity" : 3,
							"target" : "Name",
							"transition" : false
						}]
					}
				}, {
					"ID" : "2",
					"Name" : "Frederic Fall",
					"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
				}]
			})
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"])
			.expectMessages([oReadMessage]);

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("table").getItems()[0].getBindingContext(),
				oError = new Error("Deletion failed");

			oError.error = {
				"code" : "top",
				"message" : "Error occurred while processing the request",
				"target" : ""
			};
			that.oLogMock.expects("error")
				.withExactArgs("Failed to delete /EMPLOYEES('1')[0]", sinon.match(oError.message),
					"sap.ui.model.odata.v4.Context");
			that.expectRequest({method : "DELETE", url : "EMPLOYEES('1')"}, oError)
				.expectMessages([oReadMessage, oDeleteMessage]);

			return Promise.all([
				// code under test
				oContext.delete().catch(function () {}),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			var oContext = that.oView.byId("table").getItems()[0].getBindingContext();

			that.expectRequest({
					method : "DELETE",
					url : "EMPLOYEES('1')"
				})
				.expectChange("name", ["Frederic Fall"])
				.expectMessages([oDeleteMessage]);

			return Promise.all([
				// code under test
				oContext.delete(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete an entity with messages from an ODataContextBinding
	QUnit.test("Delete an entity with messages from an ODataContextBinding", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="form" binding="{path : \'/EMPLOYEES(\\\'2\\\')\', \
	parameters : {$select : \'__CT__FAKE__Message/__FAKE__Messages\'}}">\
	<Text id="text" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('2')?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages", {
				"ID" : "1",
				"Name" : "Jonathan Smith",
				"__CT__FAKE__Message" : {
					"__FAKE__Messages" : [{
						"code" : "1",
						"message" : "Text",
						"numericSeverity" : 3,
						"target" : "Name",
						"transition" : false
					}]
				}
			})
			.expectChange("text", "Jonathan Smith")
			.expectMessages([{
				"code" : "1",
				"message" : "Text",
				"persistent" : false,
				"target" : "/EMPLOYEES('2')/Name",
				"type" : "Warning"
			}]);

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("form").getBindingContext();

			that.expectRequest({
					method : "DELETE",
					url : "EMPLOYEES('2')"
				})
				.expectChange("text", null)
				.expectMessages([]);

			return Promise.all([
				// code under test
				oContext.delete(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete an entity with messages from an relative ODLB w/o cache
	QUnit.test("Delete an entity with messages from an relative ODLB w/o cache", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox id="detail" binding="{/TEAMS(\'TEAM_01\')}">\
	<Text id="Team_Id" text="{Team_Id}" />\
	<Table id="table" items="{path : \'TEAM_2_EMPLOYEES\', \
			parameters : {$select : \'__CT__FAKE__Message/__FAKE__Messages\'}}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="name" text="{Name}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS('TEAM_01')?$select=Team_Id"
				+ "&$expand=TEAM_2_EMPLOYEES($select=ID,Name,"
				+ "__CT__FAKE__Message/__FAKE__Messages)", {
				"Team_Id" : "TEAM_01",
				"TEAM_2_EMPLOYEES" : [{
					"ID" : "1",
					"Name" : "Jonathan Smith",
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [{
							"code" : "1",
							"message" : "Text",
							"numericSeverity" : 3,
							"target" : "Name",
							"transition" : false
						}]
					}
				}, {
					"ID" : "2",
					"Name" : "Frederic Fall",
					"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
				}]
			})
			.expectChange("Team_Id", "TEAM_01")
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"])
			.expectMessages([{
				"code" : "1",
				"message" : "Text",
				"persistent" : false,
				"target" : "/TEAMS('TEAM_01')/TEAM_2_EMPLOYEES('1')/Name",
				"type" : "Warning"
			}]);

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("table").getItems()[0].getBindingContext();

			that.expectRequest({
					method : "DELETE",
					url : "EMPLOYEES('1')"
				})
				.expectChange("name", ["Frederic Fall"])
				.expectMessages([]);

			return Promise.all([
				// code under test
				oContext.delete(),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete an entity from a relative ODLB with pending changes (POST) in siblings
	// CPOUI5UISERVICESV3-1799
	QUnit.test("Delete entity from rel. ODLB with pending changes in siblings", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true, updateGroupId : "update"}),
			sView = '\
<FlexBox id="detail" binding="{/TEAMS(\'TEAM_01\')}">\
	<Text id="Team_Id" text="{Team_Id}"/>\
	<Table id="table" items="{TEAM_2_EMPLOYEES}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="name" text="{Name}"/>\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest("TEAMS('TEAM_01')?$select=Team_Id"
				+ "&$expand=TEAM_2_EMPLOYEES($select=ID,Name)", {
				"Team_Id" : "TEAM_01",
				"TEAM_2_EMPLOYEES" : [{
					"ID" : "1",
					"Name" : "Jonathan Smith"
				}, {
					"ID" : "2",
					"Name" : "Frederic Fall"
				}]
			})
			.expectChange("Team_Id", "TEAM_01")
			.expectChange("name", ["Jonathan Smith", "Frederic Fall"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectChange("name", ["John Doe", "Jonathan Smith", "Frederic Fall"]);

			that.oView.byId("table").getBinding("items").create({Name : "John Doe"});

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest({
					method : "DELETE",
					url : "EMPLOYEES('1')"
				})
				.expectChange("name", "Frederic Fall", 1);

			return Promise.all([
				// code under test
				that.oView.byId("table").getItems()[1].getBindingContext().delete("$auto"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Delete an entity with messages from a relative ODataContextBinding w/o cache
	QUnit.test("Delete an entity with messages from a relative ODCB w/o cache", function (assert) {
		var oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Equipments(Category=\'foo\',ID=\'0815\')}">\
	<FlexBox id="form" binding="{path : \'EQUIPMENT_2_EMPLOYEE\', \
		parameters : {$select : \'__CT__FAKE__Message/__FAKE__Messages\'}}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="text" text="{Name}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("Equipments(Category='foo',ID='0815')?$select=Category,ID&"
				+ "$expand=EQUIPMENT_2_EMPLOYEE($select=ID,Name,"
				+ "__CT__FAKE__Message/__FAKE__Messages)", {
				"Category" : "foo",
				"ID" : "0815",
				"EQUIPMENT_2_EMPLOYEE" : {
					"ID" : "1",
					"Name" : "Jonathan Smith",
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [{
							"code" : "1",
							"message" : "Text",
							"numericSeverity" : 3,
							"target" : "Name",
							"transition" : false
						}]
					}
				}
			})
			.expectChange("text", "Jonathan Smith")
			.expectMessages([{
				"code" : "1",
				"message" : "Text",
				"persistent" : false,
				"target" : "/Equipments(Category='foo',ID='0815')/EQUIPMENT_2_EMPLOYEE/Name",
				"type" : "Warning"
			}]);

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("form").getBindingContext();

			that.expectRequest({
					method : "DELETE",
					url : "EMPLOYEES('1')"
				})
				.expectChange("text", null)
				.expectMessages([]);

			// code under test
			return oContext.delete().then(function () {
				// Wait for the delete first, because it immediately clears the field and then the
				// messages are checked before the response can remove.
				that.waitForChanges(assert);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Update property within an absolute binding and get bound messages in response
	QUnit.test("Update property (in absolute binding), getting bound messages", function (assert) {
		var oBinding,
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{path : \'/EMPLOYEES(\\\'1\\\')\', \
		parameters : {\
			$select : \'__CT__FAKE__Message/__FAKE__Messages\',\
			$$updateGroupId : \'foo\'\
		}}" id="form">\
	<Text id="id" text="{ID}" />\
	<Input id="name" value="{Name}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('1')?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages", {
				"ID" : "1",
				"Name" : "Jonathan Smith",
				"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
			})
			.expectChange("id", "1")
			.expectChange("name", "Jonathan Smith");

		return this.createView(assert, sView, oModel).then(function () {
			oBinding = that.oView.byId("name").getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "EMPLOYEES('1')",
					payload : {"Name" : ""}
				}, {
					"ID" : "1",
					"Name" : "",
					// unrealistic scenario for OData V4.0 because a PATCH request does not contain
					// selects and Gateway will not return message properties; OData 4.01 feature;
					// if other server implementations send messages, process them anyway
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [{
							"code" : "1",
							"message" : "Enter a name",
							"numericSeverity" : 3,
							"target" : "Name",
							"transition" : false
						}]
					}
				})
				.expectChange("name", "") // triggered by setValue
				.expectMessages([{
					"code" : "1",
					"message" : "Enter a name",
					"persistent" : false,
					"target" : "/EMPLOYEES('1')/Name",
					"type" : "Warning"
				}]);

			// code under test
			oBinding.setValue("");

			return Promise.all([
				oModel.submitBatch("foo"),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest({
					method : "PATCH",
					url : "EMPLOYEES('1')",
					payload : {"Name" : "Hugo"}
				}, {
					"ID" : "1",
					"Name" : "Hugo",
					"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
				})
				.expectChange("name", "Hugo") // triggered by setValue
				.expectMessages([]);

			// code under test
			oBinding.setValue("Hugo");

			return Promise.all([
				oModel.submitBatch("foo"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Update property within a relative binding and get bound messages in response
	QUnit.test("Update property (in relative binding), getting bound messages", function (assert) {
		var oBinding,
			oContext,
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			sPathToMessages = "TEAM_2_EMPLOYEES('1')/__CT__FAKE__Message/__FAKE__Messages",
			sView = '\
<FlexBox binding="{path : \'/TEAMS(\\\'TEAM_01\\\')\', \
		parameters : {\
			$expand : {\
				\'TEAM_2_EMPLOYEES\' : {\
					$select : \'__CT__FAKE__Message/__FAKE__Messages\'\
				}\
			},\
			$$updateGroupId : \'foo\'\
		}}" id="form">\
	<Text id="teamId" text="{Team_Id}" />\
	<Table id="table" items="{TEAM_2_EMPLOYEES}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Input id="name" value="{Name}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
			that = this;

		this.expectRequest(
			"TEAMS('TEAM_01')?"
				+ "$expand=TEAM_2_EMPLOYEES($select=ID,Name,__CT__FAKE__Message/__FAKE__Messages)"
				+ "&$select=Team_Id", {
				"Team_Id" : "TEAM_01",
				"TEAM_2_EMPLOYEES" : [{
					"ID" : "1",
					"Name" : "Jonathan Smith",
					"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
				}]
			})
			.expectChange("teamId", "TEAM_01")
			.expectChange("name", ["Jonathan Smith"])
			.expectMessages([]);

		return this.createView(assert, sView, oModel).then(function () {
			oBinding = that.oView.byId("table").getItems()[0].getCells()[0].getBinding("value");
			oContext = that.oView.byId("form").getBindingContext();

			that.expectRequest({
					method : "PATCH",
					url : "EMPLOYEES('1')",
					payload : {"Name" : ""}
				}, {
					"ID" : "1",
					"Name" : "",
					// unrealistic scenario for OData V4.0 because a PATCH request does not contain
					// selects and Gateway will not return message properties; OData 4.01 feature;
					// if other server implementations send messages, process them anyway
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [{
							"code" : "1",
							"message" : "Enter a name",
							"numericSeverity" : 3,
							"target" : "Name",
							"transition" : false
						}]
					}
				})
				.expectChange("name", "", 0) // triggered by setValue
				.expectMessages([{
					"code" : "1",
					"message" : "Enter a name",
					"persistent" : false,
					"target" : "/TEAMS('TEAM_01')/TEAM_2_EMPLOYEES('1')/Name",
					"type" : "Warning"
				}]);

			// there are no messages for employee 1
			assert.strictEqual(oContext.getObject(sPathToMessages).length, 0);
			assert.strictEqual(oContext.getObject(sPathToMessages + "/$count"), 0);

			// code under test
			oBinding.setValue("");

			return Promise.all([
				oModel.submitBatch("foo"),
				that.waitForChanges(assert)
			]).then(function () {
				// after the patch there is one message for employee 1
				assert.strictEqual(oContext.getObject(sPathToMessages).length, 1);
				assert.strictEqual(oContext.getObject(sPathToMessages)[0].message, "Enter a name");
				assert.strictEqual(oContext.getObject(sPathToMessages + "/$count"), 1);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Update property within an entity in a collection and get bound messages in response
	QUnit.test("Update property (in collection), getting bound messages", function (assert) {
		var oBinding,
			oModel = createTeaBusiModel({autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/EMPLOYEES\', \
		parameters : {\
			$select : \'__CT__FAKE__Message/__FAKE__Messages\',\
			$$updateGroupId : \'foo\'\
		}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Input id="name" value="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest(
			"EMPLOYEES?$select=ID,Name,__CT__FAKE__Message/__FAKE__Messages&$skip=0&$top=100", {
				value : [{
					"ID" : "1",
					"Name" : "Jonathan Smith",
					"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
				}]
			})
			.expectChange("name", ["Jonathan Smith"])
			.expectMessages([]);

		return this.createView(assert, sView, oModel).then(function () {
			oBinding = that.oView.byId("table").getItems()[0].getCells()[0].getBinding("value");

			that.expectRequest({
					method : "PATCH",
					url : "EMPLOYEES('1')",
					payload : {"Name" : ""}
				}, {
					"ID" : "1",
					"Name" : "",
					// unrealistic scenario for OData V4.0 because a PATCH request does not contain
					// selects and Gateway will not return message properties; OData 4.01 feature;
					// if other server implementations send messages, process them anyway
					"__CT__FAKE__Message" : {
						"__FAKE__Messages" : [{
							"code" : "1",
							"message" : "Enter a name",
							"numericSeverity" : 3,
							"target" : "Name",
							"transition" : false
						}]
					}
				})
				.expectChange("name", "", 0) // triggered by setValue
				.expectMessages([{
					"code" : "1",
					"message" : "Enter a name",
					"persistent" : false,
					"target" : "/EMPLOYEES('1')/Name",
					"type" : "Warning"
				}]);

			// code under test
			oBinding.setValue("");

			return Promise.all([
				oModel.submitBatch("foo"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Modify a property without side effects, i.e. the PATCH request's response is
	// ignored; read the side effects later on via API Context#requestSideEffects and check that the
	// corresponding fields on the UI change. This must work the same way if a first PATCH/GET
	// $batch fails.
	QUnit.test("$$patchWithoutSideEffects, then requestSideEffects", function (assert) {
		var oModel = createModel(sSalesOrderService + "?sap-client=123", {
				autoExpandSelect : true,
				groupId : "$direct", // GET should not count for batchNo
				updateGroupId : "update"
			}),
			sView = '\
<FlexBox binding="{\
			path : \'/SalesOrderList(\\\'42\\\')\',\
			parameters : {$$patchWithoutSideEffects : true}\
		}"\
		id="form">\
	<Input id="netAmount" value="{NetAmount}"/>\
	<Text id="grossAmount" text="{GrossAmount}"/>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList('42')?sap-client=123"
					+ "&$select=GrossAmount,NetAmount,SalesOrderID", {
				"@odata.etag" : "ETag0",
				"GrossAmount" : "119.00",
				"NetAmount" : "100.00"
//				"SalesOrderID" : "42"
			})
			.expectChange("netAmount", "100.00")
			.expectChange("grossAmount", "119.00");

		return this.createView(assert, sView, oModel).then(function () {
			var oError = new Error("This request intentionally failed"),
				oPromise;

			oError.errorResponse = {
				headers : {
					"Content-Type" : "application/json;odata.metadata=minimal;charset=utf-8"
				},
				responseText : '{"error":{"code":"CODE","message":"Value -1 not allowed"}}',
				status : 400,
				statusText : "Bad Request"
			};
			// don't care about other parameters
			that.oLogMock.expects("error")
				.withArgs("Failed to update path /SalesOrderList('42')/NetAmount");
			that.oLogMock.expects("error")
				.withArgs("Failed to request side effects");

			that.expectChange("netAmount", "-1.00")
				.expectRequest({
					batchNo : 1,
					method : "PATCH",
					url : "SalesOrderList('42')?sap-client=123",
					headers : {"If-Match" : "ETag0"},
					payload : {"NetAmount" : "-1"}
				}, oError)
				.expectRequest({
					batchNo : 1,
					method : "GET",
					url : "SalesOrderList('42')?sap-client=123&$select=GrossAmount"
				}, /*not relevant as $batch uses oError.errorResponse for response*/undefined)
				.expectMessages([{
					"code" : "CODE",
					"descriptionUrl" : undefined,
					"message" : "Value -1 not allowed",
					"persistent" : true,
					"target" : "",
					"technical" : true,
					"type" : "Error"
				}, {
					"code" : undefined,
					"descriptionUrl" : undefined,
					"message"
						: "HTTP request was not processed because the previous request failed",
					"persistent" : true,
					"target" : "",
					"technical" : true,
					"type" : "Error"
				}]);

			that.oView.byId("netAmount").getBinding("value").setValue("-1");

			// code under test
			oPromise = that.oView.byId("form").getBindingContext().requestSideEffects([{
				$PropertyPath : "GrossAmount"
			}]).catch(function (oError0) {
				assert.strictEqual(oError0.message,
					"HTTP request was not processed because the previous request failed");
			});

			return Promise.all([
					oPromise,
					oModel.submitBatch("update"),
					that.waitForChanges(assert)
				]);
		}).then(function () {
			// remove persistent, technical messages from above
			sap.ui.getCore().getMessageManager().removeAllMessages();

			that.expectMessages([]);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("netAmount", "200.00")
				.expectRequest({
					batchNo : 2,
					method : "PATCH",
					url : "SalesOrderList('42')?sap-client=123",
					headers : {"If-Match" : "ETag0"},
					payload : {"NetAmount" : "200"}
				}, {
					"@odata.etag" : "ETag1",
					"GrossAmount" : "238.00", // side effect
					"NetAmount" : "200.00" // "side effect": decimal places added
//					"SalesOrderID" : "42"
				});

			that.oView.byId("netAmount").getBinding("value").setValue("200");

			return Promise.all([
					oModel.submitBatch("update"),
					that.waitForChanges(assert)
				]);
		}).then(function () {
			var oPromise;

			that.expectChange("netAmount", "0.00"); // external value: 200.00 -> 0.00

			that.oView.byId("netAmount").getBinding("value").setValue("0");

			// code under test
			oPromise = that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "NetAmount" // order MUST not matter
				}, {
					$PropertyPath : "GrossAmount"
				}, {
					$PropertyPath : "TaxAmount" // must be ignored due to intersection
				}]).then(function (vResult) {
					assert.strictEqual(vResult, undefined);
				});

			that.expectRequest({
					batchNo : 3,
					method : "PATCH",
					url : "SalesOrderList('42')?sap-client=123",
					headers : {"If-Match" : "ETag1"}, // new ETag is used!
					payload : {"NetAmount" : "0"}
				}, {
//					"@odata.etag" : "ETag2", // not ignored, but unused by the rest of this test
					"GrossAmount" : "0.00", // side effect
					"NetAmount" : "0.00", // "side effect": decimal places added
					"Messages" : [{ // "side effect": ignored by $$patchWithoutSideEffects
						"code" : "n/a",
						"message" : "n/a",
						"numericSeverity" : 3,
						"target" : "NetAmount"
					}]
//					"SalesOrderID" : "42"
				})
				.expectRequest({
					batchNo : 3,
					method : "GET",
					url : "SalesOrderList('42')?sap-client=123&$select=GrossAmount,NetAmount"
				}, {
//					"@odata.etag" : "ETag2",
					"GrossAmount" : "0.00", // side effect
					"NetAmount" : "0.00", // "side effect": decimal places added
					"Messages" : [{ // side effect: reported, even if not selected
						"code" : "23",
						"message" : "Enter a minimum amount of 1",
						"numericSeverity" : 3,
						"target" : "NetAmount"
					}]
				})
				.expectChange("grossAmount", "0.00")
				.expectChange("netAmount", "0.00") // internal value has changed: 0 -> 0.00
				.expectMessages([{
					"code" : "23",
					"message" : "Enter a minimum amount of 1",
					"persistent" : false,
					"target" : "/SalesOrderList('42')/NetAmount",
					"technical" : false,
					"type" : "Warning"
				}]);

			return Promise.all([
				oModel.submitBatch("update"),
				oPromise,
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "TaxAmount" // must be ignored due to intersection
				}]), // no GET request, no issue with locks!
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Modify a property within a list binding with $$patchWithoutSideEffects, then modify
	// in a context binding that inherits the parameter
	// CPOUI5UISERVICESV3-1684
	QUnit.test("$$patchWithoutSideEffects in list binding and inherited", function (assert) {
		var oModel = createModel(sSalesOrderService, {autoExpandSelect : true}),
			sView = '\
<Table id="table" items="{path : \'/SalesOrderList\',\
		parameters : {$$patchWithoutSideEffects : true}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Input id="listNote" value="{Note}" />\
	</ColumnListItem>\
</Table>\
<FlexBox id="form" binding="{path : \'\', parameters : {$$ownRequest : true}}">\
	<Input id="formNote" value="{Note}"/>\
</FlexBox>',
			that = this;

		this.expectRequest("SalesOrderList?$select=Note,SalesOrderID&$skip=0&$top=100", {
				"value" : [{
					"@odata.etag" : "ETag0",
					"Note" : "Note",
					"SalesOrderID" : "42"
				}]
			})
			.expectChange("listNote", ["Note"])
			.expectChange("formNote");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectChange("listNote", ["Note (entered)"])
				.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag0"},
					payload : {"Note" : "Note (entered)"}
				}, {
					"@odata.etag" : "ETag1",
					"Note" : "Note (from server)", // side effect
					"SalesOrderID" : "42"
				});

			that.oView.byId("table").getItems()[0].getCells()[0].getBinding("value")
				.setValue("Note (entered)");

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("SalesOrderList('42')?$select=Note,SalesOrderID", {
					"@odata.etag" : "ETag1",
					"Note" : "Note (from server)",
					"SalesOrderID" : "42"
				})
				.expectChange("formNote", "Note (from server)");

			that.oView.byId("form").setBindingContext(
				that.oView.byId("table").getBinding("items").getCurrentContexts()[0]
			);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectChange("formNote", "Note (entered)")
				.expectRequest({
					method : "PATCH",
					url : "SalesOrderList('42')",
					headers : {"If-Match" : "ETag1"},
					payload : {"Note" : "Note (entered)"}
				}, {
					"@odata.etag" : "ETag2",
					"Note" : "Note (from server)", // side effect
					"SalesOrderID" : "42"
				});

			that.oView.byId("formNote").getBinding("value").setValue("Note (entered)");

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Read side effects which include navigation properties while there are pending
	// changes.
	QUnit.test("requestSideEffects with navigation properties", function (assert) {
		var oModel = createSpecialCasesModel({
				autoExpandSelect : true,
				groupId : "$direct", // GET should not count for batchNo
				updateGroupId : "update"
			}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}" id="form">\
	<Input id="id" value="{ArtistID}" />\
	<Text id="inProcessByUser" text="{DraftAdministrativeData/InProcessByUser}" />\
	<Text binding="{DraftAdministrativeData}" id="inProcessByUser2" text="{InProcessByUser}" />\
</FlexBox>',
			that = this;

		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?$select=ArtistID,IsActiveEntity"
				+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)", {
				"@odata.etag" : "ETag0",
				"ArtistID" : "42",
				"DraftAdministrativeData" : {
					"DraftID" : "23",
					"InProcessByUser" : "foo"
				}
//				"IsActiveEntity" : true
			})
			.expectChange("id", "42")
			.expectChange("inProcessByUser", "foo")
			.expectChange("inProcessByUser2", "foo");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectChange("id", "TAFKAP");

			that.oView.byId("id").getBinding("value").setValue("TAFKAP");

			that.expectRequest({
					batchNo : 1,
					method : "PATCH",
					url : "Artists(ArtistID='42',IsActiveEntity=true)",
					headers : {"If-Match" : "ETag0"},
					payload : {"ArtistID" : "TAFKAP"}
				}, {/* response does not matter here */})
				.expectRequest({
					batchNo : 1,
					method : "GET",
					url : "Artists(ArtistID='42',IsActiveEntity=true)"
						+ "?$select=DraftAdministrativeData"
						+ "&$expand=DraftAdministrativeData($select=InProcessByUser)"
				}, {
					"DraftAdministrativeData" : {
						"InProcessByUser" : "bar"
					}
				})
				.expectChange("inProcessByUser", "bar")
				.expectChange("inProcessByUser2", "bar");

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "DraftAdministrativeData/InProcessByUser"
				}]),
				oModel.submitBatch("update"),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Read side effects via $NavigationPropertyPath. The dependent binding must be
	// refreshed.
	QUnit.test("requestSideEffects with $NavigationPropertyPath", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}" id="form">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{}" id="section">\
		<Text binding="{path : \'DraftAdministrativeData\', parameters : {$$ownRequest : true}}"\
			id="inProcessByUser" text="{InProcessByUser}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/DraftAdministrativeData"
				+ "?$select=DraftID,InProcessByUser", {
//				"DraftID" : "23",
				"InProcessByUser" : "foo"
			})
			.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?$select=ArtistID,IsActiveEntity", {
				"ArtistID" : "42"
//				"IsActiveEntity" : true
			})
			.expectChange("id", "42")
			.expectChange("inProcessByUser", "foo");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
					+ "?$select=ArtistID,IsActiveEntity", {
					"ArtistID" : "42"
//					"IsActiveEntity" : true
				})
				.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/DraftAdministrativeData"
					+ "?$select=DraftID,InProcessByUser", {
//					"DraftID" : "23",
					"InProcessByUser" : "bar"
				})
				.expectChange("id", "42") //TODO @see CPOUI5UISERVICESV3-1572
				.expectChange("inProcessByUser", "bar");

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$NavigationPropertyPath : ""
				}, { // Note: this makes no difference, "" wins
					$NavigationPropertyPath : "DraftAdministrativeData"
				}]),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/DraftAdministrativeData"
					+ "?$select=DraftID,InProcessByUser", {
//					"DraftID" : "23",
					"InProcessByUser" : "foo"
				})
				.expectChange("inProcessByUser", "foo");

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$NavigationPropertyPath : "DraftAdministrativeData"
				}]),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: read side effects which affect dependent bindings.
	QUnit.test("requestSideEffects: dependent bindings #1", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}" id="form">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{}" id="section">\
		<Text binding="{\
				path : \'DraftAdministrativeData\',\
				parameters : {$$ownRequest : true}\
			}" id="inProcessByUser" text="{InProcessByUser}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/DraftAdministrativeData"
				+ "?$select=DraftID,InProcessByUser", {
				"DraftID" : "23",
				"InProcessByUser" : "foo"
			})
			.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?$select=ArtistID,IsActiveEntity", {
				"ArtistID" : "42"
//				"IsActiveEntity" : true
			})
			.expectChange("id", "42")
			.expectChange("inProcessByUser", "foo");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/DraftAdministrativeData"
					+ "?$select=InProcessByUser", {
					"InProcessByUser" : "bar"
				})
				.expectChange("inProcessByUser", "bar");

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "DraftAdministrativeData/InProcessByUser"
				}]),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: read side effects which affect dependent bindings; add some unnecessary context
	// bindings
	QUnit.test("requestSideEffects: dependent bindings #2", function (assert) {
		var sDraftAdministrativeData = "Artists(ArtistID='42',IsActiveEntity=true)"
				+ "/BestFriend/BestFriend/DraftAdministrativeData",
			oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}" id="form">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{BestFriend}" id="section">\
		<FlexBox binding="{BestFriend}" id="section2">\
			<Text binding="{\
					path : \'DraftAdministrativeData\',\
					parameters : {$$ownRequest : true}\
				}" id="inProcessByUser" text="{InProcessByUser}" />\
		</FlexBox>\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest(sDraftAdministrativeData + "?$select=DraftID,InProcessByUser", {
				"DraftID" : "23",
				"InProcessByUser" : "foo"
			})
			.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?$select=ArtistID,IsActiveEntity"
				//TODO CPOUI5UISERVICESV3-1677: Avoid unnecessary $expand
				+ "&$expand=BestFriend($select=ArtistID,IsActiveEntity"
					+ ";$expand=BestFriend($select=ArtistID,IsActiveEntity))", {
				"ArtistID" : "42"
//				"IsActiveEntity" : true
			})
			.expectChange("id", "42")
			.expectChange("inProcessByUser", "foo");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest(sDraftAdministrativeData + "?$select=InProcessByUser", {
					"InProcessByUser" : "bar"
				})
				.expectChange("inProcessByUser", "bar");

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "BestFriend/BestFriend/DraftAdministrativeData/InProcessByUser"
				}]),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: read side effects which affect dependent bindings; add some unnecessary context
	// bindings
	//TODO Enable autoExpandSelect once CPOUI5UISERVICESV3-1677 has been solved!
	QUnit.test("requestSideEffects: dependent bindings #3", function (assert) {
		var sDraftAdministrativeData = "Artists(ArtistID='42',IsActiveEntity=true)"
				+ "/BestFriend/_Friend(ArtistID='42',IsActiveEntity=true)/DraftAdministrativeData",
			oModel = createSpecialCasesModel({autoExpandSelect : false}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}" id="form">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{BestFriend}" id="section">\
		<FlexBox binding="{_Friend(ArtistID=\'42\',IsActiveEntity=true)}" id="section2">\
			<Text binding="{\
					path : \'DraftAdministrativeData\',\
					parameters : {$$ownRequest : true}\
				}" id="inProcessByUser" text="{InProcessByUser}" />\
		</FlexBox>\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				/*+ "?$select=ArtistID,IsActiveEntity"*/, {
				"ArtistID" : "42"
//				"IsActiveEntity" : true
			})
			.expectRequest(sDraftAdministrativeData/* + "?$select=DraftID,InProcessByUser"*/, {
				"DraftID" : "23",
				"InProcessByUser" : "foo"
			})
			.expectChange("id", "42")
			.expectChange("inProcessByUser", "foo");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest(sDraftAdministrativeData + "?$select=InProcessByUser", {
					"InProcessByUser" : "bar"
				})
				.expectChange("inProcessByUser", "bar");

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "BestFriend/_Friend/DraftAdministrativeData/InProcessByUser"
				}]),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Read side effects via collection-valued $NavigationPropertyPath.
	// There is a child binding w/o own cache for the collection-valued navigation property affected
	// by the side effect; the whole collection is refreshed using $expand; eventing is OK to update
	// the UI.
	// Note: This works the same with a grid table, except for CPOUI5UISERVICESV3-1685.
	[false, true].forEach(function (bGrowing) {
		var sTitle = "requestSideEffects with collection-valued navigation; growing = " + bGrowing;

		QUnit.test(sTitle, function (assert) {
			var oModel = createSpecialCasesModel({autoExpandSelect : true}),
				sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}" id="form">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{BestFriend}" id="section">\
		<Table growing="' + bGrowing + '" id="table" items="{_Publication}">\
			<columns><Column/></columns>\
			<ColumnListItem>\
				<Text id="price" text="{Price}" />\
			</ColumnListItem>\
		</Table>\
	</FlexBox>\
</FlexBox>',
				that = this;

			this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
					+ "?$select=ArtistID,IsActiveEntity"
					+ "&$expand=BestFriend($select=ArtistID,IsActiveEntity"
						+ ";$expand=_Publication($select=Price,PublicationID))", {
					"ArtistID" : "42",
//					"IsActiveEntity" : true,
					"BestFriend" : {
						"ArtistID" : "23",
//						"IsActiveEntity" : true,
						"_Publication" : [{
							"Price" : "9.99"
//							"PublicationID" "42-0":
						}]
					}
				})
				.expectChange("id", "42")
				.expectChange("price", ["9.99"]);

			return this.createView(assert, sView, oModel).then(function () {
				that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)?$select=BestFriend"
						+ "&$expand=BestFriend($select=_Publication"
							+ ";$expand=_Publication($select=Price,PublicationID))", {
						"BestFriend" : {
							"_Publication" : [{
								"Price" : "7.77"
//								"PublicationID" "42-0":
							}]
						}
					})
					.expectChange("price", ["7.77"]);

				return Promise.all([
					// code under test
					that.oView.byId("form").getBindingContext().requestSideEffects([{
						$NavigationPropertyPath : "BestFriend/_Publication"
					}]),
					that.waitForChanges(assert)
				]);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Read side effects for a collection-valued navigation property where only a single
	// property is affected. There is a child binding with own cache for the collection affected
	// by the side effect; instead of refreshing the whole collection, an efficient request is sent.
	QUnit.test("requestSideEffects for a single property of a collection", function (assert) {
		var oModel = createModel("/special/cases/?sap-client=123", {autoExpandSelect : true}),
			sView = '\
<Text id="count" text="{$count}"/>\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}" id="form">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{BestFriend}" id="section">\
		<t:Table firstVisibleRow="1" id="table"\
				rows="{path : \'_Publication\', parameters : {$count : true,\
					$filter : \'CurrencyCode eq \\\'EUR\\\'\', $orderby : \'PublicationID\',\
					$$ownRequest : true}}"\
			threshold="0" visibleRowCount="2">\
			<t:Column>\
				<t:template>\
					<Text id="price" text="{Price}" />\
				</t:template>\
			</t:Column>\
			<t:Column>\
				<t:template>\
					<Text id="currency" text="{CurrencyCode}" />\
				</t:template>\
			</t:Column>\
			<t:Column>\
				<t:template>\
					<Text id="inProcessByUser" text="{DraftAdministrativeData/InProcessByUser}" />\
				</t:template>\
			</t:Column>\
			<t:Column>\
				<t:template>\
					<Text id="name" text="{_Artist/Name}" />\
				</t:template>\
			</t:Column>\
		</t:Table>\
	</FlexBox>\
</FlexBox>',
			that = this;

		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?sap-client=123&$select=ArtistID,IsActiveEntity"
				//TODO CPOUI5UISERVICESV3-1677: Avoid unnecessary $expand
				+ "&$expand=BestFriend($select=ArtistID,IsActiveEntity)", {
				"ArtistID" : "42"
//					"IsActiveEntity" : true
			})
			.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend/_Publication"
				+ "?sap-client=123&$count=true&$filter=CurrencyCode eq 'EUR'"
				+ "&$orderby=PublicationID&$select=CurrencyCode,Price,PublicationID"
				+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)"
				+ ",_Artist($select=ArtistID,IsActiveEntity,Name)&$skip=1&$top=2", {
				"@odata.count" : "10",
				value : [{
					"_Artist" : {
						"ArtistID" : "42",
//						"IsActiveEntity" : true,
						"Name" : "Hour Frustrated"
					},
					"CurrencyCode" : "EUR",
					"DraftAdministrativeData" : null,
					"Price" : "9.11", // Note: 9.ii for old value at index i, 7.ii for new value
					"PublicationID" : "42-1"
				}, {
					"_Artist" : null,
					"CurrencyCode" : "EUR",
					"DraftAdministrativeData" : null,
					"Price" : "9.22",
					"PublicationID" : "42-2"
				}]
			})
			.expectChange("count")
			.expectChange("id", "42")
			.expectChange("price", [, "9.11", "9.22"])
			.expectChange("currency", [, "EUR", "EUR"])
			.expectChange("inProcessByUser")
			.expectChange("name", [, "Hour Frustrated"]);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectChange("count", "10"); // must not be affected by side effects below!

			that.oView.byId("count").setBindingContext(
				that.oView.byId("table").getBinding("rows").getHeaderContext());

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend/_Publication"
					+ "?sap-client=123"
					+ "&$filter=PublicationID eq '42-1' or PublicationID eq '42-2'"
					+ "&$select=Price,PublicationID&$expand=_Artist($select=Name)", {
					value : [{
						"_Artist" : null, // side effect
						"Price" : "7.11", // side effect
						"PublicationID" : "42-1"
					}, {
						"_Artist" : { // side effect
							"ArtistID" : "42a",
//							"IsActiveEntity" : true,
							"Name" : "Minute Frustrated"
						},
						"Messages" : [{ // side effect: reported, even if not selected
							"code" : "23",
							"message" : "This looks pretty cheap now",
							"numericSeverity" : 2,
							"target" : "Price"
						}],
						"Price" : "7.22", // side effect
						"PublicationID" : "42-2"
					}]
				})
				.expectChange("price", "7.11", 1)
				.expectChange("price", "7.22", 2)
				.expectChange("name", null, 1)
				.expectChange("name", "Minute Frustrated", 2)
				.expectMessages([{
					"code" : "23",
					"message" : "This looks pretty cheap now",
					"persistent" : false,
					"target" : "/Artists(ArtistID='42',IsActiveEntity=true)/BestFriend"
						+ "/_Publication('42-2')/Price",
					"technical" : false,
					"type" : "Information"
				}]);

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "BestFriend/_Publication/Price"
				}, {
					$PropertyPath : "BestFriend/_Publication/_Artist/Name"
				}]),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend/_Publication"
					+ "?sap-client=123&$count=true&$filter=CurrencyCode eq 'EUR'"
					+ "&$orderby=PublicationID&$select=CurrencyCode,Price,PublicationID"
					+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)"
					+ ",_Artist($select=ArtistID,IsActiveEntity,Name)&$skip=7&$top=2", {
					"@odata.count" : "10",
					value : [{
						"_Artist" : null,
						"CurrencyCode" : "EUR",
						"DraftAdministrativeData" : null,
						"Price" : "7.77",
						"PublicationID" : "42-7"
					}, {
						"_Artist" : null,
						"CurrencyCode" : "EUR",
						"DraftAdministrativeData" : null,
						"Price" : "7.88",
						"PublicationID" : "42-8"
					}]
				})
				// "price" temporarily loses its binding context and thus fires a change event
				.expectChange("price", null, null)
				.expectChange("price", null, null)
				// "currency" temporarily loses its binding context and thus fires a change event
				.expectChange("currency", null, null)
				.expectChange("currency", null, null)
				// "name" temporarily loses its binding context and thus fires a change event
				.expectChange("name", null, null)
				.expectChange("price", "7.77", 7)
				.expectChange("price", "7.88", 8)
				.expectChange("currency", "EUR", 7)
				.expectChange("currency", "EUR", 8);

			that.oView.byId("table").setFirstVisibleRow(7);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend/_Publication"
					+ "?sap-client=123"
					+ "&$filter=PublicationID eq '42-7' or PublicationID eq '42-8'"
					+ "&$select=Price,PublicationID", {
					value : [{ // Note: different order than before!
						"Price" : "5.88", // side effect
						"PublicationID" : "42-8"
					}, {
						"Price" : "5.77", // side effect
						"PublicationID" : "42-7"
					}]
				})
				.expectChange("price", "5.77", 7)
				.expectChange("price", "5.88", 8);

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "BestFriend/_Publication/Price"
				}]),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend/_Publication"
					+ "?sap-client=123&$count=true&$filter=CurrencyCode eq 'EUR'"
					+ "&$orderby=PublicationID&$select=CurrencyCode,Price,PublicationID"
					+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)"
					+ ",_Artist($select=ArtistID,IsActiveEntity,Name)&$skip=1&$top=2", {
					"@odata.count" : "10",
					value : [{
						"_Artist" : null,
						"CurrencyCode" : "EUR",
						"DraftAdministrativeData" : null,
						"Price" : "5.11",
						"PublicationID" : "42-1"
					}, {
						"_Artist" : null,
						"CurrencyCode" : "EUR",
						"DraftAdministrativeData" : null,
						"Price" : "5.22",
						"PublicationID" : "42-2"
					}]
				})
				.expectChange("price", [, "5.11", "5.22"]);
				// Note: "currency" cells do not change

			// Note: invisible, cached data was not updated and thus must be read again
			that.oView.byId("table").setFirstVisibleRow(1);

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: Read side effects for a collection-valued navigation property where only a single
	// property is affected. There is a child binding with own cache for the collection affected
	// by the side effect; instead of refreshing the whole collection, an efficient request is sent.
	// Additionally, there are detail "views" (form and table) which send their own requests and are
	// affected by the side effect.
	QUnit.test("requestSideEffects: collection & master/detail", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}" id="form">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{BestFriend}" id="section">\
		<Table id="table" items="{path : \'_Publication\', parameters : {$$ownRequest : true}}">\
			<columns><Column/><Column/></columns>\
			<ColumnListItem>\
				<Text id="price" text="{Price}" />\
				<Text id="currency" text="{CurrencyCode}" />\
			</ColumnListItem>\
		</Table>\
	</FlexBox>\
</FlexBox>\
<FlexBox binding="{}" id="detail">\
	<Text id="priceDetail" text="{Price}" />\
	<Text id="currencyDetail" text="{CurrencyCode}" />\
	<Text id="inProcessByUser" text="{DraftAdministrativeData/InProcessByUser}" />\
</FlexBox>\
<Table id="detailTable" items="{_Artist/_Friend}">\
	<columns><Column/><Column/></columns>\
	<ColumnListItem>\
		<Text id="idDetail" text="{ArtistID}" />\
		<Text id="nameDetail" text="{Name}" />\
	</ColumnListItem>\
</Table>',
			that = this;

		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend/_Publication"
				+ "?$select=CurrencyCode,Price,PublicationID&$skip=0&$top=100", {
				value : [{
					"CurrencyCode" : "EUR",
					"Price" : "9.00", // Note: 9.ii for old value at index i, 7.ii for new value
					"PublicationID" : "42-0"
				}, {
					"CurrencyCode" : "EUR",
					"Price" : "9.11",
					"PublicationID" : "42-1"
				}]
			})
			.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?$select=ArtistID,IsActiveEntity"
				//TODO CPOUI5UISERVICESV3-1677: Avoid unnecessary $expand
				+ "&$expand=BestFriend($select=ArtistID,IsActiveEntity)", {
				"ArtistID" : "42"
//					"IsActiveEntity" : true
			})
			.expectChange("id", "42")
			.expectChange("price", ["9.00", "9.11"])
			.expectChange("currency", ["EUR", "EUR"])
			.expectChange("priceDetail")
			.expectChange("currencyDetail")
			.expectChange("inProcessByUser")
			.expectChange("idDetail", false)
			.expectChange("nameDetail", false);

		return this.createView(assert, sView, oModel).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend"
					+ "/_Publication('42-0')?$select=CurrencyCode,Price,PublicationID"
					+ "&$expand=DraftAdministrativeData($select=DraftID,InProcessByUser)", {
					"CurrencyCode" : "EUR",
					"DraftAdministrativeData" : {
						"DraftID" : "1",
						"InProcessByUser" : "JOHNDOE"
					},
					"Price" : "9.00",
					"PublicationID" : "42-0"
				})
				.expectChange("priceDetail", "9.00")
				.expectChange("currencyDetail", "EUR")
				.expectChange("inProcessByUser", "JOHNDOE");

			that.oView.byId("detail").setBindingContext(
				that.oView.byId("table").getBinding("items").getCurrentContexts()[0]);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend/_Publication"
					+ "?$select=Price,PublicationID"
					+ "&$filter=PublicationID eq '42-0' or PublicationID eq '42-1'", {
					value : [{
						"Price" : "7.11", // side effect
						"PublicationID" : "42-1"
					}, {
						"Price" : "7.00", // side effect
						"PublicationID" : "42-0"
					}]
				})
				.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend"
					+ "/_Publication('42-0')?$select=Price"
					+ "&$expand=DraftAdministrativeData($select=InProcessByUser)", {
					"DraftAdministrativeData" : {
						"InProcessByUser" : "JANEDOE"
					},
					"Price" : "7.00"
				})
				.expectChange("priceDetail", "7.00")
				.expectChange("inProcessByUser", "JANEDOE")
				.expectChange("price", ["7.00", "7.11"]);

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "BestFriend/_Publication/Price"
				}, {
					$PropertyPath : "BestFriend/_Publication/DraftAdministrativeData/InProcessByUser"
				}]),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend"
					+ "/_Publication('42-1')/_Artist/_Friend?$select=ArtistID,IsActiveEntity,Name"
					+ "&$skip=0&$top=100", {
					value : [{
						"ArtistID" : "0",
						"IsActiveEntity" : true,
						"Name" : "TAFKAP"
					}, {
						"ArtistID" : "1",
						"IsActiveEntity" : false,
						"Name" : "John & Jane"
					}]
				})
				.expectChange("idDetail", ["0", "1"])
				.expectChange("nameDetail", ["TAFKAP", "John & Jane"]);

			that.oView.byId("detailTable").setBindingContext(
				that.oView.byId("table").getBinding("items").getCurrentContexts()[1]);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)/BestFriend"
					+ "/_Publication('42-1')/_Artist/_Friend?$select=ArtistID,IsActiveEntity,Name"
					+ "&$filter=ArtistID eq '0' and IsActiveEntity eq true"
					+ " or ArtistID eq '1' and IsActiveEntity eq false", {
					value : [{
						"ArtistID" : "0",
						"IsActiveEntity" : true,
						"Name" : "TAFKAP (1)"
					}, {
						"ArtistID" : "1",
						"IsActiveEntity" : false,
						"Name" : "John | Jane"
					}]
				})
				.expectChange("nameDetail", ["TAFKAP (1)", "John | Jane"]);

			return Promise.all([
				// code under test
				that.oView.byId("form").getBindingContext().requestSideEffects([{
					$PropertyPath : "BestFriend/_Publication/_Artist/_Friend/Name"
				}]),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Automatic retry of failed PATCHes, along the lines of
	// MIT.SalesOrderCreateRelative.html, but with $auto group
	[function () {
		var oStatusBinding = this.oView.byId("status").getBinding("value");

		this.expectChange("status", "Busy")
			.expectRequest({
				method : "PATCH",
				url : "EMPLOYEES('3')",
				headers : {"If-Match" : "ETag0"},
				payload : {
					"ROOM_ID" : "42", // <-- retry
					"STATUS" : "Busy"
				}
			}, {/* don't care */});

		oStatusBinding.setValue("Busy"); // a different field is changed
	}, function () {
		var oRoomIdBinding = this.oView.byId("roomId").getBinding("value");

		this.expectChange("roomId", "23")
			.expectRequest({
				method : "PATCH",
				url : "EMPLOYEES('3')",
				headers : {"If-Match" : "ETag0"},
				payload : {
					"ROOM_ID" : "23" // <-- new change wins over retry
				}
			}, {/* don't care */});

		oRoomIdBinding.setValue("23"); // the same field is changed again
	}, function () {
		var sAction = "com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee",
			oRoomIdBinding = this.oView.byId("roomId").getBinding("value");

		this.expectRequest({
				method : "PATCH",
				url : "EMPLOYEES('3')",
				headers : {"If-Match" : "ETag0"},
				payload : {
					"ROOM_ID" : "42" // <-- retry
				}
			}, {/* don't care */})
			.expectRequest({
				method : "POST",
				headers : {"If-Match" : "ETag0"},
				url : "EMPLOYEES('3')/" + sAction,
				payload : {"TeamID" : "23"}
			}, {/* don't care */});

		// bound action also triggers retry
		return this.oModel.bindContext(sAction + "(...)", oRoomIdBinding.getContext())
			.setParameter("TeamID", "23")
			.execute("$auto");
//
// Note: "Cannot delete due to pending changes" --> this scenario is currently impossible
//
//	}, function () {
//		var oRoomIdBinding = this.oView.byId("roomId").getBinding("text");
//
//		this.expectRequest({
//				method : "PATCH",
//				url : "EMPLOYEES('3')",
//				headers : {"If-Match" : "ETag0"},
//				payload : {
//					"ROOM_ID" : "42" // <-- retry
//				}
//			}, {/* don't care */})
//			.expectRequest({
//				method : "DELETE",
//				url : "EMPLOYEES('3')",
//				headers : {"If-Match" : "ETag0"}
//			});
//
//		return oRoomIdBinding.getContext().delete(); // DELETE also triggers retry
	}].forEach(function (fnCodeUnderTest, i) {
		QUnit.test("Later retry failed PATCHes for $auto, " + i, function (assert) {
			var oModel = createTeaBusiModel({updateGroupId : "$auto"}),
				sView = '\
<FlexBox binding="{/EMPLOYEES(\'3\')}">\
	<Input id="roomId" value="{ROOM_ID}" />\
	<Input id="status" value="{STATUS}" />\
</FlexBox>',
				that = this;

			this.expectRequest("EMPLOYEES('3')", {
					"@odata.etag" : "ETag0",
					"ID" : "3",
					"ROOM_ID" : "2",
					"STATUS" : "Occupied"
				})
				.expectChange("roomId", "2")
				.expectChange("status", "Occupied");

			return this.createView(assert, sView, oModel).then(function () {
				var oRoomIdBinding = that.oView.byId("roomId").getBinding("value");

				that.expectChange("roomId", "42")
					.expectRequest({
						method : "PATCH",
						url : "EMPLOYEES('3')",
						headers : {"If-Match" : "ETag0"},
						payload : {
							"ROOM_ID" : "42"
						}
					}, new Error("500 Internal Server Error"))
					.expectMessages([{
						"code" : undefined,
						"message" : "500 Internal Server Error",
						"persistent" : true,
						"target" : "",
						"technical" : true,
						"type" : "Error"
					}, {
						"code" : undefined,
						"message" : "HTTP request was not processed because $batch failed",
						"persistent" : true,
						"target" : "",
						"technical" : true,
						"type" : "Error"
					}]);
				that.oLogMock.expects("error").twice(); // don't care about console here

				oRoomIdBinding.setValue("42");

				return that.waitForChanges(assert);
			}).then(function () {
				return Promise.all([
					fnCodeUnderTest.call(that),
					that.waitForChanges(assert)
				]);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Immediate retry of failed PATCHes; make sure that order is preserved
	["$auto", "group"].forEach(function (sUpdateGroupId) {
		QUnit.test("Immediately retry failed PATCHes for " + sUpdateGroupId, function (assert) {
			var oAgeBinding,
				oModel = createTeaBusiModel({updateGroupId : sUpdateGroupId}),
				oPromise,
				fnReject,
				oRoomIdBinding,
				sView = '\
<FlexBox binding="{/EMPLOYEES(\'3\')}">\
	<Input id="age" value="{AGE}" />\
	<Input id="roomId" value="{ROOM_ID}" />\
	<Input id="status" value="{STATUS}" />\
</FlexBox>',
				that = this;

			this.expectRequest("EMPLOYEES('3')", {
					"@odata.etag" : "ETag0",
					"ID" : "3",
					"AGE" : 66,
					"ROOM_ID" : "2",
					"STATUS" : "Occupied"
				})
				.expectChange("age", "66")
				.expectChange("roomId", "2")
				.expectChange("status", "Occupied");

			return this.createView(assert, sView, oModel).then(function () {
				oAgeBinding = that.oView.byId("age").getBinding("value");
				oRoomIdBinding = that.oView.byId("roomId").getBinding("value");

				that.expectChange("age", "67")
					.expectChange("roomId", "42")
					.expectRequest({
						method : "PATCH",
						url : "EMPLOYEES('3')",
						headers : {"If-Match" : "ETag0"},
						payload : {
							"AGE" : 67,
							"ROOM_ID" : "42"
						}
					}, new Promise(function (resolve, reject) {
						fnReject = reject;
					}));

				oAgeBinding.setValue(67); // Happy Birthday!
				oRoomIdBinding.setValue("42");
				oPromise = oModel.submitBatch("group");

				return that.waitForChanges(assert);
			}).then(function () {
				var oError = new Error("500 Internal Server Error");

				that.expectChange("roomId", "23")
					.expectRequest({
						method : "PATCH",
						url : "EMPLOYEES('3')",
						headers : {"If-Match" : "ETag0"},
						payload : {
							"AGE" : 67,
							"ROOM_ID" : "23"
						}
					}, {
						"@odata.etag" : "ETag1",
						"AGE" : 67,
						"ROOM_ID" : "23"
					}).expectMessages([{
						"code" : undefined,
						"message" : "500 Internal Server Error",
						"persistent" : true,
						"target" : "",
						"technical" : true,
						"type" : "Error"
					}, {
						"code" : undefined,
						"message" : "HTTP request was not processed because $batch failed",
						"persistent" : true,
						"target" : "",
						"technical" : true,
						"type" : "Error"
					}]);
				that.oLogMock.expects("error").thrice(); // don't care about console here

				oRoomIdBinding.setValue("23");
				fnReject(oError);

				return Promise.all([
					oPromise.catch(function (oError0) {
						assert.strictEqual(oError0, oError);
					}),
					oModel.submitBatch("group"),
					that.waitForChanges(assert)
				]);
			}).then(function () {
				var oStatusBinding = that.oView.byId("status").getBinding("value");

				that.expectChange("status", "Busy")
					.expectRequest({
						method : "PATCH",
						url : "EMPLOYEES('3')",
						headers : {"If-Match" : "ETag1"},
						payload : {
							"STATUS" : "Busy"
						}
					}, {/* don't care */});

				oStatusBinding.setValue("Busy"); // a different field is changed

				return Promise.all([
					oModel.submitBatch("group"),
					that.waitForChanges(assert)
				]);
			});
		});
	});

	//*********************************************************************************************
	// Scenario: ODCB#execute waits until PATCHes are back and happens inside same $batch as retry
	// (CPOUI5UISERVICESV3-1451)
	QUnit.test("CPOUI5UISERVICESV3-1451: ODCB#execute after all PATCHes", function (assert) {
		var oModel = createTeaBusiModel({updateGroupId : "$auto"}),
			fnReject,
			oRoomIdBinding,
			sView = '\
<FlexBox binding="{/EMPLOYEES(\'3\')}">\
	<Input id="age" value="{AGE}" />\
	<Input id="roomId" value="{ROOM_ID}" />\
</FlexBox>',
			that = this;

		this.expectRequest("EMPLOYEES('3')", {
				"@odata.etag" : "ETag0",
				"ID" : "3",
				"AGE" : 66,
				"ROOM_ID" : "2"
			})
			.expectChange("age", "66")
			.expectChange("roomId", "2");

		return this.createView(assert, sView, oModel).then(function () {
			oRoomIdBinding = that.oView.byId("roomId").getBinding("value");

			that.expectChange("age", "67")
				.expectChange("roomId", "42")
				.expectRequest({
					method : "PATCH",
					url : "EMPLOYEES('3')",
					headers : {"If-Match" : "ETag0"},
					payload : {
						"AGE" : 67,
						"ROOM_ID" : "42"
					}
				}, new Promise(function (resolve, reject) {
					fnReject = reject;
				}));

			that.oView.byId("age").getBinding("value").setValue(67); // Happy Birthday!
			oRoomIdBinding.setValue("42");

			return that.waitForChanges(assert);
		}).then(function () {
			var sAction = "com.sap.gateway.default.iwbep.tea_busi.v0001.AcChangeTeamOfEmployee",
				oPromise;

			function reject() {
				that.expectMessages([
					"500 Internal Server Error",
					"HTTP request was not processed because $batch failed"
				].map(function (sMessage) {
					return {
						"code" : undefined,
						"message" : sMessage,
						"persistent" : true,
						"target" : "",
						"technical" : true,
						"type" : "Error"
					};
				}));
				that.oLogMock.expects("error").thrice(); // don't care about console here

				fnReject(new Error("500 Internal Server Error"));
			}

			that.expectRequest({
					batchNo : 2,
					method : "PATCH",
					url : "EMPLOYEES('3')",
					headers : {"If-Match" : "ETag0"},
					payload : {
						"AGE" : 67,
						"ROOM_ID" : "42"
					}
				}, {/* don't care */})
				.expectRequest({
					batchNo : 2,
					method : "POST",
					headers : {"If-Match" : "ETag0"},
					url : "EMPLOYEES('3')/" + sAction,
					payload : {"TeamID" : "23"}
				}, {/* don't care */});

			// bound action waits for PATCHes and triggers retry
			oPromise = that.oModel.bindContext(sAction + "(...)", oRoomIdBinding.getContext())
				.setParameter("TeamID", "23")
				.execute("$auto");

			return Promise.all([
				oPromise,
				resolveLater(reject),
				that.waitForChanges(assert)
			]);
		});
	});

	//*********************************************************************************************
	// Scenario: Create entity for a ListBinding relative to a newly created entity
	[false, true].forEach(function (bKeepTransientPath) {
		var sTitle = "Create relative, on newly created entity, keep transient path: "
				+ bKeepTransientPath;

		QUnit.test(sTitle, function (assert) {
			var oEmployeeCreatedContext,
				oModel = createTeaBusiModel(),
				sNestedTransientPath,
				oTeamCreatedContext,
				sTransientPath,
				sView = '\
<FlexBox binding="{path : \'\',\
		parameters : {\
			$expand : {\
				\'TEAM_2_EMPLOYEES\' : {\
					$select : \'__CT__FAKE__Message/__FAKE__Messages,ID\'\
				}\
			}\
		}}" id="form">\
	<Table id="table" items="{TEAM_2_EMPLOYEES}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Input id="id" value="{ID}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>',
				that = this;

			this.expectChange("id", []);

			return this.createView(assert, sView, oModel).then(function () {
				// create a new team
				that.expectRequest({
						method : "POST",
						url : "TEAMS",
						payload : {}
					}, {
						"Team_Id" : "23"
					});

				oTeamCreatedContext = oModel.bindList("/TEAMS").create({
						// private annotation, not to be used unless explicitly adviced to do so
						"@$ui5.keepTransientPath" : bKeepTransientPath
					}, true);
				sTransientPath = oTeamCreatedContext.getPath();

				return Promise.all([
					oTeamCreatedContext.created(),
					that.waitForChanges(assert)
				]);
			}).then(function () {
				assert.strictEqual(
					oTeamCreatedContext.getPath().replace(rTransientPredicate, "($uid=...)"),
					bKeepTransientPath ? "/TEAMS($uid=...)" : "/TEAMS('23')");
				if (bKeepTransientPath) {
					assert.strictEqual(oTeamCreatedContext.getPath(), sTransientPath);
				}

				that.expectRequest("TEAMS('23')?$expand=TEAM_2_EMPLOYEES("
						+ "$select=__CT__FAKE__Message/__FAKE__Messages,ID)", {
						"Team_Id" : "23",
						"TEAM_2_EMPLOYEES" : [{
							"ID" : "3",
							"__CT__FAKE__Message" : {"__FAKE__Messages" : []}
						}]
					})
					.expectChange("id", ["3"])
					.expectMessages([]);

				that.oView.byId("form").setBindingContext(oTeamCreatedContext);

				return that.waitForChanges(assert);
			}).then(function () {
				// create new relative entity
				that.expectRequest({
						method : "POST",
						url : "TEAMS('23')/TEAM_2_EMPLOYEES",
						payload : {"ID" : null}
					}, {
						"ID" : "7",
						"__CT__FAKE__Message" : {
							"__FAKE__Messages" : [{
								"code" : "1",
								"message" : "Enter an ID",
								"numericSeverity" : 3,
								"target" : "ID",
								"transition" : false
							}]
						}
					})
					.expectChange("id", "", 0) // from setValue(null)
					.expectChange("id", ["7", "3"])
					.expectMessages([{
						"code" : "1",
						"message" : "Enter an ID",
						"persistent" : false,
						"target" : bKeepTransientPath
							? "/TEAMS($uid=...)/TEAM_2_EMPLOYEES($uid=...)/ID"
							: "/TEAMS('23')/TEAM_2_EMPLOYEES('7')/ID",
						"type" : "Warning"
					}]);

				oEmployeeCreatedContext = that.oView.byId("table").getBinding("items").create({
						// private annotation, not to be used unless explicitly adviced to do so
						"@$ui5.keepTransientPath" : bKeepTransientPath,
						"ID" : null
					}, true);
				sNestedTransientPath = oEmployeeCreatedContext.getPath();

				return Promise.all([
					oEmployeeCreatedContext.created(),
					that.waitForChanges(assert)
				]);
			}).then(function () {
				// the new one is at the top
				var oInput = that.oView.byId("table").getItems("items")[0].getCells()[0];

				assert.strictEqual(oEmployeeCreatedContext.getPath(),
					bKeepTransientPath
					? sNestedTransientPath
					: "/TEAMS('23')/TEAM_2_EMPLOYEES('7')");
				assert.strictEqual(oInput.getBindingContext().getPath(),
					oEmployeeCreatedContext.getPath(), "we got the right input control");

				return that.checkValueState(assert, oInput, "Warning", "Enter an ID");
			});
		});
	});

	//*********************************************************************************************
	// Scenario: if a 1 to n navigation occurs we use the deep path for this case instead of the
	// canonical path; the app can opt-out of this behavior with a binding specific parameter
	// CPOUI5UISERVICESV3-1567
	[false, true].forEach(function (bUseCanonicalPath) {
		QUnit.test("read with deep path, $$canonicalPath: " + bUseCanonicalPath, function (assert) {
			var sEntityPath = bUseCanonicalPath
					? "BusinessPartnerList('23')"
					: "SalesOrderList('0500000000')/SO_2_BP",
				oModel = createSalesOrdersModel({autoExpandSelect : true}),
				sParameters = bUseCanonicalPath
					? "parameters : {$$canonicalPath : true}"
					: "parameters : {$$ownRequest : true}",
				sView = '\
<FlexBox binding="{/SalesOrderList(\'0500000000\')/SO_2_BP}">\
	<Text text="{BusinessPartnerID}" />\
	<FlexBox binding="{path : \'\',\
		' + sParameters + '\
		}">\
		<layoutData><FlexItemData/></layoutData>\
		<Text id="street" text="{Address/Street}" />\
	</FlexBox>\
	<Table items="{path : \'BP_2_PRODUCT\',\
		' + sParameters + '\
		}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text text="{ProductID}" />\
		</ColumnListItem>\
	</Table>\
</FlexBox>';

			this.expectRequest("SalesOrderList('0500000000')/SO_2_BP?$select=BusinessPartnerID", {
					"BusinessPartnerID" : "23"
				})
				.expectRequest(sEntityPath + "?$select=Address/Street,BusinessPartnerID", {
					"Address" : {
						"Street" : "Bakerstreet"
					},
					"BusinessPartnerID" : "23"
				})
				.expectRequest(sEntityPath + "/BP_2_PRODUCT?$select=ProductID&$skip=0&$top=100", {
					value : [{
						"ProductID" : "1"
					}]
				});

			return this.createView(assert, sView, oModel);
		});
	});

	//*********************************************************************************************
	// Scenario: Dependent binding uses $$canonicalPath; hasPendingChanges and refresh consider
	// caches of the dependent binding.
	// CPOUI5UISERVICESV3-1706
	QUnit.test("hasPendingChanges and refresh with $$canonicalPath", function (assert) {
		var oBusinessPartnerContext,
			oBusinessPartnerList,
			oForm,
			oModel = createSalesOrdersModel({autoExpandSelect : true, updateGroupId : "update"}),
			sView = '\
<Table id="businessPartnerList" items="{/BusinessPartnerList}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="businessPartnerID" text="{BusinessPartnerID}" />\
	</ColumnListItem>\
</Table>\
<FlexBox id="form" binding="{BP_2_SO(\'42\')}">\
	<Text id="salesOrderID" text="{SalesOrderID}" />\
	<Table id="table" items="{path : \'SO_2_SOITEM\', parameters : {$$canonicalPath : true}}">\
		<columns><Column/></columns>\
		<ColumnListItem>\
			<Text id="productID" text="{ProductID}" />\
			<Input id="note" value="{Note}" />\
		</ColumnListItem>\
	</Table>\
	<FlexBox binding="{path : \'SO_2_BP/BP_2_SO(\\\'23\\\')\',\
			parameters : {$$canonicalPath : true}}">\
		<Input id="billingStatus" value="{BillingStatus}" />\
	</FlexBox>\
</FlexBox>',
			that = this;

		function checkPendingChanges() {
			assert.strictEqual(oBusinessPartnerList.getBinding("items").hasPendingChanges(), true);
			assert.strictEqual(oBusinessPartnerContext.hasPendingChanges(), true);
		}

		function clearDetails() {
			that.expectChange("billingStatus", null)
				.expectChange("note", [])
				.expectChange("productID", [])
				.expectChange("salesOrderID", null);

			oForm.setBindingContext(null);
		}

		function expectDetailRequests() {
			// Note: this is requested anyway by autoExpandSelect, thus we might as well show it
			that.expectRequest("BusinessPartnerList('0500000000')/BP_2_SO('42')"
					+ "?$select=SalesOrderID", {
					"SalesOrderID" : "42"
				})
				.expectRequest("SalesOrderList('42')/SO_2_SOITEM"
					+ "?$select=ItemPosition,Note,ProductID,SalesOrderID&$skip=0&$top=100", {
					"value" : [{
						"ItemPosition" : "10",
						"Note" : "Notebook Basic 15",
						"ProductID" : "HT-1000",
						"SalesOrderID" : "42"
					}, {
						"ItemPosition" : "20",
						"Messages" : [{
							"code" : "23",
							"message" : "Just a test",
							"numericSeverity" : 3,
							"target" : "Note"
						}],
						"Note" : "ITelO Vault",
						"ProductID" : "HT-1007",
						"SalesOrderID" : "42"
					}]
				})
				.expectRequest("SalesOrderList('42')/SO_2_BP/BP_2_SO('23')"
					+ "?$select=BillingStatus,SalesOrderID", {
					"BillingStatus" : "UNKNOWN",
					"Messages" : [{
						"code" : "00",
						"message" : "Unknown billing status",
						"numericSeverity" : 3,
						"target" : "BillingStatus"
					}],
					"SalesOrderID" : "23"
				})
				.expectMessages([{
					"code" : "23",
					"message" : "Just a test",
					"persistent" : false,
					"target" : "/BusinessPartnerList('0500000000')/BP_2_SO('42')"
						+ "/SO_2_SOITEM(SalesOrderID='42',ItemPosition='20')/Note",
					"technical" : false,
					"type" : "Warning"
				}, {
					"code" : "00",
					"message" : "Unknown billing status",
					"persistent" : false,
					"target" : "/BusinessPartnerList('0500000000')/BP_2_SO('42')"
						+ "/SO_2_BP/BP_2_SO('23')/BillingStatus",
					"technical" : false,
					"type" : "Warning"
				}]);
		}

		function selectFirst() {
			that.expectChange("billingStatus", "UNKNOWN")
				.expectChange("note", ["Notebook Basic 15", "ITelO Vault"])
				.expectChange("productID", ["HT-1000", "HT-1007"])
				.expectChange("salesOrderID", "42");

			oForm.setBindingContext(oBusinessPartnerContext);
		}

		this.expectRequest("BusinessPartnerList?$select=BusinessPartnerID&$skip=0&$top=100", {
				"value" : [{
					"BusinessPartnerID" : "0500000000"
				}]
			})
			.expectChange("billingStatus")
			.expectChange("businessPartnerID", ["0500000000"])
			.expectChange("note", [])
			.expectChange("productID", [])
			.expectChange("salesOrderID");

		return this.createView(assert, sView, oModel).then(function () {
			oForm = that.oView.byId("form");
			oBusinessPartnerList = that.oView.byId("businessPartnerList");
			oBusinessPartnerContext = oBusinessPartnerList.getItems()[0].getBindingContext();

			expectDetailRequests();
			selectFirst();

			return that.waitForChanges(assert);
		}).then(function () {
			var oInput = that.oView.byId("table").getItems("items")[1].getCells()[1];

			return that.checkValueState(assert, oInput, "Warning", "Just a test");
		}).then(function () {
			return that.checkValueState(assert, "billingStatus", "Warning",
				"Unknown billing status");
		}).then(function () {
			clearDetails();

			return that.waitForChanges(assert);
		}).then(function () {
			// set context for details again - take values from cache
			selectFirst();

			return that.waitForChanges(assert);
		}).then(function () {
			clearDetails();

			return that.waitForChanges(assert);
		}).then(function () {
			// refresh business partner
			that.expectRequest("BusinessPartnerList('0500000000')?$select=BusinessPartnerID", {
					"BusinessPartnerID" : "0500000000"
				})
				.expectMessages([]);

			oBusinessPartnerContext.refresh();

			return that.waitForChanges(assert);
		}).then(function () {
			// set context for details again - don't use cached data
			expectDetailRequests();
			selectFirst();

			return that.waitForChanges(assert);
		}).then(function () {
			// change value in details
			that.expectChange("note", "Foo", 0);

			// Note: cannot call Input#setValue because of that.setFormatter
			that.oView.byId("table").getItems()[0].getCells()[1].getBinding("value")
				.setValue("Foo");

			checkPendingChanges();

			return that.waitForChanges(assert);
		}).then(function () {
			// clear details and check pending changes
			clearDetails();
			checkPendingChanges();

			return that.waitForChanges(assert);
		});
	});

	//*********************************************************************************************
	// Scenario: unnecessary context bindings to confuse auto-$expand/$select
	QUnit.skip("CPOUI5UISERVICESV3-1677: Avoid unnecessary $expand", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{BestFriend}">\
		<FlexBox binding="{_Friend(ArtistID=\'42\',IsActiveEntity=true)}">\
		</FlexBox>\
	</FlexBox>\
</FlexBox>';

		//TODO avoid the following $expand
//		+ "&$expand=BestFriend($select=ArtistID,IsActiveEntity"
//		+ ";$expand=_Friend($select=ArtistID,IsActiveEntity))"
		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?$select=ArtistID,IsActiveEntity", {
				"ArtistID" : "42"
//				"IsActiveEntity" : true
			})
			.expectChange("id", "42");

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: context binding for :N navigation property using key predicate
	QUnit.skip("CPOUI5UISERVICESV3-1679: nav.prop. using key predicate", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}">\
	<Text id="id" text="{ArtistID}" />\
	<FlexBox binding="{_Friend(ArtistID=\'23\',IsActiveEntity=true)}">\
		<Text id="friend" text="{ArtistID}" />\
	</FlexBox>\
</FlexBox>';

		//TODO Failed to drill-down into _Friend(ArtistID='23',IsActiveEntity=true)/ArtistID
		// --> "friend" binding would need to send its own request!
		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?$select=ArtistID,IsActiveEntity"
				//TODO CPOUI5UISERVICESV3-1677: Avoid unnecessary $expand
				+ "&$expand=_Friend($select=ArtistID,IsActiveEntity)", {
				"ArtistID" : "42"
//				"IsActiveEntity" : true
			})
			.expectChange("id", "42")
			.expectChange("id", "23");

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: A grid table shows a collection which completely resides in the parent binding's
	// cache. Auto-$expand/$select does not properly handle this case: "Price" is not selected.
	QUnit.skip("CPOUI5UISERVICESV3-1685: autoExpandSelect with grid table", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/Artists(ArtistID=\'42\',IsActiveEntity=true)}">\
	<Text id="id" text="{ArtistID}" />\
	<t:Table rows="{_Publication}">\
		<t:Column>\
			<t:template>\
				<Text id="price" text="{Price}" />\
			</t:template>\
		</t:Column>\
	</t:Table>\
</FlexBox>';

		this.expectRequest("Artists(ArtistID='42',IsActiveEntity=true)"
				+ "?$select=ArtistID,IsActiveEntity"
				+ "&$expand=_Publication($select=Price,PublicationID)", {
				"ArtistID" : "42",
//				"IsActiveEntity" : true,
				"_Publication" : [{
					"Price" : "9.99"
//						"PublicationID" "42-0":
				}]
			})
			.expectChange("id", "42")
			.expectChange("price", ["9.99"]);

		return this.createView(assert, sView, oModel);
	});

	//*********************************************************************************************
	// Scenario: property binding with "##"-path pointing to a metamodel property.
	// CPOUI5UISERVICESV3-1676
	testViewStart("Property binding with metapath", '\
<FlexBox binding="{/Artists(\'42\')}">\
	<Text id="label0" text="{Name##@com.sap.vocabularies.Common.v1.Label}" />\
	<Text id="name" text="{Name}" />\
</FlexBox>\
<Text id="insertable"\
	text="{/Artists##@Org.OData.Capabilities.V1.InsertRestrictions/Insertable}" />\
<Text id="label1" text="{/Artists##/@com.sap.vocabularies.Common.v1.Label}" />',
		{"Artists('42')?$select=ArtistID,IsActiveEntity,Name" : {
			//"ArtistID" : ..., "IsActiveEntity" : ...
			"Name" : "Foo"}},
		{"label0" : "Artist Name", "name" : "Foo", "insertable" : true, "label1" : "Artist"},
		createSpecialCasesModel({autoExpandSelect : true})
	);

	//*********************************************************************************************
	// Scenario: Metadata property binding with target type any represented as a part %{...}
	// in an expression binding where the property binding has an object value.
	// CPOUI5UISERVICESV3-1676
	testViewStart("Metadata property binding with object value", '\
<Text id="insertable"\
	text="{:= %{/Artists##@Org.OData.Capabilities.V1.InsertRestrictions}.Insertable }" />',
		/* no data request*/ undefined,
		{"insertable" : true},
		createSpecialCasesModel({autoExpandSelect : true})
	);

	//*********************************************************************************************
	// Scenario: Relative data property binding with target type any represented as a part %{...}
	// in an expression binding where the property binding refers to a navigation property and thus
	// has an object value.
	// CPOUI5UISERVICESV3-1676
	testViewStart("Relative data property binding with object value", '\
<FlexBox binding="{/Artists(\'42\')}">\
	<Text id="publicationCount" text="{:= %{_Publication}.length }" />\
</FlexBox>',
		{"Artists('42')?$select=ArtistID,IsActiveEntity&$expand=_Publication($select=PublicationID)" : {
			//"ArtistID" : ..., "IsActiveEntity" : ...
			"_Publication" : [{/*"PublicationID" : ...*/}, {}, {}]
		}},
		{"publicationCount" : 3},
		createSpecialCasesModel({autoExpandSelect : true})
	);

	//*********************************************************************************************
	// Scenario: list binding with auto-$expand/$select and filter (so that metadata is required to
	// build the query string), but the metadata could not be loaded (CPOUI5UISERVICESV3-1723)
	QUnit.test("Auto-$expand/$select with dynamic filter, but no metadata", function (assert) {
		var oModel = createModel(sInvalidModel, {autoExpandSelect : true}),
			sView = '\
<Table items="{path : \'/Artists\', \
		filters : {path : \'IsActiveEntity\', operator : \'EQ\', value1 : \'true\'}}">\
	<columns><Column/></columns>\
	<ColumnListItem>\
		<Text id="id" text="{ID}"/>\
	</ColumnListItem>\
</Table>';

		this.oLogMock.restore(); // the exact errors do not interest
		this.stub(Log, "error");
		this.expectMessages([{
			"code": undefined,
			"descriptionUrl": undefined,
			"message": "Could not load metadata: 500 Internal Server Error",
			"persistent": true,
			"target": "",
			"technical": true,
			"type": "Error"
		}]);

		return this.createView(assert, sView, oModel).then(function () {
			// check that the first error message complains about the metadata access
			sinon.assert.calledWithExactly(Log.error.firstCall, "GET /invalid/model/$metadata",
				"Could not load metadata: 500 Internal Server Error",
				"sap.ui.model.odata.v4.lib._MetadataRequestor");
		});
	});

	//*********************************************************************************************
	// Scenario: Display a measure with unit using the customizing loaded from the backend
	// based on the "com.sap.vocabularies.CodeList.v1.UnitsOfMeasure" on the service's entity
	// container.
	// CPOUI5UISERVICESV3-1711
	QUnit.test("OData Unit type considering unit customizing", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true}),
			sView = '\
<FlexBox binding="{/ProductList(\'HT-1000\')}">\
	<Input id="weight" value="{parts: [\'WeightMeasure\', \'WeightUnit\',\
					{path : \'/##@@requestUnitsOfMeasure\',\
						mode : \'OneTime\', targetType : \'any\'}],\
				mode : \'TwoWay\',\
				type : \'sap.ui.model.odata.type.Unit\'}" />\
	<Text id="weightMeasure" text="{WeightMeasure}"/>\
</FlexBox>',
			that = this;

		this.expectRequest("ProductList(\'HT-1000\')?$select=ProductID,WeightMeasure,WeightUnit", {
				"@odata.etag" : "ETag",
				"ProductID" : "HT-1000",
				"WeightMeasure" : "12.34",
				"WeightUnit" : "KG"
			})
			.expectRequest("UnitsOfMeasure?$select=ExternalCode,DecimalPlaces,Text,ISOCode", {
				value : [{
					"DecimalPlaces" : 5,
					"ExternalCode" : "KG",
					"ISOCode" : "KGM",
					"Text" : "Kilogramm",
					"UnitCode" : "KG"
				}]
			})
			.expectChange("weightMeasure", "12.340")  // Scale=3 in property metadata => 3 decimals
			.expectChange("weight", "12.34000 KG");

		return this.createView(assert, sView, oModel).then(function () {
			that.expectChange("weight", "23.40000 KG")
				.expectChange("weightMeasure", "23.400")
				.expectRequest({
					method : "PATCH",
					url : "ProductList('HT-1000')",
					headers : {"If-Match" : "ETag"},
					payload : {"WeightMeasure" : "23.4", "WeightUnit" : "KG"}
				});

			that.oView.byId("weight").getBinding("value").setRawValue(["23.4", "KG"]);

			return that.waitForChanges(assert);
		}).then(function () {
			var oControl = that.oView.byId("weight");

			that.expectMessages([{
				"code": undefined,
				"descriptionUrl": undefined,
				"message": "Enter a number with a maximum of 5 decimal places",
				"persistent": false,
				"target": oControl.getId() + "/value",
				"technical": false,
				"type": "Error"
			}]);

			// remove the formatter so that we can call setValue at the control
			oControl.getBinding("value").setFormatter(null);

			// code under test
			oControl.setValue("12.123456 KG");

			return that.waitForChanges(assert).then(function () {
				return that.checkValueState(assert, oControl, "Error",
					"Enter a number with a maximum of 5 decimal places");
			});
		});
	});

	//*********************************************************************************************
	// Scenario: Display an amount with currency using the customizing loaded from the backend
	// based on the "com.sap.vocabularies.CodeList.v1.CurrencyCodes" on the service's entity
	// container.
	// CPOUI5UISERVICESV3-1733
	QUnit.test("OData Currency type considering currency customizing", function (assert) {
		var oModel = createSalesOrdersModel({autoExpandSelect : true, updateGroupId : "$auto"}),
			sView = '\
<FlexBox binding="{/ProductList(\'HT-1000\')}">\
	<Input id="price" value="{parts: [\'Price\', \'CurrencyCode\',\
					{path : \'/##@@requestCurrencyCodes\',\
						mode : \'OneTime\', targetType : \'any\'}],\
				mode : \'TwoWay\',\
				type : \'sap.ui.model.odata.type.Currency\'}" />\
	<Text id="amount" text="{Price}"/>\
</FlexBox>',
			that = this;

		this.expectRequest("ProductList(\'HT-1000\')?$select=CurrencyCode,Price,ProductID", {
				"@odata.etag" : "ETag",
				"ProductID" : "HT-1000",
				"Price" : "12.3",
				"CurrencyCode" : "EUR"
			})
			.expectRequest("Currencies?$select=CurrencyCode,DecimalPlaces,Text,ISOCode", {
				value : [{
					"CurrencyCode" : "EUR",
					"DecimalPlaces" : 2,
					"ISOCode" : "EUR",
					"Text" : "Euro"
				}, {
					"CurrencyCode" : "JPY",
					"DecimalPlaces" : 0,
					"ISOCode" : "JPY",
					"Text" : "Yen"
				}]
			})
			.expectChange("amount", "12.3")
			.expectChange("price", "EUR\u00a012.30"); // "\u00a0" is a non-breaking space

		return this.createView(assert, sView, oModel).then(function () {
			//TODO get rid of first change event which is due to using setRawValue([...]) on the
			//  composite binding. Solution idea: change integration test framework to not use
			//  formatters but overwrite formatValue on the binding's type if ever possible. Without
			//  formatters, one can then set the value on the control.
			that.expectChange("price", "EUR\u00a042.00")
				.expectChange("price", "JPY\u00a042")
				.expectChange("amount", "42")
				.expectRequest({
					method : "PATCH",
					url : "ProductList('HT-1000')",
					headers : {"If-Match" : "ETag"},
					payload : {"Price" : "42", "CurrencyCode" : "JPY"}
				});

			that.oView.byId("price").getBinding("value").setRawValue(["42", "JPY"]);

			return that.waitForChanges(assert);
		}).then(function () {
			var oControl = that.oView.byId("price");

			that.expectMessages([{
				"code": undefined,
				"descriptionUrl": undefined,
				"message": "Enter a number with no decimal places",
				"persistent": false,
				"target": oControl.getId() + "/value",
				"technical": false,
				"type": "Error"
			}]);

			// remove the formatter so that we can call setValue at the control
			oControl.getBinding("value").setFormatter(null);

			// code under test
			oControl.setValue("12.1");

			return that.waitForChanges(assert).then(function () {
				return that.checkValueState(assert, oControl, "Error",
					"Enter a number with no decimal places");
			});
		});
	});
	//TODO With updateGroupId $direct, changing *both* parts of a composite binding (amount and
	//  currency) in one step triggers *two* PATCH requests:
	//  The first request contains the new amount and also the old currency as PATCHes for amounts
	//  are always sent with currency.
	//  The second request only contains the new currency.
	//  Solution idea: Only execute $direct requests in prerendering task
	//  Is this critical? - Productive scenario runs with $batch. However: What if amount and
	//  currency are in two different fields in draft scenario (no save button)?

	//*********************************************************************************************
	// Scenario: Request value list information for an action's parameter.
	// BCP: 1970116818
	// JIRA: CPOUI5UISERVICESV3-1744
	QUnit.test("Value help at action parameter", function (assert) {
		var oModel = createSpecialCasesModel(),
			sPropertyPath = "/Artists/special.cases.Create/Countryoforigin";

		return oModel.getMetaModel().requestValueListType(sPropertyPath)
			.then(function (sValueListType) {
				assert.strictEqual(sValueListType, "Fixed");

				return oModel.getMetaModel().requestValueListInfo(sPropertyPath);
			}).then(function (mQualifier2ValueListType) {
				var oValueHelpModel = mQualifier2ValueListType[""].$model;

				delete mQualifier2ValueListType[""].$model;
				assert.deepEqual(mQualifier2ValueListType, {
					"" : {
						"CollectionPath" : "I_AIVS_CountryCode",
						"Label" : "Country Code Value Help",
						"Parameters" : [{
							"$Type" : "com.sap.vocabularies.Common.v1.ValueListParameterInOut",
							"LocalDataProperty" : {
								"$PropertyPath" : "Countryoforigin"
							},
							"ValueListProperty" : "CountryCode"
						}]
					}
				});
				assert.strictEqual(oValueHelpModel.toString(),
					"sap.ui.model.odata.v4.ODataModel: /special/countryoforigin/");
			});
	});

	//*********************************************************************************************
	// Scenario: Execute a bound action on the target of a navigation property. That action returns
	// its binding parameter which is thus updated ("cache synchronization") and is the target of
	// messages.
	// CPOUI5UISERVICESV3-1587
	QUnit.test("bound action on navigation property updates binding parameter", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			sResourcePath = "Artists(ArtistID='42',IsActiveEntity=true)/BestPublication",
			sView = '\
<FlexBox binding="{\
		path : \'/Artists(ArtistID=\\\'42\\\',IsActiveEntity=true)/BestPublication\',\
		parameters : {$select : \'Messages\'}\
	}" id="form">\
	<Input id="price" value="{Price}" />\
</FlexBox>',
			that = this;

		this.expectRequest(sResourcePath + "?$select=Messages,Price,PublicationID", {
				"PublicationID" : "42-0",
				"Price" : "9.99"
			})
			.expectChange("price", "9.99");

		return this.createView(assert, sView, oModel).then(function () {
			var oContext = that.oView.byId("form").getObjectBinding().getBoundContext(),
				oOperation = that.oModel.bindContext("special.cases.PreparationAction(...)",
					oContext, {$$inheritExpandSelect : true});

			that.expectRequest({
				method : "POST",
				url : sResourcePath + "/special.cases.PreparationAction"
					+ "?$select=Messages,Price,PublicationID",
				payload : {}
			}, {
				"Messages" : [{
					"code" : "23",
					"message" : "Just A Message",
					"numericSeverity" : 1,
					"transition" : true,
					"target" : "Price"
				}],
				"PublicationID" : "42-0",
				"Price" : "3.33"
			})
			.expectChange("price", "3.33")
			.expectMessages([{
				code : "23",
				message : "Just A Message",
				// Note: We cannot know whether PreparationAction changed the target of
				// BestPublication, but as long as the form still displays "42-0", we might as well
				// keep it up-to-date and show messages there...
				target : "/Artists(ArtistID='42',IsActiveEntity=true)/BestPublication/Price",
				persistent : true,
				type : "Success"
			}]);

			// code under test
			return Promise.all([
				oOperation.execute(),
				that.waitForChanges(assert)
			]);
		}).then(function () {
			return that.checkValueState(assert, "price", "Success", "Just A Message");
		});
	});

	//*********************************************************************************************
	// Scenario: Request side effects at a return value context leads to "duplicate" requests.
	// (Note: This is as expected, because two caches need to be updated!)
	// Avoid this by using the bound context of the binding with the empty path (a workaround by FE
	// for missing support of $expand at action POSTs). No fix required.
	// BCP: 1980108040
	QUnit.test("BCP: 1980108040", function (assert) {
		var oModel = createSpecialCasesModel({autoExpandSelect : true}),
			oReturnValueContext,
			sView = '\
<FlexBox id="objectPage" binding="{path : \'\', parameters : {$$ownRequest : true}}">\
	<Text id="id" text="{ArtistID}" />\
	<Text id="name" text="{Name}" />\
</FlexBox>',
			that = this;

		this.expectChange("id")
			.expectChange("name");

		return this.createView(assert, sView, oModel).then(function () {
			var oListBinding = that.oModel.bindList("/Artists"),
				oHeaderContext = oListBinding.getHeaderContext(),
				oOperationBinding = that.oModel.bindContext("special.cases.Create(...)",
					oHeaderContext, {$$patchWithoutSideEffects: true});

			that.expectRequest({
				method : "POST",
				payload : {},
				url : "Artists/special.cases.Create"
			}, {
				"ArtistID" : "42",
				"IsActiveEntity" : false
			});

			return oOperationBinding.execute();
		}).then(function (oReturnValueContext0) {
			oReturnValueContext = oReturnValueContext0;

			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=false)"
					+ "?$select=ArtistID,IsActiveEntity,Name", {
					"ArtistID" : "42",
					"IsActiveEntity" : false,
					"Name" : ""
				})
				.expectChange("id", "42")
				.expectChange("name", "");

			that.oView.byId("objectPage").setBindingContext(oReturnValueContext);

			return that.waitForChanges(assert);
		}).then(function () {
			that.expectRequest("Artists(ArtistID='42',IsActiveEntity=false)?$select=Name", {
					"ArtistID" : "42",
					"IsActiveEntity" : false,
					"Name" : "Hour Frustrated"
				})
				.expectChange("name", "Hour Frustrated");

			// Note: do not use oReturnValueContext, it would trigger duplicate requests
			that.oView.byId("objectPage").getObjectBinding().getBoundContext()
				// code under test
				.requestSideEffects([{$PropertyPath : "Name"}]);

			return that.waitForChanges(assert);
		});
	});
});
