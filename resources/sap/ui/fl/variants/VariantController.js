/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/fl/Utils","sap/ui/fl/Change","sap/ui/fl/Variant"],function(U,C,V){"use strict";var _=function(){};var a=function(c,A,o){this._sComponentName=c||"";this._sAppVersion=A||U.DEFAULT_APP_VERSION;this._mVariantManagement={};this.setChangeFileContent(o,{});this.sVariantTechnicalParameterName="sap-ui-fl-control-variant-id";this._oResourceBundle=sap.ui.getCore().getLibraryResourceBundle("sap.ui.fl");};a.prototype.getComponentName=function(){return this._sComponentName;};a.prototype.getAppVersion=function(){return this._sAppVersion;};a.prototype.setChangeFileContent=function(c,t){if(Object.keys(this._mVariantManagement).length===0){this._mVariantManagement={};}if(c&&c.changes&&c.changes.variantSection){Object.keys(c.changes.variantSection).forEach(function(v){if(this._mVariantManagement[v]){return;}this._mVariantManagement[v]={};var o=c.changes.variantSection[v];var b=o.variants.concat();var s;var i=-1;b.forEach(function(d,e){if(d.content.fileName===v){i=e;}if(!d.content.content.favorite){d.content.content.favorite=true;}if(!d.content.content.visible){d.content.content.visible=true;}var T=d.content.content.title.match(/.i18n>(\w+)./);if(T){d.content.content.title=this._oResourceBundle.getText(T[1]);}this._applyChangesOnVariant(d);if(t&&Array.isArray(t[this.sVariantTechnicalParameterName])){t[this.sVariantTechnicalParameterName].some(function(u){if(d.content.fileName===u){s=d.content.fileName;return true;}});}}.bind(this));if(i>-1){var S=b.splice(i,1)[0];b.sort(this.compareVariants);b.splice(0,0,S);}this._mVariantManagement[v].variants=b;this._mVariantManagement[v].defaultVariant=v;if(s){this._mVariantManagement[v].currentVariant=s;}this._mVariantManagement[v].variantManagementChanges=c.changes.variantSection[v].variantManagementChanges;this._applyChangesOnVariantManagement(this._mVariantManagement[v]);}.bind(this));}};a.prototype.getChangeFileContent=function(){return this._mVariantManagement;};a.prototype.compareVariants=function(v,o){if(v.content.content.title.toLowerCase()<o.content.content.title.toLowerCase()){return-1;}else if(v.content.content.title.toLowerCase()>o.content.content.title.toLowerCase()){return 1;}else{return 0;}};a.prototype.getVariants=function(v){var b=this._mVariantManagement[v]&&this._mVariantManagement[v].variants;return b?b:[];};a.prototype.getVariant=function(v,s){var o;var b=this.getVariants(v);b.some(function(c){if(c.content.fileName===s){o=c;return true;}});return o;};a.prototype.getVariantChanges=function(v,s,c){var s=s||this._mVariantManagement[v].defaultVariant;var r=[];if(s&&typeof s==="string"){var o=this.getVariant(v,s);r=o.controlChanges;if(c){r=r.map(function(b,i){var d;if(!b.getDefinition){d=new C(b);o.controlChanges.splice(i,1,d);}else{d=b;}return d;});}}return r;};a.prototype._getReferencedChanges=function(v,c){var r=[];if(c.content.variantReference){r=this.getVariantChanges(v,c.content.variantReference,true);return r.filter(function(R){return U.compareAgainstCurrentLayer(R.getDefinition().layer,c.content.layer)===-1;});}return r;};a.prototype.setVariantChanges=function(v,s,c){if(!v||!s||!Array.isArray(c)){U.log.error("Cannot set variant changes without Variant reference");return;}return this._mVariantManagement[v].variants.some(function(o){if(o.content.fileName===s){o.controlChanges=c;return true;}});};a.prototype._setVariantData=function(c,v,p){var b=this._mVariantManagement[v].variants;var o=b[p];Object.keys(c).forEach(function(P){if(o.content.content[P]){o.content.content[P]=c[P];}});if(o.content.fileName!==v){b.splice(p,1);var s=this._getIndexToSortVariant(b.slice(1),o);b.splice(s+1,0,o);return s+1;}else{b.splice(p,1,o);return p;}};a.prototype._updateChangesForVariantManagementInMap=function(c,v,A){var o=this._mVariantManagement[v];var s=c.changeType;if(c.fileType==="ctrl_variant_change"){o.variants.some(function(b){if(b.content.fileName===c.selector.id){if(!b.variantChanges[s]){b.variantChanges[s]=[];}if(A){b.variantChanges[s].push(c);}else{b.variantChanges[s].some(function(e,i){if(e.fileName===c.fileName){b.variantChanges[s].splice(i,1);return true;}});}return true;}});}else if(c.fileType==="ctrl_variant_management_change"){if(!o.variantManagementChanges){o.variantManagementChanges={};}if(!o.variantManagementChanges[s]){o.variantManagementChanges[s]=[];}if(A){o.variantManagementChanges[s].push(c);}else{o.variantManagementChanges[s].some(function(e,i){if(e.fileName===c.fileName){o.variantManagementChanges[s].splice(i,1);return true;}});}}};a.prototype.loadInitialChanges=function(){return Object.keys(this._mVariantManagement).reduce(function(i,v){var c=this._mVariantManagement[v].currentVariant?"currentVariant":"defaultVariant";var I=this.getVariant(v,this._mVariantManagement[v][c]);if(!I||!I.content.content.visible){this._mVariantManagement[v][c]=v;}return i.concat(this.getVariantChanges(v,this._mVariantManagement[v][c],false));}.bind(this),[]);};a.prototype.getChangesForVariantSwitch=function(p){var c=this.getVariantChanges(p.variantManagementReference,p.currentVariantReference,true);var m=[],b=[];Object.keys(p.changesMap).forEach(function(d){p.changesMap[d].forEach(function(M){m=m.concat(M);b=b.concat(M.getId());});});c=c.reduce(function(f,o){var M=b.indexOf(o.getDefinition().fileName);if(M>-1){f=f.concat(m[M]);}return f;},[]);var n=this.getVariantChanges(p.variantManagementReference,p.newVariantReference,true);var r=[];if(n.length>0){r=c.slice();c.some(function(o){if(n[0]&&o.getId()===n[0].getId()){n.shift();r.shift();}else{return true;}});}else{r=c;}var s={changesToBeReverted:r.reverse(),changesToBeApplied:n};return s;};a.prototype._applyChangesOnVariant=function(v){var m=v.variantChanges,A;Object.keys(m).forEach(function(c){switch(c){case"setTitle":A=this._getActiveChange(c,m);if(A){v.content.content.title=A.getText("title");}break;case"setFavorite":A=this._getActiveChange(c,m);if(A){v.content.content.favorite=A.getContent().favorite;}break;case"setVisible":A=this._getActiveChange(c,m);if(A){v.content.content.visible=A.getContent().visible;}break;default:U.log.error("No valid changes on variant "+v.content.content.title+" available");}}.bind(this));};a.prototype._applyChangesOnVariantManagement=function(v){var m=v.variantManagementChanges,A;if(Object.keys(m).length>0){A=this._getActiveChange("setDefault",m);if(A){v.defaultVariant=A.getContent().defaultVariant;}}};a.prototype._getActiveChange=function(c,m){var l=m[c].length-1;if(l>-1){return new C(m[c][l]);}return false;};a.prototype.fillVariantModel=function(){var v={};Object.keys(this._mVariantManagement).forEach(function(k){v[k]={defaultVariant:this._mVariantManagement[k].defaultVariant,variants:[]};if(this._mVariantManagement[k].currentVariant){v[k].currentVariant=this._mVariantManagement[k].currentVariant;}this.getVariants(k).forEach(function(o,i){v[k].variants[i]=JSON.parse(JSON.stringify({key:o.content.fileName,title:o.content.content.title,layer:o.content.layer,favorite:o.content.content.favorite,visible:o.content.content.visible}));});}.bind(this));return v;};a.prototype.updateCurrentVariantInMap=function(v,n){this._mVariantManagement[v].currentVariant=n;};a.prototype.addChangeToVariant=function(c,v,s){var n=this.getVariantChanges(v,s,true);var b=n.map(function(c){return c.getDefinition().fileName;});var i=b.indexOf(c.getDefinition().fileName);if(i===-1){n.push(c);return this.setVariantChanges(v,s,n);}return false;};a.prototype.removeChangeFromVariant=function(c,v,s){var b=this.getVariantChanges(v,s,true);b=b.filter(function(o){return o.getId()!==c.getId();});return this.setVariantChanges(v,s,b);};a.prototype.addVariantToVariantManagement=function(v,s){var b=this._mVariantManagement[s].variants.slice().splice(1);var i=this._getIndexToSortVariant(b,v);if(v.content.variantReference){var r=this._getReferencedChanges(s,v);v.controlChanges=r.concat(v.controlChanges);}this._mVariantManagement[s].variants.splice(i+1,0,v);return i+1;};a.prototype._getIndexToSortVariant=function(v,o){var i=0;v.some(function(e,b){if(this.compareVariants(o,e)<0){i=b;return true;}i=b+1;}.bind(this));return i;};a.prototype.removeVariantFromVariantManagement=function(v,s){var i;var f=this._mVariantManagement[s].variants.some(function(c,b){var o=new V(c);if(o.getId()===v.getId()){i=b;return true;}});if(f){this._mVariantManagement[s].variants.splice(i,1);}return i;};a.prototype.assignResetMapListener=function(l){_=l;};a.prototype.resetMap=function(r){if(r){return Promise.resolve(_.call(null));}this._mVariantManagement={};return Promise.resolve();};a.prototype.checkAndSetVariantContent=function(c,t){var v=this.getChangeFileContent();var s=Object.keys(v).length===0||Object.keys(v).every(function(b){var d=v[b].variants;return d.length===1&&!d[0].content.layer&&d[0].controlChanges.length===0&&Object.keys(d[0].variantChanges).length===0;});if(s){this.setChangeFileContent(c,t);}};return a;},true);
