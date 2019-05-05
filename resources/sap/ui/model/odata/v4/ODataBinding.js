/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["./lib/_Helper","sap/ui/base/SyncPromise","sap/ui/model/ChangeReason","sap/ui/model/odata/OperationMode","sap/ui/model/odata/v4/Context","sap/ui/thirdparty/jquery"],function(_,S,C,O,a,q){"use strict";var c=[C.Change,C.Refresh,C.Sort,C.Filter],s="sap.ui.model.odata.v4.ODataBinding",r=/\/\d|\(\$uid=/;function b(){this.mCacheByResourcePath=undefined;this.oFetchCacheCallToken=undefined;this.sResumeChangeReason=C.Change;}b.prototype.checkBindingParameters=function(p,A){var t=this;Object.keys(p).forEach(function(k){var v=p[k];if(k.indexOf("$$")!==0){return;}if(A.indexOf(k)<0){throw new Error("Unsupported binding parameter: "+k);}switch(k){case"$$aggregation":break;case"$$groupId":case"$$updateGroupId":t.oModel.checkGroupId(v,false,"Unsupported value for binding parameter '"+k+"': ");break;case"$$inheritExpandSelect":if(v!==true&&v!==false){throw new Error("Unsupported value for binding parameter "+"'$$inheritExpandSelect': "+v);}if(!t.oOperation){throw new Error("Unsupported binding parameter $$inheritExpandSelect: "+"binding is not an operation binding");}if(p.$expand||p.$select){throw new Error("Must not set parameter $$inheritExpandSelect on a binding "+"which has a $expand or $select binding parameter");}break;case"$$operationMode":if(v!==O.Server){throw new Error("Unsupported operation mode: "+v);}break;case"$$canonicalPath":case"$$ownRequest":case"$$patchWithoutSideEffects":if(v!==true){throw new Error("Unsupported value for binding parameter '"+k+"': "+v);}break;default:throw new Error("Unknown binding-specific parameter: "+k);}});};b.prototype.checkSuspended=function(){var R=this.getRootBinding();if(R&&R.isSuspended()){throw new Error("Must not call method when the binding's root binding is suspended: "+this);}};b.prototype.fetchCache=function(o){var d,e={},f,p,t=this;if(!this.bRelative){o=undefined;}if(this.oCachePromise.isFulfilled()){f=this.oCachePromise.getResult();if(f){f.setActive(false);}}p=[this.fetchQueryOptionsForOwnCache(o),this.oModel.oRequestor.ready()];this.mCacheQueryOptions=undefined;d=S.all(p).then(function(R){var Q=R[0];if(Q&&!(o&&o.getIndex&&o.getIndex()===a.VIRTUAL)){return t.fetchResourcePath(o).then(function(g){var h,D,E,i;if(!d||t.oFetchCacheCallToken===e){t.mCacheQueryOptions=q.extend(true,{},t.oModel.mUriParameters,Q);if(t.bRelative){t.mCacheByResourcePath=t.mCacheByResourcePath||{};h=t.mCacheByResourcePath[g];i=o.getReturnValueContextId&&o.getReturnValueContextId();if(h&&h.$returnValueContextId===i){h.setActive(true);}else{D=_.buildPath(o.getPath(),t.sPath).slice(1);h=t.doCreateCache(g,t.mCacheQueryOptions,o,D);t.mCacheByResourcePath[g]=h;h.$deepResourcePath=D;h.$resourcePath=g;h.$returnValueContextId=i;}}else{h=t.doCreateCache(g,t.mCacheQueryOptions,o);}return h;}else{E=new Error("Cache discarded as a new cache has been created");E.canceled=true;throw E;}});}});d.catch(function(E){t.oModel.reportError("Failed to create cache for binding "+t,s,E);});this.oCachePromise=d;this.oFetchCacheCallToken=e;};b.prototype.fetchQueryOptionsForOwnCache=function(o){var h,Q,t=this;if(this.oOperation||this.bRelative&&!o||this.isMeta()){return S.resolve(undefined);}Q=this.doFetchQueryOptions(o);if(this.oModel.bAutoExpandSelect&&this.aChildCanUseCachePromises){Q=S.all([Q,Promise.resolve().then(function(){return S.all(t.aChildCanUseCachePromises);})]).then(function(R){t.aChildCanUseCachePromises=[];t.updateAggregatedQueryOptions(R[0]);return t.mAggregatedQueryOptions;});}if(!this.bRelative||!o.fetchValue){return Q;}if(this.oModel.bAutoExpandSelect){h=this.mParameters&&Object.keys(t.mParameters).some(function(k){return k[0]!=="$"||k[1]==="$";});if(h){return Q;}return o.getBinding().fetchIfChildCanUseCache(o,t.sPath,Q).then(function(d){return d?undefined:Q;});}if(this.mParameters&&Object.keys(this.mParameters).length){return Q;}return Q.then(function(m){return Object.keys(m).length===0?undefined:m;});};b.prototype.fetchResourcePath=function(o){var d,e,f,t=this;if(!this.bRelative){return S.resolve(this.sPath.slice(1));}o=o||this.oContext;if(!o){return S.resolve();}e=o.getPath();d=o.fetchCanonicalPath&&(this.mParameters&&this.mParameters["$$canonicalPath"]||r.test(e));f=d?o.fetchCanonicalPath():S.resolve(e);return f.then(function(g){return _.buildPath(g,t.sPath).slice(1);});};b.prototype.getGroupId=function(){return this.sGroupId||(this.bRelative&&this.oContext&&this.oContext.getGroupId&&this.oContext.getGroupId())||this.oModel.getGroupId();};b.prototype.getRelativePath=function(p){var P,R;if(p[0]==="/"){R=this.oModel.resolve(this.sPath,this.oContext);if(p.indexOf(R)===0){P=R;}else if(this.oReturnValueContext&&p.indexOf(this.oReturnValueContext.getPath())===0){P=this.oReturnValueContext.getPath();}else{return undefined;}p=p.slice(P.length);if(p[0]==="/"){p=p.slice(1);}}return p;};b.prototype.getRootBinding=function(){if(this.bRelative&&this.oContext&&this.oContext.getBinding){return this.oContext.getBinding().getRootBinding();}return this.bRelative&&!this.oContext?undefined:this;};b.prototype.getRootBindingResumePromise=function(){var R=this.getRootBinding();return R&&R.getResumePromise()||S.resolve();};b.prototype.getUpdateGroupId=function(){return this.sUpdateGroupId||(this.bRelative&&this.oContext&&this.oContext.getUpdateGroupId&&this.oContext.getUpdateGroupId())||this.oModel.getUpdateGroupId();};b.prototype.hasPendingChanges=function(){return this.hasPendingChangesForPath("")||this.hasPendingChangesInDependents();};b.prototype.hasPendingChangesForPath=function(p){var t=this,P=this.withCache(function(o,d){return o.hasPendingChangesForPath(d);},p).catch(function(e){t.oModel.reportError("Error in hasPendingChangesForPath",s,e);return false;});return P.isFulfilled()?P.getResult():false;};b.prototype.hasPendingChangesInCaches=function(R){var t=this;if(!this.mCacheByResourcePath){return false;}return Object.keys(this.mCacheByResourcePath).some(function(d){var o=t.mCacheByResourcePath[d];return o.$deepResourcePath.startsWith(R)&&o.hasPendingChangesForPath("");});};b.prototype.isInitial=function(){throw new Error("Unsupported operation: isInitial");};b.prototype.isRoot=function(){return!this.bRelative||this.oContext&&!this.oContext.getBinding;};b.prototype.isRootBindingSuspended=function(){var R=this.getRootBinding();return R&&R.isSuspended();};b.prototype.lockGroup=function(g,l){return this.oModel.lockGroup(g,l,this);};b.prototype.refresh=function(g){if(!this.isRoot()){throw new Error("Refresh on this binding is not supported");}if(this.hasPendingChanges()){throw new Error("Cannot refresh due to pending changes");}this.oModel.checkGroupId(g);this.refreshInternal("",g,true);};b.prototype.removeCachesAndMessages=function(R){var m=this.oModel,d=m.resolve(this.sPath,this.oContext),t=this;if(d){m.reportBoundMessages(d.slice(1),{});}if(this.mCacheByResourcePath){Object.keys(this.mCacheByResourcePath).forEach(function(e){var o=t.mCacheByResourcePath[e];if(o.$deepResourcePath.startsWith(R)){m.reportBoundMessages(o.$deepResourcePath,{});delete t.mCacheByResourcePath[e];}});}};b.prototype.resetChanges=function(){this.checkSuspended();this.resetChangesForPath("");this.resetChangesInDependents();this.resetInvalidDataState();};b.prototype.resetChangesForPath=function(p){var P=this.withCache(function(o,d){o.resetChangesForPath(d);},p),t=this;P.catch(function(e){t.oModel.reportError("Error in resetChangesForPath",s,e);});if(P.isRejected()){throw P.getResult();}};b.prototype.resetInvalidDataState=function(){};b.prototype.setResumeChangeReason=function(d){if(c.indexOf(d)>c.indexOf(this.sResumeChangeReason)){this.sResumeChangeReason=d;}};b.prototype.toString=function(){return this.getMetadata().getName()+": "+(this.bRelative?this.oContext+"|":"")+this.sPath;};b.prototype.withCache=function(p,P){var R,t=this;P=P||"";return this.oCachePromise.then(function(o){if(o){R=t.getRelativePath(P);if(R!==undefined){return p(o,R,t);}}else if(t.oOperation){return undefined;}if(t.oContext&&t.oContext.withCache){return t.oContext.withCache(p,P[0]==="/"?P:_.buildPath(t.sPath,P));}return undefined;});};return function(p){if(this){b.apply(this,arguments);}else{q.extend(p,b.prototype);}};},false);
