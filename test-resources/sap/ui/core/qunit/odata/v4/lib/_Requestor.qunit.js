/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"jquery.sap.global",
	"sap/base/Log",
	"sap/ui/model/odata/v4/lib/_Batch",
	"sap/ui/model/odata/v4/lib/_GroupLock",
	"sap/ui/model/odata/v4/lib/_Helper",
	"sap/ui/model/odata/v4/lib/_Requestor",
	"sap/ui/test/TestUtils"
], function (jQuery, Log, _Batch, _GroupLock, _Helper, _Requestor, TestUtils) {
	/*global QUnit, sinon */
	/*eslint max-nested-callbacks: 0, no-warning-comments: 0 */
	"use strict";

	var sClassName = "sap.ui.model.odata.v4.lib._Requestor",
		oModelInterface = {
			fetchMetadata : function () {
				throw new Error("Do not call me!");
			},
			getGroupProperty : defaultGetGroupProperty,
			onCreateGroup : function () {},
			reportBoundMessages : function () {},
			reportUnboundMessages : function () {}
		},
		sServiceUrl = "/sap/opu/odata4/IWBEP/TEA/default/IWBEP/TEA_BUSI/0001/",
		sSampleServiceUrl
			= "/sap/opu/odata4/sap/zui5_testv4/default/sap/zui5_epm_sample/0002/";

	/**
	 * Creates a mock for jQuery's XHR wrapper.
	 *
	 * @param {object} assert
	 *   QUnit assert
	 * @param {object} oPayload
	 *   the response payload
	 * @param {string} sTextStatus
	 *   the XHR's status as text
	 * @param {object} mResponseHeaders
	 *   the header attributes of the response; supported header attributes are "Content-Type",
	 *   "DataServiceVersion", "OData-Version", "SAP-ContextId", "sap-messages" and "X-CSRF-Token"
	 *   all with default value <code>null</code>; if no response headers are given at all the
	 *   default value for "OData-Version" is "4.0";
	 * @returns {object}
	 *   a mock for jQuery's XHR wrapper
	 */
	function createMock(assert, oPayload, sTextStatus, mResponseHeaders) {
		var jqXHR = new jQuery.Deferred();

		Promise.resolve().then(function () {
			jqXHR.resolve(oPayload, sTextStatus, { // mock jqXHR for success handler
				getResponseHeader : function (sName) {
					mResponseHeaders = mResponseHeaders || {
							"OData-Version" : "4.0"
						};
					// Note: getResponseHeader treats sName case insensitive!
					switch (sName) {
					case "Content-Type":
						return mResponseHeaders["Content-Type"] || null;
					case "DataServiceVersion":
						return mResponseHeaders["DataServiceVersion"] || null;
					case "OData-Version":
						return mResponseHeaders["OData-Version"] || null;
					case "SAP-ContextId":
						return mResponseHeaders["SAP-ContextId"] || null;
					case "SAP-Http-Session-Timeout":
						return mResponseHeaders["SAP-Http-Session-Timeout"] || null;
					case "sap-messages":
						return mResponseHeaders["sap-messages"] || null;
					case "X-CSRF-Token":
						return mResponseHeaders["X-CSRF-Token"] || null;
					default:
						assert.ok(false, "unexpected getResponseHeader(" + sName + ")");
					}
				}
			});
		});

		return jqXHR;
	}

	/**
	 * Creates a response object as contained in the array returned by
	 * <code>_Batch.deserializeBatchResponse</code> without <code>status</code> and
	 * <code>statusText</code> from the given response body and response headers.
	 *
	 * @param {object} [oBody] the response body
	 * @param {object} [mHeaders={}] the map of response header name to response header value
	 * @returns {object} the response object
	 */
	function createResponse(oBody, mHeaders) {
		return {
			headers : mHeaders || {},
			responseText : oBody ? JSON.stringify(oBody) : ""
		};
	}

	/*
	 * Simulation of {@link sap.ui.model.odata.v4.ODataModel#getGroupProperty}
	 */
	function defaultGetGroupProperty(sGroupId, sPropertyName) {
		if (sPropertyName !== 'submit') {
			throw new Error("Unsupported property name: " + sPropertyName);
		}
		if (sGroupId === "$direct") {
			return "Direct";
		}
		if (sGroupId === "$auto") {
			return "Auto";
		}
		return "API";
	}

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4.lib._Requestor", {
		beforeEach : function () {
			this.oLogMock = this.mock(Log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();

			// workaround: Chrome extension "UI5 Inspector" calls this method which loads the
			// resource "sap-ui-version.json" and thus interferes with mocks for jQuery.ajax
			this.mock(sap.ui).expects("getVersionInfo").atLeast(0);
		}
	});

	//*********************************************************************************************
	QUnit.test("_Requestor is an object, not a constructor function", function (assert) {
		assert.strictEqual(typeof _Requestor, "object");
	});

	//*********************************************************************************************
	QUnit.test("constructor", function (assert) {
		var mHeaders = {},
			oHelperMock = this.mock(_Helper),
			mQueryParams = {},
			oRequestor;

		oHelperMock.expects("buildQuery")
			.withExactArgs(sinon.match.same(mQueryParams)).returns("?~");

		oRequestor = _Requestor.create(sServiceUrl, oModelInterface, mHeaders, mQueryParams);

		assert.deepEqual(oRequestor.mBatchQueue, {});
		assert.strictEqual(oRequestor.mHeaders, mHeaders);
		assert.strictEqual(oRequestor.oModelInterface, oModelInterface);
		assert.strictEqual(oRequestor.sQueryParams, "?~");
		assert.deepEqual(oRequestor.mRunningChangeRequests, {});
		assert.strictEqual(oRequestor.oSecurityTokenPromise, null);
		assert.strictEqual(oRequestor.iSessionTimer, 0);
		assert.strictEqual(oRequestor.iSerialNumber, 0);
		assert.strictEqual(oRequestor.sServiceUrl, sServiceUrl);

		oHelperMock.expects("buildQuery").withExactArgs(undefined).returns("");

		oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

		assert.deepEqual(oRequestor.mHeaders, {});
	});

	//*********************************************************************************************
	QUnit.test("destroy", function (assert) {
		var oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

		this.mock(oRequestor).expects("clearSessionContext").withExactArgs();

		// code under test
		oRequestor.destroy();
	});

	//*********************************************************************************************
	QUnit.test("getServiceUrl", function (assert) {
		var oRequestor = _Requestor.create(sServiceUrl, oModelInterface,
				{"foo" : "must be ignored"});

		// code under test
		assert.strictEqual(oRequestor.getServiceUrl(), sServiceUrl);
	});

	//*********************************************************************************************
	[{
		groupId : "$direct", submitMode : "Direct"
	}, {
		groupId : "$auto", submitMode : "Auto"
	}, {
		groupId : "unknown", submitMode : "API"
	}].forEach(function (oFixture) {
		QUnit.test("getGroupSubmitMode, success" + oFixture.groupId, function (assert) {
			var oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

			this.mock(oModelInterface).expects("getGroupProperty")
				.withExactArgs(oFixture.groupId, "submit")
				.returns(oFixture.submitMode);

			// code under test
			assert.strictEqual(oRequestor.getGroupSubmitMode(oFixture.groupId),
				oFixture.submitMode);
		});
	});

	//*********************************************************************************************
	[{
		sODataVersion : "4.0",
		mFinalHeaders : {
			"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true"
		},
		mPredefinedPartHeaders : {
			"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true"
		},
		mPredefinedRequestHeaders : {
			"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true",
			"OData-MaxVersion" : "4.0",
			"OData-Version" : "4.0",
			"X-CSRF-Token" : "Fetch"
		}
	}, {
		sODataVersion : "2.0",
		mFinalHeaders : {
			"Content-Type" : "application/json;charset=UTF-8"
		},
		mPredefinedPartHeaders : {
			"Accept" : "application/json"
		},
		mPredefinedRequestHeaders : {
			"Accept" : "application/json",
			"MaxDataServiceVersion" : "2.0",
			"DataServiceVersion" : "2.0",
			"X-CSRF-Token" : "Fetch"
		}
	}].forEach(function (oFixture) {
		var sTest = "factory function: check members for OData version = " + oFixture.sODataVersion;

		QUnit.test(sTest, function (assert) {
			var sBuildQueryResult = "foo",
				mHeaders = {},
				mQueryParams = {},
				oRequestor;

			this.mock(_Helper).expects("buildQuery")
				.withExactArgs(mQueryParams)
				.returns(sBuildQueryResult);

			// code under test
			oRequestor = _Requestor.create(sServiceUrl, oModelInterface, mHeaders, mQueryParams,
				oFixture.sODataVersion);

			assert.strictEqual(oRequestor.getServiceUrl(), sServiceUrl, "parameter sServiceUrl");
			assert.strictEqual(oRequestor.mHeaders, mHeaders, "parameter mHeaders");
			assert.strictEqual(oRequestor.sQueryParams, sBuildQueryResult,
				"parameter mQueryParams");
			assert.strictEqual(oRequestor.oModelInterface, oModelInterface);
			// OData version specific header maps
			assert.deepEqual(oRequestor.mFinalHeaders, oFixture.mFinalHeaders, "mFinalHeaders");
			assert.deepEqual(oRequestor.mPredefinedPartHeaders, oFixture.mPredefinedPartHeaders,
				"mPredefinedPartHeaders");
			assert.deepEqual(oRequestor.mPredefinedRequestHeaders,
				oFixture.mPredefinedRequestHeaders, "mPredefinedRequestHeaders");
		});
	});

	//*********************************************************************************************
	QUnit.test("factory function: check members; default values", function (assert) {
		var mFinalHeaders = {
				"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true"
			},
			mPredefinedPartHeaders = {
				"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true"
			},
			mPredefinedRequestHeaders = {
				"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true",
				"OData-MaxVersion" : "4.0",
				"OData-Version" : "4.0",
				"X-CSRF-Token" : "Fetch"
			},
			oRequestor;

		// code under test
		oRequestor = _Requestor.create(sServiceUrl);

		assert.strictEqual(oRequestor.getServiceUrl(), sServiceUrl, "parameter sServiceUrl");
		assert.deepEqual(oRequestor.mHeaders, {}, "parameter mHeaders");
		assert.strictEqual(oRequestor.sQueryParams, "", "parameter mQueryParams");
		assert.strictEqual(oRequestor.onCreateGroup, undefined, "parameter onCreateGroup");
		// OData version specific header maps
		assert.deepEqual(oRequestor.mFinalHeaders, mFinalHeaders, "mFinalHeaders");
		assert.deepEqual(oRequestor.mPredefinedPartHeaders, mPredefinedPartHeaders,
			"mPredefinedPartHeaders");
		assert.deepEqual(oRequestor.mPredefinedRequestHeaders, mPredefinedRequestHeaders,
			"mPredefinedRequestHeaders");
	});

	//*********************************************************************************************
	[{
		iRequests : 1, sRequired : null, bRequestSucceeds : true, sTitle : "success"
	}, {
		// simulate a server which does not require a CSRF token, but fails with 403
		iRequests : 1, sRequired : null, bRequestSucceeds : false, sTitle : "failure with 403"
	}, {
		// simulate a server which does not require a CSRF token, but fails otherwise
		iRequests : 1,
		sRequired : "Required",
		bRequestSucceeds : false,
		iStatus : 500,
		sTitle : "failure with 500"
	}, {
		iRequests : 2, sRequired : "Required", sTitle : "CSRF token Required"
	}, {
		iRequests : 2, sRequired : "required", sTitle : "CSRF token required"
	}, {
		iRequests : 1, sRequired : "Required", bReadFails : true, sTitle : "fetch CSRF token fails"
	}, {
		iRequests : 2,
		sRequired : "Required",
		bDoNotDeliverToken : true,
		sTitle : "no CSRF token can be fetched"
	}].forEach(function (o) {
		QUnit.test("sendRequest: " + o.sTitle, function (assert) {
			var oError = {},
				oExpectation,
				mHeaders = {},
				oHelperMock = this.mock(_Helper),
				oReadFailure = {},
				oRequestor = _Requestor.create("/Service/", oModelInterface,
					{"X-CSRF-Token" : "Fetch"}),
				mResolvedHeaders = {"foo" : "bar"},
				oResponsePayload = {},
				bSuccess = o.bRequestSucceeds !== false && !o.bReadFails && !o.bDoNotDeliverToken,
				oTokenRequiredResponse = {
					getResponseHeader : function (sName) {
						// Note: getResponseHeader treats sName case insensitive!
						switch (sName) {
							case "SAP-ContextId" : return null;
							case "SAP-Err-Id" : return null;
							case "SAP-Http-Session-Timeout" : return null;
							case "X-CSRF-Token" : return o.sRequired;
							default: assert.ok(false, "unexpected header " + sName);
						}
					},
					"status" : o.iStatus || 403
				};

			oHelperMock.expects("createError")
				.exactly(bSuccess || o.bReadFails ? 0 : 1)
				.withExactArgs(sinon.match.same(oTokenRequiredResponse), "Communication error",
					"/Service/foo", "original/path")
				.returns(oError);
			oHelperMock.expects("resolveIfMatchHeader").exactly(o.iRequests)
				.withExactArgs(sinon.match.same(mHeaders))
				.returns(mResolvedHeaders);

			// With <code>bRequestSucceeds === false</code>, "request" always fails,
			// with <code>bRequestSucceeds === true</code>, "request" always succeeds,
			// else "request" first fails due to missing CSRF token which can be fetched via
			// "ODataModel#refreshSecurityToken".
			this.mock(jQuery).expects("ajax").exactly(o.iRequests)
				.withExactArgs("/Service/foo", sinon.match({
					data : "payload",
					headers : mResolvedHeaders,
					method : "FOO"
				}))
				.callsFake(function (sUrl, oSettings) {
					var jqXHR;

					if (o.bRequestSucceeds === true
						|| o.bRequestSucceeds === undefined
						&& oSettings.headers["X-CSRF-Token"] === "abc123") {
						jqXHR = createMock(assert, oResponsePayload, "OK", {
							"Content-Type" : "application/json",
							"OData-Version" : "4.0",
							"sap-messages" : "[{code : 42}]"
						});
					} else {
						jqXHR = new jQuery.Deferred();
						setTimeout(function () {
							jqXHR.reject(oTokenRequiredResponse);
						}, 0);
					}

					return jqXHR;
				});

			oExpectation = this.mock(oRequestor).expects("refreshSecurityToken")
				.withExactArgs("Fetch");
			if (o.bRequestSucceeds !== undefined) {
				oExpectation.never();
			} else {
				oExpectation.callsFake(function (sOldSecurityToken) {
					return new Promise(function (fnResolve, fnReject) {
						setTimeout(function () {
							if (o.bReadFails) { // reading of CSRF token fails
								fnReject(oReadFailure);
							} else {
								// HEAD might succeed, but not deliver a valid CSRF token
								oRequestor.mHeaders["X-CSRF-Token"]
									= o.bDoNotDeliverToken ? undefined : "abc123";
								fnResolve();
							}
						}, 0);
					});
				});
			}

			return oRequestor.sendRequest("FOO", "foo", mHeaders, "payload", "original/path")
				.then(function (oPayload) {
					assert.ok(bSuccess, "success possible");
					assert.strictEqual(oPayload.contentType, "application/json");
					assert.strictEqual(oPayload.body, oResponsePayload);
					assert.strictEqual(oPayload.messages, "[{code : 42}]");
					assert.strictEqual(oPayload.resourcePath, "foo");
				}, function (oError0) {
					assert.ok(!bSuccess, "certain failure");
					assert.strictEqual(oError0, o.bReadFails ? oReadFailure : oError);
				});
		});
	});

	//*********************************************************************************************
	["NOTGET", "GET"].forEach(function (sMethod, i) {
		var sTitle = "sendRequest: wait for CSRF token if method is not GET, " + i;

		QUnit.test(sTitle, function (assert) {
			var oPromise,
				oRequestor = _Requestor.create(sServiceUrl, oModelInterface),
				oResult = {},
				oSecurityTokenPromise = new Promise(function (fnResolve, fnReject) {
					setTimeout(function () {
						oRequestor.mHeaders["X-CSRF-Token"] = "abc123";
						fnResolve();
					}, 0);
				});

			// security token already requested by #refreshSecurityToken
			oRequestor.oSecurityTokenPromise = oSecurityTokenPromise;

			this.mock(jQuery).expects("ajax")
				.withExactArgs(sServiceUrl + "Employees?foo=bar", {
					data : "payload",
					headers : sinon.match({
						"X-CSRF-Token" : sMethod === "GET" ? "Fetch" : "abc123"
					}),
					method : sMethod
				}).returns(createMock(assert, oResult, "OK"));

			// code under test
			oPromise = oRequestor.sendRequest(sMethod, "Employees?foo=bar", {}, "payload");

			return Promise.all([oPromise, oSecurityTokenPromise]);
		});
	});

	//*********************************************************************************************
	QUnit.test("sendRequest: fail, unsupported OData service version", function (assert) {
		var oError = {},
			oRequestor = _Requestor.create("/", oModelInterface),
			oRequestorMock = this.mock(oRequestor);

		this.mock(jQuery).expects("ajax")
			.withArgs("/Employees")
			.returns(createMock(assert, {}, "OK"));
		oRequestorMock.expects("doCheckVersionHeader")
			.withExactArgs(sinon.match.func, "Employees", false)
			.throws(oError);
		oRequestorMock.expects("doConvertResponse").never();

		// code under test
		return oRequestor.sendRequest("GET", "Employees")
			.then(function (result) {
				assert.notOk("Unexpected success");
			}, function (oError0) {
				assert.strictEqual(oError0, oError);
			});
	});

	//*********************************************************************************************
	QUnit.test("sendRequest(), store CSRF token from server", function (assert) {
		var oRequestor = _Requestor.create("/", oModelInterface);

		this.mock(jQuery).expects("ajax")
			.withExactArgs("/", sinon.match({headers : {"X-CSRF-Token" : "Fetch"}}))
			.returns(createMock(assert, {/*oPayload*/}, "OK", {
				"OData-Version" : "4.0",
				"X-CSRF-Token" : "abc123"
			}));

		return oRequestor.sendRequest("GET", "").then(function () {
			assert.strictEqual(oRequestor.mHeaders["X-CSRF-Token"], "abc123");
		});
	});

	//*********************************************************************************************
	QUnit.test("sendRequest(): setSessionContext", function (assert) {
		var oJQueryMock = this.mock(jQuery),
			oRequestor = _Requestor.create("/", oModelInterface),
			oRequestorMock = this.mock(oRequestor);

		oJQueryMock.expects("ajax")
			.withExactArgs("/", sinon.match.object)
			.returns(createMock(assert, {/*oPayload*/}, "OK", {
				"OData-Version" : "4.0",
				"SAP-ContextId" : "abc123",
				"SAP-Http-Session-Timeout" : "120"
			}));
		oRequestorMock.expects("setSessionContext").withExactArgs("abc123", "120");

		// code under test
		return oRequestor.sendRequest("GET", "");
	});

	//*********************************************************************************************
	[false, true].forEach(function (bErrorId, i) {
		QUnit.test("sendRequest(): error & session, bErrorId=" + bErrorId, function (assert) {
			var oJQueryMock = this.mock(jQuery),
				oRequestor = _Requestor.create("/", oModelInterface),
				that = this;

			oJQueryMock.expects("ajax")
				.withExactArgs("/", sinon.match.object)
				.returns(createMock(assert, {/*oPayload*/}, "OK", {
					"OData-Version" : "4.0",
					"SAP-ContextId" : "abc123"
				}));

			// code under test
			return oRequestor.sendRequest("GET", "").then(function () {
				var oExpectedError = new Error(),
					jqXHRMock;

				assert.strictEqual(oRequestor.mHeaders["SAP-ContextId"], "abc123");

				jqXHRMock = new jQuery.Deferred();
				setTimeout(function () {
					jqXHRMock.reject({
						getResponseHeader : function (sName) {
							switch (sName) {
								case "SAP-ContextId": return null;
								case "SAP-Err-Id" : return bErrorId ? "ICMENOSESSION" : null;
								case "X-CSRF-Token" : return null;
								default : assert.ok(false, "unexpected header " + sName);
							}
						},
						"status" : 500
					});
				}, 0);
				oJQueryMock.expects("ajax")
					.withExactArgs("/", sinon.match({headers : {"SAP-ContextId" : "abc123"}}))
					.returns(jqXHRMock);
				that.oLogMock.expects("error").exactly(bErrorId ? 1 : 0)
					.withExactArgs("Session not found on server", undefined, sClassName);
				that.mock(oRequestor).expects("clearSessionContext").exactly(bErrorId ? 1 : 0)
					.withExactArgs();
				that.mock(_Helper).expects("createError")
					.withExactArgs(sinon.match.object,
						bErrorId ? "Session not found on server" : "Communication error",
						"/", undefined)
					.returns(oExpectedError);

				// code under test
				return oRequestor.sendRequest("GET", "").then(function () {
					assert.ok(false);
				}, function (oError) {
					assert.strictEqual(oError, oExpectedError);
				});
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("sendRequest(): error in session", function (assert) {
		var oJQueryMock = this.mock(jQuery),
			oRequestor = _Requestor.create("/", oModelInterface),
			that = this;

		oJQueryMock.expects("ajax")
			.withExactArgs("/", sinon.match.object)
			.returns(createMock(assert, {/*oPayload*/}, "OK", {
				"OData-Version" : "4.0",
				"SAP-ContextId" : "abc123"
			}));

		// code under test
		return oRequestor.sendRequest("GET", "").then(function () {
			var oExpectedError = new Error(),
				jqXHRMock = new jQuery.Deferred();

			setTimeout(function () {
				jqXHRMock.reject({
					getResponseHeader : function (sName) {
						switch (sName) {
							case "SAP-ContextId": return "abc123";
							case "SAP-Http-Session-Timeout": return "42";
							case "X-CSRF-Token" : return null;
							default : assert.ok(false, "unexpected header " + sName);
						}
					},
					"status" : 500
				});
			}, 0);
			oJQueryMock.expects("ajax")
				.withExactArgs("/", sinon.match({headers : {"SAP-ContextId" : "abc123"}}))
				.returns(jqXHRMock);
			that.mock(oRequestor).expects("setSessionContext")
				.withExactArgs("abc123", "42");
			that.mock(_Helper).expects("createError").returns(oExpectedError);

			// code under test
			return oRequestor.sendRequest("GET", "").then(function () {
				assert.ok(false);
			}, function (oError) {
				assert.strictEqual(oError, oExpectedError);
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("sendRequest(), keep old CSRF token in case none is sent", function (assert) {
		var oRequestor = _Requestor.create("/", oModelInterface, {"X-CSRF-Token" : "abc123"});

		this.mock(jQuery).expects("ajax")
			.withExactArgs("/", sinon.match({headers : {"X-CSRF-Token" : "abc123"}}))
			.returns(createMock(assert, {/*oPayload*/}, "OK"));

		return oRequestor.sendRequest("GET", "").then(function () {
			assert.strictEqual(oRequestor.mHeaders["X-CSRF-Token"], "abc123");
		});
	});

	//*********************************************************************************************
	QUnit.test("sendRequest(), keep fetching CSRF token in case none is sent", function (assert) {
		var oMock = this.mock(jQuery),
			oRequestor = _Requestor.create("/", oModelInterface);

		oMock.expects("ajax")
			.withExactArgs("/", sinon.match({headers : {"X-CSRF-Token" : "Fetch"}}))
			.returns(createMock(assert, {/*oPayload*/}, "OK"));

		return oRequestor.sendRequest("GET", "").then(function () {
			oMock.expects("ajax")
				.withExactArgs("/", sinon.match({headers : {"X-CSRF-Token" : "Fetch"}}))
				.returns(createMock(assert, {/*oPayload*/}, "OK"));

			return oRequestor.sendRequest("GET", "");
		});
	});

	//*********************************************************************************************
	// Integrative test simulating parallel POST requests: Both got a 403 token "required",
	// but the second not until the first already has completed fetching a new token,
	// here the second can simply reuse the already fetched token
	QUnit.test("sendRequest(): parallel POST requests, fetch HEAD only once", function (assert) {
		var bFirstRequest = true,
			jqFirstTokenXHR = createMock(assert, {}, "OK", {
				"OData-Version" : "4.0",
				"X-CSRF-Token" : "abc123"
			}),
			iHeadRequestCount = 0,
			oRequestor = _Requestor.create("/Service/", oModelInterface);

		this.mock(jQuery).expects("ajax").atLeast(1).callsFake(function (sUrl0, oSettings) {
			var jqXHR,
				oTokenRequiredResponse = {
					getResponseHeader : function (sName) {
						return "required";
					},
					"status" : 403
				};

			if (oSettings.method === "HEAD") {
				jqXHR = jqFirstTokenXHR;
				iHeadRequestCount += 1;
			} else if (oSettings.headers["X-CSRF-Token"] === "abc123") {
				jqXHR = createMock(assert, {}, "OK");
			} else {
				jqXHR = new jQuery.Deferred();
				if (bFirstRequest) {
					jqXHR.reject(oTokenRequiredResponse);
					bFirstRequest = false;
				} else {
					// Ensure that the second POST request is rejected after the first one already
					// has requested and received a token
					jqFirstTokenXHR.then(setTimeout(function () {
						// setTimeout needed here because .then comes first
						jqXHR.reject(oTokenRequiredResponse);
					}, 0));
				}
			}
			return jqXHR;
		});

		// code under test
		return Promise.all([
			oRequestor.sendRequest("POST"),
			oRequestor.sendRequest("POST")
		]).then(function () {
			assert.strictEqual(iHeadRequestCount, 1, "fetch HEAD only once");
		});
	});

	//*********************************************************************************************
	[undefined, new _GroupLock("$direct")].forEach(function (oGroupLock) {
		QUnit.test("request: oGroupLock=" + oGroupLock, function (assert) {
			var fnCancel = this.spy(),
				oChangedPayload = {"foo" : 42},
				oConvertedResponse = {},
				oPayload = {},
				oPromise,
				oRequestor = _Requestor.create(sServiceUrl, oModelInterface, undefined, {
					"foo" : "URL params are ignored for normal requests"
				}),
				oResponse = {body : {}, messages : {}, resourcePath : "Employees?custom=value"},
				fnSubmit = this.spy();

			if (oGroupLock) {
				this.mock(oGroupLock).expects("unlock").withExactArgs();
			}
			this.mock(oRequestor).expects("convertResourcePath")
				.withExactArgs("Employees?custom=value")
				.returns("~Employees~?custom=value");
			this.mock(_Requestor).expects("cleanPayload")
				.withExactArgs(sinon.match.same(oPayload)).returns(oChangedPayload);
			this.mock(oRequestor).expects("sendRequest")
				.withExactArgs("METHOD", "~Employees~?custom=value", {
						"header" : "value",
						"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true"
					}, JSON.stringify(oChangedPayload), "~Employees~?custom=value")
				.resolves(oResponse);
			this.mock(oRequestor).expects("reportUnboundMessagesAsJSON")
				.withExactArgs(oResponse.resourcePath, sinon.match.same(oResponse.messages));
			this.mock(oRequestor).expects("doConvertResponse")
				.withExactArgs(sinon.match.same(oResponse.body), "meta/path")
				.returns(oConvertedResponse);

			// code under test
			oPromise = oRequestor.request("METHOD", "Employees?custom=value", oGroupLock, {
				"header" : "value",
				"Content-Type" : "wrong"
			}, oPayload, fnSubmit, fnCancel, "meta/path");

			return oPromise.then(function (oResult) {
				assert.strictEqual(oResult, oConvertedResponse);

				sinon.assert.calledOnce(fnSubmit);
				sinon.assert.notCalled(fnCancel);
			});
		});
	});

	//*********************************************************************************************
	[{ // predefined headers can be overridden, but are not modified for later
		defaultHeaders : {"Accept" : "application/json;odata.metadata=full;IEEE754Compatible=true"},
		requestHeaders : {"OData-MaxVersion" : "5.0", "OData-Version" : "4.1"},
		result : {
			"Accept" : "application/json;odata.metadata=full;IEEE754Compatible=true",
			"OData-MaxVersion" : "5.0",
			"OData-Version" : "4.1"
		}
	}, {
		defaultHeaders : undefined,
		requestHeaders : undefined,
		result : {}
	}, {
		defaultHeaders : {"Accept-Language" : "ab-CD"},
		requestHeaders : undefined,
		result : {"Accept-Language" : "ab-CD"}
	}, {
		defaultHeaders : undefined,
		requestHeaders : {"Accept-Language" : "ab-CD"},
		result : {"Accept-Language" : "ab-CD"}
	}, {
		defaultHeaders : {"Accept-Language" : "ab-CD"},
		requestHeaders : {"foo" : "bar"},
		result : {"Accept-Language" : "ab-CD", "foo" : "bar"}
	}].forEach(function (mHeaders) {
		QUnit.test("request, headers: " + JSON.stringify(mHeaders), function (assert) {
			var mDefaultHeaders = clone(mHeaders.defaultHeaders),
				oPromise,
				mRequestHeaders = clone(mHeaders.requestHeaders),
				oRequestor = _Requestor.create(sServiceUrl, oModelInterface, mDefaultHeaders),
				oResult = {},
				// add predefined request headers for OData V4
				mResultHeaders = jQuery.extend({}, {
					"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true",
					"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true",
					"OData-MaxVersion" : "4.0",
					"OData-Version" : "4.0",
					"X-CSRF-Token" : "Fetch"
				}, mHeaders.result);

			function clone(o) {
				return o && JSON.parse(JSON.stringify(o));
			}

			this.mock(jQuery).expects("ajax")
				.withExactArgs(sServiceUrl + "Employees", {
					data : undefined,
					headers : mResultHeaders,
					method : "GET"
				}).returns(createMock(assert, oResult, "OK"));

			// code under test
			oPromise = oRequestor.request("GET", "Employees", undefined, mRequestHeaders);

			assert.deepEqual(mDefaultHeaders, mHeaders.defaultHeaders,
				"caller's map is unchanged");
			assert.deepEqual(mRequestHeaders, mHeaders.requestHeaders,
				"caller's map is unchanged");
			assert.ok(oPromise instanceof Promise);
			return oPromise.then(function (result) {
				assert.strictEqual(result, oResult);
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("request, onCreateGroup", function (assert) {
		var oRequestor = _Requestor.create("/", oModelInterface);

		this.mock(oModelInterface).expects("onCreateGroup").withExactArgs("groupId");

		// code under test
		oRequestor.request("GET", "SalesOrders", new _GroupLock("groupId"));
		oRequestor.request("GET", "SalesOrders", new _GroupLock("groupId"));
	});

	//*********************************************************************************************
	QUnit.test("request, getGroupProperty", function (assert) {
		var oGroupLock = new _GroupLock("groupId"),
			oModelInterface = {
				getGroupProperty : defaultGetGroupProperty,
				onCreateGroup : null // optional
			},
			oRequestor = _Requestor.create("/", oModelInterface);

		this.mock(oModelInterface).expects("getGroupProperty")
			.withExactArgs("groupId", "submit")
			.returns("API");

		// code under test
		oRequestor.request("GET", "SalesOrders", oGroupLock);
	});

	//*********************************************************************************************
	QUnit.test("request, getOrCreateBatchQueue", function (assert) {
		var oRequestor = _Requestor.create("/", oModelInterface),
			aRequests = [];

		this.mock(oRequestor).expects("getOrCreateBatchQueue")
			.withExactArgs("groupId")
			.returns(aRequests);

		// code under test
		oRequestor.request("GET", "SalesOrders", new _GroupLock("groupId"));

		assert.strictEqual(aRequests.length, 1);
		assert.strictEqual(aRequests[0].method, "GET");
	});

	//*********************************************************************************************
	[{
		sODataVersion : "2.0",
		mExpectedRequestHeaders : {
			"Accept" : "application/json",
			"Content-Type" : "application/json;charset=UTF-8",
			"DataServiceVersion" : "2.0",
			"MaxDataServiceVersion" : "2.0",
			"X-CSRF-Token" : "Fetch"
		}
	}, {
		sODataVersion : "4.0",
		mExpectedRequestHeaders : {
			"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true",
			"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true",
			"OData-MaxVersion" : "4.0",
			"OData-Version" : "4.0",
			"X-CSRF-Token" : "Fetch"
		}
	}].forEach(function (oFixture) {
		var sTitle = "request: OData version specific headers for $direct; sODataVersion = "
				+ oFixture.sODataVersion;

		QUnit.test(sTitle, function (assert) {
			var oConvertedResponse = {},
				sMetaPath = "~",
				oRequestor = _Requestor.create(sServiceUrl, oModelInterface, undefined, undefined,
					oFixture.sODataVersion),
				oRequestorMock = this.mock(oRequestor),
				oResponsePayload = {};

			this.mock(jQuery).expects("ajax")
				.withExactArgs(sServiceUrl + "Employees", {
					data : undefined,
					headers : sinon.match(oFixture.mExpectedRequestHeaders),
					method : "GET"
				}).returns(createMock(assert, oResponsePayload, "OK"));
			oRequestorMock.expects("doCheckVersionHeader")
				.withExactArgs(sinon.match.func, "Employees", false);
			oRequestorMock.expects("doConvertResponse")
				.withExactArgs(oResponsePayload, sMetaPath)
				.returns(oConvertedResponse);

			// code under test
			// we do not test sendRequest() because "Content-Type" is added by request()
			return oRequestor.request("GET", "Employees", undefined, undefined, undefined,
					undefined, undefined, sMetaPath)
				.then(function (result) {
					assert.strictEqual(result, oConvertedResponse);
				});
		});
	});

	//*********************************************************************************************
	QUnit.test("sendRequest: optional OData-Version header for empty response", function (assert) {
		var oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

		this.mock(jQuery).expects("ajax")
			.withExactArgs(sServiceUrl + "SalesOrderList('0500000676')", sinon.match.object)
			.returns(createMock(assert, undefined, "No Content", {}));
		this.mock(oRequestor).expects("doCheckVersionHeader")
			.withExactArgs(sinon.match.func, "SalesOrderList('0500000676')", true);

		// code under test
		return oRequestor.request("DELETE", "SalesOrderList('0500000676')")
			.then(function (oResult) {
				assert.strictEqual(oResult, undefined);
			});
	});

	//*********************************************************************************************
	QUnit.test("request: fail to convert payload, $direct", function (assert) {
		var oError = {},
			oRequestor = _Requestor.create(sServiceUrl, oModelInterface, undefined, undefined,
				"2.0"),
			oResponsePayload = {};

		this.mock(jQuery).expects("ajax")
			.withArgs(sServiceUrl + "Employees")
			.returns(createMock(assert, oResponsePayload, "OK", {"DataServiceVersion" : "2.0"}));
		this.mock(oRequestor).expects("doConvertResponse")
			.withExactArgs(oResponsePayload, undefined)
			.throws(oError);

		// code under test
		return oRequestor.request("GET", "Employees")
			.then(function (result) {
				assert.notOk("Unexpected success");
			}, function (oError0) {
				assert.strictEqual(oError0, oError);
			});
	});

	//*********************************************************************************************
	QUnit.test("request: sOriginalPath, $direct", function (assert) {
		var sOriginalPath = "TEAM('0')/TEAM_2_EMPLOYEES",
			oRequestor = _Requestor.create("/", oModelInterface);

		this.mock(oRequestor).expects("sendRequest")
			.withExactArgs("POST", "EMPLOYEES", sinon.match.object, sinon.match.string,
				sOriginalPath)
			.returns(Promise.resolve({}));

		// code under test
		return oRequestor.request("POST", "EMPLOYEES", new _GroupLock("$direct"), {}, {}, undefined,
			undefined, undefined, sOriginalPath);
	});

	//*********************************************************************************************
	QUnit.test("request: sOriginalPath, $batch", function (assert) {
		var sOriginalPath = "TEAM('0')/TEAM_2_EMPLOYEES",
			oRequestor = _Requestor.create("/", oModelInterface),
			oResponse = {
				status : 500
			};

		this.mock(oRequestor).expects("sendBatch")
			// do not check parameters
			.returns(Promise.resolve([oResponse]));
		this.mock(_Helper).expects("createError")
			.withExactArgs(sinon.match.same(oResponse), "Communication error", "EMPLOYEES",
				sOriginalPath)
			.returns(new Error());

		// code under test
		return Promise.all([
			oRequestor.request("POST", "EMPLOYEES", new _GroupLock("group"), {}, {}, undefined,
				undefined, undefined, sOriginalPath).catch(function () {}),
			oRequestor.submitBatch("group")
		]);
	});

	//*********************************************************************************************
	QUnit.test("request(...): batch group id and change sets", function (assert) {
		var oGroupLock = new _GroupLock("group"),
			oGroupLock2,
			oRequestor = _Requestor.create("/", oModelInterface);

		this.mock(oGroupLock).expects("unlock").withExactArgs();
		oRequestor.request("PATCH", "EntitySet1", oGroupLock, {"foo" : "bar"},
			{"a" : "b"});
		oRequestor.request("PATCH", "EntitySet2", new _GroupLock("group"), {"bar" : "baz"},
			{"c" : "d"});
		oRequestor.request("PATCH", "EntitySet3", new _GroupLock("$auto"), {"header" : "value"},
			{"e" : "f"});
		oRequestor.request("PATCH", "EntitySet4", new _GroupLock("$auto"), {"header" : "beAtFront"},
			{"g" : "h"}, undefined, undefined, undefined, undefined, /*bAtFront*/true);
		oRequestor.request("GET", "EntitySet5", new _GroupLock("$auto"));
		oRequestor.request("GET", "EntitySet6", new _GroupLock("$auto"), undefined, undefined,
			undefined, undefined, undefined, undefined, /*bAtFront*/true);
		oGroupLock2 = new _GroupLock("group", true, "owner", oRequestor.getSerialNumber());
		oRequestor.addChangeSet("group");
		oRequestor.request("PATCH", "EntitySet7",
			new _GroupLock("group", true, "owner", oRequestor.getSerialNumber()),
			{"serialNumber" : "after change set 1"}, {"i" : "j"});
		oRequestor.request("PATCH", "EntitySet8", oGroupLock2,
			{"serialNumber" : "before change set 1"}, {"k" : "l"});
		oRequestor.request("PATCH", "EntitySet9", new _GroupLock("group"),
			{"serialNumber" : "not set -> last change set"}, {"m" : "n"});

		TestUtils.deepContains(oRequestor.mBatchQueue, {
			"group" : [
				[/*change set 0*/{
					method : "PATCH",
					url : "EntitySet1",
					headers : {
						"foo" : "bar"
					},
					body : {"a" : "b"}
				}, {
					method : "PATCH",
					url : "EntitySet2",
					headers : {
						"bar" : "baz"
					},
					body : {"c" : "d"}
				}, {
					method : "PATCH",
					url : "EntitySet8",
					headers : {
						"serialNumber" : "before change set 1"
					},
					body : {"k" : "l"}
				}],
				[/*change set 1*/{
					method : "PATCH",
					url : "EntitySet7",
					headers : {
						"serialNumber" : "after change set 1"
					},
					body : {"i" : "j"}
				}, {
					method : "PATCH",
					url : "EntitySet9",
					headers : {
						"serialNumber" : "not set -> last change set"
					},
					body : {"m" : "n"}
				}]
			],
			"$auto" : [
				[/*change set!*/{
					method : "PATCH",
					url : "EntitySet4",
					headers : {
						"header" : "beAtFront"
					},
					body : {"g" : "h"}
				}, {
					method : "PATCH",
					url : "EntitySet3",
					headers : {
						"header" : "value"
					},
					body : {"e" : "f"}
				}], {
					method : "GET",
					url : "EntitySet5"
				}, { // bAtFront is ignored for GET
					method : "GET",
					url : "EntitySet6"
				}
			]
		});
	});

	//*********************************************************************************************
	QUnit.test("submitBatch: fail, unsupported OData service version", function (assert) {
		var oError = {},
			oGetProductsPromise,
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oRequestorMock = this.mock(oRequestor),
			oResponse = {
				headers : {
					"Content-Length" : "42",
					"OData-Version" : "foo"
				},
				responseText : JSON.stringify({d : {foo : "bar"}})
			};

		oRequestorMock.expects("doConvertResponse").never();
		oGetProductsPromise = oRequestor.request("GET", "Products", new _GroupLock("group1"))
			.then(function () {
				assert.notOk("Unexpected success");
			}, function (oError0) {
				assert.strictEqual(oError0, oError);
			});
		oRequestorMock.expects("sendBatch").resolves([oResponse]); // arguments don't matter
		oRequestorMock.expects("doCheckVersionHeader")
			.withExactArgs(sinon.match(function (fnGetResponseHeader) {
				assert.strictEqual(typeof fnGetResponseHeader, "function");
				assert.strictEqual(fnGetResponseHeader("OData-Version"), "foo",
					"getResponseHeader has to be called on mResponse");
				return true;
			}), "Products", true)
			.throws(oError);

		return Promise.all([oGetProductsPromise, oRequestor.submitBatch("group1")]);
	});

	//*********************************************************************************************
	[false, true].forEach(function (bSuccess) {
		QUnit.test("refreshSecurityToken: success = " + bSuccess, function (assert) {
			var oError = {},
				oPromise,
				oRequestor = _Requestor.create("/Service/", oModelInterface, undefined,
					{"sap-client" : "123"}),
				oTokenRequiredResponse = {};

			this.mock(_Helper).expects("createError")
				.exactly(bSuccess ? 0 : 2)
				.withExactArgs(sinon.match.same(oTokenRequiredResponse),
					"Could not refresh security token")
				.returns(oError);

			this.mock(jQuery).expects("ajax").twice()
				.withExactArgs("/Service/?sap-client=123", sinon.match({
					headers : {"X-CSRF-Token" : "Fetch"},
					method : "HEAD"
				}))
				.callsFake(function () {
					var jqXHR;

					if (bSuccess) {
						jqXHR = createMock(assert, undefined, "nocontent", {
							"OData-Version" : "4.0",
							"X-CSRF-Token" : "abc123"
						});
					} else {
						jqXHR = new jQuery.Deferred();
						setTimeout(function () {
							jqXHR.reject(oTokenRequiredResponse);
						}, 0);
					}

					return jqXHR;
				});
			assert.strictEqual("X-CSRF-Token" in oRequestor.mHeaders, false);

			// code under test
			oPromise = oRequestor.refreshSecurityToken(undefined);

			assert.strictEqual(oRequestor.refreshSecurityToken(undefined), oPromise,
				"promise reused");
			assert.strictEqual(oRequestor.oSecurityTokenPromise, oPromise,
				"promise stored at requestor instance so that request method can use it");

			return oPromise.then(function () {
				assert.ok(bSuccess, "success possible");
				assert.strictEqual(oRequestor.mHeaders["X-CSRF-Token"], "abc123");
			}, function (oError0) {
				assert.ok(!bSuccess, "certain failure");
				assert.strictEqual(oError0, oError);
				assert.strictEqual("X-CSRF-Token" in oRequestor.mHeaders, false);
			}).then(function () {
				// code under test
				return oRequestor.refreshSecurityToken("some_old_token").then(function () {
					var oNewPromise;

					// code under test
					oNewPromise = oRequestor.refreshSecurityToken(
						oRequestor.mHeaders["X-CSRF-Token"]);

					assert.notStrictEqual(oNewPromise, oPromise, "new promise");
					// avoid "Uncaught (in promise)"
					return oNewPromise.catch(function () {
						assert.ok(!bSuccess, "certain failure");
					});
				});
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("submitBatch(...): with empty group", function (assert) {
		var oBody = {},
			oRequestor = _Requestor.create("/Service/", oModelInterface);

		this.mock(oRequestor).expects("sendBatch").never();

		// code under test
		return oRequestor.submitBatch("testGroupId").then(function (oResult) {
			var oPromise;

			assert.deepEqual(oResult, undefined);

			oPromise = oRequestor.request("POST", "Customers", new _GroupLock("testGroupId"), {},
				oBody, undefined, function () {});
			oRequestor.removePost("testGroupId", oBody);
			oRequestor.addChangeSet("testGroupId");

			return Promise.all([
				oPromise.catch(function (oError) {
					assert.ok(oError.canceled);
				}),
				// code under test
				oRequestor.submitBatch("testGroupId")
			]).then(function () {
				assert.strictEqual(oRequestor.mBatchQueue["testGroupId"], undefined);
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("submitBatch(...): success", function (assert) {
		var aCleanedRequests = [],
			aExpectedRequests = [[{
				method : "POST",
				url : "~Customers",
				headers : {
					"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true",
					"Accept-Language" : "ab-CD",
					"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true",
					"Foo" : "baz"
				},
				body : {"ID" : 1},
				$cancel : undefined,
				$metaPath : undefined,
				$promise : sinon.match.defined,
				$reject : sinon.match.func,
				$resolve : sinon.match.func,
				$resourcePath : "~Customers",
				$submit : undefined
			}, {
				method : "DELETE",
				url : "~SalesOrders('42')",
				headers : {
					"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true",
					"Accept-Language" : "ab-CD",
					"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true"
				},
				body : undefined,
				$cancel : undefined,
				$metaPath : undefined,
				$promise : sinon.match.defined,
				$reject : sinon.match.func,
				$resolve : sinon.match.func,
				$resourcePath : "~SalesOrders('42')",
				$submit : undefined
			}], {
				method : "GET",
				url : "~Products",
				headers : {
					"Accept" : "application/json;odata.metadata=full",
					"Accept-Language" : "ab-CD",
					"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true",
					"Foo" : "bar"
				},
				body : undefined,
				$cancel : undefined,
				$metaPath : undefined,
				$promise : sinon.match.defined,
				$reject : sinon.match.func,
				$resolve : sinon.match.func,
				$resourcePath : "~Products",
				$submit : undefined
			}],
			aPromises = [],
			aResults = [{"foo1" : "bar1"}, {"foo2" : "bar2"}, undefined],
			aBatchResults = [
				[createResponse(aResults[1]), createResponse()],
				createResponse(aResults[0])
			],
			oRequestor = _Requestor.create("/Service/", oModelInterface,
				{"Accept-Language" : "ab-CD"}),
			oRequestorMock = this.mock(oRequestor);

		oRequestorMock.expects("convertResourcePath").withExactArgs("Products")
			.returns("~Products");
		aPromises.push(oRequestor.request("GET", "Products", new _GroupLock("group1"), {
			Foo : "bar",
			Accept : "application/json;odata.metadata=full"
		}).then(function (oResult) {
			assert.deepEqual(oResult, aResults[0]);
			aResults[0] = null;
		}));
		oRequestorMock.expects("convertResourcePath").withExactArgs("Customers")
			.returns("~Customers");
		aPromises.push(oRequestor.request("POST", "Customers", new _GroupLock("group1"), {
			Foo : "baz"
		}, {
			"ID" : 1
		}).then(function (oResult) {
			assert.deepEqual(oResult, aResults[1]);
			aResults[1] = null;
		}));
		oRequestorMock.expects("convertResourcePath").withExactArgs("SalesOrders('42')")
			.returns("~SalesOrders('42')");
		aPromises.push(oRequestor.request("DELETE", "SalesOrders('42')", new _GroupLock("group1"))
			.then(function (oResult) {
				assert.deepEqual(oResult, aResults[2]);
				aResults[2] = null;
			}));
		oRequestorMock.expects("convertResourcePath").withExactArgs("SalesOrders")
			.returns("~SalesOrders");
		oRequestor.request("GET", "SalesOrders", new _GroupLock("group2"));
		aExpectedRequests.iChangeSet = 0;
		this.mock(_Requestor).expects("cleanBatch")
			.withExactArgs(aExpectedRequests)
			.returns(aCleanedRequests);

		this.mock(oRequestor).expects("sendBatch")
			.withExactArgs(sinon.match.same(aCleanedRequests))
			.resolves(aBatchResults);

		aPromises.push(oRequestor.submitBatch("group1").then(function (oResult) {
			assert.strictEqual(oResult, undefined);
			assert.deepEqual(aResults, [null, null, null], "all batch requests already resolved");
		}));
		aPromises.push(oRequestor.submitBatch("group1")); // must not call request again

		assert.strictEqual(oRequestor.mBatchQueue.group1, undefined);
		TestUtils.deepContains(oRequestor.mBatchQueue.group2, [[/*change set*/], {
			method : "GET",
			url : "~SalesOrders"
		}]);

		return Promise.all(aPromises);
	});

	//*********************************************************************************************
	QUnit.test("submitBatch(...): single GET", function (assert) {
		var aExpectedRequests = [
				// Note: no empty change set!
				sinon.match({method : "GET", url : "Products"})
			],
			oRequestor = _Requestor.create("/", oModelInterface);

		oRequestor.request("GET", "Products", new _GroupLock("groupId"));
		aExpectedRequests.iChangeSet = 0;
		this.mock(oRequestor).expects("sendBatch")
			.withExactArgs(aExpectedRequests).resolves([
				createResponse({})
			]);

		// code under test
		return oRequestor.submitBatch("groupId");
	});

	//*********************************************************************************************
	QUnit.test("submitBatch(...): merge PATCH requests", function (assert) {
		var oBusinessPartners42 = {},
			oEntityProduct0 = {},
			oEntityProduct0OtherCache = {},
			oEntityProduct1 = {},
			aExpectedRequests = [[
					sinon.match({
						body : {Name : "bar2", Note : "hello, world"},
						method : "PATCH",
						url : "Products('0')"
					}),
					sinon.match({
						body : {Name : "p1"},
						method : "PATCH",
						url : "Products('1')"
					}),
					sinon.match({
						body : {Note : "no merge!"},
						method : "PATCH",
						url : "Products('0')"
					}),
					sinon.match({
						body : {Name : "baz"},
						method : "POST",
						url : "Products"
					}),
					sinon.match({
						body : {},
						method : "POST",
						url : "Products('0')/GetCurrentStock"
					}),
					sinon.match({
						body : {Address : {City : "Walldorf", PostalCode : "69190"}},
						method : "PATCH",
						url : "BusinessPartners('42')"
					})
				],
				sinon.match({
					method : "GET",
					url : "Products"
				})
			],
			aPromises = [],
			oRequestor = _Requestor.create("/", oModelInterface),
			fnSubmit0 = this.spy(),
			fnSubmit1 = this.spy(),
			fnSubmit2 = this.spy(),
			fnSubmit3 = this.spy(),
			fnSubmit4 = this.spy();

		aPromises.push(oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : oEntityProduct0}, {Name : null}));
		oRequestor.request("PATCH", "Products('0')", new _GroupLock("otherGroupId"),
			{"If-Match" : oEntityProduct0OtherCache}, {Price : "5.0"});
		aPromises.push(oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : oEntityProduct0}, {Name : "bar"}));
		aPromises.push(oRequestor.request("GET", "Products", new _GroupLock("groupId"), undefined,
			undefined, fnSubmit0));
		aPromises.push(oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : oEntityProduct0}, {Note : "hello, world"}));
		// different entity in between
		aPromises.push(oRequestor.request("PATCH", "Products('1')", new _GroupLock("groupId"),
			{"If-Match" : oEntityProduct1}, {Name : "p1"}));
		aPromises.push(oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : oEntityProduct0}, {Name : "bar2"}));
		// same group but different cache
		aPromises.push(oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : oEntityProduct0OtherCache}, {Note : "no merge!"}));
		// a create
		aPromises.push(oRequestor.request("POST", "Products", new _GroupLock("groupId"), null,
			{Name : "baz"}, fnSubmit1));
		// a bound action
		aPromises.push(oRequestor.request("POST", "Products('0')/GetCurrentStock",
			new _GroupLock("groupId"), {"If-Match" : oEntityProduct0}, {}, fnSubmit2));
		// structured property
		// first set to null: may be merged with each other, but not with PATCHES to properties
		aPromises.push(oRequestor.request("PATCH", "BusinessPartners('42')",
			new _GroupLock("groupId"), {"If-Match" : oBusinessPartners42}, {Address : null}));
		// then two different properties therein: must be merged
		aPromises.push(oRequestor.request("PATCH", "BusinessPartners('42')",
			new _GroupLock("groupId"), {"If-Match" : oBusinessPartners42},
			{Address : {City : "Walldorf"}}, fnSubmit3));
		aPromises.push(oRequestor.request("PATCH", "BusinessPartners('42')",
			new _GroupLock("groupId"), {"If-Match" : oBusinessPartners42},
			{Address : {PostalCode : "69190"}}, fnSubmit4));
		aExpectedRequests.iChangeSet = 0;
		this.mock(oRequestor).expects("sendBatch")
			.withExactArgs(aExpectedRequests).resolves([
				[
					createResponse({Name : "bar2", Note : "hello, world"}),
					createResponse({Name : "p1"}),
					createResponse({Note : "no merge!"}),
					createResponse({Name : "baz"}),
					createResponse({value : "123 EA"}),
					createResponse({Address : {City : "Walldorf", PostalCode : "69190"}})
				],
				createResponse({Name : "Name", Note : "Note"})
			]);

		// code under test
		aPromises.push(oRequestor.submitBatch("groupId"));

		sinon.assert.calledOnce(fnSubmit0);
		sinon.assert.calledWithExactly(fnSubmit0);
		sinon.assert.calledOnce(fnSubmit1);
		sinon.assert.calledWithExactly(fnSubmit1);
		sinon.assert.calledOnce(fnSubmit2);
		sinon.assert.calledWithExactly(fnSubmit2);
		sinon.assert.calledOnce(fnSubmit3);
		sinon.assert.calledWithExactly(fnSubmit3);
		sinon.assert.calledOnce(fnSubmit4);
		sinon.assert.calledWithExactly(fnSubmit4);
		return Promise.all(aPromises).then(function (aResults) {
			assert.deepEqual(aResults, [
				{Name : "bar2", Note : "hello, world"}, // 1st PATCH
				{Name : "bar2", Note : "hello, world"}, // 2nd PATCH, merged with 1st
				{Name : "Name", Note : "Note"}, // GET
				{Name : "bar2", Note : "hello, world"}, // 3rd PATCH, merged with 1st and 2nd
				{Name : "p1"}, // 1st PATCH for another entity
				{Name : "bar2", Note : "hello, world"}, // 4th PATCH, merged with previous PATCHes
				{Note : "no merge!"}, // PATCH with different headers
				{Name : "baz"}, // POST (create)
				{value : "123 EA"}, // POST (bound action)
				{Address : {City : "Walldorf", PostalCode : "69190"}},
				{Address : {City : "Walldorf", PostalCode : "69190"}},
				{Address : {City : "Walldorf", PostalCode : "69190"}},
				undefined // submitBatch()
			]);
		});
	});

	//*********************************************************************************************
	[{
		sODataVersion : "2.0",
		mExpectedRequestHeaders : {
			"Accept" : "application/json",
			"Content-Type" : "application/json;charset=UTF-8"
		},
		mProductsResponse : {d : {results : [{foo : "bar"}]}}
	}, {
		sODataVersion : "4.0",
		mExpectedRequestHeaders : {
			"Accept" : "application/json;odata.metadata=minimal;IEEE754Compatible=true",
			"Content-Type" : "application/json;charset=UTF-8;IEEE754Compatible=true"
		},
		mProductsResponse : {value : [{foo : "bar"}]}
	}].forEach(function (oFixture) {
		var sTitle = "submitBatch(...): OData version specific headers; sODataVersion="
			+ oFixture.sODataVersion;

		QUnit.test(sTitle, function (assert) {
			var oConvertedPayload = {},
				sMetaPath = "~",
				aExpectedRequests = [{
					method : "GET",
					url : "Products",
					headers : oFixture.mExpectedRequestHeaders,
					body : undefined,
					$cancel : undefined,
					$metaPath : sMetaPath,
					$promise : sinon.match.defined,
					$reject : sinon.match.func,
					$resolve : sinon.match.func,
					$resourcePath : "Products",
					$submit : undefined
				}],
				oGetProductsPromise,
				oRequestor = _Requestor.create("/Service/", oModelInterface, undefined, undefined,
					oFixture.sODataVersion),
				oRequestorMock = this.mock(oRequestor);

			oRequestorMock.expects("doConvertResponse")
			// not same; it is stringified and parsed
				.withExactArgs(oFixture.mProductsResponse, sMetaPath)
				.returns(oConvertedPayload);
			oGetProductsPromise = oRequestor.request("GET", "Products", new _GroupLock("group1"),
				undefined, undefined, undefined, undefined, sMetaPath)
				.then(function (oResponse) {
					assert.strictEqual(oResponse, oConvertedPayload);
				});

			aExpectedRequests.iChangeSet = 0;
			oRequestorMock.expects("sendBatch")
				.withExactArgs(aExpectedRequests)
				.resolves([createResponse(oFixture.mProductsResponse)]);

			return Promise.all([oGetProductsPromise, oRequestor.submitBatch("group1")]);
		});
	});

	//*********************************************************************************************
	QUnit.test("submitBatch: fail to convert payload", function (assert) {
		var oError = {},
			oGetProductsPromise,
			oRequestor = _Requestor.create("/Service/", oModelInterface, undefined, undefined,
				"2.0"),
			oRequestorMock = this.mock(oRequestor),
			oResponse = {d : {foo : "bar"}};

		oRequestorMock.expects("doConvertResponse")
			.withExactArgs(oResponse, undefined)
			.throws(oError);
		oGetProductsPromise = oRequestor.request("GET", "Products", new _GroupLock("group1"))
			.then(function () {
				assert.notOk("Unexpected success");
			}, function (oError0) {
				assert.strictEqual(oError0, oError);
			});
		oRequestorMock.expects("sendBatch") // arguments don't matter
			.resolves([createResponse(oResponse)]);

		return Promise.all([oGetProductsPromise, oRequestor.submitBatch("group1")]);
	});

	//*********************************************************************************************
	[{
		response : {id : 42}, method : "GET"
	}, {
		response : undefined, method : "DELETE"
	}].forEach(function (oFixture, i) {
		QUnit.test("submitBatch: report unbound messages, " + i, function (assert) {
			var mHeaders = {"SAP-Messages" : {}},
				oRequestor = _Requestor.create("/Service/", oModelInterface),
				oRequestorMock = this.mock(oRequestor),
				oRequestPromise = oRequestor.request(oFixture.method, "Products(42)",
					new _GroupLock("group1"));

			oRequestorMock.expects("reportUnboundMessagesAsJSON")
				.withExactArgs("Products(42)", sinon.match.same(mHeaders["SAP-Messages"]));
			oRequestorMock.expects("sendBatch") // arguments don't matter
				.resolves([createResponse(oFixture.response, mHeaders)]);

			return Promise.all([oRequestPromise, oRequestor.submitBatch("group1")]);
		});
	});

	//*********************************************************************************************
	QUnit.test("submitBatch(...): $batch failure", function (assert) {
		var oBatchError = new Error("$batch request failed"),
			aPromises = [],
			oRequestor = _Requestor.create("/", oModelInterface);

		function unexpectedSuccess() {
			assert.ok(false, "unexpected success");
		}

		function assertError(oError) {
			assert.ok(oError instanceof Error);
			assert.strictEqual(oError.message,
				"HTTP request was not processed because $batch failed");
			assert.strictEqual(oError.cause, oBatchError);
		}

		aPromises.push(oRequestor.request("PATCH", "Products('0')", new _GroupLock("group"),
				{"If-Match" : {/* product 0*/}}, {Name : "foo"})
			.then(unexpectedSuccess, assertError));
		aPromises.push(oRequestor.request("PATCH", "Products('1')", new _GroupLock("group"),
				{"If-Match" : {/* product 1*/}},{Name : "foo"})
			.then(unexpectedSuccess, assertError));
		aPromises.push(oRequestor.request("GET", "Products", new _GroupLock("group"))
			.then(unexpectedSuccess, assertError));
		aPromises.push(oRequestor.request("GET", "Customers", new _GroupLock("group"))
			.then(unexpectedSuccess, assertError));

		this.mock(oRequestor).expects("sendBatch").rejects(oBatchError); // arguments don't matter

		aPromises.push(oRequestor.submitBatch("group").then(unexpectedSuccess, function (oError) {
			assert.strictEqual(oError, oBatchError);
		}));

		return Promise.all(aPromises);
	});

	//*********************************************************************************************
	QUnit.test("submitBatch(...): failure followed by another request", function (assert) {
		var oError = {error : {message : "404 Not found"}},
			aBatchResult = [{
				headers : {},
				responseText : "{}",
				status : 200
			}, {
				getResponseHeader : function () {
					return "application/json";
				},
				headers : {"Content-Type" :"application/json"},
				responseText : JSON.stringify(oError),
				status : 404,
				statusText : "Not found"
			}],
			aPromises = [],
			oRequestor = _Requestor.create("/", oModelInterface);

		function unexpected () {
			assert.ok(false);
		}

		function assertError(oResultError, sMessage) {
			assert.ok(oResultError instanceof Error);
			assert.deepEqual(oResultError.error, oError.error);
			assert.strictEqual(oResultError.message, oError.error.message);
			assert.strictEqual(oResultError.status, 404);
			assert.strictEqual(oResultError.statusText, "Not found");
		}

		aPromises.push(oRequestor.request("GET", "ok", new _GroupLock("testGroupId"))
			.then(function (oResult) {
				assert.deepEqual(oResult, {});
			}).catch(unexpected));

		aPromises.push(oRequestor.request("GET", "fail", new _GroupLock("testGroupId"))
			.then(unexpected, function (oResultError) {
				assertError(oResultError, oError.error.message);
			}));

		aPromises.push(oRequestor.request("GET", "ok", new _GroupLock("testGroupId"))
			.then(unexpected, function (oResultError) {
				assert.ok(oResultError instanceof Error);
				assert.strictEqual(oResultError.message,
					"HTTP request was not processed because the previous request failed");
				assertError(oResultError.cause);
			}));

		this.mock(oRequestor).expects("sendBatch").resolves(aBatchResult); // arguments don't matter

		aPromises.push(oRequestor.submitBatch("testGroupId").then(function (oResult) {
			assert.deepEqual(oResult, undefined);
		}));

		return Promise.all(aPromises);
	});

	//*********************************************************************************************
	QUnit.test("submitBatch(...): error in change set", function (assert) {
		var oError = {error : {message : "400 Bad Request"}},
			aBatchResult = [{
				getResponseHeader : function () {
					return "application/json";
				},
				headers : {"Content-Type" :"application/json"},
				responseText : JSON.stringify(oError),
				status : 400,
				statusText : "Bad Request"
			}],
			oProduct = {},
			aPromises = [],
			oRequestor = _Requestor.create("/", oModelInterface);

		function assertError(oResultError, sMessage) {
			assert.ok(oResultError instanceof Error);
			assert.strictEqual(oResultError.message, "400 Bad Request");
			assert.strictEqual(oResultError.status, 400);
			assert.strictEqual(oResultError.statusText, "Bad Request");
		}

		aPromises.push(oRequestor.request("PATCH", "ProductList('HT-1001')",
				new _GroupLock("group"), {"If-Match" : oProduct}, {Name : "foo"})
			.then(undefined, assertError));

		aPromises.push(oRequestor.request("POST", "Unknown", new _GroupLock("group"), undefined, {})
			.then(undefined, assertError));

		aPromises.push(oRequestor.request("PATCH", "ProductList('HT-1001')",
				new _GroupLock("group"), {"If-Match" : oProduct}, {Name : "bar"})
			.then(undefined, assertError));

		aPromises.push(oRequestor.request("GET", "ok", new _GroupLock("group"))
			.then(undefined, function (oResultError) {
				assert.ok(oResultError instanceof Error);
				assert.strictEqual(oResultError.message,
					"HTTP request was not processed because the previous request failed");
				assertError(oResultError.cause);
			}));

		this.mock(oRequestor).expects("sendBatch").resolves(aBatchResult); // arguments don't matter

		aPromises.push(oRequestor.submitBatch("group").then(function (oResult) {
			assert.deepEqual(oResult, undefined);
		}));

		return Promise.all(aPromises);
	});

	//*********************************************************************************************
	[null, "[{code : 42}]"].forEach(function (sMessage) {
		QUnit.test("sendBatch(...), message=" + sMessage, function (assert) {
			var oBatchRequest = {
					body : "abcd",
					headers : {
						"Content-Type" : "multipart/mixed; boundary=batch_id-0123456789012-345",
						"MIME-Version" : "1.0"
					}
				},
				aBatchRequests = [{}],
				aExpectedResponses = [],
				oRequestor = _Requestor.create("/Service/", oModelInterface, undefined,
					{"sap-client" : "123"}),
				oResult = "abc",
				sResponseContentType = "multipart/mixed; boundary=foo";

			this.mock(_Batch).expects("serializeBatchRequest")
				.withExactArgs(sinon.match.same(aBatchRequests))
				.returns(oBatchRequest);

			this.mock(oRequestor).expects("sendRequest")
				.withExactArgs("POST", "$batch?sap-client=123", sinon.match({
						"Content-Type" : oBatchRequest.headers["Content-Type"],
						"MIME-Version" : oBatchRequest.headers["MIME-Version"]
					}), sinon.match.same(oBatchRequest.body))
				.resolves({contentType : sResponseContentType, body : oResult,
					messages : sMessage});

			this.mock(_Batch).expects("deserializeBatchResponse").exactly(sMessage === null ? 1 : 0)
				.withExactArgs(sResponseContentType, oResult)
				.returns(aExpectedResponses);

			return oRequestor.sendBatch(aBatchRequests)
				.then(function (oPayload) {
					assert.ok(sMessage === null ? true : false, "unexpected success");
					assert.strictEqual(oPayload, aExpectedResponses);
				}, function (oError) {
					assert.ok(sMessage !== null ? true : false, "unexpected error");
					assert.ok(oError instanceof Error);
					assert.strictEqual(oError.message,
						"Unexpected 'sap-messages' response header for batch request");
				});
		});
	});

	//*****************************************************************************************
	QUnit.test("hasPendingChanges, cancelChanges and running batch requests", function (assert) {
		var oBatchMock = this.mock(_Batch),
			oBatchRequest1,
			oBatchRequest2,
			oBatchRequest3,
			oJQueryMock = this.mock(jQuery),
			aPromises = [],
			sServiceUrl = "/Service/",
			oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

		// expects a jQuery.ajax for a batch request and returns a mock for it to be resolved later
		function expectBatch() {
			var jqXHR = new jQuery.Deferred();
			oJQueryMock.expects("ajax")
				.withArgs(sServiceUrl + "$batch")
				.returns(jqXHR);
			return jqXHR;
		}

		// resolves the mock for the jQuery.ajax for the batch
		function resolveBatch(jqXHR) {
			Promise.resolve().then(function () {
				oBatchMock.expects("deserializeBatchResponse")
					.withExactArgs(null, "body")
					.returns([createResponse()]);

				jqXHR.resolve("body", "OK", { // mock jqXHR for success handler
					getResponseHeader : function (sHeader) {
						if (sHeader === "OData-Version") {
							return "4.0";
						}
						return null;
					}
				});
			});
		}

		assert.strictEqual(oRequestor.hasPendingChanges(), false);

		// add a GET request and submit the queue
		oRequestor.request("GET", "Products", new _GroupLock("groupId"));
		oBatchRequest1 = expectBatch();
		aPromises.push(oRequestor.submitBatch("groupId"));
		assert.strictEqual(oRequestor.hasPendingChanges(), false,
			"a running GET request is not a pending change");

		// add a PATCH request and submit the queue
		oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : {/* product 0 */}}, {Name : "foo"});
		oBatchRequest2 = expectBatch();
		aPromises.push(oRequestor.submitBatch("groupId").then(function () {
			// code under test
			assert.strictEqual(oRequestor.hasPendingChanges(), true,
				"the batch with the second PATCH is still running");
			resolveBatch(oBatchRequest3);
		}));

		// code under test
		assert.strictEqual(oRequestor.hasPendingChanges(), true);
		assert.throws(function () {
			oRequestor.cancelChanges("groupId");
		}, new Error("Cannot cancel the changes for group 'groupId', "
			+ "the batch request is running"));
		oRequestor.cancelChanges("anotherGroupId"); // the other groups are not affected

		// while the batch with the first PATCH is still running, add another PATCH and submit
		oRequestor.request("PATCH", "Products('1')", new _GroupLock("groupId"),
			{"If-Match" : {/* product 0 */}}, {Name : "bar"});
		oBatchRequest3 = expectBatch();
		aPromises.push(oRequestor.submitBatch("groupId").then(function () {
			// code under test
			assert.strictEqual(oRequestor.hasPendingChanges(), false);
			oRequestor.cancelChanges("groupId");
		}));

		resolveBatch(oBatchRequest1);
		resolveBatch(oBatchRequest2);
		return Promise.all(aPromises);
	});

	//*****************************************************************************************
	QUnit.test("cancelChanges: various requests", function (assert) {
		var fnCancel1 = this.spy(),
			fnCancel2 = this.spy(),
			fnCancel3 = this.spy(),
			fnCancelPost = this.spy(),
			iCount = 1,
			aExpectedRequests = [
				sinon.match({
					method : "POST",
					url : "ActionImport('42')"
				}),
				sinon.match({
					method : "GET",
					url : "Employees"
				})
			],
			oPostData = {},
			oProduct0 = {},
			oPromise,
			oRequestor = _Requestor.create("/Service/", oModelInterface, undefined,
				{"sap-client" : "123"});

		function unexpected () {
			assert.ok(false);
		}

		function rejected (iOrder, oError) {
			assert.strictEqual(oError.canceled, true);
			assert.strictEqual(iCount, iOrder);
			iCount += 1;
		}

		assert.strictEqual(oRequestor.hasPendingChanges(), false);

		oPromise = Promise.all([
			oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
					{"If-Match" : oProduct0}, {Name : "foo"}, undefined, fnCancel1)
				.then(unexpected, rejected.bind(null, 3)),
			oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
					{"If-Match" : oProduct0}, {Name : "bar"}, undefined, fnCancel2)
				.then(unexpected, rejected.bind(null, 2)),
			oRequestor.request("GET", "Employees", new _GroupLock("groupId")),
			oRequestor.request("POST", "ActionImport('42')", new _GroupLock("groupId"), undefined,
					{foo : "bar"}),
			oRequestor.request("POST", "LeaveRequests('42')/name.space.Submit",
					new _GroupLock("groupId"), {"If-Match" : {/* leave requests 42 */}},
					oPostData, undefined, fnCancelPost)
				.then(unexpected, function (oError) {
					assert.strictEqual(oError.canceled, true);
					assert.strictEqual(oError.message, "Request canceled: " +
						"POST LeaveRequests('42')/name.space.Submit; group: groupId");
				}),
			oRequestor.request("PATCH", "Products('1')", new _GroupLock("groupId"),
					{"If-Match" : {/* product 0 */}}, {Name : "baz"}, undefined, fnCancel3)
				.then(unexpected, rejected.bind(null, 1))
		]);

		// code under test
		assert.strictEqual(oRequestor.hasPendingChanges(), true);

		this.spy(oRequestor, "cancelChangesByFilter");

		// code under test
		oRequestor.cancelChanges("groupId");

		sinon.assert.calledOnce(fnCancel1);
		sinon.assert.calledWithExactly(fnCancel1);
		sinon.assert.calledOnce(fnCancel2);
		sinon.assert.calledOnce(fnCancel3);
		sinon.assert.calledOnce(fnCancelPost);
		sinon.assert.calledWithExactly(oRequestor.cancelChangesByFilter, sinon.match.func,
			"groupId");

		// code under test
		assert.strictEqual(oRequestor.hasPendingChanges(), false);

		aExpectedRequests.iChangeSet = 0;
		this.mock(oRequestor).expects("sendBatch")
			.withExactArgs(aExpectedRequests).resolves([createResponse(), createResponse()]);

		oRequestor.submitBatch("groupId");

		return oPromise;
	});

	//*****************************************************************************************
	QUnit.test("cancelChanges: only PATCH", function (assert) {
		var fnCancel = function () {},
			oProduct0 = {},
			oPromise,
			oRequestor = _Requestor.create("/Service/", oModelInterface, undefined,
				{"sap-client" : "123"});

		function unexpected () {
			assert.ok(false);
		}

		function rejected (oError) {
			assert.strictEqual(oError.canceled, true);
		}

		oPromise = Promise.all([
			oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
					{"If-Match" : oProduct0}, {Name : "foo"}, undefined, fnCancel)
				.then(unexpected, rejected),
			oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
					{"If-Match" : oProduct0}, {Name : "bar"}, undefined, fnCancel)
				.then(unexpected, rejected),
			oRequestor.request("PATCH", "Products('1')", new _GroupLock("groupId"),
					{"If-Match" : {/* product 1*/}}, {Name : "baz"}, undefined, fnCancel)
				.then(unexpected, rejected)
		]);

		this.mock(oRequestor).expects("request").never();

		// code under test
		oRequestor.cancelChanges("groupId");
		oRequestor.submitBatch("groupId");

		return oPromise;
	});

	//*****************************************************************************************
	QUnit.test("cancelChanges: unused group", function (assert) {
		_Requestor.create("/Service/", oModelInterface).cancelChanges("unusedGroupId");
	});

	//*****************************************************************************************
	QUnit.test("removePatch", function (assert) {
		var fnCancel = this.spy(),
			oPromise,
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oTestPromise;

		oPromise = oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : {/* product 0 */}}, {Name : "foo"}, undefined, fnCancel);
		oTestPromise = oPromise.then(function () {
				assert.ok(false);
			}, function (oError) {
				assert.strictEqual(oError.canceled, true);
			});

		// code under test
		oRequestor.removePatch(oPromise);

		sinon.assert.calledOnce(fnCancel);
		this.mock(oRequestor).expects("request").never();
		oRequestor.submitBatch("groupId");
		return oTestPromise;
	});

	//*****************************************************************************************
	QUnit.test("removePatch: various requests", function (assert) {
		var fnCancel = this.spy(),
			aExpectedRequests = [
				sinon.match({
					method : "PATCH",
					url : "Products('0')",
					body : {Name : "bar"}
				}),
				sinon.match({
					method : "GET",
					url : "Employees"
				})
			],
			oProduct0 = {},
			oPromise,
			aPromises,
			oRequestor = _Requestor.create("/Service/", oModelInterface);

		function unexpected () {
			assert.ok(false);
		}

		function rejected(oError) {
			assert.strictEqual(oError.canceled, true);
			assert.strictEqual(oError.message,
				"Request canceled: PATCH Products('0'); group: groupId");
		}

		oPromise = oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : oProduct0}, {Name : "foo"}, undefined, fnCancel);

		aPromises = [
			oPromise.then(unexpected, rejected),
			oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
				{"If-Match" : oProduct0}, {Name : "bar"}),
			oRequestor.request("GET", "Employees", new _GroupLock("groupId"))
		];

		aExpectedRequests.iChangeSet = 0;
		this.mock(oRequestor).expects("sendBatch")
			.withExactArgs(aExpectedRequests).resolves([createResponse({}), createResponse({})]);

		// code under test
		oRequestor.removePatch(oPromise);
		oRequestor.submitBatch("groupId");

		sinon.assert.calledOnce(fnCancel);

		return Promise.all(aPromises);
	});

	//*****************************************************************************************
	QUnit.test("removePatch after submitBatch", function (assert) {
		var oPromise,
			oRequestor = _Requestor.create("/Service/", oModelInterface);

		oPromise = oRequestor.request("PATCH", "Products('0')", new _GroupLock("groupId"),
			{"If-Match" : {/* oEntity */}}, {Name : "bar"});

		this.mock(oRequestor).expects("sendBatch") // arguments don't matter
			.resolves([createResponse({})]);

		oRequestor.submitBatch("groupId");

		// code under test
		assert.throws(function () {
			oRequestor.removePatch(oPromise);
		}, new Error("Cannot reset the changes, the batch request is running"));
	});

	//*****************************************************************************************
	QUnit.test("removePost", function (assert) {
		var oBody = {},
			fnCancel1 = this.spy(),
			fnCancel2 = this.spy(),
			aExpectedRequests = [
				sinon.match({
					method : "POST",
					url : "Products",
					body : {Name : "bar"}
				})
			],
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oTestPromise;

		this.spy(oRequestor, "cancelChangesByFilter");
		oTestPromise = Promise.all([
			oRequestor.request("POST", "Products", new _GroupLock("groupId"), {}, oBody, undefined,
					fnCancel1)
				.then(function () {
					assert.ok(false);
				}, function (oError) {
					assert.strictEqual(oError.canceled, true);
				}),
			oRequestor.request("POST", "Products", new _GroupLock("groupId"), {}, {Name : "bar"},
					undefined, fnCancel2)
		]);

		// code under test
		oRequestor.removePost("groupId", oBody);

		assert.ok(oRequestor.cancelChangesByFilter.calledWithExactly(sinon.match.func, "groupId"));

		aExpectedRequests.iChangeSet = 0;
		this.mock(oRequestor).expects("sendBatch")
			.withExactArgs(aExpectedRequests).resolves([createResponse()]);

		// code under test
		oRequestor.submitBatch("groupId");

		sinon.assert.calledOnce(fnCancel1);
		sinon.assert.notCalled(fnCancel2);
		return oTestPromise;
	});

	//*****************************************************************************************
	QUnit.test("removePost with only one POST", function (assert) {
		var oBody = {},
			fnCancel = this.spy(),
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oTestPromise;

		oTestPromise = oRequestor.request("POST", "Products", new _GroupLock("groupId"), {}, oBody,
				undefined, fnCancel)
			.then(function () {
					assert.ok(false);
				}, function (oError) {
					assert.strictEqual(oError.canceled, true);
				}
		);

		// code under test
		oRequestor.removePost("groupId", oBody);
		sinon.assert.calledOnce(fnCancel);

		this.mock(oRequestor).expects("request").never();
		oRequestor.submitBatch("groupId");
		return oTestPromise;
	});

	//*****************************************************************************************
	QUnit.test("removePost after submitBatch", function (assert) {
		var oPayload = {},
			oRequestor = _Requestor.create("/Service/", oModelInterface);

		oRequestor.request("POST", "Products", new _GroupLock("groupId"), {}, oPayload);

		this.mock(oRequestor).expects("sendBatch") // arguments don't matter
			.resolves([createResponse({})]);

		oRequestor.submitBatch("groupId");

		// code under test
		assert.throws(function () {
			oRequestor.removePost("groupId", oPayload);
		}, new Error("Cannot reset the changes, the batch request is running"));
	});

	//*****************************************************************************************
	QUnit.test("isChangeSetOptional", function (assert) {
		var oRequestor = _Requestor.create("/");

		assert.strictEqual(oRequestor.isChangeSetOptional(), true);
	});

	//*****************************************************************************************
	QUnit.test("submitBatch: unwrap single change", function (assert) {
		var aExpectedRequests = [
				sinon.match({
					method : "POST",
					url : "Products",
					body : {Name : "bar"}
				})
			],
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oRequestorMock = this.mock(oRequestor);

		oRequestor.request("POST", "Products", new _GroupLock("groupId"), {}, {Name : "bar"});
		oRequestorMock.expects("isChangeSetOptional").withExactArgs().returns(true);
		aExpectedRequests.iChangeSet = 0;
		oRequestorMock.expects("sendBatch")
			.withExactArgs(aExpectedRequests).resolves([createResponse()]);

		// code under test
		return oRequestor.submitBatch("groupId");
	});

	//*****************************************************************************************
	QUnit.test("relocate", function (assert) {
		var oBody1 = {},
			oBody2 = {},
			fnCancel1 = assert.ok.bind(assert, false),
			fnCancel2 = assert.ok.bind(assert, false),
			mExpectedHeaders = sinon.match.has("foo", "bar"),
			mHeaders = {foo : "bar"},
			oCreatePromise1,
			oCreatePromise2,
			oError = new Error("Post failed"),
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oRequestorMock = this.mock(oRequestor),
			oResult = {},
			fnSubmit1 = assert.ok.bind(assert, false),
			fnSubmit2 = assert.ok.bind(assert, false);

		oCreatePromise1 = oRequestor.request("POST", "Employees", new _GroupLock("$parked.$auto"),
			mHeaders, oBody1, fnSubmit1, fnCancel1);
		oCreatePromise2 = oRequestor.request("POST", "Employees", new _GroupLock("$parked.$auto"),
			mHeaders, oBody2, fnSubmit2, fnCancel2);

		assert.throws(function () {
			// code under test
			oRequestor.relocate("$foo", oBody1, "$auto");
		}, new Error("Request not found in group '$foo'"));

		assert.throws(function () {
			// code under test
			oRequestor.relocate("$parked.$auto", {foo : "bar"}, "$auto");
		}, new Error("Request not found in group '$parked.$auto'"));

		oRequestorMock.expects("request")
			.withExactArgs("POST", "Employees", new _GroupLock("$auto"), mExpectedHeaders,
				sinon.match.same(oBody2), sinon.match.same(fnSubmit2), sinon.match.same(fnCancel2))
			.resolves(oResult);

		// code under test
		oRequestor.relocate("$parked.$auto", oBody2, "$auto");

		assert.strictEqual(oRequestor.mBatchQueue["$parked.$auto"][0].length, 1, "one left");
		assert.strictEqual(oRequestor.mBatchQueue["$parked.$auto"][0][0].body, oBody1);

		return oCreatePromise2.then(function (oResult0) {
			assert.strictEqual(oResult0, oResult);

			oRequestorMock.expects("request")
				.withExactArgs("POST", "Employees", new _GroupLock("$auto"), mExpectedHeaders,
					sinon.match.same(oBody1), sinon.match.same(fnSubmit1),
					sinon.match.same(fnCancel1))
				.rejects(oError);

			// code under test
			oRequestor.relocate("$parked.$auto", oBody1, "$auto");

			return oCreatePromise1.then(function () {
				assert.ok(false);
			}, function (oError0) {
				assert.strictEqual(oError0, oError);
				assert.deepEqual(oRequestor.mBatchQueue["$parked.$auto"], [[]]);
			});
		});
	});

	//*****************************************************************************************
	QUnit.test("relocateAll, hasChanges", function (assert) {
		var oBody1 = {key : "value 1"},
			oBody2 = {key : "value 2"},
			fnCancel1 = assert.ok.bind(assert, false),
			fnCancel2 = assert.ok.bind(assert, false),
			oEntity = {},
			mExpectedHeaders = sinon.match.has("If-Match", sinon.match.same(oEntity)),
			aPromises = [],
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oRequestorMock = this.mock(oRequestor),
			fnSubmit1 = assert.ok.bind(assert, false),
			fnSubmit2 = assert.ok.bind(assert, false),
			oYetAnotherEntity = {};

		aPromises.push(oRequestor.request("PATCH", "Employees('1')",
			new _GroupLock("$parked.$auto"), {"If-Match" : oEntity}, oBody1, fnSubmit1, fnCancel1));
		aPromises.push(oRequestor.request("DELETE", "Employees('2')",
			new _GroupLock("$parked.$auto"), {"If-Match" : oYetAnotherEntity}));
		aPromises.push(oRequestor.request("PATCH", "Employees('1')",
			new _GroupLock("$parked.$auto"), {"If-Match" : oEntity}, oBody2, fnSubmit2, fnCancel2));

		// code under test
		oRequestor.relocateAll("$parked.unused", oEntity, "$auto");

		// code under test
		oRequestor.relocateAll("$parked.$auto", {/* some other entity */}, "unexpected");

		// code under test
		assert.strictEqual(oRequestor.hasChanges("$parked.$auto", oEntity), true);

		// code under test
		assert.strictEqual(oRequestor.hasChanges("$parked.unused", oEntity), false);

		oRequestorMock.expects("request")
			.withExactArgs("PATCH", "Employees('1')", new _GroupLock("$auto"), mExpectedHeaders,
				sinon.match.same(oBody1), sinon.match.same(fnSubmit1), sinon.match.same(fnCancel1))
			.resolves();
		oRequestorMock.expects("request")
			.withExactArgs("PATCH", "Employees('1')", new _GroupLock("$auto"), mExpectedHeaders,
				sinon.match.same(oBody2), sinon.match.same(fnSubmit2), sinon.match.same(fnCancel2))
			.resolves();

		// code under test
		oRequestor.relocateAll("$parked.$auto", oEntity, "$auto");

		// code under test
		assert.strictEqual(oRequestor.hasChanges("$parked.$auto", oEntity), false);

		// code under test: must not unpark anything again
		oRequestor.relocateAll("$parked.$auto", oEntity, "unexpected");

		// code under test
		assert.strictEqual(oRequestor.hasChanges("$parked.$auto", oYetAnotherEntity), true);

		oRequestorMock.expects("request")
			.withExactArgs("DELETE", "Employees('2')", new _GroupLock("$auto"),
				sinon.match.has("If-Match", sinon.match.same(oYetAnotherEntity)), undefined,
				undefined, undefined)
			.resolves();

		// code under test
		oRequestor.relocateAll("$parked.$auto", oYetAnotherEntity, "$auto");

		// code under test
		assert.strictEqual(oRequestor.hasChanges("$parked.$auto", oYetAnotherEntity), false);

		return Promise.all(aPromises);
	});

	//*****************************************************************************************
	QUnit.test("relocateAll: original promise resolves just like new one", function (assert) {
		var oEntity = {},
			oPromise,
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oRequestorMock = this.mock(oRequestor),
			oResult = {};

		oPromise = oRequestor.request("DELETE", "Employees('1')", new _GroupLock("$parked.$auto"),
			{"If-Match" : oEntity});
		oRequestorMock.expects("request")
			.withExactArgs("DELETE", "Employees('1')", new _GroupLock("$auto"),
				sinon.match.has("If-Match", sinon.match.same(oEntity)), undefined,
				undefined, undefined)
			.resolves(oResult);

		// code under test
		oRequestor.relocateAll("$parked.$auto", oEntity, "$auto");

		return oPromise.then(function (oResult0) {
			assert.strictEqual(oResult0, oResult);
		});
	});

	//*****************************************************************************************
	QUnit.test("relocateAll: original promise rejects just like new one", function (assert) {
		var oEntity = {},
			oPromise,
			oRequestor = _Requestor.create("/Service/", oModelInterface),
			oRequestorMock = this.mock(oRequestor),
			oError = {};

		oPromise = oRequestor.request("DELETE", "Employees('1')", new _GroupLock("$parked.$auto"),
			{"If-Match" : oEntity});
		oRequestorMock.expects("request")
			.withExactArgs("DELETE", "Employees('1')", new _GroupLock("$auto"),
				sinon.match.has("If-Match", sinon.match.same(oEntity)), undefined,
				undefined, undefined)
			.rejects(oError);

		// code under test
		oRequestor.relocateAll("$parked.$auto", oEntity, "$auto");

		return oPromise.then(function () {
			assert.ok(false);
		}, function (oError0) {
			assert.strictEqual(oError0, oError);
		});
	});

	//*****************************************************************************************
	QUnit.test("cleanPayload", function (assert) {
		var oUnchanged = {
				"foo" : "bar"
			},
			oPostData = {
				"foo" : "bar",
				"a@$ui5.b" : "c",
				"@$ui51" : "bar",
				"@$ui5.option" : "baz",
				"@$ui5._" : {"transient" : true}
			},
			oChangedPostData = {
				"foo" : "bar",
				"@$ui51" : "bar",
				"a@$ui5.b" : "c"
			};

		assert.strictEqual(_Requestor.cleanPayload(undefined), undefined);
		assert.strictEqual(_Requestor.cleanPayload(oUnchanged), oUnchanged);

		this.spy(jQuery, "extend");

		assert.deepEqual(_Requestor.cleanPayload(oPostData), oChangedPostData);
		assert.strictEqual(oPostData["@$ui5.option"], "baz");
		assert.strictEqual(_Helper.getPrivateAnnotation(oPostData, "transient"), true);

		sinon.assert.calledOnce(jQuery.extend);
	});

	//*****************************************************************************************
	QUnit.test("cleanBatch", function (assert) {
		var oBody1 = {},
			oBody2 = {
				"@$ui5.foo" : "bar"
			},
			oChangedBody2 = {},
			oRequestorMock = this.mock(_Requestor),
			aRequests = [[{body : oBody1}], {method : "FOO", body : oBody2}],
			aResult = [[{body : oBody1}], {method : "FOO", body : oChangedBody2}];

		oRequestorMock.expects("cleanPayload")
			.withExactArgs(sinon.match.same(oBody1)).returns(oBody1);
		oRequestorMock.expects("cleanPayload")
			.withExactArgs(sinon.match.same(oBody2)).returns(oChangedBody2);

		// code under test
		assert.strictEqual(_Requestor.cleanBatch(aRequests), aRequests);
		assert.deepEqual(aRequests, aResult);
	});

	//*********************************************************************************************
	QUnit.test("request: $cached as groupId", function (assert) {
		var oRequestor = _Requestor.create("/");

		assert.throws(function () {
			//code under test
			oRequestor.request("GET", "/FOO", new _GroupLock("$cached"));
		},  function (oError) {
			assert.strictEqual(oError.message, "Unexpected request: GET /FOO");
			assert.strictEqual(oError.$cached, true);
			return oError instanceof Error;
		});
	});

	//*********************************************************************************************
	QUnit.test("doConvertResponse (V4)", function (assert) {
		var oPayload = {},
			oRequestor = _Requestor.create("/");

		// code under test
		assert.strictEqual(oRequestor.doConvertResponse(oPayload), oPayload);
	});

	//*********************************************************************************************
	QUnit.test("convertResourcePath (V4)", function (assert) {
		var sResourcePath = {},
			oRequestor = _Requestor.create("/");

		// code under test
		assert.strictEqual(oRequestor.convertResourcePath(sResourcePath), sResourcePath);
	});

	//*********************************************************************************************
	QUnit.test("convertQueryOptions", function (assert) {
		var oExpand = {},
			oRequestor = _Requestor.create("/");

		this.mock(oRequestor).expects("convertExpand")
			.withExactArgs(sinon.match.same(oExpand), undefined).returns("expand");

		assert.deepEqual(oRequestor.convertQueryOptions("/Foo", {
			foo : "bar",
			$apply : "filter(Price gt 100)",
			$count : "true",
			$expand : oExpand,
			$filter : "SO_2_BP/CompanyName eq 'SAP'",
			$foo : "bar", // to show that any system query option is accepted
			$levels : "5",
			$orderby : "GrossAmount asc",
			$search : "EUR",
			$select : ["select1", "select2"]
		}), {
			foo : "bar",
			$apply : "filter(Price gt 100)",
			$count : "true",
			$expand : "expand",
			$filter : "SO_2_BP/CompanyName eq 'SAP'",
			$foo : "bar",
			$levels : "5",
			$orderby : "GrossAmount asc",
			$search : "EUR",
			$select : "select1,select2"
		});

		assert.deepEqual(oRequestor.convertQueryOptions("/Foo", {
			foo : "bar",
			"sap-client" : "111",
			$apply : "filter(Price gt 100)",
			$count : true,
			$expand : oExpand,
			$filter : "SO_2_BP/CompanyName eq 'SAP'",
			$orderby : "GrossAmount asc",
			$search : "EUR",
			$select : ["select1", "select2"]
		}, /*bDropSystemQueryOptions*/true), {
			foo : "bar",
			"sap-client" : "111"
		});

		assert.deepEqual(oRequestor.convertQueryOptions("/Foo", {
			$select : "singleSelect"
		}), {
			$select : "singleSelect"
		});

		assert.strictEqual(oRequestor.convertQueryOptions("/Foo", undefined), undefined);
	});

	//*********************************************************************************************
	QUnit.test("convertExpandOptions", function (assert) {
		var oExpand = {},
			oRequestor = _Requestor.create("/~/");

		this.mock(oRequestor).expects("convertExpand")
			.withExactArgs(sinon.match.same(oExpand), undefined).returns("expand");

		assert.strictEqual(oRequestor.convertExpandOptions("foo", {
			$expand : oExpand,
			$select : ["select1", "select2"]
		}), "foo($expand=expand;$select=select1,select2)");

		assert.strictEqual(oRequestor.convertExpandOptions("foo", {}), "foo");
	});

	//*********************************************************************************************
	QUnit.test("convertExpand", function (assert) {
		var oOptions = {},
			oRequestor = _Requestor.create("/~/");

		["Address", null].forEach(function (vValue) {
			assert.throws(function () {
				oRequestor.convertExpand(vValue);
			}, new Error("$expand must be a valid object"));
		});

		this.mock(oRequestor).expects("convertExpandOptions")
			.withExactArgs("baz", sinon.match.same(oOptions), false).returns("baz(options)");

		assert.strictEqual(oRequestor.convertExpand({
			foo : true,
			bar : null,
			baz : oOptions
		}, false), "foo,bar,baz(options)");
	});

	//*********************************************************************************************
	[true, false].forEach(function (bSortExpandSelect, i) {
		QUnit.test("buildQueryString, " + i, function (assert) {
			var oConvertedQueryParams = {},
				sMetaPath = "/Foo",
				oQueryParams = {},
				oRequestor = _Requestor.create("/~/"),
				oRequestorMock = this.mock(oRequestor);

			oRequestorMock.expects("convertQueryOptions")
				.withExactArgs(sMetaPath, undefined, undefined, undefined).returns(undefined);

			// code under test
			assert.strictEqual(oRequestor.buildQueryString(sMetaPath), "");

			oRequestorMock.expects("convertQueryOptions")
				.withExactArgs(sMetaPath, sinon.match.same(oQueryParams), true, bSortExpandSelect)
				.returns(oConvertedQueryParams);
			this.mock(_Helper).expects("buildQuery")
				.withExactArgs(sinon.match.same(oConvertedQueryParams)).returns("?query");

			// code under test
			assert.strictEqual(
				oRequestor.buildQueryString(sMetaPath, oQueryParams, true, bSortExpandSelect),
				"?query");
		});
	});

	//*********************************************************************************************
	QUnit.test("buildQueryString examples", function (assert) {
		[{
			o : {foo : ["bar", "€"], $select : "IDÖ"},
			s : "foo=bar&foo=%E2%82%AC&$select=ID%C3%96"
		}, {
			o : {$select : ["ID"]},
			s : "$select=ID"
		}, {
			o : {$select : ["Name", "ID"]},
			s : "$select=ID,Name"
		}, {
			o : {$expand : {SO_2_SOITEM : true, SO_2_BP : true}},
			s : "$expand=SO_2_BP,SO_2_SOITEM"
		}, {
			o : {$expand : {SO_2_BP : true, SO_2_SOITEM : {$select : "CurrencyCode"}}},
			s : "$expand=SO_2_BP,SO_2_SOITEM($select=CurrencyCode)"
		}, {
			o : {
				$expand : {
					SO_2_BP : true,
					SO_2_SOITEM : {
						$select : ["Note", "ItemPosition"]
					}
				}
			},
			s : "$expand=SO_2_BP,SO_2_SOITEM($select=ItemPosition,Note)"
		}, {
			o : {
				$expand : {
					SO_2_SOITEM : {
						$expand : {
							SOITEM_2_SO : true,
							SOITEM_2_PRODUCT : {
								$expand : {
									PRODUCT_2_BP : true
								},
								$filter : "CurrencyCode eq 'EUR'",
								$select : "CurrencyCode"
							}
						}
					},
					SO_2_BP : true
				},
				"sap-client" : "003"
			},
			s : "$expand=SO_2_BP,SO_2_SOITEM($expand=SOITEM_2_PRODUCT($expand=PRODUCT_2_BP;"
			+ "$filter=CurrencyCode%20eq%20'EUR';$select=CurrencyCode),SOITEM_2_SO)"
			+ "&sap-client=003"
		}].forEach(function (oFixture) {
			var oRequestor = _Requestor.create("/~/");

			assert.strictEqual(
				oRequestor.buildQueryString("/Foo", oFixture.o, undefined, true), "?" + oFixture.s,
				oFixture.s);
		});
	});

	//*********************************************************************************************
	QUnit.test("formatPropertyAsLiteral", function (assert) {
		var sKeyPredicate = "(~)",
			oProperty = {
				$Type : "Edm.Foo"
			},
			oRequestor = _Requestor.create("/"),
			sResult,
			vValue = {};

		this.mock(_Helper).expects("formatLiteral")
			.withExactArgs(sinon.match.same(vValue), oProperty.$Type)
			.returns(sKeyPredicate);

		// code under test
		sResult = oRequestor.formatPropertyAsLiteral(vValue, oProperty);

		assert.strictEqual(sResult, sKeyPredicate);
	});

	//*********************************************************************************************
	QUnit.test("ready()", function (assert) {
		var oRequestor = _Requestor.create("/");

		assert.strictEqual(oRequestor.ready().getResult(), undefined);
	});

	//*********************************************************************************************
	QUnit.test("fetchTypeForPath", function (assert) {
		var oPromise = {},
			oRequestor = _Requestor.create("/", oModelInterface);

		this.mock(oRequestor.oModelInterface).expects("fetchMetadata")
			.withExactArgs("/EMPLOYEES/EMPLOYEE_2_TEAM/").returns(oPromise);

		// code under test
		assert.strictEqual(oRequestor.fetchTypeForPath("/EMPLOYEES/EMPLOYEE_2_TEAM"), oPromise);
	});

	//*********************************************************************************************
	QUnit.test("fetchTypeForPath, bAsName=true", function (assert) {
		var oPromise = {},
			oRequestor = _Requestor.create("/", oModelInterface);

		this.mock(oRequestor.oModelInterface).expects("fetchMetadata")
			.withExactArgs("/EMPLOYEES/EMPLOYEE_2_TEAM/$Type").returns(oPromise);

		// code under test
		assert.strictEqual(oRequestor.fetchTypeForPath("/EMPLOYEES/EMPLOYEE_2_TEAM", true),
			oPromise);
	});

	//*********************************************************************************************
	[{
		iCallCount : 1,
		mHeaders : { "OData-Version" : "4.0" }
	}, {
		iCallCount : 2,
		mHeaders : {}
	}].forEach(function (oFixture, i) {
		QUnit.test("doCheckVersionHeader, success cases - " + i, function (assert) {
			var oRequestor = _Requestor.create("/"),
				fnGetHeader = this.spy(function (sHeaderKey) {
					return oFixture.mHeaders[sHeaderKey];
				});

			// code under test
			oRequestor.doCheckVersionHeader(fnGetHeader, "Foo('42')/Bar", true);

			assert.strictEqual(fnGetHeader.calledWithExactly("OData-Version"), true);
			if (oFixture.iCallCount === 2) {
				assert.strictEqual(fnGetHeader.calledWithExactly("DataServiceVersion"), true);
			}
			assert.strictEqual(fnGetHeader.callCount, oFixture.iCallCount);
		});
	});

	//*********************************************************************************************
	[{
		iCallCount : 1,
		sError : "value 'foo' in response for /Foo('42')/Bar",
		mHeaders : { "OData-Version" : "foo" }
	}, {
		iCallCount : 2,
		sError : "value 'undefined' in response for /Foo('42')/Bar",
		mHeaders : {}
	}, {
		iCallCount : 2,
		sError : "'DataServiceVersion' header with value 'baz' in response for /Foo('42')/Bar",
		mHeaders : { "DataServiceVersion" : "baz" }
	}].forEach(function (oFixture, i) {
		QUnit.test("doCheckVersionHeader, error cases - " + i, function (assert) {
			var oRequestor = _Requestor.create("/"),
				fnGetHeader = this.spy(function (sHeaderKey) {
					return oFixture.mHeaders[sHeaderKey];
				});

			assert.throws(function () {
				// code under test
				oRequestor.doCheckVersionHeader(fnGetHeader, "Foo('42')/Bar");
			}, new Error("Expected 'OData-Version' header with value '4.0' but received "
				+ oFixture.sError));

			assert.strictEqual(fnGetHeader.calledWithExactly("OData-Version"), true);
			if (oFixture.iCallCount === 2) {
				assert.strictEqual(fnGetHeader.calledWithExactly("DataServiceVersion"), true);
			}
			assert.strictEqual(fnGetHeader.callCount, oFixture.iCallCount);
		});
	});

	//*********************************************************************************************
	if (TestUtils.isRealOData()) {
		QUnit.test("request(...)/submitBatch (realOData) success", function (assert) {
			var oRequestor = _Requestor.create(TestUtils.proxy(sServiceUrl), oModelInterface),
				sResourcePath = "TEAMS('TEAM_01')";

			function assertResult(oPayload) {
				delete oPayload["@odata.metadataEtag"];
				assert.deepEqual(oPayload, {
					"@odata.context" : "$metadata#TEAMS/$entity",
					"Team_Id" : "TEAM_01",
					Name : "Business Suite",
					MEMBER_COUNT : 2,
					MANAGER_ID : "3",
					BudgetCurrency : "USD",
					Budget : "555.55"
				});
			}

			return oRequestor.request("GET", sResourcePath).then(assertResult)
				.then(function () {
					return Promise.all([
						oRequestor.request("GET", sResourcePath, new _GroupLock("group"))
							.then(assertResult),
						oRequestor.request("GET", sResourcePath, new _GroupLock("group"))
							.then(assertResult),
						oRequestor.submitBatch("group")
					]);
				});
		});

		//*****************************************************************************************
		QUnit.test("request(...)/submitBatch (realOData) fail", function (assert) {
			var oRequestor = _Requestor.create(TestUtils.proxy(sServiceUrl), oModelInterface);

			oRequestor.request(
				"GET", "TEAMS('TEAM_01')", new _GroupLock("group")
			).then(function (oResult) {
				delete oResult["@odata.metadataEtag"];
				assert.deepEqual(oResult, {
					"@odata.context" : "$metadata#TEAMS/$entity",
					"Team_Id" : "TEAM_01",
					Name : "Business Suite",
					MEMBER_COUNT : 2,
					MANAGER_ID : "3",
					BudgetCurrency : "USD",
					Budget : "555.55"
				});
			}, function (oError) {
				assert.ok(false, oError);
			});

			oRequestor.request("GET", "fail", new _GroupLock("group")).then(function (oResult) {
				assert.ok(false, oResult);
			}, function (oError) {
				assert.ok(oError instanceof Error);
				assert.strictEqual(typeof oError.error, "object");
				assert.strictEqual(typeof oError.message, "string");
				assert.strictEqual(oError.status, 404);
			});

			return oRequestor.submitBatch("group").then(function (oResult) {
				assert.strictEqual(oResult, undefined);
			});
		});

		//*****************************************************************************************
		QUnit.test("request(ProductList)/submitBatch (realOData) patch", function (assert) {
			var oBody = {Name : "modified by QUnit test"},
				oRequestor = _Requestor.create(TestUtils.proxy(sSampleServiceUrl), oModelInterface),
				sResourcePath = "ProductList('HT-1001')";

			return Promise.all([
					oRequestor.request("PATCH", sResourcePath, new _GroupLock("group"), {
								"If-Match" : {"@odata.etag" : "*"}
							}, oBody)
						.then(function (oResult) {
							TestUtils.deepContains(oResult, oBody);
						}),
					oRequestor.submitBatch("group")
				]);
		});

		//*****************************************************************************************
		QUnit.test("submitBatch (real OData): error in change set", function (assert) {
			var oCommonError,
				oEntity = {
					"@odata.etag" : "*"
				},
				oRequestor = _Requestor.create(TestUtils.proxy(sSampleServiceUrl), oModelInterface);

			function onError(oError) {
				if (oCommonError) {
					assert.strictEqual(oError, oCommonError);
				} else {
					oCommonError = oError;
				}
			}

			return Promise.all([
				oRequestor.request("PATCH", "ProductList('HT-1001')", new _GroupLock("group"),
						{"If-Match" : oEntity}, {Name : "foo"})
					.then(undefined, onError),
				oRequestor.request("POST", "Unknown", new _GroupLock("group"), undefined, {})
					.then(undefined, onError),
				oRequestor.request("PATCH", "ProductList('HT-1001')", new _GroupLock("group"),
						{"If-Match" : oEntity}, {Name : "bar"})
					.then(undefined, onError),
				oRequestor.request("GET", "SalesOrderList?$skip=0&$top=10", new _GroupLock("group"))
					.then(undefined, function (oError) {
						assert.strictEqual(oError.message,
							"HTTP request was not processed because the previous request failed");
					}),
				oRequestor.submitBatch("group")
			]);
		});
	}

	//*********************************************************************************************
	QUnit.test("getPathAndAddQueryOptions: Action", function (assert) {
		var oOperationMetadata = {
				$kind : "Action",
				"$Parameter" : [{
					"$Name" : "Foo"
				}, {
					"$Name" : "ID"
				}]
			},
			mParameters = {"ID" : "1", "Foo" : 42, "n/a" : NaN},
			oRequestor = _Requestor.create("/");

		// code under test
		assert.strictEqual(
			oRequestor.getPathAndAddQueryOptions("/OperationImport(...)", oOperationMetadata,
				mParameters),
			"OperationImport");

		assert.deepEqual(mParameters, {"ID" : "1", "Foo" : 42}, "n/a is removed");

		// code under test
		assert.strictEqual(
			oRequestor.getPathAndAddQueryOptions("/Entity('0815')/bound.Operation(...)",
				{$kind : "Action"}, mParameters),
			"Entity('0815')/bound.Operation");

		assert.deepEqual(mParameters, {}, "no parameters accepted");
	});

	//*********************************************************************************************
	QUnit.test("getPathAndAddQueryOptions: Function", function (assert) {
		var oOperationMetadata = {
				$kind : "Function",
				$Parameter : [{
					$Name : "føø",
					$Type : "Edm.String"
				}, {
					$Name : "p2",
					$Type : "Edm.Int16"
				}, { // unused collection parameter must not lead to an error
					$Name : "p3",
					//$Nullable : true,
					$isCollection : true
				}]
			},
			oRequestor = _Requestor.create("/"),
			oRequestorMock = this.mock(oRequestor);

		oRequestorMock.expects("formatPropertyAsLiteral")
			.withExactArgs("bãr'1", oOperationMetadata.$Parameter[0]).returns("'bãr''1'");
		oRequestorMock.expects("formatPropertyAsLiteral")
			.withExactArgs(42,  oOperationMetadata.$Parameter[1]).returns("42");

		assert.strictEqual(
			// code under test
			oRequestor.getPathAndAddQueryOptions("/some.Function(...)", oOperationMetadata,
				{"føø" : "bãr'1", "p2" : 42, "n/a" : NaN}),
			"some.Function(f%C3%B8%C3%B8='b%C3%A3r''1',p2=42)");
	});

	//*********************************************************************************************
	QUnit.test("getPathAndAddQueryOptions: Function w/o parameters", function (assert) {
		var oOperationMetadata = {$kind : "Function"},
			oRequestor = _Requestor.create("/");

		this.mock(oRequestor).expects("formatPropertyAsLiteral").never();

		assert.strictEqual(
			// code under test
			oRequestor.getPathAndAddQueryOptions("/some.Function(...)", oOperationMetadata, {}),
			"some.Function()");
	});

	//*********************************************************************************************
	QUnit.test("getPathAndAddQueryOptions: Function w/ collection parameter", function (assert) {
		var oOperationMetadata = {
				$kind : "Function",
				$Parameter : [{$Name : "foo", $isCollection : true}]
			},
			oRequestor = _Requestor.create("/");

		this.mock(oRequestor).expects("formatPropertyAsLiteral").never();

		assert.throws(function () {
			// code under test
			oRequestor.getPathAndAddQueryOptions("/some.Function(...)", oOperationMetadata,
				{"foo" : [42]});
		}, new Error("Unsupported collection-valued parameter: foo"));
	});
	//TODO what about actions & collections?

	//*****************************************************************************************
	QUnit.test("isActionBodyOptional", function (assert) {
		var oRequestor = _Requestor.create("/");

		assert.strictEqual(oRequestor.isActionBodyOptional(), false);
	});

	//*****************************************************************************************
	QUnit.test("reportUnboundMessages", function (assert) {
		var sMessages = '[{"code" : "42"}]',
			oRequestor = _Requestor.create("/", oModelInterface),
			sResourcePath = "Procduct(42)/to_bar";

		this.mock(oModelInterface).expects("reportUnboundMessages")
			.withExactArgs(sResourcePath, [{code : "42"}]);

		// code under test
		oRequestor.reportUnboundMessagesAsJSON(sResourcePath, sMessages);
	});

	//*****************************************************************************************
	QUnit.test("reportUnboundMessages without messages", function (assert) {
		var oRequestor = _Requestor.create("/", oModelInterface);

		this.mock(oModelInterface).expects("reportUnboundMessages")
			.withExactArgs("foo(42)/to_bar", null);

		// code under test
		oRequestor.reportUnboundMessagesAsJSON("foo(42)/to_bar");
	});

	//*****************************************************************************************
	QUnit.test("getModelInterface", function (assert) {
		var oRequestor = _Requestor.create("/", oModelInterface);

		// code under test
		assert.strictEqual(oRequestor.getModelInterface(), oModelInterface);
	});

	//*****************************************************************************************
	QUnit.test("getOrCreateBatchQueue", function (assert) {
		var aBatchQueue,
			oInterface = {},
			oRequestor = _Requestor.create("/", oInterface);

		function checkBatchQueue(oBatchQueue0, sGroupId) {
			assert.strictEqual(oRequestor.mBatchQueue[sGroupId], oBatchQueue0);
			assert.strictEqual(oBatchQueue0.length, 1);
			assert.strictEqual(oBatchQueue0.iChangeSet, 0);
			assert.strictEqual(oBatchQueue0[0].length, 0);
			assert.strictEqual(oBatchQueue0[0].iSerialNumber, 0);
		}

		// code under test
		aBatchQueue = oRequestor.getOrCreateBatchQueue("group");

		checkBatchQueue(aBatchQueue, "group");

		// code under test
		assert.strictEqual(oRequestor.getOrCreateBatchQueue("group"), aBatchQueue);

		oInterface.onCreateGroup = function () {};
		this.mock(oInterface).expects("onCreateGroup").withExactArgs("group2");

		// code under test
		checkBatchQueue(oRequestor.getOrCreateBatchQueue("group2"), "group2");
	});

	//*****************************************************************************************
	QUnit.test("getSerialNumber", function (assert) {
		var oRequestor = _Requestor.create("/", oModelInterface);

		// code under test
		assert.strictEqual(oRequestor.getSerialNumber(), 1);
		assert.strictEqual(oRequestor.getSerialNumber(), 2);
	});

	//*****************************************************************************************
	QUnit.test("addChangeSet", function (assert) {
		var aChangeSet0 = [],
			oGetRequest = {},
			oRequestor = _Requestor.create("/", oModelInterface),
			aRequests = [aChangeSet0, oGetRequest];

		aRequests.iChangeSet = 0;
		this.mock(oRequestor).expects("getOrCreateBatchQueue").withExactArgs("group")
			.returns(aRequests);
		this.mock(oRequestor).expects("getSerialNumber").withExactArgs().returns(42);

		// code under test
		oRequestor.addChangeSet("group");

		assert.strictEqual(aRequests.length, 3);
		assert.strictEqual(aRequests.iChangeSet, 1);
		assert.strictEqual(aRequests[1].length, 0);
		assert.strictEqual(aRequests[0], aChangeSet0);
		assert.strictEqual(aRequests[0].iSerialNumber, undefined);
		assert.strictEqual(aRequests[1].iSerialNumber, 42);
		assert.strictEqual(aRequests[2], oGetRequest);
	});

	//*****************************************************************************************
	[{
		changes : false,
		requests : [],
		result : [],
		title : "no requests"
	}, {
		changes : false,
		requests : [[], {method : "GET", url : "Products"}],
		result : [{method : "GET", url : "Products"}],
		title : "delete empty change set"
	}, {
		changes : true,
		requests : [[{method : "PATCH", url : "Products('0')", body : {Name : "p1"}}]],
		result : [{method : "PATCH", url : "Products('0')", body : {Name : "p1"}}],
		title : "unwrap change set"
	}, {
		changes : true,
		requests : [[
			{method : "PATCH", url : "Products('0')", body : {Name : null},
				headers : {"If-Match" : "ETag0"}, $promise : {}},
			{method : "PATCH", url : "Products('0')", body : {Name : "bar"},
				headers : {"If-Match" : "ETag0"}, $resolve : function () {}, _mergeInto : 0},
			{method : "PATCH", url : "Products('0')", body : {Note : "hello, world"},
				headers : {"If-Match" : "ETag0"}, $resolve : function () {}, _mergeInto : 0},
			{method : "PATCH", url : "Products('1')", body : {Name : "p1"},
				headers : {"If-Match" : "ETag1"}, $promise : {}},
			{method : "PATCH", url : "Products('0')", body : {Name : "bar2"},
				headers : {"If-Match" : "ETag0"}, $resolve : function () {}, _mergeInto : 0},
			{method : "PATCH", url : "Products('0')", body : {Name : "no merge!"},
				headers : {"If-Match" : "ETag2"}},
			{method : "POST", url : "Products", body : {Name : "baz"}},
			{method : "POST", url : "Products('0')/GetCurrentStock", body : {Name : "baz"},
				headers : {"If-Match" : "ETag0"}},
			{method : "PATCH", url : "BusinessPartners('42')",
				body : {Address : null}, headers : {"If-Match" : "ETag3"}, $promise : {}},
			{method : "PATCH", url : "BusinessPartners('42')",
				body : {Address : {City : "Walldorf"}}, headers : {"If-Match" : "ETag3"},
				$resolve : function () {}, _mergeInto : 8},
			{method : "PATCH", url : "BusinessPartners('42')",
				body : {Address : {PostalCode : "69190"}}, headers : {"If-Match" : "ETag3"},
				$resolve : function () {}, _mergeInto : 8}
		], {
			method : "GET", url : "Products"
		}],
		result : [[
			{method : "PATCH", url : "Products('0')", body : {Name : "bar2", Note : "hello, world"},
				headers : {"If-Match" : "ETag0"}},
			{method : "PATCH", url : "Products('1')", body : {Name : "p1"},
				headers : {"If-Match" : "ETag1"}},
			{method : "PATCH", url : "Products('0')", body : {Name : "no merge!"},
				headers : {"If-Match" : "ETag2"}},
			{method : "POST", url : "Products", body : {Name : "baz"}},
			{method : "POST", url : "Products('0')/GetCurrentStock", body : {Name : "baz"},
				headers : {"If-Match" : "ETag0"}},
			{method : "PATCH", url : "BusinessPartners('42')",
				body : {Address : {City : "Walldorf", PostalCode : "69190"}},
				headers : {"If-Match" : "ETag3"}}
		], {
			method : "GET", url : "Products"
		}],
		title : "merge PATCHes"
	}, {
		changes : true,
		requests : [
			[],
			[{method : "PATCH", url : "Products('0')", body : {Name : "p1"}}],
			[
				{method : "PATCH", url : "Products('0')", body : {Name : null},
					headers : {"If-Match" : "ETag0"}, $promise : {}},
				{method : "PATCH", url : "Products('0')", body : {Name : "bar"},
					headers : {"If-Match" : "ETag0"}, $resolve : function () {}, _mergeInto : 0}
			],
			[
				{method : "POST", url : "Products('0')/GetCurrentStock", body : {Name : "baz"},
					headers : {"If-Match" : "ETag0"}},
				{method : "PATCH", url : "BusinessPartners('42')",
					body : {Address : {City : "Walldorf"}}, headers : {"If-Match" : "ETag3"}}
			],
			[],
			{method : "GET", url : "Products"}
		],
		result : [
			{method : "PATCH", url : "Products('0')", body : {Name : "p1"}},
			{method : "PATCH", url : "Products('0')", body : {Name : "bar"},
				headers : {"If-Match" : "ETag0"}},
			[
				{method : "POST", url : "Products('0')/GetCurrentStock", body : {Name : "baz"},
					headers : {"If-Match" : "ETag0"}},
				{method : "PATCH", url : "BusinessPartners('42')",
					body : {Address : {City : "Walldorf"}},
					headers : {"If-Match" : "ETag3"}}
			],
			{method : "GET", url : "Products"}
		],
		title : "multiple change sets"
	}].forEach(function (oFixture) {
		QUnit.test("cleanUpChangeSets, " + oFixture.title, function (assert) {
			var oRequestor = _Requestor.create("/", oModelInterface),
				that = this;

			function checkRequests(aActualRequests, aExpectedRequests) {
				assert.strictEqual(aActualRequests.length, aExpectedRequests.length);
				aActualRequests.forEach(function (vActualRequest, i) {
					if (Array.isArray(vActualRequest)) { // change set
						checkRequests(vActualRequest, aExpectedRequests[i]);
						return;
					}
					assert.strictEqual(vActualRequest.method, aExpectedRequests[i].method);
					assert.deepEqual(vActualRequest.body, aExpectedRequests[i].body);
					assert.deepEqual(vActualRequest.headers, aExpectedRequests[i].headers);
				});
			}

			oFixture.requests.forEach(function (vActualRequest, i) {
				if (Array.isArray(vActualRequest)) { // change set
					oFixture.requests.iChangeSet = i;
					vActualRequest.forEach(function (oRequest) {
						if (oRequest.$resolve) {
							that.mock(oRequest).expects("$resolve")
								.withExactArgs(vActualRequest[oRequest._mergeInto].$promise);
						}
					});
				}
			});

			// code under test
			assert.strictEqual(oRequestor.cleanUpChangeSets(oFixture.requests), oFixture.changes);

			checkRequests(oFixture.requests, oFixture.result);
		});
	});

	//*****************************************************************************************
	QUnit.test("clearSessionContext", function (assert) {
		var oRequestor = _Requestor.create(sServiceUrl, oModelInterface),
			iSessionTimer = {/*a number*/};

		oRequestor.mHeaders["SAP-ContextId"] = "context";
		oRequestor.iSessionTimer = iSessionTimer;
		this.mock(window).expects("clearInterval").withExactArgs(sinon.match.same(iSessionTimer));

		// code under test
		oRequestor.clearSessionContext();

		assert.strictEqual(oRequestor.iSessionTimer, 0);
		assert.notOk("SAP-ContextId" in oRequestor.mHeaders);

		// code under test
		oRequestor.clearSessionContext();
	});

	//*****************************************************************************************
	QUnit.test("setSessionContext: SAP-Http-Session-Timeout=null", function (assert) {
		var oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

		this.mock(oRequestor).expects("clearSessionContext").withExactArgs();

		// code under test
		oRequestor.setSessionContext("context", null);

		assert.strictEqual(oRequestor.mHeaders["SAP-ContextId"], "context");
		assert.strictEqual(oRequestor.iSessionTimer, 0);
	});

	//*****************************************************************************************
	QUnit.test("setSessionContext: SAP-Http-Session-Timeout=60", function (assert) {
		var oRequestor = _Requestor.create(sServiceUrl, oModelInterface),
			iSessionTimer = {};

		this.mock(oRequestor).expects("clearSessionContext").withExactArgs();
		this.mock(window).expects("setInterval")
			.withExactArgs(sinon.match.func, 55000)
			.returns(iSessionTimer);

		// code under test
		oRequestor.setSessionContext("context", "60");

		assert.strictEqual(oRequestor.mHeaders["SAP-ContextId"], "context");
		assert.strictEqual(oRequestor.iSessionTimer, iSessionTimer);
	});

	//*****************************************************************************************
	["59", "0", "-100", "", "FooBar42", "60.0", " "].forEach(function (sTimeout) {
		QUnit.test("setSessionContext: unsupported header: " + sTimeout, function (assert) {
			var oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

			this.mock(oRequestor).expects("clearSessionContext").withExactArgs();
			this.oLogMock.expects("warning")
				.withExactArgs("Unsupported SAP-Http-Session-Timeout header",
					sTimeout, sClassName);

			// code under test
			oRequestor.setSessionContext("context", sTimeout);

			assert.strictEqual(oRequestor.mHeaders["SAP-ContextId"], "context");
			assert.strictEqual(oRequestor.iSessionTimer, 0);
		});
	});

	//*****************************************************************************************
	QUnit.test("setSessionContext: no SAP-ContextId", function (assert) {
		var oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

		this.mock(window).expects("setInterval").never();
		this.mock(oRequestor).expects("clearSessionContext").withExactArgs();

		// code under test
		oRequestor.setSessionContext(null, "120");
	});

	//*****************************************************************************************
	QUnit.test("setSessionContext: succesful ping", function (assert) {
		var oExpectation,
			oRequestor = _Requestor.create(sServiceUrl, oModelInterface, {}, {
				"sap-client" : "120"
			});

		oExpectation = this.mock(window).expects("setInterval")
			.withExactArgs(sinon.match.func, 115000);

		oRequestor.setSessionContext("context", "120");

		this.mock(jQuery).expects("ajax").withExactArgs(sServiceUrl + "?sap-client=120", {
				headers : sinon.match({
					"SAP-ContextId" : "context"
				}),
				method : "HEAD"
			})
			.returns(createMock(assert, undefined, "OK", {}));

		// code under test
		oExpectation.callArg(0); //callback
	});

	//*****************************************************************************************
	[false, true].forEach(function (bErrorId) {
		QUnit.test("setSessionContext: error in ping, " + bErrorId, function (assert) {
			var that = this;

			return new Promise(function (resolve) {
				var oExpectation,
					oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

				oExpectation = that.mock(window).expects("setInterval")
					.withExactArgs(sinon.match.func, 115000);

				oRequestor.setSessionContext("context", "120");

				that.mock(jQuery).expects("ajax").withExactArgs(sServiceUrl, {
						headers : sinon.match({
							"SAP-ContextId" : "context"
						}),
						method : "HEAD"
					})
					.callsFake(function () {
						var jqXHR = new jQuery.Deferred();

						setTimeout(function () {
							jqXHR.reject({
								getResponseHeader : function (sName) {
									assert.strictEqual(sName, "SAP-Err-Id");
									return bErrorId ? "ICMENOSESSION" : null;
								},
								"status" : 500
							});
							resolve();
						}, 0);
						return jqXHR;
					});
				that.oLogMock.expects("error").exactly(bErrorId ? 1 : 0)
					.withExactArgs("Session not found on server", undefined, sClassName);
				that.mock(oRequestor).expects("clearSessionContext").exactly(bErrorId ? 1 : 0)
					.withExactArgs();

				// code under test
				oExpectation.callArg(0); //callback
			});
		});
	});

	//*****************************************************************************************
	QUnit.test("setSessionContext: callback termination", function (assert) {
		var oClock,
			oExpectation,
			oRequestor = _Requestor.create(sServiceUrl, oModelInterface);

		oClock = sinon.useFakeTimers();
		try {
			oExpectation = this.mock(window).expects("setInterval")
				.withExactArgs(sinon.match.func, 115000);

			oRequestor.setSessionContext("context", "120");

			oClock.tick(15 * 60 * 1000); // 15 min
			this.mock(jQuery).expects("ajax").never();
			this.mock(oRequestor).expects("clearSessionContext").withExactArgs();

			// code under test
			oExpectation.callArg(0); //callback
		} finally {
			oClock.restore();
		}
	});

	//*****************************************************************************************
	QUnit.test("keep the session alive", function (assert) {
		var oClock,
			oJQueryMock = this.mock(jQuery),
			oRequestor = _Requestor.create(sServiceUrl, oModelInterface),
			sResourcePath = "Employees('1')/namespace.Prepare";

		oClock = sinon.useFakeTimers();
		return new Promise(function (resolve) {
			oJQueryMock.expects("ajax")
				.withExactArgs(sServiceUrl + sResourcePath, {
					data : undefined,
					headers : sinon.match.object,
					method : "POST"
				})
				.returns(createMock(assert, {}, "OK", {
					"OData-Version" : "4.0",
					"SAP-ContextId" : "context",
					"SAP-Http-Session-Timeout" : "600"
				}));

			// send a request that starts a session with timeout=600 (10 min)
			return oRequestor.sendRequest("POST", sResourcePath).then(function () {
				oJQueryMock.expects("ajax").withExactArgs(sServiceUrl, {
						headers : sinon.match({
							"SAP-ContextId" : "context"
						}),
						method : "HEAD"
					})
					.returns(createMock(assert, undefined, "OK", {}));

				// expect a "ping" request after 9 min 55 sec
				oClock.tick(595000);

				// expect no "ping" request, but a terminated session after another 9 min 55 sec
				// (more than 15 min have passed since the latest request)
				oClock.tick(595000);

				assert.notOk("SAP-ContextId" in oRequestor.mHeaders);
				resolve();
			});
		}).finally(function () {
			oRequestor.destroy();
			oClock.restore();
		});
	});
});
// TODO: continue-on-error? -> flag on model
// TODO: cancelChanges: what about existing GET requests in deferred queue (delete or not)?
// TODO: tests for doConvertSystemQueryOptions missing. Only tested indirectly