/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/core/library','sap/ui/core/ValueStateSupport','sap/ui/Device'],function(c,V,D){"use strict";var a=c.ValueState;var C={};C.render=function(r,o){var i=o.getId(),e=o.getEnabled(),d=o.getDisplayOnly(),E=o.getEditable(),I=e&&!d,b=e&&d,f=o.getAggregation("_label"),v=o.getValueState(),g=a.Error===v,h=a.Warning===v,j=a.Success===v,k=a.Information===v,u=o.getUseEntireWidth();r.write("<div");r.addClass("sapMCb");if(!E){r.addClass("sapMCbRo");}if(b){r.addClass("sapMCbDisplayOnly");}if(!e){r.addClass("sapMCbBgDis");}if(g){r.addClass("sapMCbErr");}else if(h){r.addClass("sapMCbWarn");}else if(j){r.addClass("sapMCbSucc");}else if(k){r.addClass("sapMCbInfo");}if(o.getText()){r.addClass("sapMCbHasLabel");}if(o.getWrapping()){r.addClass("sapMCbWrapped");}r.writeControlData(o);r.writeClasses();if(u){r.addStyle("width",o.getWidth());r.writeStyles();}var t=V.enrichTooltip(o,o.getTooltip_AsString());if(t){r.writeAttributeEscaped("title",t);}if(I){r.writeAttribute("tabindex",o.getTabIndex());}r.writeAccessibilityState(o,{role:"checkbox",selected:null,checked:o._getAriaChecked(),describedby:t?i+"-Descr":undefined});if(b){r.writeAttribute("aria-readonly",true);}r.write(">");r.write("<div id='");r.write(o.getId()+"-CbBg'");r.addClass("sapMCbBg");if(I&&E&&D.system.desktop){r.addClass("sapMCbHoverable");}if(!o.getActiveHandling()){r.addClass("sapMCbActiveStateOff");}r.addClass("sapMCbMark");if(o.getSelected()){r.addClass("sapMCbMarkChecked");}if(o.getPartiallySelected()){r.addClass("sapMCbMarkPartiallyChecked");}r.writeClasses();r.write(">");r.write("<input type='CheckBox' id='");r.write(o.getId()+"-CB'");if(o.getSelected()){r.writeAttribute("checked","checked");}if(o.getName()){r.writeAttributeEscaped('name',o.getName());}if(!e){r.write(" disabled=\"disabled\"");}if(!E){r.write(" readonly=\"readonly\"");}r.write(" /></div>");r.renderControl(f);if(t&&sap.ui.getCore().getConfiguration().getAccessibility()){r.write("<span id=\""+i+"-Descr\" class=\"sapUiHidden\">");r.writeEscaped(t);r.write("</span>");}r.write("</div>");};return C;},true);
