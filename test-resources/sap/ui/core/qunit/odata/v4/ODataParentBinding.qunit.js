/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"jquery.sap.global",
	"sap/base/Log",
	"sap/ui/base/SyncPromise",
	"sap/ui/model/Binding",
	"sap/ui/model/ChangeReason",
	"sap/ui/model/odata/v4/Context",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/model/odata/v4/ODataParentBinding",
	"sap/ui/model/odata/v4/lib/_GroupLock",
	"sap/ui/model/odata/v4/lib/_Helper"
], function (jQuery, Log, SyncPromise, Binding, ChangeReason, Context, ODataModel,
		asODataParentBinding, _GroupLock, _Helper) {
	/*global QUnit, sinon */
	/*eslint no-warning-comments: 0, max-nested-callbacks: 0*/
	"use strict";

	var sClassName = "sap.ui.model.odata.v4.ODataParentBinding";

	/**
	 * Returns a clone, that is a deep copy, of the given object.
	 *
	 * @param {object} o
	 *   any serializable object
	 * @returns {object}
	 *   a deep copy of <code>o</code>
	 */
	function clone(o) {
		return JSON.parse(JSON.stringify(o));
	}

	/**
	 * Constructs a test object.
	 *
	 * @param {object} [oTemplate={}]
	 *   A template object to fill the binding, all properties are copied
	 */
	function ODataParentBinding(oTemplate) {
		asODataParentBinding.call(this);

		jQuery.extend(this, {
			oCachePromise : SyncPromise.resolve(), // mimic c'tor
			getDependentBindings : function () {}, // implemented by all sub-classes
			//Returns the metadata for the class that this object belongs to.
			getMetadata : function () {
				return {
					getName : function () {
						return sClassName;
					}
				};
			},
			isSuspended : Binding.prototype.isSuspended
		}, oTemplate);
	}

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4.ODataParentBinding", {
		before : function () {
			asODataParentBinding(ODataParentBinding.prototype);
		},

		beforeEach : function () {
			this.oLogMock = this.mock(Log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();
		}
	});

	//*********************************************************************************************
	QUnit.test("initialize members for mixin", function (assert) {
		var oBinding = {};

		ODataParentBinding.call(oBinding);

		assert.deepEqual(oBinding.mAggregatedQueryOptions, {});
		assert.strictEqual(oBinding.bAggregatedQueryOptionsInitial, true);
		assert.deepEqual(oBinding.aChildCanUseCachePromises, []);
		assert.strictEqual(oBinding.iPatchCounter, 0);
		assert.strictEqual(oBinding.bPatchSuccess, true);
		assert.ok("oResumePromise" in oBinding);
		assert.strictEqual(oBinding.oResumePromise, undefined);

		// members introduced by ODataBinding; check inheritance
		assert.ok(oBinding.hasOwnProperty("mCacheByResourcePath"));
		assert.strictEqual(oBinding.mCacheByResourcePath, undefined);
	});

	//*********************************************************************************************
	[false, true].forEach(function (bSuspended) {
		QUnit.test("initialize: absolute, suspended = " + bSuspended, function (assert) {
			var oBinding = new ODataParentBinding({
					bRelative : false,
					_fireChange : function () {}
				}),
				oBindingMock = this.mock(oBinding);

			oBindingMock.expects("getRootBinding").withExactArgs().returns(oBinding);
			oBindingMock.expects("isSuspended").withExactArgs().returns(bSuspended);

			oBindingMock.expects("_fireChange")
				.exactly(bSuspended ? 0 : 1)
				.withExactArgs({reason : ChangeReason.Change});

			// code under test
			oBinding.initialize();
		});
	});

	//*********************************************************************************************
	QUnit.test("initialize: relative, unresolved", function (assert) {
		var oBinding = new ODataParentBinding({
				oContext : null,
				bRelative : true,
				_fireChange : function () {}
			});

		this.mock(oBinding).expects("_fireChange").never();

		// code under test
		oBinding.initialize();
	});

	//*********************************************************************************************
	[false, true].forEach(function (bSuspended) {
		QUnit.test("initialize: relative, resolved, bSuspended = " + bSuspended, function (assert) {
			var oBinding = new ODataParentBinding({
					oContext : {},
					bRelative : true,
					_fireChange : function () {}
				}),
				oBindingMock = this.mock(oBinding),
				oRootBinding = {
					isSuspended : function () {}
				};

			oBindingMock.expects("getRootBinding").withExactArgs().returns(oRootBinding);
			this.mock(oRootBinding).expects("isSuspended").withExactArgs().returns(bSuspended);
			oBindingMock.expects("_fireChange")
				.exactly(bSuspended ? 0 : 1)
				.withExactArgs({reason : ChangeReason.Change});

			// code under test
			oBinding.initialize();
		});
	});

	//*********************************************************************************************
	[{ // $select=Bar
		options : {
			$select : "Bar"
		},
		path : "FooSet/WithoutExpand",
		result : {}
	}, { // $expand(FooSet=$expand(BarSet=$select(Baz)))
		options : {
			$expand : {
				FooSet : {
					$expand : {
						BarSet : {
							$select : "Baz"
						}
					}
				}
			}
		},
		path : "15/FooSet('0815')/12/BarSet",
		result : {
			$select : "Baz"
		}
	}, { // $expand(ExpandWithoutOptions)
		options : {
			$expand : {
				ExpandWithoutOptions : true
			}
		},
		path : "ExpandWithoutOptions",
		result : {}
	}, { // $expand(FooSet=$select(Bar,Baz))
		options : {
			$expand : {
				FooSet : {
					$select : ["Bar", "Baz"]
				}
			}
		},
		path : "FooSet('0815')",
		result : {
			$select : ["Bar", "Baz"]
		}
	}, {// $expand(FooSet=$expand(BarSet=$select(Baz)))
		options : {
			$expand : {
				FooSet : {
					$expand : {
						BarSet : {
							$select : "Baz"
						}
					}
				}
			}
		},
		path : "FooSet('0815')/12/BarSet",
		result : {
			$select : "Baz"
		}
	}].forEach(function (oFixture) {
		QUnit.test("getQueryOptionsForPath: binding with mParameters, " + oFixture.path,
				function (assert) {
			var oModel = new ODataModel({
					serviceUrl : "/service/?sap-client=111",
					synchronizationMode : "None"
				}),
				oBinding = new ODataParentBinding({
					oModel : oModel,
					mParameters : {$$groupId : "group"},
					mQueryOptions : oFixture.options,
					bRelative : true
				}),
				mClonedQueryOptions = {},
				oContext = {};

			this.mock(jQuery).expects("extend")
				.withExactArgs(true, {}, oFixture.result)
				.returns(mClonedQueryOptions);

			// code under test
			assert.strictEqual(oBinding.getQueryOptionsForPath(oFixture.path, oContext),
				mClonedQueryOptions);
		});
	});

	//*********************************************************************************************
	QUnit.test("getQueryOptionsForPath: absolute binding, no parameters", function (assert) {
		var oBinding = new ODataParentBinding({
				mParameters : {},
				bRelative : false
			});

		this.mock(jQuery).expects("extend").never();

		// code under test
		assert.deepEqual(oBinding.getQueryOptionsForPath("foo"), {});
	});

	//*********************************************************************************************
	QUnit.test("getQueryOptionsForPath: quasi-absolute binding, no parameters", function (assert) {
		var oBinding = new ODataParentBinding({
				mParameters : {},
				bRelative : true
			}),
			oContext = {}; // no V4 context

		this.mock(jQuery).expects("extend").never();

		// code under test
		assert.deepEqual(oBinding.getQueryOptionsForPath("foo", oContext), {});
	});

	//*********************************************************************************************
	QUnit.test("getQueryOptionsForPath: relative binding using this (base) context",
			function (assert) {
		var oBinding = new ODataParentBinding({
				oContext : {}, // no V4 context
				mParameters : {},
				bRelative : true
			});

		this.mock(jQuery).expects("extend").never();

		// code under test
		assert.deepEqual(oBinding.getQueryOptionsForPath("foo"), {});
	});

	//*********************************************************************************************
	QUnit.test("getQueryOptionsForPath: inherit query options", function (assert) {
		var oBinding = new ODataParentBinding({
				oContext : {
						getQueryOptionsForPath : function () {}
				},
				mParameters : {},
				sPath : "foo",
				bRelative : true
			}),
			sPath = "bar",
			sResultingPath = "foo/bar",
			mResultingQueryOptions = {};

		this.mock(_Helper).expects("buildPath")
			.withExactArgs(oBinding.sPath, sPath)
			.returns(sResultingPath);
		this.mock(oBinding.oContext).expects("getQueryOptionsForPath").withExactArgs(sResultingPath)
			.returns(mResultingQueryOptions);

		// code under test
		assert.strictEqual(oBinding.getQueryOptionsForPath(sPath), mResultingQueryOptions);
	});
	//TODO getQueryOptionsForPath: find inherited query options based on metadata to support
	// structural properties within path
	//TODO handle encoding in getQueryOptionsForPath

	//*********************************************************************************************
	// Note: We decided not to analyze $expand for embedded $filter/$orderby and to treat $apply
	// in the same way. We also decided to use the weakest change reason (Change) in these cases.
	[{
		sTestName : "Add parameter $search",
		sChangeReason : ChangeReason.Filter,
		mParameters : {
			$search : "Foo NOT Bar"
		},
		mExpectedParameters : {
			$apply : "filter(OLD gt 0)",
			$expand : "foo",
			$filter : "OLD gt 1",
			$search : "Foo NOT Bar",
			$select : "ProductID"
		}
	}, {
		sTestName : "Add parameter $orderby",
		sChangeReason : ChangeReason.Sort,
		mParameters : {
			$orderby : "Category"
		},
		mExpectedParameters : {
			$apply : "filter(OLD gt 0)",
			$expand : "foo",
			$filter : "OLD gt 1",
			$orderby : "Category",
			$select : "ProductID"
		}
	}, {
		sTestName : "Delete parameter $expand",
		mParameters : {
			$expand : undefined
		},
		mExpectedParameters : {
			$apply : "filter(OLD gt 0)",
			$filter : "OLD gt 1",
			$select : "ProductID"
		}
	}, {
		sTestName : "Delete parameter $filter",
		sChangeReason : ChangeReason.Filter,
		mParameters : {
			$filter : undefined
		},
		mExpectedParameters : {
			$apply : "filter(OLD gt 0)",
			$expand : "foo",
			$select : "ProductID"
		}
	}, {
		sTestName : "Change parameters $filter and $orderby",
		sChangeReason : ChangeReason.Filter,
		mParameters : {
			$filter : "NEW gt 1",
			$orderby : "Category"
		},
		mExpectedParameters : {
			$apply : "filter(OLD gt 0)",
			$expand : "foo",
			$filter : "NEW gt 1",
			$orderby : "Category",
			$select : "ProductID"
		}
	}, {
		sTestName : "Add, delete, change parameters",
		mParameters : {
			$apply : "filter(NEW gt 0)",
			$expand : {$search : "Foo NOT Bar"},
			$count : true,
			$select : undefined
		},
		mExpectedParameters : {
			$apply : "filter(NEW gt 0)",
			$count : true,
			$expand : {$search : "Foo NOT Bar"},
			$filter : "OLD gt 1"
		}
	}].forEach(function (oFixture) {
		QUnit.test("changeParameters: " + oFixture.sTestName, function (assert) {
			var oBinding = new ODataParentBinding({
					oModel : {},
					mParameters : {
						$apply : "filter(OLD gt 0)",
						$expand : "foo",
						$filter : "OLD gt 1",
						$select : "ProductID"
					},
					sPath : "/ProductList",
					applyParameters : function () {}
				}),
				oBindingMock = this.mock(oBinding),
				sGroupId = "myGroup";

			oBindingMock.expects("checkSuspended").never();
			oBindingMock.expects("hasPendingChanges").returns(false);
			oBindingMock.expects("getGroupId").withExactArgs().returns(sGroupId);
			oBindingMock.expects("createReadGroupLock").withExactArgs(sGroupId, true);
			oBindingMock.expects("applyParameters")
				.withExactArgs(oFixture.mExpectedParameters,
					oFixture.sChangeReason || ChangeReason.Change);

			// code under test
			oBinding.changeParameters(oFixture.mParameters);
		});
	});

	//*********************************************************************************************
	QUnit.test("changeParameters: with undefined map", function (assert) {
		var oBinding = new ODataParentBinding({
				oModel : {},
				mParameters : {},
				sPath : "/EMPLOYEES",
				applyParameters : function () {}
			});

		this.mock(oBinding).expects("applyParameters").never();

		// code under test
		assert.throws(function () {
			oBinding.changeParameters(undefined);
		}, new Error("Missing map of binding parameters"));
		assert.deepEqual(oBinding.mParameters, {}, "parameters unchanged on error");
	});

	//*********************************************************************************************
	QUnit.test("changeParameters: with binding parameters", function (assert) {
		var oBinding = new ODataParentBinding({
				oModel : {},
				mParameters : {},
				sPath : "/EMPLOYEES",
				applyParameters : function () {}
			}),
			oBindingMock = this.mock(oBinding);

		oBindingMock.expects("applyParameters").never();
		oBindingMock.expects("hasPendingChanges").returns(false);

		//code under test
		assert.throws(function () {
			oBinding.changeParameters({
				"$filter" : "Amount gt 3",
				"$$groupId" : "newGroupId"
			});
		}, new Error("Unsupported parameter: $$groupId"));
		assert.deepEqual(oBinding.mParameters, {}, "parameters unchanged on error");
	});

	//*********************************************************************************************
	QUnit.test("changeParameters: with pending changes", function (assert) {
		var oBinding = new ODataParentBinding({
				oModel : {},
				mParameters : {},
				sPath : "/EMPLOYEES",
				applyParameters : function () {}
			}),
			oBindingMock = this.mock(oBinding);

		oBindingMock.expects("applyParameters").never();
		oBindingMock.expects("hasPendingChanges").returns(true);

		assert.throws(function () {
			//code under test
			oBinding.changeParameters({"$filter" : "Amount gt 3"});
		}, new Error("Cannot change parameters due to pending changes"));
		assert.deepEqual(oBinding.mParameters, {}, "parameters unchanged on error");
	});

	//*********************************************************************************************
	QUnit.test("changeParameters: with empty map", function (assert) {
		var oBinding = new ODataParentBinding({
				oModel : {},
				sPath : "/EMPLOYEES",
				applyParameters : function () {}
			}),
			oBindingMock = this.mock(oBinding);

		oBindingMock.expects("hasPendingChanges").returns(false);
		oBindingMock.expects("applyParameters").never();

		// code under test
		oBinding.changeParameters({});
	});

	//*********************************************************************************************
	QUnit.test("changeParameters: try to delete non-existing parameters", function (assert) {
		var oBinding = new ODataParentBinding({
				oModel : {},
				mParameters : {},
				sPath : "/EMPLOYEES"
			});

		this.mock(oBinding).expects("hasPendingChanges").returns(false);

		// code under test
		oBinding.changeParameters({$apply : undefined});

		assert.deepEqual(oBinding.mParameters, {}, "parameters unchanged");
	});

	//*********************************************************************************************
	QUnit.test("changeParameters: try to change existing parameter", function (assert) {
		var mParameters = {
				$apply : "filter(Amount gt 3)"
			},
			oBinding = new ODataParentBinding({
					oModel : {},
					mParameters : {
						$apply : "filter(Amount gt 3)"
					},
					sPath : "/EMPLOYEES",
					applyParameters : function () {}
				}),
			oBindingMock = this.mock(oBinding);

		oBindingMock.expects("hasPendingChanges").returns(false);
		oBindingMock.expects("applyParameters").never();

		// code under test
		oBinding.changeParameters(mParameters);
	});

	//*********************************************************************************************
	QUnit.test("changeParameters: cloning mParameters", function (assert) {
		var oBinding = new ODataParentBinding({
				sGroupId : "myGroup",
				oModel : {
					lockGroup : function () { return new _GroupLock(); }
				},
				mParameters : {},
				sPath : "/EMPLOYEES",
				applyParameters : function (mParameters) {
					this.mParameters = mParameters; // store mParameters at binding after validation
				}
			}),
			mParameters = {
				$expand : {
					SO_2_SOITEM : {
						$orderby : "ItemPosition"
					}
				}
			};

		this.mock(oBinding).expects("hasPendingChanges").returns(false);

		// code under test
		oBinding.changeParameters(mParameters);

		mParameters.$expand.SO_2_SOITEM.$orderby = "ItemID";

		assert.strictEqual(oBinding.mParameters.$expand.SO_2_SOITEM.$orderby, "ItemPosition");
	});

	//*********************************************************************************************
	[{
		name : "$select",
		parameters : {$select : "foo"}
	}, {
		name : "$expand",
		parameters : {$expand : "foo"}
	}, {
		name : "$expand",
		parameters : {$expand : undefined}
	}, {
		name : "$expand",
		parameters : {$expand : {foo : {}}}
	}].forEach(function (oFixture, i) {
		QUnit.test("changeParameters: auto-$expand/$select, " + i, function (assert) {
			var oBinding = new ODataParentBinding({
					oModel : {
						bAutoExpandSelect : true
					},
					mParameters : {},
					applyParameters : function () {}
				});

			this.mock(oBinding).expects("applyParameters").never();

			// code under test
			assert.throws(function () {
				oBinding.changeParameters(oFixture.parameters);
			}, new Error("Cannot change $expand or $select parameter in auto-$expand/$select mode: "
				+ oFixture.name + "=" + JSON.stringify(oFixture.parameters[oFixture.name]))
			);

			assert.deepEqual(oBinding.mParameters, {}, "parameters unchanged on error");
		});
	});

	//*********************************************************************************************
	[{
		aggregatedQueryOptions : {},
		childQueryOptions : {},
		expectedQueryOptions : {}
	}, {
		aggregatedQueryOptions : {$select : ["Name"]},
		childQueryOptions : {$select : ["ID"]},
		expectedQueryOptions : {$select : ["Name", "ID"]}
	}, {
		aggregatedQueryOptions : {},
		childQueryOptions : {$select : ["ID"]},
		expectedQueryOptions : {$select : ["ID"]}
	}, {
		aggregatedQueryOptions : {$select : ["Name"]},
		childQueryOptions : {},
		expectedQueryOptions : {$select : ["Name"]}
	}, {
		aggregatedQueryOptions : {$select : ["ID", "Name"]},
		childQueryOptions : {$select : ["ID"]},
		expectedQueryOptions : {$select : ["ID", "Name"]}
	}, {
		aggregatedQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {$select : ["Team_Id", "Name"]}
			}
		},
		childQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {
					$expand : {
						TEAM_2_MANAGER : {$select : ["Name"]}
					},
					$select : ["Team_Id", "MEMBER_COUNT"]
				}
			},
			$select : ["ID"]
		},
		expectedQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {
					$expand : {
						TEAM_2_MANAGER : {$select : ["Name"]}
					},
					$select : ["Team_Id", "Name", "MEMBER_COUNT"]
				}
			},
			$select : ["ID"]
		}
	}, {
		aggregatedQueryOptions : {$select : ["Team_Id"]},
		childQueryOptions : {$select : ["*"] },
		expectedQueryOptions : {$select : ["Team_Id", "*"] }
	}, {
		aggregatedQueryOptions : {$select : ["*"]},
		childQueryOptions : {$select : ["Team_Id"]},
		expectedQueryOptions : {$select : ["*", "Team_Id"] }
	}, {
		aggregatedQueryOptions : {},
		childQueryOptions : {$count : true},
		expectedQueryOptions : {$count : true}
	}, {
		aggregatedQueryOptions : {$count : true},
		childQueryOptions : {},
		expectedQueryOptions : {$count : true}
	}, {
		aggregatedQueryOptions : {$count : false},
		childQueryOptions : {$count : true},
		expectedQueryOptions : {$count : true}
	}, {
		aggregatedQueryOptions : {$orderby : "Category"},
		childQueryOptions : {$orderby : "Category"},
		expectedQueryOptions : {$orderby : "Category"}
	}, {
		aggregatedQueryOptions : {$apply : "filter(Amount gt 3)"},
		childQueryOptions : {},
		expectedQueryOptions : {$apply : "filter(Amount gt 3)"}
	}, {
		aggregatedQueryOptions : {$filter : "Amount gt 3"},
		childQueryOptions : {},
		expectedQueryOptions : {$filter : "Amount gt 3"}
	}, {
		aggregatedQueryOptions : {$orderby : "Category"},
		childQueryOptions : {},
		expectedQueryOptions : {$orderby : "Category"}
	}, {
		aggregatedQueryOptions : {$search : "Foo NOT Bar"},
		childQueryOptions : {},
		expectedQueryOptions : {$search : "Foo NOT Bar"}
	}].forEach(function (oFixture, i) {
		QUnit.test("aggregateQueryOptions returns true: " + i, function (assert) {
			var oBinding = new ODataParentBinding({
					mAggregatedQueryOptions : oFixture.aggregatedQueryOptions,
					oCachePromise : SyncPromise.resolve(Promise.resolve()) // pending!
				}),
				bMergeSuccess;

			// code under test
			bMergeSuccess = oBinding.aggregateQueryOptions(oFixture.childQueryOptions, false);

			assert.deepEqual(oBinding.mAggregatedQueryOptions, oFixture.expectedQueryOptions);
			assert.strictEqual(bMergeSuccess, true);
		});
	});

	//*********************************************************************************************
	[{ // conflict: parent has $orderby, but child has different $orderby value
		aggregatedQueryOptions : {$orderby : "Category"},
		childQueryOptions : {$orderby : "Category desc"}
	}, { // aggregated query options remain unchanged on conflict ($select is not added)
		aggregatedQueryOptions : {$orderby : "Category" },
		childQueryOptions : {
			$orderby : "Category desc",
			$select : ["Name"]
		}
	}, { // conflict: parent has $apply, but child does not
		aggregatedQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {
					$apply : "filter(Amount gt 3)"
				}
			}
		},
		childQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {}
			}
		}
	}, { // conflict: parent has $filter, but child does not
		aggregatedQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {
					$filter : "Amount gt 3"
				}
			}
		},
		childQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {}
			}
		}
	}, { // conflict: parent has $orderby, but child does not
		aggregatedQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {
					$orderby : "Category"
				}
			}
		},
		childQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {}
			}
		}
	}, { // conflict: parent has $search, but child does not
		aggregatedQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {
					$search : "Foo NOT Bar"
				}
			}
		},
		childQueryOptions : {
			$expand : {
				EMPLOYEE_2_TEAM : {}
			}
		}
	}, { // conflict: parent has no $orderby, but child has $orderby
		aggregatedQueryOptions : {},
		childQueryOptions : {$orderby : "Category", $select : ["Name"]}
	}, {
		aggregatedQueryOptions : {$filter : "Amount gt 3"},
		childQueryOptions : {$filter : "Price gt 300"}
	}].forEach(function (oFixture, i) {
		QUnit.test("aggregateQueryOptions returns false: " + i, function (assert) {
			var oBinding = new ODataParentBinding({
					mAggregatedQueryOptions : oFixture.aggregatedQueryOptions
				}),
				mOriginalQueryOptions = jQuery.extend(true, {}, oFixture.aggregatedQueryOptions),
				bMergeSuccess;

			// code under test
			bMergeSuccess = oBinding.aggregateQueryOptions(oFixture.childQueryOptions, false);

			assert.deepEqual(oBinding.mAggregatedQueryOptions, mOriginalQueryOptions);
			assert.strictEqual(bMergeSuccess, false);
		});
	});

	//*********************************************************************************************
	[{
		canMergeQueryOptions : true,
		hasChildQueryOptions : true,
		initial : true,
		$kind : "Property"
	}, {
		canMergeQueryOptions : true,
		hasChildQueryOptions : true,
		initial : false,
		$kind : "Property"
	}, {
		canMergeQueryOptions : true,
		hasChildQueryOptions : true,
		initial : true,
		$kind : "NavigationProperty"
	}, {
		canMergeQueryOptions : true,
		hasChildQueryOptions : true,
		initial : false,
		$kind : "NavigationProperty"
	}, {
		canMergeQueryOptions : true,
		hasChildQueryOptions : false, // child path has segments which are no properties
		initial : true,
		$kind : "Property"
	}, {
		canMergeQueryOptions : false,
		hasChildQueryOptions : true,
		initial : true,
		$kind : "NavigationProperty"
	}].forEach(function (oFixture, i) {
		[true, false].forEach(function (bCacheCreationPending) {
			QUnit.test("fetchIfChildCanUseCache, multiple calls aggregate query options, "
					+ (bCacheCreationPending ? "no cache yet: " : "use parent's cache: ") + i,
				function (assert) {
					var mAggregatedQueryOptions = {},
						oMetaModel = {
							fetchObject : function () {},
							getMetaPath : function () {}
						},
						oModelInterface = {
							fetchMetadata : function () {}
						},
						oBinding = new ODataParentBinding({
							bAggregatedQueryOptionsInitial : oFixture.initial,
							mAggregatedQueryOptions : mAggregatedQueryOptions,
							oCachePromise : bCacheCreationPending
								? SyncPromise.resolve(Promise.resolve())
								: SyncPromise.resolve(undefined),
							oContext : {},
							doFetchQueryOptions : function () {},
							oModel : {
								getMetaModel : function () { return oMetaModel; },
								oRequestor : {
									getModelInterface : function () {
										return oModelInterface;
									}
								}
							}
						}),
						oBindingMock = this.mock(oBinding),
						mChildLocalQueryOptions = {},
						mChildQueryOptions = oFixture.hasChildQueryOptions ? {} : undefined,
						oContext = Context.create(this.oModel, oBinding, "/EMPLOYEES('2')"),
						mExtendResult = {},
						mLocalQueryOptions = {},
						oMetaModelMock = this.mock(oMetaModel),
						oPromise;

					oMetaModelMock.expects("getMetaPath")
						.withExactArgs("/EMPLOYEES('2')")
						.returns("/EMPLOYEES");
					oMetaModelMock.expects("getMetaPath")
						.withExactArgs("/childPath")
						.returns("/value");
					oBindingMock.expects("doFetchQueryOptions")
						.withExactArgs(sinon.match.same(oBinding.oContext))
						.returns(SyncPromise.resolve(mLocalQueryOptions));
					oMetaModelMock.expects("fetchObject")
						.withExactArgs("/EMPLOYEES/value")
						.returns(SyncPromise.resolve({$kind : oFixture.$kind}));
					this.mock(jQuery).expects("extend")
						.exactly(oFixture.initial ? 1 : 0)
						.withExactArgs(true, {}, sinon.match.same(mLocalQueryOptions))
						.returns(mExtendResult);
					if (oFixture.$kind === "NavigationProperty") {
						oBindingMock.expects("selectKeyProperties").never();
						oMetaModelMock.expects("fetchObject")
							.withExactArgs("/EMPLOYEES/value/")
							.returns(Promise.resolve().then(function () {
								oBindingMock.expects("selectKeyProperties")
									.exactly(oFixture.initial ? 1 : 0)
									.withExactArgs(sinon.match.same(mLocalQueryOptions),
										"/EMPLOYEES");
							}));
					} else {
						oBindingMock.expects("selectKeyProperties")
							.exactly(oFixture.initial ? 1 : 0)
							.withExactArgs(sinon.match.same(mLocalQueryOptions), "/EMPLOYEES");
					}
					this.mock(_Helper).expects("wrapChildQueryOptions")
						.withExactArgs("/EMPLOYEES", "value",
							sinon.match.same(mChildLocalQueryOptions),
							sinon.match.same(oModelInterface.fetchMetadata))
						.returns(mChildQueryOptions);
					oBindingMock.expects("aggregateQueryOptions")
						.exactly(oFixture.hasChildQueryOptions ? 1 : 0)
						.withExactArgs(sinon.match.same(mChildQueryOptions),
							bCacheCreationPending ? sinon.match.falsy : true)
						.returns(oFixture.canMergeQueryOptions);

					// code under test
					oPromise = oBinding.fetchIfChildCanUseCache(oContext, "childPath",
						SyncPromise.resolve(mChildLocalQueryOptions));

					return Promise.all([oPromise, oBinding.oCachePromise]).then(function (aResult) {
						assert.strictEqual(aResult[0],
							oFixture.hasChildQueryOptions && oFixture.canMergeQueryOptions);
						assert.strictEqual(oBinding.aChildCanUseCachePromises[0], oPromise);
						assert.strictEqual(oBinding.mAggregatedQueryOptions,
							oFixture.initial ? mExtendResult : mAggregatedQueryOptions);
						assert.strictEqual(oBinding.bAggregatedQueryOptionsInitial, false);
					});
				}
			);
		});
	});

	//*********************************************************************************************
	[
		SyncPromise.reject.bind(SyncPromise, {}), // "Failed to create cache..."
		SyncPromise.resolve.bind(SyncPromise, { // cache sent read request
			bSentReadRequest : true,
			setQueryOptions : function () {}
		})
	].forEach(function (fnCachePromise, i) {
		QUnit.test("fetchIfChildCanUseCache, immutable cache, " + i, function (assert) {
			var oMetaModel = {
					fetchObject : function () {},
					getMetaPath : function () {}
				},
				oCachePromise = fnCachePromise(),
				oBinding = new ODataParentBinding({
					bAggregatedQueryOptionsInitial : false,
					oCachePromise : oCachePromise,
					doFetchQueryOptions : function () {},
					oModel : {
						getMetaModel : function () {
							return oMetaModel;
						},
						reportError : function () {},
						oRequestor : {
							getModelInterface : function () {
								return {/*fetchMetadata*/};
							}
						}
					}
				}),
				oBindingMock = this.mock(oBinding),
				mChildLocalQueryOptions = {},
				oContext = Context.create(this.oModel, oBinding, "/EMPLOYEES('2')"),
				oMetaModelMock = this.mock(oMetaModel),
				oPromise;

				oMetaModelMock.expects("getMetaPath")
					.withExactArgs("/EMPLOYEES('2')")
					.returns("/EMPLOYEES");
				oMetaModelMock.expects("getMetaPath")
					.withExactArgs("/childPath")
					.returns("/childMetaPath");
				oBindingMock.expects("doFetchQueryOptions")
					.returns(SyncPromise.resolve({}));
				oMetaModelMock.expects("fetchObject")
					.returns(SyncPromise.resolve({$kind : "Property"}));
				this.mock(_Helper).expects("wrapChildQueryOptions").returns({});
				oBindingMock.expects("aggregateQueryOptions")
					.withExactArgs({}, /*bIsCacheImmutable*/true)
					.returns(false);
				if (oCachePromise.isFulfilled()) {
					this.mock(oCachePromise.getResult()).expects("setQueryOptions").never();
				} else {
					this.mock(oBinding.oModel).expects("reportError")
						.withExactArgs(oBinding + ": Failed to enhance query options for "
							+ "auto-$expand/$select for child childPath", sClassName,
							sinon.match.same(oCachePromise.getResult()));
				}

				// code under test
				oPromise = oBinding.fetchIfChildCanUseCache(oContext, "childPath",
					SyncPromise.resolve(mChildLocalQueryOptions));

				return oPromise.then(function (bUseCache) {
					assert.strictEqual(bUseCache, false);
					assert.strictEqual(oBinding.aChildCanUseCachePromises[0], oPromise);
					if (oCachePromise.isFulfilled()) {
						assert.strictEqual(oBinding.oCachePromise.getResult(),
							oCachePromise.getResult());
					}
					// ensure that oCachePromise remains rejected
					assert.strictEqual(oBinding.oCachePromise.isRejected(),
						oCachePromise.isRejected());
				});
			}
		);
	});

	//*********************************************************************************************
	QUnit.test("fetchIfChildCanUseCache, mutable cache", function (assert) {
		var oMetaModel = {
				fetchObject : function () {},
				getMetaPath : function () {}
			},
			oCache = {
				bSentReadRequest : false,
				setQueryOptions : function () {}
			},
			oCachePromise = SyncPromise.resolve(oCache),
			oBinding = new ODataParentBinding({
				mAggregatedQueryOptions : {$select : "foo"},
				bAggregatedQueryOptionsInitial : false,
				oCachePromise : oCachePromise,
				doFetchQueryOptions : function () {},
				oModel : {
					getMetaModel : function () { return oMetaModel; },
					oRequestor : {
						getModelInterface : function () {
							return {/*fetchMetadata*/};
						}
					},
					mUriParameters : {}
				}
			}),
			oBindingMock = this.mock(oBinding),
			mChildLocalQueryOptions = {},
			oContext = Context.create(this.oModel, oBinding, "/EMPLOYEES('2')"),
			oMetaModelMock = this.mock(oMetaModel),
			mNewQueryOptions = {},
			oPromise;

			oMetaModelMock.expects("getMetaPath")
				.withExactArgs("/EMPLOYEES('2')")
				.returns("/EMPLOYEES");
			oMetaModelMock.expects("getMetaPath")
				.withExactArgs("/childPath")
				.returns("/childMetaPath");
			oBindingMock.expects("doFetchQueryOptions")
				.returns(SyncPromise.resolve({}));
			oMetaModelMock.expects("fetchObject")
				.returns(SyncPromise.resolve(Promise.resolve({$kind : "Property"})));
			this.mock(_Helper).expects("wrapChildQueryOptions").returns({});
			oBindingMock.expects("aggregateQueryOptions")
				.withExactArgs({}, /*bIsCacheImmutable*/false)
				.returns(false);
			this.mock(jQuery).expects("extend")
				.withExactArgs(true, {}, sinon.match.same(oBinding.oModel.mUriParameters),
					sinon.match.same(oBinding.mAggregatedQueryOptions))
				.returns(mNewQueryOptions);
			this.mock(oCache).expects("setQueryOptions").withExactArgs(mNewQueryOptions);

			// code under test
			oPromise = oBinding.fetchIfChildCanUseCache(oContext, "childPath",
				SyncPromise.resolve(mChildLocalQueryOptions));

			assert.strictEqual(oBinding.aChildCanUseCachePromises[0], oPromise);
			assert.notStrictEqual(oBinding.oCachePromise, oCachePromise);
			return oBinding.oCachePromise.then(function (oCache0) {
				var bUseCache = oPromise.getResult();

				assert.strictEqual(bUseCache, false);
				assert.strictEqual(oCache0, oCache);
			});
		}
	);

	//*********************************************************************************************
	QUnit.test("fetchIfChildCanUseCache: empty child path", function (assert) {
		var oMetaModel = {
				fetchObject : function () {},
				getMetaPath : function () {}
			},
			oModelInterface = {
				fetchMetadata : function () {}
			},
			oBinding = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve(Promise.resolve()),
				oContext : {},
				wrapChildQueryOptions : function () {},
				doFetchQueryOptions : function () {},
				aggregateQueryOptions : function () {},
				oModel : {
					getMetaModel : function () { return oMetaModel; },
					oRequestor : {
						getModelInterface : function () {
							return oModelInterface;
						}
					}
				}
			}),
			oBindingMock = this.mock(oBinding),
			mChildQueryOptions = {},
			mWrappedChildQueryOptions = {},
			oContext = Context.create(this.oModel, oBinding, "/TEAMS/0", 0),
			mLocalQueryOptions = {},
			oMetaModelMock = this.mock(oMetaModel),
			oPromise;

		oMetaModelMock.expects("getMetaPath").withExactArgs("/TEAMS/0").returns("/TEAMS");
		oMetaModelMock.expects("getMetaPath").withExactArgs("/").returns("/");
		oBindingMock.expects("doFetchQueryOptions")
			.withExactArgs(sinon.match.same(oBinding.oContext))
			.returns(SyncPromise.resolve(mLocalQueryOptions));
		oMetaModelMock.expects("fetchObject").withExactArgs("/TEAMS")
			.returns(SyncPromise.resolve({$kind : "EntitySet"}));
		oBindingMock.expects("selectKeyProperties")
			.withExactArgs(sinon.match.same(mLocalQueryOptions), "/TEAMS");
		this.mock(_Helper).expects("wrapChildQueryOptions")
			.withExactArgs("/TEAMS", "", sinon.match.same(mChildQueryOptions),
				sinon.match.same(oModelInterface.fetchMetadata))
			.returns(mWrappedChildQueryOptions);
		oBindingMock.expects("aggregateQueryOptions")
			.withExactArgs(sinon.match.same(mWrappedChildQueryOptions), false)
			.returns(true);

		// code under test
		oPromise = oBinding.fetchIfChildCanUseCache(oContext, "",
			SyncPromise.resolve(mChildQueryOptions));

		return oPromise.then(function (bUseCache) {
			assert.strictEqual(bUseCache, true);
			assert.deepEqual(oBinding.aChildCanUseCachePromises, [oPromise]);
		});
	});

	//*********************************************************************************************
	[{
		oProperty : {$kind : "notAProperty"},
		sPath : "/EMPLOYEE_2_TEAM/INVALID"
	}, {
		oProperty : undefined,
		sPath : "/EMPLOYEE_2_TEAM/My$count"
	}].forEach(function (oFixture, i) {
		QUnit.test("fetchIfChildCanUseCache, error handling, " + i, function (assert) {
			var oMetaModel = {
					fetchObject : function () {},
					getMetaPath : function () {}
				},
				mOriginalAggregatedQueryOptions = {$expand : { "foo" : {$select : ["bar"]}}},
				oBinding = new ODataParentBinding({
					mAggregatedQueryOptions : mOriginalAggregatedQueryOptions,
					bAggregatedQueryOptionsInitial : false,
					// cache will be created, waiting for child bindings
					oCachePromise : SyncPromise.resolve(Promise.resolve()),
					doFetchQueryOptions : function () {
						return SyncPromise.resolve({});
					},
					oModel : {getMetaModel : function () {return oMetaModel;}},
					bRelative : false
				}),
				oContext = Context.create(this.oModel, oBinding, "/EMPLOYEES('2')"),
				oMetaModelMock = this.mock(oMetaModel),
				sPath = oFixture.sPath,
				oPromise;

			oMetaModelMock.expects("getMetaPath")
				.withExactArgs("/EMPLOYEES('2')")
				.returns("/EMPLOYEES");
			oMetaModelMock.expects("getMetaPath")
				.withExactArgs(sPath)
				.returns(sPath);
			oMetaModelMock.expects("fetchObject")
				.withExactArgs("/EMPLOYEES" + sPath)
				.returns(SyncPromise.resolve(oFixture.oProperty));
			this.oLogMock.expects("error").withExactArgs(
				"Failed to enhance query options for auto-$expand/$select as the path "
					+ "'/EMPLOYEES" + sPath
					+ "' does not point to a property",
				JSON.stringify(oFixture.oProperty), sClassName);

			// code under test
			oPromise = oBinding.fetchIfChildCanUseCache(oContext, sPath.slice(1));

			return oPromise.then(function (bUseCache) {
				assert.strictEqual(bUseCache, false);
				assert.deepEqual(oBinding.mAggregatedQueryOptions, mOriginalAggregatedQueryOptions);
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("fetchIfChildCanUseCache, advertised action", function (assert) {
		var oMetaModel = {
				fetchObject : function () {},
				getMetaPath : function () {}
			},
			oModel = {
				getMetaModel : function () {return oMetaModel;}
			},
			oBinding = new ODataParentBinding({
				mAggregatedQueryOptions : {$expand : { "foo" : {$select : ["bar"]}}},
				bAggregatedQueryOptionsInitial : false,
				// cache will be created, waiting for child bindings
				oCachePromise : SyncPromise.resolve(Promise.resolve()),
				doFetchQueryOptions : function () {
					return SyncPromise.resolve({});
				},
				oModel : oModel,
				bRelative : false
			}),
			oContext = Context.create(oModel, oBinding, "/EMPLOYEES('2')"),
			oMetaModelMock = this.mock(oMetaModel),
			sPath = "/#foo.bar.AcFoo",
			oPromise;

		oMetaModelMock.expects("getMetaPath")
			.withExactArgs("/EMPLOYEES('2')")
			.returns("/EMPLOYEES");
		oMetaModelMock.expects("getMetaPath")
			.withExactArgs(sPath)
			.returns(sPath);
		oMetaModelMock.expects("fetchObject")
			.withExactArgs("/EMPLOYEES/")
			.returns(SyncPromise.resolve());

		// code under test
		oPromise = oBinding.fetchIfChildCanUseCache(oContext, sPath.slice(1));

		return oPromise.then(function (bUseCache) {
			assert.strictEqual(bUseCache, true);
			assert.deepEqual(oBinding.mAggregatedQueryOptions,
				{$expand : {"foo" : {$select : ["bar"]}}, $select : ["foo.bar.AcFoo"]});
		});
	});

	//*********************************************************************************************
	QUnit.test("fetchIfChildCanUseCache: $count or instance annotation in child path",
			function (assert) {
		var oBinding = new ODataParentBinding({
			oModel : {
				getMetaModel : function () { return {}; }
			}
		});

		// code under test
		assert.strictEqual(
			oBinding.fetchIfChildCanUseCache(null, "$count").getResult(), true);
		assert.strictEqual(
			oBinding.fetchIfChildCanUseCache(null, "EMPLOYEE_2_EQUIPMENTS/$count").getResult(),
			true);
		assert.strictEqual(
			oBinding.fetchIfChildCanUseCache(null, "@odata.etag").getResult(), true);
	});

	//*********************************************************************************************
	QUnit.test("fetchIfChildCanUseCache: operation binding", function (assert) {
		var oBinding = new ODataParentBinding({
			oModel : {
				getMetaModel : function () { return {}; }
			},
			oOperation : {}
		});

		// code under test
		assert.strictEqual(
			oBinding.fetchIfChildCanUseCache(/*arguments do not matter*/).getResult(),
			true);
	});

	//*********************************************************************************************
	QUnit.test("fetchIfChildCanUseCache: non-deferred function and 'value'", function (assert) {
		var oMetaModel = {
				fetchObject : function () {},
				getMetaPath : function (sPath) {
					return _Helper.getMetaPath(sPath);
				}
			},
			oBinding = new ODataParentBinding({
				// cache will be created, waiting for child bindings
				oCachePromise : SyncPromise.resolve(Promise.resolve()),
				doFetchQueryOptions : function () {},
				oModel : {getMetaModel : function () {return oMetaModel;}},
				bRelative : false
			}),
			oBindingMock = this.mock(oBinding),
			sChildPath = "value",
			mChildQueryOptions = {},
			oContext = Context.create(this.oModel, oBinding, "/Function(foo=42)"),
			mLocalQueryOptions = {},
			oPromise,
			bUseCache = {/*false or true*/};

		this.mock(oMetaModel).expects("fetchObject").withExactArgs("/Function/value")
			.returns(SyncPromise.resolve({$isCollection : true, $Type : "some.EntityType"}));
		oBindingMock.expects("doFetchQueryOptions").withExactArgs(undefined)
			.returns(SyncPromise.resolve(mLocalQueryOptions));
		oBindingMock.expects("selectKeyProperties")
			.withExactArgs(sinon.match.object, "/Function"); // Note: w/o $Key nothing happens
		oBindingMock.expects("aggregateQueryOptions")
			.withExactArgs(sinon.match.same(mChildQueryOptions), false)
			.returns(bUseCache);

		// code under test
		oPromise = oBinding.fetchIfChildCanUseCache(oContext, sChildPath,
			SyncPromise.resolve(mChildQueryOptions));

		return oPromise.then(function (bUseCache0) {
			assert.strictEqual(bUseCache0, bUseCache);
		});
	});

	//*********************************************************************************************
	QUnit.test("fetchIfChildCanUseCache, suspended parent binding", function (assert) {
		var oBinding = new ODataParentBinding({
				oModel : {
					getMetaModel : function () { return {}; }
				}
			}),
			oRootBinding = {
				isSuspended : function () {}
			},
			oPromise;

			// getRootBinding cannot return undefined in fetchIfChildCanUseCache because it is
			// called on a resolved binding see
			// sap.ui.model.odata.v4.ODataBinding#fetchQueryOptionsForOwnCache
			this.mock(oBinding).expects("getRootBinding").withExactArgs().returns(oRootBinding);
			this.mock(oRootBinding).expects("isSuspended").withExactArgs().returns(true);

			// code under test
			oPromise = oBinding.fetchIfChildCanUseCache(undefined, "childPath",
				SyncPromise.resolve({}));

			return oPromise.then(function (bUseCache) {
				assert.strictEqual(bUseCache, true);
			});
		}
	);

	//*********************************************************************************************
	QUnit.test("aggregateQueryOptions: cache is immutable", function (assert) {
		var mAggregatedQueryOptions = {
				$expand : {
					"EMPLOYEE_2_TEAM" : {}
				},
				$select : ["Name", "AGE"]
			},
			oBinding = new ODataParentBinding({
				mAggregatedQueryOptions : clone(mAggregatedQueryOptions)
			});

		// code under test
		assert.strictEqual(
			oBinding.aggregateQueryOptions({$select : ["Name"]}, true),
			true, "same $select as before");
		assert.deepEqual(oBinding.mAggregatedQueryOptions, mAggregatedQueryOptions);

		// code under test
		assert.strictEqual(
			oBinding.aggregateQueryOptions({$select : ["ROOM_ID"]}, true),
			false, "new $select not allowed");
		assert.deepEqual(oBinding.mAggregatedQueryOptions, mAggregatedQueryOptions);

		// code under test
		assert.strictEqual(
			oBinding.aggregateQueryOptions({$expand : {"EMPLOYEE_2_TEAM" : {}}}, true),
			true, "same $expand as before");
		assert.deepEqual(oBinding.mAggregatedQueryOptions, mAggregatedQueryOptions);

		// code under test
		assert.strictEqual(
			oBinding.aggregateQueryOptions({$expand : {"EMPLOYEE_2_EQUIPMENTS" : {}}}, true),
			false, "new $expand not allowed");
		assert.deepEqual(oBinding.mAggregatedQueryOptions, mAggregatedQueryOptions);
	});

	//*********************************************************************************************
	QUnit.test("deleteFromCache: binding w/ cache", function (assert) {
		var oCache = {
				_delete : function () {}
			},
			oBinding = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve(oCache),
				getUpdateGroupId : function () {},
				oModel : {isAutoGroup : function () {return true;}}
			}),
			fnCallback = {},
			oGroupLock = new _GroupLock("groupId"),
			oResult = {};

		this.mock(oBinding).expects("getUpdateGroupId").withExactArgs().returns("updateGroup");
		this.mock(oGroupLock).expects("setGroupId").withExactArgs("updateGroup");
		this.mock(oCache).expects("_delete")
			.withExactArgs(sinon.match.same(oGroupLock), "EMPLOYEES('1')",
				"1/EMPLOYEE_2_EQUIPMENTS/3", sinon.match.same(fnCallback))
			.returns(SyncPromise.resolve(oResult));

		assert.strictEqual(
			oBinding.deleteFromCache(oGroupLock, "EMPLOYEES('1')", "1/EMPLOYEE_2_EQUIPMENTS/3",
				fnCallback).getResult(),
			oResult);
	});

	//*********************************************************************************************
	QUnit.test("deleteFromCache: binding w/o cache", function (assert) {
		var oParentBinding = {
				deleteFromCache : function () {}
			},
			oContext = {
				getBinding : function () {
					return oParentBinding;
				},
				iIndex : 42
			},
			oBinding = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve(),
				oContext : oContext,
				getUpdateGroupId : function () {},
				oModel : {isAutoGroup : function () {return true;}},
				sPath : "TEAM_2_EMPLOYEES"
			}),
			fnCallback = {},
			oGroupLock = new _GroupLock("$auto"),
			oResult = {};

		this.mock(_Helper).expects("buildPath")
			.withExactArgs(42, "TEAM_2_EMPLOYEES", "1/EMPLOYEE_2_EQUIPMENTS/3")
			.returns("~");
		this.mock(oParentBinding).expects("deleteFromCache")
			.withExactArgs(sinon.match.same(oGroupLock), "EQUIPMENTS('3')", "~",
				sinon.match.same(fnCallback))
			.returns(SyncPromise.resolve(oResult));

		assert.strictEqual(
			oBinding.deleteFromCache(oGroupLock, "EQUIPMENTS('3')", "1/EMPLOYEE_2_EQUIPMENTS/3",
				fnCallback).getResult(),
			oResult);
	});

	//*********************************************************************************************
	QUnit.test("deleteFromCache: check submit mode", function (assert) {
		var oBinding = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve({_delete : function () {}}),
				getUpdateGroupId : function () {},
				oModel : {isAutoGroup : function () {}, isDirectGroup : function () {}}
			}),
			oGroupLock = new _GroupLock("$direct"),
			oModelMock = this.mock(oBinding.oModel),
			fnCallback = {};

		oModelMock.expects("isAutoGroup").withExactArgs("myGroup").returns(false);
		assert.throws(function () {
			oBinding.deleteFromCache(new _GroupLock("myGroup"));
		}, new Error("Illegal update group ID: myGroup"));

		this.mock(oBinding.oCachePromise.getResult()).expects("_delete")
			.withExactArgs(sinon.match.same(oGroupLock), "EMPLOYEES('1')", "42",
				sinon.match.same(fnCallback))
			.returns(SyncPromise.resolve());
		oModelMock.expects("isAutoGroup").withExactArgs("$direct").returns(false);
		oModelMock.expects("isDirectGroup").withExactArgs("$direct").returns(true);

		return oBinding.deleteFromCache(oGroupLock, "EMPLOYEES('1')", "42", fnCallback).then();
	});

	//*********************************************************************************************
	QUnit.test("deleteFromCache: cache is not yet available", function (assert) {
		var oBinding = new ODataParentBinding({
				// simulate pending cache creation
				oCachePromise : SyncPromise.resolve(Promise.resolve({ /* cache */}))
			});

		assert.throws(function () {
			oBinding.deleteFromCache("$auto");
		}, new Error("DELETE request not allowed"));
	});

	//*********************************************************************************************
	[
		{sPath : "/Employees"}, // absolute binding
		{sPath : "TEAM_2_MANAGER"}, // relative binding without context
		{sPath : "/Employees(ID='1')", oContext : {}}, // absolute binding with context (edge case)
		{sPath : "TEAM_2_MANAGER", oContext : {}} // relative binding with standard context
	].forEach(function (oFixture) {
		QUnit.test("checkUpdate: " + JSON.stringify(oFixture), function (assert) {
			var bRelative = oFixture.sPath[0] !== '/',
				oBinding = new ODataParentBinding({
					oCachePromise : SyncPromise.resolve(
						bRelative ? undefined : { /* cache */}),
					oContext : oFixture.oContext,
					sPath : oFixture.sPath,
					bRelative : bRelative
				}),
				fnGetContext = function () {
					return {
						created : function () {}
					};
				},
				oDependent0 = {
					checkUpdate : function () {},
					getContext : fnGetContext
				},
				bDependent0Refreshed = false,
				oDependent0Promise = new SyncPromise(function (resolve) {
					setTimeout(function () {
						bDependent0Refreshed = true;
						resolve();
					});
				}),
				oDependent1 = {
					checkUpdate : function () {},
					getContext : fnGetContext
				},
				bDependent1Refreshed = false,
				oDependent1Promise = new SyncPromise(function (resolve) {
					setTimeout(function () {
						bDependent1Refreshed = true;
						resolve();
					});
				});

			this.mock(oBinding).expects("getDependentBindings")
				.withExactArgs()
				.returns([oDependent0, oDependent1]);
			this.mock(oDependent0).expects("checkUpdate").withExactArgs()
				.returns(oDependent0Promise);
			this.mock(oDependent1).expects("checkUpdate").withExactArgs()
				.returns(oDependent1Promise);

			// code under test
			return oBinding.checkUpdate().then(function (oResult) {
				assert.strictEqual(bDependent0Refreshed, true);
				assert.strictEqual(bDependent1Refreshed, true);
			});
		});
	});
	//TODO fire change event only if the binding's length changed, i.e. if getContexts will provide
	//  a different result compared to the previous call

	//*********************************************************************************************
	QUnit.test("checkUpdate: no cache, no dependents", function (assert) {
		var oBinding = new ODataParentBinding({
				bRelative : true
			});

		this.mock(oBinding).expects("getDependentBindings").withExactArgs().returns([]);

		// code under test
		assert.strictEqual(oBinding.checkUpdate().isFulfilled(), true);
	});

	//*********************************************************************************************
	QUnit.test("checkUpdate: with parameters", function (assert) {
		assert.throws(function () {
			// code under test
			new ODataParentBinding().checkUpdate(true);
		}, new Error("Unsupported operation:"
			+ " sap.ui.model.odata.v4.ODataParentBinding#checkUpdate must not be called"
			+ " with parameters"));
	});

	//*********************************************************************************************
	QUnit.test("checkUpdate: relative binding with cache, parent binding data has changed",
			function (assert) {
		var oBinding = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve({
					$resourcePath : "TEAMS('4711')/TEAM_2_MANAGER"
				}),
				oContext : {},
				sPath : "Manager_to_Team",
				refreshInternal : function () {},
				bRelative : true
			}),
			oPathPromise = Promise.resolve("TEAMS('8192')/TEAM_2_MANAGER"),
			bRefreshed = false;

		this.mock(oBinding).expects("fetchResourcePath")
			.withExactArgs(sinon.match.same(oBinding.oContext))
			.returns(SyncPromise.resolve(oPathPromise)); // data for path "/TEAMS/1" has changed
		this.mock(oBinding).expects("refreshInternal").withExactArgs("")
			.returns(new SyncPromise(function (resolve) {
				setTimeout(function () {
					bRefreshed = true;
					resolve();
				});
			}));

		// code under test
		return oBinding.checkUpdate().then(function (oResult) {
			assert.strictEqual(oResult, undefined);
			assert.strictEqual(bRefreshed, true);
		});
	});

	//*********************************************************************************************
	QUnit.test("checkUpdate: relative binding with cache, parent binding not changed",
			function (assert) {
		var sPath = "/TEAMS('4711')/TEAM_2_MANAGER",
			oBinding = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve({
					$resourcePath : sPath
				}),
				oContext : {
					fetchCanonicalPath : function () {}
				},
				sPath : "Manager_to_Team",
				bRelative : true
			}),
			fnGetContext = function () {
				return {
					created : function () {}
				};
			},
			oDependent0 = {
				checkUpdate : function () {},
				getContext : fnGetContext
			},
			bDependent0Refreshed = false,
			oDependent0Promise = new SyncPromise(function (resolve) {
				setTimeout(function () {
					bDependent0Refreshed = true;
					resolve();
				});
			}),
			oDependent1 = {
				checkUpdate : function () {},
				getContext : fnGetContext
			},
			bDependent1Refreshed = false,
			oDependent1Promise = new SyncPromise(function (resolve) {
				setTimeout(function () {
					bDependent1Refreshed = true;
					resolve();
				});
			}),
			oPathPromise = Promise.resolve(sPath);

		this.mock(oBinding).expects("fetchResourcePath")
			.withExactArgs(sinon.match.same(oBinding.oContext))
			.returns(SyncPromise.resolve(oPathPromise));
		this.mock(oBinding).expects("getDependentBindings")
			.withExactArgs()
			.returns([oDependent0, oDependent1]);
		this.mock(oDependent0).expects("checkUpdate").withExactArgs()
			.returns(oDependent0Promise);
		this.mock(oDependent1).expects("checkUpdate").withExactArgs()
			.returns(oDependent1Promise);

		// code under test
		return oBinding.checkUpdate().then(function (oResult) {
			assert.strictEqual(bDependent0Refreshed, true);
			assert.strictEqual(bDependent1Refreshed, true);
		});
	});

	//*********************************************************************************************
	QUnit.test("checkUpdate: error handling", function (assert) {
		var oBinding = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve({}),
				oContext : {
					fetchCanonicalPath : function () {}
				},
				oModel : {
					reportError : function () {}
				},
				sPath : "TEAM_2_EMPLOYEES",
				bRelative : true,
				toString : function () {
					return "foo";
				}
			}),
			oError = {},
			oPathPromise = Promise.reject(oError);

		this.mock(oBinding).expects("fetchResourcePath")
			.withExactArgs(sinon.match.same(oBinding.oContext))
			.returns(SyncPromise.resolve(oPathPromise));
		this.mock(oBinding.oModel).expects("reportError")
			.withExactArgs("Failed to update foo", sClassName, sinon.match.same(oError));

		// code under test
		oBinding.checkUpdate();

		return oPathPromise.then(undefined, function () {});
	});

	//*********************************************************************************************
	[false, true].forEach(function (bCancel) {
		QUnit.test("createInCache: with cache, canceled: " + bCancel, function (assert) {
			var sCanonicalPath = "/TEAMS('1')/EMPLOYEES",
				oCache = {
					$resourcePath : sCanonicalPath,
					create : function () {}
				},
				oCreateError = new Error("canceled"),
				oBinding = new ODataParentBinding({
					mCacheByResourcePath : {},
					oCachePromise : SyncPromise.resolve(oCache)
				}),
				oCreateResult = {},
				oCreatePromise = SyncPromise.resolve(
					bCancel ? Promise.reject(oCreateError) : oCreateResult),
				fnCancel = function () {},
				oInitialData = {},
				sTransientPredicate = "($uid=id-1-23)";

			oBinding.mCacheByResourcePath[sCanonicalPath] = oCache;

			this.mock(oCache).expects("create")
				.withExactArgs("updateGroupId", "EMPLOYEES", "", sTransientPredicate,
					sinon.match.same(oInitialData), sinon.match.same(fnCancel),
					/*fnErrorCallback*/sinon.match.func)
				.returns(oCreatePromise);

			// code under test
			return oBinding.createInCache("updateGroupId", "EMPLOYEES", "", sTransientPredicate,
				oInitialData, fnCancel)
				.then(function (oResult) {
					assert.strictEqual(bCancel, false);
					assert.strictEqual(oResult, oCreateResult);
					assert.notOk(sCanonicalPath in oBinding.mCacheByResourcePath);
				}, function (oError) {
					assert.strictEqual(bCancel, true);
					assert.strictEqual(oError, oCreateError);
					assert.strictEqual(oBinding.mCacheByResourcePath[sCanonicalPath], oCache);
				});
		});
	});

	//*********************************************************************************************
	QUnit.test("createInCache: cache without $resourcePath", function (assert) {
		var oCache = {
				create : function () {}
			},
			oBinding = new ODataParentBinding({
				mCacheByResourcePath : undefined,
				oCachePromise : SyncPromise.resolve(oCache)
			}),
			oCreateResult = {},
			oCreatePromise = SyncPromise.resolve(oCreateResult),
			oGroupLock = new _GroupLock("updateGroupId"),
			fnCancel = function () {},
			oInitialData = {},
			sTransientPredicate = "($uid=id-1-23)";

		this.mock(oCache).expects("create")
			.withExactArgs(sinon.match.same(oGroupLock), "EMPLOYEES", "", sTransientPredicate,
				sinon.match.same(oInitialData), sinon.match.same(fnCancel),
				/*fnErrorCallback*/sinon.match.func)
			.returns(oCreatePromise);

		// code under test
		return oBinding.createInCache(
				oGroupLock, "EMPLOYEES", "", sTransientPredicate, oInitialData, fnCancel
			).then(function (oResult) {
				assert.strictEqual(oResult, oCreateResult);
			});
	});

	//*********************************************************************************************
	QUnit.test("createInCache: binding w/o cache", function (assert) {
		var oParentBinding = {
				createInCache : function () {}
			},
			oContext = {
				getBinding : function () {
					return oParentBinding;
				},
				iIndex : 42
			},
			oBinding = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve(),
				oContext : oContext,
				//getUpdateGroupId : function () {},
				sPath : "SO_2_SCHEDULE"
			}),
			fnCancel = {},
			oGroupLock = new _GroupLock("updateGroupId"),
			oResult = {},
			oCreatePromise = SyncPromise.resolve(oResult),
			oInitialData = {},
			sTransientPredicate = "($uid=id-1-23)";

		this.mock(_Helper).expects("buildPath")
			.withExactArgs(42, "SO_2_SCHEDULE", "")
			.returns("~");
		this.mock(oParentBinding).expects("createInCache")
			.withExactArgs(sinon.match.same(oGroupLock), "SalesOrderList('4711')/SO_2_SCHEDULE",
				"~", sTransientPredicate, oInitialData, sinon.match.same(fnCancel))
			.returns(oCreatePromise);

		assert.strictEqual(
			oBinding.createInCache(oGroupLock, "SalesOrderList('4711')/SO_2_SCHEDULE", "",
				sTransientPredicate, oInitialData, fnCancel).getResult(),
			oResult);
	});

	//*********************************************************************************************
	[
		"EMPLOYEES",
		SyncPromise.resolve(Promise.resolve("EMPLOYEES"))
	].forEach(function (vPostPath, i) {
		QUnit.test("createInCache: error callback: " + i, function (assert) {
			var oCache = {
					create : function () {}
				},
				oBinding = new ODataParentBinding({
					oCachePromise : SyncPromise.resolve(oCache),
					oModel : {
						reportError : function () {}
					}
				}),
				fnCancel = function () {},
				oError = new Error(),
				oExpectation,
				oGroupLock = new _GroupLock("updateGroupId"),
				oInitialData = {},
				sTransientPredicate = "($uid=id-1-23)";

			oExpectation = this.mock(oCache).expects("create")
				.withExactArgs(sinon.match.same(oGroupLock), vPostPath, "", sTransientPredicate,
					sinon.match.same(oInitialData), sinon.match.same(fnCancel),
					/*fnErrorCallback*/sinon.match.func)
				// we only want to observe fnErrorCallback, hence we neither resolve, nor reject
				.returns(new SyncPromise(function () {}));

			// code under test
			oBinding.createInCache(oGroupLock, vPostPath, "", sTransientPredicate, oInitialData,
				fnCancel);

			this.mock(oBinding.oModel).expects("reportError")
				.withExactArgs("POST on 'EMPLOYEES' failed; will be repeated automatically",
					sClassName, sinon.match.same(oError));

			// code under test
			oExpectation.args[0][6](oError); // call fnErrorCallback to simulate error
		});
	});

	//*********************************************************************************************
	QUnit.test("selectKeyProperties", function (assert) {
		var oMetaModel = {
				getObject : function () {}
			},
			oBinding = new ODataParentBinding({
				oModel : {getMetaModel : function () { return oMetaModel; }}
			}),
			mQueryOptions = {},
			oType = {};

		this.mock(oMetaModel).expects("getObject").withExactArgs("~/").returns(oType);
		this.mock(_Helper).expects("selectKeyProperties")
			.withExactArgs(sinon.match.same(mQueryOptions), sinon.match.same(oType));

		// code under test
		oBinding.selectKeyProperties(mQueryOptions, "~");
	});

	//*********************************************************************************************
	[{
		aggregated : {$filter : "foo"},
		current : {$filter : "bar"},
		result : {$filter : "bar"}
	}, {
		aggregated : {$select: ["foo", "bar"]},
		current : {$select : ["foo"]},
		result : {$select: ["foo", "bar"]}
	}, {
		aggregated : {$expand: {foo : {}, bar : {}}},
		current : {$expand: {foo : {}}},
		result : {$expand: {foo : {}, bar : {}}}
	}, {
		aggregated : {$filter : "foo"},
		current : {},
		result : {}
	}].forEach(function (oFixture, i) {
		QUnit.test("updateAggregatedQueryOptions " + i, function (assert) {
			var oBinding = new ODataParentBinding({
					mAggregatedQueryOptions : oFixture.aggregated
				}),
				fnDestroy = function () {this.mAggregatedQueryOptions = undefined;};

			oBinding.destroy = fnDestroy;

			// code under test
			assert.deepEqual(oBinding.updateAggregatedQueryOptions(oFixture.current),
				undefined);

			assert.deepEqual(oBinding.mAggregatedQueryOptions, oFixture.result);

			// code under test
			oBinding.destroy();
			oBinding.updateAggregatedQueryOptions(oFixture.current);

			assert.deepEqual(oBinding.mAggregatedQueryOptions, undefined);
		});
	});

	//*********************************************************************************************
	QUnit.test("suspend: absolute binding", function (assert) {
		var oBinding = new ODataParentBinding({
				sPath : "/Employees",
				oReadGroupLock : new _GroupLock(),
				toString : function () { return "~"; }
			}),
			oResult = {};

		this.mock(oBinding).expects("hasPendingChanges").withExactArgs().returns(false);
		this.mock(oBinding.oReadGroupLock).expects("unlock").withExactArgs(true);

		// code under test
		oBinding.suspend();

		assert.strictEqual(oBinding.bSuspended, true);
		assert.strictEqual(oBinding.oReadGroupLock, undefined);
		assert.strictEqual(oBinding.oResumePromise.isPending(), true);
		oBinding.oResumePromise.$resolve(oResult);
		assert.strictEqual(oBinding.oResumePromise.isPending(), false);
		assert.strictEqual(oBinding.oResumePromise.getResult(), oResult);

		assert.throws(function () {
			// code under test
			oBinding.suspend();
		}, new Error("Cannot suspend a suspended binding: ~"));
	});

	//*********************************************************************************************
	QUnit.test("suspend: quasi-absolute binding", function (assert) {
		var oBinding = new ODataParentBinding({
				oContext : {/* sap.ui.model.Context */},
				sPath : "SO_2_SCHEDULE",
				bRelative : true
			}),
			oResult = {};

		this.mock(oBinding).expects("hasPendingChanges").withExactArgs().returns(false);

		// code under test
		oBinding.suspend();

		assert.strictEqual(oBinding.bSuspended, true);
		assert.strictEqual(oBinding.oResumePromise.isPending(), true);
		oBinding.oResumePromise.$resolve(oResult);
		assert.strictEqual(oBinding.oResumePromise.isPending(), false);
		assert.strictEqual(oBinding.oResumePromise.getResult(), oResult);
	});

	//*********************************************************************************************
	QUnit.test("suspend: error on operation binding", function (assert) {
		assert.throws(function () {
			// code under test
			new ODataParentBinding({
				oOperation : {},
				sPath : "/operation",
				toString : function () { return "~"; }
			}).suspend();
		}, new Error("Cannot suspend an operation binding: ~"));
	});

	//*********************************************************************************************
	QUnit.test("suspend: error on binding with pending changes", function (assert) {
		var oBinding = new ODataParentBinding({
				sPath : "/operation",
				toString : function () { return "~"; }
			});

		this.mock(oBinding).expects("hasPendingChanges").withExactArgs().returns(true);

		assert.throws(function () {
			// code under test
			oBinding.suspend();
		}, new Error("Cannot suspend a binding with pending changes: ~"));
	});

	//*********************************************************************************************
	[
		undefined, // unresolved
		{/* sap.ui.model.odata.v4.Context */fetchValue : function () {}} // resolved
	].forEach(function (oContext, i) {
		QUnit.test("suspend: error on relative binding, " + i, function (assert) {
			assert.throws(function () {
				// code under test
				new ODataParentBinding({
					oContext : oContext,
					sPath : "SO_2_SCHEDULE",
					bRelative : true,
					toString : function () { return "~"; }
				}).suspend();
			}, new Error("Cannot suspend a relative binding: ~"));
		});
	});

	//*********************************************************************************************
	[{
		oContext : undefined,
		sPath : "/Employees",
		bRelative : false,
		sTitle : "resume: absolute binding"
	}, {
		oContext : {/* sap.ui.model.Context */},
		sPath : "SO_2_SCHEDULE",
		bRelative : true,
		sTitle : "resume: quasi-absolute binding"
	}].forEach(function (oFixture) {
		QUnit.test(oFixture.sTitle, function (assert) {
			var oBinding = new ODataParentBinding(jQuery.extend({
					_fireChange : function () {},
					resumeInternal : function () {},
					toString : function () { return "~"; }
				}, oFixture)),
				oBindingMock = this.mock(oBinding),
				oPromise;

			assert.strictEqual(oBinding.getResumePromise(), undefined, "initially");
			oBindingMock.expects("hasPendingChanges").withExactArgs().returns(false);

			// code under test
			oBinding.suspend();

			oBindingMock.expects("_fireChange").never();
			oBindingMock.expects("resumeInternal").never();
			oBindingMock.expects("getGroupId").withExactArgs().returns("groupId");
			oBindingMock.expects("createReadGroupLock").withExactArgs("groupId", true, 1);
			this.mock(sap.ui.getCore()).expects("addPrerenderingTask")
				.withExactArgs(sinon.match.func)
				.callsFake(function (fnCallback) {
					// simulate async nature of prerendering task
					oPromise = Promise.resolve().then(function () {
						var oResumePromise = oBinding.getResumePromise();

						assert.strictEqual(oBinding.bSuspended, true, "not yet!");
						assert.strictEqual(oResumePromise.isPending(), true);

						oBindingMock.expects("resumeInternal").withExactArgs(true)
							.callsFake(function () {
								// before we fire events to the world, suspend is over
								assert.strictEqual(oBinding.bSuspended, false, "now!");
								// must not resolve until resumeInternal() is over
								assert.strictEqual(oResumePromise.isPending(), true);
							});

						// code under test
						fnCallback();

						assert.strictEqual(oResumePromise.isPending(), false);
						assert.strictEqual(oResumePromise.getResult(), undefined);
						assert.strictEqual(oBinding.getResumePromise(), undefined, "cleaned up");
					});
				});

			// code under test
			oBinding.resume();

			return oPromise.then(function () {
				assert.throws(function () {
					// code under test
					oBinding.resume();
				}, new Error("Cannot resume a not suspended binding: ~"));
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("resume: error on operation binding", function (assert) {
		assert.throws(function () {
			// code under test
			new ODataParentBinding({
				oOperation : {},
				sPath : "/operation",
				toString : function () { return "~"; }
			}).resume();
		}, new Error("Cannot resume an operation binding: ~"));
	});

	//*********************************************************************************************
	[
		undefined, // unresolved
		{/* sap.ui.model.odata.v4.Context */fetchValue : function () {}} // resolved
	].forEach(function (oContext, i) {
		QUnit.test("resume: error on relative binding, " + i, function (assert) {
			assert.throws(function () {
				// code under test
				new ODataParentBinding({
					oContext : oContext,
					sPath : "SO_2_SCHEDULE",
					bRelative : true,
					toString : function () { return "~"; }
				}).resume();
			}, new Error("Cannot resume a relative binding: ~"));
		});
	});

	//*********************************************************************************************
	[false, undefined].forEach(function (bLocked) {
		QUnit.test("createReadGroupLock: bLocked=" + bLocked, function (assert) {
			var oBinding = new ODataParentBinding({
					oModel : {
						lockGroup : function () {}
					}
				}),
				oBindingMock = this.mock(oBinding),
				oGroupLock1 = new _GroupLock(),
				oGroupLock2 = new _GroupLock();

			oBindingMock.expects("lockGroup").withExactArgs("groupId", bLocked)
				.returns(oGroupLock1);
			this.mock(sap.ui.getCore()).expects("addPrerenderingTask").never();

			// code under test
			oBinding.createReadGroupLock("groupId", bLocked);

			assert.strictEqual(oBinding.oReadGroupLock, oGroupLock1);

			oBindingMock.expects("removeReadGroupLock").withExactArgs();
			oBindingMock.expects("lockGroup").withExactArgs("groupId", bLocked)
				.returns(oGroupLock2);

			// code under test
			oBinding.createReadGroupLock("groupId", bLocked);

			assert.strictEqual(oBinding.oReadGroupLock, oGroupLock2);
		});
	});

	//*********************************************************************************************
	[false, true].forEach(function (bLockIsUsedAndRemoved) {
		var sTitle = "createReadGroupLock: bLocked=true, bLockIsUsedAndRemoved="
				+ bLockIsUsedAndRemoved;

		QUnit.test(sTitle, function (assert) {
			var oBinding = new ODataParentBinding({
					oModel : {
						lockGroup : function () {}
					},
					sPath : "/SalesOrderList('42')"
				}),
				oCoreMock = this.mock(sap.ui.getCore()),
				iCount = bLockIsUsedAndRemoved ? 1 : undefined,
				oExpectation,
				oGroupLock = new _GroupLock("groupId", true, oBinding),
				oPromiseMock = this.mock(Promise),
				oThenable1 = {then : function () {}},
				oThenable2 = {then : function () {}};

			this.mock(oBinding).expects("lockGroup").withExactArgs("groupId", true)
				.returns(oGroupLock);
			// first prerendering task
			oCoreMock.expects("addPrerenderingTask").withExactArgs(sinon.match.func).callsArg(0);
			// second prerendering task
			oPromiseMock.expects("resolve").withExactArgs().returns(oThenable1);
			this.mock(oThenable1).expects("then").withExactArgs(sinon.match.func).callsArg(0);
			if (iCount) {
				oCoreMock.expects("addPrerenderingTask").withExactArgs(sinon.match.func)
					.callsArg(0);
				// third prerendering task
				oPromiseMock.expects("resolve").withExactArgs().returns(oThenable2);
				this.mock(oThenable2).expects("then").withExactArgs(sinon.match.func).callsArg(0);
			}
			oExpectation = oCoreMock.expects("addPrerenderingTask").withExactArgs(sinon.match.func);

			// code under test
			oBinding.createReadGroupLock("groupId", true, iCount);

			assert.strictEqual(oBinding.oReadGroupLock, oGroupLock);

			if (bLockIsUsedAndRemoved) {
				// simulate functions that use and remove that lock (like getContexts or fetchValue)
				oBinding.oReadGroupLock = undefined;
				this.mock(oGroupLock).expects("unlock").never();
			} else {
				this.oLogMock.expects("debug")
					.withExactArgs("Timeout: unlocked sap.ui.model.odata.v4.lib._GroupLock("
						+ "locked,group=groupId,"
						+ "owner=sap.ui.model.odata.v4.ODataParentBinding: /SalesOrderList('42'))",
						null, sClassName);
				this.mock(oGroupLock).expects("unlock").withExactArgs(true);
			}

			// code under test
			oExpectation.callArg(0);

			assert.strictEqual(oBinding.oReadGroupLock, undefined);
		});
	});

	//*********************************************************************************************
	QUnit.test("createReadGroupLock: lock re-created", function (assert) {
		var oBinding = new ODataParentBinding({
				oModel : {
					lockGroup : function () {}
				}
			}),
			oCoreMock = this.mock(sap.ui.getCore()),
			oExpectation,
			oGroupLock1 = new _GroupLock(),
			oGroupLock2 = {},
			oPromiseMock = this.mock(Promise),
			oThenable1 = {then : function () {}};

		this.mock(oBinding).expects("lockGroup").withExactArgs("groupId", true)
			.returns(oGroupLock1);

		// first prerendering task
		oCoreMock.expects("addPrerenderingTask").withExactArgs(sinon.match.func).callsArg(0);
		// second prerendering task
		oPromiseMock.expects("resolve").withExactArgs().returns(oThenable1);
		this.mock(oThenable1).expects("then").withExactArgs(sinon.match.func).callsArg(0);
		oExpectation = oCoreMock.expects("addPrerenderingTask").withExactArgs(sinon.match.func);

		// code under test
		oBinding.createReadGroupLock("groupId", true);

		oBinding.oReadGroupLock = oGroupLock2;

		// code under test - the lock must not be removed because it is a different one now
		oExpectation.callArg(0);

		assert.strictEqual(oBinding.oReadGroupLock, oGroupLock2);
	});

	//*********************************************************************************************
	QUnit.test("removeReadGroupLock", function (assert) {
		var oBinding = new ODataParentBinding({
				oModel : {
					lockGroup : function () {}
				}
			}),
			oGroupLock = new _GroupLock();

		oBinding.oReadGroupLock = oGroupLock;
		this.mock(oGroupLock).expects("unlock").withExactArgs(true);

		// code under test
		oBinding.removeReadGroupLock();

		assert.strictEqual(oBinding.oReadGroupLock, undefined);

		// code under test
		oBinding.removeReadGroupLock();
	});

	//*********************************************************************************************
	QUnit.test("isPatchWithoutSideEffects: set locally", function (assert) {
		var oBinding = new ODataParentBinding({
				mParameters : {$$patchWithoutSideEffects : true}
			});

		// code under test
		assert.strictEqual(oBinding.isPatchWithoutSideEffects(), true);
	});

	//*********************************************************************************************
	QUnit.test("isPatchWithoutSideEffects: unset, root", function (assert) {
		var oBinding = new ODataParentBinding({mParameters : {}});

		this.mock(oBinding).expects("isRoot").withExactArgs().returns(true);

		// code under test
		assert.strictEqual(oBinding.isPatchWithoutSideEffects(), false);
	});

	//*********************************************************************************************
	QUnit.test("isPatchWithoutSideEffects: unresolved", function (assert) {
		var oBinding = new ODataParentBinding({
				oContext : null,
				mParameters : {}
			});

		this.mock(oBinding).expects("isRoot").withExactArgs().returns(false);

		// code under test
		assert.notOk(oBinding.isPatchWithoutSideEffects());
	});

	//*********************************************************************************************
	QUnit.test("isPatchWithoutSideEffects: inherited", function (assert) {
		var oParentBinding = new ODataParentBinding(),
			oContext = {
				getBinding : function () { return oParentBinding; }
			},
			oBinding = new ODataParentBinding({
				oContext : oContext,
				mParameters : {}
			}),
			bResult = {/*false or true*/};

		this.mock(oBinding).expects("isRoot").withExactArgs().returns(false);
		this.mock(oParentBinding).expects("isPatchWithoutSideEffects").withExactArgs()
			.returns(bResult);

		// code under test
		assert.strictEqual(oBinding.isPatchWithoutSideEffects(), bResult);
	});

	//*********************************************************************************************
	QUnit.test("attachPatchCompleted/detachPatchCompleted", function (assert) {
		var oBinding = new ODataParentBinding({
				attachEvent : function () {},
				detachEvent : function () {}
			}),
			oBindingMock = this.mock(oBinding),
			fnFunction = {},
			oListener = {};

		oBindingMock.expects("attachEvent")
			.withExactArgs("patchCompleted", sinon.match.same(fnFunction),
				sinon.match.same(oListener));

		// code under test
		oBinding.attachPatchCompleted(fnFunction, oListener);

		oBindingMock.expects("detachEvent")
			.withExactArgs("patchCompleted", sinon.match.same(fnFunction),
				sinon.match.same(oListener));

		// code under test
		oBinding.detachPatchCompleted(fnFunction, oListener);
	});

	//*********************************************************************************************
	QUnit.test("attachPatchSent/detachPatchSent", function (assert) {
		var oBinding = new ODataParentBinding({
				attachEvent : function () {},
				detachEvent : function () {}
			}),
			oBindingMock = this.mock(oBinding),
			fnFunction = {},
			oListener = {};

		oBindingMock.expects("attachEvent")
			.withExactArgs("patchSent", sinon.match.same(fnFunction), sinon.match.same(oListener));

		// code under test
		oBinding.attachPatchSent(fnFunction, oListener);

		oBindingMock.expects("detachEvent")
			.withExactArgs("patchSent", sinon.match.same(fnFunction), sinon.match.same(oListener));

		// code under test
		oBinding.detachPatchSent(fnFunction, oListener);
	});

	//*********************************************************************************************
	QUnit.test("firePatchSent/firePatchCompleted", function (assert) {
		var oBinding = new ODataParentBinding({
				fireEvent : function () {}
			}),
			oBindingMock = this.mock(oBinding);

		oBindingMock.expects("fireEvent").withExactArgs("patchSent");

		// code under test
		oBinding.firePatchSent();

		// if there is a sequence of firePatchSent calls, the event is fired only for the first call
		// code under test
		oBinding.firePatchSent();

		// code under test
		oBinding.firePatchSent();

		// firePatchCompleted triggers a patchCompleted event only if firePatchCompleted is called
		// as often as firePatchSent
		// code under test
		oBinding.firePatchCompleted(true);

		// code under test
		oBinding.firePatchCompleted(true);

		oBindingMock.expects("fireEvent").withExactArgs("patchCompleted", {success : true});

		// code under test
		oBinding.firePatchCompleted(true);

		// code under test
		assert.throws(function () {
			oBinding.firePatchCompleted();
		}, new Error("Completed more PATCH requests than sent"));

		oBindingMock.expects("fireEvent").withExactArgs("patchSent");

		// code under test
		oBinding.firePatchSent();

		// code under test
		oBinding.firePatchSent();

		// if at least one PATCH failed patchCompleted event is fired with success = false
		// code under test
		oBinding.firePatchCompleted(false);

		oBindingMock.expects("fireEvent").withExactArgs("patchCompleted", {success : false});

		// code under test
		oBinding.firePatchCompleted(true);

		oBindingMock.expects("fireEvent").withExactArgs("patchSent");

		// code under test - bPatchSuccess is reset after patchCompleted event is fired
		oBinding.firePatchSent();

		oBindingMock.expects("fireEvent").withExactArgs("patchCompleted", {success : true});

		// code under test - bPatchSuccess is reset after patchCompleted event is fired
		oBinding.firePatchCompleted(true);
	});

	//*********************************************************************************************
	QUnit.test("destroy", function (assert) {
		var oBinding = new ODataParentBinding();

		oBinding.aChildCanUseCachePromises = [{}, {}];

		// code under test
		oBinding.destroy();

		//TODO does not work with SalesOrdersRTATest
//		assert.deepEqual(oBinding.mAggregatedQueryOptions, undefined);
		assert.deepEqual(oBinding.aChildCanUseCachePromises, []);
	});

	//*********************************************************************************************
	QUnit.test("refreshDependentBindings", function (assert) {
		var oBinding = new ODataParentBinding({oContext : {/* sap.ui.model.Context */}}),
			bCheckUpdate = {},
			aDependentBindings = [{
				refreshInternal : function () {}
			}, {
				refreshInternal : function () {}
			}],
			bDependent0Refreshed = false,
			oDependent0Promise = new SyncPromise(function (resolve) {
				setTimeout(function () {
					bDependent0Refreshed = true;
					resolve();
				});
			}),
			bDependent1Refreshed = false,
			oDependent1Promise = new SyncPromise(function (resolve) {
				setTimeout(function () {
					bDependent1Refreshed = true;
					resolve();
				});
			}),
			sResourcePathPrefix = {/*Path needed to avoid deleting all Caches*/},
			oPromise;

		this.mock(oBinding).expects("getDependentBindings").withExactArgs()
			.returns(aDependentBindings);
		this.mock(aDependentBindings[0]).expects("refreshInternal")
			.withExactArgs(sinon.match.same(sResourcePathPrefix), "group",
					sinon.match.same(bCheckUpdate)
				)
			.returns(oDependent0Promise);
		this.mock(aDependentBindings[1]).expects("refreshInternal")
			.withExactArgs(sinon.match.same(sResourcePathPrefix), "group",
					sinon.match.same(bCheckUpdate)
				)
			.returns(oDependent1Promise);

		// code under test
		oPromise = oBinding.refreshDependentBindings(sResourcePathPrefix, "group", bCheckUpdate);

		assert.ok(oPromise.isPending(), "a SyncPromise");
		return oPromise.then(function () {
			assert.strictEqual(bDependent0Refreshed, true);
			assert.strictEqual(bDependent1Refreshed, true);
		});
	});

	//*********************************************************************************************
	QUnit.test("hasPendingChangesInDependents", function (assert) {
		var oCache1 = {
				hasPendingChangesForPath : function () {}
			},
			oCache31 = {
				hasPendingChangesForPath : function () {}
			},
			oCache32 = {
				hasPendingChangesForPath : function () {}
			},
			oChild1 = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve(oCache1)
			}),
			oChild2 = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve()
			}),
			oChild3 = new ODataParentBinding({
				mCacheByResourcePath : {
					"/Foo/1" : oCache31,
					"/Foo/2" : oCache32
				},
				oCachePromise : SyncPromise.resolve(Promise.resolve())
			}),
			oBinding = new ODataParentBinding({
				oContext : {},
				oModel :  {
					getDependentBindings : function () {},
					resolve : function () {},
					withUnresolvedBindings : function () {}
				},
				sPath : "path"
			}),
			oChild1CacheMock = this.mock(oCache1),
			oChild1Mock = this.mock(oChild1),
			oChild2Mock = this.mock(oChild2),
			oChild3Mock = this.mock(oChild3),
			oChild3CacheMock1 = this.mock(oCache31),
			oChild3CacheMock2 = this.mock(oCache32),
			oModelMock = this.mock(oBinding.oModel),
			bResult = {/*false,true*/};

		oModelMock.expects("withUnresolvedBindings").never();

		this.mock(oBinding).expects("getDependentBindings").exactly(7)
			.withExactArgs()
			.returns([oChild1, oChild2, oChild3]);
		oChild1CacheMock.expects("hasPendingChangesForPath").withExactArgs("").returns(true);
		oChild1Mock.expects("hasPendingChangesInDependents").never();
		oChild2Mock.expects("hasPendingChangesInDependents").never();
		oChild3Mock.expects("hasPendingChangesInDependents").never();
		oChild3CacheMock1.expects("hasPendingChangesForPath").never();
		oChild3CacheMock2.expects("hasPendingChangesForPath").never();

		// code under test
		assert.strictEqual(oBinding.hasPendingChangesInDependents(), true);

		oChild1CacheMock.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild1Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(true);

		// code under test
		assert.strictEqual(oBinding.hasPendingChangesInDependents(), true);

		oChild1CacheMock.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild1Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild2Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(true);

		// code under test
		assert.strictEqual(oBinding.hasPendingChangesInDependents(), true);

		oChild1CacheMock.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild1Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild2Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild3CacheMock1.expects("hasPendingChangesForPath").withExactArgs("").returns(true);

		// code under test
		assert.strictEqual(oBinding.hasPendingChangesInDependents(), true);

		oChild1CacheMock.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild1Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild2Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild3CacheMock1.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild3CacheMock2.expects("hasPendingChangesForPath").withExactArgs("").returns(true);

		// code under test
		assert.strictEqual(oBinding.hasPendingChangesInDependents(), true);

		oChild1CacheMock.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild1Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild2Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild3CacheMock1.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild3CacheMock2.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild3Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(true);

		// code under test
		assert.strictEqual(oBinding.hasPendingChangesInDependents(), true);

		oChild1CacheMock.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild1Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild2Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oChild3CacheMock1.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild3CacheMock2.expects("hasPendingChangesForPath").withExactArgs("").returns(false);
		oChild3Mock.expects("hasPendingChangesInDependents").withExactArgs().returns(false);
		oModelMock.expects("resolve")
			.withExactArgs("path", sinon.match.same(oBinding.oContext))
			.returns("/some/absolute/path");
		oModelMock.expects("withUnresolvedBindings")
			.withExactArgs("hasPendingChangesInCaches", "some/absolute/path")
			.returns(bResult);

		// code under test
		assert.strictEqual(oBinding.hasPendingChangesInDependents(), bResult);
	});

	//*********************************************************************************************
	QUnit.test("resetChangesInDependents", function (assert) {
		var oCache = {
				resetChangesForPath : function () {}
			},
			oCache31 = {
				resetChangesForPath : function () {}
			},
			oCache32 = {
				resetChangesForPath : function () {}
			},
			oChild1 = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve(oCache)
			}),
			oChild2 = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve()
			}),
			oChild3 = new ODataParentBinding({
				oCachePromise : SyncPromise.resolve(Promise.resolve()),
				mCacheByResourcePath : {
					"/Foo/1" : oCache31,
					"/Foo/2" : oCache32
				}
			}),
			oBinding = new ODataParentBinding({
				getDependentBindings : function () {}
			});

		this.mock(oBinding).expects("getDependentBindings")
			.withExactArgs().returns([oChild1, oChild2, oChild3]);
		this.mock(oCache).expects("resetChangesForPath").withExactArgs("");
		this.mock(oChild1).expects("resetChangesInDependents").withExactArgs();
		this.mock(oChild1).expects("resetInvalidDataState").withExactArgs();
		this.mock(oChild2).expects("resetChangesInDependents").withExactArgs();
		this.mock(oChild2).expects("resetInvalidDataState").withExactArgs();
		this.mock(oChild3).expects("resetChangesInDependents").withExactArgs();
		this.mock(oChild3).expects("resetInvalidDataState").never();
		this.mock(oCache31).expects("resetChangesForPath").withExactArgs("");
		this.mock(oCache32).expects("resetChangesForPath").withExactArgs("");

		// code under test
		oBinding.resetChangesInDependents();
	});

	//*********************************************************************************************
	[{
	}, {
		oContext : null,
		bPrefix : true
	}, {
		oContext : {getPath : function () {}}
	}].forEach(function (oFixture, i) {
		QUnit.test("visitSideEffects, " + i, function (assert) {
			var oBinding = new ODataParentBinding(),
				oChild0 = {
					oCachePromise : SyncPromise.resolve({}), //TODO what if this is still pending?
					getPath : function () { return "foo(0)"; },
					requestSideEffects : function () {}
				},
				oChild1 = {
					oCachePromise : SyncPromise.resolve({}),
					getPath : function () { return "bar(1)"; }
				},
				oChild2 = {
					oCachePromise : SyncPromise.resolve(), // no own cache
					getPath : function () { return "n/a/toN"; },
					visitSideEffects : function () {}
				},
				oChild3 = {
					oCachePromise : SyncPromise.resolve({}),
					getPath : function () { return "baz(3)"; },
					requestSideEffects : function () {}
				},
				oChild4 = {
					oCachePromise : SyncPromise.resolve(), // no own cache
					getPath : function () { return "refresh(4)/toN"; },
					refreshInternal : function () {}
				},
				sGroupId = "group",
				oHelperMock = this.mock(_Helper),
				oModel = {
					getDependentBindings : function () {}
				},
				mNavigationPropertyPaths = oFixture.bPrefix
					? {"~/refresh/toN" : true}
					: {"refresh/toN" : true},
				aPaths = [],
				aPaths0 = ["A"],
				aPaths1 = [/*empty!*/],
				aPaths3 = ["A"],
				oPromise0 = {index : 0}, // give deepEqual a chance
				oPromise3 = {index : 3},
				oPromise4 = {index : 4},
				aPromises = [];

			if (oFixture.oContext) {
				oBinding.oModel = oModel;
				this.mock(oModel).expects("getDependentBindings")
					.withExactArgs(sinon.match.same(oFixture.oContext))
					.returns([oChild0, oChild1, oChild2, oChild3, oChild4]);
			} else {
				this.mock(oBinding).expects("getDependentBindings").withExactArgs()
					.returns([oChild0, oChild1, oChild2, oChild3, oChild4]);
			}
			oHelperMock.expects("stripPathPrefix")
				.withExactArgs(oFixture.bPrefix ? "~/foo" : "foo", sinon.match.same(aPaths))
				.returns(aPaths0);
			this.mock(oChild0).expects("requestSideEffects")
				.withExactArgs(sGroupId, sinon.match.same(aPaths0))
				.returns(oPromise0);
			oHelperMock.expects("stripPathPrefix")
				.withExactArgs(oFixture.bPrefix ? "~/bar" : "bar", sinon.match.same(aPaths))
				.returns(aPaths1);
			this.mock(oChild2).expects("visitSideEffects")
				.withExactArgs(sGroupId, sinon.match.same(aPaths), null,
					sinon.match.same(mNavigationPropertyPaths), sinon.match.same(aPromises),
					oFixture.bPrefix ? "~/n/a/toN" : "n/a/toN");
			oHelperMock.expects("stripPathPrefix")
				.withExactArgs(oFixture.bPrefix ? "~/baz" : "baz", sinon.match.same(aPaths))
				.returns(aPaths3);
			this.mock(oChild3).expects("requestSideEffects")
				.withExactArgs(sGroupId, sinon.match.same(aPaths3))
				.returns(oPromise3);
			this.mock(oChild4).expects("refreshInternal").withExactArgs("", sGroupId)
				.returns(oPromise4);

			// code under test
			oBinding.visitSideEffects(sGroupId, aPaths, oFixture.oContext, mNavigationPropertyPaths,
				aPromises, oFixture.bPrefix ? "~" : undefined);

			assert.deepEqual(aPromises, [oPromise0, oPromise3, oPromise4]);
		});
	});

	//*********************************************************************************************
	QUnit.test("isMeta", function (assert) {
		var oBinding = new ODataParentBinding();

		assert.strictEqual(oBinding.isMeta(), false);
	});

	//*********************************************************************************************
	QUnit.test("refreshSuspended", function (assert) {
		var oBinding = new ODataParentBinding();

		this.mock(oBinding).expects("getGroupId").never();
		this.mock(oBinding).expects("setResumeChangeReason").withExactArgs(ChangeReason.Refresh);

		// code under test
		oBinding.refreshSuspended();
	});

	//*********************************************************************************************
	QUnit.test("refreshSuspended: with group ID", function (assert) {
		var oBinding = new ODataParentBinding();

		this.mock(oBinding).expects("getGroupId").thrice().withExactArgs().returns("myGroup");
		this.mock(oBinding).expects("setResumeChangeReason").withExactArgs(ChangeReason.Refresh);

		// code under test
		oBinding.refreshSuspended("myGroup");

		assert.throws(function () {
			// code under test
			oBinding.refreshSuspended("otherGroup");
		}, new Error(oBinding + ": Cannot refresh a suspended binding with group ID 'otherGroup' "
			+ "(own group ID is 'myGroup')"));
	});

	//*********************************************************************************************
	QUnit.test("getResumePromise", function (assert) {
		var oBinding = new ODataParentBinding(),
			oResumePromise = {};

		oBinding.oResumePromise = oResumePromise;

		// code under test
		assert.strictEqual(oBinding.getResumePromise(), oResumePromise);
	});
});
//TODO Fix issue with ODataModel.integration.qunit
//  "suspend/resume: list binding with nested context binding, only context binding is adapted"
//TODO ODLB#resumeInternal: checkUpdate on dependent bindings of header context after change
//  event (see ODLB#reset)
//TODO check: resumeInternal has no effect for operations
//TODO check/update jsdoc change-event for ODParentBinding#resume
//TODO error handling for write APIs, refresh
//   (change only in resume is probably not sufficient)
//TODO Performance: Compare previous aggregated query options with current state and
// do not recreate cache if there is no diff (e.g no UI change applied, UI change
// does not affect current $expand/$select)