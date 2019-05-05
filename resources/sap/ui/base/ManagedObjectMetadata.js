/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/thirdparty/jquery','./DataType','./Metadata','sap/base/Log','sap/base/assert','sap/base/util/ObjectPath','sap/base/strings/escapeRegExp','sap/base/util/merge','sap/base/util/isPlainObject'],function(q,D,M,L,b,O,e,c,g){"use strict";var h=function(s,o){M.apply(this,arguments);};h.prototype=Object.create(M.prototype);var j=Object.prototype.hasOwnProperty;function k(n){return n.charAt(0).toUpperCase()+n.slice(1);}var r=/(children|ies|ves|oes|ses|ches|shes|xes|s)$/i;var S={'children':-3,'ies':'y','ves':'f','oes':-2,'ses':-2,'ches':-2,'shes':-2,'xes':-2,'s':-1};function l(n){return n.replace(r,function($,p){var v=S[p.toLowerCase()];return typeof v==="string"?v:p.slice(0,v);});}function u(f,n){return function(){L.warning("Usage of deprecated feature: "+n);return f.apply(this,arguments);};}function w(o,i){var a=null;for(var n in i){if(j.call(i,n)&&typeof o[n]==='undefined'){a=a||{};a[n]=i[n];}}return a;}var K={SPECIAL_SETTING:-1,PROPERTY:0,SINGLE_AGGREGATION:1,MULTIPLE_AGGREGATION:2,SINGLE_ASSOCIATION:3,MULTIPLE_ASSOCIATION:4,EVENT:5};h._guessSingularName=l;function x(o,n,i){i=typeof i!=='object'?{type:i}:i;this.name=n;this.type=i.type||'any';this.visibility=i.visibility||'public';this.defaultValue=i.defaultValue;this.appData=w(this,i);this._oParent=o;this._sUID="special:"+n;this._iKind=K.SPECIAL_SETTING;}function P(o,n,i){i=typeof i!=='object'?{type:i}:i;this.name=n;this.type=i.type||'string';this.group=i.group||'Misc';this.defaultValue=i.defaultValue!==null?i.defaultValue:null;this.bindable=!!i.bindable;this.deprecated=!!i.deprecated||false;this.visibility=i.visibility||'public';this.byValue=i.byValue===true;this.selector=typeof i.selector==="string"?i.selector:null;this.appData=w(this,i);this._oParent=o;this._sUID=n;this._iKind=K.PROPERTY;var N=k(n);this._sMutator='set'+N;this._sGetter='get'+N;if(this.bindable){this._sBind='bind'+N;this._sUnbind='unbind'+N;}else{this._sBind=this._sUnbind=undefined;}this._oType=null;}P.prototype.generate=function(a){var t=this,n=t.name;a(t._sGetter,function(){return this.getProperty(n);});a(t._sMutator,function(v){this.setProperty(n,v);return this;},t);if(t.bindable){a(t._sBind,function(p,f,m){this.bindProperty(n,p,f,m);return this;},t);a(t._sUnbind,function(p){this.unbindProperty(n,p);return this;});}};P.prototype.getType=function(){return this._oType||(this._oType=D.getType(this.type));};P.prototype.getDefaultValue=function(){var d=this.defaultValue,t;if(d===null){t=this.getType();if(t instanceof D){d=t.getDefaultValue();}}return d;};P.prototype.get=function(i){if(this.visibility!=='public'){return i.getProperty(this.name);}return i[this._sGetter]();};P.prototype.set=function(i,v){if(this.visibility!=='public'){return i.setProperty(this.name,v);}return i[this._sMutator](v);};function A(o,n,i){i=typeof i!=='object'?{type:i}:i;this.name=n;this.type=i.type||'sap.ui.core.Control';this.altTypes=Array.isArray(i.altTypes)?i.altTypes:undefined;this.multiple=typeof i.multiple==='boolean'?i.multiple:true;this.singularName=this.multiple?i.singularName||l(n):undefined;this.bindable=!!i.bindable;this.deprecated=i.deprecated||false;this.visibility=i.visibility||'public';this.selector=i.selector||null;this.forwarding=i.forwarding;this._doesNotRequireFactory=!!i._doesNotRequireFactory;this.appData=w(this,i);this._oParent=o;this._sUID='aggregation:'+n;this._iKind=this.multiple?K.MULTIPLE_AGGREGATION:K.SINGLE_AGGREGATION;this._oForwarder=this.forwarding?new y(this):undefined;var N=k(n);this._sGetter='get'+N;if(this.multiple){var a=k(this.singularName);this._sMutator='add'+a;this._sInsertMutator='insert'+a;this._sRemoveMutator='remove'+a;this._sRemoveAllMutator='removeAll'+N;this._sIndexGetter='indexOf'+a;this._sUpdater='update'+N;this._sRefresher='refresh'+N;}else{this._sMutator='set'+N;this._sInsertMutator=this._sRemoveMutator=this._sRemoveAllMutator=this._sIndexGetter=this._sUpdater=this._sRefresher=undefined;}this._sDestructor='destroy'+N;if(this.bindable){this._sBind='bind'+N;this._sUnbind='unbind'+N;}else{this._sBind=this._sUnbind=undefined;}}A.prototype.generate=function(d){var m=this,n=m.name;if(!m.multiple){d(m._sGetter,function(){return this.getAggregation(n);});d(m._sMutator,function(v){this.setAggregation(n,v);return this;},m);}else{d(m._sGetter,function(){return this.getAggregation(n,[]);});d(m._sMutator,function(a){this.addAggregation(n,a);return this;},m);d(m._sInsertMutator,function(i,a){this.insertAggregation(n,i,a);return this;},m);d(m._sRemoveMutator,function(a){return this.removeAggregation(n,a);});d(m._sRemoveAllMutator,function(){return this.removeAllAggregation(n);});d(m._sIndexGetter,function(a){return this.indexOfAggregation(n,a);});}d(m._sDestructor,function(){this.destroyAggregation(n);return this;});if(m.bindable){d(m._sBind,function(p,t,s,f){this.bindAggregation(n,p,t,s,f);return this;},m);d(m._sUnbind,function(p){this.unbindAggregation(n,p);return this;});}};A.prototype.getType=function(){return this._oType||(this._oType=D.getType(this.type));};A.prototype.get=function(i){if(this.visibility!=='public'){return i.getAggregation(this.name,this.multiple?[]:undefined);}return i[this._sGetter]();};A.prototype.set=function(i,v){if(this.visibility!=='public'){return i.setAggregation(this.name,v);}return i[this._sMutator](v);};A.prototype.add=function(i,v){if(this.visibility!=='public'){return i.addAggregation(this.name,v);}return i[this._sMutator](v);};A.prototype.insert=function(i,v,p){if(this.visibility!=='public'){return i.insertAggregation(this.name,v,p);}return i[this._sInsertMutator](v,p);};A.prototype.remove=function(i,v){if(this.visibility!=='public'){return i.removeAggregation(this.name,v);}return i[this._sRemoveMutator](v);};A.prototype.removeAll=function(i){if(this.visibility!=='public'){return i.removeAllAggregation(this.name);}return i[this._sRemoveAllMutator]();};A.prototype.indexOf=function(i,v){if(this.visibility!=='public'){return i.indexOfAggregation(this.name,v);}return i[this._sIndexGetter](v);};A.prototype.destroy=function(i){return i[this._sDestructor]();};function y(a){var f=a.forwarding;this.aggregation=a;this.targetAggregationName=f.aggregation;this.forwardBinding=f.forwardBinding;this.targetAggregationInfo=null;if(f.getter){if(typeof f.getter==="function"){this._getTarget=f.getter;}else{this._getTarget=(function(s){return function(){return this[s]();};})(f.getter);}}else if(f.idSuffix){this._getTarget=(function(i){return function(){return sap.ui.getCore().byId(this.getId()+i);};})(f.idSuffix);}else{throw new Error("Either getter or idSuffix must be given for forwarding the aggregation "+a.name+" to the aggregation "+f.aggregation+" in "+a._oParent.getName());}}y.prototype._getTargetAggregationInfo=function(t){var T=this.targetAggregationInfo;if(!T&&t){T=this.targetAggregationInfo=t.getMetadata().getAggregation(this.targetAggregationName);if(!T){throw new Error("Target aggregation "+this.targetAggregationName+" not found on "+t);}if(this.aggregation.multiple&&!T.multiple){throw new Error("Aggregation "+this.aggregation+" (multiple: "+this.aggregation.multiple+") cannot be forwarded to aggregation "+this.targetAggregationName+" (multiple: "+T.multiple+")");}if(!this.aggregation.multiple&&T.multiple&&this.aggregation.forwarding.forwardBinding){throw new Error("Aggregation "+this.aggregation+" (multiple: "+this.aggregation.multiple+") cannot be forwarded to aggregation "+this.targetAggregationName+" (multiple: "+T.multiple+") with 'forwardBinding' set to 'true'");}}return T;};y.prototype.getTarget=function(i,a){var t=this._getTarget.call(i);this._getTargetAggregationInfo(t);if(t){i.mForwardedAggregations=i.mForwardedAggregations||{};if(i.mForwardedAggregations[this.aggregation.name]===undefined||a){var T=t.mAggregations[this.targetAggregationInfo.name];if(T&&!a&&!this.aggregation.forwarding.forwardBinding&&!(Array.isArray(T)&&T.length===0)){throw new Error("There is already content in aggregation "+this.targetAggregationInfo.name+" of "+t+" to which forwarding is being set up now.");}else{var v=t.mAggregations[this.targetAggregationInfo.name]||(this.targetAggregationInfo.multiple?[]:null);i.mForwardedAggregations[this.aggregation.name]=t.mAggregations[this.targetAggregationInfo.name]=v;}}}return t;};y.prototype.get=function(i){var t=this.getTarget(i);if(t){var a=this.targetAggregationInfo.get(t);if(!this.aggregation.multiple&&this.targetAggregationInfo.multiple){a=a[0];}return a;}else{return this.aggregation.multiple?[]:null;}};y.prototype.indexOf=function(i,a){var t=this.getTarget(i);return this.targetAggregationInfo.indexOf(t,a);};y.prototype.set=function(i,a){var t=this.getTarget(i);i.mForwardedAggregations[this.aggregation.name]=a;if(this.targetAggregationInfo.multiple){var p=this.targetAggregationInfo.get(t);if(p&&p[0]){if(p[0]===a){return i;}this.targetAggregationInfo.removeAll(t);}h.addAPIParentInfoBegin(a,i,this.aggregation.name);this.targetAggregationInfo.add(t,a);}else{h.addAPIParentInfoBegin(a,i,this.aggregation.name);this.targetAggregationInfo.set(t,a);}h.addAPIParentInfoEnd(a);return i;};y.prototype.add=function(i,a){var t=this.getTarget(i);h.addAPIParentInfoBegin(a,i,this.aggregation.name);this.targetAggregationInfo.add(t,a);h.addAPIParentInfoEnd(a);return i;};y.prototype.insert=function(i,a,d){var t=this.getTarget(i);h.addAPIParentInfoBegin(a,i,this.aggregation.name);this.targetAggregationInfo.insert(t,a,d);h.addAPIParentInfoEnd(a);return i;};h.addAPIParentInfoBegin=function(a,p,s){if(!a){return;}var n={parent:p,aggregationName:s};if(a.aAPIParentInfos){if(a.aAPIParentInfos.forwardingCounter){a.aAPIParentInfos.forwardingCounter++;}else{delete a.aAPIParentInfos;}}if(!a.aAPIParentInfos){a.aAPIParentInfos=[n];a.aAPIParentInfos.forwardingCounter=1;}else{a.aAPIParentInfos.push(n);}};h.addAPIParentInfoEnd=function(a){a&&a.aAPIParentInfos.forwardingCounter--;};y.prototype.remove=function(i,a){var t=this.getTarget(i);var d=this.targetAggregationInfo.remove(t,a);if(d){d.aAPIParentInfos&&d.aAPIParentInfos.pop();}return d;};y.prototype.removeAll=function(o){var t=this.getTarget(o);delete o.mForwardedAggregations[this.aggregation.name];var a=this.targetAggregationInfo.removeAll(t);for(var i=0;i<a.length;i++){if(a[i].aAPIParentInfos){a[i].aAPIParentInfos.pop();}}return a;};y.prototype.destroy=function(i){var t=this.getTarget(i);delete i.mForwardedAggregations[this.aggregation.name];if(t){this.targetAggregationInfo.destroy(t);}return i;};function z(o,n,i){i=typeof i!=='object'?{type:i}:i;this.name=n;this.type=i.type||'sap.ui.core.Control';this.multiple=i.multiple||false;this.singularName=this.multiple?i.singularName||l(n):undefined;this.deprecated=i.deprecated||false;this.visibility=i.visibility||'public';this.appData=w(this,i);this._oParent=o;this._sUID='association:'+n;this._iKind=this.multiple?K.MULTIPLE_ASSOCIATION:K.SINGLE_ASSOCIATION;var N=k(n);this._sGetter='get'+N;if(this.multiple){var a=k(this.singularName);this._sMutator='add'+a;this._sRemoveMutator='remove'+a;this._sRemoveAllMutator='removeAll'+N;}else{this._sMutator='set'+N;this._sRemoveMutator=this._sRemoveAllMutator=undefined;}}z.prototype.generate=function(d){var t=this,n=t.name;if(!t.multiple){d(t._sGetter,function(){return this.getAssociation(n);});d(t._sMutator,function(v){this.setAssociation(n,v);return this;},t);}else{d(t._sGetter,function(){return this.getAssociation(n,[]);});d(t._sMutator,function(a){this.addAssociation(n,a);return this;},t);d(t._sRemoveMutator,function(a){return this.removeAssociation(n,a);});d(t._sRemoveAllMutator,function(){return this.removeAllAssociation(n);});if(n!==t.singularName){d('removeAll'+k(t.singularName),function(){L.warning("Usage of deprecated method "+t._oParent.getName()+".prototype."+'removeAll'+k(t.singularName)+","+" use method "+t._sRemoveAllMutator+" (plural) instead.");return this[t._sRemoveAllMutator]();});}}};z.prototype.getType=function(){return this._oType||(this._oType=D.getType(this.type));};z.prototype.get=function(i){if(this.visibility!=='public'){return i.getAssociation(this.name,this.multiple?[]:undefined);}return i[this._sGetter]();};z.prototype.set=function(i,v){if(this.visibility!=='public'){return i.setAssociation(this.name,v);}return i[this._sMutator](v);};z.prototype.add=function(i,v){if(this.visibility!=='public'){return i.addAssociation(this.name,v);}return i[this._sMutator](v);};z.prototype.remove=function(i,v){if(this.visibility!=='public'){return i.removeAssociation(this.name,v);}return i[this._sRemoveMutator](v);};z.prototype.removeAll=function(i){if(this.visibility!=='public'){return i.removeAllAssociation(this.name);}return i[this._sRemoveAllMutator]();};function E(o,n,i){this.name=n;this.allowPreventDefault=i.allowPreventDefault||false;this.deprecated=i.deprecated||false;this.visibility='public';this.allowPreventDefault=!!i.allowPreventDefault;this.enableEventBubbling=!!i.enableEventBubbling;this.appData=w(this,i);this._oParent=o;this._sUID='event:'+n;this._iKind=K.EVENT;var N=k(n);this._sMutator='attach'+N;this._sDetachMutator='detach'+N;this._sTrigger='fire'+N;}E.prototype.generate=function(a){var t=this,n=t.name,i=t.allowPreventDefault,m=t.enableEventBubbling;a(t._sMutator,function(d,f,o){this.attachEvent(n,d,f,o);return this;},t);a(t._sDetachMutator,function(f,o){this.detachEvent(n,f,o);return this;});a(t._sTrigger,function(p){return this.fireEvent(n,p,i,m);});};E.prototype.attach=function(i,d,f,a){return i[this._sMutator](d,f,a);};E.prototype.detach=function(i,f,a){return i[this._sDetachMutator](f,a);};E.prototype.fire=function(i,p,a,d){return i[this._sTrigger](p,a,d);};h.prototype.metaFactorySpecialSetting=x;h.prototype.metaFactoryProperty=P;h.prototype.metaFactoryAggregation=A;h.prototype.metaFactoryAssociation=z;h.prototype.metaFactoryEvent=E;h.prototype.applySettings=function(o){var t=this,s=o.metadata;M.prototype.applySettings.call(this,o);function n(m,N){var T={},V;if(m){for(V in m){if(j.call(m,V)){T[V]=new N(t,V,m[V]);}}}return T;}function f(m,N){var T={},V;for(V in m){if(N===(m[V].visibility==='public')){T[V]=m[V];}}return T;}var a=/([a-z][^.]*(?:\.[a-z][^.]*)*)\./;function d(N){var m=a.exec(N);return(m&&m[1])||"";}this._sLibraryName=s.library||d(this.getName());this._mSpecialSettings=n(s.specialSettings,this.metaFactorySpecialSetting);var i=n(s.properties,this.metaFactoryProperty);this._mProperties=f(i,true);this._mPrivateProperties=f(i,false);var p=n(s.aggregations,this.metaFactoryAggregation);this._mAggregations=f(p,true);this._mPrivateAggregations=f(p,false);this._sDefaultAggregation=s.defaultAggregation||null;this._sDefaultProperty=s.defaultProperty||null;var v=n(s.associations,this.metaFactoryAssociation);this._mAssociations=f(v,true);this._mPrivateAssociations=f(v,false);this._mEvents=n(s.events,this.metaFactoryEvent);this._oDesignTime=o.metadata["designtime"]||o.metadata["designTime"];this._sProvider=o.metadata["provider"];if(o.metadata.__version>1.0){this.generateAccessors();}};h.prototype.afterApplySettings=function(){M.prototype.afterApplySettings.call(this);var p=this.getParent();if(p instanceof h){this._mAllEvents=q.extend({},p._mAllEvents,this._mEvents);this._mAllPrivateProperties=q.extend({},p._mAllPrivateProperties,this._mPrivateProperties);this._mAllProperties=q.extend({},p._mAllProperties,this._mProperties);this._mAllPrivateAggregations=q.extend({},p._mAllPrivateAggregations,this._mPrivateAggregations);this._mAllAggregations=q.extend({},p._mAllAggregations,this._mAggregations);this._mAllPrivateAssociations=q.extend({},p._mAllPrivateAssociations,this._mPrivateAssociations);this._mAllAssociations=q.extend({},p._mAllAssociations,this._mAssociations);this._sDefaultAggregation=this._sDefaultAggregation||p._sDefaultAggregation;this._sDefaultProperty=this._sDefaultProperty||p._sDefaultProperty;this._mAllSpecialSettings=q.extend({},p._mAllSpecialSettings,this._mSpecialSettings);this._sProvider=this._sProvider||p._sProvider;}else{this._mAllEvents=this._mEvents;this._mAllPrivateProperties=this._mPrivateProperties;this._mAllProperties=this._mProperties;this._mAllPrivateAggregations=this._mPrivateAggregations;this._mAllAggregations=this._mAggregations;this._mAllPrivateAssociations=this._mPrivateAssociations;this._mAllAssociations=this._mAssociations;this._mAllSpecialSettings=this._mSpecialSettings;}};h.Kind=K;h.prototype.getLibraryName=function(){return this._sLibraryName;};h.prototype.addProperty=function(n,i){var p=this._mProperties[n]=new P(this,n,i);if(!this._mAllProperties[n]){this._mAllProperties[n]=p;}};h.prototype.hasProperty=function(n){return!!this._mAllProperties[n];};h.prototype.getProperty=function(n){var p=this._mAllProperties[n];return typeof p==='object'?p:undefined;};h.prototype.getProperties=function(){return this._mProperties;};h.prototype.getAllProperties=function(){return this._mAllProperties;};h.prototype.getAllPrivateProperties=function(){return this._mAllPrivateProperties;};h.prototype.getManagedProperty=function(n){n=n||this._sDefaultProperty;var p=n?this._mAllProperties[n]||this._mAllPrivateProperties[n]:undefined;return typeof p==='object'?p:undefined;};h.prototype.getDefaultPropertyName=function(){return this._sDefaultProperty;};h.prototype.getDefaultProperty=function(){return this.getProperty(this.getDefaultPropertyName());};h.prototype.hasAggregation=function(n){return!!this._mAllAggregations[n];};h.prototype.getAggregation=function(n){n=n||this._sDefaultAggregation;var a=n?this._mAllAggregations[n]:undefined;return typeof a==='object'?a:undefined;};h.prototype.getAggregations=function(){return this._mAggregations;};h.prototype.getAllAggregations=function(){return this._mAllAggregations;};h.prototype.getAllPrivateAggregations=function(){return this._mAllPrivateAggregations;};h.prototype.getManagedAggregation=function(a){a=a||this._sDefaultAggregation;var o=a?this._mAllAggregations[a]||this._mAllPrivateAggregations[a]:undefined;return typeof o==='object'?o:undefined;};h.prototype.getDefaultAggregationName=function(){return this._sDefaultAggregation;};h.prototype.getDefaultAggregation=function(){return this.getAggregation();};h.prototype.forwardAggregation=function(f,o){var a=this.getAggregation(f);if(!a){throw new Error("aggregation "+f+" does not exist");}if(!o||!o.aggregation||!(o.idSuffix||o.getter)||(o.idSuffix&&o.getter)){throw new Error("an 'mOptions' object with 'aggregation' property and either 'idSuffix' or 'getter' property (but not both) must be given"+" but does not exist");}if(a._oParent===this){a.forwarding=o;a._oForwarder=new y(a);}else{a=new this.metaFactoryAggregation(this,f,{type:a.type,altTypes:a.altTypes,multiple:a.multiple,singularName:a.singularName,bindable:a.bindable,deprecated:a.deprecated,visibility:a.visibility,selector:a.selector,forwarding:o});this._mAggregations[f]=this._mAllAggregations[f]=a;}};h.prototype.getAggregationForwarder=function(a){var o=this._mAllAggregations[a];return o?o._oForwarder:undefined;};h.prototype.getDefaultPropertyName=function(){return this._sDefaultProperty;};h.prototype.getDefaultProperty=function(){return this.getProperty(this.getDefaultPropertyName());};h.prototype.getPropertyLikeSetting=function(n){var p=this._mAllProperties[n];if(typeof p==='object'){return p;}p=this._mAllAggregations[n];return(typeof p==='object'&&p.altTypes&&p.altTypes.length>0)?p:undefined;};h.prototype.hasAssociation=function(n){return!!this._mAllAssociations[n];};h.prototype.getAssociation=function(n){var a=this._mAllAssociations[n];return typeof a==='object'?a:undefined;};h.prototype.getAssociations=function(){return this._mAssociations;};h.prototype.getAllAssociations=function(){return this._mAllAssociations;};h.prototype.getAllPrivateAssociations=function(){return this._mAllPrivateAssociations;};h.prototype.getManagedAssociation=function(n){var a=this._mAllAssociations[n]||this._mAllPrivateAssociations[n];return typeof a==='object'?a:undefined;};h.prototype.hasEvent=function(n){return!!this._mAllEvents[n];};h.prototype.getEvent=function(n){var o=this._mAllEvents[n];return typeof o==='object'?o:undefined;};h.prototype.getEvents=function(){return this._mEvents;};h.prototype.getAllEvents=function(){return this._mAllEvents;};h.prototype.addSpecialSetting=function(n,i){var s=new x(this,n,i);this._mSpecialSettings[n]=s;if(!this._mAllSpecialSettings[n]){this._mAllSpecialSettings[n]=s;}};h.prototype.hasSpecialSetting=function(n){return!!this._mAllSpecialSettings[n];};h.prototype.getPropertyDefaults=function(){var d=this._mDefaults,s;if(d){return d;}if(this.getParent()instanceof h){d=q.extend({},this.getParent().getPropertyDefaults());}else{d={};}for(s in this._mProperties){d[s]=this._mProperties[s].getDefaultValue();}for(s in this._mPrivateProperties){d[s]=this._mPrivateProperties[s].getDefaultValue();}this._mDefaults=d;return d;};h.prototype.createPropertyBag=function(){if(!this._fnPropertyBagFactory){this._fnPropertyBagFactory=function PropertyBag(){};this._fnPropertyBagFactory.prototype=this.getPropertyDefaults();}return new(this._fnPropertyBagFactory)();};h.prototype._enrichChildInfos=function(){L.error("obsolete call to ManagedObjectMetadata._enrichChildInfos. This private method will be deleted soon");};h.prototype.getJSONKeys=function(){if(this._mJSONKeys){return this._mJSONKeys;}var a={},d={};function f(m){var n,i,p;for(n in m){i=m[n];p=a[n];if(!p||i._iKind<p._iKind){a[n]=d[n]=i;}d[i._sUID]=i;}}f(this._mAllSpecialSettings);f(this.getAllProperties());f(this.getAllAggregations());f(this.getAllAssociations());f(this.getAllEvents());this._mJSONKeys=d;this._mAllSettings=a;return this._mJSONKeys;};h.prototype.getAllSettings=function(){if(!this._mAllSettings){this.getJSONKeys();}return this._mAllSettings;};h.prototype.removeUnknownSettings=function(s){b(s==null||typeof s==='object',"mSettings must be null or an object");if(s==null){return s;}var v=this.getJSONKeys(),m={},n;for(n in s){if(j.call(v,n)){m[n]=s[n];}}return m;};h.prototype.generateAccessors=function(){var p=this.getClass().prototype,a=this.getName()+".",m=this._aPublicMethods,n;function d(f,i,o){if(!p[f]){p[f]=(o&&o.deprecated)?u(i,a+o.name):i;}m.push(f);}for(n in this._mProperties){this._mProperties[n].generate(d);}for(n in this._mAggregations){this._mAggregations[n].generate(d);}for(n in this._mAssociations){this._mAssociations[n].generate(d);}for(n in this._mEvents){this._mEvents[n].generate(d);}};function B(m){var s=m.getLibraryName(),p=sap.ui.getCore().getConfiguration().getPreload(),o=sap.ui.getCore().getLoadedLibraries()[s];if(o&&o.designtime){var a;if(p==="async"||p==="sync"){a=sap.ui.loader._.loadJSResourceAsync(o.designtime.replace(/\.designtime$/,"-preload.designtime.js"),true);}else{a=Promise.resolve();}return new Promise(function(f){a.then(function(){sap.ui.require([o.designtime],function(d){f(d);});});});}return Promise.resolve(null);}function C(m){if(g(m._oDesignTime)||!m._oDesignTime){return Promise.resolve(m._oDesignTime||{});}return new Promise(function(f){var s;if(typeof m._oDesignTime==="string"){s=m._oDesignTime;}else{s=m.getName().replace(/\./g,"/")+".designtime";}B(m).then(function(o){sap.ui.require([s],function(d){d.designtimeModule=s;m._oDesignTime=d;d._oLib=o;f(d);});});});}var F={};h.setDesignTimeDefaultMapping=function(p){F=p;};function G(i){var s=i instanceof O.get('sap.ui.base.ManagedObject')&&typeof i.data==="function"&&i.data("sap-ui-custom-settings")&&i.data("sap-ui-custom-settings")["sap.ui.dt"]&&i.data("sap-ui-custom-settings")["sap.ui.dt"].designtime;if(typeof s==="string"){s=F[s]||s;return new Promise(function(f){sap.ui.require([s],function(d){f(d);});});}else{return Promise.resolve({});}}function H(m,s){var a=m;if("default"in m){a=c({},m.default,s!=="default"&&m[s]||null);}return a;}function I(o,p,s){return c({},H(p,s),{templates:{create:null}},H(o,s),{designtimeModule:o.designtimeModule||undefined,_oLib:o._oLib});}h.prototype.loadDesignTime=function(m,s){s=typeof s==="string"&&s||"default";var i=G(m);if(!this._oDesignTimePromise){var W;var p=this.getParent();if(p instanceof h){W=p.loadDesignTime(null,s);}else{W=Promise.resolve({});}this._oDesignTimePromise=C(this).then(function(o){return W.then(function(a){return I(o,a,s);});});}return Promise.all([i,this._oDesignTimePromise]).then(function(d){var o=d[0],a=d[1];return c({},a,H(o||{},s));});};var U={},J;function Q(i){b(!/[0-9]+$/.exec(i),"AutoId Prefixes must not end with numbers");i=(J||(J=sap.ui.getCore().getConfiguration().getUIDPrefix()))+i;var a=U[i]||0;U[i]=a+1;return i+a;}h.uid=Q;h.prototype.uid=function(){var i=this._sUIDToken;if(typeof i!=="string"){i=this.getName();i=i.slice(i.lastIndexOf('.')+1);i=i.replace(/([a-z])([A-Z])/g,"$1 $2").split(" ").slice(-1)[0];i=this._sUIDToken=i.replace(/([^A-Za-z0-9-_.:])|([0-9]+$)/g,"").toLowerCase();}return Q(i);};var R;h.isGeneratedId=function(i){J=J||sap.ui.getCore().getConfiguration().getUIDPrefix();R=R||new RegExp("(^|-{1,3})"+e(J));return R.test(i);};return h;},true);
