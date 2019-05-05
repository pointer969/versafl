sap.ui.define([
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/mvc/Controller'
], function(JSONModel, Controller) {
	'use strict';

	return Controller.extend('sap.uxap.sample.ObjectPageDynamicHeader.controller.ObjectPageDynamicHeader', {
		onInit: function () {
			var oJSONModel = new JSONModel('./test-resources/sap/uxap/demokit/sample/SharedJSONData/HRData.json');
			this.getView().setModel(oJSONModel, 'ObjectPageModel');
		}
	});
}, true);