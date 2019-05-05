/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/thirdparty/URI','sap/ui/Device','sap/ui/performance/trace/Passport','sap/ui/performance/trace/Interaction','sap/ui/performance/XHRInterceptor','sap/base/util/Version'],function(U,D,P,I,X,V){"use strict";var f=false,R=P.getRootId(),C=P.createGUID().substr(-8,8)+R,H=window.location.host,a=D.os.name+"_"+D.os.version,b=D.browser.name+"_"+D.browser.version,c=g(),A="",s="",F,S=0,d,e;function g(){var p=0;if(D.system.combi){p=1;}else if(D.system.desktop){p=2;}else if(D.system.tablet){p=4;}else if(D.system.phone){p=3;}return p;}function h(t){var p=new Date(t);return p.toISOString().replace(/[^\d]/g,'');}function i(u){var p=new U(u).host();return p&&p!==H;}function r(){X.register("PASSPORT_HEADER","open",function(){if(!i(arguments[1])){var p=I.getPending();if(p){if(s!=p.appVersion){s=p.appVersion;A=s?m(s):"";}}this.setRequestHeader("SAP-PASSPORT",P.header(P.traceFlags(),R,P.getTransactionId(),p?p.component+A:undefined,p?p.trigger+"_"+p.event+"_"+S:undefined));}});X.register("FESR","open",function(){if(!i(arguments[1])){if(!F){F=P.getTransactionId();}if(d){this.setRequestHeader("SAP-Perf-FESRec",d);this.setRequestHeader("SAP-Perf-FESRec-opt",e);d=null;e=null;F=P.getTransactionId();}}});}function j(p,q){return[l(R,32),l(F,32),l(p.navigation,16),l(p.roundtrip,16),l(q.timeToInteractive,16),l(p.completeRoundtrips,8),l(C,40),l(p.networkTime,16),l(p.requestTime,16),l(a,20),"SAP_UI5"].join(",");}function k(p,q){return[l(q.appNameShort,20,true),l(q.stepName,20,true),"",l(b,20),l(p.bytesSent,16),l(p.bytesReceived,16),"","",l(p.processing,16),p.requestCompression?"X":"","","","","",l(p.busyDuration,16),"",l(c,1),"",l(h(p.start),20),l(q.appNameLong,70,true)].join(",");}function l(v,L,p){if(!v){v=v===0?"0":"";}else if(typeof v==="number"){var q=v;v=Math.round(v).toString();if(v.length>L||q<0){v="-1";}}else{v=p?v.substr(-L,L):v.substr(0,L);}return v;}function m(v){var p=new V(v);return"@"+p.getMajor()+"."+p.getMinor()+"."+p.getPatch();}function n(p,q){d=j(p,q);e=k(p,q);}var o={};o.setActive=function(p){if(p&&!f){f=true;P.setActive(true);I.setActive(true);r();I.onInteractionFinished=function(q,t){var u=o.onBeforeCreated({stepName:q.trigger+"_"+q.event,appNameLong:q.stepComponent||q.component,appNameShort:q.stepComponent||q.component,timeToInteractive:q.duration},q);if(q.requests.length>0||t){n(q,u);}S++;};}else if(!p&&f){f=false;I.setActive(false);X.unregister("FESR","open");if(X.isRegistered("PASSPORT_HEADER","open")){X.register("PASSPORT_HEADER","open",function(){this.setRequestHeader("SAP-PASSPORT",P.header(P.traceFlags(),R,P.getTransactionId()));});}I.onInteractionFinished=null;}};o.getActive=function(){return f;};o.onBeforeCreated=function(p,q){return{stepName:p.stepName,appNameLong:p.appNameLong,appNameShort:p.appNameShort,timeToInteractive:p.timeToInteractive};};return o;});
