/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/base/util/LoaderExtensions'],function(L){"use strict";var V={};V.load=function(o){o=o||{};o.async=true;return V._load(o);};var v=null;V._load=function(o){if(typeof o!=="object"){o={library:o};}o.async=o.async===true;o.failOnError=o.failOnError!==false;if(!sap.ui.versioninfo){if(o.async&&v instanceof Promise){return v.then(function(){return V._load(o);});}var h=function(b){v=null;if(b===null){return undefined;}sap.ui.versioninfo=b;return V._load(o);};var H=function(e){v=null;throw e;};var r=L.loadResource("sap-ui-version.json",{async:o.async,failOnError:o.async||o.failOnError});if(r instanceof Promise){v=r;return r.then(h,H);}else{return h(r);}}else{var R;if(typeof o.library!=="undefined"){var a=sap.ui.versioninfo.libraries;if(a){for(var i=0,l=a.length;i<l;i++){if(a[i].name===o.library){R=a[i];break;}}}}else{R=sap.ui.versioninfo;}return o.async?Promise.resolve(R):R;}};var k;var K;function t(){if(sap.ui.versioninfo&&sap.ui.versioninfo.libraries&&!k){k={};sap.ui.versioninfo.libraries.forEach(function(l,i){k[l.name]={};var d=l.manifestHints&&l.manifestHints.dependencies&&l.manifestHints.dependencies.libs;for(var D in d){if(!d[D].lazy){k[l.name][D]=true;}}});}if(sap.ui.versioninfo&&sap.ui.versioninfo.components&&!K){K={};Object.keys(sap.ui.versioninfo.components).forEach(function(c){var C=sap.ui.versioninfo.components[c];K[c]={library:C.library,dependencies:[]};var d=C.manifestHints&&C.manifestHints.dependencies&&C.manifestHints.dependencies.libs;for(var D in d){if(!d[D].lazy){K[c].dependencies.push(D);}}});}}V._getTransitiveDependencyForLibraries=function(l){t();if(k){var c=l.reduce(function(a,b){a[b]=true;return Object.assign(a,k[b]);},{});l=Object.keys(c);}return l;};V._getTransitiveDependencyForComponent=function(c){t();if(K){return K[c];}};return V;});
