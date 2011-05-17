/**
 *  Copyright 2009 The Regents of the University of California
 *  Licensed under the Educational Community License, Version 2.0
 *  (the "License"); you may not use this file except in compliance
 *  with the License. You may obtain a copy of the License at
 *
 *  http://www.osedu.org/licenses/ECL-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an "AS IS"
 *  BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 *  or implied. See the License for the specific language governing
 *  permissions and limitations under the License.
 *
 */

/*    NAMSPACES    */
var ocSeries        = ocSeries || {};
ocSeries.components = {};
ocSeries.additionalComponents = {};
ocSeries.rolePrivileges = [];

/*    PAGE CONFIGURATION    */
var SERIES_SERVICE_URL = "/series";
var SERIES_LIST_URL = "/admin/series_list.html";
var CREATE_MODE = 1;
var EDIT_MODE   = 2;

ocSeries.mode = CREATE_MODE;

/*    UI FUNCTIONS    */
ocSeries.init = function(){
  //Load i18n strings and replace default english
  // disabled temporarily - see MH-6510
  ocSeries.Internationalize();
  
  //Add folding action for hidden sections.
  $('.oc-ui-collapsible-widget .form-box-head').click(
    function() {
      $(this).children('.ui-icon').toggleClass('ui-icon-triangle-1-e');
      $(this).children('.ui-icon').toggleClass('ui-icon-triangle-1-s');
      $(this).next().toggle();
      return false;
    });
    
  $('#additionalContentTabs').tabs();
  
  ocSeries.RegisterComponents();
  ocSeries.FormManager = new ocAdmin.Manager('series', '', ocSeries.components, ocSeries.additionalComponents);
  $('#submitButton').click(ocSeries.SubmitForm);
  $('#cancelButton').click(function() {
    document.location = SERIES_LIST_URL;
  });
  
  if(ocUtils.getURLParam('edit') === 'true'){
    ocSeries.mode = EDIT_MODE;
    $('#submitButton').val('Update Series');
    $('#i18n_page_title').text(i18n.page.title.edit);
    document.title = i18n.page.title.edit + " " + i18n.window.title.suffix;
    var seriesId = ocUtils.getURLParam('seriesId');
    if(seriesId !== '') {
      $('#seriesId').val(seriesId);
      $.getJSON(SERIES_SERVICE_URL + "/" + seriesId + ".json", ocSeries.loadSeries);
    }
  }

  if (ocSeries.mode == CREATE_MODE) {

    var privilegeRow = '<tr>';
    privilegeRow += '<td><input type="text" class="role_search oc-ui-form-field"/></td>'
    privilegeRow += '<td class="privilege_edit"><input type="checkbox" class="privilege_edit" /></td>'
    privilegeRow += '<td class="privilege_edit"><input type="checkbox" class="privilege_edit" /></td>'
    privilegeRow += '<td class="privilege_edit"><img src="/img/icons/delete.png" alt="delete" title="Delete Role"></td>'
    privilegeRow += '</tr>'

    $('#rolePrivilegeTable > tbody').append(privilegeRow);

    var append = function (event, ui) {
      $('#rolePrivilegeTable > tbody').append(privilegeRow);
      $('.role_search').autocomplete({
        source: ocSecurity.loadRoles(),
        select: append
      });
    }

    $('.role_search').autocomplete({
      source: ocSecurity.loadRoles(),
      select: append
    });
  //    ocSecurity.loadRoles(function(roles) {
  //      $(roles).each(function(index, role) {
  //        ocSeries.rolePrivileges.push(new ocSecurity.Role(role));
  //      });
  //    });
  //    var rolesTable = TrimPath.processDOMTemplate('rolesTableTemplate', {roles: ocSeries.rolePrivileges});
  //$('#rolesTableContainer').append(rolesTable);

  //
  // to update the privileges from values in the UI do
  //
  // ocSecurity.updatePrivileges(ocSeries.rolePrivileges);

  } else if (ocSeries.mode == EDIT_MODE) {
// TODO get privileges from series and populate UI accordingly
}
}

ocSeries.Internationalize = function(){
  //Do internationalization of text
  jQuery.i18n.properties({
    name:'series',
    path:'i18n/'
  });
  ocUtils.internationalize(i18n, 'i18n');
  //Handle special cases like the window title.
  document.title = i18n.page.title.add + " " + i18n.window.title.suffix;
}

ocSeries.loadSeries = function(data) {
  $("#id").val(data.series.id);
  ocSeries.components['description'].setValue(data.series.description);
  if($.isArray(data.series.additionalMetadata.metadata)) {
    mdlist = data.series.additionalMetadata.metadata;
  } else {
    mdlist = [data.series.additionalMetadata.metadata];
  }
  for(m in mdlist){
    var metadata = mdlist[m];
    if(ocSeries.additionalComponents[metadata.key]){
      ocSeries.additionalComponents[metadata.key].setValue(metadata.value);
    }
  }
}

ocSeries.RegisterComponents = function(){
  //Core Metadata
  ocSeries.additionalComponents.title = new ocAdmin.Component(
    ['title'],
    {
      label:'seriesLabel',
      required:true
    }
    );
  
  ocSeries.additionalComponents.contributor = new ocAdmin.Component(
    ['contributor'],
    {
      label:'contributorLabel'
    }
    );
  
  ocSeries.additionalComponents.creator = new ocAdmin.Component(
    ['creator'],
    {
      label: 'creatorLabel'
    }
    );
  
  //Additional Metadata
  ocSeries.additionalComponents.subject = new ocAdmin.Component(
    ['subject'],
    {
      label: 'subjectLabel'
    }
    )
  
  ocSeries.additionalComponents.language = new ocAdmin.Component(
    ['language'],
    {
      label: 'languageLabel'
    }
    )
  
  ocSeries.additionalComponents.license = new ocAdmin.Component(
    ['license'],
    {
      label: 'licenseLabel'
    }
    )
  
  ocSeries.components.description = new ocAdmin.Component(
    ['description'],
    {
      label: 'descriptionLabel'
    }
    )
  
/*
  //Extended Metadata
  ocAdmin.additionalComponents.type
  //ocAdmin.additionalComponents.subtype
  ocAdmin.additionalComponents.publisher
  ocAdmin.additionalComponents.audience
  //ocAdmin.additionalComponents.duration
  //ocAdmin.additionalComponents.startdate
  //ocAdmin.additionalComponents.enddate
  ocAdmin.additionalComponents.spatial
  ocAdmin.additionalComponents.temporal
  ocAdmin.additionalComponents.rights
  */
}

ocSeries.createDublinCoreDocument = function() {
  dcDoc = ocUtils.createDoc('dublincore', 'http://www.opencastproject.org/xsd/1.0/dublincore/');
  $(dcDoc.documentElement).attr('xmlns:dcterms', 'http://purl.org/dc/terms/');
  $(dcDoc.documentElement).attr('xmlns:dc', 'http://purl.org/dc/elements/1.1/');
  $(dcDoc.documentElement).attr('xmlns:oc', 'http://www.opencastproject.org/matterhorn');
  $('.dc-metadata-field').each(function() {
    $field = $(this);
    var $newElm = $(dcDoc.createElement('dcterms:' + $field.attr('id')));
    $newElm.text($field.val() + ($field.attr('id') == 'identifier' ? new Date().getTime() : ''));
    $(dcDoc.documentElement).append($newElm);
  });
  var out = ocUtils.xmlToString(dcDoc);
  return out;
}

ocSeries.createACLDocument = function() {
  var aclDoc = ocUtils.createDoc('xml', '');
  $(aclDoc.rootElement).attr('version', '1.0');
  $(aclDoc.rootElement).attr('encoding', 'UTF.8');
  $(aclDoc.rootElement).attr('standalone', 'yes');
  $(aclDoc.documentElement).attr('xmlns:ns2', 'org.opencastproject.security');
  var $elem = $(aclDoc.createElement('ns2:acl'));
  $('.role_search').each(function() {
    var $field = $(this);
    var $ace = $(aclDoc.createElement('ace'));
    var $role = $(aclDoc.createElement('role'));
    $role.text = $field.attr('value');
    var $action = $(aclDoc.createElement('action'));
    $action.text = "view";
    var $allow = $(aclDoc.createElement('allow'));
    $allow.text = "false";
    $ace.append($role);
    $ace.append($action);
    $ace.append($allow);
    $(aclDoc.documentElement).append($ace)
  });
  $(aclDoc.documentElement).append($elem);
  var out = ocUtils.xmlToString(aclDoc)
  ocUtils.log(out)
  return out;
}

ocSeries.SubmitForm = function(){
  var seriesXml = ocSeries.FormManager.serialize();
  var dcDoc = ocSeries.createDublinCoreDocument();
  var acl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><ns2:acl xmlns:ns2="org.opencastproject.security"><ace><role>admin</role><action>delete</action><allow>true</allow></ace></ns2:acl>';
  var acl2 = ocSeries.createACLDocument();
  if(seriesXml && ocSeries.additionalComponents.title.validate()){
    if(ocSeries.mode === CREATE_MODE) {
      $.ajax({
        type: 'POST',
        url: SERIES_SERVICE_URL + '/',
        data: {
          series: dcDoc,
          acl: acl
        },
        complete: ocSeries.SeriesSubmitComplete
      });
    } else {
      $.ajax({
        type: 'POST',
        url: SERIES_SERVICE_URL + '/' + $('#id').val(),
        data: {
          series: seriesXml
        },
        complete: ocSeries.SeriesSubmitComplete
      });
    }
  }
}

ocSeries.SeriesSubmitComplete = function(xhr, status){
  if(status == "success"){
    document.location = SERIES_LIST_URL;
  }
/*for(var k in ocSeries.components){
    if(i18n[k]){
      $("#data-" + k).show();
      $("#data-" + k + " > .data-label").text(i18n[k].label + ":");
      $("#data-" + k + " > .data-value").text(ocSeries.components[k].asString());
    }
  }
  $("#schedulerLink").attr('href',$("#schedulerLink").attr('href') + '?seriesId=' + ocSeries.components.seriesId.getValue());
  $("#submissionSuccess").siblings().hide();
  $("#submissionSuccess").show();*/
}
