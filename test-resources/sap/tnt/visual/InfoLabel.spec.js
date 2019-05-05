/*global describe,it,element,by,takeScreenshot,expect,browser*/

describe("sap.tnt.InfoLabel", function () {
	"use strict";

	// initial loading
	it("should load test page", function () {
		expect(takeScreenshot()).toLookAs("0_initial");
	});

	it("should vizualize InfoLabels in editable Form", function () {
		var formWithInfoLabels1 = element(by.id("form1"));
		browser.executeScript('document.getElementById("form1").scrollIntoView()').then(function () {
			expect(takeScreenshot(formWithInfoLabels1)).toLookAs("1_in_form");
		});
	});

	it("should vizualize InfoLabels in non-editable Form", function () {
		var formWithInfoLabels2 = element(by.id("form2"));
		browser.executeScript('document.getElementById("form2").scrollIntoView()').then(function () {
			expect(takeScreenshot(formWithInfoLabels2)).toLookAs("2_in_non_editable_form");
		});
	});

	it("should vizualize InfoLabel with default color scheme", function () {
		var infoLabel1 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(1) .sapTntInfoLabel"));
		browser.executeScript('document.getElementById("vb1").scrollIntoView()').then(function () {
			expect(takeScreenshot(infoLabel1)).toLookAs("3_default_color_scheme");
		});
	});

	it("should vizualize InfoLabel with color scheme 1", function () {
		var infoLabel2 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(2) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel2)).toLookAs("4_color_scheme_1");
	});

	it("should vizualize InfoLabel with color scheme 2", function () {
		var infoLabel3 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(3) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel3)).toLookAs("5_color_scheme_2");
	});

	it("should vizualize InfoLabel with color scheme 3", function () {
		var infoLabel4 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(4) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel4)).toLookAs("6_color_scheme_3");
	});

	it("should vizualize InfoLabel with color scheme 4", function () {
		var infoLabel5 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(5) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel5)).toLookAs("7_color_scheme_4");
	});

	it("should vizualize InfoLabel with color scheme 5", function () {
		var infoLabel6 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(6) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel6)).toLookAs("8_color_scheme_5");
	});

	it("should vizualize InfoLabel with color scheme 6", function () {
		var infoLabel7 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(7) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel7)).toLookAs("9_color_scheme_6");
	});

	it("should vizualize InfoLabel with color scheme 7", function () {
		var infoLabel8 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(8) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel8)).toLookAs("10_color_scheme_7");
	});

	it("should vizualize InfoLabel with color scheme 8", function () {
		var infoLabel9 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(9) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel9)).toLookAs("11_color_scheme_8");
	});

	it("should vizualize InfoLabel with color scheme 9", function () {
		var infoLabel10 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(10) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel10)).toLookAs("12_color_scheme_9");
	});

	it("should vizualize InfoLabel with truncated text", function () {
		var infoLabel11 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(11) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel11)).toLookAs("13_truncated");
	});

	it("should vizualize InfoLabel with larger width than content", function () {
		var infoLabel12 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(12) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel12)).toLookAs("14_larger_width_than_content");
	});

	it("should vizualize InfoLabel with smaller width than content", function () {
		var infoLabel13 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(13) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel13)).toLookAs("15_smaller_width_than_content");
	});

	it("should vizualize InfoLabel with property displayOnly true", function () {
		var infoLabel15 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(15) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel15)).toLookAs("16_displayOnly_true");
	});

	it("should vizualize InfoLabel with property displayOnly true and truncation", function () {
		var infoLabel16 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(16) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel16)).toLookAs("17_displayOnly_truncation");
	});

	it("should vizualize InfoLabel with property displayOnly true, truncation and width", function () {
		var infoLabel17 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(17) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel17)).toLookAs("18_displayOnly_truncation_width");
	});

	it("should vizualize InfoLabel with numeric content and renderMode: narrow", function () {
		var infoLabel18 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(18) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel18)).toLookAs("19_renderMode_narrow");
	});

	it("should vizualize InfoLabel with numeric content, renderMode: narrow and truncation", function () {
		var infoLabel22 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(22) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel22)).toLookAs("20_renderMode_narrow_and_truncation");
	});

	it("should vizualize InfoLabel with no text", function () {
		var infoLabel24 = element(by.css("#vb1 .sapMFlexItem:nth-of-type(24) .sapTntInfoLabel"));
		expect(takeScreenshot(infoLabel24)).toLookAs("21_no_text");
	});
});