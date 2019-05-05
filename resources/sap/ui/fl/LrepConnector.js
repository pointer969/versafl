/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/thirdparty/jquery","sap/ui/thirdparty/URI","sap/ui/fl/Utils","sap/base/util/merge","sap/ui/dom/includeScript"],function(q,u,F,b,I){"use strict";var L=function(p){this._initClientParam();this._initLanguageParam();if(p){this._sXsrfToken=p.XsrfToken;}};L.createConnector=function(p){return new L(p);};L._bServiceAvailability=undefined;L._oLoadSettingsPromise=undefined;L.prototype._sClient=undefined;L.prototype._sLanguage=undefined;L.prototype._aSentRequestListeners=[];L.prototype._sRequestUrlPrefix="";L.DEFAULT_CONTENT_TYPE="application/json; charset=utf-8";L.ROUTES={CONTENT:"/content/",CSRF:"/actions/getcsrftoken/",PUBLISH:"/actions/publish/",DATA:"/flex/data/",MODULES:"/flex/modules/",SETTINGS:"/flex/settings"};L.isFlexServiceAvailable=function(){if(L._bServiceAvailability!==undefined){return Promise.resolve(L._bServiceAvailability);}return L.createConnector().loadSettings().then(function(){return Promise.resolve(L._bServiceAvailability);});};L.prototype._getFlexibilityServicesUrlPrefix=function(){return sap.ui.getCore().getConfiguration().getFlexibilityServices();};L.attachSentRequest=function(c){if(typeof c==="function"&&L.prototype._aSentRequestListeners.indexOf(c)===-1){L.prototype._aSentRequestListeners.push(c);}};L.detachSentRequest=function(c){var i=L.prototype._aSentRequestListeners.indexOf(c);if(i!==-1){L.prototype._aSentRequestListeners.splice(i,1);}};L.prototype._initClientParam=function(){var c=F.getClient();if(c){this._sClient=c;}};L.prototype._initLanguageParam=function(){var l;l=F.getUrlParameter("sap-language")||F.getUrlParameter("sap-ui-language");if(l){this._sLanguage=l;}};L.prototype.setRequestUrlPrefix=function(r){this._sRequestUrlPrefix=r;};L.prototype._resolveUrl=function(r){if(!r.startsWith("/")){r="/"+r;}r=this._sRequestUrlPrefix+r;var U=u(r).absoluteTo("");return U.toString();};L.prototype._getDefaultHeader=function(){return{headers:{"X-CSRF-Token":this._sXsrfToken||"fetch"}};};L.prototype._getDefaultOptions=function(m,c,d){var o;if(!c){c=L.DEFAULT_CONTENT_TYPE;}else if(c.indexOf("charset")===-1){c+="; charset=utf-8";}o=b(this._getDefaultHeader(),{type:m,async:true,contentType:c,processData:false,headers:{"Content-Type":c}});if(d&&o.contentType.indexOf("application/json")===0){o.dataType="json";if(typeof d==="object"){o.data=JSON.stringify(d);}else{o.data=d;}}else if(d){o.data=d;}if(m==="DELETE"){delete o.data;delete o.contentType;}return o;};L.prototype.send=function(U,m,d,o){m=m||"GET";m=m.toUpperCase();o=o||{};U=this._resolveUrl(U);o=b(this._getDefaultOptions(m,o.contentType,d),o);return this._sendAjaxRequest(U,o);};L.prototype._getMessagesFromXHR=function(x){var a,m,l,i;m=[];try{a=JSON.parse(x.responseText);if(a&&a.messages&&a.messages.length>0){l=a.messages.length;for(i=0;i<l;i++){m.push({severity:a.messages[i].severity,text:a.messages[i].text});}}}catch(e){}return m;};L.prototype._sendAjaxRequest=function(U,o){var f=this._getFlexibilityServicesUrlPrefix();if(!f){return Promise.reject({status:"warning",messages:[{"severity":"warning","text":"Flexibility Services requests were not sent. The UI5 bootstrap is configured to not send any requests."}]});}var s=f+L.ROUTES.CSRF;var m={headers:{"X-CSRF-Token":"fetch"},type:"HEAD"};if(this._sClient){m.headers["sap-client"]=this._sClient;}return new Promise(function(r,a){function h(e,S,x){var n=x.getResponseHeader("X-CSRF-Token");this._sXsrfToken=n||this._sXsrfToken;var E=x.getResponseHeader("etag");var g={status:S,etag:E,response:e};r(g);q.each(this._aSentRequestListeners,function(i,C){C(g);});}function c(e,S,x){this._sXsrfToken=x.getResponseHeader("X-CSRF-Token");o.headers=o.headers||{};o.headers["X-CSRF-Token"]=this._sXsrfToken;q.ajax(U,o).done(h).fail(function(x,S,E){var g=new Error(E);g.status="error";g.code=x.statusCode().status;g.messages=this._getMessagesFromXHR(x);a(g);}.bind(this));}function d(x){if(x.status===403){q.ajax(s,m).done(c).fail(function(){a({status:"error"});});}else{if(o&&o.type==="DELETE"&&x.status===404){r();}else{var e;e={status:"error",code:x.statusCode().status,messages:this._getMessagesFromXHR(x)};a(e);}}}var R=true;if(o&&o.type){if(o.type==="GET"||o.type==="HEAD"){R=false;}else if(this._sXsrfToken&&this._sXsrfToken!=="fetch"){R=false;}}if(R){q.ajax(s,m).done(c.bind(this)).fail(function(x){a({status:"error",code:x.statusCode().status,messages:this._getMessagesFromXHR(x)});}.bind(this));}else{q.ajax(U,o).done(h.bind(this)).fail(d.bind(this));}}.bind(this));};L.prototype.loadChanges=function(c,p){function _(p){var o={};if(p.cacheKey){o.cache=true;}if(p.siteId){if(!o.headers){o.headers={};}o.headers={"X-LRep-Site-Id":p.siteId};}if(p.appDescriptor){if(p.appDescriptor["sap.app"]){if(!o.headers){o.headers={};}o.headers={"X-LRep-AppDescriptor-Id":p.appDescriptor["sap.app"].id};}}return o;}function a(c,p,C){var U={};var f=this._getFlexibilityServicesUrlPrefix()+L.ROUTES.DATA;var s=this._getFlexibilityServicesUrlPrefix()+L.ROUTES.MODULES;var P="";if(p.cacheKey){P+="~"+p.cacheKey+"~/";}P+=c.name;if(p.layer){P+="&upToLayerType="+p.layer;}if(C){P+="&sap-client="+C;}if(c.appVersion&&(c.appVersion!==F.DEFAULT_APP_VERSION)){P+="&appVersion="+c.appVersion;}P=P.replace("&","?");U.flexDataUrl=U.flexDataUrl||f+P;U.flexModulesUrl=U.flexModulesUrl||s+P;return U;}p=p||{};if(!c.name){return Promise.reject(new Error("Component name not specified"));}var o=_(p);var U=a.call(this,c,p,this._sClient);return this.send(U.flexDataUrl,undefined,undefined,o).then(this._onChangeResponseReceived.bind(this,c.name,U.flexModulesUrl)).then(function(f){if(p.isTrial){return this.enableFakeConnectorForTrial(c,f);}return f;}.bind(this)).catch(function(e){if(e.code===404){L._bServiceAvailability=false;}throw(e);});};L.prototype.enableFakeConnectorForTrial=function(c,f){return new Promise(function(r){sap.ui.require(["sap/ui/fl/FakeLrepConnectorLocalStorage","sap/ui/fl/registry/Settings"],function(a,S){var s=S.getInstanceOrUndef()._oSettings;a.enableFakeConnector(s,c.name,c.appVersion,true);var o=L.createConnector();r(o.loadChanges(c.name,undefined,f.changes.changes));});});};L.prototype._onChangeResponseReceived=function(c,f,r){L._bServiceAvailability=true;var m={changes:r.response,loadModules:r.response.loadModules,messagebundle:r.response.messagebundle,componentClassName:c,etag:r.etag};if(!m.loadModules){return m;}return this._loadModules(f).then(function(){return m;});};L.prototype._loadModules=function(f){return new Promise(function(r,a){I(f,undefined,r,a);});};L.prototype.loadSettings=function(){if(!L._oLoadSettingsPromise){var U=this._getFlexibilityServicesUrlPrefix()+L.ROUTES.SETTINGS;if(this._sClient){U+="?sap-client="+this._sClient;}L._oLoadSettingsPromise=this.send(U,undefined,undefined,{});}return L._oLoadSettingsPromise.then(function(r){L._bServiceAvailability=true;return r.response;},function(e){if(e.code===404){L._bServiceAvailability=false;}return Promise.resolve();});};L.prototype._buildParams=function(p){if(!p){p=[];}if(this._sClient){p.push({name:"sap-client",value:this._sClient});}if(this._sLanguage){p.push({name:"sap-language",value:this._sLanguage});}var r="";var l=p.length;for(var i=0;i<l;i++){if(i===0){r+="?";}else if(i>0&&i<l){r+="&";}r+=p[i].name+"="+p[i].value;}return r;};L.prototype._getUrlPrefix=function(i){if(i){return this._getFlexibilityServicesUrlPrefix()+"/variants/";}return this._getFlexibilityServicesUrlPrefix()+"/changes/";};L.prototype.create=function(p,c,i){var r=this._getUrlPrefix(i);var P=[];if(c){P.push({name:"changelist",value:c});}r+=this._buildParams(P);return this.send(r,"POST",p,null);};L.prototype.update=function(p,c,C,i){var r=this._getUrlPrefix(i);r+=c;var P=[];if(C){P.push({name:"changelist",value:C});}r+=this._buildParams(P);return this.send(r,"PUT",p,null);};L.prototype.deleteChange=function(p,i){var r=this._getUrlPrefix(i);r+=p.sChangeName;var P=[];if(p.sLayer){P.push({name:"layer",value:p.sLayer});}if(p.sNamespace){P.push({name:"namespace",value:p.sNamespace});}if(p.sChangelist){P.push({name:"changelist",value:p.sChangelist});}r+=this._buildParams(P);return this.send(r,"DELETE",{},null);};L.prototype.resetChanges=function(p){var r=this._getUrlPrefix();var P=[];if(p.sReference){P.push({name:"reference",value:p.sReference});}if(p.sAppVersion){P.push({name:"appVersion",value:p.sAppVersion});}if(p.sLayer){P.push({name:"layer",value:p.sLayer});}if(p.sChangelist){P.push({name:"changelist",value:p.sChangelist});}if(p.sGenerator){P.push({name:"generator",value:p.sGenerator});}if(p.aSelectorIds){P.push({name:"selector",value:p.aSelectorIds.join(",")});}if(p.aChangeTypes){P.push({name:"changeType",value:p.aChangeTypes.join(",")});}r+=this._buildParams(P);return this.send(r,"DELETE");};L.prototype.getStaticResource=function(n,N,t,i){var r=this._getFlexibilityServicesUrlPrefix()+L.ROUTES.CONTENT;r+=n+"/"+N+"."+t;var p=[];if(!i){p.push({name:"dt",value:"true"});}r+=this._buildParams(p);return this.send(r,"GET",null,null);};L.prototype.getFileAttributes=function(n,N,t,l){var r=this._getFlexibilityServicesUrlPrefix()+L.ROUTES.CONTENT;r+=n+"/"+N+"."+t;var p=[];p.push({name:"metadata",value:"true"});if(l){p.push({name:"layer",value:l});}r+=this._buildParams(p);return this.send(r,"GET",null,null);};L.prototype.upsert=function(n,N,t,l,c,C,s){var a=this;return Promise.resolve(a._fileAction("PUT",n,N,t,l,c,C,s));};L.prototype.deleteFile=function(n,N,t,l,c){return this._fileAction("DELETE",n,N,t,l,null,null,c);};L.prototype._fileAction=function(m,n,N,t,l,c,C,s){var r=this._getFlexibilityServicesUrlPrefix()+L.ROUTES.CONTENT;r+=n+"/"+N+"."+t;var p=[];p.push({name:"layer",value:l});if(s){p.push({name:"changelist",value:s});}r+=this._buildParams(p);var o={contentType:C||L.DEFAULT_CONTENT_TYPE};return this.send(r,m.toUpperCase(),c,o);};L.prototype.publish=function(o,n,t,O,T,s,c){var r=this._getFlexibilityServicesUrlPrefix()+L.ROUTES.PUBLISH;r+=o+"/"+n+"."+t;var p=[];if(O){p.push({name:"layer",value:O});}if(T){p.push({name:"target-layer",value:T});}if(s){p.push({name:"target-namespace",value:s});}if(c){p.push({name:"changelist",value:c});}r+=this._buildParams(p);return this.send(r,"POST",{},null);};L.prototype.listContent=function(n,l){var r=this._getFlexibilityServicesUrlPrefix()+L.ROUTES.CONTENT;r+=n;var p=[];if(l){p.push({name:"layer",value:l});}r+=this._buildParams(p);return this.send(r,"GET",null,null);};return L;},true);
