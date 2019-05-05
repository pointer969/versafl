/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/ui/core/sample/odata/v4/SalesOrders/tests/CreateRelative",
	"sap/ui/test/opaQunit"
], function (CreateRelativeTest, opaTest) {
	/*global QUnit */
	"use strict";

	QUnit.module("sap.ui.core.sample.odata.v4.SalesOrdersRTATest - Create Relative");

	//*****************************************************************************
	opaTest("Create, modify and delete within relative listbinding", function (Given, When, Then) {

		CreateRelativeTest.createRelative(Given, When, Then,
			"sap.ui.core.sample.odata.v4.SalesOrdersRTATest");

	});
});