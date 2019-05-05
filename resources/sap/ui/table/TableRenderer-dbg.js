/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides default renderer for control sap.ui.table.Table
sap.ui.define(['sap/ui/core/Control', 'sap/ui/core/theming/Parameters', 'sap/ui/Device', './library', './TableUtils', "./TableExtension",
			   'sap/ui/core/Renderer', 'sap/ui/core/IconPool', "sap/base/Log"],
	function(Control, Parameters, Device, library, TableUtils, TableExtension, Renderer, IconPool, Log) {
	"use strict";


	// shortcuts
	var SelectionMode = library.SelectionMode,
		VisibleRowCountMode = library.VisibleRowCountMode;

	/**
	 * Table renderer.
	 *
	 * @namespace
	 * @alias sap.ui.table.TableRenderer
	 */
	var TableRenderer = {};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} rm The RenderManager that can be used for writing to the Render-Output-Buffer.
	 * @param {sap.ui.table.Table} oTable The instance of the table that should be rendered.
	 */
	TableRenderer.render = function(rm, oTable) {
		// Clear cashed header row count
		delete oTable._iHeaderRowCount;

		// The resource bundle is required for rendering. In case it is not already loaded, it should be loaded synchronously.
		TableUtils.getResourceBundle();

		// basic table div
		rm.write("<div");
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "ROOT");
		rm.writeControlData(oTable);
		rm.addClass("sapUiTable");

		if (Device.browser.chrome && window.devicePixelRatio < 1) {
			rm.addClass("sapUiTableZoomout");
		}

		if ('ontouchstart' in document) {
			rm.addClass("sapUiTableTouch");
		}
		rm.addClass("sapUiTableSelMode" + oTable.getSelectionMode());

		if (oTable.getColumnHeaderVisible()) {
			rm.addClass("sapUiTableCHdr"); // show column headers
		}
		if (TableUtils.hasRowHeader(oTable)) {
			rm.addClass("sapUiTableRowSelectors"); // show row selectors
		}
		if (TableUtils.hasRowHighlights(oTable)) {
			rm.addClass("sapUiTableRowHighlights"); // show row highlights
		}

		// This class flags whether the sap.m. library is loaded or not.
		var sSapMTableClass = library.TableHelper.addTableClass();
		if (sSapMTableClass) {
			rm.addClass(sSapMTableClass);
		}

		var oScrollExtension = oTable._getScrollExtension();
		if (oScrollExtension.isVerticalScrollbarRequired() && !oScrollExtension.isVerticalScrollbarExternal()) {
			rm.addClass("sapUiTableVScr"); // show vertical scrollbar
		}
		if (oTable.getEditable()) {
			rm.addClass("sapUiTableEdt"); // editable (background color)
		}

		if (TableUtils.hasRowActions(oTable)) {
			var iRowActionCount = TableUtils.getRowActionCount(oTable);
			rm.addClass(iRowActionCount == 1 ? "sapUiTableRActS" : "sapUiTableRAct");
		}

		if (TableUtils.isNoDataVisible(oTable) && !TableUtils.hasPendingRequests(oTable)) {
			rm.addClass("sapUiTableEmpty"); // no data!
		}

		if (oTable.getShowOverlay()) {
			rm.addClass("sapUiTableOverlay");
		}

		var sModeClass = TableUtils.Grouping.getModeCssClass(oTable);
		if (sModeClass) {
			rm.addClass(sModeClass);
		}

		if (oTable.getWidth()) {
			rm.addStyle("width", oTable.getWidth());
		}

		if (oTable.getVisibleRowCountMode() == VisibleRowCountMode.Auto) {
			rm.addStyle("height", "0px");
			if (oTable._bFirstRendering) {
				rm.addClass("sapUiTableNoOpacity");
			}
		}

		rm.writeClasses();
		rm.writeStyles();
		rm.write(">");

		this.renderTabElement(rm, "sapUiTableOuterBefore");

		if (oTable.getTitle()) {
			this.renderHeader(rm, oTable, oTable.getTitle());
		}

		if (oTable.getToolbar()) {
			this.renderToolbar(rm, oTable, oTable.getToolbar());
		}

		if (oTable.getExtension() && oTable.getExtension().length > 0) {
			this.renderExtensions(rm, oTable, oTable.getExtension());
		}
		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-sapUiTableCnt");
		rm.addClass("sapUiTableCnt");
		rm.writeClasses();

		// Define group for F6 handling
		rm.writeAttribute("data-sap-ui-fastnavgroup", "true");
		rm.write(">");

		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-sapUiTableGridCnt");
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "CONTENT");
		rm.write(">");

		this.renderColRsz(rm, oTable);
		this.renderColHdr(rm, oTable);
		this.renderTable(rm, oTable);

		rm.write("</div>");

		var oCreationRow = oTable.getCreationRow();
		if (oCreationRow) {
			rm.renderControl(oCreationRow);

			// If the table has a creation row, the horizontal scrollbar needs to be rendered outside the element covered by the busy indicator.
			this.renderHSbBackground(rm, oTable);
			this.renderHSb(rm, oTable);
		}

		oTable._getAccRenderExtension().writeHiddenAccTexts(rm, oTable);

		rm.write("<div");
		rm.addClass("sapUiTableOverlayArea");
		rm.writeClasses();
		rm.writeAttribute("tabindex", "0");
		rm.writeAttribute("id", oTable.getId() + "-overlay");
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "OVERLAY");
		rm.write("></div>");

		rm.write("</div>");

		if (oTable.getFooter()) {
			this.renderFooter(rm, oTable, oTable.getFooter());
		}

		if (oTable.getVisibleRowCountMode() == VisibleRowCountMode.Interactive) {
			this.renderVariableHeight(rm ,oTable);
		}

		this.renderTabElement(rm, "sapUiTableOuterAfter");

		rm.write("</div>");
	};

	// =============================================================================
	// BASIC AREAS OF THE TABLE
	// =============================================================================

	TableRenderer.renderHeader = function(rm, oTable, oTitle) {
		rm.write("<div");
		rm.addClass("sapUiTableHdr");
		rm.writeClasses();
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "TABLEHEADER");
		rm.write(">");

		rm.renderControl(oTitle);

		rm.write("</div>");
	};

	TableRenderer.renderToolbar = function(rm, oTable, oToolbar) {
		if (!TableUtils.isA(oToolbar, "sap.ui.core.Toolbar")) {
			return;
		}

		rm.write("<div");
		rm.addClass("sapUiTableTbr");

		// toolbar has to be embedded (not standalone)!
		if (typeof oToolbar.getStandalone === "function" && oToolbar.getStandalone()) {
			oToolbar.setStandalone(false);
		}

		// set the default design of the toolbar
		if (oToolbar.isA("sap.m.Toolbar")) {
			oToolbar.setDesign("Transparent", true);
			oToolbar.addStyleClass("sapMTBHeader-CTX");
			rm.addClass("sapUiTableMTbr"); // Just a marker when sap.m toolbar is used
		}

		rm.writeClasses();
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "TABLESUBHEADER");
		rm.write(">");
		rm.renderControl(oToolbar);
		rm.write("</div>");
	};

	TableRenderer.renderExtensions = function(rm, oTable, aExtensions) {
		for (var i = 0, l = aExtensions.length; i < l; i++) {
			this.renderExtension(rm, oTable, aExtensions[i]);
		}
	};

	TableRenderer.renderExtension = function(rm, oTable, oExtension) {
		rm.write("<div");
		rm.addClass("sapUiTableExt");
		rm.writeClasses();
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "TABLESUBHEADER");
		rm.write(">");

		rm.renderControl(oExtension);

		rm.write("</div>");
	};

	TableRenderer.renderTable = function(rm, oTable) {
		this.renderTabElement(rm, "sapUiTableCtrlBefore");
		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-tableCCnt");
		rm.addClass("sapUiTableCCnt");
		rm.writeClasses();
		rm.write(">");

		this.renderTableCCnt(rm, oTable);
		rm.write("</div>");
		this.renderTabElement(rm, "sapUiTableCtrlAfter");

		if (!oTable._getScrollExtension().isVerticalScrollbarExternal()) {
			this.renderVSbBackground(rm, oTable);
			this.renderVSb(rm, oTable);
		}

		var oCreationRow = oTable.getCreationRow();
		if (!oCreationRow) {
			this.renderHSbBackground(rm, oTable);
			this.renderHSb(rm, oTable);
		}
	};

	TableRenderer.renderTableCCnt = function(rm, oTable) {
		this.renderTableCtrl(rm, oTable);
		this.renderRowHdr(rm, oTable);
		this.renderRowActions(rm, oTable);

		rm.write("<div");
		rm.addClass("sapUiTableCtrlEmpty");
		rm.writeClasses();
		rm.writeAttribute("tabindex", "0");
		rm.writeAttribute("id", oTable.getId() + "-noDataCnt");
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "NODATA");
		rm.write(">");
		if (oTable.getNoData() instanceof Control) {
			rm.renderControl(oTable.getNoData());
		} else {
			rm.write("<span");
			rm.writeAttribute("id", oTable.getId() + "-noDataMsg");
			rm.addClass("sapUiTableCtrlEmptyMsg");
			rm.writeClasses();
			rm.write(">");
			rm.writeEscaped(TableUtils.getNoDataText(oTable));
			rm.write("</span>");
		}
		rm.write("</div>");
	};

	TableRenderer.renderFooter = function(rm, oTable, oFooter) {
		rm.write("<div");
		rm.addClass("sapUiTableFtr");
		rm.writeClasses();
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "TABLEFOOTER");
		rm.write(">");

		rm.renderControl(oFooter);

		rm.write("</div>");
	};

	TableRenderer.renderVariableHeight = function(rm, oTable) {
		rm.write('<div id="' + oTable.getId() + '-sb" tabIndex="-1"');
		rm.addClass("sapUiTableHeightResizer");
		rm.addStyle("height", "5px");
		rm.writeClasses();
		rm.writeStyles();
		rm.write(">");
		rm.write("</div>");
	};

	// =============================================================================
	// COLUMN HEADER OF THE TABLE
	// =============================================================================

	TableRenderer.renderColHdr = function(rm, oTable) {
		var nRows = TableUtils.getHeaderRowCount(oTable);
		var aCols = oTable.getColumns();
		var iFixedColumnCount = oTable.getComputedFixedColumnCount();

		rm.write("<div");
		rm.addClass("sapUiTableColHdrCnt");
		rm.writeClasses();
		rm.write(">");

		this.renderColRowHdr(rm, oTable);

		if (iFixedColumnCount > 0) {
			rm.write("<div");
			rm.addClass("sapUiTableCHA"); // marker for the column header area
			rm.addClass("sapUiTableCtrlScrFixed");
			rm.addClass("sapUiTableNoOpacity");
			rm.writeClasses();
			rm.write(">");

			//
			// write fixed table here
			//
			this.renderTableControlCnt(rm, oTable, true, 0, iFixedColumnCount, true, false, 0, nRows, true);
			rm.write("</div>");
		}

		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-sapUiTableColHdrScr");
		rm.addClass("sapUiTableCHA"); // marker for the column header area
		rm.addClass("sapUiTableCtrlScr");
		if (aCols.length == 0) {
			rm.addClass("sapUiTableHasNoColumns");
		}
		rm.writeClasses();
		if (iFixedColumnCount > 0) {
			if (oTable._bRtlMode) {
				rm.addStyle("margin-right", "0");
			} else {
				rm.addStyle("margin-left", "0");
			}
			rm.writeStyles();
		}
		rm.write(">");

		//
		// write scrollable table here
		//
		this.renderTableControlCnt(rm, oTable, false, iFixedColumnCount, aCols.length, false, false, 0, nRows, true);

		rm.write("</div>");

		if (TableUtils.hasRowActions(oTable)) {
			rm.write("<div");
			rm.writeAttribute("id", oTable.getId() + "-rowacthdr");
			oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "ROWACTIONHEADER");

			rm.addClass("sapUiTableCell");
			rm.addClass("sapUiTableHeaderCell");
			rm.addClass("sapUiTableRowActionHeaderCell");
			rm.writeClasses();
			rm.write(">");

			rm.write("<span>");
			rm.writeEscaped(TableUtils.getResourceText("TBL_ROW_ACTION_COLUMN_LABEL"));
			rm.write("</span>");

			rm.write("</div>");
		}

		rm.write("</div>");

	};

	TableRenderer.renderColRowHdr = function(rm, oTable) {
		var bEnabled = false;
		var bSelAll = false;
		var mRenderConfig = oTable._oSelectionPlugin.getRenderConfig();

		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-selall");

		rm.addClass("sapUiTableCell");
		rm.addClass("sapUiTableHeaderCell");
		rm.addClass("sapUiTableRowSelectionHeaderCell");

		if (TableUtils.hasSelectAll(oTable)) {
			var bAllRowsSelected = TableUtils.areAllRowsSelected(oTable);

			if (oTable._getShowStandardTooltips()) {
				var sSelectAllResourceTextID;

				if (mRenderConfig.headerSelector.type === "toggle") {
					sSelectAllResourceTextID = bAllRowsSelected ? "TBL_DESELECT_ALL" : "TBL_SELECT_ALL";
				} else if (mRenderConfig.headerSelector.type === "clear") {
					sSelectAllResourceTextID = "TBL_DESELECT_ALL";
				}

				if (sSelectAllResourceTextID) {
					rm.writeAttributeEscaped("title", TableUtils.getResourceText(sSelectAllResourceTextID));
				}
			}
			if (!bAllRowsSelected) {
				rm.addClass("sapUiTableSelAll");
			} else {
				bSelAll = true;
			}
			rm.addClass("sapUiTableSelAllEnabled");
			bEnabled = true;
		} else {
			rm.addClass("sapUiTableSelAllDisabled");
		}

		rm.writeClasses();

		rm.writeAttribute("tabindex", "-1");

		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "COLUMNROWHEADER", {enabled: bEnabled, checked: bSelAll});

		rm.write(">");

		if (oTable.getSelectionMode() !== SelectionMode.Single) {
			if (mRenderConfig.headerSelector.icon) {
				rm.renderControl(mRenderConfig.headerSelector.icon);
			} else {
				rm.write("<div");
				rm.addClass("sapUiTableSelectAllCheckBox");
				rm.writeClasses();
				rm.write("></div>");
			}
		}

		rm.write("</div>");
	};

	TableRenderer.renderCol = function(rm, oTable, oColumn, iHeader, nSpan, bIsFirstColumn, bIsLastFixedColumn, bIsLastColumn) {
		var oLabel,
			bInvisible = !nSpan,
			iIndex = oColumn.getIndex(),
			aLabels = oColumn.getMultiLabels();
		if (aLabels.length > 0) {
			oLabel = aLabels[iHeader];
		} else if (iHeader == 0) {
			oLabel = oColumn.getLabel();
		}

		rm.write("<td");
		var sHeaderId = oColumn.getId();
		if (iHeader === 0) {
			rm.writeElementData(oColumn);
		} else {
			sHeaderId = sHeaderId + "_" + iHeader;
			rm.writeAttribute('id', sHeaderId);
		}
		rm.writeAttribute('data-sap-ui-colid', oColumn.getId());
		rm.writeAttribute("data-sap-ui-colindex", iIndex);

		rm.writeAttribute("tabindex", "-1");

		var mAccParams = {
			column: oColumn,
			headerId: sHeaderId,
			index: iIndex
		};

		if (nSpan > 1) {
			rm.writeAttribute("colspan", nSpan);
			mAccParams.colspan = true;
		}

		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "COLUMNHEADER", mAccParams);

		rm.addClass("sapUiTableCell");
		rm.addClass("sapUiTableHeaderCell");
		rm.addClass("sapUiTableHeaderDataCell");
		if (bIsFirstColumn) {
			rm.addClass("sapUiTableCellFirst");
		}
		if (bIsLastFixedColumn) {
			rm.addClass("sapUiTableCellLastFixed");
		}
		if (bIsLastColumn) {
			rm.addClass("sapUiTableCellLast");
		}
		if (bInvisible) {
			rm.addClass("sapUiTableHidden");
		}

		rm.writeClasses();
		if (oTable.getColumnHeaderHeight() > 0) {
			rm.addStyle("height", oTable.getColumnHeaderHeight() + "px");
		}
		rm.writeStyles();
		var sTooltip = oColumn.getTooltip_AsString();
		if (sTooltip) {
			rm.writeAttributeEscaped("title", sTooltip);
		}
		rm.write("><div");
		rm.addClass("sapUiTableCellInner");
		rm.writeAttribute("id", sHeaderId + "-inner");
		rm.writeClasses();
		var sHAlign = Renderer.getTextAlign(oColumn.getHAlign(), oLabel && oLabel.getTextDirection && oLabel.getTextDirection());
		if (sHAlign) {
			rm.addStyle("text-align", sHAlign);
		}
		rm.writeStyles();
		rm.write(">");

		if (oLabel) {
			rm.renderControl(oLabel);
		}

		rm.write("</div></td>");
	};

	TableRenderer.renderColRsz = function(rm, oTable) {
		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-rsz");
		rm.addClass("sapUiTableColRsz");
		rm.writeClasses();
		rm.write("></div>");
	};

	// =============================================================================
	// CONTENT AREA OF THE TABLE
	// =============================================================================

	TableRenderer.renderRowHdr = function(rm, oTable) {
		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-sapUiTableRowHdrScr");
		rm.addClass("sapUiTableRowHdrScr");
		rm.addClass("sapUiTableNoOpacity");
		rm.writeClasses();
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "ROWHEADER_COL");
		rm.write(">");

		// start with the first current top visible row
		for (var row = 0, count = oTable.getRows().length; row < count; row++) {
			this.renderRowAddon(rm, oTable, oTable.getRows()[row], row, true);
		}

		rm.write("</div>");
	};

	TableRenderer.renderRowActions = function(rm, oTable) {
		if (!TableUtils.hasRowActions(oTable)) {
			return;
		}
		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-sapUiTableRowActionScr");
		rm.addClass("sapUiTableRowActionScr");
		rm.addClass("sapUiTableNoOpacity");
		rm.writeClasses();
		rm.write(">");

		// start with the first current top visible row
		for (var row = 0, count = oTable.getRows().length; row < count; row++) {
			this.renderRowAddon(rm, oTable, oTable.getRows()[row], row, false);
		}

		rm.write("</div>");
	};

	TableRenderer.addRowCSSClasses = function(rm, oTable, iIndex) {
		var iFixedRowCount = oTable.getFixedRowCount();
		var iFirstFixedBottomRowIndex = TableUtils.getFirstFixedBottomRowIndex(oTable);

		if (iIndex === 0) {
			rm.addClass("sapUiTableFirstRow");
		} else if (iIndex === oTable.getRows().length - 1) {
			rm.addClass("sapUiTableLastRow");
		}

		if (iFixedRowCount > 0) {
			if (iIndex == iFixedRowCount - 1) {
				rm.addClass("sapUiTableRowLastFixedTop");
			}
		}

		if (iFirstFixedBottomRowIndex >= 0 && iFirstFixedBottomRowIndex === iIndex) {
			rm.addClass("sapUiTableRowFirstFixedBottom");
		} else if (iFirstFixedBottomRowIndex >= 1 && iFirstFixedBottomRowIndex - 1 === iIndex) {
			rm.addClass("sapUiTableRowLastScrollable");
		}
	};

	TableRenderer.renderRowAddon = function(rm, oTable, oRow, iRowIndex, bHeader) {
		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + (bHeader ? "-rowsel" : "-rowact") + iRowIndex);
		rm.writeAttribute("data-sap-ui-related", oRow.getId());
		rm.writeAttribute("data-sap-ui-rowindex", iRowIndex);
		rm.addClass("sapUiTableCell");
		rm.addClass("sapUiTableContentCell");
		rm.addClass(bHeader ? "sapUiTableRowSelectionCell" : "sapUiTableRowActionCell");
		if (iRowIndex % 2 != 0 && oTable.getAlternateRowColors() && !TableUtils.Grouping.isTreeMode(oTable)) {
			rm.addClass("sapUiTableRowAlternate");
		}
		this.addRowCSSClasses(rm, oTable, iRowIndex);
		var bRowSelected = false;
		var bRowHidden = false;
		if (oRow._bHidden) {
			rm.addClass("sapUiTableRowHidden");
			bRowHidden = true;
		} else {
			if (oTable.isIndexSelected(oRow.getIndex())) {
				rm.addClass("sapUiTableRowSel");
				bRowSelected = true;
			}
		}

		rm.writeClasses();
		if (oTable.getRowHeight() > 0) {
			rm.addStyle("height", oTable._getDefaultRowHeight() + "px");
		}

		rm.writeAttribute("tabindex", "-1");

		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, bHeader ? "ROWHEADER" : "ROWACTION", {rowSelected: bRowSelected, rowHidden: bRowHidden});

		rm.writeStyles();
		rm.write(">");
		if (bHeader) {
			this.writeRowHighlightContent(rm, oTable, oRow, iRowIndex);
			this.writeRowSelectorContent(rm, oTable, oRow, iRowIndex);
		} else {
			var oAction = oRow.getRowAction();
			if (oAction) {
				rm.renderControl(oAction);
			}
		}
		rm.write("</div>");
	};

	TableRenderer.renderTableCtrl = function(rm, oTable) {

		if (oTable.getComputedFixedColumnCount() > 0) {
			rm.write("<div");
			rm.writeAttribute("id", oTable.getId() + "-sapUiTableCtrlScrFixed");
			rm.addClass("sapUiTableCtrlScrFixed");
			rm.writeClasses();
			rm.write(">");

			this.renderTableControl(rm, oTable, true);

			rm.write("</div>");
		}

		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-sapUiTableCtrlScr");
		rm.addClass("sapUiTableCtrlScr");
		rm.writeClasses();
		if (oTable.getComputedFixedColumnCount() > 0) {
			if (oTable._bRtlMode) {
				rm.addStyle("margin-right", "0");
			} else {
				rm.addStyle("margin-left", "0");
			}
			rm.writeStyles();
		}
		rm.write(">");

		rm.write("<div");
		rm.writeAttribute("id", oTable.getId() + "-tableCtrlCnt");
		rm.addClass("sapUiTableCtrlCnt");
		rm.writeClasses();
		if (!TableUtils.isVariableRowHeightEnabled(oTable)) {
			var sVisibleRowCountMode = oTable.getVisibleRowCountMode();
			if (oTable._iTableRowContentHeight && (sVisibleRowCountMode == VisibleRowCountMode.Fixed || sVisibleRowCountMode == VisibleRowCountMode.Interactive)) {
				var sStyle = "height";
				if (oTable.getVisibleRowCountMode() == VisibleRowCountMode.Fixed) {
					sStyle = "min-height";
				}
				rm.addStyle(sStyle, oTable._iTableRowContentHeight + "px");
				rm.writeStyles();
			}
		}
		rm.write(">");

		this.renderTableControl(rm, oTable, false);

		rm.write("</div></div>");
	};


	TableRenderer.renderTableControl = function(rm, oTable, bFixedTable) {
		var iStartColumn, iEndColumn;
		if (bFixedTable) {
			iStartColumn = 0;
			iEndColumn = oTable.getComputedFixedColumnCount();
		} else {
			iStartColumn = oTable.getComputedFixedColumnCount();
			iEndColumn = oTable.getColumns().length;
		}
		var iFixedRows = oTable.getFixedRowCount();
		var iFixedBottomRows = oTable.getFixedBottomRowCount();
		var aRows = oTable.getRows();

		if (iFixedRows > 0) {
			this.renderTableControlCnt(rm, oTable, bFixedTable, iStartColumn, iEndColumn, true, false, 0, iFixedRows);
		}
		this.renderTableControlCnt(rm, oTable, bFixedTable, iStartColumn, iEndColumn, false, false, iFixedRows, aRows.length - iFixedBottomRows);
		if (iFixedBottomRows > 0 && aRows.length > 0) {
			this.renderTableControlCnt(rm, oTable, bFixedTable, iStartColumn, iEndColumn, false, true, aRows.length - iFixedBottomRows, aRows.length);
		}
	};

	TableRenderer.renderTableControlCnt = function(rm, oTable, bFixedTable, iStartColumn, iEndColumn, bFixedRow, bFixedBottomRow, iStartRow, iEndRow, bHeader) {
		rm.write("<table");
		var suffix = bHeader ? "-header" : "-table";
		var sId = oTable.getId() + suffix;

		if (bFixedTable) {
			sId += "-fixed";
			rm.addClass("sapUiTableCtrlFixed");
		} else {
			rm.addClass("sapUiTableCtrlScroll");
		}
		if (bFixedRow) {
			sId += "-fixrow";
			rm.addClass("sapUiTableCtrlRowFixed");
		} else if (bFixedBottomRow) {
			sId += "-fixrow-bottom";
			rm.addClass("sapUiTableCtrlRowFixedBottom");
		} else {
			rm.addClass("sapUiTableCtrlRowScroll");
		}
		rm.writeAttribute("id", sId);

		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, bHeader ? "COLUMNHEADER_TABLE" : "TABLE");

		rm.addClass("sapUiTableCtrl");
		if (bHeader) {
			rm.addClass("sapUiTableCHT"); // marker for the column header table
		}
		rm.writeClasses();

		rm.addStyle(bFixedTable ? "width" : "min-width", oTable._getColumnsWidth(iStartColumn, iEndColumn) + "px");

		rm.writeStyles();
		rm.write(">");

		rm.write("<thead>");

		rm.write("<tr");
		rm.addClass("sapUiTableCtrlCol");
		if (iStartRow == 0) {
			rm.addClass("sapUiTableCtrlFirstCol");
		}
		if (bHeader) {
			rm.addClass("sapUiTableCHTHR"); // marker for the column header row
		}
		rm.writeClasses();
		rm.write(">");

		var aCols = oTable.getColumns();
		var aColParams = new Array(iEndColumn);
		var iCol;
		var oColumn;
		var bHasPercentageWidths = false;

		var bRenderDummyColumn = !bFixedTable && iEndColumn > iStartColumn;

		for (iCol = iStartColumn; iCol < iEndColumn; iCol++) {
			oColumn = aCols[iCol];
			var oColParam = {
				shouldRender: !!(oColumn && oColumn.shouldRender())
			};
			if (oColParam.shouldRender) {
				var sWidth = oColumn.getWidth();
				if (TableUtils.isVariableWidth(sWidth)) {
					// if some of the columns have variable width, they serve as the dummy column
					// and take available place. Do not render a dummy column in this case.
					bRenderDummyColumn = false;
					// in fixed area, use stored fixed width or 10rem:
					if (bFixedTable) {
						oColumn._iFixWidth = oColumn._iFixWidth || 160;
						sWidth = oColumn._iFixWidth + "px";
					} else if (sWidth && sWidth.indexOf("%") > 0) {
						bHasPercentageWidths = true;
					}
				} else if (bFixedTable) {
					delete oColumn._iFixWidth;
				}
				oColParam.width = sWidth;
			}
			aColParams[iCol] = oColParam;
		}


		if (TableUtils.hasRowHeader(oTable) && !bHeader) { // not needed for column headers
			rm.write("<th");
			if (bHasPercentageWidths) {
				// Edge and IE - 0px width is not respected if some other columns have width in %
				rm.addStyle("width", "0%");
			} else {
				rm.addStyle("width", "0px");
			}
			rm.writeStyles();
			if (iStartRow == 0) {
				oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "TH");
				if (!bHeader) {
					rm.writeAttribute("id", oTable.getId() + "-colsel");
				}
				rm.addClass("sapUiTableColSel");
				rm.writeClasses();
			}
			rm.write("></th>");
		} else {
			if (aCols.length === 0) {
				// no cols => render th => avoids rendering issue in firefox
				rm.write("<th></th>");
			}
		}

		for (iCol = iStartColumn; iCol < iEndColumn; iCol++) {

			suffix = bHeader ? "_hdr" : "_col";
			oColumn = aCols[iCol];
			oColParam = aColParams[iCol];

			if (oColParam.shouldRender) {
				rm.write("<th");
				if (oColParam.width) {
					rm.addStyle("width", oColParam.width);
					rm.writeStyles();
				}
				if (iStartRow == 0) {
					oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "TH", {column: oColumn});
					rm.writeAttribute("id", oTable.getId() + suffix + iCol);
				}
				rm.writeAttribute("data-sap-ui-headcolindex", iCol);
				rm.writeAttribute("data-sap-ui-colid", oColumn.getId());
				rm.write(">");
				if (iStartRow == 0 && TableUtils.getHeaderRowCount(oTable) == 0 && !bHeader) {
					if (oColumn.getMultiLabels().length > 0) {
						rm.renderControl(oColumn.getMultiLabels()[0]);
					} else {
						rm.renderControl(oColumn.getLabel());
					}
				}
				rm.write("</th>");
			}
		}

		// dummy column to fill the table width
		if (bRenderDummyColumn) {
			rm.write("<th");
			if (bHeader) {
				rm.writeAttribute("id", oTable.getId() + "-dummycolhdr");
			}
			oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "PRESENTATION");
			rm.write("></th>");
		}

		rm.write("</tr>");
		rm.write("</thead>");

		rm.write("<tbody>");

		var aVisibleColumns = oTable._getVisibleColumns();

		// render the table rows
		var aRows = oTable.getRows();
		var row;
		var count;
		if (bHeader) {
			for (row = iStartRow, count = iEndRow; row < count; row++) {
				this.renderColumnHeaderRow(rm, oTable, row, bFixedTable, iStartColumn, iEndColumn, bRenderDummyColumn);
			}
		} else {
			// retrieve tooltip and aria texts only once and pass them to the rows _updateSelection function
			var mTooltipTexts = oTable._getAccExtension().getAriaTextsForSelectionMode(true);

			// check whether the row can be clicked to change the selection
			var bSelectOnCellsAllowed = TableUtils.isRowSelectionAllowed(oTable);
			var bRowsDraggable = oTable.getDragDropConfig().some(function(oDragDropInfo) {
				return oDragDropInfo.getMetadata().isInstanceOf("sap.ui.core.dnd.IDragInfo") && oDragDropInfo.getSourceAggregation() === "rows";
			});

			for (row = iStartRow, count = iEndRow; row < count; row++) {
				this.renderTableRow(rm, oTable, aRows[row], row, bFixedTable, iStartColumn, iEndColumn, false, aVisibleColumns, bRenderDummyColumn, mTooltipTexts, bSelectOnCellsAllowed, bRowsDraggable);
			}
		}
		rm.write("</tbody>");
		rm.write("</table>");
	};

	TableRenderer.writeRowSelectorContent = function(rm, oTable, oRow, iRowIndex) {
		oTable._getAccRenderExtension().writeAccRowSelectorText(rm, oTable, oRow, iRowIndex);

		if (TableUtils.Grouping.isGroupMode(oTable)) {
			rm.write("<div");
			rm.writeAttribute("class", "sapUiTableGroupShield");
			rm.write("></div>");
			rm.write("<div");
			rm.writeAttribute("id", oRow.getId() + "-groupHeader");
			rm.writeAttribute("class", "sapUiTableGroupIcon");
			rm.write("></div>");

			if (TableUtils.Grouping.showGroupMenuButton(oTable)) {
				var oIconInfo = IconPool.getIconInfo("sap-icon://drop-down-list");
				rm.write("<div class='sapUiTableGroupMenuButton'>");
				rm.writeEscaped(oIconInfo.content);
				rm.write("</div>");
			}
		}
	};

	/**
	 * Writes the row highlight element (including the accessibility text element) to the render manager.
	 *
	 * @param {sap.ui.core.RenderManager} rm The render manager to write to
	 * @param {sap.ui.table.Table} oTable Instance of the table
	 * @param {sap.ui.table.Row} oRow Instance of the row
	 * @param {int} iRowIndex Index of the row
	 */
	TableRenderer.writeRowHighlightContent = function(rm, oTable, oRow, iRowIndex) {
		if (!TableUtils.hasRowHighlights(oTable)) {
			return;
		}

		var oRowSettings = oRow.getAggregation("_settings");
		var sHighlightClass = oRowSettings._getHighlightCSSClassName();

		rm.write("<div");
		rm.writeAttribute("id", oRow.getId() + "-highlight");
		rm.addClass("sapUiTableRowHighlight");
		rm.addClass(sHighlightClass);
		rm.writeClasses();
		rm.write(">");
			oTable._getAccRenderExtension().writeAccRowHighlightText(rm, oTable, oRow, iRowIndex);
		rm.write("</div>");
	};

	TableRenderer.renderColumnHeaderRow = function(rm, oTable, iRow, bFixedTable, iStartColumn, iEndColumn, bHasOnlyFixedColumns) {
		rm.write("<tr");
		rm.addClass("sapUiTableColHdrTr");
		rm.writeClasses();
		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "COLUMNHEADER_ROW");
		rm.write(">");

		//
		// Render header cells
		//
		var aColumns,
			nSpan = 0,
			iLastVisibleCol = -1;

		// get columns to render
		aColumns = oTable.getColumns().slice(iStartColumn, iEndColumn).filter(function(oColumn) {
			return oColumn && oColumn.shouldRender();
		});

		// collect header spans and find the last visible column header
		function collectHeaderSpans(oColumn, index, aCols) {
			var colSpan = TableUtils.Column.getHeaderSpan(oColumn, iRow),
				iColIndex;

			if (nSpan < 1) {
				if (colSpan > 1) {
					// In case when a user makes some of the underlying columns invisible, adjust colspan
					iColIndex = oColumn.getIndex();
					colSpan = aCols.slice(index + 1, index + colSpan).reduce(function(span, column){
						return column.getIndex() - iColIndex < colSpan ? span + 1 : span;
					}, 1);
				}

				oColumn._nSpan = nSpan = colSpan;
				iLastVisibleCol = index;
			} else {
				//Render column header but this is invisible because of the previous span
				oColumn._nSpan = 0;
			}
			nSpan--;
		}
		aColumns.forEach(collectHeaderSpans);

		function renderColumn(oColumn, iIndex) {
			this.renderCol(rm, oTable, oColumn, iRow, oColumn._nSpan,
				iIndex === 0,
				bFixedTable && (iIndex == iLastVisibleCol),
				!bFixedTable && (iIndex == iLastVisibleCol));
			oColumn._nSpan = undefined;
		}
		aColumns.forEach(renderColumn.bind(this));

		if (!bFixedTable && bHasOnlyFixedColumns && aColumns.length > 0) {
			rm.write('<td class="sapUiTableCellDummy"');
			oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "PRESENTATION");
			rm.write('></td>');
		}
		rm.write("</tr>");
	};

	TableRenderer.renderTableRow = function(rm, oTable, oRow, iRowIndex, bFixedTable, iStartColumn, iEndColumn, bFixedRow, aVisibleColumns, bHasOnlyFixedColumns, mTooltipTexts, bSelectOnCellsAllowed, bDraggable) {
		if (!oRow) {
			return;
		}
		rm.write("<tr");
		if (oRow._bDummyRow) {
			rm.addStyle("opacity", "0");
		}
		rm.addClass("sapUiTableTr");
		if (bFixedTable) {
			rm.writeAttribute("id", oRow.getId() + "-fixed");
			rm.writeAttribute("data-sap-ui-related", oRow.getId());
		} else {
			rm.writeElementData(oRow);
		}
		if (oRow._bHidden) {
			rm.addClass("sapUiTableRowHidden");
		} else {
			if (bDraggable && bFixedTable) {
				rm.writeAttribute("draggable", true);
			}
			if (oTable.isIndexSelected(oRow.getIndex())) {
				rm.addClass("sapUiTableRowSel");
			}
		}

		if (iRowIndex % 2 != 0 && oTable.getAlternateRowColors() && !TableUtils.Grouping.isTreeMode(oTable)) {
			rm.addClass("sapUiTableRowAlternate");
		}

		this.addRowCSSClasses(rm, oTable, iRowIndex);

		rm.writeClasses();
		rm.writeAttribute("data-sap-ui-rowindex", iRowIndex);
		if (oTable.getRowHeight() > 0) {
			rm.addStyle("height", oTable._getDefaultRowHeight() + "px");
		}
		rm.writeStyles();

		oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "TR", {index: iRowIndex});

		rm.write(">");

		var bSelected = !oRow._bHidden && oTable.isIndexSelected(oRow.getIndex()); //see TableRenderer.renderRowAddon

		var aCells = oRow.getCells();
		// render the row headers
		if (TableUtils.hasRowHeader(oTable) || aCells.length === 0) {
			rm.write("<td");
			oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "ROWHEADER_TD", {
				rowSelected: bSelected,
				index: iRowIndex
			});
			rm.write("></td>");
		}

		for (var cell = 0, count = aCells.length; cell < count; cell++) {
			this.renderTableCell(rm, oTable, oRow, aCells[cell], cell, bFixedTable, iStartColumn, iEndColumn, aVisibleColumns, bSelected);
		}
		if (!bFixedTable && bHasOnlyFixedColumns && aCells.length > 0) {
			rm.write('<td class="sapUiTableCellDummy"');
			oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "PRESENTATION");
			rm.write('></td>');
		}
		rm.write("</tr>");
	};

	TableRenderer.renderTableCell = function(rm, oTable, oRow, oCell, iCellIndex, bFixedTable, iStartColumn, iEndColumn, aVisibleColumns, bSelected) {
		var iColIndex = oCell.data("sap-ui-colindex");
		var aColumns = oTable.getColumns();
		var oColumn = aColumns[iColIndex];
		var oLastFixedColumn = aColumns[oTable.getFixedColumnCount() - 1];

		if (oColumn.shouldRender() && iStartColumn <= iColIndex && iEndColumn > iColIndex) {
			rm.write("<td");
			var sId = oRow.getId() + "-col" + iCellIndex;
			rm.writeAttribute("id", sId);
			rm.writeAttribute("tabindex", "-1");
			rm.writeAttribute("data-sap-ui-colid", oColumn.getId());

			var nColumns = aVisibleColumns.length;
			var bIsFirstColumn = nColumns > 0 && aVisibleColumns[0] === oColumn;
			var bIsLastColumn = nColumns > 0 && aVisibleColumns[nColumns - 1] === oColumn;
			var bIsLastFixedColumn = bFixedTable & oLastFixedColumn === oColumn;

			oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "DATACELL", {
				index: iColIndex,
				column: oColumn,
				row: oRow,
				fixed: bFixedTable,
				firstCol: bIsFirstColumn,
				rowSelected: bSelected
			});

			var sHAlign = Renderer.getTextAlign(oColumn.getHAlign(), oCell && oCell.getTextDirection && oCell.getTextDirection());
			if (sHAlign) {
				rm.addStyle("text-align", sHAlign);
			}
			rm.writeStyles();
			rm.addClass("sapUiTableCell");
			rm.addClass("sapUiTableContentCell");
			rm.addClass("sapUiTableDataCell");
			if (bIsFirstColumn) {
				rm.addClass("sapUiTableCellFirst");
			}
			if (bIsLastFixedColumn) {
				rm.addClass("sapUiTableCellLastFixed");
			}
			if (bIsLastColumn) {
				rm.addClass("sapUiTableCellLast");
			}

			var oBinding = oTable.getBinding("rows");
			if (oBinding && oColumn.getLeadingProperty && oBinding.isMeasure(oColumn.getLeadingProperty())) {
				// for AnalyticalTable
				rm.addClass("sapUiTableMeasureCell");
			}

			rm.writeClasses();
			rm.write("><div");
			rm.addClass("sapUiTableCellInner");
			if (bIsFirstColumn && TableUtils.Grouping.isTreeMode(oTable)) {
				rm.addClass("sapUiTableCellFlex"); // without flex, icon pushes contents too wide
			}

			rm.writeClasses();

			if (oTable.getRowHeight() > 0
				&& (oTable.getVisibleRowCountMode() == VisibleRowCountMode.Auto
					|| oTable.hasStyleClass("sapUiTableFixedRowHeights"))) {

				rm.addStyle("max-height", oTable.getRowHeight() + "px");
			}
			rm.writeStyles();

			rm.write(">");
			this.renderTableCellControl(rm, oTable, oCell, bIsFirstColumn);
			rm.write("</div></td>");
		}
	};

	TableRenderer.renderTableCellControl = function(rm, oTable, oCell, bIsFirstColumn) {
		if (bIsFirstColumn && TableUtils.Grouping.isTreeMode(oTable) && !oTable._bFlatMode) {
			var oRow = oCell.getParent();
			rm.write("<span class='sapUiTableTreeIcon' tabindex='-1' id='" + oRow.getId() + "-treeicon'");
			oTable._getAccRenderExtension().writeAriaAttributesFor(rm, oTable, "TREEICON", {row: oRow});
			rm.write("></span>");
		}
		rm.renderControl(oCell);
	};

	TableRenderer.renderVSb = function(rm, oTable, mConfig) {
		mConfig = Object.assign({
			cssClass: "sapUiTableVSb",
			tabIndex: true,
			hidden: true
		}, mConfig);
		mConfig.id = oTable.getId() + "-vsb";

		var oScrollExtension = oTable._getScrollExtension();

		rm.write("<div");
		rm.addClass(mConfig.cssClass);
		if (mConfig.hidden) {
			rm.addClass("sapUiTableHidden");
		}
		rm.writeClasses();
		rm.writeAttribute("id", mConfig.id);
		if (mConfig.tabIndex) {
			rm.writeAttribute("tabindex", "-1"); // Avoid focusing of the scrollbar in Firefox with tab.
		}
		rm.addStyle("max-height", oScrollExtension.getVerticalScrollbarHeight() + "px");

		if (oTable.getFixedRowCount() > 0) {
			oTable._iVsbTop = (oTable.getFixedRowCount() * oTable._getDefaultRowHeight()) - 1;
			rm.addStyle("top", oTable._iVsbTop  + 'px');
		}

		rm.writeStyles();
		rm.write(">");

		rm.write("<div");
		rm.writeAttribute("id", mConfig.id + "-content");
		rm.addClass("sapUiTableVSbContent");
		rm.writeClasses();
		rm.addStyle("height", oScrollExtension.getVerticalScrollHeight() + "px");
		rm.writeStyles();
		rm.write(">");
		rm.write("</div>");
		rm.write("</div>");
	};

	TableRenderer.renderVSbExternal = function(rm, oTable) {
		if (TableExtension.isEnrichedWith(oTable, "sap.ui.table.TableSyncExtension")) {
			this.renderVSb(rm, oTable, {
				cssClass: "sapUiTableVSbExternal",
				tabIndex: false
			});
		} else {
			Log.error("This method can only be used with synchronization enabled.", oTable, "TableRenderer.renderVSbExternal");
		}
	};

	TableRenderer.renderVSbBackground = function(rm, oTable) {
		rm.write("<div");
		rm.addClass("sapUiTableVSbBg");
		rm.writeAttribute("id", oTable.getId() + "-vsb-bg");
		rm.writeClasses();
		rm.write("></div>");
	};

	TableRenderer.renderHSb = function(rm, oTable, mConfig) {
		mConfig = Object.assign({
			id: oTable.getId() + "-hsb",
			cssClass: "sapUiTableHSb",
			tabIndex: true,
			hidden: true,
			scrollWidth: 0
		}, mConfig);

		rm.write("<div");
		rm.addClass(mConfig.cssClass);
		if (mConfig.hidden) {
			rm.addClass("sapUiTableHidden");
		}
		rm.writeClasses();
		rm.writeAttribute("id", mConfig.id);
		if (mConfig.tabIndex) {
			rm.writeAttribute("tabindex", "-1"); // Avoid focusing of the scrollbar in Firefox with tab.
		}
		rm.write(">");
		rm.write("<div");
		rm.writeAttribute("id", mConfig.id + "-content");
		rm.addClass("sapUiTableHSbContent");
		rm.writeClasses();
		if (mConfig.scrollWidth > 0) {
			rm.addStyle("width", mConfig.scrollWidth + "px");
		}
		rm.writeStyles();
		rm.write(">");
		rm.write("</div>");
		rm.write("</div>");
	};

	TableRenderer.renderHSbExternal = function(rm, oTable, sId, iScrollWidth) {
		if (TableExtension.isEnrichedWith(oTable, "sap.ui.table.TableSyncExtension")) {
			this.renderHSb(rm, oTable, {
				id: sId,
				cssClass: "sapUiTableHSbExternal",
				tabIndex: false,
				hidden: false,
				scrollWidth: iScrollWidth
			});
		} else {
			Log.error("This method can only be used with synchronization enabled.", oTable, "TableRenderer.renderVSbExternal");
		}
	};


	TableRenderer.renderHSbBackground = function(rm, oTable) {
		rm.write("<div");
		rm.addClass("sapUiTableHSbBg");
		rm.writeAttribute("id", oTable.getId() + "-hsb-bg");
		rm.writeClasses();
		rm.write("></div>");
	};


	// =============================================================================
	// HELPER FUNCTIONALITY
	// =============================================================================

	/**
	 * Renders an empty area with tabindex=0 and the given class and id.
	 * @private
	 */
	TableRenderer.renderTabElement = function(rm, sClass) {
		rm.write("<div");
		if (sClass) {
			rm.addClass(sClass);
			rm.writeClasses();
		}
		rm.writeAttribute("tabindex", "0");
		rm.write("></div>");
	};

	return TableRenderer;

}, /* bExport= */ true);
