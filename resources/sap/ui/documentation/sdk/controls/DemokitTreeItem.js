/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/m/TreeItemBase","./DemokitTreeItemRenderer"],function(T){"use strict";return T.extend("sap.ui.documentation.sdk.controls.DemokitTreeItem",{metadata:{properties:{title:{type:"string",defaultValue:""},deprecated:{type:"boolean",defaultValue:false},target:{type:"string",defaultValue:""},encodeTarget:{type:"boolean",defaultValue:false},section:{type:"string",defaultValue:"#"},entityType:{type:"string",defaultValue:""}}},getHref:function(){return'#/'+this.getSection()+'/'+(this.getEncodeTarget()?encodeURIComponent(this.getTarget()):this.getTarget());},_getPadding:T.prototype.getLevel});});
