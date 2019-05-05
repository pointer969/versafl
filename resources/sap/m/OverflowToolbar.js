/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["./library","sap/m/ToggleButton","sap/ui/core/InvisibleText","sap/m/Toolbar","sap/m/ToolbarSpacer","sap/m/OverflowToolbarLayoutData","sap/m/OverflowToolbarAssociativePopover","sap/m/OverflowToolbarAssociativePopoverControls",'sap/ui/core/ResizeHandler',"sap/ui/core/IconPool","sap/ui/Device","./OverflowToolbarRenderer","sap/base/Log","sap/ui/dom/jquery/Focusable"],function(l,T,I,a,b,O,c,d,R,e,D,f,L){"use strict";var P=l.PlacementType;var B=l.ButtonType;var g=l.OverflowToolbarPriority;var h=a.extend("sap.m.OverflowToolbar",{metadata:{aggregations:{_overflowButton:{type:"sap.m.ToggleButton",multiple:false,visibility:"hidden"},_popover:{type:"sap.m.Popover",multiple:false,visibility:"hidden"}},designtime:"sap/m/designtime/OverflowToolbar.designtime"}});h.prototype._callToolbarMethod=function(F,A){return a.prototype[F].apply(this,A);};h.prototype.init=function(){this._callToolbarMethod("init",arguments);this._iPreviousToolbarWidth=null;this._bOverflowButtonNeeded=false;this._bNestedInAPopover=null;this._bListenForControlPropertyChanges=false;this._bListenForInvalidationEvents=false;this._bControlsInfoCached=false;this._bSkipOptimization=false;this._aControlSizes={};this._aMovableControls=[];this._aToolbarOnlyControls=[];this._aPopoverOnlyControls=[];this._aAllCollections=[this._aMovableControls,this._aToolbarOnlyControls,this._aPopoverOnlyControls];};h.prototype.exit=function(){var p=this.getAggregation("_popover");if(p){p.destroy();}};h.prototype.onAfterRendering=function(){this._getOverflowButton().$().attr("aria-haspopup","true");this._doLayout();this._applyFocus();};h.prototype.onsapfocusleave=function(){this._resetChildControlFocusInfo();};h.prototype._doLayout=function(){var C=sap.ui.getCore(),w;if(!C.isThemeApplied()){L.debug("OverflowToolbar: theme not applied yet, skipping calculations",this);return;}w=this.$().width();this._bListenForControlPropertyChanges=false;this._bListenForInvalidationEvents=false;this._deregisterToolbarResize();if(w>0){if(!this._isControlsInfoCached()){this._cacheControlsInfo();}if(this._iPreviousToolbarWidth!==w){this._iPreviousToolbarWidth=w;this._setControlsOverflowAndShrinking(w);this.fireEvent("_controlWidthChanged");}}this._registerToolbarResize();this._bListenForControlPropertyChanges=true;this._bListenForInvalidationEvents=true;};h.prototype._applyFocus=function(){var F,$,i=this.$().lastFocusableDomRef();if(this.sFocusedChildControlId){F=sap.ui.getCore().byId(this.sFocusedChildControlId);$=F&&F.$();}if($&&$.length){$.focus();}else if(this._bControlWasFocused){this._getOverflowButton().focus();this._bControlWasFocused=false;this._bOverflowButtonWasFocused=true;}else if(this._bOverflowButtonWasFocused&&!this._getOverflowButtonNeeded()){i&&i.focus();this._bOverflowButtonWasFocused=false;}};h.prototype._preserveChildControlFocusInfo=function(){var A=sap.ui.getCore().getCurrentFocusedControlId();if(this._getControlsIds().indexOf(A)!==-1){this._bControlWasFocused=true;this.sFocusedChildControlId=A;}else if(A===this._getOverflowButton().getId()){this._bOverflowButtonWasFocused=true;this.sFocusedChildControlId="";}};h.prototype._resetChildControlFocusInfo=function(){this._bControlWasFocused=false;this._bOverflowButtonWasFocused=false;this.sFocusedChildControlId="";};h.prototype._registerToolbarResize=function(){if(a.isRelativeWidth(this.getWidth())){var r=this._handleResize.bind(this);this._sResizeListenerId=R.register(this,r);}};h.prototype._deregisterToolbarResize=function(){if(this._sResizeListenerId){R.deregister(this._sResizeListenerId);this._sResizeListenerId="";}};h.prototype._handleResize=function(){this._doLayout();};h.prototype._cacheControlsInfo=function(){var v,H;this._iOldContentSize=this._iContentSize;this._iContentSize=0;this.getContent().forEach(this._updateControlsCachedSizes,this);if(D.system.phone){this._iContentSize-=1;}if(this._aPopoverOnlyControls.length){v=this._aPopoverOnlyControls.filter(function(C){return C.getVisible();});H=(v.length>0);if(H){this._iContentSize+=this._getOverflowButtonSize();}}this._bControlsInfoCached=true;if(this._iOldContentSize!==this._iContentSize){this.fireEvent("_contentSizeChange",{contentSize:this._iContentSize});}};h.prototype._updateControlsCachedSizes=function(C){var p,i;p=h._getControlPriority(C);i=this._calculateControlSize(C);this._aControlSizes[C.getId()]=i;if(p!==g.AlwaysOverflow){this._iContentSize+=i;}};h.prototype._calculateControlSize=function(C){return h._getOptimalControlWidth(C,this._aControlSizes[C.getId()]);};h.prototype._isControlsInfoCached=function(){return this._bControlsInfoCached;};h.prototype._flushButtonsToPopover=function(){this._aButtonsToMoveToPopover.forEach(this._moveButtonToPopover,this);};h.prototype._invalidateIfHashChanged=function(H){if(typeof H==="undefined"||this._getPopover()._getContentIdsHash()!==H){this._preserveChildControlFocusInfo();this.invalidate();}};h.prototype._addOverflowButton=function(){if(!this._getOverflowButtonNeeded()){this._iCurrentContentSize+=this._getOverflowButtonSize();this._setOverflowButtonNeeded(true);}};h.prototype._aggregateMovableControls=function(){var G={},A=[],C,p,s,i,j;this._aMovableControls.forEach(function(o){C=h._getControlGroup(o);p=h._oPriorityOrder;if(C){s=h._getControlPriority(o);i=this._getControlIndex(o);G[C]=G[C]||[];j=G[C];j.unshift(o);if(!j._priority||p[j._priority]<p[s]){j._priority=s;}if(!j._index||j._index<i){j._index=i;}}else{A.push(o);}},this);Object.keys(G).forEach(function(k){A.push(G[k]);});return A;};h.prototype._extractControlsToMoveToOverflow=function(A,t){var i,m;for(i=0;i<A.length;i++){m=A[i];if(m.length){m.forEach(this._addToPopoverArrAndUpdateContentSize,this);}else{this._addToPopoverArrAndUpdateContentSize(m);}if(this._iCurrentContentSize<=t){break;}}};h.prototype._addToPopoverArrAndUpdateContentSize=function(C){this._aButtonsToMoveToPopover.unshift(C);this._iCurrentContentSize-=this._aControlSizes[C.getId()];};h.prototype._sortByPriorityAndIndex=function(C,v){var p=h._oPriorityOrder,s=h._getControlPriority(C),i=h._getControlPriority(v),j=p[s]-p[i];if(j!==0){return j;}else{return this._getControlIndex(v)-this._getControlIndex(C);}};h.prototype._setControlsOverflowAndShrinking=function(t){var i;this._iCurrentContentSize=this._iContentSize;this._aButtonsToMoveToPopover=[];if(this._bSkipOptimization){this._bSkipOptimization=false;}else{i=this._getPopover()._getContentIdsHash();}this._resetToolbar();this._collectPopoverOnlyControls();this._markControlsWithShrinkableLayoutData();if(this._iCurrentContentSize<=t){this._flushButtonsToPopover();this._invalidateIfHashChanged(i);return;}this._moveControlsToPopover(t);this._flushButtonsToPopover();if(this._iCurrentContentSize>t){this._checkContents();}this._invalidateIfHashChanged(i);};h.prototype._markControlsWithShrinkableLayoutData=function(){this.getContent().forEach(this._markControlWithShrinkableLayoutData,this);};h.prototype._collectPopoverOnlyControls=function(){var p=this._aPopoverOnlyControls.length,i,C;if(p){for(i=p-1;i>=0;i--){C=this._aPopoverOnlyControls[i];if(C.getVisible()){this._aButtonsToMoveToPopover.unshift(C);}}if(this._aButtonsToMoveToPopover.length>0){this._setOverflowButtonNeeded(true);}}};h.prototype._moveControlsToPopover=function(t){var A=[];if(this._aMovableControls.length){this._addOverflowButton();A=this._aggregateMovableControls();A.sort(this._sortByPriorityAndIndex.bind(this));this._extractControlsToMoveToOverflow(A,t);}};h.prototype._markControlWithShrinkableLayoutData=function(C){var w,o;C.removeStyleClass(a.shrinkClass);w=a.getOrigWidth(C.getId());if(!a.isRelativeWidth(w)){return;}o=C.getLayoutData();if(o&&o.isA("sap.m.ToolbarLayoutData")&&o.getShrinkable()){C.addStyleClass(a.shrinkClass);}};h.prototype._resetToolbar=function(){this._getPopover().close();this._getPopover()._getAllContent().forEach(this._restoreButtonInToolbar,this);this._setOverflowButtonNeeded(false);this.getContent().forEach(this._removeShrinkingClass);};h.prototype._removeShrinkingClass=function(C){C.removeStyleClass(a.shrinkClass);};h.prototype._moveButtonToPopover=function(o){this._getPopover().addAssociatedContent(o);};h.prototype._restoreButtonInToolbar=function(v){if(typeof v==="object"){v=v.getId();}this._getPopover().removeAssociatedContent(v);};h.prototype._resetAndInvalidateToolbar=function(H){if(this._bIsBeingDestroyed){return;}this._resetToolbar();this._bControlsInfoCached=false;this._bNestedInAPopover=null;this._iPreviousToolbarWidth=null;if(H){this._bSkipOptimization=true;}if(this.$().length){this._preserveChildControlFocusInfo();this.invalidate();}};h.prototype._getVisibleContent=function(){var t=this.getContent(),p=this._getPopover()._getAllContent();return t.filter(function(C){return p.indexOf(C)===-1;});};h.prototype._getVisibleAndNonOverflowContent=function(){return this._getVisibleContent().filter(function(C){return C.getVisible();});};h.prototype._getOverflowButton=function(){var o;if(!this.getAggregation("_overflowButton")){o=new T({id:this.getId()+"-overflowButton",icon:e.getIconURI("overflow"),press:this._overflowButtonPressed.bind(this),ariaLabelledBy:I.getStaticId("sap.ui.core","Icon.overflow"),type:B.Transparent});this.setAggregation("_overflowButton",o,true);}return this.getAggregation("_overflowButton");};h.prototype._overflowButtonPressed=function(E){var p=this._getPopover(),s=this._getBestPopoverPlacement();if(p.getPlacement()!==s){p.setPlacement(s);}if(p.isOpen()){p.close();}else{p.openBy(E.getSource());}};h.prototype._getPopover=function(){var p;if(!this.getAggregation("_popover")){p=new c(this.getId()+"-popover",{showHeader:false,showArrow:false,modal:false,horizontalScrolling:D.system.phone?false:true,contentWidth:D.system.phone?"100%":"auto",offsetY:this._detireminePopoverVerticalOffset(),ariaLabelledBy:I.getStaticId("sap.m","INPUT_AVALIABLE_VALUES")});p._adaptPositionParams=function(){c.prototype._adaptPositionParams.call(this);this._myPositions=["end top","begin center","end bottom","end center"];this._atPositions=["end bottom","end center","end top","begin center"];};if(D.system.phone){p.attachBeforeOpen(this._shiftPopupShadow,this);}p.attachAfterClose(this._popOverClosedHandler,this);this.setAggregation("_popover",p,true);}return this.getAggregation("_popover");};h.prototype._shiftPopupShadow=function(){var p=this._getPopover(),s=p.getCurrentPosition();if(s===P.Bottom){p.addStyleClass("sapMOTAPopoverNoShadowTop");p.removeStyleClass("sapMOTAPopoverNoShadowBottom");}else if(s===P.Top){p.addStyleClass("sapMOTAPopoverNoShadowBottom");p.removeStyleClass("sapMOTAPopoverNoShadowTop");}};h.prototype._popOverClosedHandler=function(){var w=D.os.windows_phone||D.browser.edge&&D.browser.mobile;this._getOverflowButton().setPressed(false);this._getOverflowButton().$().focus();if(this._isNestedInsideAPopup()||w){return;}this._getOverflowButton().setEnabled(false);setTimeout(function(){this._getOverflowButton().setEnabled(true);setTimeout(function(){this._getOverflowButton().$().focus();}.bind(this),0);}.bind(this),0);};h.prototype._isNestedInsideAPopup=function(){var s;if(this._bNestedInAPopover!==null){return this._bNestedInAPopover;}s=function(C){if(!C){return false;}if(C.getMetadata().isInstanceOf("sap.ui.core.PopupInterface")){return true;}return s(C.getParent());};this._bNestedInAPopover=s(this);return this._bNestedInAPopover;};h.prototype._getOverflowButtonNeeded=function(){return this._bOverflowButtonNeeded;};h.prototype._setOverflowButtonNeeded=function(v){if(this._bOverflowButtonNeeded!==v){this._bOverflowButtonNeeded=v;}return this;};h.prototype._updateContentInfoInControlsCollections=function(C){this._removeContentFromControlsCollections(C);this._moveControlInSuitableCollection(C,h._getControlPriority(C));};h.prototype._moveControlInSuitableCollection=function(C,p){var i=p!==g.NeverOverflow,A=p===g.AlwaysOverflow;if(d.supportsControl(C)&&A){this._aPopoverOnlyControls.push(C);}else{if(d.supportsControl(C)&&i&&C.getVisible()){this._aMovableControls.push(C);}else{this._aToolbarOnlyControls.push(C);}}};h.prototype._removeContentFromControlsCollections=function(C){var i,j,k;for(i=0;i<this._aAllCollections.length;i++){j=this._aAllCollections[i];k=j.indexOf(C);if(k!==-1){j.splice(k,1);}}};h.prototype._clearAllControlsCollections=function(){this._aMovableControls=[];this._aToolbarOnlyControls=[];this._aPopoverOnlyControls=[];this._aAllCollections=[this._aMovableControls,this._aToolbarOnlyControls,this._aPopoverOnlyControls];};h.prototype.onLayoutDataChange=function(E){this._resetAndInvalidateToolbar(true);E&&this._updateContentInfoInControlsCollections(E.srcControl);};h.prototype.addContent=function(C){this._registerControlListener(C);this._resetAndInvalidateToolbar(false);if(C){this._moveControlInSuitableCollection(C,h._getControlPriority(C));}return this._callToolbarMethod("addContent",arguments);};h.prototype.insertContent=function(C,i){this._registerControlListener(C);this._resetAndInvalidateToolbar(false);if(C){this._moveControlInSuitableCollection(C,h._getControlPriority(C));}return this._callToolbarMethod("insertContent",arguments);};h.prototype.removeContent=function(){var C=this._callToolbarMethod("removeContent",arguments);if(C){this._getPopover().removeAssociatedContent(C.getId());}this._resetAndInvalidateToolbar(false);this._deregisterControlListener(C);this._removeContentFromControlsCollections(C);return C;};h.prototype.removeAllContent=function(){var C=this._callToolbarMethod("removeAllContent",arguments);C.forEach(this._deregisterControlListener,this);C.forEach(this._removeContentFromControlsCollections,this);this._resetAndInvalidateToolbar(false);this._clearAllControlsCollections();return C;};h.prototype.destroyContent=function(){this._resetAndInvalidateToolbar(false);setTimeout(function(){this._resetAndInvalidateToolbar(false);}.bind(this),0);this._clearAllControlsCollections();return this._callToolbarMethod("destroyContent",arguments);};h.prototype._registerControlListener=function(C){var i;if(C){C.attachEvent("_change",this._onContentPropertyChangedOverflowToolbar,this);if(C.getMetadata().getInterfaces().indexOf("sap.m.IOverflowToolbarContent")>-1){i=C.getOverflowToolbarConfig().invalidationEvents;if(i&&Array.isArray(i)){i.forEach(function(E){C.attachEvent(E,this._onInvalidationEventFired,this);},this);}}}};h.prototype._deregisterControlListener=function(C){var i;if(C){C.detachEvent("_change",this._onContentPropertyChangedOverflowToolbar,this);if(C.getMetadata().getInterfaces().indexOf("sap.m.IOverflowToolbarContent")>-1){i=C.getOverflowToolbarConfig().invalidationEvents;if(i&&Array.isArray(i)){i.forEach(function(E){C.detachEvent(E,this._onInvalidationEventFired,this);},this);}}}};h.prototype._onContentPropertyChangedOverflowToolbar=function(E){var s,C,p;if(!this._bListenForControlPropertyChanges){return;}s=E.getSource();C=d.getControlConfig(s);p=E.getParameter("name");if(typeof C!=="undefined"&&C.noInvalidationProps.indexOf(p)!==-1){return;}this._updateContentInfoInControlsCollections(E.getSource());this._resetAndInvalidateToolbar(true);};h.prototype._onInvalidationEventFired=function(){if(!this._bListenForInvalidationEvents){return;}this._resetAndInvalidateToolbar(true);};h.prototype._getOverflowButtonSize=function(){var i=parseInt(l.BaseFontSize),C=this.$().parents().hasClass('sapUiSizeCompact')?2.5:3;return parseInt(i*C);};h.prototype._getBestPopoverPlacement=function(){var H=this.getHTMLTag();if(H==="Footer"){return P.Top;}else if(H==="Header"){return P.Bottom;}return P.Vertical;};h.prototype._getControlsIds=function(){return this.getContent().map(function(i){return i.getId();});};h.prototype._getControlIndex=function(C){return C.length?C._index:this.indexOfContent(C);};h._getOptimalControlWidth=function(C,o){var i,j=C.getLayoutData(),s=j&&j.isA("sap.m.ToolbarLayoutData")?j.getShrinkable():false,m=s?parseInt(j.getMinWidth()):0,v=C.getVisible();if(C.isA("sap.m.ToolbarSpacer")){i=parseInt(C.$().css('min-width'))||0+C.$().outerWidth(true)-C.$().outerWidth();}else if(s&&m>0&&v){i=m+C.$().outerWidth(true)-C.$().outerWidth();}else{i=v?C.$().outerWidth(true):0;}if(i===null){i=typeof o!=="undefined"?o:0;}return i;};h._getControlPriority=function(C){var i,o,p,G;if(C.length){return C._priority;}i=C.getMetadata().getInterfaces().indexOf("sap.m.IOverflowToolbarContent")>-1;G=i&&C.getOverflowToolbarConfig().getCustomImportance;if(i&&typeof G==="function"){return G();}o=C.getLayoutData&&C.getLayoutData();if(o&&o instanceof O){if(o.getMoveToOverflow()===false){return g.NeverOverflow;}if(o.getStayInOverflow()===true){return g.AlwaysOverflow;}p=o.getPriority();if(p===g.Never){return g.NeverOverflow;}if(p===g.Always){return g.AlwaysOverflow;}return p;}return g.High;};h._getControlGroup=function(C){var o=C.getLayoutData();if(o instanceof O){return o.getGroup();}};h._oPriorityOrder=(function(){var p={};p[g.Disappear]=1;p[g.Low]=2;p["Medium"]=3;p[g.High]=4;return p;})();h.prototype._detireminePopoverVerticalOffset=function(){return this.$().parents().hasClass('sapUiSizeCompact')?2:3;};h.prototype.onThemeChanged=function(){this._resetAndInvalidateToolbar();for(var C in this._aControlSizes){if(this._aControlSizes.hasOwnProperty(C)){this._aControlSizes[C]=0;}}};h.prototype.closeOverflow=function(){this._getPopover().close();};return h;});