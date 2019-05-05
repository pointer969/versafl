/* global QUnit*/
sap.ui.define([
	'sap/ui/core/util/MockServer',
	'sap/ui/model/odata/v2/ODataModel',
	'sap/m/Input'
], function (MockServer, ODataModel, Input) {
	"use strict";


	QUnit.module("Messaging End2End", {
		before: function () {
			var that = this;

			this.sServiceUri = "/SalesOrderSrv/";
			var sDataRootPath = "test-resources/sap/ui/core/qunit/testdata/SalesOrder/";


			//--- Mocking ----
			this.oMockServer = new MockServer({
				rootUri: this.sServiceUri
			});
			this.oMockServer.simulate(sDataRootPath + "metadata.xml", sDataRootPath);
			this.oMockServer.start();
			var aRequests = that.oMockServer.getRequests();

			var oMsgTemplate = {
				code: "MESSAGE/CODE",
				message: "Fatal error!",
				severity: "error"
			};

			var bCreateRequestFailure = true;

			aRequests.forEach(function (oRequest) {
				var sPath = String(oRequest.path);
				if (sPath.indexOf("$") == -1) {

					oRequest._fnOrginalResponse = oRequest.response;
					oRequest.response = function (oXhr) {
						oXhr._fnOrignalXHRRespond = oXhr.respond;
						oXhr.respond = function (status, headers, content) {
							var oMessages;
							if (oXhr.url.indexOf("SalesOrderLineItemSet(SalesOrderID='0500000000',ItemPosition='0000000010')/ToProduct") >= 0) {
								oMessages = Object.assign({}, oMsgTemplate);
							} else if (oXhr.url.indexOf("SalesOrderLineItemSet(SalesOrderID='0500000000',ItemPosition='0000000010')") >= 0) {
								oMessages = {
									code: "MESSAGE/CODE",
									message: "I'm just a container!",
									severity: "warning",
									target: "",
									details: [
										oMsgTemplate
									]
								};
							} else if (oXhr.url.indexOf("SalesOrderSet('0500000000')/ToLineItems") >= 0) {
								oMessages = {
									code: "MESSAGE/CODE",
									message: "I'm just a container!",
									severity: "warning",
									target: "",
									details: [
										Object.assign({ target: "(SalesOrderID='0500000000',ItemPosition='0000000010')" }, oMsgTemplate),
										Object.assign({ target: "(SalesOrderID='0500000000',ItemPosition='0000000040')" }, oMsgTemplate)
									]
								};
							} else if (oXhr.url.indexOf("SalesOrderSet('0500000000')") >= 0) {
								oMessages = {
									code: "MESSAGE/CODE",
									message: "I'm just a container!",
									severity: "warning",
									target: "",
									details: [
										oMsgTemplate,
										Object.assign({ target: "ToLineItems(SalesOrderID='0500000000',ItemPosition='0000000010')" }, oMsgTemplate),
										Object.assign({ target: "ToLineItems(SalesOrderID='0500000000',ItemPosition='0000000040')" }, oMsgTemplate)
									]
								};
							} else if (oXhr.url.indexOf("SalesOrderLineItemSet(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct") >= 0) {
								oMessages = {
									code: "MESSAGE/CODE",
									message: "I'm just a container!",
									severity: "warning",
									target: "",
									details: [
										Object.assign({ target: "ID" }, oMsgTemplate),
										Object.assign({ target: "Adress/ZIP" }, oMsgTemplate)
									]
								};
							} else if (oXhr.url.indexOf("SalesOrderSet") >= 0) {
								oMessages = {
									code: "MESSAGE/CODE",
									message: "I'm just a container!",
									severity: "warning",
									target: "",
									details: [
										Object.assign({ target: "('0500000001')/ToLineItems(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct/ID" }, oMsgTemplate),
										Object.assign({ target: "('0500000001')/ToLineItems(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct/Adress/ZIP" }, oMsgTemplate)
									]
								};
							} else if (oXhr.url.indexOf("ContactSet") >= 0) {
								if (bCreateRequestFailure){
									status = 400;
									content = JSON.stringify({
										error:{
											code: "MESSAGE/CODE",
											message: "Operation failed",
											severity: "error"
											}
									});
								}
								bCreateRequestFailure = !bCreateRequestFailure;
							}
							if (oMessages) {
								headers["sap-message"] = JSON.stringify(oMessages);
							}
							oXhr._fnOrignalXHRRespond.apply(this, [status, headers, content]);
						};
					};
				}
			});
			that.oMockServer.start();
		}, afterEach : function(){
			sap.ui.getCore().getMessageManager().removeAllMessages();
		}

	});

	var checkMessages = function(aMessages, assert){
		aMessages.forEach(function (oMsg) {
			if (oMsg.target === "/SalesOrderSet('0500000000')") {
				assert.equal(oMsg.fullTarget, "/SalesOrderSet('0500000000')");
			} else if (oMsg.target === "/SalesOrderSet('0500000000')/ToLineItems") {
				assert.equal(oMsg.fullTarget, "/SalesOrderSet('0500000000')/ToLineItems");
				assert.equal(oMsg.message, "I'm just a container!");
			} else if (oMsg.target === "/SalesOrderLineItemSet(SalesOrderID='0500000000',ItemPosition='0000000010')") {
				assert.equal(oMsg.fullTarget, "/SalesOrderSet('0500000000')/ToLineItems(SalesOrderID='0500000000',ItemPosition='0000000010')");
			} else if (oMsg.target === "/SalesOrderLineItemSet(SalesOrderID='0500000000',ItemPosition='0000000040')") {
				assert.equal(oMsg.fullTarget, "/SalesOrderSet('0500000000')/ToLineItems(SalesOrderID='0500000000',ItemPosition='0000000040')");
			} else if (oMsg.target === "/ProductSet('HT-1000')") {
				assert.equal(oMsg.fullTarget, "/SalesOrderSet('0500000000')/ToLineItems(SalesOrderID='0500000000',ItemPosition='0000000010')/ToProduct");
			} else {
				assert.ok(false, "Unexpected message target: " + oMsg.target);
			}
		});
	};

	QUnit.test("Canonical Paths - ODataMessageParser: Calculate targets with canonical request", function (assert) {
		var done = assert.async();
		var that = this;
		this.oModelCanonical = new ODataModel(this.sServiceUri, { canonicalRequests: true });

		this.oModelCanonical.metadataLoaded().then(function () {
			that.oModelCanonical.read("/SalesOrderSet('0500000000')");
			var fnRequestCompleted = function () {
				var oSalesOrderCtx = that.oModelCanonical.createBindingContext("/SalesOrderSet('0500000000')");
				that.oModelCanonical.read("ToLineItems", {
					context: oSalesOrderCtx,
					success: function () {
						var oSalesOrderLineItemSetCtx = that.oModelCanonical.createBindingContext("ToLineItems(SalesOrderID='0500000000',ItemPosition='0000000010')", oSalesOrderCtx);
						that.oModelCanonical.read("ToProduct", {
							context: oSalesOrderLineItemSetCtx,
							success: function () {
								var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().oData;
								assert.equal(aMessages.length, 4, "Correct message count.");
								checkMessages(aMessages, assert);
							}
						});
						done();
					}
				});
				that.oModelCanonical.detachBatchRequestCompleted(fnRequestCompleted);
			};
			that.oModelCanonical.attachBatchRequestCompleted(fnRequestCompleted);
		});
	});


	QUnit.test("Canonical Paths - ODataMessageParser: Not loaded entities", function (assert) {
		var done = assert.async();
		var that = this;
		this.oModelCanonical = new ODataModel(this.sServiceUri, { canonicalRequests: true });

		this.oModelCanonical.metadataLoaded().then(function () {
			that.oModelCanonical.read("/SalesOrderSet");
			var fnRequestCompleted = function () {
				var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().oData;
				assert.equal(aMessages.length, 3, "Correct message count.");
				assert.equal(aMessages[1].target, "/SalesOrderLineItemSet(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct/ID");
				assert.equal(aMessages[1].fullTarget, "/SalesOrderSet('0500000001')/ToLineItems(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct/ID");
				assert.equal(aMessages[2].target, "/SalesOrderLineItemSet(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct/Adress/ZIP");
				assert.equal(aMessages[2].fullTarget, "/SalesOrderSet('0500000001')/ToLineItems(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct/Adress/ZIP");
				done();
				that.oModelCanonical.detachBatchRequestCompleted(fnRequestCompleted);
			};
			that.oModelCanonical.attachBatchRequestCompleted(fnRequestCompleted);
		});
	});

	QUnit.test("Canonical Paths - ODataMessageParser: Not loaded entities properties", function (assert) {
		var done = assert.async();
		var that = this;
		this.oModelCanonical = new ODataModel(this.sServiceUri, { canonicalRequests: true });

		this.oModelCanonical.metadataLoaded().then(function () {
			that.oModelCanonical.read("/SalesOrderSet('0500000001')/ToLineItems(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct");
			var fnRequestCompleted = function () {
				var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().oData;
				assert.equal(aMessages.length, 3, "Correct message count.");
				assert.equal(aMessages[1].target, "/ProductSet('HT-1030')/ID");
				assert.equal(aMessages[1].fullTarget, "/SalesOrderSet('0500000001')/ToLineItems(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct/ID");
				assert.equal(aMessages[2].target, "/ProductSet('HT-1030')/Adress/ZIP");
				assert.equal(aMessages[2].fullTarget, "/SalesOrderSet('0500000001')/ToLineItems(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct/Adress/ZIP");
				done();
				that.oModelCanonical.detachBatchRequestCompleted(fnRequestCompleted);
			};
			that.oModelCanonical.attachBatchRequestCompleted(fnRequestCompleted);
		});
	});


	QUnit.test("Canonical Paths - ODataPropertyBinding: Propagation with deep paths", function(assert) {
		var done = assert.async();
		var oModel = new ODataModel(this.sServiceUri);

		oModel.createBindingContext("/SalesOrderLineItemSet(SalesOrderID='0500000001',ItemPosition='0000000010')", function(oContext) {
			var oInput = new Input({ value: "{ToProduct/ID}" });
			oInput.setBindingContext(oContext);
			sap.ui.getCore().getMessageManager().registerObject(oInput);
			oInput.setModel(oModel);

			oModel.read("/SalesOrderLineItemSet(SalesOrderID='0500000001',ItemPosition='0000000010')/ToProduct");

			var fnChangeHandler = function (oEvent) {
				oInput.getBinding("value").detachEvent("AggregatedDataStateChange", fnChangeHandler);
				assert.ok(true, "AggregatedDataStateChange event fired correctly.");
				var aModelMessages = oEvent.getParameter("dataState").getModelMessages();
				assert.equal(aModelMessages.length, 1, "Message propagated correctly.");
				assert.equal(aModelMessages[0].controlIds[0], oInput.getId(), "Control ID set");
				done();
			};

			oInput.getBinding("value").attachEvent("AggregatedDataStateChange", fnChangeHandler);
		});
	});

	QUnit.test("Affected Targets - ODataMessageParser._getAffectedTargets - Correct cleanup of newly created entries", function(assert){
		var done = assert.async();
		var oModel = new ODataModel(this.sServiceUri);

		var oCreateEntryProduct = {
			properties: {
				"FirstName":"My Name"
			}
		};

        oModel.metadataLoaded().then(function(){

			var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();

			oModel.createEntry("/ContactSet", oCreateEntryProduct);
			oModel.submitChanges({success: function(){
				assert.equal(oMessageModel.oData.length, 1, "One message with UID has been created.");
				assert.equal(oMessageModel.oData[0].target.indexOf("/ContactSet('id"), 0, "Message contains UID.");
				oModel.submitChanges({
					success: function(){
						assert.equal(oMessageModel.oData.length, 0, "Message with UID has been deleted.");
						done();
				}});
			}});
        });
    });

});