/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/base/Log"
], function (Log) {
	"use strict";

	return {
		createMultiple : function (Given, When, Then, sUIComponent) {
			var iCreated = 0,
				oExpectedLog = {
					component : "sap.ui.model.odata.v4.ODataParentBinding",
					level : Log.Level.ERROR,
					message: "POST on 'SalesOrderList' failed; will be repeated automatically",
					details : "Property `Note` value `RAISE_ERROR` not allowed!"
				};

			Given.iStartMyUIComponent({
				componentConfig : {
					name : sUIComponent || "sap.ui.core.sample.odata.v4.SalesOrders"
				}
			});

			sap.ui.test.Opa.getContext().sViewName = "sap.ui.core.sample.odata.v4.SalesOrders.Main";

			/* creates two sales orders
			 *
			 * @param {boolean} bSave
			 *   Whether created sales orders are saved or not
			 */
			function createTwice(bSave) {
				var i;

				for (i = 0; i < 2; i += 1) {
					When.onTheMainPage.pressCreateSalesOrdersButton();
					iCreated += 1;
					// Note property in payload determines the mock data to be used
					When.onTheCreateNewSalesOrderDialog.changeNote("new " + iCreated);
					When.onTheCreateNewSalesOrderDialog.confirmDialog();
					if (bSave) {
						When.onTheMainPage.pressSaveSalesOrdersButton();
						When.onTheSuccessInfo.confirm();
						Then.onTheMainPage.checkDifferentID(0, "");
					}
				}
			}

			When.onTheMainPage.firstSalesOrderIsVisible();

			// Test scenario:
			// Create one entity, save and create second entity, save, create third entity, create
			// fourth entity, delete third entity, reset changes (removes fourth entity), save

			// Create and save two entities
			createTwice(true);
			// Create two entities without saving
			createTwice(false);
			// Delete third entity
			When.onTheMainPage.selectSalesOrder(1);
			When.onTheMainPage.deleteSelectedSalesOrder();
			When.onTheSalesOrderDeletionConfirmation.confirm();
			When.onTheSuccessInfo.confirm();
			// Reset changes (removes fourth entity) and press "save"
			When.onTheMainPage.pressCancelSalesOrderListChangesButton();

			// Test scenario:
			// Partial POST failure: Create two new entities without save in between, save, second
			// POST leads to a backend error, "fix" second entity, save

			// Create two entities without saving
			iCreated = 2; // in order to reuse mock data for #3+#4 which are deleted in between
			createTwice(false);
			// Add special note to force backend error and try to save it
			When.onTheMainPage.changeNoteInSalesOrders(0, "RAISE_ERROR");
			When.onTheMainPage.pressSaveSalesOrdersButton();
			When.onTheMessagePopover.close();
			Then.onTheMainPage.checkID(0, "");
			Then.onTheMainPage.checkID(1, "");
			// Correct the fake error note, try to save it again and check results
			When.onTheMainPage.changeNoteInSalesOrders(0, "new 4");
			When.onTheMainPage.pressSaveSalesOrdersButton();
			When.onTheSuccessInfo.confirm();
			When.onTheSuccessInfo.confirm();
			Then.onTheMainPage.checkDifferentID(0, "");
			Then.onTheMainPage.checkDifferentID(1, "");

			// delete created sales orders
			When.onAnyPage.cleanUp("SalesOrderList");
			Then.onAnyPage.checkLog([oExpectedLog, oExpectedLog]);
			Then.iTeardownMyUIComponent();
		}
	};
});