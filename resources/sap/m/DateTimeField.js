/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/model/type/Date','sap/ui/model/odata/type/ODataType','./InputBase','sap/ui/core/LocaleData','sap/ui/core/library','sap/ui/core/format/DateFormat','./DateTimeFieldRenderer',"sap/base/util/deepEqual","sap/base/Log","sap/ui/thirdparty/jquery","sap/ui/dom/jquery/cursorPos"],function(S,O,I,L,c,D,a,d,b,q){"use strict";var C=c.CalendarType;var e=I.extend("sap.m.DateTimeField",{metadata:{"abstract":true,library:"sap.m",properties:{displayFormat:{type:"string",group:"Appearance",defaultValue:null},valueFormat:{type:"string",group:"Data",defaultValue:null},dateValue:{type:"object",group:"Data",defaultValue:null},initialFocusedDateValue:{type:"object",group:"Data",defaultValue:null}}}});e.prototype.setValue=function(v){v=this.validateProperty("value",v);var o=this.getValue();if(v===o){return this;}else{this._lastValue=v;}this.setProperty("value",v);this._bValid=true;var f;if(v){f=this._parseValue(v);if(!f||f.getTime()<this._oMinDate.getTime()||f.getTime()>this._oMaxDate.getTime()){this._bValid=false;b.warning("Value can not be converted to a valid date",this);}}this.setProperty("dateValue",f);if(this.getDomRef()){var s;if(f){s=this._formatValue(f);}else{s=v;}if(this._$input.val()!==s){this._$input.val(s);this._curpos=this._$input.cursorPos();}}return this;};e.prototype.setDateValue=function(o){if(this._isValidDate(o)){throw new Error("Date must be a JavaScript date object; "+this);}if(d(this.getDateValue(),o)){return this;}o=this._dateValidation(o);var v=this._formatValue(o,true);if(v!==this.getValue()){this._lastValue=v;}this.setProperty("value",v);if(this.getDomRef()){var s=this._formatValue(o);if(this._$input.val()!==s){this._$input.val(s);this._curpos=this._$input.cursorPos();}}return this;};e.prototype.setValueFormat=function(v){this.setProperty("valueFormat",v,true);var V=this.getValue();if(V){this._handleDateValidation(this._parseValue(V));}return this;};e.prototype.setDisplayFormat=function(s){this.setProperty("displayFormat",s,true);this.updateDomValue(this._formatValue(this.getDateValue()));this._updateDomPlaceholder(this._getPlaceholder());return this;};e.prototype.getDisplayFormatType=function(){return null;};e.prototype._dateValidation=function(o){this._bValid=true;this.setProperty("dateValue",o);return o;};e.prototype._handleDateValidation=function(o){this._bValid=true;this.setProperty("dateValue",o);};e.prototype._getPlaceholder=function(){var p=this.getPlaceholder();if(!p){p=this._getDisplayFormatPattern();if(!p){p=this._getDefaultDisplayStyle();}if(this._checkStyle(p)){p=this._getLocaleBasedPattern(p);}}return p;};e.prototype._getLocaleBasedPattern=function(p){return L.getInstance(sap.ui.getCore().getConfiguration().getFormatSettings().getFormatLocale()).getDatePattern(p);};e.prototype._parseValue=function(v,f){return this._getFormatter(f).parse(v);};e.prototype._formatValue=function(o,v){if(o){return this._getFormatter(!v).format(o);}return"";};e.prototype._getDefaultDisplayStyle=function(){return"medium";};e.prototype._getDefaultValueStyle=function(){return"short";};e.prototype._getFormatter=function(f){var p=this._getBoundValueTypePattern(),r=false,F,B=this.getBinding("value"),s;if(B&&B.oType&&B.oType.oOutputFormat){r=!!B.oType.oOutputFormat.oFormatOptions.relative;s=B.oType.oOutputFormat.oFormatOptions.calendarType;}if(!p){if(f){p=(this.getDisplayFormat()||this._getDefaultDisplayStyle());s=this.getDisplayFormatType();}else{p=(this.getValueFormat()||this._getDefaultValueStyle());s=C.Gregorian;}}if(!s){s=sap.ui.getCore().getConfiguration().getCalendarType();}if(f){if(p===this._sUsedDisplayPattern&&s===this._sUsedDisplayCalendarType){F=this._oDisplayFormat;}}else{if(p===this._sUsedValuePattern&&s===this._sUsedValueCalendarType){F=this._oValueFormat;}}if(F){return F;}return this._getFormatterInstance(F,p,r,s,f);};e.prototype._getFormatterInstance=function(f,p,r,s,g){if(this._checkStyle(p)){f=this._getFormatInstance({style:p,strictParsing:true,relative:r,calendarType:s},g);}else{f=this._getFormatInstance({pattern:p,strictParsing:true,relative:r,calendarType:s},g);}if(g){this._sUsedDisplayPattern=p;this._sUsedDisplayCalendarType=s;this._oDisplayFormat=f;}else{this._sUsedValuePattern=p;this._sUsedValueCalendarType=s;this._oValueFormat=f;}return f;};e.prototype._getFormatInstance=function(A,f){return D.getInstance(A);};e.prototype._checkStyle=function(p){return(p==="short"||p==="medium"||p==="long"||p==="full");};e.prototype._getDisplayFormatPattern=function(){var p=this._getBoundValueTypePattern();if(p){return p;}p=this.getDisplayFormat();if(this._checkStyle(p)){p=this._getLocaleBasedPattern(p);}return p;};e.prototype._getBoundValueTypePattern=function(){var B=this.getBinding("value"),o=B&&B.getType&&B.getType();if(o instanceof S){return o.getOutputPattern();}if(o instanceof O&&o.oFormat){return o.oFormat.oFormatOptions.pattern;}return undefined;};e.prototype._isValidDate=function(o){return o&&q.type(o)!=="date";};e.prototype._updateDomPlaceholder=function(v){if(this.getDomRef()){this._$input.attr("placeholder",v);}};return e;});
