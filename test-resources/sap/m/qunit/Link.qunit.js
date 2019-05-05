/*global QUnit */
/*eslint no-undef:1, no-unused-vars:1, strict: 1 */
sap.ui.define([
	"sap/ui/qunit/QUnitUtils",
	"sap/ui/qunit/utils/createAndAppendDiv",
	"sap/m/Link",
	"jquery.sap.keycodes",
	"sap/ui/core/library",
	"jquery.sap.global"
], function(QUnitUtils, createAndAppendDiv, Link, jQuery, coreLibrary) {
	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;

	// shortcut for sap.ui.core.TextAlign
	var TextAlign = coreLibrary.TextAlign;

	createAndAppendDiv("uiArea1");



	var sText = "Hello World";
	var bLinkPressExpectCtrlKey = false;
	var bLinkPressExpectMetaKey = false;

	var oLink1 = new Link("l1", {
		text : sText,
		href: "x.html",
		target: "_blank",
		width : "200px",
		press:function(oEvent) {
			oEvent.preventDefault();
			assert.ok(true, "This should be executed when the link is triggered");
			assert.strictEqual(oEvent.getParameter("ctrlKey"), bLinkPressExpectCtrlKey, "CtrlKey-Parameter correct for press event");
			assert.strictEqual(oEvent.getParameter("metaKey"), bLinkPressExpectMetaKey, "MetaKey-Parameter correct for press event");
		}
	}).placeAt("uiArea1");

	var oLink2 = new Link("l2", {
		text : sText,
		href: "x.html",
		enabled: false
	}).placeAt("uiArea1");

	// test property accessor methods

	QUnit.test("Text in HTML", function(assert) {
		assert.equal(oLink1.$().text(), sText, "oLink1 text should be correct");
	});

	QUnit.test("Width", function(assert) {
		assert.strictEqual(oLink1.getDomRef().offsetWidth, 200, "oLink1 width should be correct");
	});

	QUnit.test("href", function(assert) {
		var href = oLink1.getDomRef().href;
		assert.strictEqual(href.indexOf("x.html"), href.length - "x.html".length, "oLink1 href should be correct");
	});

	QUnit.test("Target", function(assert) {
		assert.strictEqual(oLink1.getDomRef().target, "_blank", "oLink1 target should be correct");
	});

	QUnit.test("Press event", function(assert) {
		assert.expect(12); // verifies the event handler was executed
		qutils.triggerEvent((jQuery.support.touch ? "tap" : "click"), oLink1.getId());
		bLinkPressExpectCtrlKey = true;
		qutils.triggerEvent((jQuery.support.touch ? "tap" : "click"), oLink1.getId(), {ctrlKey: true});
		bLinkPressExpectCtrlKey = false;
		bLinkPressExpectMetaKey = true;
		qutils.triggerEvent((jQuery.support.touch ? "tap" : "click"), oLink1.getId(), {metaKey: true});
		bLinkPressExpectCtrlKey = true;
		qutils.triggerEvent((jQuery.support.touch ? "tap" : "click"), oLink1.getId(), {metaKey: true, ctrlKey: true});
		bLinkPressExpectMetaKey = false;
		bLinkPressExpectCtrlKey = false;
	});

	QUnit.test("Enter event should fire press event on keydown", function (assert) {
		assert.expect(3); // verifies the event handler was executed
		qutils.triggerKeydown(oLink1.getDomRef(), jQuery.sap.KeyCodes.ENTER);
	});

	QUnit.test("Enter event should not fire press on keyup", function (assert) {
		assert.expect(0); // verifies the event handler was NOT executed
		qutils.triggerKeyup(oLink1.getDomRef(), jQuery.sap.KeyCodes.ENTER);
	});

	QUnit.test("Space event should fire press event on keyup", function (assert) {
		assert.expect(3); // verifies the event handler was executed
		qutils.triggerKeyup(oLink1.getDomRef(), jQuery.sap.KeyCodes.SPACE);
	});

	QUnit.test("Space event should not fire press on keydown", function (assert) {
		assert.expect(0); // verifies the event handler was NOT executed
		qutils.triggerKeydown(oLink1.getDomRef(), jQuery.sap.KeyCodes.SPACE);
	});

	QUnit.test("Disabled", function(assert) {
		assert.expect(0); // verifies the event handler was NOT executed
		oLink1.setEnabled(false);
		qutils.triggerEvent((jQuery.support.touch ? "tap" : "click"), oLink1.getId());
	});

	QUnit.test("Enabled is properly validated", function(assert) {
		var sut = new Link({text : "text"}).placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		sut.setEnabled(undefined);
		sap.ui.getCore().applyChanges();
		assert.ok(!sut.$().hasClass("sapMLnkDsbl"), "The disabled CSS class was not set when trying to set undefined for the enabled property.");
	});

	QUnit.test("When width is not set max-width should apply to control", function(assert) {
		var sut = new Link({text : "text"}).placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		assert.ok(sut.$().hasClass("sapMLnkMaxWidth"), "Link has max width restriction for the trunctation.");

		sut.setWidth("100px");
		sap.ui.getCore().applyChanges();
		assert.ok(!sut.$().hasClass("sapMLnkMaxWidth"), "Link has width and does not have max width restriction.");
	});

	QUnit.test("Subtle", function(assert) {
		oLink1.setSubtle(true);
		sap.ui.getCore().applyChanges();
		assert.ok(oLink1.$().hasClass('sapMLnkSubtle'), "Link is subtle.");
	});

	QUnit.test("Emphasized", function(assert) {
		oLink1.setEmphasized(true);
		sap.ui.getCore().applyChanges();
		assert.ok(oLink1.$().hasClass('sapMLnkEmphasized'), "Link is emphasized.");
		oLink1.destroy();
	});

	QUnit.test("Non-rendered Subtle values", function(assert) {
		// this checks for the bug in BCP message 1472023641 - no need to actually render the Link (issue is about non-rendered Links) or write checks, it would fail with a JS error
		assert.expect(0);
		var oLinkNRS = new Link({subtle: false});
		oLinkNRS.setSubtle(true);
		oLinkNRS.setSubtle(false);
		oLinkNRS.destroy();
	});

	QUnit.test("Non-rendered Emphasized values", function(assert) {
		// this checks for the bug in BCP message 1472023641 - no need to actually render the Link (issue is about non-rendered Links) or write checks, it would fail with a JS error
		assert.expect(0);
		var oLinkNRE = new Link({emphasized: false});
		oLinkNRE.setEmphasized(true);
		oLinkNRE.setEmphasized(false);
		oLinkNRE.destroy();
	});

	QUnit.test("Rendered initial Subtle values", function(assert) {
		assert.expect(1);
		var oLinkRIS = new Link({subtle: true});
		oLinkRIS.placeAt("uiArea1");
		sap.ui.getCore().applyChanges();
		assert.ok(oLinkRIS.$().hasClass('sapMLnkSubtle'), "Link should have the 'sapMLnkSubtle' CSS class.");
		oLinkRIS.destroy();
	});

	QUnit.test("Rendered initial Emphasized values", function(assert) {
		assert.expect(1);
		var oLinkRIE = new Link({emphasized: true});
		oLinkRIE.placeAt("uiArea1");
		sap.ui.getCore().applyChanges();
		assert.ok(oLinkRIE.$().hasClass('sapMLnkEmphasized'), "Link should have the 'sapMLnkEmphasized' CSS class.");
		oLinkRIE.destroy();
	});

	QUnit.test("Link should be shrinkable", function(assert) {
		var oLink = new Link();
		assert.ok(oLink.getMetadata().isInstanceOf("sap.ui.core.IShrinkable"), "Link control implements IShrinkable interface");
		oLink.destroy();
	});

	QUnit.test("Disabled link should not have the preseted href", function(assert) {
		assert.equal(oLink2.$().attr("href"), undefined, "oLink2 href should not exist");
		oLink2.setEnabled(true);
		sap.ui.getCore().applyChanges();
		assert.equal(oLink2.$().attr("href"), "x.html", "oLink2 href should be 'x.html' again after enabling");
		oLink2.destroy();
	});

	// Keyboard handling
	QUnit.test("Disabled link should not be :focusable", function(assert) {
		var oLink1 = new Link("l1", {
			text : sText,
			href: "x.html",
			target: "_blank",
			width : "200px",
			enabled : false
		}).placeAt("uiArea1");

		sap.ui.getCore().applyChanges();

		var $oLink = oLink1.$();

		assert.strictEqual($oLink.is(":focusable"), false, "jQuery indicates that a disabled link isn't :focusable");

		oLink1.destroy();
	});

	QUnit.test("Link with empty or no text should not be in the tab chain", function(assert) {
		var oLink1 = new Link("l1", {
			text : "",
			href: "x.html",
			target: "_blank",
			width : "200px"
		}).placeAt("uiArea1");

		sap.ui.getCore().applyChanges();

		var $oLink = oLink1.$();

		assert.strictEqual($oLink.attr("tabIndex"), "-1", "Property 'tabIndex' should be '-1'");

		oLink1.destroy();
	});

	QUnit.test("_getTabindex should return -1 if the link has no text", function(assert) {
		var oLink1 = new Link({
			text : ""
		});

		assert.equal(oLink1._getTabindex(), "-1", "Tabindex of the Link should be -1");

		oLink1.destroy();
	});

	QUnit.test("_getTabindex should return 0 if the link has text", function(assert) {
		var oLink1 = new Link({
			text : "Some link"
		});

		assert.equal(oLink1._getTabindex(), "0", "Tabindex of the Link should be 0");

		oLink1.destroy();
	});

	QUnit.test("Normal link should be in the tab chain", function(assert) {
		var oLink1 = new Link("l1", {
			text : sText,
			href: "x.html",
			target: "_blank",
			width : "200px"
		}).placeAt("uiArea1");

		sap.ui.getCore().applyChanges();

		var $oLink = oLink1.$();

		assert.strictEqual($oLink.attr("tabIndex"), "0", "Property 'tabIndex' should be '0'");

		oLink1.destroy();
	});

	// ARIA specific tests
	QUnit.test("ARIA specific test", function(assert) {
		var oLink1 = new Link("l1", {
			text : sText,
			href: "x.html",
			target: "_blank",
			width : "200px",
			press:function() {
				assert.ok(true, "This should be executed when the link is triggered");
			}
		}).placeAt("uiArea1");
		sap.ui.getCore().applyChanges();

		var $oLink = oLink1.$(),
			oBrowserStub;

		// ARIA role
		assert.strictEqual($oLink.attr("role"), "link", "Property 'role' should be 'link'");

		// ARIA disabled
		oLink1.setEnabled(false);
		assert.strictEqual($oLink.attr("aria-disabled"), "true", "Property 'aria-disabled' should be 'true'");
		oLink1.setEnabled(true);
		assert.strictEqual($oLink.attr("aria-disabled"), undefined, "Property 'aria-disabled' should not exist");

		// ARIA describedby for Subtle link
		oLink1.setSubtle(true);
		assert.strictEqual($oLink.attr("aria-describedby"). length > 0, true, "Property 'aria-describedby' should exist");
		assert.strictEqual((($oLink.attr("aria-describedby").indexOf(oLink1._sAriaLinkSubtleId)) !== -1), true,
			"Subtle ID: " + oLink1._sAriaLinkSubtleId + " should be included in aria-describedby");

		oLink1.setSubtle(false);
		assert.strictEqual($oLink.attr("aria-describedby"), undefined, "Property 'aria-describedby' should not exist");

		// ARIA describedby for Emphasized link
		oLink1.setEmphasized(true);
		assert.strictEqual($oLink.attr("aria-describedby").length > 0, true, "Property 'aria-describedby' should exist");
		assert.strictEqual((($oLink.attr("aria-describedby").indexOf(oLink1._sAriaLinkEmphasizedId)) !== -1), true,
			"Emphasized ID: " + oLink1._sAriaLinkEmphasizedId + " should be included in aria-describedby");

		oLink1.setEmphasized(false);
		assert.strictEqual($oLink.attr("aria-describedby"), undefined, "Property 'aria-describedby' should not exist");

		oBrowserStub = this.stub(sap.ui.Device, "browser", { msie: false });
		oLink1.addAriaLabelledBy("id1");
		sap.ui.getCore().applyChanges();
		assert.strictEqual(oLink1.$().attr("aria-labelledby"), "id1 " + oLink1.getId(),
			"Property 'aria-labelledby' should contain the link ID for non-IE browsers");

		oLink1.removeAriaLabelledBy("id1");
		sap.ui.getCore().applyChanges();
		assert.strictEqual(oLink1.$().attr("aria-labelledby"), undefined, "Property 'aria-labelledby' should not exist");

		// No self-reference on IE
		oBrowserStub = this.stub(sap.ui.Device, "browser", { msie: true });
		oLink1.addAriaLabelledBy("id1");
		sap.ui.getCore().applyChanges();
		assert.strictEqual(oLink1.$().attr("aria-labelledby"), "id1", "Link has no self-reference on IE");
		oBrowserStub.restore();

		oLink1.destroy();
	});

	QUnit.test("textAlign set to END", function(assert) {
		var oLink = new Link({
			text: "(+359) 111 222 333",
			textAlign: TextAlign.End
		});

		oLink.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		assert.strictEqual(oLink.$().css("text-align"), "right", "Text align style is shifted to right");

		oLink.destroy();
	});

	QUnit.test("textDirection set to RTL and textAlign set to Begin", function(assert) {
		var oLink = new Link({
			text: "(+359) 111 222 333",
			textAlign: TextAlign.Begin,
			textDirection: TextDirection.RTL
		});

		oLink.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		assert.strictEqual(oLink.$().attr('dir'), 'rtl', "The dir element must be set to 'rtl'");
		assert.strictEqual(oLink.$().css("text-align"), "right", "Text align style is shifted to right");

		oLink.destroy();
	});

	QUnit.test("textDirection set to LTR and textAlign set to END", function(assert) {
		var oLink = new Link({
			text: "(+359) 111 222 333",
			textAlign: TextAlign.End,
			textDirection: TextDirection.LTR
		});

		oLink.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		assert.strictEqual(oLink.$().attr('dir'), 'ltr', "The dir element must be set to 'ltr'");
		assert.strictEqual(oLink.$().css("text-align"), "right", "Text align style is shifted to right");

		oLink.destroy();
	});

	QUnit.test("textDirection not set", function(assert) {
		var oLink = new Link({
			text: "(+359) 111 222 333"
		});

		oLink.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		assert.strictEqual(oLink.$().attr('dir'), undefined, "The dir attribute should not be rendered");

		oLink.destroy();
	});

	QUnit.test("validateUrl property behavior", function(assert) {
		var sValidUrl = "http://sap.com",
			sInvalidUrl = "hhtp://invalid",
			oLink = new Link({
				validateUrl: true,
				text: "Validate URL",
				href: sInvalidUrl
			});

		oLink.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		assert.equal(oLink.$().attr("href"), undefined, "Link href should not exist if an invalid URL is provided");

		oLink.setHref(sValidUrl);
		assert.equal(oLink.$().attr("href"), sValidUrl, "Link href should equal the valid URL");

		oLink.setHref(sInvalidUrl);
		assert.equal(oLink.$().attr("href"), undefined, "Link href should not exist if an invalid URL is set");

		oLink.destroy();
	});

	QUnit.test("getAccessibilityInfo", function(assert) {
		var oControl = new Link({text: "Text", href: "HRef"});
		assert.ok(!!oControl.getAccessibilityInfo, "Link has a getAccessibilityInfo function");
		var oInfo = oControl.getAccessibilityInfo();
		assert.ok(!!oInfo, "getAccessibilityInfo returns a info object");
		assert.strictEqual(oInfo.role, "link", "AriaRole");
		assert.strictEqual(oInfo.type, sap.ui.getCore().getLibraryResourceBundle("sap.m").getText("ACC_CTR_TYPE_LINK"), "Type");
		assert.strictEqual(oInfo.description, "Text", "Description");
		assert.strictEqual(oInfo.focusable, true, "Focusable");
		assert.strictEqual(oInfo.enabled, true, "Enabled");
		assert.ok(oInfo.editable === undefined || oInfo.editable === null, "Editable");
		oControl.setText("");
		oControl.setEnabled(false);
		oInfo = oControl.getAccessibilityInfo();
		assert.strictEqual(oInfo.description, "HRef", "Description");
		assert.strictEqual(oInfo.focusable, false, "Focusable");
		oControl.destroy();
	});
});