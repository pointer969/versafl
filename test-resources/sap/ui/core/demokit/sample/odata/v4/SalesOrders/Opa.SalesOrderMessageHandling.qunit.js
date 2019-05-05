/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/ui/core/sample/odata/v4/SalesOrders/tests/MessageHandling",
	"sap/ui/test/opaQunit"
], function (MessageHandling, opaTest) {
	/*global QUnit */
	"use strict";

	QUnit.module("sap.ui.core.sample.odata.v4.SalesOrders - Message Handling");

	//*****************************************************************************
	opaTest("Message Handling", function (Given, When, Then) {

		MessageHandling.checkMessages(Given, When, Then);

	});
});