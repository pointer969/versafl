/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/thirdparty/jquery","sap/ui/core/Control","sap/ui/core/IconPool","sap/ui/core/CustomData","sap/ui/Device","sap/m/Breadcrumbs","./ObjectPageHeaderActionButton","sap/ui/core/ResizeHandler","sap/m/Button","sap/m/ActionSheet","./ObjectImageHelper","./ObjectPageHeaderContent","./library","sap/m/library","./ObjectPageHeaderRenderer"],function(q,C,I,a,D,B,O,R,b,A,c,d,l,m,e){"use strict";var f=l.Importance;var g=m.ButtonType;var P=m.PlacementType;var h=l.ObjectPageHeaderDesign;var j=l.ObjectPageHeaderPictureShape;function k(i){return typeof i==="function";}var n=C.extend("sap.uxap.ObjectPageHeader",{metadata:{library:"sap.uxap",interfaces:["sap.uxap.IHeaderTitle"],properties:{objectImageURI:{type:"string",defaultValue:null},objectImageAlt:{type:"string",defaultValue:''},objectImageDensityAware:{type:"boolean",defaultValue:false},objectTitle:{type:"string",defaultValue:null},objectSubtitle:{type:"string",defaultValue:null},objectImageShape:{type:"sap.uxap.ObjectPageHeaderPictureShape",defaultValue:j.Square},isObjectIconAlwaysVisible:{type:"boolean",defaultValue:false},isObjectTitleAlwaysVisible:{type:"boolean",defaultValue:true},isObjectSubtitleAlwaysVisible:{type:"boolean",defaultValue:true},isActionAreaAlwaysVisible:{type:"boolean",defaultValue:true},headerDesign:{type:"sap.uxap.ObjectPageHeaderDesign",defaultValue:h.Light},showTitleSelector:{type:"boolean",group:"Misc",defaultValue:false},markFavorite:{type:"boolean",group:"Misc",defaultValue:false},markFlagged:{type:"boolean",group:"Misc",defaultValue:false},showMarkers:{type:"boolean",group:"Misc",defaultValue:false},markLocked:{type:"boolean",group:"Misc",defaultValue:false},showPlaceholder:{type:"boolean",group:"Misc",defaultValue:false},markChanges:{type:"boolean",group:"Misc",defaultValue:false}},defaultAggregation:"actions",aggregations:{_breadCrumbs:{type:"sap.m.Breadcrumbs",multiple:false,visibility:"hidden"},breadcrumbs:{type:"sap.m.Breadcrumbs",multiple:false,singularName:"breadcrumb"},breadCrumbsLinks:{type:"sap.m.Link",multiple:true,singularName:"breadCrumbLink"},_overflowButton:{type:"sap.m.Button",multiple:false,visibility:"hidden"},_expandButton:{type:"sap.m.Button",multiple:false,visibility:"hidden"},_objectImage:{type:"sap.ui.core.Control",multiple:false,visibility:"hidden"},_placeholder:{type:"sap.ui.core.Icon",multiple:false,visibility:"hidden"},_lockIconCont:{type:"sap.m.Button",multiple:false,visibility:"hidden"},_lockIcon:{type:"sap.m.Button",multiple:false,visibility:"hidden"},_titleArrowIconCont:{type:"sap.m.Button",multiple:false,visibility:"hidden"},_titleArrowIcon:{type:"sap.m.Button",multiple:false,visibility:"hidden"},_favIcon:{type:"sap.ui.core.Icon",multiple:false,visibility:"hidden"},_flagIcon:{type:"sap.ui.core.Icon",multiple:false,visibility:"hidden"},_overflowActionSheet:{type:"sap.m.ActionSheet",multiple:false,visibility:"hidden"},_changesIconCont:{type:"sap.m.Button",multiple:false,visibility:"hidden"},_changesIcon:{type:"sap.m.Button",multiple:false,visibility:"hidden"},_sideContentBtn:{type:"sap.m.Button",multiple:false,visibility:"hidden"},navigationBar:{type:"sap.m.Bar",multiple:false},actions:{type:"sap.ui.core.Control",multiple:true,singularName:"action"},sideContentButton:{type:"sap.m.Button",multiple:false},titleSelectorTooltip:{type:"sap.ui.core.TooltipBase",altTypes:["string"],multiple:false}},events:{titleSelectorPress:{parameters:{domRef:{type:"string"}}},markLockedPress:{parameters:{domRef:{type:"string"}}},markChangesPress:{parameters:{domRef:{type:"string"}}}},designtime:"sap/uxap/designtime/ObjectPageHeader.designtime"}});n.prototype._iAvailablePercentageForActions=0.3;n.prototype.init=function(){this._bFirstRendering=true;if(!this.oLibraryResourceBundle){this.oLibraryResourceBundle=sap.ui.getCore().getLibraryResourceBundle("sap.m");}if(!this.oLibraryResourceBundleOP){this.oLibraryResourceBundleOP=sap.ui.getCore().getLibraryResourceBundle("sap.uxap");}this._oOverflowActionSheet=this._lazyLoadInternalAggregation("_overflowActionSheet",true);this._oOverflowButton=this._lazyLoadInternalAggregation("_overflowButton",true).attachPress(this._handleOverflowButtonPress,this);this._oExpandButton=this._lazyLoadInternalAggregation("_expandButton",true);this._oActionSheetButtonMap={};this._oFlagIcon=this._lazyLoadInternalAggregation("_flagIcon",true);this._oFavIcon=this._lazyLoadInternalAggregation("_favIcon",true);this._oTitleArrowIcon=this._lazyLoadInternalAggregation("_titleArrowIcon",true).attachPress(this._handleArrowPress,this);this._oTitleArrowIconCont=this._lazyLoadInternalAggregation("_titleArrowIconCont",true).attachPress(this._handleArrowPress,this);this._oLockIcon=this._lazyLoadInternalAggregation("_lockIcon",true).attachPress(this._handleLockPress,this);this._oLockIconCont=this._lazyLoadInternalAggregation("_lockIconCont",true).attachPress(this._handleLockPress,this);this._oChangesIcon=this._lazyLoadInternalAggregation("_changesIcon",true).attachPress(this._handleChangesPress,this);this._oChangesIconCont=this._lazyLoadInternalAggregation("_changesIconCont",true).attachPress(this._handleChangesPress,this);};n.getMetadata().forwardAggregation("breadCrumbsLinks",{getter:function(){return this._lazyLoadInternalAggregation("_breadCrumbs");},aggregation:"links"});n.prototype._handleOverflowButtonPress=function(E){this._oOverflowActionSheet.openBy(this._oOverflowButton);};n.prototype._handleArrowPress=function(E){this.fireTitleSelectorPress({domRef:E.getSource().getDomRef()});};n.prototype._handleLockPress=function(E){this.fireMarkLockedPress({domRef:E.getSource().getDomRef()});};n.prototype._handleChangesPress=function(E){this.fireMarkChangesPress({domRef:E.getSource().getDomRef()});};n._internalAggregationFactory={"_objectImage":c.createObjectImage,"_placeholder":c.createPlaceholder,"_overflowActionSheet":function(){return new A({placement:P.Bottom});},"_lockIconCont":function(i){return this._getButton(i,"sap-icon://private","lock-cont",i.oLibraryResourceBundleOP.getText("TOOLTIP_OP_LOCK_MARK_VALUE"));},"_breadCrumbs":function(i){return new B({links:i.getAggregation("breadCrumbLinks")});},"_lockIcon":function(i){return this._getButton(i,"sap-icon://private","lock",i.oLibraryResourceBundleOP.getText("TOOLTIP_OP_LOCK_MARK_VALUE"));},"_titleArrowIconCont":function(i){return this._getButton(i,"sap-icon://slim-arrow-down","titleArrow-cont",i.oLibraryResourceBundleOP.getText("OP_SELECT_ARROW_TOOLTIP"));},"_titleArrowIcon":function(i){return this._getButton(i,"sap-icon://slim-arrow-down","titleArrow",i.oLibraryResourceBundleOP.getText("OP_SELECT_ARROW_TOOLTIP"));},"_favIcon":function(i){return this._getIcon(i,"favorite",i.oLibraryResourceBundleOP.getText("TOOLTIP_OP_FAVORITE_MARK_VALUE"));},"_flagIcon":function(i){return this._getIcon(i,"flag",i.oLibraryResourceBundleOP.getText("TOOLTIP_OP_FLAG_MARK_VALUE"));},"_overflowButton":function(i){return this._getButton(i,"sap-icon://overflow","overflow",i.oLibraryResourceBundleOP.getText("TOOLTIP_OP_OVERFLOW_BTN"));},"_expandButton":function(i){return this._getButton(i,"sap-icon://slim-arrow-down","expand",i.oLibraryResourceBundleOP.getText("TOOLTIP_OP_EXPAND_HEADER_BTN"));},"_changesIconCont":function(i){return this._getButton(i,"sap-icon://user-edit","changes-cont",i.oLibraryResourceBundleOP.getText("TOOLTIP_OP_CHANGES_MARK_VALUE"));},"_changesIcon":function(i){return this._getButton(i,"sap-icon://user-edit","changes",i.oLibraryResourceBundleOP.getText("TOOLTIP_OP_CHANGES_MARK_VALUE"));},_getIcon:function(i,u,T){return I.createControlByURI({id:this._getParentAugmentedId(i,u),tooltip:T,src:I.getIconURI(u),visible:false});},_getButton:function(i,u,v,T){return new b({id:this._getParentAugmentedId(i,v),tooltip:T,icon:u,type:g.Transparent});},_getParentAugmentedId:function(i,u){return i.getId()+"-"+u;}};n.prototype._lazyLoadInternalAggregation=function(i,S){if(!this.getAggregation(i)){this.setAggregation(i,n._internalAggregationFactory[i](this),S);}return this.getAggregation(i);};n.prototype._applyActionProperty=function(i,u){var v=u[0];if(this.getProperty(i)!==v){u.unshift(i);this.setProperty.apply(this,u);if(!this._bFirstRendering){this._notifyParentOfChanges();}}return this;};n.prototype._applyObjectImageProperty=function(i,u){var v=u[0];if(this.getProperty(i)!==v){u.unshift(i);this.setProperty.apply(this,u);this._destroyObjectImage();if(!this._bFirstRendering){this._notifyParentOfChanges(true);}}return this;};n.prototype._setAggregationTooltip=function(i,T){var u=this.getAggregation(i);if(u){u.setTooltip(T);}return this;};n.prototype._setTitleSelectorTooltip=function(T){if(T===null||T===undefined){T=this.oLibraryResourceBundleOP.getText("OP_SELECT_ARROW_TOOLTIP");}this._setAggregationTooltip("_titleArrowIcon",T);this._setAggregationTooltip("_titleArrowIconCont",T);return this;};n.prototype.setHeaderDesign=function(H){this.setProperty("headerDesign",H);if(this.getParent()){this.getParent().invalidate();}return this;};n.prototype.setObjectTitle=function(N){var i=this.getParent(),u=this.getProperty("objectTitle"),v=u!==N;this._applyActionProperty("objectTitle",Array.prototype.slice.call(arguments));i&&k(i._updateAriaLabels)&&i._updateAriaLabels();if(v&&this.mEventRegistry["_titleChange"]){this.fireEvent("_titleChange",{"id":this.getId(),"name":"objectTitle","oldValue":u,"newValue":N});}return this;};var p=["objectSubtitle","showTitleSelector","markLocked","markFavorite","markFlagged","showMarkers","showPlaceholder","markChanges"],o=["objectImageURI","objectImageAlt","objectImageDensityAware","objectImageShape"];var G=function(i){var u="set"+i.charAt(0).toUpperCase()+i.slice(1);n.prototype[u]=function(){var v=Array.prototype.slice.call(arguments);this._applyActionProperty.call(this,i,v);return this;};};var r=function(i){var u="set"+i.charAt(0).toUpperCase()+i.slice(1);n.prototype[u]=function(){var v=Array.prototype.slice.call(arguments);this._applyObjectImageProperty.call(this,i,v);return this;};};var s=function(i,S,T){var u="set"+i.charAt(0).toUpperCase()+i.slice(1);S[u]=function(){var v=Array.prototype.slice.call(arguments);v.unshift(i);T.setProperty.apply(T,v);return this.setProperty.apply(this,v);};};p.forEach(G);o.forEach(r);n.prototype._destroyObjectImage=function(){var i="_objectImage",u=this.getAggregation(i);if(u){u.destroy();this.setAggregation(i,null);}};n.prototype.onBeforeRendering=function(){var S=this.getSideContentButton();if(S&&!S.getTooltip()){S.setTooltip(this.oLibraryResourceBundleOP.getText("TOOLTIP_OP_SHOW_SIDE_CONTENT"));}var i=this.getActions()||[];this._oOverflowActionSheet.removeAllButtons();this._resetActionSheetMap();if(i.length>1||this._hasOneButtonShowText(i)){i.forEach(function(u){if(u instanceof b&&!(u instanceof O)){u._bInternalVisible=u.getVisible();u._getInternalVisible=function(){return this._bInternalVisible;};u._setInternalVisible=function(V,w){this.$().toggle(V);if(V!=this._bInternalVisible){this._bInternalVisible=V;if(w){this.invalidate();}}};u.setVisible=function(V){u._setInternalVisible(V,true);b.prototype.setVisible.call(this,V);};u.onAfterRendering=function(){if(!this._getInternalVisible()){this.$().hide();}};}if(u instanceof b&&(u.getType()==="Default"||u.getType()==="Unstyled")){u.setProperty("type",g.Transparent,false);}if(u instanceof b&&u.getVisible()){var v=this._createActionSheetButton(u);this._oActionSheetButtonMap[u.getId()]=v;this._oOverflowActionSheet.addButton(v);s("text",u,v);s("icon",u,v);s("enabled",u,v);}},this);}this._oTitleArrowIcon.setVisible(this.getShowTitleSelector());this._oFavIcon.setVisible(this.getMarkFavorite());this._oFlagIcon.setVisible(this.getMarkFlagged());this._attachDetachActionButtonsHandler(false);if(this._iResizeId){R.deregister(this._iResizeId);this._iResizeId=null;}this._bFirstRendering=false;};n.prototype._resetActionSheetMap=function(){Object.keys(this._oActionSheetButtonMap).forEach(function(i){this._oActionSheetButtonMap[i].destroy();}.bind(this));this._oActionSheetButtonMap={};};n.prototype._createActionSheetButton=function(i){return new b({press:q.proxy(this._onSeeMoreContentSelect,this),enabled:i.getEnabled(),text:i.getText(),icon:i.getIcon(),tooltip:i.getTooltip(),customData:new a({key:"originalId",value:i.getId()})});};n.prototype._handleImageNotFoundError=function(){var i=this._lazyLoadInternalAggregation("_objectImage"),u=this.getParent(),$=u?u.$():this.$();if(this.getShowPlaceholder()){$.find(".sapMImg.sapUxAPObjectPageHeaderObjectImage").hide();$.find(".sapUxAPObjectPageHeaderPlaceholder").removeClass("sapUxAPHidePlaceholder");}else{i.addStyleClass("sapMNoImg");}};n.prototype._clearImageNotFoundHandler=function(){this._lazyLoadInternalAggregation("_objectImage").$().off("error");};n.prototype.onAfterRendering=function(){var $=this._lazyLoadInternalAggregation("_objectImage").$();this._adaptLayout();this._clearImageNotFoundHandler();$.error(this._handleImageNotFoundError.bind(this));if(!this.getObjectImageURI()){this._handleImageNotFoundError();}if(!this._iResizeId){this._iResizeId=R.register(this,this._onHeaderResize.bind(this));}this._attachDetachActionButtonsHandler(true);};n.prototype._onHeaderResize=function(E){this._adaptLayout();if(this.getParent()&&typeof this.getParent()._onUpdateHeaderTitleSize==="function"){this.getParent()._onUpdateHeaderTitleSize(E);}};n.prototype._attachDetachActionButtonsHandler=function(i){var u=this.getActions()||[];if(u.length<1){return;}u.forEach(function(v){if(v instanceof b){var w=this._oActionSheetButtonMap[v.getId()];if(i){v.attachEvent("_change",this._adaptLayout,this);if(w){w.attachEvent("_change",this._adaptOverflow,this);}}else{v.detachEvent("_change",this._adaptLayout,this);if(w){w.detachEvent("_change",this._adaptOverflow,this);}}}},this);};n.prototype._onSeeMoreContentSelect=function(E){var i=E.getSource(),u=sap.ui.getCore().byId(i.data("originalId"));if(u.firePress){u.firePress({overflowButtonId:this._oOverflowButton.getId(),bInOverflow:true});}this._oOverflowActionSheet.close();};n._actionImportanceMap={"Low":3,"Medium":2,"High":1};n._sortActionsByImportance=function(i,u){var v=(i instanceof O)?i.getImportance():f.High,w=(u instanceof O)?u.getImportance():f.High,x=n._actionImportanceMap[v]-n._actionImportanceMap[w];if(x===0){return i.position-u.position;}return x;};n.prototype._hasOneButtonShowText=function(i){var u=false;if(i.length!==1){return u;}if(i[0]instanceof O){u=(!i[0].getHideText()&&i[0].getText()!="");}else if(i[0]instanceof b){u=(i[0].getText()!="");}return u;};n.prototype._adaptLayout=function(E){this._adaptLayoutForDomElement(null,E);};n.prototype._adaptLayoutForDomElement=function($,E){var i;if($){i=$.length?$[0]:$;}else{i=this.getDomRef();}if(t(i)){return;}var u=this._findById($,"identifierLine"),v=u.width(),w=this._getActionsWidth(),x=w/v,y=this._iAvailablePercentageForActions*v,z=this._oOverflowButton.$(),F=this._findById($,"actions"),H=F.find(".sapMBtn").not(".sapUxAPObjectPageHeaderExpandButton");if(x>this._iAvailablePercentageForActions){this._adaptActions(y);}else if(E&&E.getSource()instanceof O){E.getSource()._setInternalVisible(true);}if(D.system.phone){this.getActions().forEach(function(J){if(J instanceof b){J.$().css("visibility","visible");}});}if(H.filter(":visible").length===H.length){z.hide();}this._adaptObjectPageHeaderIndentifierLine($);};n.prototype._adaptLayoutDelayed=function(){if(this._adaptLayoutTimeout){clearTimeout(this._adaptLayoutTimeout);}this._adaptLayoutTimeout=setTimeout(function(){this._adaptLayoutTimeout=null;this._adaptLayout();}.bind(this),0);};n.prototype._adaptObjectPageHeaderIndentifierLine=function($){var i=this._findById($,"identifierLine"),u=i.width(),v=this._findById($,"subtitle"),w=this._findById($,"innerTitle"),x=this._findById($,"identifierLineContainer"),S,T,y=null,z=this._findById($,"actions"),E=$?$.find(".sapUxAPObjectPageHeaderObjectImageContainer"):this.$().find(".sapUxAPObjectPageHeaderObjectImageContainer"),F=z.width()+E.width(),H=this.$().parents().hasClass('sapUiSizeCompact')?7:3;if(v.length){if(v.hasClass("sapOPHSubtitleBlock")){y=i.get(0).style.height;i.css("height",i.height());v.removeClass("sapOPHSubtitleBlock");}S=v.outerHeight()+v.position().top;T=w.outerHeight()+w.position().top;if(Math.abs(S-T)>H){v.addClass("sapOPHSubtitleBlock");}if(y!==null){i.get(0).style.height=y;}}x.width((0.95-(F/u))*100+"%");};n.prototype._adaptActions=function(u){var M=l.Utilities.isPhoneScenario(this._getCurrentMediaContainerRange())||D.system.phone,$=this._oOverflowButton.$(),v=$.show().width(),w=this.getActions(),x=w.length,y;for(var i=0;i<x;i++){w[i].position=i;}w.sort(n._sortActionsByImportance);w.forEach(function(z){y=this._oActionSheetButtonMap[z.getId()];if(y){v+=z.$().width();if(u>v&&!M){this._setActionButtonVisibility(z,true);$.hide();}else{this._setActionButtonVisibility(z,false);$.show();}}},this);};n.prototype._adaptOverflow=function(){var i=this._oOverflowActionSheet.getButtons();var H=i.some(function(u){return u.getVisible();});this._oOverflowButton.$().toggle(H);};n.prototype._setActionButtonVisibility=function(i,v){var u=this._oActionSheetButtonMap[i.getId()];if(u){if(i.getVisible()){i._setInternalVisible(v);u.setVisible(!v);}else{u.setVisible(false);}}};n.prototype._getActionsWidth=function(){var w=0;this.getActions().forEach(function(i){if(i instanceof b){i.$().show();if(D.system.phone){i.$().css("visibility","hidden");}w+=i.$().outerWidth(true);}});return w;};n.prototype._findById=function($,i){var E;if(!i){return null;}if($){i=this.getId()+'-'+i;E="#"+i.replace(/(:|\.)/g,'\\$1');return $.find(E);}return this.$(i);};n.prototype._getBreadcrumbsAggregation=function(){var i=this.getBreadcrumbs(),u=this._lazyLoadInternalAggregation('_breadCrumbs',true);return i||((u&&u.getLinks().length)?u:null);};n.prototype._notifyParentOfChanges=function(i){var u=this.getParent();if(u&&typeof u._headerTitleChangeHandler==="function"){u._headerTitleChangeHandler(i);}};n.prototype.setTitleSelectorTooltip=function(T){this._setTitleSelectorTooltip(T);this.setAggregation("titleSelectorTooltip",T,true);return this;};n.prototype.destroyTitleSelectorTooltip=function(){this._setTitleSelectorTooltip(null);this.destroyAggregation("titleSelectorTooltip",true);return this;};n.prototype.exit=function(){this._clearImageNotFoundHandler();if(this._iResizeId){R.deregister(this._iResizeId);this._iResizeId=null;}this._resetActionSheetMap();};n.prototype.setNavigationBar=function(i){this.setAggregation("navigationBar",i);if(i&&this.mEventRegistry["_adaptableContentChange"]){this.fireEvent("_adaptableContentChange",{"parent":this,"adaptableContent":i});}return this;};n.prototype._getAdaptableContent=function(){return this.getNavigationBar();};n.prototype.isDynamic=function(){return false;};n.prototype.getCompatibleHeaderContentClass=function(){return d;};n.prototype.supportsToggleHeaderOnTitleClick=function(){return false;};n.prototype.supportsTitleInHeaderContent=function(){return true;};n.prototype.supportsAdaptLayoutForDomElement=function(){return true;};n.prototype.supportsBackgroundDesign=function(){return false;};n.prototype.getTitleText=function(){return this.getObjectTitle();};n.prototype.snap=function(){this._adaptLayout();};n.prototype.unSnap=function(){this._adaptLayout();};n.prototype._toggleExpandButton=function(T){};n.prototype._setShowExpandButton=function(v){};n.prototype._focusExpandButton=function(){};n.prototype._toggleFocusableState=function(F){};function t($){return $&&!$.offsetWidth&&!$.offsetHeight;}return n;});
