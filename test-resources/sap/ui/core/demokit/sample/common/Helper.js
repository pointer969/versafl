/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define("sap/ui/core/sample/common/Helper", [
	"sap/base/Log",
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/matchers/Interactable"
], function (Log, Opa5, Press, Interactable) {
	"use strict";
	var Helper;

	// Helper functions used within sap.ui.core.sample.common namespace
	Helper = {
		/**
		 * Checks if a sap.m.Button is disabled.
		 *
		 * @param {sap.ui.test.Opa5} oOpa5
		 *  An instance of Opa5 to access the current page object
		 * @param {string} sViewName
		 *  The name of the view which contains the searched control
		 * @param {string} sButtonId
		 *  The ID of a "sap.m.Button" control inside the view sViewName
		 * @returns {jQuery.promise}
		 *  A promise resolved by {@link sap.ui.test.Opa5#waitFor}
		 */
		checkButtonDisabled : function (oOpa5, sViewName, sButtonId) {
			return oOpa5.waitFor({
				autoWait : false,
				controlType : "sap.m.Button",
				id : sButtonId,
				success : function (oButton) {
					Opa5.assert.ok(oButton.getEnabled() === false,
						"Button is disabled: " + sButtonId);
				},
				viewName : sViewName
			});
		},

		/**
		 * Checks if a sap.m.Button is enabled.
		 *
		 * @param {sap.ui.test.Opa5} oOpa5
		 *  An instance of Opa5 to access the current page object
		 * @param {string} sViewName
		 *  The name of the view which contains the searched control
		 * @param {string} sButtonId
		 *  The ID of a "sap.m.Button" control inside the view sViewName
		 * @returns {jQuery.promise}
		 *  A promise resolved by {@link sap.ui.test.Opa5#waitFor}
		 */
		checkButtonEnabled : function (oOpa5, sViewName, sButtonId) {
			return oOpa5.waitFor({
				controlType : "sap.m.Button",
				id : sButtonId,
				matchers : new Interactable(),
				success : function (oButton) {
					Opa5.assert.ok(oButton.getEnabled(), "Button is enabled: " + sButtonId);
				},
				viewName : sViewName
			});
		},

		/**
		 * Decides whether given log is related to OData V4 topic and has a log level which is at
		 * least WARNING
		 *
		 * @param {object} oLog
		 *  A single log entry returned by {@link sap.ui.base.Log.getLogEntries}
		 * @returns {boolean}
		 *  Whether the log matches to the criterias above or not
		 */
		isRelevantLog : function (oLog) {
			var sComponent = oLog.component || "";

			return oLog.level <= Log.Level.WARNING
				&& (sComponent.indexOf("sap.ui.base.BindingParser") === 0
					|| sComponent.indexOf("sap.ui.base.ExpressionParser") === 0
					|| sComponent.indexOf("sap.ui.core.sample.") === 0
					|| sComponent.indexOf("sap.ui.core.util.XMLPreprocessor") === 0
					|| sComponent.indexOf("sap.ui.model.odata.AnnotationHelper") === 0
					|| sComponent.indexOf("sap.ui.model.odata.ODataMetaModel") === 0
					|| sComponent.indexOf("sap.ui.model.odata.type.") === 0
					|| sComponent.indexOf("sap.ui.model.odata.v4.") === 0
					|| sComponent.indexOf("sap.ui.test.TestUtils") === 0);
		},

		/**
		 * Executes the Press() action on a "sap.m.Button" and adds a useful success message
		 *
		 * @param {sap.ui.test.Opa5} oOpa5
		 *  An instance of Opa5 to access the current page object
		 * @param {string} sViewName
		 *  The name of the view which contains the searched control
		 * @param {string} sId
		 *  The ID of a "sap.m.Button" control inside the view sViewName
		 * @returns {jQuery.promise}
		 *  A promise resolved by {@link sap.ui.test.Opa5#waitFor}
		 */
		pressButton : function (oOpa5, sViewName, sId) {
			return oOpa5.waitFor({
				actions : new Press(),
				controlType : "sap.m.Button",
				id : sId,
				success : function (oButton) {
					var sText = oButton.getTooltip() || oButton.getText() || sId;

					Opa5.assert.ok(true, "Button pressed: " + sText);
				},
				viewName : sViewName
			});
		}
	};

	return Helper;
}, /* bExport= */ true);
