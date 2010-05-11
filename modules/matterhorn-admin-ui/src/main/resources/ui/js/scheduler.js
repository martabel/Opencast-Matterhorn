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

// Configurable Page Variables
var SCHEDULER_URL     = '/scheduler/rest';
var WORKFLOW_URL      = '/workflow/rest';
var CAPTURE_ADMIN_URL = '/capture-admin/rest';

var SchedulerForm     = SchedulerForm || {};
var SchedulerUI       = SchedulerUI || {};
var Agent             = Agent || {};

Agent.tzDiff          = 0;

function init() {
  //Do internationalization of text
  jQuery.i18n.properties({name:'scheduler',path:'i18n/'});
  AdminUI.internationalize(i18n, 'i18n');
  //Handle special cases like the window title.
  document.title = i18n.window.prefix + " " + i18n.window.schedule;
  
  var d = new Date();
  d.setHours(d.getHours() + 1); //increment an hour.
  $('#startTimeHour').val(d.getHours());
  $('#startDate').datepicker({showOn: 'both', buttonImage: 'shared_img/icons/calendar.gif', buttonImageOnly: true});
  $('#startDate').datepicker('setDate', d);
  $('#endDate').datepicker({showOn: 'both', buttonImage: 'shared_img/icons/calendar.gif', buttonImageOnly: true});
  
  $('.required > label').prepend('<span style="color: red;">*</span>');
  
  $('.folder-head').click(
    function() {
      $(this).children('.fl-icon').toggleClass('icon-arrow-right');
      $(this).children('.fl-icon').toggleClass('icon-arrow-down');
      $(this).next().toggle('fast');
      return false;
    });
  
  //set single/multiple recording event handler
  if(!SchedulerForm.formFields){
    SchedulerUI.selectRecordingType('single'); //Initialize as a single recording.
  }
  $('#singleRecording').click(function(){ SchedulerUI.selectRecordingType('single'); });
  $('#multipleRecordings').click(function(){ SchedulerUI.selectRecordingType('multiple'); });
  
  $('.icon-help').click(
    function(event) {
      popupHelp.displayHelp($(this), event);
      return false;
    });
  
  $('body').click(
    function() {
      if ($('#helpbox').css('display') != 'none') {
        popupHelp.resetHelp();
      }
      return true;
    });
  
  $('#submitButton').click(SchedulerUI.submitForm);
  $('#cancelButton').click(SchedulerUI.cancelForm);
  
  $('#attendees').change(SchedulerUI.handleAgentChange);
  
  $('#schedule_repeat').change(function(){ SchedulerUI.showDaySelect(this.options[this.selectedIndex].value); });
  
  SchedulerUI.loadKnownAgents();
  
  var eventID = SchedulerUI.getURLParams('eventID');
  if(eventID && SchedulerUI.getURLParams('edit')){
    $('#page-title').text('Edit Recording');
    document.title = i18n.window.prefix + " " + i18n.window.edit;
    $('#i18n_page_title').text(i18n.page.title.edit);
    $('#deleteButton').click(SchedulerUI.deleteForm);
    $('#delete-recording').show();
    $('#attendees').change(
      function() {
        $('#notice-container').hide();
        $.get(CAPTURE_ADMIN_URL + '/agents/' + $('#attendees option:selected').val(), SchedulerUI.checkAgentStatus);
      });
  }
}

/* ======================== SchedulerUI ======================== */

/**
 *  clearForm resets all the form values to defaults.
 */
SchedulerUI.cancelForm = function() {
  document.location = 'recordings.html';
};

/**
 *  submitForm sends the scheduler form to the appropriate rest point based on
 *  URL param "edit". updating an event requires an EventID. calls
 *  eventSubmitComplete when finished.
 */
SchedulerUI.submitForm = function() {
  var eventXML = null;
  eventXML = SchedulerForm.serialize();
  if(eventXML){
    var method  = SchedulerUI.getURLParams('edit') ? '/updateEvent' : '/addEvent';
    $.post( SCHEDULER_URL + method, {event: eventXML}, SchedulerUI.eventSubmitComplete );
  }
  return true;
};

/**
 * if the submission is successful, this function displays the complete screen.
 */
SchedulerUI.eventSubmitComplete = function(data) {
  $('#stage').load('schedulerform_complete.html', SchedulerUI.loadCompleteValues);
};

/**
 *  loadCompleteValues fills in the completed fields with form data.
 *
 */
SchedulerUI.loadCompleteValues = function() {
  for(var field in SchedulerForm.formFields) {
    if(SchedulerForm.formFields[field].dispValue() != '') {
      if(field == 'abstract') {
        var val = SchedulerForm.formFields[field].dispValue();
        if(val.length > 200) {
          $('#detail-switch').css('display', 'inline-block');
        }
        $('#' + field).empty().append(val);
        $('#data-' + field).toggle();
      } else {
        $('#data-' + field + ' > .data-value').empty().append(SchedulerForm.formFields[field].dispValue());
        $('#data-' + field).toggle();
      }
    }
  }
  $('#links').css('display', 'block');
};

SchedulerUI.showNotificationBox = function() {
  $('#');
};

/**
 *  loadKnownAgents calls the capture-admin service to get a list of known agents.
 *  Calls handleAgentList to populate the dropdown.
 */
SchedulerUI.loadKnownAgents = function() {
  $.get(CAPTURE_ADMIN_URL + '/agents', SchedulerUI.handleAgentList, 'xml');
};

/**
 *  Popluates dropdown with known agents
 *
 *  @param {XML Document}
 */
SchedulerUI.handleAgentList = function(data) {
  $.each($('name', data),
    function(i, agent) {
      $('#attendees').append($('<option></option>').val($(agent).text()).html($(agent).text())); 
    });
  var eventID = SchedulerUI.getURLParams('eventID');
  if(eventID && SchedulerUI.getURLParams('edit')) {
    $.get(SCHEDULER_URL + '/getEvent/' + eventID, SchedulerUI.loadEvent, 'xml');
  }
};

/**
 *  Function parses the URL for parameters.
 *  @param {String} Optional. If a name is passed, that parameter's value is returned.
 *  @return {String|Boolean|Array} If optional parameter is left empty, an array of all params are returned.
 */
SchedulerUI.getURLParams = function(param) {
  var urlParams = {};
  if(document.location.search) {
    params = document.location.search.substr(1).split('&');
    for(var p in params) {
      eq = params[p].indexOf('=');
      if(eq != -1) {
        urlParams[params[p].substr(0, eq)] = params[p].substr(eq+1);
      } else {
        urlParams[params[p]] = true;
      }
    }
  }
  
  if(param && urlParams[param]) {
    return urlParams[param];
  } else if(urlParams.length > 0) {
    return urlParams;
  }
  return null;
};

/**
 *  loadEvent files out the event form fields from an exist event.
 *  @param {XML Document} Returned form /scheduler/rest/getEvent.
 */
SchedulerUI.loadEvent = function(doc) {
  SchedulerForm.populate(doc);
  $('#attendees').change();
};

SchedulerUI.toggleDetails = function(elSwitch, el) {
  if(el.hasClass('detail-hide')) {
    el.removeClass('detail-hide');
    el.addClass('detail-show');
    elSwitch.style.verticalAlign = 'bottom';
    $(elSwitch).text('[less]');
  } else {
    el.removeClass('detail-show');
    el.addClass('detail-hide');
    elSwitch.style.verticalAlign = 'top';
    $(elSwitch).text('[more]');
  }
};

SchedulerUI.checkAgentStatus = function(doc) {
  var state = $('state', doc).text();
  if(state == '' || state == 'unknown' || state == 'offline') {
    $('#notice-container').show();
  }
};

SchedulerUI.deleteForm = function(){
  if(confirm(i18n.del.confirm)){
    $.get(SCHEDULER_URL + '/removeEvent/' + $('#eventID').val(), SchedulerUI.handleDelete);
  }
}

SchedulerUI.handleDelete = function(){
  //make delete message
  var title = SchedulerForm.formFields.title.dispValue() || 'No Title';
  var series = SchedulerForm.formFields['series-id'].dispValue() || 'No Series';
  var creator = SchedulerForm.formFields.creator.dispValue() || 'No Creator';
  $('#i18n_del_msg').text(i18n.del.msg(title, series, '(' + creator + ')'));
  $('#stage').hide();
  $('#deleteBox').show();
}

SchedulerUI.handleAgentChange = function(elm){
  var agent = elm.target.value;
  $('#input-list').empty();
  $.get('/capture-admin/rest/agents/' + agent + '/capabilities',
        function(d){
          var capabilities = [];
          $.each($('entry', d), function(a, i){
            var s = $(i).attr('key');
            if(s.indexOf('.src') != -1){
              var name = s.split('.');
              capabilities.push(name[2]);
            } else if(s == 'capture.device.timezone.offset') {
              var agent_tz = parseInt($(i).text());
              if(agent_tz !== 'NaN'){
                SchedulerUI.handleAgentTZ(agent_tz);
              }
            }
          });
          if(capabilities.length){
            SchedulerUI.displayCapabilities(capabilities);
          }else{
            Agent.tzDiff = 0; //No agent timezone could be found, assume local time.
            $('#input-list').append('Agent defaults will be used.');
            //SchedulerForm.formFields.resources = new FormField('agentDefaults', false, {getValue: getInputs, setValue: setInputs, checkValue: checkInputs});
          }
        });
}

SchedulerUI.displayCapabilities = function(capa){
  $.each(capa, function(i, v){
    $('#input-list').append('<input type="checkbox" id="' + v + '" value="' + v + '" checked="checked"><label for="' + v +'">' + v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() + '</label>');
  });
  SchedulerForm.formFields.resources = new FormField(capa, false, {getValue: getInputs, setValue: setInputs, checkValue: checkInputs});
}

SchedulerUI.handleAgentTZ = function(tz){
  var localTZ = -(new Date()).getTimezoneOffset(); //offsets in minutes
  Agent.tzDiff = 0;
  AdminUI.log(tz, localTZ, tz != localTZ);
  if(tz && tz != localTZ){
    //Display note of agent TZ difference, all times local to capture agent.
    //update time picker to agent time
    Agent.tzDiff = tz - localTZ;
  }
}

SchedulerUI.toICalDate = function(d){
  if(d.constructor != Date){
    d = new Date(0);
  }
  var month = SchedulerUI.padstring(d.getUTCMonth() + 1, '0', 2);
  var hours = SchedulerUI.padstring(d.getUTCHours(), '0', 2);
  var minutes = SchedulerUI.padstring(d.getUTCMinutes(), '0', 2);
  var seconds = SchedulerUI.padstring(d.getUTCSeconds(), '0', 2);
  return '' + d.getUTCFullYear() + month + d.getUTCDate() + 'T' + hours + minutes + seconds + 'Z';
}

SchedulerUI.padstring = function(str, pad, padlen){
  if(typeof str != 'string'){ 
    str = str.toString();
  }
  while(str.length < padlen && pad.length > 0){
    str = pad + str;
  }
  return str;
}
      

SchedulerUI.showDaySelect = function(selection){
  if(selection == 'weekly'){
    $('#day-select').removeClass('hidden');
    $('#repeat-enddate').removeClass('hidden');
    SchedulerForm.formFields.recurrence = new FormField(['schedule_repeat', 'repeat_sun', 'repeat_mon', 'repeat_tue', 'repeat_wed', 'repeat_thu', 'repeat_fri', 'repeat_sat', 'endDate'], false, {getValue: getRecurValue, setValue: setRecurValue, checkValue: checkRecurValue, dispValue: getRecurDisp});
  }else{
    $('#day-select').addClass('hidden');
    $('#repeat-enddate').addClass('hidden');
    delete SchedulerForm.formFields.recurrence;
  }
}

SchedulerUI.selectRecordingType = function(recType){
  /**
   *  eventFields is an array of EventFields and EventFieldGroups, keyed on <item>'s key attribute described in scheduler
   *  service contract for the addEvent rest endpoint.
   *  @see https://wiki.opencastproject.org/confluence/display/open/Scheduler+Service
   */
  var fields = {
    'id':           new FormField('eventID'),
    'title':        new FormField('title', true),
    'creator':      new FormField('creator'),
    'contributor':  new FormField('contributor'),
    'series-id':    new FormField('series'),
    'subject':      new FormField('subject'),
    'language':     new FormField('language'),
    'abstract':     new FormField('description'),
    'channel-id':   new FormField('distMatterhornMM', true, {label:'label-distribution',errorField:'missing-distribution'}),
    'license':      new FormField('license'),
    'startdate':    new FormField(['startDate', 'startTimeHour', 'startTimeMin'], true, { getValue:getStartDate, setValue:setStartDate, checkValue:checkStartDate, dispValue:getStartDateDisplay, label:label-startdate, errorField:missing-startdate }),
    'duration':     new FormField(['durationHour', 'durationMin'], true, { getValue:getDuration, setValue:setDuration, checkValue:checkDuration, dispValue:getDurationDisplay, label:'label-duration', errorField:'missing-duration' }), //returns a date incremented by duration.
    'attendees':    new FormField('attendees', true, { getValue:getAgent, setValue:setAgent, checkValue:checkAgent }),
    'device':       new FormField('attendees')
  };
  
  if(recType == 'multiple'){ // Multiple recordings have some differnt fields and different behaviors
    //series is required
    //repeats
    //rrule days
    //rrule start and end date
  }
  //Form Manager, handles saving, loading, de/serialization, and validation
  SchedulerForm.setFormFields(fields);
}

/* ======================== SchedulerForm ======================== */

SchedulerForm.formFields    = false;
SchedulerForm.rootEl        = 'scheduler-event';
SchedulerForm.rootNS        = 'http://scheduler.opencastproject.org';

/**
 *  Specify the set of form fields that make up our scheduler form.
 *  @param {Object} key/value set of FormField objects
 */
SchedulerForm.setFormFields = function(fields) {
  if(fields && typeof fields == 'object') {
    this.formFields = fields;
  } else {
    return false;
  }
};

/** 
 *  Serialize the form into an XML file for consumption by the
 *  scheduler service: addEvent
 *  @return {document object}
 *
 *  xml structure:
 *  <Event>
 *    <eventId></eventId>
 *    <metadata-list>
 *      <
 */
SchedulerForm.serialize = function() {
  if(this.validate()) {
    var doc = this.createDoc();
    var mdlist = doc.createElement('metadata-list');
    for(var e in this.formFields) {
      if(e == 'id' && this.formFields[e].getValue() != "") {
        el = doc.createElement('eventId');
        el.appendChild(doc.createTextNode(this.formFields[e].getValue()));
        doc.documentElement.appendChild(el);
      } else {
        metadata = doc.createElement('metadata');
        key = doc.createElement('key');
        value = doc.createElement('value');
        key.appendChild(doc.createTextNode(e));
        value.appendChild(doc.createTextNode(this.formFields[e].getValue()));
        metadata.appendChild(key);
        metadata.appendChild(value);
        mdlist.appendChild(metadata);
      }
    }
    doc.documentElement.appendChild(mdlist);
    if(typeof XMLSerializer != 'undefined') {
      return (new XMLSerializer()).serializeToString(doc);
    } else if(doc.xml) {
      return doc.xml;
    } else { 
      return false;
    }
  }
};

/**
 *  Validate the form values.
 *  @return {boolean} True if form is valid.
 */
SchedulerForm.validate = function() {
  var error = false;
  $('#missingFields-container').hide();
  for(var el in this.formFields) {
    var e = this.formFields[el];
    if(e.required){
      if(!e.checkValue()){
        error = true;
        $('#' + e.errorField).show();
        $('#' + e.label).addClass('error');
      } else {
        $('#' + e.errorField).hide();
        $('#' + e.label).removeClass('error');
      }
    }
  }
  if(error){
    $('#missingFields-container').show('fast');
  }
  return !error;
};

/**
 *  Take an XML document and from that populate the form fields
 *  @param {document object} XML doc
 */
SchedulerForm.populate = function(doc) {
  for(var e in this.formFields){
    if(e == 'startdate' || e == 'duration' || e == 'resources' || e == 'id'){
      selector = e;
    } else if (e == 'attendees') {
      selector = 'attendee';
    } else {
      selector = 'item[key="' + e + '"] > value';
    }
    this.formFields[e].setValue($(selector, doc).text());
  }
};

/**
 *  Create new rest document
 *  @return {DOM Object} Empty DOM document
 */
SchedulerForm.createDoc = function() {
  var doc = null;
  //Create a DOM Document, methods vary between browsers, e.g. IE and Firefox
  if(document.implementation && document.implementation.createDocument) { //Firefox, Opera, Safari, Chrome, etc.
    doc = document.implementation.createDocument(this.rootNS, this.rootEl, null);
  } else { // IE
    doc = new ActiveXObject('MSXML2.DOMDocument');
    doc.loadXML('<' + this.rootEl + ' xmlns="' + this.rootNS + '"></' + this.rootEl + '>');
  }
  return doc;
};

/**
 *  FormField class contains the data and methods for a single or group of form elements.
 *  The first parameter is either a string (single element) or an array of strings (multiple elements)
 *  that are the form element id. The second parameter indicates if the formfield is required
 *  for form validation. The last field is a key/value set of options.
 *  Options -
 *    getValue    : function which overrides default
 *    setValue    : function which overrides default
 *    dispValue   : function which overrides default
 *    checkValue  : function which overrides default
 *    label       : element id for a field label
 *    errorField  : element id for an error field
 *
 *  @param {String | Object} string or array of strings of element id.
 *  @param {Boolean} required
 *  @param {Object} key/value set of options, override functions, label and error field ids.
 *  @constructor
 */

function FormField(elm, req, opts) {
  this.fields = [];
  this.required = req || false;
  var id = this.setFormFields(elm);
  this.setFormFieldOpts(opts);
  this.value      = null;
  this.label      = this.label      || 'label-' + id;
  this.errorField = this.errorField || 'missing-' + id;
}

function setFormFields(elm){
  if(typeof elm == 'string') { //If a single field is specified, wrap in an array.
    elm = [elm];
  }
  for(var k in elm) {
    var e = $('#' + elm[k]);
    if(e[0]){
      if(k == 0){
        var id = e[0].id;
      }
      this.fields[elm[k]] = e;
    }
  }
  return id;
}
FormField.prototype.setFormFields = setFormFields;

function setFormFieldOpts(opts){
  if(typeof opts == 'object') {
    for(var f in opts) {
      this[f] = opts[f];
    }
  }
}
FormField.prototype.setFormFieldOpts = setFormFieldOpts;

/**
 *  Default FormField getValue function.
 *  @returns {String} Concatinated value of all elements
 *  @member FormField
 */
function getFormFieldValue() {
  var values = [];
  for(var el in this.fields) {
    var e = this.fields[el];
    if(e) {
      values.push(e.val());
    }
    this.value = values.join(',');
  }
  return this.value;
}
FormField.prototype.getValue = getFormFieldValue;

/**
 *  Default FormField dispValue function.
 *  @returns {String} Concatinated value of all elements
 *  @member FormField
 */
function dispFormFieldValue() {
  return this.getValue();
}
FormField.prototype.dispValue = dispFormFieldValue;

/**
 *  Default FormField setValue function.
 *  @param {Object} key/value set of values to be set on fields.
 *  @member FormField
 */
function setFormFieldValue(values) {
  if(typeof values == 'object'){
    for(var e in values) {
      if(values[e] && this.fields[e]) {
        switch(this.fields[e][0].type) {
          case 'checkbox':
          case 'radio':
            this.fields[e][0].checked = true;
            break;
          default:
            this.fields[e].val(values[e]);
        }
      }
    }
  }else if(typeof values == 'string'){
    for(var k in this.fields){
      this.fields[k].val(values);
    }
  }
}
FormField.prototype.setValue = setFormFieldValue;

/**
 *  Default FormField checkValue function.
 *  @returns {Boolean} True if field is requried and filled in.
 *  @member FormField
 */
function checkFormFieldValue() {
  if(this.required) {
    var oneIsValid = false;
    for(var e in this.fields) {
      if(this.fields[e][0].type == 'checkbox' || this.fields[e][0].type == 'radio') {
        if(this.fields[e][0].checked) {
          oneIsValid = true;
          break;
        }
      } else {
        if(this.fields[e].val()) {
          oneIsValid = true;
          break;
        }
      }
    }
    if(oneIsValid) {
      return true;
    }
  } else {
    return true;
  }
  return false;
}
FormField.prototype.checkValue = checkFormFieldValue;

// ===== Custom get/set/check functions for FormFields =====

/**
 * Overrides getValue for FormFields for agent field
 * @return {String} agent id
 */
function getAgent() {
  if(this.fields.attendees) {
    this.value = this.fields.attendees.val();
  }
  return this.value;
}

/**
 * Overrides setValue for FormFields for agent field
 * @param {String} agent id
 */
function setAgent(value) {
  if(typeof value == 'string'){
    value = { attendees: value };
  }
  var opts = this.fields.attendees.children();
  var agentId = value.attendees;
  if(opts.length > 0) {
    var found = false;
    for(var i = 0; i < opts.length; i++) {
      if(opts[i].value == agentId) {
        found = true;
        opts[i].selected = true;
        break;
      }
    }
    if(!found){ //Couldn't find the previsouly selected agent, add to list and notifiy user.
      this.fields.attendees.append($('<option selected="selected">' + agentId + '</option>').val(agentId));
      $('#attendees').change();
    }
    this.fields.attendees.val(agentId);
  }
}

/**
 * Overrides getValue for FormFields for agent field
 * @return {Boolean} true if an agent is selected
 */
function checkAgent() {
  if(this.getValue()) {
    return true;
  }
  return false;
}

/**
 *  Overrides getValue of FormFields for duration fields
 *  @return {integer} duration.
 */
function getDuration() {
  if(this.checkValue()){
    duration = this.fields.durationHour.val() * 3600; // seconds per hour
    duration += this.fields.durationMin.val() * 60; // seconds per min
    this.value = (duration * 1000);
  }
  return this.value;
}

/**
 *  Overrides dispValue of FormFields for duration fields
 *  @return {string} hours and minutes of duration
 */
function getDurationDisplay() {
  var dur = this.getValue() / 1000;
  var hours = Math.floor(dur / 3600);
  var min   = Math.floor( ( dur /60 ) % 60 );
  return hours + ' hours, ' + min + ' minutes';
}

/**
 *  Overrides setValue for FormFields for duration fields
 *  @param {string} Duration in milliseconds
 */
function setDuration(value) {
  if(typeof value == 'string'){
    value = { duration: value };
  }
  var val = parseInt(value.duration);
  if(val == "NaN") {
    throw "Could not parse duration.";
  }
  if(this.fields.durationHour && this.fields.durationMin){
    val = val/1000; //milliseconds -> seconds
    var hour  = Math.floor(val/3600);
    var min   = Math.floor((val/60) % 60);
    this.fields.durationHour.val(hour);
    this.fields.durationMin.val(min);
  }
}

/**
 *  Overrides checkValue for FormFields for duration fields
 *  @return {boolean} True if the duration is valid, otherwise false.
 */
function checkDuration(){
  if(this.fields.durationHour && this.fields.durationMin &&
     (this.fields.durationHour.val() !== '0' || this.fields.durationMin.val() !== '0')){
    return true;
  }
  return false;
}

/**
 *  Overrides getValue for FormFields for input field
 *  @return {string} Comma seperated string of inputs
 */
function getInputs(){
  var selected = [];
  for(var el in this.fields){
    var e = this.fields[el];
    if(e[0] && e[0].checked){
      selected.push(e.val());
    }
  }
  this.value = selected.toString();
  return this.value;
}

/**
 *  Overrides setValue for FormFields for input field
 *  @param {string} Comma seperated string of inputs
 */
function setInputs(value){
  if(typeof value == 'string'){
    value = { resources: value };
  }
  for(var el in this.fields){
    var e = this.fields[el];
    if(e[0] && value.resources.toLowerCase().indexOf(e.val().toLowerCase()) != -1){
      e[0].checked = true;
    }
  }
}

/**
 *  Overrides checkValue for FormFields for input field
 *  @return {boolean} True if one of the radios are checked
 */
function checkInputs(){
  var checked = false;
  for(var el in this.fields){
    if(this.fields[el][0].checked){
      checked = true;
      break;
    }
  }
  return checked;
}

/**
 *  Overrides getValue for FormFields for startDate fields
 *  @return {integer} milliseconds from epoch
 */
function getStartDate(){
  var date = 0;
  if(this.checkValue()){
    date = this.fields.startDate.datepicker('getDate').getTime() / 1000; // Get date in milliseconds, convert to seconds.
    date += this.fields.startTimeHour.val() * 3600; // convert hour to seconds, add to date.
    date += this.fields.startTimeMin.val() * 60; //convert minutes to seconds, add to date.
    date -= Agent.tzDiff * 60; //Agent TZ offset
    date = date * 1000; //back to milliseconds
    this.value = (new Date(date)).getTime();
  }
  return this.value;
}

/**
 *  Overrides dispValue for FormFields for startDate fields
 *  @return {string} localized date/time string.
 */
function getStartDateDisplay(){
  return (new Date(this.getValue())).toLocaleString();
}

/**
 *  Overrides setValue for FormFields for startDate fields
 *  @param {Date Object}
 */
function setStartDate(value){
  if(typeof value == 'string'){
    value = { startdate: value };
  }
  var date = parseInt(value.startdate);
  if(date != 'NaN') {
    date = new Date(date + (Agent.tzDiff * 60 * 1000));
  } else {
    throw 'Could not parse date.';
  }
  if(this.fields.startDate && this.fields.startTimeHour && this.fields.startTimeMin){
    var hour = date.getHours();
    
    this.fields.startTimeHour.val(hour);
    this.fields.startTimeMin.val(date.getMinutes());
    
    //datepicker modifies the date object removing the time.
    this.fields.startDate.datepicker('setDate', date);
  }
}

/**
 *  Overrides checkValue for FormFields for startDate fields
 *  @return {boolean} True if the startDate is valid, otherwise false.
 */
function checkStartDate(){
  var date = this.fields.startDate.datepicker('getDate');
  var now = (new Date()).getTime();
  now += Agent.tzDiff  * 60 * 1000; //Offset by the difference between local and client.
  now = new Date(now);
  if(this.fields.startDate &&
    date &&
    this.fields.startTimeHour &&
    this.fields.startTimeMin) {
      var startdatetime = new Date(date.getFullYear(), 
                                 date.getMonth(), 
                                 date.getDate(), 
                                 this.fields.startTimeHour.val(),
                                 this.fields.startTimeMin.val());
    if(startdatetime.getTime() >= now.getTime()) {
      return true;
    }
    return false;
  }
}

function getRecurValue(){
  if(this.checkValue()){
    if(this.fields.schedule_repeat.val() == 'weekly'){
      var rrule = "RRULE:FREQ=WEEKLY;UNTIL=" + SchedulerUI.toICalDate(this.fields.endDate.datepicker('getDate')) + ";BYDAY=";
      var days = [];
      if(this.fields.repeat_sun[0].checked){
        days.push("SU");
      }
      if(this.fields.repeat_mon[0].checked){
        days.push("MO");
      }
      if(this.fields.repeat_tue[0].checked){
        days.push("TU");
      }
      if(this.fields.repeat_wed[0].checked){
        days.push("WE");
      }
      if(this.fields.repeat_thu[0].checked){
        days.push("TH");
      }
      if(this.fields.repeat_fri[0].checked){
        days.push("FR");
      }
      if(this.fields.repeat_sat[0].checked){
        days.push("SA");
      }
      this.value = rrule + days.toString();
    }
  }
  return this.value;
}

function setRecurValue(value){
  if(typeof value == 'string'){
    value = { rrule: value };
  }
  if(value.rrule.indexOf('FREQ=WEEKLY') != -1){
    this.fields.schedule_repeat.val('weekly');
    var days = value.rrule.split('BYDAY=')
    if(days[1].length > 0){
      days = days[1].split(',');
      this.fields.repeat_sun[0].checked = this.fields.repeat_mon[0].checked = this.fields.repeat_tue[0].checked = this.fields.repeat_wed[0].checked = this.fields.repeat_thu[0].checked = this.fields.repeat_fri[0].checked = this.fields.repeat_sat[0].checked = false;
      for(d in days){
        switch(days[d]){
          case 'SU':
            this.fields.repeat_sun[0].checked = true;
            break;
          case 'MO':
            this.fields.repeat_mon[0].checked = true;
            break;
          case 'TU':
            this.fields.repeat_tue[0].checked = true;
            break;
          case 'WE':
            this.fields.repeat_wed[0].checked = true;
            break;
          case 'TH':
            this.fields.repeat_thu[0].checked = true;
            break;
          case 'FR':
            this.fields.repeat_fri[0].checked = true;
            break;
          case 'SA':
            this.fields.repeat_sat[0].checked = true;
            break;
        }
      }
    }
  }
}

function checkRecurValue(){
  if(this.fields.schedule_repeat.val() != 'norepeat'){
    if(this.fields.repeat_sun[0].checked ||
       this.fields.repeat_mon[0].checked ||
       this.fields.repeat_tue[0].checked ||
       this.fields.repeat_wed[0].checked ||
       this.fields.repeat_thu[0].checked ||
       this.fields.repeat_fri[0].checked ||
       this.fields.repeat_sat[0].checked ){
      if(this.fields.endDate.datepicker('getDate')){ //Todo, check enddate is after start date.
        return true;
      }
    }
  }
  return false;
}

function getRecurDisp(){
  var rrule = this.getValue();
  var days = rrule.split('BYDAY=');
  if(days[1].length > 0){
    days = days[1].split(',');
    var dlist = [];
    for(d in days){
      switch(days[d]){
        case 'SU':
          dlist.push(i18n.day.sun);
          break;
        case 'MO':
          dlist.push(i18n.day.mon);
          break;
        case 'TU':
          dlist.push(i18n.day.tue);
          break;
        case 'WE':
          dlist.push(i18n.day.wed);
          break;
        case 'TH':
          dlist.push(i18n.day.thu);
          break;
        case 'FR':
          dlist.push(i18n.day.fri);
          break;
        case 'SA':
          dlist.push(i18n.day.sat);
          break;
      }
    }
  }
  return "Weekly on " + dlist.toString();
}
