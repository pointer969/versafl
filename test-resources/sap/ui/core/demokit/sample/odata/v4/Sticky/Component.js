/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * @fileOverview Application component: Consumption of an OData V4 service.
 * @version @version@
 */
sap.ui.define([
	"sap/ui/core/library",
	"sap/ui/core/sample/common/Component",
	"sap/ui/model/json/JSONModel",
	"sap/ui/test/TestUtils"
], function (library, BaseComponent, JSONModel, TestUtils) {
	"use strict";

	// shortcut for sap.ui.core.mvc.ViewType
	var ViewType = library.mvc.ViewType;

	return BaseComponent.extend("sap.ui.core.sample.odata.v4.Sticky.Component", {
		metadata : {
			manifest : "json"
		},

		createContent : function () {
			return sap.ui.view({
				async : true,
				models : {
					undefined : this.getModel(),
					ui : new JSONModel({iMessages : 0, bSticky : false})
				},
				type : ViewType.XML,
				viewName : "sap.ui.core.sample.odata.v4.Sticky.Main"
			});
		},

		exit : function () {
			TestUtils.retrieveData("sap.ui.core.sample.odata.v4.Sticky.sandbox").restore();
			jQuery.sap.unloadResources(
				"sap/ui/core/sample/odata/v4/Sticky/StickySandbox.js",
				false /*bPreloadGroup*/, true /*bUnloadAll*/, true /*bDeleteExports*/);
		}
	});
});
