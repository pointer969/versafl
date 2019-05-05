/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/core/Control'],function(C){"use strict";return C.extend("sap.ui.documentation.sdk.controls.LightTable",{metadata:{properties:{columnTitles:{type:"string[]"},columnCount:{type:"int"}},defaultAggregation:"rows",aggregations:{rows:{type:"sap.ui.documentation.sdk.controls.Row",multiple:true}}},renderer:function(r,c){var R=c.getRows(),b,d=c.getColumnTitles(),l,a,L,i;r.write("<div");r.writeControlData(c);r.addClass("sapUiDocLightTable");r.addClass("columns-"+c.getColumnCount());r.writeClasses();r.write(">");r.write("<div class='head'>");for(i=0,L=d.length;i<L;i++){r.write("<div class='cell'>");r.writeEscaped(d[i]);r.write("</div>");}r.write("</div>");for(i=0,L=R.length;i<L;i++){r.write("<div class='row'>");b=R[i].getContent();for(a=0,l=b.length;a<l;a++){r.write("<div class='cell'>");if(a>0){r.write("<div class='inTitle'>");r.writeEscaped(d[a]);r.write(":</div>");}r.renderControl(b[a]);r.write("</div>");}r.write("</div>");}r.write("</div>");}});});
