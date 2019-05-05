/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/core/Control'],function(C){"use strict";return C.extend("sap.ui.documentation.sdk.controls.BorrowedList",{metadata:{properties:{list:{type:"array"}}},renderer:function(r,c){var l=c.getList(),I,L,i;r.write("<div");r.writeControlData(c);r.write(">");for(i=0,L=l.length;i<L;i++){I=l[i];r.write(['<a href="',I.link,'" role="link" tabindex="0" class="sapMLnk sapMLnkMaxWidth sapUiTinyMargin">',I.name,'</a>'].join(""));}r.write("</div>");}});});
