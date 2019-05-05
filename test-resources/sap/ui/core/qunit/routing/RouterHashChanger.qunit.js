/*global QUnit, sinon */
sap.ui.define([
	"sap/base/Log",
	"sap/ui/core/routing/HashChanger",
	"sap/ui/core/routing/RouterHashChanger",
	"sap/ui/base/EventProvider"
], function (Log, HashChanger, RouterHashChanger, EventProvider) {
	"use strict";


	QUnit.module("RouterHashChanger Lifecycle");

	QUnit.test("constructor - invalid", function (assert) {
		assert.throws(function()  {
			new RouterHashChanger();
		}, "invalid constructor should throw an error");
	});

	QUnit.test("constructor - with parent", function (assert) {
		var oRHC = new RouterHashChanger({
			parent: HashChanger.getInstance(),
			hash: "initialHash",
			subHashMap: {
				foo: "bar"
			}
		});

		assert.ok(oRHC instanceof RouterHashChanger, "valid constructor result should be a RouterHashChanger");
		assert.ok(oRHC.getHash(), "initialHash", "The initial hash is set");
		assert.equal(oRHC.subHashMap.foo, "bar", "The subHashMap is set");
		oRHC.destroy();
	});

	QUnit.test("init", function(assert) {
		var oHashChanger = HashChanger.getInstance();
		var oRHC = new RouterHashChanger({
			parent: oHashChanger
		});

		var oInitSpy = sinon.spy(oHashChanger, "init");
		oRHC.init();
		assert.equal(oInitSpy.callCount, 1, "The init call is forwarded to parent");
		oRHC.destroy();
		oHashChanger.destroy();
	});

	QUnit.test("destroy", function(assert) {
		var oRHC = new RouterHashChanger({
			parent: HashChanger.getInstance(),
			hash: "initialHash",
			subHashMap: {}
		});
		oRHC.destroy();
		assert.strictEqual(oRHC.children, undefined, "deleted children");
		assert.strictEqual(oRHC.hash, undefined, "deleted hash");
		assert.strictEqual(oRHC.parent, undefined, "deleted parent");
		assert.strictEqual(oRHC.subHashMap, undefined, "deleted subHashMap");
		assert.strictEqual(HashChanger.getInstance()._oRouterHashChanger, undefined, "The RouterHashChanger is removed from the HashChanger");
	});

	QUnit.test("destroy - with children", function(assert) {
		var oRHC = new RouterHashChanger({
			parent: HashChanger.getInstance()
		});
		var oRHCChild = oRHC.createSubHashChanger("foo");
		var oRHCGrandChild = oRHCChild.createSubHashChanger("bar");
		var oDestroySpy = sinon.spy(RouterHashChanger.prototype, "destroy");
		oRHC.destroy();
		assert.ok(oDestroySpy.calledOn(oRHC), "RouterHashChanger destroyed");
		assert.ok(oDestroySpy.calledOn(oRHCChild), "Child destroyed");
		assert.ok(oDestroySpy.calledOn(oRHCGrandChild), "Grandchild destroyed");
		oDestroySpy.restore();
	});

	QUnit.test("destroy - with children should deregister the child from parent", function(assert) {
		var oRHC = new RouterHashChanger({
			parent: HashChanger.getInstance()
		});
		var oRHCChild = oRHC.createSubHashChanger("foo");
		var oRHCGrandChild = oRHCChild.createSubHashChanger("bar");
		var oDestroySpy = sinon.spy(RouterHashChanger.prototype, "destroy");
		oRHCChild.destroy();
		assert.ok(oDestroySpy.calledOn(oRHCChild), "Child destroyed");
		assert.ok(oDestroySpy.calledOn(oRHCGrandChild), "Grandchild destroyed");
		assert.strictEqual(oRHC.children.foo, undefined, "The destroyed child is removed from its parent");
		oDestroySpy.restore();
	});

	QUnit.module("RouterHashChanger API", {
		beforeEach: function() {
			// overwrite the returnObject function of the eventPool in EventProvider
			// to make the trace of event parameter easier
			this.oReturnObjectStub = sinon.stub(EventProvider.prototype.oEventPool, "returnObject");
			this.oRHC = new RouterHashChanger({
				parent: HashChanger.getInstance()
			});
		},
		afterEach: function() {
			this.oRHC.destroy();
			this.oReturnObjectStub.restore();
		}
	});

	QUnit.test("_hasRouterAttached", function(assert) {
		assert.equal(this.oRHC._hasRouterAttached(), false, "There's no router attached initially");

		this.oRHC.attachEvent("hashChanged", function(){});

		assert.equal(this.oRHC._hasRouterAttached(), true, "There's router attached");
	});

	QUnit.test("getHash", function (assert) {
		assert.strictEqual(this.oRHC.getHash(), "", "intial hash is empty string");
	});

	QUnit.test("setHash called without Router attached", function(assert) {
		var oWarningSpy = sinon.spy(Log, "warning");

		this.oRHC.setHash("newHash");

		assert.equal(oWarningSpy.callCount, 1, "Warning log is called");
		assert.equal(oWarningSpy.getCall(0).args[0], "The function setHash is called on a router which isn't matched within the last browser hashChange event. The call is ignored.", "correct warning message is provided");
		oWarningSpy.restore();
	});

	QUnit.test("setHash called with Router attached", function(assert) {
		var sHash, aChildPrefixes,
			iCount = 0,
			fnHashSet = function(oEvent) {
				iCount++;
				sHash = oEvent.getParameter("hash");
				aChildPrefixes = oEvent.getParameter("deletePrefix");
			};

		// simulate that there's a router attached
		this.oRHC.attachEvent("hashChanged", function(){});

		this.oRHC.attachEvent("hashSet", fnHashSet);

		this.oRHC.setHash("newHash");

		assert.equal(iCount, 1, "hashSet event is fired");
		assert.equal(sHash, "newHash", "The correct hash parameter is set in the event");
		assert.deepEqual(aChildPrefixes, [], "child prefix is an empty array");
	});

	QUnit.test("replaceHash called without Router attached", function(assert) {
		var oWarningSpy = sinon.spy(Log, "warning");

		this.oRHC.replaceHash("newHash");

		assert.equal(oWarningSpy.callCount, 1, "Warning log is called");
		assert.equal(oWarningSpy.getCall(0).args[0], "The function replaceHash is called on a router which isn't matched within the last browser hashChange event. The call is ignored.", "correct warning message is provided");
		oWarningSpy.restore();
	});

	QUnit.test("replaceHash called with Router attached", function(assert) {
		var sHash, aChildPrefixes,
			iCount = 0,
			fnHashReplaced = function(oEvent) {
				iCount++;
				sHash = oEvent.getParameter("hash");
				aChildPrefixes = oEvent.getParameter("deletePrefix");
			};

		// simulate that there's a router attached
		this.oRHC.attachEvent("hashChanged", function(){});

		this.oRHC.attachEvent("hashReplaced", fnHashReplaced);

		this.oRHC.replaceHash("newHash");

		assert.equal(iCount, 1, "hashReplaced event is fired");
		assert.equal(sHash, "newHash", "The correct hash parameter is set in the event");
		assert.deepEqual(aChildPrefixes, [], "child prefix is an empty array");
	});

	QUnit.test("fireHashChanged", function(assert) {
		var oHashChangedSpy = this.spy();
		this.oRHC.attachEvent("hashChanged", oHashChangedSpy);
		this.oRHC.fireHashChanged("hash");
		assert.equal(oHashChangedSpy.callCount, 1, "event was fired once");
		assert.strictEqual(oHashChangedSpy.args[0][0].getParameter("newHash"), "hash", "new hash is passed");
		assert.strictEqual(oHashChangedSpy.args[0][0].getParameter("oldHash"), "", "old hash is undefined");
	});

	QUnit.test("#createSubHashChanger", function(assert) {
		assert.strictEqual(this.oRHC.children, undefined, "initial child registry is empty");
		var oSubRHC = this.oRHC.createSubHashChanger("foo");
		assert.equal(this.oRHC.children["foo"], oSubRHC, "child is registered to parent");
		assert.ok(oSubRHC.hasListeners("hashSet"), "hashSet listener is set");
		assert.ok(oSubRHC.hasListeners("hashReplaced"),"hashReplaced listener is set");
		assert.strictEqual(oSubRHC.hash, "", "initial hash of SubHashChanger is empty");

		var oSubRHCDuplicate = this.oRHC.createSubHashChanger("foo");
		assert.strictEqual(oSubRHCDuplicate, oSubRHC, "The same instance should be returned for the same prefix");

		oSubRHC.destroy();
	});

	QUnit.module("RouterHashChanger SubHashChanger", {
		beforeEach: function(assert) {
			// overwrite the returnObject function of the eventPool in EventProvider
			// to make the trace of event parameter easier
			this.oReturnObjectStub = sinon.stub(EventProvider.prototype.oEventPool, "returnObject");

			this.oRHC = HashChanger.getInstance().createRouterHashChanger();
			this.oChildRHC1 = this.oRHC.createSubHashChanger("foo");
			this.oChildRHC2 = this.oRHC.createSubHashChanger("bar");
			this.oGrandChildRHC1 = this.oChildRHC1.createSubHashChanger("child1");
			this.oGrandChildRHC2 = this.oChildRHC1.createSubHashChanger("child2");

			this.oRootHashSetSpy = sinon.spy();
			this.oRHC.attachEvent("hashSet", this.oRootHashSetSpy);
			this.oRootHashReplacedSpy = sinon.spy();
			this.oRHC.attachEvent("hashReplaced", this.oRootHashReplacedSpy);

			this.oChild1HashSetSpy = sinon.spy();
			this.oChildRHC1.attachEvent("hashSet", this.oChild1HashSetSpy);
			this.oChild1HashReplacedSpy = sinon.spy();
			this.oChildRHC1.attachEvent("hashReplaced", this.oChild1HashReplacedSpy);

			this.oChild2HashSetSpy = sinon.spy();
			this.oChildRHC2.attachEvent("hashSet", this.oChild2HashSetSpy);
			this.oChild2HashReplacedSpy = sinon.spy();
			this.oChildRHC2.attachEvent("hashReplaced", this.oChild2HashReplacedSpy);

			this.oGrandChild1HashSetSpy = sinon.spy();
			this.oGrandChildRHC1.attachEvent("hashSet", this.oGrandChild1HashSetSpy);
			this.oGrandChild1HashReplacedSpy = sinon.spy();
			this.oGrandChildRHC1.attachEvent("hashReplaced", this.oGrandChild1HashReplacedSpy);

			this.oGrandChild2HashSetSpy = sinon.spy();
			this.oGrandChildRHC2.attachEvent("hashSet", this.oGrandChild2HashSetSpy);
			this.oGrandChild2HashReplacedSpy = sinon.spy();
			this.oGrandChildRHC2.attachEvent("hashReplaced", this.oGrandChild2HashReplacedSpy);


			this.oChild1HashChangedSpy = sinon.spy();
			this.oChildRHC1.attachEvent("hashChanged", this.oChild1HashChangedSpy);

			this.oGrandChild1HashChangedSpy = sinon.spy();
			this.oGrandChildRHC1.attachEvent("hashChanged", this.oGrandChild1HashChangedSpy);

			this.oGrandChild2HashChangedSpy = sinon.spy();
			this.oGrandChildRHC2.attachEvent("hashChanged", this.oGrandChild2HashChangedSpy);
		},
		afterEach: function(assert) {
			this.oGrandChildRHC2.destroy();
			this.oGrandChildRHC1.destroy();
			this.oChildRHC1.destroy();
			this.oChildRHC2.destroy();
			this.oRHC.destroy();
			this.oReturnObjectStub.restore();
		}
	});

	QUnit.test("Prefixed key", function(assert) {
		assert.strictEqual(this.oRHC.key, "", "The top level RouterHashChanger has an empty string key");
		assert.strictEqual(this.oChildRHC1.key, "foo", "The child RouterHashChanger has correct key set");
		assert.strictEqual(this.oChildRHC2.key, "bar", "The child RouterHashChanger has correct key set");
		assert.strictEqual(this.oGrandChildRHC1.key, "foo-child1", "The grand child RouterHashChanger has correct key set");
		assert.strictEqual(this.oGrandChildRHC2.key, "foo-child2", "The grand child RouterHashChanger has correct key set");
	});

	QUnit.test("Browser hash changed", function(assert) {
		var oHashChanger = HashChanger.getInstance();
		var sHash = "rootHash&/foo/fooHash/fooHash1&/foo-child2/foo.child2/foo.child2Hash";
		var oRHCHashChangedSpy = sinon.spy();
		var oChild2HashChangedSpy = sinon.spy();

		this.oRHC.attachEvent("hashChanged", oRHCHashChangedSpy);
		this.oChildRHC2.attachEvent("hashChanged", oChild2HashChangedSpy);
		oHashChanger.fireHashChanged(sHash);

		assert.equal(oRHCHashChangedSpy.callCount, 1, "hashChange event is fired on oRHC");
		assert.equal(oRHCHashChangedSpy.args[0][0].getParameter("newHash"), "rootHash", "The correct hash is passed");
		assert.equal(this.oChild1HashChangedSpy.callCount, 1, "hashChange event is fired on oChildRHC1");
		assert.equal(this.oChild1HashChangedSpy.args[0][0].getParameter("newHash"), "fooHash/fooHash1", "The correct hash is passed");
		assert.equal(oChild2HashChangedSpy.callCount, 1, "hashChange event is fired on oChildRHC2");
		assert.equal(oChild2HashChangedSpy.args[0][0].getParameter("newHash"), "", "The correct hash is passed");
		assert.equal(this.oGrandChild1HashChangedSpy.callCount, 1, "hashChange event is fired on oGrandChildRHC1");
		assert.equal(this.oGrandChild1HashChangedSpy.args[0][0].getParameter("newHash"), "", "The correct hash is passed");
		assert.equal(this.oGrandChild2HashChangedSpy.callCount, 1, "hashChange event is fired on oGrandChildRHC2");
		assert.equal(this.oGrandChild2HashChangedSpy.args[0][0].getParameter("newHash"), "foo.child2/foo.child2Hash", "The correct hash is passed");
	});

	QUnit.test("set hash on the grand child", function(assert) {
		this.oGrandChildRHC1.setHash("GrandChild1");
		assert.equal(this.oRootHashSetSpy.callCount, 1, "Root hash changer called");
		assert.equal(this.oChild1HashSetSpy.callCount, 1, "Child1 hash changer called");
		assert.equal(this.oGrandChild1HashSetSpy.callCount, 1, "GrandChild1 hash changer called");
		assert.equal(this.oGrandChild2HashSetSpy.callCount, 0, "GrandChild2 hash changer not called");
		assert.equal(this.oChild2HashSetSpy.callCount, 0, "Child 2 hash changer not called");
	});

	QUnit.test("set hash on the child", function(assert) {
		this.oChildRHC1.setHash("Child1");
		assert.equal(this.oRootHashSetSpy.callCount, 1, "Root hash changer called");
		assert.equal(this.oChild1HashSetSpy.callCount, 1, "Child1 hash changer called");
		assert.equal(this.oGrandChild1HashSetSpy.callCount, 0, "GrandChild1 hash changer called");
		assert.equal(this.oGrandChild2HashSetSpy.callCount, 0, "GrandChild2 hash changer not called");
		assert.equal(this.oChild2HashSetSpy.callCount, 0, "Child 2 hash changer not called");
	});

	QUnit.test("delete prefix for one active child after setHash", function(assert) {
		this.oGrandChildRHC2.detachEvent("hashChanged", this.oGrandChild2HashChangedSpy);
		this.oChildRHC1.setHash("Child1");
		assert.equal(this.oChild1HashSetSpy.args[0][0].getParameter("deletePrefix").length, 1, "Child1 hash changer called");
		assert.equal(this.oChild1HashSetSpy.args[0][0].getParameter("deletePrefix")[0], "foo-child1", "Child1 hash changer called");
	});

	QUnit.test("delete prefix for children after setHash", function(assert) {
		this.oChildRHC1.setHash("Child1");
		assert.equal(this.oChild1HashSetSpy.args[0][0].getParameter("deletePrefix").length, 2, "Child1 hash changer called");
		assert.equal(this.oChild1HashSetSpy.args[0][0].getParameter("deletePrefix")[0], "foo-child1", "Child1 hash changer called");
		assert.equal(this.oChild1HashSetSpy.args[0][0].getParameter("deletePrefix")[1], "foo-child2", "Child1 hash changer called");
	});

	QUnit.test("replace hash on the grand child", function(assert) {
		this.oGrandChildRHC1.replaceHash("GrandChild1");
		assert.equal(this.oRootHashReplacedSpy.callCount, 1, "Root hash changer called");
		assert.equal(this.oChild1HashReplacedSpy.callCount, 1, "Child1 hash changer called");
		assert.equal(this.oGrandChild1HashReplacedSpy.callCount, 1, "GrandChild1 hash changer called");
		assert.equal(this.oGrandChild2HashReplacedSpy.callCount, 0, "GrandChild2 hash changer not called");
		assert.equal(this.oChild2HashReplacedSpy.callCount, 0, "Child 2 hash changer not called");
	});

	QUnit.test("replace hash on the child", function(assert) {
		this.oChildRHC1.replaceHash("Child1");
		assert.equal(this.oRootHashReplacedSpy.callCount, 1, "Root hash changer called");
		assert.equal(this.oChild1HashReplacedSpy.callCount, 1, "Child1 hash changer called");
		assert.equal(this.oGrandChild1HashReplacedSpy.callCount, 0, "GrandChild1 hash changer called");
		assert.equal(this.oGrandChild2HashReplacedSpy.callCount, 0, "GrandChild2 hash changer not called");
		assert.equal(this.oChild2HashReplacedSpy.callCount, 0, "Child 2 hash changer not called");
	});

	QUnit.test("delete prefix for one active child after replaceHash", function(assert) {
		this.oGrandChildRHC2.detachEvent("hashChanged", this.oGrandChild2HashChangedSpy);
		this.oChildRHC1.replaceHash("Child1");
		assert.equal(this.oChild1HashReplacedSpy.args[0][0].getParameter("deletePrefix").length, 1, "Child1 hash changer called");
		assert.equal(this.oChild1HashReplacedSpy.args[0][0].getParameter("deletePrefix")[0], "foo-child1", "Child1 hash changer called");
	});

	QUnit.test("delete prefix for children after replaceHash", function(assert) {
		this.oChildRHC1.replaceHash("Child1");
		assert.equal(this.oChild1HashReplacedSpy.args[0][0].getParameter("deletePrefix").length, 2, "Child1 hash changer called");
		assert.equal(this.oChild1HashReplacedSpy.args[0][0].getParameter("deletePrefix")[0], "foo-child1", "Child1 hash changer called");
		assert.equal(this.oChild1HashReplacedSpy.args[0][0].getParameter("deletePrefix")[1], "foo-child2", "Child1 hash changer called");
	});

	QUnit.test("fireHashChanged on SubHashChanger", function(assert) {
		this.oRHC.fireHashChanged("hash", {});

		assert.equal(this.oChild1HashChangedSpy.callCount, 1, "hashChanged event is fired on the child hashChanger");
		assert.equal(this.oGrandChild1HashChangedSpy.callCount, 1, "hashChanged event is fired on the grand child hashChanger");
		assert.equal(this.oGrandChild2HashChangedSpy.callCount, 1, "hashChanged event is fired on the grand child hashChanger");
		assert.equal(this.oChild1HashChangedSpy.args[0][0].getParameter("newHash"), "", "Child1 hashChanged fired");
		assert.equal(this.oGrandChild1HashChangedSpy.args[0][0].getParameter("newHash"), "", "Grand Child1 hashChanged fired");
		assert.equal(this.oGrandChild2HashChangedSpy.args[0][0].getParameter("newHash"), "", "Grand Child2 hashChanged fired");
	});

	QUnit.test("fireHashChanged on SubHashChanger with subhash", function(assert) {
		this.oRHC.fireHashChanged("hash", {"foo": "subhash"});

		assert.equal(this.oChild1HashChangedSpy.callCount, 1, "hashChanged event is fired on the child hashChanger");
		assert.equal(this.oGrandChild1HashChangedSpy.callCount, 1, "hashChanged event is fired on the grand child hashChanger");
		assert.equal(this.oGrandChild2HashChangedSpy.callCount, 1, "hashChanged event is fired on the grand child hashChanger");
		assert.equal(this.oChild1HashChangedSpy.args[0][0].getParameter("newHash"), "subhash", "Child1 hashChanged fired");
		assert.equal(this.oGrandChild1HashChangedSpy.args[0][0].getParameter("newHash"), "", "Grand Child1 hashChanged fired");
		assert.equal(this.oGrandChild2HashChangedSpy.args[0][0].getParameter("newHash"), "", "Grand Child2 hashChanged fired");
	});

	QUnit.test("fireHashChanged on SubHashChanger with subhashes on nested level", function(assert) {
		this.oRHC.fireHashChanged("hash", {"foo": "subhash", "foo-child1": "subhash.foo"});

		assert.equal(this.oChild1HashChangedSpy.callCount, 1, "hashChanged event is fired on the child hashChanger");
		assert.equal(this.oGrandChild1HashChangedSpy.callCount, 1, "hashChanged event is fired on the grand child hashChanger");
		assert.equal(this.oGrandChild2HashChangedSpy.callCount, 1, "hashChanged event is fired on the grand child hashChanger");
		assert.equal(this.oChild1HashChangedSpy.args[0][0].getParameter("newHash"), "subhash", "Child1 hashChanged fired");
		assert.equal(this.oGrandChild1HashChangedSpy.args[0][0].getParameter("newHash"), "subhash.foo", "Child1 hashChanged fired");
		assert.equal(this.oGrandChild2HashChangedSpy.args[0][0].getParameter("newHash"), "", "Child1 hashChanged fired");
	});
});
