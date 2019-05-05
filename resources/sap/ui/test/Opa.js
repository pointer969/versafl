/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/Device',"sap/ui/thirdparty/jquery",'sap/ui/test/_LogCollector','sap/ui/test/_OpaLogger','sap/ui/test/_ParameterValidator','sap/ui/test/_UsageReport','sap/ui/test/_OpaUriParameterParser'],function(D,$,_,a,b,c,d){"use strict";var l=a.getLogger("sap.ui.test.Opa"),L=_.getInstance(),q=[],e={},t=-1,s,Q,i,f,v=new b({errorPrefix:"sap.ui.test.Opa#waitFor"});L.start();function g(C,u){if(window["sap-ui-debug"]){u.timeout=u.debugTimeout;}var w=new Date();x();function x(){l.timestamp("opa.check");L.getAndClearLog();var R=C();f=u._stack;if(R.error){Q.reject(u);return;}if(R.result){h();return;}var P=(new Date()-w)/1000;if(u.timeout===0||u.timeout>P){t=setTimeout(x,u.pollingInterval);return;}m("Opa timeout after "+u.timeout+" seconds",u);if(u.error){try{u.error(u,R.arguments);}finally{Q.reject(u);}}else{Q.reject(u);}}}function h(){if(!q.length){if(Q){Q.resolve();}return true;}var u=q.shift();t=setTimeout(function(){g(u.callback,u.options);},(O.config.asyncPolling?u.options.pollingInterval:0)+O.config.executionDelay);}function j(w,N){var u=w.get();if(u){var x=q.splice(q.length-u,u);x.forEach(function(y){y.options._nestedIn=N;});q=x.concat(q);}}function k(E){var u=E.toString();if(E.stack){u+="\n"+E.stack;}var w="Exception thrown by the testcode:'"+u+"'";return w;}function m(E,u,w){var x=L.getAndClearLog();if(x){E+="\nThis is what Opa logged:\n"+x;}if(!w&&u._stack){E+=o(u);}if(u.errorMessage){u.errorMessage+="\n"+E;}else{u.errorMessage=E;}l.error(u.errorMessage,"Opa");}function n(u){u=(u||0)+2;if(D.browser.mozilla){u=u-1;}var E=new Error(),w=E.stack;if(!w){try{throw E();}catch(x){w=x.stack;}}if(!w){return"";}w=w.split("\n");w.splice(0,u);return w.join("\n");}function o(u){var R="\nCallstack:\n";if(u._stack){R+=u._stack;delete u._stack;}else{R+="Unknown";}if(u._nestedIn){R+=o(u._nestedIn);delete u._nestedIn;}return R;}var O=function(u){this.and=this;$.extend(this,u);};O.config={};O.extendConfig=function(u){var C=["actions","assertions","arrangements"];C.filter(function(A){return!!u[A];}).forEach(function(A){var N=u[A];var w=Object.getPrototypeOf(u[A]);var x=O.config[A];var y=Object.getPrototypeOf(O.config[A]);for(var K in x){if(!(K in N)){N[K]=x[K];}}for(var P in y){if(!(P in N)){w[P]=y[P];}}});O.config=$.extend(true,O.config,u,p);a.setLevel(O.config.logLevel);};var p=d._getOpaParams();var r=0;var I=D.browser.safari&&!D.browser.phantomJS;if(D.browser.msie||D.browser.edge||I){r=50;}O.resetConfig=function(){O.config=$.extend({arrangements:new O(),actions:new O(),assertions:new O(),timeout:15,pollingInterval:400,debugTimeout:0,_stackDropCount:0,executionDelay:r,asyncPolling:false},p);};O.getContext=function(){return e;};O.emptyQueue=function emptyQueue(){if(i){throw new Error("Opa is emptying its queue. Calling Opa.emptyQueue() is not supported at this time.");}i=true;s=null;Q=$.Deferred();h();return Q.promise().fail(function(u){q=[];if(s){var E=s.qunitTimeout?"QUnit timeout after "+s.qunitTimeout+" seconds":"Queue was stopped manually";u._stack=s.qunitTimeout&&f||n(1);m(E,u);}}).always(function(){q=[];t=-1;Q=null;f=null;i=false;});};O.stopQueue=function stopQueue(){O._stopQueue();};O._stopQueue=function(u){q=[];if(!Q){l.warning("stopQueue was called before emptyQueue, queued tests have never been executed","Opa");}else{if(t!==-1){clearTimeout(t);}s=u||{};Q.reject(s);}};O.resetConfig();O._usageReport=new c(O.config);a.setLevel(O.config.logLevel);O.prototype={getContext:O.getContext,waitFor:function(u){var w=$.Deferred(),F=O._createFilteredConfig(O._aConfigValuesForWaitFor);u=$.extend({},F,u);this._validateWaitFor(u);u._stack=n(1+u._stackDropCount);delete u._stackDropCount;var x=$.extend({},this);w.promise(x);q.push({callback:function(){var C=true;if(u.check){try{C=u.check.apply(this,arguments);}catch(E){var y="Failure in Opa check function\n"+k(E);m(y,u,E.stack);w.reject(u);return{error:true,arguments:arguments};}}if(s){return{result:true,arguments:arguments};}if(!C){return{result:false,arguments:arguments};}if(u.success){var W=O._getWaitForCounter();try{u.success.apply(this,arguments);}catch(E){var y="Failure in Opa success function\n"+k(E);m(y,u,E.stack);w.reject(u);return{error:true,arguments:arguments};}finally{j(W,u);}}w.resolve();return{result:true,arguments:arguments};}.bind(this),options:u});return x;},extendConfig:O.extendConfig,emptyQueue:O.emptyQueue,iWaitForPromise:function(P){return this._schedulePromiseOnFlow(P);},_schedulePromiseOnFlow:function(P,u){u=u||{};var w={};u.check=function(){if(!w.started){w.started=true;P.then(function(){w.done=true;},function(x){w.errorMessage="Error while waiting for promise scheduled on flow"+(x?", details: "+x:"");});}if(w.errorMessage){throw new Error(w.errorMessage);}else{return!!w.done;}};return this.waitFor(u);},_validateWaitFor:function(P){v.validate({validationInfo:O._validationInfo,inputToValidate:P});}};O._createFilteredOptions=function(A,S){var F={};A.forEach(function(K){var C=S[K];if(C===undefined){return;}F[K]=C;});return F;};O._createFilteredConfig=function(A){return O._createFilteredOptions(A,O.config);};O._getWaitForCounter=function(){var u=q.length;return{get:function(){var w=q.length-u;return Math.max(w,0);}};};O._aConfigValuesForWaitFor=["errorMessage","timeout","debugTimeout","pollingInterval","_stackDropCount","asyncPolling"];O._validationInfo={error:"func",check:"func",success:"func",timeout:"numeric",debugTimeout:"numeric",pollingInterval:"numeric",_stackDropCount:"numeric",errorMessage:"string",asyncPolling:"bool"};return O;},true);
