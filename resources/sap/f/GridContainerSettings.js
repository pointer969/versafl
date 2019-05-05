/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/base/ManagedObject","sap/ui/layout/library"],function(M){"use strict";var G=M.extend("sap.f.GridContainerSettings",{metadata:{library:"sap.f",properties:{columns:{type:"Number"},columnSize:{type:"sap.ui.core.CSSSize",defaultValue:"80px"},rowSize:{type:"sap.ui.core.CSSSize",defaultValue:"80px"},gap:{type:"sap.ui.core.CSSSize",defaultValue:"16px"}}}});return G;});
