/*
 * ! OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/model/Context','sap/ui/model/PropertyBinding','sap/ui/model/json/JSONModel','sap/ui/model/Filter','sap/ui/model/FilterOperator','sap/ui/Device','sap/ui/core/InvisibleText','sap/ui/core/Control','sap/ui/core/Icon','sap/ui/layout/HorizontalLayout','sap/ui/layout/Grid','sap/m/SearchField','sap/m/RadioButton','sap/m/ColumnListItem','sap/m/Column','sap/m/Text','sap/m/Bar','sap/m/Table','sap/m/Page','sap/m/Toolbar','sap/m/ToolbarSpacer','sap/m/Button','sap/m/CheckBox','sap/m/Dialog','sap/m/Input','sap/m/Label','sap/m/Title','sap/m/ResponsivePopover','sap/m/SelectList','sap/m/ObjectIdentifier','sap/m/OverflowToolbar','sap/m/OverflowToolbarLayoutData','sap/m/VBox','sap/ui/events/KeyCodes','sap/ui/core/library','sap/m/library'],function(C,P,J,F,a,D,I,b,c,H,G,S,R,d,f,T,B,g,h,i,j,k,l,m,n,L,o,p,q,O,r,s,V,K,t,u){"use strict";var v=u.OverflowToolbarPriority;var w=u.ButtonType;var x=u.PlacementType;var y=u.PopinDisplay;var z=u.ScreenSize;var A=t.ValueState;var E=t.TextAlign;var M=b.extend("sap.ui.fl.variants.VariantManagement",{metadata:{library:"sap.ui.fl",designtime:"sap/ui/fl/designtime/variants/VariantManagement.designtime",properties:{showExecuteOnSelection:{type:"boolean",group:"Misc",defaultValue:false},showSetAsDefault:{type:"boolean",group:"Misc",defaultValue:true},manualVariantKey:{type:"boolean",group:"Misc",defaultValue:false},inErrorState:{type:"boolean",group:"Misc",defaultValue:false},editable:{type:"boolean",group:"Misc",defaultValue:true},modelName:{type:"string",group:"Misc",defaultValue:null},updateVariantInURL:{type:"boolean",group:"Misc",defaultValue:false}},associations:{"for":{type:"sap.ui.core.Control",multiple:true}},events:{save:{parameters:{name:{type:"string"},overwrite:{type:"boolean"},key:{type:"string"},execute:{type:"boolean"},def:{type:"boolean"}}},manage:{},initialized:{},select:{parameters:{key:{type:"string"}}}}},renderer:function(e,N){e.write("<div ");e.writeControlData(N);e.addClass("sapUiFlVarMngmt");e.writeClasses();e.write(">");e.renderControl(N.oVariantLayout);e.write("</div>");}});M.MODEL_NAME="$FlexVariants";M.INNER_MODEL_NAME="$sapUiFlVariants";M.MAX_NAME_LEN=100;M.COLUMN_FAV_IDX=0;M.COLUMN_NAME_IDX=1;M.prototype.init=function(){this._sModelName=M.MODEL_NAME;this.attachModelContextChange(this._setModel,this);this._oRb=sap.ui.getCore().getLibraryResourceBundle("sap.ui.fl");this._createInnerModel();this.oVariantInvisibleText=new I({text:{parts:[{path:'currentVariant',model:this._sModelName},{path:"modified",model:this._sModelName}],formatter:function(N,Q){if(Q){N=this._oRb.getText("VARIANT_MANAGEMENT_SEL_VARIANT_MOD",[N]);}else{N=this._oRb.getText("VARIANT_MANAGEMENT_SEL_VARIANT",[N]);}}.bind(this)}});this.oVariantText=new o(this.getId()+"-text",{text:{path:'currentVariant',model:this._sModelName,formatter:function(N){var Q=this.getSelectedVariantText(N);return Q;}.bind(this)}});this.oVariantText.addStyleClass("sapUiFlVarMngmtClickable");this.oVariantText.addStyleClass("sapUiFlVarMngmtTitle");if(D.system.phone){this.oVariantText.addStyleClass("sapUiFlVarMngmtTextPhoneMaxWidth");}else{this.oVariantText.addStyleClass("sapUiFlVarMngmtTextMaxWidth");}var e=new L(this.getId()+"-modified",{text:"*",visible:{path:"modified",model:this._sModelName,formatter:function(N){return(N===null||N===undefined)?false:N;}}});e.setVisible(false);e.addStyleClass("sapUiFlVarMngmtModified");e.addStyleClass("sapUiFlVarMngmtClickable");e.addStyleClass("sapMTitleStyleH4");this.oVariantPopoverTrigger=new k(this.getId()+"-trigger",{icon:"sap-icon://slim-arrow-down",type:w.Transparent});this.oVariantPopoverTrigger.addAriaLabelledBy(this.oVariantInvisibleText);this.oVariantPopoverTrigger.addStyleClass("sapUiFlVarMngmtTriggerBtn");this.oVariantPopoverTrigger.addStyleClass("sapMTitleStyleH4");this.oVariantLayout=new H({content:[this.oVariantText,e,this.oVariantPopoverTrigger,this.oVariantInvisibleText]});this.oVariantLayout.addStyleClass("sapUiFlVarMngmtLayout");this.addDependent(this.oVariantLayout);};M.prototype.getTitle=function(){return this.oVariantText;};M.prototype._createInnerModel=function(){var e=new J({showExecuteOnSelection:false,showSetAsDefault:true,editable:true,popoverTitle:this._oRb.getText("VARIANT_MANAGEMENT_VARIANTS")});this.setModel(e,M.INNER_MODEL_NAME);this._bindProperties();};M.prototype._bindProperties=function(){this.bindProperty("showExecuteOnSelection",{path:"/showExecuteOnSelection",model:M.INNER_MODEL_NAME});this.bindProperty("showSetAsDefault",{path:"/showSetAsDefault",model:M.INNER_MODEL_NAME});this.bindProperty("editable",{path:"/editable",model:M.INNER_MODEL_NAME});};M.prototype.getOriginalDefaultVariantKey=function(){var e=this.getModel(this._sModelName);if(e&&this.oContext){return e.getProperty(this.oContext+"/originalDefaultVariant");}return null;};M.prototype.setDefaultVariantKey=function(e){var N=this.getModel(this._sModelName);if(N&&this.oContext){N.setProperty(this.oContext+"/defaultVariant",e);}};M.prototype.getDefaultVariantKey=function(){var e=this.getModel(this._sModelName);if(e&&this.oContext){return e.getProperty(this.oContext+"/defaultVariant");}return null;};M.prototype.setCurrentVariantKey=function(e){var N=this.getModel(this._sModelName);if(N&&this.oContext){N.setProperty(this.oContext+"/currentVariant",e);}return this;};M.prototype.getCurrentVariantKey=function(){var e=this.getModel(this._sModelName);if(e&&this.oContext){return e.getProperty(this.oContext+"/currentVariant");}return null;};M.prototype._assignPopoverTitle=function(){var e,N,Q=this.getModel(this._sModelName);if(Q&&this.oContext){e=Q.getProperty(this.oContext+"/popoverTitle");}if(e!==undefined){N=this.getModel(M.INNER_MODEL_NAME);if(N){N.setProperty("/popoverTitle",e);}}};M.prototype.getVariants=function(){return this._getItems();};M.prototype.setModified=function(e){var N=this.getModel(this._sModelName);if(N&&this.oContext){N.setProperty(this.oContext+"/modified",e);}};M.prototype.getModified=function(){var e=this.getModel(this._sModelName);if(e&&this.oContext){return e.getProperty(this.oContext+"/modified");}return false;};M.prototype.getSelectedVariantText=function(e){var N=this._getItemByKey(e);if(N){return N.title;}return"";};M.prototype.getStandardVariantKey=function(){var e=this._getItems();if(e&&e[0]){return e[0].key;}return null;};M.prototype.getShowFavorites=function(){var e=this.getModel(this._sModelName);if(e&&this.oContext){return e.getProperty(this.oContext+"/showFavorites");}return false;};M.prototype._clearDeletedItems=function(){this._aDeletedItems=[];};M.prototype._addDeletedItem=function(e){this._aDeletedItems.push(e);};M.prototype._getDeletedItems=function(e){return this._aDeletedItems;};M.prototype._getItems=function(){var e=[];if(this.oContext&&this.oContext.getObject()){e=this.oContext.getObject().variants.filter(function(N){if(!N.hasOwnProperty("visible")){return true;}return N.visible;});}return e;};M.prototype._getItemByKey=function(e){var N=null,Q=this._getItems();Q.some(function(U){if(U.key===e){N=U;}return(N!=null);});return N;};M.prototype._rebindControl=function(e){this.oVariantInvisibleText.unbindProperty("text");this.oVariantInvisibleText.bindProperty("text",{parts:[{path:'currentVariant',model:this._sModelName},{path:"modified",model:this._sModelName}],formatter:function(N,Q){if(Q){N=this._oRb.getText("VARIANT_MANAGEMENT_SEL_VARIANT_MOD",[N]);}else{N=this._oRb.getText("VARIANT_MANAGEMENT_SEL_VARIANT",[N]);}}.bind(this)});this.oVariantText.unbindProperty("text");this.oVariantText.bindProperty("text",{path:'currentVariant',model:this._sModelName,formatter:function(N){var Q=this.getSelectedVariantText(N);return Q;}.bind(this)});this.oVariantText.unbindProperty("visible",{path:"modified",model:this._sModelName,formatter:function(N){return(N===null||N===undefined)?false:N;}});};M.prototype.setModelName=function(e){if(this.getModelName()){this.oContext=null;}this.setProperty("modelName",e);this._sModelName=e;this._rebindControl();return this;};M.prototype._setBindingContext=function(){var e,N;if(!this.oContext){e=this.getModel(this._sModelName);if(e){N=this._getLocalId(e);if(N){this.oContext=new C(e,"/"+N);this.setBindingContext(this.oContext,this._sModelName);if(!this.getModelName()&&e.registerToModel){e.registerToModel(this);}this._assignPopoverTitle();this._registerPropertyChanges(e);this.fireInitialized();}}}};M.prototype._getLocalId=function(e){if(this.getModelName()&&(this._sModelName!==M.MODEL_NAME)){return this.getId();}return e.getVariantManagementReferenceForControl(this);};M.prototype._setModel=function(){this._setBindingContext();};M.prototype._registerPropertyChanges=function(e){var N=new P(e,this.oContext+"/variantsEditable");N.attachChange(function(Q){if(Q&&Q.oSource&&Q.oSource.oModel&&Q.oSource.sPath){var U,W=Q.oSource.oModel.getProperty(Q.oSource.sPath);U=this.getModel(M.INNER_MODEL_NAME);if(U){U.setProperty("/editable",W);}}}.bind(this));};M.prototype.handleOpenCloseVariantPopover=function(){if(!this.bPopoverOpen){this._openVariantList();}else if(this.oVariantPopOver&&this.oVariantPopOver.isOpen()){this.oVariantPopOver.close();}else if(this.getInErrorState()&&this.oErrorVariantPopOver&&this.oErrorVariantPopOver.isOpen()){this.oErrorVariantPopOver.close();}};M.prototype.getFocusDomRef=function(){if(this.oVariantPopoverTrigger){return this.oVariantPopoverTrigger.getFocusDomRef();}};M.prototype.onclick=function(e){if(this.oVariantPopoverTrigger&&!this.bPopoverOpen){this.oVariantPopoverTrigger.focus();}this.handleOpenCloseVariantPopover();};M.prototype.onkeyup=function(e){if(e.which===K.F4||e.which===K.SPACE||e.altKey===true&&e.which===K.ARROW_UP||e.altKey===true&&e.which===K.ARROW_DOWN){this._openVariantList();}};M.prototype.onAfterRendering=function(){this.oVariantText.$().off("mouseover").on("mouseover",function(){this.oVariantPopoverTrigger.addStyleClass("sapUiFlVarMngmtTriggerBtnHover");}.bind(this));this.oVariantText.$().off("mouseout").on("mouseout",function(){this.oVariantPopoverTrigger.removeStyleClass("sapUiFlVarMngmtTriggerBtnHover");}.bind(this));};M.prototype._openInErrorState=function(){var N;if(!this.oErrorVariantPopOver){N=new V({fitContainer:true,alignItems:sap.m.FlexAlignItems.Center,items:[new c({size:"4rem",color:"lightgray",src:"sap-icon://message-error"}),new o({titleStyle:sap.ui.core.TitleLevel.H2,text:this._oRb.getText("VARIANT_MANAGEMENT_ERROR_TEXT1")}),new T({textAlign:sap.ui.core.TextAlign.Center,text:this._oRb.getText("VARIANT_MANAGEMENT_ERROR_TEXT2")})]});N.addStyleClass("sapUiFlVarMngmtErrorPopover");this.oErrorVariantPopOver=new p(this.getId()+"-errorpopover",{title:{path:"/popoverTitle",model:M.INNER_MODEL_NAME},contentWidth:"400px",placement:x.Bottom,content:[new h(this.getId()+"-errorselpage",{showSubHeader:false,showNavButton:false,showHeader:false,content:[N]})],afterOpen:function(){this.bPopoverOpen=true;}.bind(this),afterClose:function(){if(this.bPopoverOpen){setTimeout(function(){this.bPopoverOpen=false;}.bind(this),200);}}.bind(this),contentHeight:"300px"});this.oErrorVariantPopOver.attachBrowserEvent("keyup",function(e){if(e.which===32){this.oErrorVariantPopOver.close();}}.bind(this));}if(this.bPopoverOpen){return;}this.oErrorVariantPopOver.openBy(this.oVariantLayout);};M.prototype._createVariantList=function(){if(this.oVariantPopOver){return;}this.oVariantManageBtn=new k(this.getId()+"-manage",{text:this._oRb.getText("VARIANT_MANAGEMENT_MANAGE"),enabled:true,press:function(){this._openManagementDialog();}.bind(this),layoutData:new s({priority:v.Low})});this.oVariantSaveBtn=new k(this.getId()+"-mainsave",{text:this._oRb.getText("VARIANT_MANAGEMENT_SAVE"),press:function(){this._handleVariantSave();}.bind(this),visible:{path:"modified",model:this._sModelName,formatter:function(N){return N;}},type:sap.m.ButtonType.Emphasized,layoutData:new s({priority:v.Low})});this.oVariantSaveAsBtn=new k(this.getId()+"-saveas",{text:this._oRb.getText("VARIANT_MANAGEMENT_SAVEAS"),press:function(){this._openSaveAsDialog();}.bind(this),layoutData:new s({priority:v.Low})});this._oVariantList=new q(this.getId()+"-list",{selectedKey:{path:"currentVariant",model:this._sModelName},itemPress:function(N){var Q=null;if(N&&N.getParameters()){var U=N.getParameters().item;if(U){Q=U.getKey();}}if(Q){this.setCurrentVariantKey(Q);this.fireEvent("select",{key:Q});this.oVariantPopOver.close();}}.bind(this)});this._oVariantList.setNoDataText(this._oRb.getText("VARIANT_MANAGEMENT_NODATA"));var e=new sap.ui.core.Item({key:'{'+this._sModelName+">key}",text:'{'+this._sModelName+">title}"});this._oVariantList.bindAggregation("items",{path:"variants",model:this._sModelName,template:e});this._oSearchField=new S(this.getId()+"-search");this._oSearchField.attachLiveChange(function(N){this._triggerSearch(N,this._oVariantList);}.bind(this));this.oVariantSelectionPage=new h(this.getId()+"-selpage",{subHeader:new i({content:[this._oSearchField]}),content:[this._oVariantList],footer:new r({content:[new j(this.getId()+"-spacer"),this.oVariantSaveBtn,this.oVariantSaveAsBtn,this.oVariantManageBtn]}),showNavButton:false,showHeader:false,showFooter:{path:"/editable",model:M.INNER_MODEL_NAME}});this.oVariantPopOver=new p(this.getId()+"-popover",{title:{path:"/popoverTitle",model:M.INNER_MODEL_NAME},contentWidth:"400px",placement:x.Bottom,content:[this.oVariantSelectionPage],afterOpen:function(){this.bPopoverOpen=true;}.bind(this),afterClose:function(){if(this.bPopoverOpen){setTimeout(function(){this.bPopoverOpen=false;}.bind(this),200);}}.bind(this),contentHeight:"300px"});this.oVariantPopOver.addStyleClass("sapUiFlVarMngmtPopover");if(this.oVariantLayout.$().closest(".sapUiSizeCompact").length>0){this.oVariantPopOver.addStyleClass("sapUiSizeCompact");}this.addDependent(this.oVariantPopOver);};M.prototype.showSaveButton=function(e){if(e===false){this.oVariantSaveAsBtn.setType(sap.m.ButtonType.Emphasized);this.oVariantSaveBtn.setVisible(false);}else{this.oVariantSaveAsBtn.setType(sap.m.ButtonType.Default);this.oVariantSaveBtn.setVisible(true);}};M.prototype._openVariantList=function(){var e;if(this.getInErrorState()){this._openInErrorState();return;}if(this.bPopoverOpen){return;}if(!this.oContext){return;}this._createVariantList();this._oSearchField.setValue("");this._oVariantList.getBinding("items").filter(this._getFilters());this.oVariantSelectionPage.setShowSubHeader(this._oVariantList.getItems().length>9?true:false);this.showSaveButton(false);if(this.getModified()){e=this._getItemByKey(this.getCurrentVariantKey());if(e&&e.change){this.showSaveButton(true);}}this.oVariantPopOver.openBy(this.oVariantLayout);};M.prototype._triggerSearch=function(e,N){if(!e){return;}var Q=e.getParameters();if(!Q){return;}var U=Q.newValue?Q.newValue:"";var W=new F({path:"title",operator:a.Contains,value1:U});N.getBinding("items").filter(this._getFilters(W));};M.prototype._createSaveAsDialog=function(){if(!this.oSaveAsDialog){this.oInputName=new n(this.getId()+"-name",{liveChange:function(Q){this._checkVariantNameConstraints(this.oInputName,this.oSaveSave);}.bind(this)});var e=new L(this.getId()+"-namelabel",{text:this._oRb.getText("VARIANT_MANAGEMENT_NAME"),required:true});e.setLabelFor(this.oInputName);this.oDefault=new l(this.getId()+"-default",{text:this._oRb.getText("VARIANT_MANAGEMENT_SETASDEFAULT"),visible:{path:"/showSetAsDefault",model:M.INNER_MODEL_NAME},width:"100%"});this.oExecuteOnSelect=new l(this.getId()+"-execute",{text:this._oRb.getText("VARIANT_MANAGEMENT_EXECUTEONSELECT"),visible:{path:"/showExecuteOnSelection",model:M.INNER_MODEL_NAME},width:"100%"});this.oInputManualKey=new n(this.getId()+"-key",{liveChange:function(Q){this._checkVariantNameConstraints(this.oInputManualKey);}.bind(this)});this.oLabelKey=new L(this.getId()+"-keylabel",{text:this._oRb.getText("VARIANT_MANAGEMENT_KEY"),required:true});this.oLabelKey.setLabelFor(this.oInputManualKey);this.oSaveSave=new k(this.getId()+"-variantsave",{text:this._oRb.getText("VARIANT_MANAGEMENT_SAVE"),press:function(){this._bSaveCanceled=false;this._handleVariantSaveAs(this.oInputName.getValue());}.bind(this),enabled:true});var N=new G({defaultSpan:"L12 M12 S12"});if(this.getShowSetAsDefault()){N.addContent(this.oDefault);}if(this.getShowExecuteOnSelection()){N.addContent(this.oExecuteOnSelect);}this.oSaveAsDialog=new m(this.getId()+"-savedialog",{title:this._oRb.getText("VARIANT_MANAGEMENT_SAVEDIALOG"),beginButton:this.oSaveSave,endButton:new k(this.getId()+"-variantcancel",{text:this._oRb.getText("VARIANT_MANAGEMENT_CANCEL"),press:function(){this._bSaveCanceled=true;this.oSaveAsDialog.close();}.bind(this)}),content:[e,this.oInputName,this.oLabelKey,this.oInputManualKey,N],stretch:D.system.phone});this.oSaveAsDialog.addStyleClass("sapUiPopupWithPadding");this.oSaveAsDialog.addStyleClass("sapUiFlVarMngmtSaveDialog");if(this.oVariantLayout.$().closest(".sapUiSizeCompact").length>0){this.oSaveAsDialog.addStyleClass("sapUiSizeCompact");}this.addDependent(this.oSaveAsDialog);}};M.prototype._openSaveAsDialog=function(){this._createSaveAsDialog();this.oInputName.setValue(this.getSelectedVariantText(this.getCurrentVariantKey()));this.oSaveSave.setEnabled(false);this.oInputName.setEnabled(true);this.oInputName.setValueState(A.None);this.oInputName.setValueStateText(null);this.oDefault.setSelected(false);this.oExecuteOnSelect.setSelected(false);if(this.oVariantPopOver){this.oVariantPopOver.close();}if(this.getManualVariantKey()){this.oInputManualKey.setVisible(true);this.oInputManualKey.setEnabled(true);this.oInputManualKey.setValueState(A.None);this.oInputManualKey.setValueStateText(null);this.oLabelKey.setVisible(true);}else{this.oInputManualKey.setVisible(false);this.oLabelKey.setVisible(false);}this.oSaveAsDialog.open();};M.prototype._handleVariantSaveAs=function(N){var e=null,Q=N.trim(),U=this.oInputManualKey.getValue().trim();if(Q==""){this.oInputName.setValueState(A.Error);this.oInputName.setValueStateText(this._oRb.getText("VARIANT_MANAGEMENT_ERROR_EMPTY"));return;}if(this.getManualVariantKey()){if(U==""){this.oInputManualKey.setValueState(A.Error);this.oInputManualKey.setValueStateText(this._oRb.getText("VARIANT_MANAGEMENT_ERROR_EMPTY"));return;}e=U;}if(this.oSaveAsDialog){this.oSaveAsDialog.close();}if(this.oDefault.getSelected()){this.setDefaultVariantKey(e);}this.setModified(false);this.fireSave({key:e,name:Q,overwrite:false,def:this.oDefault.getSelected(),execute:this.oExecuteOnSelect.getSelected()});};M.prototype._handleVariantSave=function(){var e=this._getItemByKey(this.getCurrentVariantKey());var N=false;if(this.getDefaultVariantKey()===e.key){N=true;}if(this.oVariantPopOver){this.oVariantPopOver.close();}this.fireSave({name:e.title,overwrite:true,key:e.key,def:N});this.setModified(false);};M.prototype.openManagementDialog=function(e){if(e&&this.oManagementDialog){this.oManagementDialog.destroy();this.oManagementDialog=undefined;}this._openManagementDialog();};M.prototype._triggerSearchInManageDialog=function(e,N){if(!e){return;}var Q=e.getParameters();if(!Q){return;}var U=Q.newValue?Q.newValue:"";var W=[this._getVisibleFilter(),new F({filters:[new F({path:"title",operator:a.Contains,value1:U}),new F({path:"author",operator:a.Contains,value1:U})],and:false})];N.getBinding("items").filter(W);this._bDeleteOccured=true;};M.prototype._createManagementDialog=function(){if(!this.oManagementDialog){this.oManagementTable=new g(this.getId()+"-managementTable",{growing:true,columns:[new f({width:"3rem",visible:{path:"showFavorites",model:this._sModelName}}),new f({header:new T({text:this._oRb.getText("VARIANT_MANAGEMENT_NAME")}),width:"14rem"}),new f({header:new T({text:this._oRb.getText("VARIANT_MANAGEMENT_DEFAULT")}),width:"4rem",demandPopin:true,popinDisplay:y.Inline,minScreenWidth:z.Tablet,visible:{path:"/showSetAsDefault",model:M.INNER_MODEL_NAME}}),new f({header:new T({text:this._oRb.getText("VARIANT_MANAGEMENT_EXECUTEONSELECT")}),width:"6rem",hAlign:E.Center,demandPopin:true,popinDisplay:y.Inline,minScreenWidth:"800px",visible:{path:"/showExecuteOnSelection",model:M.INNER_MODEL_NAME}}),new f({header:new T({text:this._oRb.getText("VARIANT_MANAGEMENT_AUTHOR")}),width:"8rem",demandPopin:true,popinDisplay:y.Inline,minScreenWidth:"900px"}),new f({width:"2rem",hAlign:E.Center}),new f({visible:false})]});this.oManagementSave=new k(this.getId()+"-managementsave",{text:this._oRb.getText("VARIANT_MANAGEMENT_OK"),enabled:true,type:sap.m.ButtonType.Emphasized,press:function(){this._handleManageSavePressed();}.bind(this)});this.oManagementCancel=new k(this.getId()+"-managementcancel",{text:this._oRb.getText("VARIANT_MANAGEMENT_CANCEL"),press:function(){this.oManagementDialog.close();this._handleManageCancelPressed();}.bind(this)});this.oManagementDialog=new m(this.getId()+"-managementdialog",{resizable:true,draggable:true,customHeader:new B(this.getId()+"-managementHeader",{contentMiddle:[new T(this.getId()+"-managementHeaderText",{text:this._oRb.getText("VARIANT_MANAGEMENT_MANAGEDIALOG")})]}),beginButton:this.oManagementSave,endButton:this.oManagementCancel,content:[this.oManagementTable],stretch:D.system.phone});this.oManagementDialog.isPopupAdaptationAllowed=function(){return false;};this._oSearchFieldOnMgmtDialog=new S();this._oSearchFieldOnMgmtDialog.attachLiveChange(function(N){this._triggerSearchInManageDialog(N,this.oManagementTable);}.bind(this));var e=new B(this.getId()+"-mgmHeaderSearch",{contentRight:[this._oSearchFieldOnMgmtDialog]});this.oManagementDialog.setSubHeader(e);if(this.oVariantLayout.$().closest(".sapUiSizeCompact").length>0){this.oManagementDialog.addStyleClass("sapUiSizeCompact");}this.addDependent(this.oManagementDialog);this.oManagementTable.bindAggregation("items",{path:"variants",model:this._sModelName,factory:this._templateFactoryManagementDialog.bind(this),filters:this._getVisibleFilter()});this._bDeleteOccured=false;}};M.prototype._setFavoriteIcon=function(e,N){if(e){e.setSrc(N?"sap-icon://favorite":"sap-icon://unfavorite");e.setTooltip(this._oRb.getText(N?"VARIANT_MANAGEMENT_FAV_DEL_TOOLTIP":"VARIANT_MANAGEMENT_FAV_ADD_TOOLTIP"));}};M.prototype._templateFactoryManagementDialog=function(e,N){var Q=null,U,W,X,Y=N.getObject();if(!Y){return undefined;}var Z=function(f1){this._checkVariantNameConstraints(f1.oSource,this.oManagementSave,f1.oSource.getBindingContext(this._sModelName).getObject().key);}.bind(this);var $=function(f1){this._handleManageTitleChanged(f1.oSource.getBindingContext(this._sModelName).getObject());}.bind(this);var _=function(f1){if(f1.getParameters().selected===true){this._handleManageDefaultVariantChange(f1.oSource,f1.oSource.getBindingContext(this._sModelName).getObject());}}.bind(this);var a1=function(f1){this._handleManageExecuteOnSelectionChanged(f1.oSource.getBindingContext(this._sModelName).getObject());}.bind(this);var b1=function(f1){this._handleManageDeletePressed(f1.oSource.getBindingContext(this._sModelName).getObject());}.bind(this);var c1=function(f1){this._handleManageFavoriteChanged(f1.oSource,f1.oSource.getBindingContext(this._sModelName).getObject());}.bind(this);if(Y.rename){X=new n({liveChange:Z,change:$,value:'{'+this._sModelName+">title}"});}else{X=new O({title:'{'+this._sModelName+">title}"});if(Q){X.setTooltip(Q);}}U=new k({icon:"sap-icon://sys-cancel",enabled:true,type:w.Transparent,press:b1,tooltip:this._oRb.getText("VARIANT_MANAGEMENT_DELETE"),visible:Y.remove});this._assignColumnInfoForDeleteButton(U);W=this.oContext.getPath();var d1=new c({src:{path:"favorite",model:this._sModelName,formatter:function(f1){return f1?"sap-icon://favorite":"sap-icon://unfavorite";}},tooltip:{path:'favorite',model:this._sModelName,formatter:function(f1){return this._oRb.getText(f1?"VARIANT_MANAGEMENT_FAV_DEL_TOOLTIP":"VARIANT_MANAGEMENT_FAV_ADD_TOOLTIP");}.bind(this)},press:c1});d1.addStyleClass("sapUiFlVarMngmtFavColor");var e1=new d({cells:[d1,X,new R({groupName:this.getId(),select:_,selected:{path:W+"/defaultVariant",model:this._sModelName,formatter:function(f1){return(Y.key===f1)?true:false;}}}),new l({select:a1,selected:'{'+this._sModelName+">executeOnSelect}"}),new T({text:'{'+this._sModelName+">author}",textAlign:"Begin"}),U,new T({text:'{'+this._sModelName+">key}"})]});return e1;};M.prototype._openManagementDialog=function(){this._createManagementDialog();if(this.oVariantPopOver){this.oVariantPopOver.close();}this._clearDeletedItems();this.oManagementSave.setEnabled(false);this._oSearchFieldOnMgmtDialog.setValue("");if(this._bDeleteOccured){this._bDeleteOccured=false;this.oManagementTable.bindAggregation("items",{path:"variants",model:this._sModelName,factory:this._templateFactoryManagementDialog.bind(this),filters:this._getVisibleFilter()});}this.oManagementDialog.open();};M.prototype._assignColumnInfoForDeleteButton=function(e){if(!this._oInvisibleDeleteColumnName){this._oInvisibleDeleteColumnName=new I({text:this._oRb.getText("VARIANT_MANAGEMENT_ACTION_COLUMN")});this.oManagementDialog.addContent(this._oInvisibleDeleteColumnName);}if(this._oInvisibleDeleteColumnName){e.addAriaLabelledBy(this._oInvisibleDeleteColumnName);}};M.prototype._handleManageDefaultVariantChange=function(e,N){var Q=N.key;if(!this._anyInErrorState(this.oManagementTable)){this.oManagementSave.setEnabled(true);}if(this.getShowFavorites()&&!N.favorite&&e){N.favorite=!N.favorite;this._setFavoriteIcon(e.getParent().getCells()[M.COLUMN_FAV_IDX],N.favorite);}this.setDefaultVariantKey(Q);};M.prototype._handleManageCancelPressed=function(){var e,N;this._getDeletedItems().forEach(function(Q){Q.visible=true;});this._getItems().forEach(function(Q){Q.title=Q.originalTitle;Q.favorite=Q.originalFavorite;Q.executeOnSelection=Q.originalExecuteOnSelection;});e=this.getOriginalDefaultVariantKey();if(e!==this.getDefaultVariantKey()){this.setDefaultVariantKey(e);}N=this.getModel(this._sModelName);if(N){N.checkUpdate();}};M.prototype._handleManageFavoriteChanged=function(e,N){if(!this._anyInErrorState(this.oManagementTable)){this.oManagementSave.setEnabled(true);}if((this.getDefaultVariantKey()===N.key)&&N.favorite){return;}N.favorite=!N.favorite;this._setFavoriteIcon(e,N.favorite);};M.prototype._handleManageDeletePressed=function(e){var N,Q=e.key;if(this.oManagementTable.getItems().length===1){return;}if(!this._anyInErrorState(this.oManagementTable)){this.oManagementSave.setEnabled(true);}e.visible=false;this._addDeletedItem(e);if((Q===this.getDefaultVariantKey())){this.setDefaultVariantKey(this.getStandardVariantKey());}N=this.getModel(this._sModelName);if(N){N.checkUpdate();}this.oManagementCancel.focus();};M.prototype._handleManageExecuteOnSelectionChanged=function(e){if(!this._anyInErrorState(this.oManagementTable)){this.oManagementSave.setEnabled(true);}};M.prototype._handleManageTitleChanged=function(e){if(!this._anyInErrorState(this.oManagementTable)){this.oManagementSave.setEnabled(true);}};M.prototype._handleManageSavePressed=function(){this._getDeletedItems().some(function(e){if(e.key===this.getCurrentVariantKey()){var N=this.getStandardVariantKey();this.setModified(false);this.setCurrentVariantKey(N);this.fireEvent("select",{key:N});return true;}return false;}.bind(this));this.fireManage();this.oManagementDialog.close();};M.prototype._anyInErrorState=function(e){var N,Q,U=false;if(e){N=e.getItems();N.some(function(W){Q=W.getCells()[M.COLUMN_NAME_IDX];if(Q&&Q.getValueState&&(Q.getValueState()===A.Error)){U=true;}return U;});}return U;};M.prototype._getFilters=function(e){var N=[];if(e){N.push(e);}N.push(this._getVisibleFilter());if(this.getShowFavorites()){N.push(this._getFilterFavorites());}return N;};M.prototype._getVisibleFilter=function(){return new F({path:"visible",operator:a.EQ,value1:true});};M.prototype._getFilterFavorites=function(){return new F({path:"favorite",operator:a.EQ,value1:true});};M.prototype._checkVariantNameConstraints=function(e,N,Q){if(!e){return;}var U=e.getValue();U=U.trim();if(!this._checkIsDuplicate(U,Q)){if(U===""){e.setValueState(A.Error);e.setValueStateText(this._oRb.getText("VARIANT_MANAGEMENT_ERROR_EMPTY"));}else if(U.indexOf('{')>-1){e.setValueState(A.Error);e.setValueStateText(this._oRb.getText("VARIANT_MANAGEMENT_NOT_ALLOWED_CHAR",["{"]));}else if(U.length>M.MAX_NAME_LEN){e.setValueState(A.Error);e.setValueStateText(this._oRb.getText("VARIANT_MANAGEMENT_MAX_LEN",[M.MAX_NAME_LEN]));}else{e.setValueState(A.None);e.setValueStateText(null);}}else{e.setValueState(A.Error);e.setValueStateText(this._oRb.getText("VARIANT_MANAGEMENT_ERROR_DUPLICATE"));}if(N){if(e.getValueState()===A.Error){N.setEnabled(false);}else{N.setEnabled(true);}}};M.prototype._checkIsDuplicate=function(e,N){var Q=false,U=this._getItems(),W=e.toLowerCase();U.some(function(X){if(X.title.toLowerCase()===W){if(N&&(N===X.key)){return false;}Q=true;}return Q;});return Q;};M.prototype.exit=function(){var e;if(this.oDefault&&!this.oDefault._bIsBeingDestroyed){this.oDefault.destroy();}this.oDefault=undefined;if(this.oExecuteOnSelect&&!this.oExecuteOnSelect._bIsBeingDestroyed){this.oExecuteOnSelect.destroy();}this.oExecuteOnSelect=undefined;this._oRb=undefined;this.oContext=undefined;this._oVariantList=undefined;this.oVariantSelectionPage=undefined;this.oVariantLayout=undefined;this.oVariantText=undefined;this.oVariantPopoverTrigger=undefined;this.oVariantInvisibleText=undefined;this._oSearchField=undefined;this._oSearchFieldOnMgmtDialog=undefined;e=this.getModel(M.INNER_MODEL_NAME);if(e){e.destroy();}};return M;},true);
