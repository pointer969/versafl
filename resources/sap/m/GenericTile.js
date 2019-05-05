/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['./library','sap/ui/core/Control','sap/m/Text','sap/ui/core/HTML','sap/ui/core/Icon','sap/ui/core/IconPool','sap/m/Button','sap/m/GenericTileRenderer','sap/m/GenericTileLineModeRenderer','sap/ui/Device','sap/ui/core/ResizeHandler',"sap/base/strings/camelize","sap/base/util/deepEqual","sap/ui/events/PseudoEvents","sap/ui/thirdparty/jquery"],function(l,C,T,H,I,a,B,G,L,D,R,c,d,P,q){"use strict";var b=l.GenericTileScope,e=l.LoadState,F=l.FrameType,S=l.Size,f=l.GenericTileMode,g=l.TileSizeBehavior,W=l.WrappingType;var h="GenericTileDeviceSet";var j=C.extend("sap.m.GenericTile",{metadata:{library:"sap.m",properties:{mode:{type:"sap.m.GenericTileMode",group:"Appearance",defaultValue:f.ContentMode},header:{type:"string",group:"Appearance",defaultValue:null},subheader:{type:"string",group:"Appearance",defaultValue:null},failedText:{type:"string",group:"Appearance",defaultValue:null},size:{type:"sap.m.Size",group:"Misc",defaultValue:S.Auto},frameType:{type:"sap.m.FrameType",group:"Misc",defaultValue:F.OneByOne},backgroundImage:{type:"sap.ui.core.URI",group:"Misc",defaultValue:null},headerImage:{type:"sap.ui.core.URI",group:"Misc",defaultValue:null},state:{type:"sap.m.LoadState",group:"Misc",defaultValue:e.Loaded},imageDescription:{type:"string",group:"Accessibility",defaultValue:null},scope:{type:"sap.m.GenericTileScope",group:"Misc",defaultValue:b.Display},sizeBehavior:{type:"sap.m.TileSizeBehavior",defaultValue:g.Responsive},ariaLabel:{type:"string",group:"Accessibility",defaultValue:null},wrappingType:{type:"sap.m.WrappingType",group:"Appearance",defaultValue:W.Normal}},defaultAggregation:"tileContent",aggregations:{tileContent:{type:"sap.m.TileContent",multiple:true,bindable:"bindable"},icon:{type:"sap.ui.core.Control",multiple:false},_titleText:{type:"sap.m.Text",multiple:false,visibility:"hidden"},_failedMessageText:{type:"sap.m.Text",multiple:false,visibility:"hidden"}},events:{press:{parameters:{scope:{type:"sap.m.GenericTileScope"},action:{type:"string"},domRef:{type:"any"}}}}},renderer:function(r,o){if(o.getMode()===l.GenericTileMode.LineMode){L.render(r,o);}else{G.render(r,o);}}});j._Action={Press:"Press",Remove:"Remove"};j.LINEMODE_SIBLING_PROPERTIES=["state","subheader","header","scope"];j.prototype.init=function(){this._oRb=sap.ui.getCore().getLibraryResourceBundle("sap.m");if(!D.media.hasRangeSet(h)){D.media.initRangeSet(h,[450],"px",["small","large"]);}this._oTitle=new T(this.getId()+"-title");this._oTitle.addStyleClass("sapMGTTitle");this._oTitle.cacheLineHeight=false;this.setAggregation("_titleText",this._oTitle,true);this._oSubTitle=new T(this.getId()+"-subTitle");this._oSubTitle.cacheLineHeight=false;this.addDependent(this._oSubTitle);this._sFailedToLoad=this._oRb.getText("INFOTILE_CANNOT_LOAD_TILE");this._sLoading=this._oRb.getText("INFOTILE_LOADING");this._oFailedText=new T(this.getId()+"-failed-txt",{maxLines:2});this._oFailedText.cacheLineHeight=false;this._oFailedText.addStyleClass("sapMGTFailed");this.setAggregation("_failedMessageText",this._oFailedText,true);this._oWarningIcon=new I(this.getId()+"-warn-icon",{src:"sap-icon://notification",size:"1.375rem"});this._oWarningIcon.addStyleClass("sapMGTFtrFldIcnMrk");this._oBusy=new H(this.getId()+"-overlay");this._oBusy.setBusyIndicatorDelay(0);this._bTilePress=true;this._bThemeApplied=true;if(!sap.ui.getCore().isInitialized()){this._bThemeApplied=false;sap.ui.getCore().attachInit(this._handleCoreInitialized.bind(this));}else{this._handleCoreInitialized();}};j.prototype.setWrappingType=function(w){this.setProperty("wrappingType",w,true);this._oTitle.setWrappingType(w);this._oFailedText.setWrappingType(w);this._oSubTitle.setWrappingType(w);return this;};j.prototype.setSubheader=function(s){this.setProperty("subheader",s);this._oSubTitle.setText(s);return this;};j.prototype._handleCoreInitialized=function(){this._bThemeApplied=sap.ui.getCore().isThemeApplied();if(!this._bThemeApplied){sap.ui.getCore().attachThemeChanged(this._handleThemeApplied,this);}};j.prototype._handleThemeApplied=function(){this._bThemeApplied=true;this._oTitle.clampHeight();sap.ui.getCore().detachThemeChanged(this._handleThemeApplied,this);};j.prototype._initScopeContent=function(t){switch(this.getScope()){case l.GenericTileScope.Actions:if(this.getState&&this.getState()===l.LoadState.Disabled){break;}this._oMoreIcon=this._oMoreIcon||a.createControlByURI({id:this.getId()+"-action-more",size:"1rem",useIconTooltip:false,src:"sap-icon://overflow"}).addStyleClass("sapMPointer").addStyleClass(t+"MoreIcon");this._oRemoveButton=this._oRemoveButton||new B({id:this.getId()+"-action-remove",icon:"sap-icon://decline",tooltip:this._oRb.getText("GENERICTILE_REMOVEBUTTON_TEXT")}).addStyleClass("sapUiSizeCompact").addStyleClass(t+"RemoveButton");this._oRemoveButton._bExcludeFromTabChain=true;break;default:}};j.prototype.exit=function(){if(this._sParentResizeListenerId){R.deregister(this._sResizeListenerId);this._sParentResizeListenerId=null;}D.media.detachHandler(this._handleMediaChange,this,h);if(this._$RootNode){this._$RootNode.off(this._getAnimationEvents());this._$RootNode=null;}this._clearAnimationUpdateQueue();this._oWarningIcon.destroy();if(this._oImage){this._oImage.destroy();}this._oBusy.destroy();if(this._oMoreIcon){this._oMoreIcon.destroy();}if(this._oRemoveButton){this._oRemoveButton.destroy();}};j.prototype.onBeforeRendering=function(){var s=!!this.getSubheader();if(this.getMode()===l.GenericTileMode.HeaderMode){this._applyHeaderMode(s);}else{this._applyContentMode(s);}var t=this.getTileContent().length;for(var i=0;i<t;i++){this.getTileContent()[i].setDisabled(this.getState()===l.LoadState.Disabled);}this._initScopeContent("sapMGT");this._generateFailedText();this.$().unbind("mouseenter");this.$().unbind("mouseleave");if(this._sParentResizeListenerId){R.deregister(this._sResizeListenerId);this._sParentResizeListenerId=null;}D.media.detachHandler(this._handleMediaChange,this,h);if(this._$RootNode){this._$RootNode.off(this._getAnimationEvents());}if(this.getFrameType()===l.FrameType.Auto){this.setProperty("frameType",l.FrameType.OneByOne,true);}};j.prototype.onAfterRendering=function(){this._setupResizeClassHandler();this.$().bind("mouseenter",this._updateAriaAndTitle.bind(this));this.$().bind("mouseleave",this._removeTooltipFromControl.bind(this));var m=this.getMode();if(m===l.GenericTileMode.LineMode&&this._isScreenLarge()){this.$().parent().addClass("sapMGTLineModeContainer");this._updateHoverStyle(true);if(this.getParent()instanceof C){this._sParentResizeListenerId=R.register(this.getParent(),this._handleResize.bind(this));}else{this._sParentResizeListenerId=R.register(this.$().parent(),this._handleResize.bind(this));}}if(m===l.GenericTileMode.LineMode&&this._bUpdateLineTileSiblings){this._updateLineTileSiblings();this._bUpdateLineTileSiblings=false;}if(m===l.GenericTileMode.LineMode){D.media.attachHandler(this._handleMediaChange,this,h);}};j.prototype._handleResize=function(){if(this.getMode()===l.GenericTileMode.LineMode&&this._isScreenLarge()&&this.getParent()){this._queueAnimationEnd();}};j.prototype._setupResizeClassHandler=function(){var i=function(){if(this.getSizeBehavior()===g.Small||window.matchMedia("(max-width: 374px)").matches){this.$().addClass("sapMTileSmallPhone");}else{this.$().removeClass("sapMTileSmallPhone");}}.bind(this);q(window).resize(i);i();};j.prototype._isCompact=function(){return q("body").hasClass("sapUiSizeCompact")||this.$().is(".sapUiSizeCompact")||this.$().closest(".sapUiSizeCompact").length>0;};j.prototype._calculateStyleData=function(){this.$("lineBreak").remove();if(!this._isScreenLarge()||!this.getDomRef()||this.$().is(":hidden")){return null;}var $=this.$(),E=this.$("endMarker"),s=this.$("startMarker");if(E.length===0||s.length===0){return null;}var k=this._getLineCount(),m,n,o=Math.ceil(L._getCSSPixelValue(this,"margin-top")),p,A=this.$().parent().innerWidth(),r=Math.ceil(L._getCSSPixelValue(this,"min-height")),t=L._getCSSPixelValue(this,"line-height"),u=this.$().is(":not(:first-child)")&&k>1,v=q("<span><br /></span>"),i=0,w=sap.ui.getCore().getConfiguration().getRTL(),x=E.position();if(u){v.attr("id",this.getId()+"-lineBreak");$.prepend(v);k=this._getLineCount();x=E.position();}var y={rtl:w,lineBreak:u,startOffset:s.offset(),endOffset:E.offset(),availableWidth:A,lines:[]};var z;if(D.browser.msie||D.browser.edge){z=v.find("br").position();}else{z=v.position();}var J=z;if(!(D.browser.mozilla||D.browser.msie||D.browser.edge)&&z.left<x.left){J=x;}y.positionLeft=u?z.left:$.position().left;y.positionRight=u?$.width()-J.left:y.availableWidth-$.position().left;if(!u&&k>1){y.positionRight=s.parent().innerWidth()-(s.position().left+s.width());}for(i;i<k;i++){if(u&&i===0){continue;}if(k===1){m=w?y.availableWidth-y.positionLeft:y.positionLeft;p=$.width();}else if(i===k-1){m=0;p=w?$.width()-x.left:x.left;}else if(u&&i===1){m=0;p=A;}else{m=0;p=A;}n=i*t+o;y.lines.push({offset:{x:m,y:n},width:p,height:r});}return y;};j.prototype._getStyleData=function(){var s=this._calculateStyleData();if(!d(this._oStyleData,s)){delete this._oStyleData;this._oStyleData=s;return true;}return false;};j.prototype._getAnimationEvents=function(){return"transitionend.sapMGT$id animationend.sapMGT$id".replace(/\$id/g,c(this.getId()));};j.prototype._updateHoverStyle=function(i){if(!this._getStyleData()&&!i){return;}this._clearAnimationUpdateQueue();this._cHoverStyleUpdates=-1;this._oAnimationEndCallIds={};if(this._oStyleData&&this._oStyleData.lineBreak&&this.getUIArea()){this._$RootNode=q(this.getUIArea().getRootNode());this._$RootNode.on(this._getAnimationEvents(),this._queueAnimationEnd.bind(this));}this._queueAnimationEnd();};j.prototype._queueAnimationEnd=function(E){if(E){var t=q(E.target);if(t.is(".sapMGT, .sapMGT *")){return false;}}if(typeof this._cHoverStyleUpdates!=="number"){this._cHoverStyleUpdates=-1;}if(!this._oAnimationEndCallIds){this._oAnimationEndCallIds={};}this._cHoverStyleUpdates++;this._oAnimationEndCallIds[this._cHoverStyleUpdates]=setTimeout(this._handleAnimationEnd.bind(this,this._cHoverStyleUpdates),10);};j.prototype._handleAnimationEnd=function(i){delete this._oAnimationEndCallIds[i];if(this._cHoverStyleUpdates===i){this._getStyleData();L._updateHoverStyle.call(this);}};j.prototype._clearAnimationUpdateQueue=function(){for(var k in this._oAnimationEndCallIds){clearTimeout(this._oAnimationEndCallIds[k]);delete this._oAnimationEndCallIds[k];}};j.prototype._getLineCount=function(){var o=this.getDomRef().getBoundingClientRect(),i=L._getCSSPixelValue(this,"line-height");return Math.round(o.height/i);};j.prototype.getBoundingRects=function(){var p=this.$().offset();if(this.getMode()===l.GenericTileMode.LineMode&&this._isScreenLarge()){this._getStyleData();var r=[],s,o;this.$().find(".sapMGTLineStyleHelper").each(function(){s=q(this);o=s.offset();r.push({offset:{x:o.left,y:o.top},width:s.width(),height:s.height()});});return r;}else{return[{offset:{x:p.left,y:p.top},width:this.$().width(),height:this.$().height()}];}};j.prototype._updateLineTileSiblings=function(){var p=this.getParent();if(this.getMode()===l.GenericTileMode.LineMode&&this._isScreenLarge()&&p){var i=p.indexOfAggregation(this.sParentAggregationName,this);var s=p.getAggregation(this.sParentAggregationName).splice(i+1);for(i=0;i<s.length;i++){var o=s[i];if(o instanceof l.GenericTile&&o.getMode()===l.GenericTileMode.LineMode){o._updateHoverStyle();}}}};j.prototype.ontouchstart=function(){if(this.$("hover-overlay").length>0){this.$("hover-overlay").addClass("sapMGTPressActive");}if(this.getMode()===l.GenericTileMode.LineMode){this.addStyleClass("sapMGTLineModePress");}};j.prototype.ontouchcancel=function(){if(this.$("hover-overlay").length>0){this.$("hover-overlay").removeClass("sapMGTPressActive");}};j.prototype.ontouchend=function(){if(this.$("hover-overlay").length>0){this.$("hover-overlay").removeClass("sapMGTPressActive");}if(this.getMode()===l.GenericTileMode.LineMode){this.removeStyleClass("sapMGTLineModePress");}};j.prototype.ontap=function(i){var p;if(this._bTilePress&&this.getState()!==l.LoadState.Disabled){this.$().focus();p=this._getEventParams(i);this.firePress(p);i.preventDefault();}};j.prototype.onkeydown=function(i){if(P.events.sapselect.fnCheck(i)&&this.getState()!==l.LoadState.Disabled){if(this.$("hover-overlay").length>0){this.$("hover-overlay").addClass("sapMGTPressActive");}i.preventDefault();}};j.prototype._updateAriaLabel=function(){var A=this._getAriaText(),t=this.$(),i=false;if(t.attr("aria-label")!==A){t.attr("aria-label",A);i=true;}return i;};j.prototype.onkeyup=function(i){var p,k=false,s=this.getScope(),A=s===l.GenericTileScope.Actions;if(A&&(P.events.sapdelete.fnCheck(i)||P.events.sapbackspace.fnCheck(i))){p={scope:s,action:j._Action.Remove,domRef:this._oRemoveButton.getPopupAnchorDomRef()};k=true;}if(P.events.sapselect.fnCheck(i)&&this.getState()!==l.LoadState.Disabled){if(this.$("hover-overlay").length>0){this.$("hover-overlay").removeClass("sapMGTPressActive");}p=this._getEventParams(i);k=true;}if(k){this.firePress(p);i.preventDefault();}this._updateAriaLabel();};j.prototype.setProperty=function(p){C.prototype.setProperty.apply(this,arguments);if(this.getMode()===l.GenericTileMode.LineMode&&j.LINEMODE_SIBLING_PROPERTIES.indexOf(p)!==-1){this._bUpdateLineTileSiblings=true;}return this;};j.prototype.getHeader=function(){return this._oTitle.getText();};j.prototype.setHeader=function(t){this.setProperty("header",t);this._oTitle.setText(t);return this;};j.prototype.setHeaderImage=function(u){var v=!d(this.getHeaderImage(),u);if(v){if(this._oImage){this._oImage.destroy();this._oImage=undefined;}if(u){this._oImage=a.createControlByURI({id:this.getId()+"-icon-image",src:u},l.Image);this._oImage.addStyleClass("sapMGTHdrIconImage");}}return this.setProperty("headerImage",u);};j.prototype._applyHeaderMode=function(s){if(s){this._oTitle.setMaxLines(4);}else{this._oTitle.setMaxLines(5);}this._changeTileContentContentVisibility(false);};j.prototype._applyContentMode=function(s){if(s){this._oTitle.setMaxLines(2);}else{this._oTitle.setMaxLines(3);}this._changeTileContentContentVisibility(true);};j.prototype._changeTileContentContentVisibility=function(v){var t;t=this.getTileContent();for(var i=0;i<t.length;i++){t[i].setRenderContent(v);}};j.prototype._getHeaderAriaAndTooltipText=function(){var t="";var i=true;if(this.getHeader()){t+=this.getHeader();i=false;}if(this.getSubheader()){t+=(i?"":"\n")+this.getSubheader();i=false;}if(this.getImageDescription()){t+=(i?"":"\n")+this.getImageDescription();}return t;};j.prototype._getContentAriaAndTooltipText=function(){var t="";var k=true;var m=this.getTileContent();for(var i=0;i<m.length;i++){if(q.isFunction(m[i]._getAriaAndTooltipText)){t+=(k?"":"\n")+m[i]._getAriaAndTooltipText();}else if(m[i].getTooltip_AsString()){t+=(k?"":"\n")+m[i].getTooltip_AsString();}k=false;}return t;};j.prototype._getAriaAndTooltipText=function(){var A=(this.getTooltip_AsString()&&!this._isTooltipSuppressed())?this.getTooltip_AsString():(this._getHeaderAriaAndTooltipText()+"\n"+this._getContentAriaAndTooltipText());switch(this.getState()){case l.LoadState.Disabled:return"";case l.LoadState.Loading:return A+"\n"+this._sLoading;case l.LoadState.Failed:return A+"\n"+this._oFailedText.getText();default:if(q.trim(A).length===0){return"";}else{return A;}}};j.prototype._getAriaText=function(){var A=this.getTooltip_Text();var s=this.getAriaLabel();if(!A||this._isTooltipSuppressed()){A=this._getAriaAndTooltipText();}if(this.getScope()===l.GenericTileScope.Actions){A=this._oRb.getText("GENERICTILE_ACTIONS_ARIA_TEXT")+" "+A;}if(s){A=s+" "+A;}return A;};j.prototype._getTooltipText=function(){var t=this.getTooltip_Text();if(this._isTooltipSuppressed()===true){t=null;}return t;};j.prototype._checkFooter=function(t,i){var s=i.getState();var A=this.getScope()===l.GenericTileScope.Actions||this._bShowActionsView===true;if(s===l.LoadState.Failed||A&&s!==l.LoadState.Disabled){t.setRenderFooter(false);}else{t.setRenderFooter(true);}};j.prototype._generateFailedText=function(){var s=this.getFailedText();var i=s?s:this._sFailedToLoad;this._oFailedText.setText(i);this._oFailedText.setTooltip(i);};j.prototype._isTooltipSuppressed=function(){var t=this.getTooltip_Text();if(t&&t.length>0&&q.trim(t).length===0){return true;}else{return false;}};j.prototype._isHeaderTextTruncated=function(){var o,m,$,w;if(this.getMode()===l.GenericTileMode.LineMode){$=this.$("hdr-text");if($.length>0){w=Math.ceil($[0].getBoundingClientRect().width);return($[0]&&w<$[0].scrollWidth);}else{return false;}}else{o=this.getAggregation("_titleText").getDomRef("inner");m=this.getAggregation("_titleText").getClampHeight(o);return(m<o.scrollHeight);}};j.prototype._isSubheaderTextTruncated=function(){var s;if(this.getMode()===l.GenericTileMode.LineMode){s=this.$("subHdr-text");}else{s=this.$("subTitle");}if(s.length>0){var w=Math.ceil(s[0].getBoundingClientRect().width);return(s[0]&&w<s[0].scrollWidth);}else{return false;}};j.prototype._setTooltipFromControl=function(){var t="";var i=true;var k=this.getTileContent();if(this._oTitle.getText()){t=this._oTitle.getText();i=false;}if(this.getSubheader()){t+=(i?"":"\n")+this.getSubheader();i=false;}if(this.getScope()!==l.GenericTileScope.Actions&&this.getMode()!==l.GenericTileMode.LineMode){if(k[0]&&k[0].getTooltip_AsString()&&k[0].getTooltip_AsString()!==""){t+=(i?"":"\n")+k[0].getTooltip_AsString();i=false;}if(this.getFrameType()==="TwoByOne"&&k[1]&&k[1].getTooltip_AsString()&&k[1].getTooltip_AsString()!==""){t+=(i?"":"\n")+k[1].getTooltip_AsString();}}if(t&&!this._getTooltipText()&&!this._isTooltipSuppressed()){this.$().attr("title",t.trim());this._bTooltipFromControl=true;}};j.prototype._updateAriaAndTitle=function(){var A=this._getAriaAndTooltipText();var s=this._getAriaText();var t=this.$();if(t.attr("title")!==A){t.attr("aria-label",s);}if(this.getScope()===l.GenericTileScope.Actions){t.find('*:not(.sapMGTRemoveButton)').removeAttr("aria-label").removeAttr("title").unbind("mouseenter");}else{t.find('*').removeAttr("aria-label").removeAttr("title").unbind("mouseenter");}this._setTooltipFromControl();};j.prototype._removeTooltipFromControl=function(){if(this._bTooltipFromControl){this.$().removeAttr("title");this._bTooltipFromControl=false;}};j.prototype._isScreenLarge=function(){return this._getCurrentMediaContainerRange(h).name==="large";};j.prototype._getEventParams=function(E){var p,A=j._Action.Press,s=this.getScope(),o=this.getDomRef();if(s===l.GenericTileScope.Actions&&E.target.id.indexOf("-action-remove")>-1){A=j._Action.Remove;o=this._oRemoveButton.getPopupAnchorDomRef();}else if(s===l.GenericTileScope.Actions){o=this._oMoreIcon.getDomRef();}p={scope:s,action:A,domRef:o};return p;};j.prototype._handleMediaChange=function(){this._bUpdateLineTileSiblings=true;this.invalidate();};j.prototype.setPressEnabled=function(v){this._bTilePress=v;};j.prototype.showActionsView=function(v){if(this._bShowActionsView!==v){this._bShowActionsView=v;this.invalidate();}};return j;});
