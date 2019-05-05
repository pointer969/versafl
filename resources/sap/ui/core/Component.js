/*
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/thirdparty/jquery','./Manifest','./ComponentMetadata','sap/base/util/merge','sap/ui/base/ManagedObject','sap/ui/thirdparty/URI','sap/ui/performance/trace/Interaction','sap/base/assert','sap/base/Log','sap/base/util/ObjectPath','sap/base/util/UriParameters','sap/base/util/isPlainObject','sap/base/util/LoaderExtensions','sap/ui/VersionInfo'],function(q,M,C,a,b,U,I,c,L,O,d,f,g,V){"use strict";var h={JSON:"JSON",XML:"XML",HTML:"HTML",JS:"JS",Template:"Template"};function j(e){['sap-client','sap-server'].forEach(function(N){if(!e.hasSearch(N)){var v=sap.ui.getCore().getConfiguration().getSAPParam(N);if(v){e.addSearch(N,v);}}});}function k(D,m,S,e){if(S){for(var N in D){if(!m[N]&&S[N]&&S[N].uri){m[N]=e;}}}}function l(m,e,K,i){var D=e.getEntry(K);if(D!==undefined&&!f(D)){return D;}var P,v;if(i&&(P=m.getParent())instanceof C){v=P.getManifestEntry(K,i);}if(v||D){D=q.extend(true,{},v,D);}return D;}function n(e,i){var v=Object.create(Object.getPrototypeOf(e));v._oMetadata=e;v._oManifest=i;for(var m in e){if(!/^(getManifest|getManifestObject|getManifestEntry|getMetadataVersion)$/.test(m)&&typeof e[m]==="function"){v[m]=e[m].bind(e);}}v.getManifest=function(){return i&&i.getJson();};v.getManifestObject=function(){return i;};v.getManifestEntry=function(K,z){return l(e,i,K,z);};v.getMetadataVersion=function(){return 2;};return v;}function r(e,i,T){c(typeof e==="function","fn must be a function");var m=b._sOwnerId;try{b._sOwnerId=i;return e.call(T);}finally{b._sOwnerId=m;}}var o=b.extend("sap.ui.core.Component",{constructor:function(i,S){var e=Array.prototype.slice.call(arguments);if(typeof i!=="string"){S=i;i=undefined;}if(S&&typeof S._metadataProxy==="object"){this._oMetadataProxy=S._metadataProxy;this._oManifest=S._metadataProxy._oManifest;delete S._metadataProxy;this.getMetadata=function(){return this._oMetadataProxy;};}if(S&&typeof S._cacheTokens==="object"){this._mCacheTokens=S._cacheTokens;delete S._cacheTokens;}if(S&&typeof S._manifestModels==="object"){this._mManifestModels=S._manifestModels;delete S._manifestModels;}else{this._mManifestModels={};}this._mServices={};b.apply(this,e);},metadata:{stereotype:"component","abstract":true,specialSettings:{componentData:'any'},version:"0.0",includes:[],dependencies:{libs:[],components:[],ui5version:""},config:{},customizing:{},library:"sap.ui.core"}},C);o.prototype.getManifest=function(){if(!this._oManifest){return this.getMetadata().getManifest();}else{return this._oManifest.getJson();}};o.prototype.getManifestEntry=function(K){return this._getManifestEntry(K);};o.prototype._getManifestEntry=function(K,m){if(!this._oManifest){return this.getMetadata().getManifestEntry(K,m);}else{return l(this.getMetadata(),this._oManifest,K,m);}};o.prototype.getManifestObject=function(){if(!this._oManifest){return this.getMetadata().getManifestObject();}else{return this._oManifest;}};o.prototype._isVariant=function(){if(this._oManifest){var e=this.getManifestEntry("/sap.ui5/componentName");return e&&e!==this.getManifestEntry("/sap.app/id");}else{return false;}};o.activateCustomizing=function(e){};o.deactivateCustomizing=function(e){};o.getOwnerIdFor=function(e){c(e instanceof b,"oObject must be given and must be a ManagedObject");var i=(e instanceof b)&&e._sOwnerId;return i||undefined;};o.getOwnerComponentFor=function(e){return o.get(o.getOwnerIdFor(e));};o.prototype.runAsOwner=function(e){return r(e,this.getId());};o.prototype.getInterface=function(){return this;};o.prototype._initCompositeSupport=function(S){this.oComponentData=S&&S.componentData;if(!this._isVariant()){this.getMetadata().init();}else{this._oManifest.init(this);var A=this._oManifest.getEntry("/sap.app/id");if(A){u(A,this._oManifest.resolveUri("./","manifest"));}}this.initComponentModels();if(this.onWindowError){this._fnWindowErrorHandler=q.proxy(function(e){var E=e.originalEvent;this.onWindowError(E.message,E.filename,E.lineno);},this);q(window).bind("error",this._fnWindowErrorHandler);}if(this.onWindowBeforeUnload){this._fnWindowBeforeUnloadHandler=q.proxy(this.onWindowBeforeUnload,this);q(window).bind("beforeunload",this._fnWindowBeforeUnloadHandler);}if(this.onWindowUnload){this._fnWindowUnloadHandler=q.proxy(this.onWindowUnload,this);q(window).bind("unload",this._fnWindowUnloadHandler);}};o.prototype.destroy=function(){for(var e in this._mServices){if(this._mServices[e].instance){this._mServices[e].instance.destroy();}}delete this._mServices;for(var m in this._mManifestModels){this._mManifestModels[m].destroy();}delete this._mManifestModels;if(this._fnWindowErrorHandler){q(window).unbind("error",this._fnWindowErrorHandler);delete this._fnWindowErrorHandler;}if(this._fnWindowBeforeUnloadHandler){q(window).unbind("beforeunload",this._fnWindowBeforeUnloadHandler);delete this._fnWindowBeforeUnloadHandler;}if(this._fnWindowUnloadHandler){q(window).unbind("unload",this._fnWindowUnloadHandler);delete this._fnWindowUnloadHandler;}if(this._oEventBus){this._oEventBus.destroy();delete this._oEventBus;}b.prototype.destroy.apply(this,arguments);sap.ui.getCore().getMessageManager().unregisterObject(this);if(!this._isVariant()){this.getMetadata().exit();}else{this._oManifest.exit(this);delete this._oManifest;}};o.prototype.getComponentData=function(){return this.oComponentData;};o.prototype.getEventBus=function(){if(!this._oEventBus){var e=this.getMetadata().getName();L.warning("Synchronous loading of EventBus, due to #getEventBus() call on Component '"+e+"'.","SyncXHR",null,function(){return{type:"SyncXHR",name:e};});var E=sap.ui.requireSync("sap/ui/core/EventBus");this._oEventBus=new E();}return this._oEventBus;};o.prototype.initComponentModels=function(){var m=this.getMetadata();if(m.isBaseClass()){return;}var e=this._getManifestEntry("/sap.app/dataSources",true)||{};var i=this._getManifestEntry("/sap.ui5/models",true)||{};this._initComponentModels(i,e,this._mCacheTokens);};o.prototype._initComponentModels=function(m,D,e){var A=o._createManifestModelConfigurations({models:m,dataSources:D,component:this,mergeParent:true,cacheTokens:e});if(!A){return;}var i={};for(var v in A){if(!this._mManifestModels[v]){i[v]=A[v];}}var z=o._createManifestModels(i,this.toString());for(var v in z){this._mManifestModels[v]=z[v];}for(var v in this._mManifestModels){var B=this._mManifestModels[v];this.setModel(B,v||undefined);}};o.prototype.getService=function(e){if(!this._mServices[e]){this._mServices[e]={};this._mServices[e].promise=new Promise(function(R,i){sap.ui.require(["sap/ui/core/service/ServiceFactoryRegistry"],function(S){var m=this.getManifestEntry("/sap.ui5/services/"+e);var v=m&&m.factoryName;if(!v){i(new Error("Service "+e+" not declared!"));return;}var z=S.get(v);if(z){z.createInstance({scopeObject:this,scopeType:"component",settings:m.settings||{}}).then(function(B){if(!this.bIsDestroyed){this._mServices[e].instance=B;this._mServices[e].interface=B.getInterface();R(this._mServices[e].interface);}else{i(new Error("Service "+e+" could not be loaded as its Component was destroyed."));}}.bind(this)).catch(i);}else{var E="The ServiceFactory "+v+" for Service "+e+" not found in ServiceFactoryRegistry!";var A=this.getManifestEntry("/sap.ui5/services/"+e+"/optional");if(!A){L.error(E);}i(new Error(E));}}.bind(this),i);}.bind(this));}return this._mServices[e].promise;};function p(e){var S=e.getManifestEntry("/sap.ui5/services");for(var i in S){if(S[i].lazy===false){e.getService(i);}}}o.prototype.createComponent=function(v){c((typeof v==='string'&&v)||(typeof v==='object'&&typeof v.usage==='string'&&v.usage),"vUsage either must be a non-empty string or an object with a non-empty usage id");var m={async:true};if(v){var e;if(typeof v==="object"){e=v.usage;["id","async","settings","componentData"].forEach(function(N){if(v[N]!==undefined){m[N]=v[N];}});}else if(typeof v==="string"){e=v;}m=this._enhanceWithUsageConfig(e,m);}return o._createComponent(m,this);};o.prototype._enhanceWithUsageConfig=function(e,m){var i=this.getManifestEntry("/sap.ui5/componentUsages/"+e);if(!i){throw new Error("Component usage \""+e+"\" not declared in Component \""+this.getManifestObject().getComponentName()+"\"!");}return q.extend(true,i,m);};o._createComponent=function(m,e){function i(){if(m.async===true){return o.create(m);}else{return sap.ui.component(m);}}if(e){return e.runAsOwner(i);}else{return i();}};o._createManifestModelConfigurations=function(m){var e=m.component;var v=m.manifest||e.getManifestObject();var z=m.mergeParent;var A=m.cacheTokens||{};var B=e?e.toString():v.getComponentName();var D=sap.ui.getCore().getConfiguration();if(!m.models){return null;}var E={models:m.models,dataSources:m.dataSources||{},origin:{dataSources:{},models:{}}};if(e&&z){var F=e.getMetadata();while(F instanceof C){var G=F.getManifestObject();var H=F.getManifestEntry("/sap.app/dataSources");k(E.dataSources,E.origin.dataSources,H,G);var J=F.getManifestEntry("/sap.ui5/models");k(E.models,E.origin.models,J,G);F=F.getParent();}}var K={};for(var N in E.models){var P=E.models[N];var Q=false;var R=null;if(typeof P==='string'){P={dataSource:P};}if(P.dataSource){var S=E.dataSources&&E.dataSources[P.dataSource];if(typeof S==='object'){if(S.type===undefined){S.type='OData';}var T;if(!P.type){switch(S.type){case'OData':T=S.settings&&S.settings.odataVersion;if(T==="4.0"){P.type='sap.ui.model.odata.v4.ODataModel';}else if(!T||T==="2.0"){P.type='sap.ui.model.odata.v2.ODataModel';}else{L.error('Component Manifest: Provided OData version "'+T+'" in '+'dataSource "'+P.dataSource+'" for model "'+N+'" is unknown. '+'Falling back to default model type "sap.ui.model.odata.v2.ODataModel".','["sap.app"]["dataSources"]["'+P.dataSource+'"]',B);P.type='sap.ui.model.odata.v2.ODataModel';}break;case'JSON':P.type='sap.ui.model.json.JSONModel';break;case'XML':P.type='sap.ui.model.xml.XMLModel';break;default:}}if(P.type==='sap.ui.model.odata.v4.ODataModel'&&S.settings&&S.settings.odataVersion){P.settings=P.settings||{};P.settings.odataVersion=S.settings.odataVersion;}if(!P.uri){P.uri=S.uri;Q=true;}if(S.type==='OData'&&S.settings&&typeof S.settings.maxAge==="number"){P.settings=P.settings||{};P.settings.headers=P.settings.headers||{};P.settings.headers["Cache-Control"]="max-age="+S.settings.maxAge;}if(S.type==='OData'&&S.settings&&S.settings.annotations){var W=S.settings.annotations;for(var i=0;i<W.length;i++){var X=E.dataSources[W[i]];if(!X){L.error("Component Manifest: ODataAnnotation \""+W[i]+"\" for dataSource \""+P.dataSource+"\" could not be found in manifest","[\"sap.app\"][\"dataSources\"][\""+W[i]+"\"]",B);continue;}if(X.type!=='ODataAnnotation'){L.error("Component Manifest: dataSource \""+W[i]+"\" was expected to have type \"ODataAnnotation\" but was \""+X.type+"\"","[\"sap.app\"][\"dataSources\"][\""+W[i]+"\"]",B);continue;}if(!X.uri){L.error("Component Manifest: Missing \"uri\" for ODataAnnotation \""+W[i]+"\"","[\"sap.app\"][\"dataSources\"][\""+W[i]+"\"]",B);continue;}var Y=new U(X.uri);if(P.type==='sap.ui.model.odata.v2.ODataModel'){["sap-language","sap-client"].forEach(function(k1){if(!Y.hasQuery(k1)&&D.getSAPParam(k1)){Y.setQuery(k1,D.getSAPParam(k1));}});var Z=A.dataSources&&A.dataSources[X.uri];if(Z){var $=function(){if(!Y.hasQuery("sap-language")){L.warning("Component Manifest: Ignoring provided \"sap-context-token="+Z+"\" for ODataAnnotation \""+W[i]+"\" ("+Y.toString()+"). "+"Missing \"sap-language\" URI parameter","[\"sap.app\"][\"dataSources\"][\""+W[i]+"\"]",B);return;}if(!Y.hasQuery("sap-client")){L.warning("Component Manifest: Ignoring provided \"sap-context-token="+Z+"\" for ODataAnnotation \""+W[i]+"\" ("+Y.toString()+"). "+"Missing \"sap-client\" URI parameter","[\"sap.app\"][\"dataSources\"][\""+W[i]+"\"]",B);return;}if(!Y.hasQuery("sap-client",D.getSAPParam("sap-client"))){L.warning("Component Manifest: Ignoring provided \"sap-context-token="+Z+"\" for ODataAnnotation \""+W[i]+"\" ("+Y.toString()+"). "+"URI parameter \"sap-client="+Y.query(true)["sap-client"]+"\" must be identical with configuration \"sap-client="+D.getSAPParam("sap-client")+"\"","[\"sap.app\"][\"dataSources\"][\""+W[i]+"\"]",B);return;}if(Y.hasQuery("sap-context-token")&&!Y.hasQuery("sap-context-token",Z)){var k1=Y.query(true)["sap-context-token"];L.warning("Component Manifest: Overriding existing \"sap-context-token="+k1+"\" with provided value \""+Z+"\" for ODataAnnotation \""+W[i]+"\" ("+Y.toString()+").","[\"sap.app\"][\"dataSources\"][\""+W[i]+"\"]",B);}Y.setQuery("sap-context-token",Z);};$();}}var _=E.origin.dataSources[W[i]]||v;var a1=_._resolveUri(Y).toString();P.settings=P.settings||{};P.settings.annotationURI=P.settings.annotationURI||[];P.settings.annotationURI.push(a1);}}}else{L.error("Component Manifest: dataSource \""+P.dataSource+"\" for model \""+N+"\" not found or invalid","[\"sap.app\"][\"dataSources\"][\""+P.dataSource+"\"]",B);}}if(!P.type){L.error("Component Manifest: Missing \"type\" for model \""+N+"\"","[\"sap.ui5\"][\"models\"][\""+N+"\"]",B);continue;}if(P.type==='sap.ui.model.odata.ODataModel'&&(!P.settings||P.settings.json===undefined)){P.settings=P.settings||{};P.settings.json=true;}if(P.uri){var b1=new U(P.uri);var c1=(Q?E.origin.dataSources[P.dataSource]:E.origin.models[N])||v;b1=c1._resolveUri(b1);if(P.dataSource){j(b1);if(P.type==='sap.ui.model.odata.v2.ODataModel'){R=P.settings&&P.settings.metadataUrlParams;if((!R||typeof R['sap-language']==='undefined')&&!b1.hasQuery('sap-language')&&D.getSAPParam('sap-language')){P.settings=P.settings||{};R=P.settings.metadataUrlParams=P.settings.metadataUrlParams||{};R['sap-language']=D.getSAPParam('sap-language');}if(A.dataSources){var Z=A.dataSources[S.uri];if(Z){var d1=function(){if(b1.hasQuery("sap-context-token")){L.warning("Component Manifest: Ignoring provided \"sap-context-token="+Z+"\" for model \""+N+"\" ("+b1.toString()+"). "+"Model URI already contains parameter \"sap-context-token="+b1.query(true)["sap-context-token"]+"\"","[\"sap.ui5\"][\"models\"][\""+N+"\"]",B);return;}if((!R||typeof R["sap-language"]==="undefined")&&!b1.hasQuery("sap-language")){L.warning("Component Manifest: Ignoring provided \"sap-context-token="+Z+"\" for model \""+N+"\" ("+b1.toString()+"). "+"Missing \"sap-language\" parameter","[\"sap.ui5\"][\"models\"][\""+N+"\"]",B);return;}if(!b1.hasQuery("sap-client")){L.warning("Component Manifest: Ignoring provided \"sap-context-token="+Z+"\" for model \""+N+"\" ("+b1.toString()+"). "+"Missing \"sap-client\" parameter","[\"sap.ui5\"][\"models\"][\""+N+"\"]",B);return;}if(!b1.hasQuery("sap-client",D.getSAPParam("sap-client"))){L.warning("Component Manifest: Ignoring provided \"sap-context-token="+Z+"\" for model \""+N+"\" ("+b1.toString()+"). "+"URI parameter \"sap-client="+b1.query(true)["sap-client"]+"\" must be identical with configuration \"sap-client="+D.getSAPParam("sap-client")+"\"","[\"sap.ui5\"][\"models\"][\""+N+"\"]",B);return;}if(R&&typeof R["sap-client"]!=="undefined"){if(R["sap-client"]!==D.getSAPParam("sap-client")){L.warning("Component Manifest: Ignoring provided \"sap-context-token="+Z+"\" for model \""+N+"\" ("+b1.toString()+"). "+"Parameter metadataUrlParams[\"sap-client\"] = \""+R["sap-client"]+"\" must be identical with configuration \"sap-client="+D.getSAPParam("sap-client")+"\"","[\"sap.ui5\"][\"models\"][\""+N+"\"]",B);return;}}if(R&&R["sap-context-token"]&&R["sap-context-token"]!==Z){L.warning("Component Manifest: Overriding existing \"sap-context-token="+R["sap-context-token"]+"\" with provided value \""+Z+"\" for model \""+N+"\" ("+b1.toString()+").","[\"sap.ui5\"][\"models\"][\""+N+"\"]",B);}if(!R){P.settings=P.settings||{};R=P.settings.metadataUrlParams=P.settings.metadataUrlParams||{};}R["sap-context-token"]=Z;};d1();}}}}P.uri=b1.toString();}if(P.uriSettingName===undefined){switch(P.type){case'sap.ui.model.odata.ODataModel':case'sap.ui.model.odata.v2.ODataModel':case'sap.ui.model.odata.v4.ODataModel':P.uriSettingName='serviceUrl';break;case'sap.ui.model.resource.ResourceModel':P.uriSettingName='bundleUrl';break;default:}}var e1;var f1;if(e){f1=e.getComponentData();}else{f1=m.componentData;}e1=f1&&f1.startupParameters&&f1.startupParameters["sap-system"];if(!e1){e1=D.getSAPParam("sap-system");}var g1=false;var h1;if(e1&&["sap.ui.model.odata.ODataModel","sap.ui.model.odata.v2.ODataModel"].indexOf(P.type)!=-1){g1=true;h1=sap.ui.requireSync("sap/ui/model/odata/ODataUtils");}if(P.uri){if(g1){P.preOriginBaseUri=P.uri.split("?")[0];P.uri=h1.setOrigin(P.uri,{alias:e1});P.postOriginBaseUri=P.uri.split("?")[0];}if(P.uriSettingName!==undefined){P.settings=P.settings||{};if(!P.settings[P.uriSettingName]){P.settings[P.uriSettingName]=P.uri;}}else if(P.settings){P.settings=[P.uri,P.settings];}else{P.settings=[P.uri];}}else{if(g1&&P.uriSettingName!==undefined&&P.settings&&P.settings[P.uriSettingName]){P.preOriginBaseUri=P.settings[P.uriSettingName].split("?")[0];P.settings[P.uriSettingName]=h1.setOrigin(P.settings[P.uriSettingName],{alias:e1});P.postOriginUri=P.settings[P.uriSettingName].split("?")[0];}}if(g1&&P.settings&&P.settings.annotationURI){var i1=[].concat(P.settings.annotationURI);var j1=[];for(var i=0;i<i1.length;i++){j1.push(h1.setAnnotationOrigin(i1[i],{alias:e1,preOriginBaseUri:P.preOriginBaseUri,postOriginBaseUri:P.postOriginBaseUri}));}P.settings.annotationURI=j1;}if(P.type==='sap.ui.model.resource.ResourceModel'&&P.settings&&Array.isArray(P.settings.enhanceWith)){P.settings.enhanceWith.forEach(function(k1){if(k1.bundleUrl){k1.bundleUrl=v.resolveUri(k1.bundleUrl,k1.bundleUrlRelativeTo);}});}if(P.settings&&!Array.isArray(P.settings)){P.settings=[P.settings];}K[N]=P;}return K;};o._createManifestModels=function(m,e){var i={};for(var v in m){var z=m[v];try{sap.ui.requireSync(z.type.replace(/\./g,"/"));}catch(E){L.error("Component Manifest: Class \""+z.type+"\" for model \""+v+"\" could not be loaded. "+E,"[\"sap.ui5\"][\"models\"][\""+v+"\"]",e);continue;}var A=O.get(z.type);if(!A){L.error("Component Manifest: Class \""+z.type+"\" for model \""+v+"\" could not be found","[\"sap.ui5\"][\"models\"][\""+v+"\"]",e);continue;}var B=[null].concat(z.settings||[]);var F=A.bind.apply(A,B);var D=new F();i[v]=D;}return i;};function s(m,e,i){var v={afterManifest:{},afterPreload:{}};var z=q.extend(true,{},m.getEntry("/sap.app/dataSources"));var A=q.extend(true,{},m.getEntry("/sap.ui5/models"));var B=o._createManifestModelConfigurations({models:A,dataSources:z,manifest:m,componentData:e,cacheTokens:i});var P=new d(window.location.href).get("sap-ui-xx-preload-component-models-"+m.getComponentName());var D=P&&P.split(",");for(var E in B){var F=B[E];if(!F.preload&&D&&D.indexOf(E)>-1){F.preload=true;L.warning("FOR TESTING ONLY!!! Activating preload for model \""+E+"\" ("+F.type+")",m.getComponentName(),"sap.ui.core.Component");}if(F.type==="sap.ui.model.resource.ResourceModel"&&Array.isArray(F.settings)&&F.settings.length>0&&F.settings[0].async!==true){v.afterPreload[E]=F;}else if(F.preload){if(sap.ui.loader._.getModuleState(F.type.replace(/\./g,"/")+".js")){v.afterManifest[E]=F;}else{L.warning("Can not preload model \""+E+"\" as required class has not been loaded: \""+F.type+"\"",m.getComponentName(),"sap.ui.core.Component");}}}return v;}function t(e){return sap.ui.require.toUrl(e.replace(/\./g,"/")+"/manifest.json");}function u(N,e){var P={};P[N.replace(/\./g,"/")]=e;sap.ui.loader.config({paths:P});}function w(R,e){var m=[];var v=[];function z(i,A){if(!i._oManifest){var N=i.getComponentName();var D=t(N);var B;if(A){B=Promise.resolve(JSON.parse(JSON.stringify(A.getRawJson())));}else{B=g.loadResource({url:D,dataType:"json",async:true}).catch(function(E){L.error("Failed to load component manifest from \""+D+"\" (component "+N+")! Reason: "+E);return{};});}m.push(B);v.push(i);}var P=i.getParent();if(P&&(P instanceof C)&&!P.isBaseClass()){z(P);}}z(R,e);return Promise.all(m).then(function(A){for(var i=0;i<A.length;i++){if(A[i]){v[i]._applyManifest(A[i]);}}});}o._fnLoadComponentCallback=null;o._fnOnInstanceCreated=null;o.create=function(m){if(m==null||typeof m!=="object"){throw new TypeError("Component.create() must be called with a configuration object.");}var P=a({},m);P.async=true;if(P.manifest===undefined){P.manifest=true;}return x(P);};sap.ui.component=function(v){if(!v){throw new Error("sap.ui.component cannot be called without parameter!");}var e=function(i){return{type:"sap.ui.component",name:i};};if(typeof v==='string'){L.warning("Do not use deprecated function 'sap.ui.component' ("+v+") + for Component instance lookup. "+"Use 'Component.get' instead","sap.ui.component",null,e.bind(null,v));return sap.ui.getCore().getComponent(v);}if(v.async){L.info("Do not use deprecated factory function 'sap.ui.component' ("+v["name"]+"). "+"Use 'Component.create' instead","sap.ui.component",null,e.bind(null,v["name"]));}else{L.warning("Do not use synchronous component creation ("+v["name"]+")! "+"Use the new asynchronous factory 'Component.create' instead","sap.ui.component",null,e.bind(null,v["name"]));}return x(v);};function x(v){function e(z){var N=v.name,A=v.id,B=v.componentData,D=N+'.Component',S=v.settings;var E=new z(q.extend({},S,{id:A,componentData:B,_cacheTokens:v.asyncHints&&v.asyncHints.cacheTokens}));c(E instanceof o,"The specified component \""+D+"\" must be an instance of sap.ui.core.Component!");L.info("Component instance Id = "+E.getId());var H=E.getMetadata().handleValidation()!==undefined||v.handleValidation;if(H){if(E.getMetadata().handleValidation()!==undefined){H=E.getMetadata().handleValidation();}else{H=v.handleValidation;}sap.ui.getCore().getMessageManager().registerObject(E,H);}p(E);if(typeof o._fnOnInstanceCreated==="function"){var P=o._fnOnInstanceCreated(E,v);if(v.async&&P instanceof Promise){return P.then(function(){return E;});}}return E;}var i=y(v,{failOnError:true,createModels:true,waitFor:v.asyncHints&&v.asyncHints.waitFor});if(v.async){var m=b._sOwnerId;return i.then(function(z){return r(function(){return e(z);},m);});}else{return e(i);}}o.load=function(m){var P=a({},m);P.async=true;if(P.manifest===undefined){P.manifest=true;}return y(P,{preloadOnly:P.asyncHints&&P.asyncHints.preloadOnly});};o.get=function(i){return sap.ui.getCore().getComponent(i);};sap.ui.component.load=function(e,F){L.warning("Do not use deprecated function 'sap.ui.component.load'! Use 'Component.load' instead");return y(e,{failOnError:F,preloadOnly:e.asyncHints&&e.asyncHints.preloadOnly});};function y(m,z){var N=m.name,A=m.url,B=sap.ui.getCore().getConfiguration(),D=/^(sync|async)$/.test(B.getComponentPreload()),E=m.manifest,F,G,H,J,K,P;function Q(e,z){var H=new M(JSON.parse(JSON.stringify(e)),z);return m.async?Promise.resolve(H):H;}if(N&&A){u(N,A);}I.setStepComponent(N);if(E===undefined){F=m.manifestFirst===undefined?B.getManifestFirst():!!m.manifestFirst;G=m.manifestUrl;}else{if(m.async===undefined){m.async=true;}F=!!E;G=E&&typeof E==='string'?E:undefined;H=E&&typeof E==='object'?Q(E,{url:m&&m.altManifestUrl}):undefined;}if(!H&&G){H=M.load({manifestUrl:G,componentName:N,async:m.async});}if(H&&!m.async){N=H.getComponentName();if(N&&A){u(N,A);}}if(!(H&&m.async)){if(!N){throw new Error("The name of the component is undefined.");}c(typeof N==='string',"sName must be a string");}if(F&&!H){H=M.load({manifestUrl:t(N),componentName:N,async:m.async,failOnError:false});}function R(){return(N+".Component").replace(/\./g,"/");}function S(e){var i=N+'.Component';if(!e){var v="The specified component controller '"+i+"' could not be found!";if(z.failOnError){throw new Error(v);}else{L.warning(v);}}if(H){var $=n(e.getMetadata(),H);var e1=function(){var f1=Array.prototype.slice.call(arguments);var g1;if(f1.length===0||typeof f1[0]==="object"){g1=f1[0]=f1[0]||{};}else if(typeof f1[0]==="string"){g1=f1[1]=f1[1]||{};}g1._metadataProxy=$;if(J){g1._manifestModels=J;}var h1=Object.create(e.prototype);e.apply(h1,f1);return h1;};e1.getMetadata=function(){return $;};e1.extend=function(){throw new Error("Extending Components created by Manifest is not supported!");};return e1;}else{return e;}}function T(v,i){c((typeof v==='string'&&v)||(typeof v==='object'&&typeof v.name==='string'&&v.name),"reference either must be a non-empty string or an object with a non-empty 'name' and an optional 'url' property");if(typeof v==='object'){if(v.url){if(typeof v.url==="object"){if(v.url.final){q.sap.registerModulePath(v.name,v.url);}else{u(v.name,v.url.url);}}else{u(v.name,v.url);}}return(v.lazy&&i!==true)?undefined:v.name;}return v;}function W(i,v){var $=i+'.Component',e1=sap.ui.getCore().getConfiguration().getDepCache(),f1,g1,h1;if(D&&i!=null&&!sap.ui.loader._.getModuleState($.replace(/\./g,"/")+".js")){if(v){g1=V._getTransitiveDependencyForComponent(i);if(g1){h1=[g1.library];Array.prototype.push.apply(h1,g1.dependencies);return sap.ui.getCore().loadLibraries(h1,{preloadOnly:true});}else{f1=$.replace(/\./g,"/")+(e1?'-h2-preload.js':'-preload.js');return sap.ui.loader._.loadJSResourceAsync(f1,true);}}try{f1=$+'-preload';sap.ui.requireSync(f1.replace(/\./g,"/"));}catch(e){L.warning("couldn't preload component from "+f1+": "+((e&&e.message)||e));}}else if(v){return Promise.resolve();}}function X(e,H,i){var v=[];var $=i?function(m1){v.push(m1);}:function(){};H.defineResourceRoots();var e1=H.getEntry("/sap.ui5/dependencies/libs");if(e1){var f1=[];for(var g1 in e1){if(!e1[g1].lazy){f1.push(g1);}}if(f1.length>0){L.info("Component \""+e+"\" is loading libraries: \""+f1.join(", ")+"\"");$(sap.ui.getCore().loadLibraries(f1,{async:i}));}}var h1=H.getEntry("/sap.ui5/extends/component");if(h1){$(W(h1,i));}var i1=[];var j1=H.getEntry("/sap.ui5/dependencies/components");if(j1){for(var e in j1){if(!j1[e].lazy){i1.push(e);}}}var k1=H.getEntry("/sap.ui5/componentUsages");if(k1){for(var l1 in k1){if(k1[l1].lazy===false&&i1.indexOf(k1[l1].name)===-1){i1.push(k1[l1].name);}}}if(i1.length>0){i1.forEach(function(e){$(W(e,i));});}return i?Promise.all(v):undefined;}if(m.async){var Y=m.asyncHints||{},Z=[],_=function(e){e=e.then(function(v){return{result:v,rejected:false};},function(v){return{result:v,rejected:true};});return e;},a1=function(e){if(e){Z.push(_(e));}},b1=function($){return $;},c1,d1;if(H&&z.createModels){a1(H.then(function(H){K=s(H,m.componentData,Y.cacheTokens);return H;}).then(function(H){if(Object.keys(K.afterManifest).length>0){J=o._createManifestModels(K.afterManifest,H.getComponentName());}return H;}));}c1=[];if(Array.isArray(Y.preloadBundles)){Y.preloadBundles.forEach(function(v){c1.push(sap.ui.loader._.loadJSResourceAsync(T(v,true),true));});}if(Array.isArray(Y.libs)){d1=Y.libs.map(T).filter(b1);c1.push(sap.ui.getCore().loadLibraries(d1,{preloadOnly:true}));}c1=Promise.all(c1);if(d1&&!z.preloadOnly){c1=c1.then(function(){return sap.ui.getCore().loadLibraries(d1);});}a1(c1);if(!H){a1(W(N,true));}else{a1(H.then(function(H){var e=H.getComponentName();if(A){u(e,A);}return W(e,true).then(function(){return H._processI18n(true);}).then(function(){if(!z.createModels){return null;}var i=Object.keys(K.afterPreload);if(i.length===0){return null;}return new Promise(function(v,$){sap.ui.require(["sap/ui/model/resource/ResourceModel"],function(e1){v(e1);},$);}).then(function(v){function $(e1){var f1=K.afterPreload[e1];if(Array.isArray(f1.settings)&&f1.settings.length>0){var g1=f1.settings[0];return v.loadResourceBundle(g1,true).then(function(h1){g1.bundle=h1;},function(h1){L.error("Component Manifest: Could not preload ResourceBundle for ResourceModel. "+"The model will be skipped here and tried to be created on Component initialization.","[\"sap.ui5\"][\"models\"][\""+e1+"\"]",e);L.error(h1);delete K.afterPreload[e1];});}else{return Promise.resolve();}}return Promise.all(i.map($)).then(function(){if(Object.keys(K.afterPreload).length>0){var e1=o._createManifestModels(K.afterPreload,H.getComponentName());if(!J){J={};}for(var f1 in e1){J[f1]=e1[f1];}}});});});}));P=function(e){if(typeof o._fnLoadComponentCallback==="function"){var i=q.extend(true,{},m);var v=q.extend(true,{},e);try{o._fnLoadComponentCallback(i,v);}catch($){L.error("Callback for loading the component \""+H.getComponentName()+"\" run into an error. The callback was skipped and the component loading resumed.",$,"sap.ui.core.Component");}}};}if(Y.components){q.each(Y.components,function(i,v){a1(W(T(v),true));});}return Promise.all(Z).then(function(v){var e=[],i=false,$;i=v.some(function(e1){if(e1&&e1.rejected){$=e1.result;return true;}e.push(e1.result);});if(i){return Promise.reject($);}return e;}).then(function(v){if(H&&P){H.then(P);}return v;}).then(function(v){L.debug("Component.load: all promises fulfilled, then "+v);if(H){return H.then(function(e){H=e;N=H.getComponentName();return X(N,H,true);});}else{return v;}}).then(function(){if(z.preloadOnly){return true;}return new Promise(function(e,i){sap.ui.require([R()],function(v){e(v);},i);}).then(function(e){var i=e.getMetadata();var N=i.getComponentName();var v=t(N);var $;if(H&&typeof E!=="object"&&(typeof G==="undefined"||G===v)){$=w(i,H);}else{$=w(i);}return $.then(function(){return S(e);});});}).then(function(e){if(!H){return e;}var i=[];var v;var $=H.getEntry("/sap.ui5/rootView");if(typeof $==="string"){v="XML";}else if($&&typeof $==="object"&&$.type){v=$.type;}if(v&&h[v]){var e1="sap/ui/core/mvc/"+h[v]+"View";i.push(e1);}var f1=H.getEntry("/sap.ui5/routing");if(f1&&f1.routes){var g1=H.getEntry("/sap.ui5/routing/config/routerClass")||"sap.ui.core.routing.Router";var h1=g1.replace(/\./g,"/");i.push(h1);}var i1=q.extend(true,{},H.getEntry("/sap.ui5/models"));var j1=q.extend(true,{},H.getEntry("/sap.app/dataSources"));var k1=o._createManifestModelConfigurations({models:i1,dataSources:j1,manifest:H,cacheTokens:Y.cacheTokens});for(var l1 in k1){if(!k1.hasOwnProperty(l1)){continue;}var m1=k1[l1];if(!m1.type){continue;}var n1=m1.type.replace(/\./g,"/");if(i.indexOf(n1)===-1){i.push(n1);}}if(i.length>0){return Promise.all(i.map(function(n1){return new Promise(function(o1,p1){var q1=false;function r1(s1){if(q1){return;}L.warning("Can not preload module \""+n1+"\". "+"This will most probably cause an error once the module is used later on.",H.getComponentName(),"sap.ui.core.Component");L.warning(s1);q1=true;o1();}sap.ui.require([n1],o1,r1);});})).then(function(){return e;});}else{return e;}}).then(function(e){var i=z.waitFor;if(i){var v=Array.isArray(i)?i:[i];return Promise.all(v).then(function(){return e;});}return e;}).catch(function(e){if(J){for(var N in J){var i=J[N];if(i&&typeof i.destroy==="function"){i.destroy();}}}throw e;});}if(H){X(N,H);}W(N);return S(sap.ui.requireSync(R()));}if(Math.sqrt(2)<1){sap.ui.require(["sap/ui/core/Core"],function(){});}return o;});
