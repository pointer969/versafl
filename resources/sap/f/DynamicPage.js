/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["./library","sap/ui/core/Control","sap/m/ScrollBar","sap/ui/base/ManagedObjectObserver","sap/ui/core/ResizeHandler","sap/ui/core/Configuration","sap/ui/core/delegate/ScrollEnablement","sap/ui/Device","sap/f/DynamicPageTitle","sap/f/DynamicPageHeader","./DynamicPageRenderer","sap/base/Log","sap/ui/dom/getScrollbarSize","sap/ui/core/library"],function(l,C,S,M,R,a,b,D,c,d,e,L,g,f){"use strict";var h=C.extend("sap.f.DynamicPage",{metadata:{library:"sap.f",properties:{preserveHeaderStateOnScroll:{type:"boolean",group:"Behavior",defaultValue:false},headerExpanded:{type:"boolean",group:"Behavior",defaultValue:true},toggleHeaderOnTitleClick:{type:"boolean",group:"Behavior",defaultValue:true},showFooter:{type:"boolean",group:"Behavior",defaultValue:false},fitContent:{type:"boolean",group:"Behavior",defaultValue:false}},associations:{stickySubheaderProvider:{type:"sap.f.IDynamicPageStickyContent",multiple:false}},aggregations:{title:{type:"sap.f.DynamicPageTitle",multiple:false},header:{type:"sap.f.DynamicPageHeader",multiple:false},content:{type:"sap.ui.core.Control",multiple:false},footer:{type:"sap.m.IBar",multiple:false},landmarkInfo:{type:"sap.f.DynamicPageAccessibleLandmarkInfo",multiple:false},_scrollBar:{type:"sap.ui.core.Control",multiple:false,visibility:"hidden"}},dnd:{draggable:false,droppable:true},designtime:"sap/f/designtime/DynamicPage.designtime"}});function i(o){if(arguments.length===1){return o&&("length"in o)?o.length>0:!!o;}return Array.prototype.slice.call(arguments).every(function(O){return i(O);});}function j(E){var o;if(!E){return false;}o=E.getBoundingClientRect();return!!(o.width&&o.height);}var A=f.AccessibleLandmarkRole;h.HEADER_MAX_ALLOWED_PINNED_PERCENTAGE=0.6;h.HEADER_MAX_ALLOWED_NON_SROLLABLE_PERCENTAGE=0.6;h.HEADER_MAX_ALLOWED_NON_SROLLABLE_ON_MOBILE=0.3;h.FOOTER_ANIMATION_DURATION=350;h.BREAK_POINTS={TABLET:1024,PHONE:600};h.EVENTS={TITLE_PRESS:"_titlePress",TITLE_MOUSE_OVER:"_titleMouseOver",TITLE_MOUSE_OUT:"_titleMouseOut",PIN_UNPIN_PRESS:"_pinUnpinPress",VISUAL_INDICATOR_MOUSE_OVER:"_visualIndicatorMouseOver",VISUAL_INDICATOR_MOUSE_OUT:"_visualIndicatorMouseOut",HEADER_VISUAL_INDICATOR_PRESS:"_headerVisualIndicatorPress",TITLE_VISUAL_INDICATOR_PRESS:"_titleVisualIndicatorPress"};h.MEDIA={PHONE:"sapFDynamicPage-Std-Phone",TABLET:"sapFDynamicPage-Std-Tablet",DESKTOP:"sapFDynamicPage-Std-Desktop"};h.RESIZE_HANDLER_ID={PAGE:"_sResizeHandlerId",TITLE:"_sTitleResizeHandlerId",HEADER:"_sHeaderResizeHandlerId",CONTENT:"_sContentResizeHandlerId"};h.DIV="div";h.HEADER="header";h.FOOTER="footer";h.prototype.init=function(){this._bPinned=false;this._bHeaderInTitleArea=false;this._bExpandingWithAClick=false;this._bSuppressToggleHeaderOnce=false;this._headerBiggerThanAllowedHeight=false;this._oStickySubheader=null;this._bStickySubheaderInTitleArea=false;this._bMSBrowser=D.browser.internet_explorer||D.browser.edge||false;this._oScrollHelper=new b(this,this.getId()+"-content",{horizontal:false,vertical:true});this._oHeaderObserver=null;this._oSubHeaderAfterRenderingDelegate={onAfterRendering:this._adjustStickyContent};};h.prototype.onBeforeRendering=function(){if(!this._preserveHeaderStateOnScroll()){this._attachPinPressHandler();}this._attachTitlePressHandler();this._attachVisualIndicatorsPressHandlers();this._attachVisualIndicatorMouseOverHandlers();this._attachTitleMouseOverHandlers();this._addStickySubheaderAfterRenderingDelegate();this._detachScrollHandler();};h.prototype.onAfterRendering=function(){var s,k;if(this._preserveHeaderStateOnScroll()){setTimeout(this._overridePreserveHeaderStateOnScroll.bind(this),0);}this._bPinned=false;this._cacheDomElements();this._detachResizeHandlers();this._attachResizeHandlers();this._updateMedia(this._getWidth(this));this._attachScrollHandler();this._updateScrollBar();this._attachPageChildrenAfterRenderingDelegates();this._resetPinButtonState();if(!this.getHeaderExpanded()){this._snapHeader(false);s=this.getHeader()&&!this.getPreserveHeaderStateOnScroll()&&this._canSnapHeaderOnScroll();if(s){k=this._getScrollBar().getScrollPosition();this._setScrollPosition(k?k:this._getSnappingHeight());}else{this._toggleHeaderVisibility(false);this._moveHeaderToTitleArea();}}this._updateToggleHeaderVisualIndicators();this._updateTitleVisualState();};h.prototype.exit=function(){this._detachResizeHandlers();if(this._oScrollHelper){this._oScrollHelper.destroy();}if(this._oHeaderObserver){this._oHeaderObserver.disconnect();}if(this._oStickySubheader){this._oStickySubheader.removeEventDelegate(this._oSubHeaderAfterRenderingDelegate);}};h.prototype.setShowFooter=function(s){var r=this.setProperty("showFooter",s,true);this._toggleFooter(s);return r;};h.prototype.setHeader=function(H){var o;if(H===o){return;}o=this.getHeader();if(o){if(this._oHeaderObserver){this._oHeaderObserver.disconnect();}this._deRegisterResizeHandler(h.RESIZE_HANDLER_ID.HEADER);o.detachEvent(h.EVENTS.PIN_UNPIN_PRESS,this._onPinUnpinButtonPress);this._bAlreadyAttachedPinPressHandler=false;o.detachEvent(h.EVENTS.HEADER_VISUAL_INDICATOR_PRESS,this._onCollapseHeaderVisualIndicatorPress);this._bAlreadyAttachedHeaderIndicatorPressHandler=false;o.detachEvent(h.EVENTS.VISUAL_INDICATOR_MOUSE_OVER,this._onVisualIndicatorMouseOver);o.detachEvent(h.EVENTS.VISUAL_INDICATOR_MOUSE_OUT,this._onVisualIndicatorMouseOut);this._bAlreadyAttachedVisualIndicatorMouseOverOutHandler=false;this._bAlreadyAttachedHeaderObserver=false;}this.setAggregation("header",H);};h.prototype.setStickySubheaderProvider=function(s){var o,O=this.getStickySubheaderProvider();if(s===O){return;}o=sap.ui.getCore().byId(O);if(this._oStickySubheader&&o){o._returnStickyContent();o._setStickySubheaderSticked(false);this._oStickySubheader.removeEventDelegate(this._oSubHeaderAfterRenderingDelegate);this._bAlreadyAddedStickySubheaderAfterRenderingDelegate=false;this._oStickySubheader=null;}this.setAssociation("stickySubheaderProvider",s);return this;};h.prototype.setHeaderExpanded=function(H){H=this.validateProperty("headerExpanded",H);if(this._bPinned){return this;}if(this.getHeaderExpanded()===H){return this;}if(this.getDomRef()){this._titleExpandCollapseWhenAllowed();}this.setProperty("headerExpanded",H,true);return this;};h.prototype.setToggleHeaderOnTitleClick=function(t){var H=this.getHeaderExpanded(),r=this.setProperty("toggleHeaderOnTitleClick",t,true);t=this.getProperty("toggleHeaderOnTitleClick");this._updateTitleVisualState();this._updateToggleHeaderVisualIndicators();this._updateARIAStates(H);return r;};h.prototype.setFitContent=function(F){var r=this.setProperty("fitContent",F,true);if(i(this.$())){this._updateFitContainer();}return r;};h.prototype.getScrollDelegate=function(){return this._oScrollHelper;};h.prototype._overridePreserveHeaderStateOnScroll=function(){if(!this._shouldOverridePreserveHeaderStateOnScroll()){this._headerBiggerThanAllowedHeight=false;return;}this._headerBiggerThanAllowedHeight=true;if(this.getHeaderExpanded()){this._moveHeaderToContentArea(true);}else{this._adjustSnap();}this._updateScrollBar();};h.prototype._shouldOverridePreserveHeaderStateOnScroll=function(){return!D.system.desktop&&this._headerBiggerThanAllowedToBeFixed()&&this._preserveHeaderStateOnScroll();};h.prototype._toggleFooter=function(s){var F=this.getFooter(),u=sap.ui.getCore().getConfiguration().getAnimationMode()!==a.AnimationMode.none;if(!i(this.$())){return;}if(!i(F)){return;}F.toggleStyleClass("sapFDynamicPageActualFooterControlShow",s);F.toggleStyleClass("sapFDynamicPageActualFooterControlHide",!s);this._toggleFooterSpacer(s);if(u){if(!s){this._iFooterAnimationTimeout=setTimeout(function(){this.$footerWrapper.toggleClass("sapUiHidden",!s);}.bind(this),h.FOOTER_ANIMATION_DURATION);}else{if(this._iFooterAnimationTimeout){clearTimeout(this._iFooterAnimationTimeout);this._iFooterAnimationTimeout=null;}this.$footerWrapper.toggleClass("sapUiHidden",!s);}setTimeout(function(){F.removeStyleClass("sapFDynamicPageActualFooterControlShow");},h.FOOTER_ANIMATION_DURATION);}if(!u){this.$footerWrapper.toggleClass("sapUiHidden",!s);}this._updateScrollBar();};h.prototype._toggleFooterSpacer=function(t){var $=this.$("spacer");if(i($)){$.toggleClass("sapFDynamicPageContentWrapperSpacer",t);}if(i(this.$contentFitContainer)){this.$contentFitContainer.toggleClass("sapFDynamicPageContentFitContainerFooterVisible",t);}};h.prototype._toggleHeaderInTabChain=function(t){var o=this.getTitle(),k=this.getHeader();if(!i(o)||!i(k)){return;}k.$().css("visibility",t?"visible":"hidden");};h.prototype._snapHeader=function(k,u){var o=this.getTitle();if(this._bPinned&&!u){L.debug("DynamicPage :: aborted snapping, header is pinned",this);return;}L.debug("DynamicPage :: snapped header",this);if(this._bPinned&&u){this._unPin();this._togglePinButtonPressedState(false);}if(i(o)){o._toggleState(false,u);if(k&&this._bHeaderInTitleArea){this._moveHeaderToContentArea(true);}}if(!i(this.$titleArea)){L.warning("DynamicPage :: couldn't snap header. There's no title.",this);return;}this.setProperty("headerExpanded",false,true);if(this._hasVisibleTitleAndHeader()){this.$titleArea.addClass(D.system.phone&&o.getSnappedTitleOnMobile()?"sapFDynamicPageTitleSnappedTitleOnMobile":"sapFDynamicPageTitleSnapped");this._updateToggleHeaderVisualIndicators();this._togglePinButtonVisibility(false);}this._toggleHeaderInTabChain(false);this._updateARIAStates(false);};h.prototype._expandHeader=function(k,u){var o=this.getTitle();L.debug("DynamicPage :: expand header",this);if(i(o)){o._toggleState(true,u);if(k){this._moveHeaderToTitleArea(true);}}if(!i(this.$titleArea)){L.warning("DynamicPage :: couldn't expand header. There's no title.",this);return;}this.setProperty("headerExpanded",true,true);if(this._hasVisibleTitleAndHeader()){this.$titleArea.removeClass(D.system.phone&&o.getSnappedTitleOnMobile()?"sapFDynamicPageTitleSnappedTitleOnMobile":"sapFDynamicPageTitleSnapped");this._updateToggleHeaderVisualIndicators();if(!this.getPreserveHeaderStateOnScroll()){this._togglePinButtonVisibility(true);}}this._toggleHeaderInTabChain(true);this._updateARIAStates(true);};h.prototype._toggleHeaderVisibility=function(s,u){var E=this.getHeaderExpanded(),o=this.getTitle(),k=this.getHeader();if(this._bPinned&&!u){L.debug("DynamicPage :: header toggle aborted, header is pinned",this);return;}if(i(o)){o._toggleState(E);}if(i(k)){k.$().toggleClass("sapFDynamicPageHeaderHidden",!s);this._updateScrollBar();}};h.prototype._moveHeaderToContentArea=function(o){var k=this.getHeader();if(i(k)){k.$().prependTo(this.$wrapper);this._bHeaderInTitleArea=false;if(o){this._offsetContentOnMoveHeader();}}};h.prototype._moveHeaderToTitleArea=function(o){var k=this.getHeader();if(i(k)){k.$().prependTo(this.$stickyPlaceholder);this._bHeaderInTitleArea=true;if(o){this._offsetContentOnMoveHeader();}}};h.prototype._offsetContentOnMoveHeader=function(){var o=Math.ceil(this._getHeaderHeight()),k=this._getScrollPosition(),m=this._getScrollBar().getScrollPosition(),n;if(!o){return;}if(!k&&m){n=this._getScrollBar().getScrollPosition();}else{n=this._bHeaderInTitleArea?k-o:k+o;}n=Math.max(n,0);this._setScrollPosition(n,true);};h.prototype._pin=function(){var $=this.$();if(this._bPinned){return;}this._bPinned=true;if(!this._bHeaderInTitleArea){this._moveHeaderToTitleArea(true);this._updateScrollBar();}this._updateToggleHeaderVisualIndicators();this._togglePinButtonARIAState(this._bPinned);if(i($)){$.addClass("sapFDynamicPageHeaderPinned");}};h.prototype._unPin=function(){var $=this.$();if(!this._bPinned){return;}this._bPinned=false;this._updateToggleHeaderVisualIndicators();this._togglePinButtonARIAState(this._bPinned);if(i($)){$.removeClass("sapFDynamicPageHeaderPinned");}};h.prototype._togglePinButtonVisibility=function(t){var o=this.getHeader();if(i(o)){o._setShowPinBtn(t);}};h.prototype._togglePinButtonPressedState=function(p){var o=this.getHeader();if(i(o)){o._togglePinButton(p);}};h.prototype._togglePinButtonARIAState=function(p){var o=this.getHeader();if(i(o)){o._updateARIAPinButtonState(p);}};h.prototype._resetPinButtonState=function(){if(this._preserveHeaderStateOnScroll()){this._togglePinButtonVisibility(false);}else{this._togglePinButtonPressedState(false);this._togglePinButtonARIAState(false);}};h.prototype._restorePinButtonFocus=function(){this.getHeader()._focusPinButton();};h.prototype._getScrollPosition=function(){return i(this.$wrapper)?Math.ceil(this.$wrapper.scrollTop()):0;};h.prototype._setScrollPosition=function(n,s){if(!i(this.$wrapper)){return;}if(this._getScrollPosition()===n){return;}if(s){this._bSuppressToggleHeaderOnce=true;}if(!this.getScrollDelegate()._$Container){this.getScrollDelegate()._$Container=this.$wrapper;}this.getScrollDelegate().scrollTo(0,n);};h.prototype._shouldSnapOnScroll=function(){return!this._preserveHeaderStateOnScroll()&&this._getScrollPosition()>=this._getSnappingHeight()&&this.getHeaderExpanded()&&!this._bPinned;};h.prototype._shouldExpandOnScroll=function(){var I=this._needsVerticalScrollBar();return!this._preserveHeaderStateOnScroll()&&this._getScrollPosition()<this._getSnappingHeight()&&!this.getHeaderExpanded()&&!this._bPinned&&I;};h.prototype._shouldStickStickyContent=function(){var I,s,k;k=this._getScrollPosition();I=k<=Math.ceil(this._getHeaderHeight())&&!this._bPinned&&!this.getPreserveHeaderStateOnScroll();s=k===0||I&&this._hasVisibleHeader();return!s;};h.prototype._headerScrolledOut=function(){return this._getScrollPosition()>=this._getSnappingHeight();};h.prototype._headerSnapAllowed=function(){return!this._preserveHeaderStateOnScroll()&&this.getHeaderExpanded()&&!this._bPinned;};h.prototype._canSnapHeaderOnScroll=function(){var m=this._getMaxScrollPosition(),t=this._bMSBrowser?1:0;if(this._bHeaderInTitleArea){m+=this._getHeaderHeight();m-=t;}return m>this._getSnappingHeight();};h.prototype._getSnappingHeight=function(){return Math.ceil(this._getHeaderHeight()||this._getTitleHeight());};h.prototype._getMaxScrollPosition=function(){var $;if(i(this.$wrapper)){$=this.$wrapper[0];return $.scrollHeight-$.clientHeight;}return 0;};h.prototype._needsVerticalScrollBar=function(){var t=this._bMSBrowser?1:0;return this._getMaxScrollPosition()>t;};h.prototype._getOwnHeight=function(){return this._getHeight(this);};h.prototype._getEntireHeaderHeight=function(){var t=0,H=0,o=this.getTitle(),k=this.getHeader();if(i(o)){t=o.$().outerHeight();}if(i(k)){H=k.$().outerHeight();}return t+H;};h.prototype._headerBiggerThanAllowedToPin=function(k){if(!(typeof k==="number"&&!isNaN(parseInt(k)))){k=this._getOwnHeight();}return this._getEntireHeaderHeight()>h.HEADER_MAX_ALLOWED_PINNED_PERCENTAGE*k;};h.prototype._headerBiggerThanAllowedToBeFixed=function(){var k=this._getOwnHeight();return this._getEntireHeaderHeight()>h.HEADER_MAX_ALLOWED_NON_SROLLABLE_PERCENTAGE*k;};h.prototype._headerBiggerThanAllowedToBeExpandedInTitleArea=function(){var E=this._getEntireHeaderHeight(),k=this._getOwnHeight();if(k===0){return false;}return D.system.phone?E>=h.HEADER_MAX_ALLOWED_NON_SROLLABLE_ON_MOBILE*k:E>=k;};h.prototype._measureScrollBarOffsetHeight=function(){var H=0,s=!this.getHeaderExpanded(),k=this._bHeaderInTitleArea;if(this._preserveHeaderStateOnScroll()||this._bPinned||(!s&&this._bHeaderInTitleArea)){H=this._getTitleAreaHeight();L.debug("DynamicPage :: preserveHeaderState is enabled or header pinned :: title area height"+H,this);return H;}if(s||!i(this.getTitle())||!this._canSnapHeaderOnScroll()){H=this._getTitleHeight();L.debug("DynamicPage :: header snapped :: title height "+H,this);return H;}this._snapHeader(true);H=this._getTitleHeight();if(!s){this._expandHeader(k);}L.debug("DynamicPage :: snapped mode :: title height "+H,this);return H;};h.prototype._updateScrollBar=function(){var s,k,n;if(!D.system.desktop||!i(this.$wrapper)||(this._getHeight(this)===0)){return;}s=this._getScrollBar();s.setContentSize(this._measureScrollBarOffsetHeight()+this.$wrapper[0].scrollHeight+"px");k=this._needsVerticalScrollBar();n=this.bHasScrollbar!==k;if(n){s.toggleStyleClass("sapUiHidden",!k);this.toggleStyleClass("sapFDynamicPageWithScroll",k);this.bHasScrollbar=k;}setTimeout(this._updateFitContainer.bind(this),0);setTimeout(this._updateScrollBarOffset.bind(this),0);};h.prototype._updateFitContainer=function(n){var N=typeof n!=='undefined'?!n:!this._needsVerticalScrollBar(),F=this.getFitContent(),t=F||N;this.$contentFitContainer.toggleClass("sapFDynamicPageContentFitContainer",t);};h.prototype._updateScrollBarOffset=function(){var s=sap.ui.getCore().getConfiguration().getRTL()?"left":"right",o=this._needsVerticalScrollBar()?g().width+"px":0,F=this.getFooter();this.$titleArea.css("padding-"+s,o);if(i(F)){F.$().css(s,o);}};h.prototype._updateHeaderARIAState=function(E){var o=this.getHeader();if(i(o)){o._updateARIAState(E);}};h.prototype._updateTitleARIAState=function(E){var o=this.getTitle();if(i(o)){o._updateARIAState(E);}};h.prototype._updateARIAStates=function(E){this._updateHeaderARIAState(E);this._updateTitleARIAState(E);};h.prototype._updateMedia=function(w){if(w<=h.BREAK_POINTS.PHONE){this._updateMediaStyle(h.MEDIA.PHONE);}else if(w<=h.BREAK_POINTS.TABLET){this._updateMediaStyle(h.MEDIA.TABLET);}else{this._updateMediaStyle(h.MEDIA.DESKTOP);}};h.prototype._updateMediaStyle=function(s){Object.keys(h.MEDIA).forEach(function(m){var E=s===h.MEDIA[m];this.toggleStyleClass(h.MEDIA[m],E);},this);};h.prototype._toggleExpandVisualIndicator=function(t){var o=this.getTitle();if(i(o)){o._toggleExpandButton(t);}};h.prototype._focusExpandVisualIndicator=function(){var o=this.getTitle();if(i(o)){o._focusExpandButton();}};h.prototype._toggleCollapseVisualIndicator=function(t){var o=this.getHeader();if(i(o)){o._toggleCollapseButton(t);}};h.prototype._focusCollapseVisualIndicator=function(){var o=this.getHeader();if(i(o)){o._focusCollapseButton();}};h.prototype._updateToggleHeaderVisualIndicators=function(){var H,k,E,m=this._hasVisibleTitleAndHeader();if(!this.getToggleHeaderOnTitleClick()||!m){k=false;E=false;}else{H=this.getHeaderExpanded();k=H;E=D.system.phone&&this.getTitle().getAggregation("snappedTitleOnMobile")?false:!H;}this._toggleCollapseVisualIndicator(k);this._toggleExpandVisualIndicator(E);};h.prototype._updateTitleVisualState=function(){var t=this.getTitle(),T=this._hasVisibleTitleAndHeader()&&this.getToggleHeaderOnTitleClick();this.$().toggleClass("sapFDynamicPageTitleClickEnabled",T&&!D.system.phone);if(i(t)){t._toggleFocusableState(T);}};h.prototype._scrollBellowCollapseVisualIndicator=function(){var H=this.getHeader(),$,k,v,o;if(i(H)){$=this.getHeader()._getCollapseButton().getDomRef();k=$.getBoundingClientRect().height;v=this.$wrapper[0].getBoundingClientRect().height;o=$.offsetTop+k-v;this._setScrollPosition(o);}};h.prototype._hasVisibleTitleAndHeader=function(){var t=this.getTitle();return i(t)&&t.getVisible()&&this._hasVisibleHeader();};h.prototype._hasVisibleHeader=function(){var H=this.getHeader();return i(H)&&H.getVisible()&&i(H.getContent());};h.prototype._getHeight=function(o){var $;if(!(o instanceof C)){return 0;}$=o.getDomRef();return $?$.getBoundingClientRect().height:0;};h.prototype._getWidth=function(o){return!(o instanceof C)?0:o.$().outerWidth()||0;};h.prototype._getTitleAreaHeight=function(){return i(this.$titleArea)?this.$titleArea.outerHeight()||0:0;};h.prototype._getTitleHeight=function(){return this._getHeight(this.getTitle());};h.prototype._getHeaderHeight=function(){return this._getHeight(this.getHeader());};h.prototype._preserveHeaderStateOnScroll=function(){return this.getPreserveHeaderStateOnScroll()&&!this._headerBiggerThanAllowedHeight;};h.prototype._getScrollBar=function(){if(!i(this.getAggregation("_scrollBar"))){var v=new S(this.getId()+"-vertSB",{scrollPosition:0,scroll:this._onScrollBarScroll.bind(this)});this.setAggregation("_scrollBar",v,true);}return this.getAggregation("_scrollBar");};h.prototype._cacheDomElements=function(){var F=this.getFooter();if(i(F)){this.$footer=F.$();this.$footerWrapper=this.$("footerWrapper");}this.$wrapper=this.$("contentWrapper");this.$contentFitContainer=this.$("contentFitContainer");this.$titleArea=this.$("header");this.$stickyPlaceholder=this.$("stickyPlaceholder");this._cacheTitleDom();this._cacheHeaderDom();};h.prototype._cacheTitleDom=function(){var t=this.getTitle();if(i(t)){this.$title=t.$();}};h.prototype._cacheHeaderDom=function(){var H=this.getHeader();if(i(H)){this.$header=H.$();}};h.prototype._adjustSnap=function(){var o,I,k,m,s,n,$=this.$();if(!i($)){return;}if(!j($[0])){return;}o=this.getHeader();I=!this.getHeaderExpanded();if(!o||!I){return;}k=!this._preserveHeaderStateOnScroll()&&this._canSnapHeaderOnScroll();m=I&&o.$().hasClass("sapFDynamicPageHeaderHidden");if(k&&m){this._toggleHeaderVisibility(true);this._moveHeaderToContentArea(true);return;}if(!k&&!m){this._moveHeaderToTitleArea(true);this._toggleHeaderVisibility(false);return;}if(k){s=this._getScrollPosition();n=this._getSnappingHeight();if(s<n){this._setScrollPosition(n);}}};h.prototype.ontouchmove=function(E){E.setMarked();};h.prototype._onChildControlAfterRendering=function(E){var s=E.srcControl;if(s instanceof c){this._cacheTitleDom();this._deRegisterResizeHandler(h.RESIZE_HANDLER_ID.TITLE);this._registerResizeHandler(h.RESIZE_HANDLER_ID.TITLE,this.$title[0],this._onChildControlsHeightChange.bind(this));}else if(s instanceof d){this._cacheHeaderDom();this._deRegisterResizeHandler(h.RESIZE_HANDLER_ID.HEADER);this._registerResizeHandler(h.RESIZE_HANDLER_ID.HEADER,this.$header[0],this._onChildControlsHeightChange.bind(this));}setTimeout(this._updateScrollBar.bind(this),0);};h.prototype._onChildControlsHeightChange=function(){var n=this._needsVerticalScrollBar();if(n){this._updateFitContainer(n);}this._adjustSnap();if(!this._bExpandingWithAClick){this._updateScrollBar();}this._bExpandingWithAClick=false;};h.prototype._onResize=function(E){var o=this.getTitle(),k=this.getHeader(),m=E.size.width;if(!this._preserveHeaderStateOnScroll()&&k){if(this._headerBiggerThanAllowedToPin(E.size.height)||D.system.phone){this._unPin();this._togglePinButtonVisibility(false);this._togglePinButtonPressedState(false);}else{this._togglePinButtonVisibility(true);}if(this.getHeaderExpanded()&&this._bHeaderInTitleArea&&this._headerBiggerThanAllowedToBeExpandedInTitleArea()){this._expandHeader(false);this._setScrollPosition(0);}}if(i(o)){o._onResize(m);}this._adjustSnap();this._updateScrollBar();this._updateMedia(m);};h.prototype._onWrapperScroll=function(E){var s=Math.max(E.target.scrollTop,0);if(D.system.desktop){if(this.allowCustomScroll===true){this.allowCustomScroll=false;return;}this.allowInnerDiv=true;this._getScrollBar().setScrollPosition(s);this.toggleStyleClass("sapFDynamicPageWithScroll",this._needsVerticalScrollBar());}};h.prototype._toggleHeaderOnScroll=function(){this._adjustStickyContent();if(this._bSuppressToggleHeaderOnce){this._bSuppressToggleHeaderOnce=false;return;}if(D.system.desktop&&this._bExpandingWithAClick){return;}if(this._preserveHeaderStateOnScroll()){return;}if(this._shouldSnapOnScroll()){this._snapHeader(true,true);}else if(this._shouldExpandOnScroll()){this._expandHeader(false,true);this._toggleHeaderVisibility(true);}else if(!this._bPinned&&this._bHeaderInTitleArea){var k=(this._getScrollPosition()>=this._getSnappingHeight());this._moveHeaderToContentArea(k);}};h.prototype._adjustStickyContent=function(){if(!this._oStickySubheader){return;}var o,s=this._shouldStickStickyContent(),k,m=this.getStickySubheaderProvider();if(s===this._bStickySubheaderInTitleArea){return;}k=sap.ui.getCore().byId(m);if(!i(k)){return;}o=document.activeElement;k._setStickySubheaderSticked(s);if(s){this._oStickySubheader.$().appendTo(this.$stickyPlaceholder);}else{k._returnStickyContent();}o.focus();this._bStickySubheaderInTitleArea=s;};h.prototype._onScrollBarScroll=function(){if(this.allowInnerDiv===true){this.allowInnerDiv=false;return;}this.allowCustomScroll=true;this._setScrollPosition(this._getScrollBar().getScrollPosition());};h.prototype._onTitlePress=function(){if(this.getToggleHeaderOnTitleClick()&&this._hasVisibleTitleAndHeader()){this._titleExpandCollapseWhenAllowed(true);this.getTitle()._focus();}};h.prototype._onExpandHeaderVisualIndicatorPress=function(){this._onTitlePress();if(this._headerBiggerThanAllowedToBeExpandedInTitleArea()){this._scrollBellowCollapseVisualIndicator();}this._focusCollapseVisualIndicator();};h.prototype._onCollapseHeaderVisualIndicatorPress=function(){this._onTitlePress();this._focusExpandVisualIndicator();};h.prototype._onVisualIndicatorMouseOver=function(){var $=this.$();if(i($)){$.addClass("sapFDynamicPageTitleForceHovered");}};h.prototype._onVisualIndicatorMouseOut=function(){var $=this.$();if(i($)){$.removeClass("sapFDynamicPageTitleForceHovered");}};h.prototype._onTitleMouseOver=h.prototype._onVisualIndicatorMouseOver;h.prototype._onTitleMouseOut=h.prototype._onVisualIndicatorMouseOut;h.prototype._titleExpandCollapseWhenAllowed=function(u){var k;if(this._bPinned&&!u){return this;}if(this._preserveHeaderStateOnScroll()||!this._canSnapHeaderOnScroll()||!this.getHeader()){if(!this.getHeaderExpanded()){this._expandHeader(false,u);this._toggleHeaderVisibility(true,u);}else{this._snapHeader(false,u);this._toggleHeaderVisibility(false,u);}}else if(!this.getHeaderExpanded()){k=!this._headerBiggerThanAllowedToBeExpandedInTitleArea();this._bExpandingWithAClick=true;this._expandHeader(k,u);this.getHeader().$().removeClass("sapFDynamicPageHeaderHidden");if(!k){this._setScrollPosition(0);}this._bExpandingWithAClick=false;}else{var m=this._bHeaderInTitleArea;this._snapHeader(m,u);if(!m){this._setScrollPosition(this._getSnappingHeight());}}};h.prototype._onPinUnpinButtonPress=function(){if(this._bPinned){this._unPin();}else{this._pin();this._restorePinButtonFocus();}};h.prototype._attachResizeHandlers=function(){var k=this._onChildControlsHeightChange.bind(this);this._registerResizeHandler(h.RESIZE_HANDLER_ID.PAGE,this,this._onResize.bind(this));if(i(this.$title)){this._registerResizeHandler(h.RESIZE_HANDLER_ID.TITLE,this.$title[0],k);}if(i(this.$header)){this._registerResizeHandler(h.RESIZE_HANDLER_ID.HEADER,this.$header[0],k);}if(i(this.$contentFitContainer)){this._registerResizeHandler(h.RESIZE_HANDLER_ID.CONTENT,this.$contentFitContainer[0],k);}};h.prototype._registerResizeHandler=function(H,o,k){if(!this[H]){this[H]=R.register(o,k);}};h.prototype._detachResizeHandlers=function(){this._deRegisterResizeHandler(h.RESIZE_HANDLER_ID.PAGE);this._deRegisterResizeHandler(h.RESIZE_HANDLER_ID.TITLE);this._deRegisterResizeHandler(h.RESIZE_HANDLER_ID.CONTENT);};h.prototype._deRegisterResizeHandler=function(H){if(this[H]){R.deregister(this[H]);this[H]=null;}};h.prototype._attachPageChildrenAfterRenderingDelegates=function(){var t=this.getTitle(),H=this.getHeader(),o=this.getContent(),p={onAfterRendering:this._onChildControlAfterRendering.bind(this)};if(i(t)){t.addEventDelegate(p);}if(i(o)){o.addEventDelegate(p);}if(i(H)){H.addEventDelegate(p);}};h.prototype._attachTitlePressHandler=function(){var t=this.getTitle();if(i(t)&&!this._bAlreadyAttachedTitlePressHandler){t.attachEvent(h.EVENTS.TITLE_PRESS,this._onTitlePress,this);this._bAlreadyAttachedTitlePressHandler=true;}};h.prototype._attachPinPressHandler=function(){var H=this.getHeader();if(i(H)&&!this._bAlreadyAttachedPinPressHandler){H.attachEvent(h.EVENTS.PIN_UNPIN_PRESS,this._onPinUnpinButtonPress,this);this._bAlreadyAttachedPinPressHandler=true;}};h.prototype._attachHeaderObserver=function(){var H=this.getHeader();if(i(H)&&!this._bAlreadyAttachedHeaderObserver){if(!this._oHeaderObserver){this._oHeaderObserver=new M(this._adjustStickyContent.bind(this));}this._oHeaderObserver.observe(H,{properties:["visible"]});this._bAlreadyAttachedHeaderObserver=true;}};h.prototype._attachVisualIndicatorsPressHandlers=function(){var t=this.getTitle(),H=this.getHeader();if(i(t)&&!this._bAlreadyAttachedTitleIndicatorPressHandler){t.attachEvent(h.EVENTS.TITLE_VISUAL_INDICATOR_PRESS,this._onExpandHeaderVisualIndicatorPress,this);this._bAlreadyAttachedTitleIndicatorPressHandler=true;}if(i(H)&&!this._bAlreadyAttachedHeaderIndicatorPressHandler){H.attachEvent(h.EVENTS.HEADER_VISUAL_INDICATOR_PRESS,this._onCollapseHeaderVisualIndicatorPress,this);this._bAlreadyAttachedHeaderIndicatorPressHandler=true;}};h.prototype._addStickySubheaderAfterRenderingDelegate=function(){var s,k=this.getStickySubheaderProvider(),I;s=sap.ui.getCore().byId(k);if(i(s)&&!this._bAlreadyAddedStickySubheaderAfterRenderingDelegate){I=s.getMetadata().getInterfaces().indexOf("sap.f.IDynamicPageStickyContent")!==-1;if(I){this._oStickySubheader=s._getStickyContent();this._oStickySubheader.addEventDelegate(this._oSubHeaderAfterRenderingDelegate,this);this._bAlreadyAddedStickySubheaderAfterRenderingDelegate=true;this._attachHeaderObserver();}}};h.prototype._attachVisualIndicatorMouseOverHandlers=function(){var H=this.getHeader();if(i(H)&&!this._bAlreadyAttachedVisualIndicatorMouseOverOutHandler){H.attachEvent(h.EVENTS.VISUAL_INDICATOR_MOUSE_OVER,this._onVisualIndicatorMouseOver,this);H.attachEvent(h.EVENTS.VISUAL_INDICATOR_MOUSE_OUT,this._onVisualIndicatorMouseOut,this);this._bAlreadyAttachedVisualIndicatorMouseOverOutHandler=true;}};h.prototype._attachTitleMouseOverHandlers=function(){var t=this.getTitle();if(i(t)&&!this._bAlreadyAttachedTitleMouseOverOutHandler){t.attachEvent(h.EVENTS.TITLE_MOUSE_OVER,this._onTitleMouseOver,this);t.attachEvent(h.EVENTS.TITLE_MOUSE_OUT,this._onTitleMouseOut,this);this._bAlreadyAttachedTitleMouseOverOutHandler=true;}};h.prototype._attachScrollHandler=function(){this._onWrapperScrollReference=this._onWrapperScroll.bind(this);this._toggleHeaderOnScrollReference=this._toggleHeaderOnScroll.bind(this);this.$wrapper.on("scroll",this._onWrapperScrollReference);this.$wrapper.on("scroll",this._toggleHeaderOnScrollReference);};h.prototype._detachScrollHandler=function(){if(this.$wrapper){this.$wrapper.off("scroll",this._onWrapperScrollReference);this.$wrapper.off("scroll",this._toggleHeaderOnScrollReference);}};h.prototype._formatLandmarkInfo=function(o,p){if(o){var r=o["get"+p+"Role"]()||"",s=o["get"+p+"Label"]()||"";if(r===A.None){r='';}return{role:r.toLowerCase(),label:s};}return{};};h.prototype._getHeaderTag=function(o){if(o&&o.getHeaderRole()!==A.None){return h.DIV;}return h.HEADER;};h.prototype._getFooterTag=function(o){if(o&&o.getFooterRole()!==A.None){return h.DIV;}return h.FOOTER;};return h;});
