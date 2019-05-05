/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/*global location */
sap.ui.define([
		"jquery.sap.global",
		"sap/ui/documentation/sdk/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/documentation/sdk/controller/util/XML2JSONUtils",
		"sap/ui/Device",
		"sap/ui/documentation/sdk/util/ToggleFullScreenHandler"
	], function (jQuery, BaseController, JSONModel, XML2JSONUtils, Device, ToggleFullScreenHandler) {
		"use strict";

		return BaseController.extend("sap.ui.documentation.sdk.controller.TopicDetail", {


			/* =========================================================== */
			/* lifecycle methods										   */
			/* =========================================================== */

			onInit: function () {
				this.oPage = this.byId("topicDetailPage");
				this.oPage.addStyleClass('docuPage');

				if ( !window.prettyPrint ) {
					//TODO: global jquery call found
					jQuery.sap.require("sap.ui.documentation.sdk.thirdparty.google-code-prettify.prettify");
				}

				this.getRouter().getRoute("topicId").attachPatternMatched(this._onTopicMatched, this);
				this._oConfig = this.getConfig();

				this.jsonDefModel = new JSONModel();
				this.getView().setModel(this.jsonDefModel);
			},

			onBeforeRendering: function() {
				Device.orientation.detachHandler(this._onOrientationChange, this);
			},

			onAfterRendering: function() {
				Device.orientation.attachHandler(this._onOrientationChange, this);
			},

			onExit: function() {
				Device.orientation.detachHandler(this._onOrientationChange, this);
			},

			/* =========================================================== */
			/* begin: internal methods									 */
			/* =========================================================== */

			/**
			 * Binds the view to the object path and expands the aggregated line items.
			 * @function
			 * @param {sap.ui.base.Event} event pattern match event in route 'topicId'
			 * @private
			 */
			_onTopicMatched: function (event) {
				//TODO: global jquery call found
				var topicId = event.getParameter("arguments").id, topicURL = this._oConfig.docuPath + topicId + (topicId.match(/\.html/) ? "" : ".html"), htmlContent = jQuery.sap.syncGetText(topicURL).data, jsonObj;

				if (!htmlContent) {
					setTimeout(function () {
						this.getRouter().myNavToWithoutHash("sap.ui.documentation.sdk.view.NotFound", "XML", false);
					}.bind(this), 0);
					return;
				}

				jsonObj = XML2JSONUtils.XML2JSON(htmlContent, this._oConfig);
				jsonObj.topicURL = topicURL;
				jsonObj.iframeAttribute = Device.os.name === Device.os.OS.IOS ? ' scrolling="no" ' : "";
				jsonObj.bIsPhone = Device.system.phone;

				this.jsonDefModel.setData(jsonObj);

				this._scrollContentToTop();

				setTimeout(window.prettyPrint, 0);

				this.searchResultsButtonVisibilitySwitch(this.byId("topicDetailBackToSearch"));

				if (this.extHookonTopicMatched) {
					this.extHookonTopicMatched(topicId);
				}
			},

			_scrollContentToTop: function () {
				if (this.oPage && this.oPage.$().length > 0) {
					this.oPage.getScrollDelegate().scrollTo(0, 1);
				}
			},

			_formatHTML: function(html) {
				return '<div>' + html + '</div>';
			},

			backToSearch: function (text) {
				this.onNavBack();
			},

			onToggleFullScreen: function(oEvent) {
				ToggleFullScreenHandler.updateMode(oEvent, this.getView(), this);
			}

		});

	}
);
