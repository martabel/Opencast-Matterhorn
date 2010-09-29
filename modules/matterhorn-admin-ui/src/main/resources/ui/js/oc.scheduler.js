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

// REST endpoints
var SCHEDULER_URL     = '/scheduler/rest';
var WORKFLOW_URL      = '/workflow/rest';
var CAPTURE_ADMIN_URL = '/capture-admin/rest';
var SERIES_URL        = '/series/rest';

// Constants
var CREATE_MODE       = 1;
var EDIT_MODE         = 2;
var SINGLE_EVENT      = 3;
var MULTIPLE_EVENTS   = 4;

// XML Namespaces
var SINGLE_EVENT_ROOT_ELM   = "event"
var MULTIPLE_EVENT_ROOT_ELM = "recurringEvent";


/* @namespace Scheduluer Namespace */
var ocScheduler               = ocScheduler || {};
ocScheduler.mode              = CREATE_MODE;
ocScheduler.type              = SINGLE_EVENT;
ocScheduler.selectedInputs    = '';
ocScheduler.conflictingEvents = false;

var Agent     = Agent || {};

Agent.tzDiff  = 0;

ocScheduler.Init = function(){
  ocWorkflow.init($('#workflowSelector'), $('#workflowConfigContainer'));
  ocScheduler.Internationalize();
  ocScheduler.RegisterComponents();
  ocScheduler.RegisterEventHandlers();

  ocScheduler.FormManager = new ocAdmin.Manager(SINGLE_EVENT_ROOT_ELM, '', ocScheduler.components);
  
  if(ocScheduler.type === SINGLE_EVENT){
    ocScheduler.agentList = '#agent';
    ocScheduler.inputList = '#inputList';
    $('#singleRecording').click(); //Initiates Page event cycle
  }else{
    ocScheduler.agentList = '#recurAgent';
    ocScheduler.inputList = '#recurInputList';
    $('#multipleRecordings').click();
  }

  if(ocUtils.getURLParam('seriesId')){
    $('#series').val(ocUtils.getURLParam('seriesId'));
    $.get(SERIES_URL + '/series/' + ocUtils.getURLParam('seriesId'), function(doc){
      $.each($('metadata', doc), function(i, metadata){
        if($('key', metadata).text() === 'title'){
          $('#seriesSelect').val($('value',metadata).text());
          return true;
        }
      });
    });
  }
  
  //Editing setup
  var eventId = ocUtils.getURLParam('eventId');
  if(eventId && ocUtils.getURLParam('edit')){
    document.title = i18n.window.edit + " " + i18n.window.prefix;
    $('#i18n_page_title').text(i18n.page.title.edit);
    $('#eventId').val(eventId);
    $('#recordingType').hide();
    $('#agent').change(
      function() {
        $('#noticeContainer').hide();
        $.get(CAPTURE_ADMIN_URL + '/agents/' + $('#agent option:selected').val(), ocScheduler.CheckAgentStatus);
      });
  }else{
    $.get(SCHEDULER_URL + '/uuid', function(data){
      $('#eventId').val(data.id);
    });
  }
};

ocScheduler.Internationalize = function(){
  //Do internationalization of text
  jQuery.i18n.properties({
    name:'scheduler',
    path:'i18n/'
  });
  ocAdmin.internationalize(i18n, 'i18n');
  //Handle special cases like the window title.
  document.title = i18n.window.schedule + " " + i18n.window.prefix; 
  $('#i18n_page_title').text(i18n.page.title.sched);
};

ocScheduler.RegisterEventHandlers = function(){
  var initializerDate;
  initializerDate = new Date();
  initializerDate.setHours(initializerDate.getHours() + 1); //increment an hour.
  initializerDate.setMinutes(0);
  
  //UI Functional elements
  $('#singleRecording').click(function(){
    ocScheduler.ChangeRecordingType(SINGLE_EVENT);
  });
  $('#multipleRecordings').click(function(){
    ocScheduler.ChangeRecordingType(MULTIPLE_EVENTS);
  });
  
  $('.folder-head').click(
    function() {
      $(this).children('.fl-icon').toggleClass('icon-arrow-right');
      $(this).children('.fl-icon').toggleClass('icon-arrow-down');
      $(this).next().toggle('fast');
      return false;
    });
  
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
  
  $('#seriesSelect').autocomplete({
    source: SERIES_URL + '/search',
    select: function(event, ui){
      $('#series').val(ui.item.id);
    },
    search: function(){
      $('#series').val('');
    }
  });
  
  $('#seriesSelect').blur(function(){if($('#seriesSelect').val() === ''){ $('#series').val(''); }});
  
  $('#submitButton').click(ocScheduler.SubmitForm);
  $('#cancelButton').click(ocScheduler.CancelForm);

  //single recording specific elements
  $('#startTimeHour').val(initializerDate.getHours());
  $('#startDate').datepicker({
    showOn: 'both',
    buttonImage: 'img/icons/calendar.gif',
    buttonImageOnly: true
  });
  $('#startDate').datepicker('setDate', initializerDate);
  $('#endDate').datepicker({
    showOn: 'both',
    buttonImage: 'img/icons/calendar.gif',
    buttonImageOnly: true
  });
  
  $('#agent').change(ocScheduler.HandleAgentChange);
  
  //multiple recording specific elements
  $('#recurStart').datepicker({
    showOn: 'both',
    buttonImage: 'img/icons/calendar.gif',
    buttonImageOnly: true
  });
  
  $('#recurEnd').datepicker({
    showOn: 'both',
    buttonImage: 'img/icons/calendar.gif',
    buttonImageOnly: true
  });

  $('#recurAgent').change(ocScheduler.HandleAgentChange);
  
  //Check for conflicting events.
  $('#startDate').change(ocScheduler.CheckForConflictingEvents);
  $('#startTimeHour').change(ocScheduler.CheckForConflictingEvents);
  $('#startTimeMin').change(ocScheduler.CheckForConflictingEvents);
  $('#durationHour').change(ocScheduler.CheckForConflictingEvents);
  $('#durationMin').change(ocScheduler.CheckForConflictingEvents);
  $('#agent').change(ocScheduler.CheckForConflictingEvents);
  
  $('#recurStart').change(ocScheduler.CheckForConflictingEvents);
  $('#recurEnd').change(ocScheduler.CheckForConflictingEvents);
  $('#recurStartTimeHour').change(ocScheduler.CheckForConflictingEvents);
  $('#recurStartTimeMin').change(ocScheduler.CheckForConflictingEvents);
  $('#recurDurationHour').change(ocScheduler.CheckForConflictingEvents);
  $('#recurDurationMin').change(ocScheduler.CheckForConflictingEvents);
  $('#recurAgent').change(ocScheduler.CheckForConflictingEvents);
  $('#daySelect :checkbox').change(ocScheduler.CheckForConflictingEvents);
}

ocScheduler.ChangeRecordingType = function(recType){
  ocScheduler.type = recType;
  
  ocScheduler.RegisterComponents();
  ocScheduler.FormManager.components = ocScheduler.components;
  
  $('.error').removeClass('error');
  $('#missingFieldsContainer').hide();
  
  var d = new Date()
  d.setHours(d.getHours() + 1); //increment an hour.
  d.setMinutes(0);
  
  if(ocScheduler.type == SINGLE_EVENT){
    $('#titleNote').hide();  
    $('#recurringRecordingPanel').hide();
    $('#singleRecordingPanel').show();
    ocScheduler.agentList = '#agent';
    ocScheduler.inputList = '#inputList';
    $(ocScheduler.inputList).empty();
    $('#seriesRequired').remove(); //Remove series required indicator.
    ocScheduler.components.timeStart.setValue(d.getTime().toString());
    ocScheduler.FormManager.rootElm = SINGLE_EVENT_ROOT_ELM;
  }else{
    // Multiple recordings have some differnt fields and different behaviors
    //show recurring_recording panel, hide single.
    $('#titleNote').show();
    $('#recurringRecordingPanel').show();
    $('#singleRecordingPanel').hide();
    ocScheduler.agentList = '#recurAgent';
    ocScheduler.inputList = '#recurInputList';
    $(ocScheduler.inputList).empty();
    if(!$('#seriesRequired')[0]){
      $('#seriesContainer > label').prepend('<span id="seriesRequired" style="color: red;">* </span>'); //series is required, indicate as such.
    }
    ocScheduler.components.recurrenceStart.setValue(d.getTime().toString());
    ocScheduler.FormManager.rootElm = MULTIPLE_EVENT_ROOT_ELM;
  }
  ocScheduler.LoadKnownAgents();
};

ocScheduler.SubmitForm = function(){
  var eventXML = null;
  eventXML = ocScheduler.FormManager.serialize();
  if(eventXML){
    if(ocScheduler.type === SINGLE_EVENT){
      if(ocUtils.getURLParam('edit')){
        $.post( SCHEDULER_URL + '/event', {
               event: eventXML
               }, ocScheduler.EventSubmitComplete );
      }else{
        $.ajax({
               type: "PUT",
               url: SCHEDULER_URL + '/event',
               data: {
               event: eventXML
               },
               success: ocScheduler.EventSubmitComplete
               });
      }
    }else{
      if(ocUtils.getURLParam('edit')){
        $.post( SCHEDULER_URL + '/event', {
               recurringEvent: eventXML
               }, ocScheduler.EventSubmitComplete );
      }else{
        $.ajax({
          type: "PUT",
          url: SCHEDULER_URL + '/recurrence',
          data: { recurringEvent: eventXML },
          success: ocScheduler.EventSubmitComplete
        });
      }
    }
  }
  return true;
};

ocScheduler.CancelForm = function(){
  document.location = 'recordings.html';
};

/*
ocScheduler.DeleteForm = function(){
  var title, series, creator;
  if(confirm(i18n.del.confirm)){
    $.get(SCHEDULER_URL + '/removeEvent/' + $('#eventId').val(), function(){
      title = ocScheduler.components.title.asString() || 'No Title';
      series = ocScheduler.components.seriesId.asString() || 'No Series';
      creator = ocScheduler.components.creator.asString() || 'No Creator';
      $('#i18n_del_msg').text(i18n.del.msg(title, series, '(' + creator + ')'));
      $('#stage').hide();
      $('#deleteBox').show();
    });
  }
};*/

ocScheduler.HandleAgentChange = function(elm){
  var time;
  var agent = elm.target.value;
  $(ocScheduler.inputList).empty();
  if(agent){
    $.get('/capture-admin/rest/agents/' + agent + '/capabilities',
      function(doc){
        var capabilities = [];
        $.each($('entry', doc), function(a, i){
          var s = $(i).attr('key');
          if(s.indexOf('.src') != -1){
            var name = s.split('.');
            capabilities.push(name[2]);
          } else if(s == 'capture.device.timezone.offset') {
            var agentTz = parseInt($(i).text());
            if(agentTz !== 'NaN'){
              ocScheduler.HandleAgentTZ(agentTz);
            }else{
              ocUtils.log("Couldn't parse TZ");
            }
          }
        });
        if(capabilities.length){
          ocScheduler.DisplayCapabilities(capabilities);
        }else{
          Agent.tzDiff = 0; //No agent timezone could be found, assume local time.
          $('#inputList').replaceWith('Agent defaults will be used.');
        }
      });
  }else{
    // no valid agent, change time to local form what ever it was before.
    if(ocScheduler.type === SINGLE_EVENT){
      time = ocScheduler.components.timeStart.getValue();
    }else if(ocScheduler.type === MULTIPLE_EVENTS){
      time = ocScheduler.components.recurrenceStart.getValue();
    }
    Agent.tzDiff = 0;
    if(ocScheduler.type === SINGLE_EVENT){
      ocScheduler.components.timeStart.setValue(time);
    }else if(ocScheduler.type === MULTIPLE_EVENTS){
      ocScheduler.components.recurrenceStart.setValue(time);
    }
  }
};

ocScheduler.DisplayCapabilities = function(capabilities){
  ocUtils.log(capabilities);
  $.each(capabilities, function(i, v){
    $(ocScheduler.inputList).append('<input type="checkbox" id="' + v + '" value="' + v + '" checked="checked"><label for="' + v +'">' + v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() + '</label>');
  });
  ocScheduler.components.resources.setFields(capabilities);
  if(ocScheduler.selectedInputs && ocUtils.getURLParam('edit')){
    ocScheduler.components.resources.setValue(ocScheduler.selectedInputs);
  }
  // Validate if an input was chosen
  ocScheduler.inputCount = $(ocScheduler.inputList).children('input:checkbox').size();
  total = ocScheduler.inputCount;
  $(ocScheduler.inputList).each(function(){
        $(this).children("input:checkbox").click(function(){
          
          total = (this.checked) ? (total = (total < 3) ? total+=1 : total) : total-=1;
          if(total < 1) {
        	  var position = $('#help_input').position();
        	  $('#inputhelpBox').css('left',position.left + 100 +'px');
        	  $('#inputhelpBox').css('top',position.top);
        	  $('#inputhelpTitle').text("Please Note");
        	  $('#inputhelpText').text("You have to select at least one input in order to schedule a recording.");
        	  $('#inputhelpBox').show();
        	  $('#submitButton').attr("disabled", "true");
          }
          else {
        	  $('#inputhelpBox').hide();
        	  $('#submitButton').removeAttr("disabled");
          }
        });
      });
  
};

ocScheduler.HandleAgentTZ = function(tz){
  var agentLocalTime = null;
  var localTZ = -(new Date()).getTimezoneOffset(); //offsets in minutes
  Agent.tzDiff = 0;
  if(tz != localTZ){
    //Display note of agent TZ difference, all times local to capture agent.
    //update time picker to agent time
    Agent.tzDiff = tz - localTZ;
    if(ocScheduler.type == SINGLE_EVENT){
      agentLocalTime = ocScheduler.components.timeStart.getValue() + (Agent.tzDiff * 60 * 1000);
      ocScheduler.components.timeStart.setValue(agentLocalTime);
    }else if(ocScheduler.type == MULTIPLE_EVENTS){
      agentLocalTime = ocScheduler.components.recurrenceStart.getValue() + (Agent.tzDiff * 60 * 1000);
      ocScheduler.components.recurrenceStart.setValue(agentLocalTime);
    }
    diff = Math.round((Agent.tzDiff/60)*100)/100;
    if(diff < 0){
      postfix = " hours earlier";
    }else if(diff > 0){
      postfix = " hours later"; 
    }
    $('#noticeContainer').show();
    $('#noticeTzDiff').show();
    $('#tzdiff').replaceWith(Math.abs(diff) + postfix);
  }
};

ocScheduler.CheckAgentStatus = function(doc){
  var state = $('state', doc).text();
  if(state == '' || state == 'unknown' || state == 'offline') {
    $('#noticeContainer').show();
    $('#noticeOffline').show();
  }
};

/**
 *  loadKnownAgents calls the capture-admin service to get a list of known agents.
 *  Calls handleAgentList to populate the dropdown.
 */
ocScheduler.LoadKnownAgents = function() {
  $(ocScheduler.agentList).empty();
  $(ocScheduler.agentList).append($('<option></option>').val('').html('Choose one:'));
  $.get(CAPTURE_ADMIN_URL + '/agents', ocScheduler.HandleAgentList, 'xml');
};

/**
 *  Popluates dropdown with known agents
 *
 *  @param {XML Document}
 */
ocScheduler.HandleAgentList = function(data) {
  $.each($('name', data),
    function(i, agent) {
      $(ocScheduler.agentList).append($('<option></option>').val($(agent).text()).html($(agent).text())); 
    });
  var eventId = ocUtils.getURLParam('eventId');
  if(eventId && ocUtils.getURLParam('edit')) {
    $.ajax({
      type: "GET",
      url: SCHEDULER_URL + '/event/' + eventId,
      success: ocScheduler.LoadEvent,
      cache: false
    });
  }
};

ocScheduler.LoadEvent = function(doc){
  var metadata = {};
  var workflowProperties = {};
  $.each($('metadataList > metadata',doc), function(i,v){
    if($('key', v).text().indexOf('org.opencastproject.workflow') > -1){
      workflowProperties[$('key', v).text()] = $('value', v).text();
    }else{
      metadata[$('key', v).text()] = $('value', v).text();
    }
  });
  $.each($('completeMetadata > metadata',doc), function(i,v){
    if(metadata[$('key', v).text()] == undefined){
      //feild not in list, add it.
      if($('key', v).text().indexOf('org.opencastproject.workflow') > -1){
        workflowProperties[$('key', v).text()] = $('value', v).text();
      }else{
        metadata[$('key', v).text()] = $('value', v).text();
      }
    }
  });
  if(metadata['resources']){
    //store the selected inputs for use when getting the capabilities.
    ocScheduler.selectedInputs = metadata['resources'];
  }
  if(metadata['seriesId']){
    $.get(SERIES_URL + '/search?term=' + metadata['seriesId'], function(data){
      ocScheduler.components.seriesId.setValue(data[0]);
    });
  }
  if(metadata['recurrenceId'] && metadata['recurrencePosition']){
    ocScheduler.components.recurrenceId = new ocAdmin.Component(['recurrenceId']);
    ocScheduler.components.recurrencePosition = new ocAdmin.Component(['recurrencePosition']);
  }
  if(workflowProperties['org.opencastproject.workflow.definition']){
    ocScheduler.components.workflowDefinition.setValue(workflowProperties['org.opencastproject.workflow.definition']);
    ocWorkflow.definitionSelected(workflowProperties['org.opencastproject.workflow.definition'],
      $('#workflowConfigContainer'),
      function(){
        registerWorkflowComponents(ocScheduler.FormManager.workflowComponents);
        setWorkflowComponentValues(workflowProperties, ocScheduler.FormManager.workflowComponents);
      });
  }
  ocScheduler.FormManager.populate(metadata)
  $('#agent').change(); //update the selected agent's capabilities
}

ocScheduler.EventSubmitComplete = function(){
  for(var k in ocScheduler.components){
    $('#data-'+ k).show();
    //$("#data-" + k + " > .data-label").text(i18n[k].label + ":");
    $('#data-' + k + ' > .data-value').text(ocScheduler.components[k].asString());
  }
  $('#submissionSuccess').siblings().hide();
  $('#submissionSuccess').show();
}

ocScheduler.CheckForConflictingEvents = function(){
  var event, endpoint, data;
  ocScheduler.conflictingEvents = false;
  if($('#noticeConflict').siblings(':visible').length === 0){
    $('#noticeContainer').hide();
  }
  $('#noticeConflict').hide();
  $('#conflictingEvents').empty();
  if(ocScheduler.components.device.validate()){
    event = '<metadata><key>device</key><value>' + ocScheduler.components.device.getValue() + '</value></metadata>';
  }else{
    return false;
  }
  if(ocScheduler.type === SINGLE_EVENT){
    if(ocScheduler.components.timeStart.validate() && ocScheduler.components.timeDuration.validate()){
      event = '<event><metadataList>' + event;
      event += '<metadata><key>timeStart</key><value>' + ocScheduler.components.timeStart.getValue() + '</value></metadata>';
      event += '<metadata><key>timeEnd</key><value>' + ocScheduler.components.timeDuration.getValue() + '</value></metadata></metadataList></event>';
      endpoint = '/events/conflict';
      data = {event: event};
    }else{
      return false;
    }
  }else if(ocScheduler.type === MULTIPLE_EVENTS){
    if(ocScheduler.components.recurrenceStart.validate() && ocScheduler.components.recurrenceEnd.validate() &&
       ocScheduler.components.recurrence.validate() && ocScheduler.components.recurrenceDuration.validate()){
      event = '<recurringEvent><recurrence>' + ocScheduler.components.recurrence.getValue() + '</recurrence><metadataList>' + event;
      event += '<metadata><key>recurrenceStart</key><value>' + ocScheduler.components.recurrenceStart.getValue() + '</value></metadata>';
      event += '<metadata><key>recurrenceEnd</key><value>' + ocScheduler.components.recurrenceEnd.getValue() + '</value></metadata>';
      event += '<metadata><key>recurrenceDuration</key><value>' + (ocScheduler.components.recurrenceDuration.getValue()) + '</value></metadata>';
      event += '</metadataList></recurringEvent>';
      endpoint = '/recurrence/conflict';
      data = {recurringEvent: event};
    }else{
      return false;
    }
  }
  $.post(SCHEDULER_URL + endpoint, data, function(doc){
    if($('event', doc).length > 0){
      $.each($('event', doc), function(i,event){
        var id, title;
        id = $('eventId', event).text();
        $.each($('completeMetadata > metadata', event), function(j,metadata){
          if($('key', metadata).text() === 'title'){
            title = $('value', metadata).text();
            return true;
          }
        });
        if(id !== $('#eventId').val()){
          $('#conflictingEvents').append('<li><a href="scheduler.html?eventId=' + id + '&edit" target="_new">' + title + '</a></li>');
          ocScheduler.conflictingEvents = true;
        }
      });
      if(ocScheduler.conflictingEvents){
        $('#noticeContainer').show();
        $('#noticeConflict').show();
      }
    }
  });
}

ocScheduler.RegisterComponents = function(){
  ocScheduler.components = {};
  
  ocScheduler.components.title = new ocAdmin.Component(['title'], {label: 'titleLabel', required: true});
  ocScheduler.components.creator = new ocAdmin.Component(['creator'], {label: 'creatorLabel'});
  ocScheduler.components.contributor = new ocAdmin.Component(['contributor'], {label: 'contributorLabel'});
  ocScheduler.components.seriesId = new ocAdmin.Component(['series', 'seriesSelect'],
    { label: 'seriesLabel', errorField: 'missingSeries', required: true, nodeKey: 'seriesId' },
    { getValue: function(){ 
        if(this.fields.series){
          this.value = this.fields.series.val();
        }
        return this.value;
      },
      setValue: function(value){
        this.fields.series.val(value.id);
        this.fields.seriesSelect.val(value.label)
      },
      asString: function(){
        if(this.fields.seriesSelect){
          return this.fields.seriesSelect.val();
        }
        return this.getValue() + '';
      },
      validate: function(){
        if(this.fields.seriesSelect.val() !== '' && this.fields.series.val() === ''){ //have text and no idea
          return this.createSeriesFromSearchText();
        }
        return true; //nothing, or we have an id.
      },
      createSeriesFromSearchText: function(){
        var series, seriesComponent;
        var creationSucceeded = false;
        if(this.fields.seriesSelect !== ''){
          series = '<series><metadataList><metadata><key>title</key><value>' + this.fields.seriesSelect.val() + '</value></metadata></metadataList></series>';
          seriesComponent = this;
          $.ajax({
            async: false,
            type: 'PUT',
            url: SERIES_URL + '/series',
            data: { series: series },
            success: function(data){
              if(data.success){
                creationSucceeded = true;
                seriesComponent.fields.series.val(data.id);
              }
            }
          });
        }
        return creationSucceeded;
      }
    });
  ocScheduler.components.subject = new ocAdmin.Component(['subject'], {label: 'subjectLabel'});
  ocScheduler.components.language = new ocAdmin.Component(['language'], {label: 'languageLabel'});
  ocScheduler.components.description = new ocAdmin.Component(['description'], {label: 'descriptionLabel'});
  ocScheduler.components.resources = new ocAdmin.Component([],
    { label: 'i18n_input_label', errorField: 'missingInputs', nodeKey: 'resources' },
    { getValue: function(){
        var selected = [];
        for(var el in this.fields){
          var e = this.fields[el];
          if(e[0] && e[0].checked){
            selected.push(e.val());
          }
        }
        this.value = selected.toString();
        return this.value;
      },
      setValue: function(value){
        if(typeof value == 'string'){
          value = { resources: value };
        }
        for(var el in this.fields){
          var e = this.fields[el];
          if(e[0] && value.resources.toLowerCase().indexOf(e.val().toLowerCase()) != -1){
            e[0].checked = true;
          }else{
            e[0].checked = false;
          }
        }
      },
      validate: function(){
        var checked = false;
        for(var el in this.fields){
          if(this.fields[el][0].checked){
            checked = true;
            break;
          }
        }
        return checked;
      }
    });
  ocScheduler.components.workflowDefinition = new ocAdmin.Component(['workflowSelector'], {nodeKey: 'org.opencastproject.workflow.definition'})
  if(ocScheduler.type === MULTIPLE_EVENTS){
    //Series validation override for recurring events.
    ocScheduler.components.seriesId.validate = function(){
      if(this.fields.series.val() !== ''){ //Already have an id
        return true;
      }else if(this.fields.seriesSelect.val() !== ''){ //have text but no id
        return this.createSeriesFromSearchText();
      }
      return false; //nothing
    };
    ocScheduler.components.recurrenceStart = new ocAdmin.Component(['recurStart', 'recurStartTimeHour', 'recurStartTimeMin'],
      { label: 'recurStartLabel', errorField: 'missingStartdate', required: true, nodeKey: 'recurrenceStart' },
      { getValue: function(){
          var date, start;
          date = this.fields.recurStart.datepicker('getDate');
          if(date && date.constructor == Date){
            start = date / 1000; // Get date in milliseconds, convert to seconds.
            start += this.fields.recurStartTimeHour.val() * 3600; // convert hour to seconds, add to date.
            start += this.fields.recurStartTimeMin.val() * 60; //convert minutes to seconds, add to date.
            start -= Agent.tzDiff * 60; //Agent TZ offset
            start = start * 1000; //back to milliseconds
            return start;
          }
        },
        setValue: function(value){
          var date;
          date = parseInt(value);
          
          if(date != 'NaN') {
            date = new Date(date + (Agent.tzDiff * 60 * 1000));
          } else {
            ocUtils.log('Could not parse date.');
          }
          if(this.fields.recurStart && this.fields.recurStartTimeHour && this.fields.recurStartTimeMin){
            this.fields.recurStartTimeHour.val(date.getHours());
            this.fields.recurStartTimeMin.val(date.getMinutes());
            this.fields.recurStart.datepicker('setDate', date); //datepicker modifies the date object removing the time.
          }
        },
        validate: function(){
          var date, now, startdatetime;
          if(this.fields.recurStart.datepicker){
            date = this.fields.recurStart.datepicker('getDate');
            now = (new Date()).getTime();
            now += Agent.tzDiff  * 60 * 1000; //Offset by the difference between local and client.
            now = new Date(now);
            if(date && this.fields.recurStartTimeHour && this.fields.recurStartTimeMin){
              startdatetime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), this.fields.recurStartTimeHour.val(), this.fields.recurStartTimeMin.val());
              if(startdatetime.getTime() >= now.getTime()) {
                return true;
              }
            }
          }
          return false;
        },
        asString: function(){
          return (new Date(this.getValue())).toLocaleString();
        }
      });
    
    ocScheduler.components.recurrenceDuration = new ocAdmin.Component(['recurDurationHour', 'recurDurationMin'],
      { label: 'recurDurationLabel', errorField: 'missingDuration', required: true, nodeKey: 'recurrenceDuration' },
      { getValue: function(){
          if(this.validate()){
            duration = this.fields.recurDurationHour.val() * 3600; // seconds per hour
            duration += this.fields.recurDurationMin.val() * 60; // seconds per min
            this.value = (duration * 1000);
          }
          return this.value;
        },
        setValue: function(value){
          var val, hour, min;
          if(typeof value === 'string'){
            value = { duration: value };
          }
          val = parseInt(value.duration);
          if(val === 'NaN') {
            ocUtils.log('Could not parse duration.');
          }
          if(this.fields.recurDurationHour && this.fields.recurDurationMin){
            val   = val/1000; //milliseconds -> seconds
            hour  = Math.floor(val/3600);
            min   = Math.floor((val/60) % 60);
            this.fields.recurDurationHour.val(hour);
            this.fields.recurDurationMin.val(min);
          }
        },
        validate: function(){
          if(this.fields.recurDurationHour && this.fields.recurDurationMin && (this.fields.recurDurationHour.val() != '0' || this.fields.recurDurationMin.val() != '0')){
            return true;
          }
          return false;
        },
        asString: function(){
          var dur = this.getValue() / 1000;
          var hours = Math.floor(dur / 3600);
          var min   = Math.floor( ( dur /60 ) % 60 );
          return hours + ' hours, ' + min + ' minutes';
        }
      });

    ocScheduler.components.recurrenceEnd = new ocAdmin.Component(['recurEnd', 'recurStart', 'recurStartTimeHour', 'recurStartTimeMin'],
      { label: 'recurEndLabel', errorField: 'errorRecurStartEnd', required: true, nodeKey: 'recurrenceEnd' },
      { getValue: function(){
          var date, end;
          if(this.validate()){
            date = this.fields.recurEnd.datepicker('getDate');
            if(date && date.constructor === Date){
              end = date.getTime() / 1000; // Get date in milliseconds, convert to seconds.
              end += this.fields.recurStartTimeHour.val() * 3600; // convert hour to seconds, add to date.
              end += this.fields.recurStartTimeMin.val() * 60; //convert minutes to seconds, add to date.
              end -= Agent.tzDiff * 60; //Agent TZ offset
              end = end * 1000; //back to milliseconds
              end += ocScheduler.components.recurrenceDuration.getValue(); //Add to duration start time for end time.
              this.value = end;
            }
          }
          return this.value;
        },
        setValue: function(value){
          var val = parseInt(value);
          if(val == 'NaN'){
            this.fields.recurEnd.datepicker('setDate', new Date(val));
          }
        },
        validate: function(){
          if(this.fields.recurEnd.datepicker && this.fields.recurStart.datepicker && ocScheduler.components.recurrenceDuration.validate() &&
             this.fields.recurStartTimeHour && this.fields.recurStartTimeMin &&
             this.fields.recurEnd.datepicker('getDate') > this.fields.recurStart.datepicker('getDate')){
            return true;
          }
          return false;
        },
        asString: function(){
          return (new Date(this.getValue())).toLocaleString();
        }
      });

    ocScheduler.components.device = new ocAdmin.Component(['recurAgent'],
      { label: 'recurAgentLabel', errorField: 'missingAgent', required: true, nodeKey: 'device' },
      { getValue: function(){
          if(this.fields.recurAgent) {
            this.value = this.fields.recurAgent.val();
          }
          return this.value;
        },
        setValue: function(value){
          var opts, agentId, found;
          if(typeof value === 'string'){
            value = { agent: value };
          }
          opts = this.fields.recurAgent.children();
          agentId = value.agent;
          if(opts.length > 0) {
            found = false;
            for(var i = 0; i < opts.length; i++) {
              if(opts[i].value == agentId) {
                found = true;
                opts[i].selected = true;
                break;
              }
            }
            if(!found){ //Couldn't find the previsouly selected agent, add to list and notifiy user.
              this.fields.recurAgent.append($('<option selected="selected">' + agentId + '</option>').val(agentId));
              $('#recurAgent').change();
            }
            this.fields.recurAgent.val(agentId);
          }
        },
        validate: function(){
          if(this.getValue()) {
            return true;
          }
          return false;
        }
      });

    ocScheduler.components.recurrence = new ocAdmin.Component(['scheduleRepeat', 'repeatSun', 'repeatMon', 'repeatTue', 'repeatWed', 'repeatThu', 'repeatFri', 'repeatSat'],
      { label: 'i18n_sched_days', errorField: 'error-recurrence', required: true, nodeKey: 'recurrence' },
      { getValue: function(){
          var rrule, dotw, days, date, hour, min, dayOffset;
          if(this.validate()){
            if(this.fields.scheduleRepeat.val() == 'weekly'){
              rrule     = "FREQ=WEEKLY;BYDAY=";
              dotw      = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
              days      = [];
              date      = new Date(ocScheduler.components.recurrenceStart.getValue());
              hour      = date.getUTCHours();
              min       = date.getUTCMinutes();
              dayOffset = 0;
              if(date.getDay() != date.getUTCDay()){
                dayOffset = date.getDay() < date.getUTCDay() ? 1 : -1;
              }
              if(this.fields.repeatSun[0].checked){
                days.push(dotw[(0 + dayOffset) % 7]);
              }
              if(this.fields.repeatMon[0].checked){
                days.push(dotw[(1 + dayOffset) % 7]);
              }
              if(this.fields.repeatTue[0].checked){
                days.push(dotw[(2 + dayOffset) % 7]);
              }
              if(this.fields.repeatWed[0].checked){
                days.push(dotw[(3 + dayOffset) % 7]);
              }
              if(this.fields.repeatThu[0].checked){
                days.push(dotw[(4 + dayOffset) % 7]);
              }
              if(this.fields.repeatFri[0].checked){
                days.push(dotw[(5 + dayOffset) % 7]);
              }
              if(this.fields.repeatSat[0].checked){
                days.push(dotw[(6 + dayOffset) % 7]);
              }
              this.value = rrule + days.toString() + ";BYHOUR=" + hour + ";BYMINUTE=" + min;
            }
          }
          return this.value;
        },
        setValue: function(value){
          //to do, handle day offset.
          if(typeof value == 'string'){
            value = { rrule: value };
          }
          if(value.rrule.indexOf('FREQ=WEEKLY') != -1){
            this.fields.scheduleRepeat.val('weekly');
            var days = value.rrule.split('BYDAY=');
            if(days[1].length > 0){
              days = days[1].split(',');
              this.fields.repeatSun[0].checked = this.fields.repeatMon[0].checked = this.fields.repeatTue[0].checked = this.fields.repeatWed[0].checked = this.fields.repeatThu[0].checked = this.fields.repeatFri[0].checked = this.fields.repeatSat[0].checked = false;
              for(d in days){
                switch(days[d]){
                  case 'SU':
                    this.fields.repeatSun[0].checked = true;
                    break;
                  case 'MO':
                    this.fields.repeatMon[0].checked = true;
                    break;
                  case 'TU':
                    this.fields.repeatTue[0].checked = true;
                    break;
                  case 'WE':
                    this.fields.repeatWed[0].checked = true;
                    break;
                  case 'TH':
                    this.fields.repeatThu[0].checked = true;
                    break;
                  case 'FR':
                    this.fields.repeatFri[0].checked = true;
                    break;
                  case 'SA':
                    this.fields.repeatSat[0].checked = true;
                    break;
                }
              }
            }
          }
        },
        validate: function(){
          if(this.fields.scheduleRepeat.val() != 'norepeat'){
            if(this.fields.repeatSun[0].checked ||
               this.fields.repeatMon[0].checked ||
               this.fields.repeatTue[0].checked ||
               this.fields.repeatWed[0].checked ||
               this.fields.repeatThu[0].checked ||
               this.fields.repeatFri[0].checked ||
               this.fields.repeatSat[0].checked ){
              if(ocScheduler.components.recurrenceStart.validate() &&
                 ocScheduler.components.recurrenceDuration.validate() &&
                 ocScheduler.components.recurrenceEnd.validate()){
                return true;
              }
            }
          }
          return false;
        },
        toNode: function(parent){
          for(var el in this.fields){
            var container = parent.ownerDocument.createElement(this.nodeKey);
            container.appendChild(parent.ownerDocument.createTextNode(this.getValue()));
          }
          if(parent && parent.nodeType){
            parent.appendChild(container);
          }
          return container;
        }
      });
                                                                        
  }else{ //Single Event
    
    ocScheduler.components.eventId = new ocAdmin.Component(['eventId'],
      { nodeKey: 'eventId' },
      { toNode: function(parent) {
          for(var el in this.fields){
            var container = parent.ownerDocument.createElement(this.nodeKey);
            container.appendChild(parent.ownerDocument.createTextNode(this.getValue()));
          }
          if(parent && parent.nodeType){
            parent.appendChild(container);
          }
          return container;
        }
      });
    ocScheduler.components.timeStart = new ocAdmin.Component(['startDate', 'startTimeHour', 'startTimeMin'],
      { label: 'startDateLabel', errorField: 'missingStartDate', required: true, nodeKey: 'timeStart' },
      { getValue: function(){
          var date = 0;
          date = this.fields.startDate.datepicker('getDate').getTime() / 1000; // Get date in milliseconds, convert to seconds.
          date += this.fields.startTimeHour.val() * 3600; // convert hour to seconds, add to date.
          date += this.fields.startTimeMin.val() * 60; //convert minutes to seconds, add to date.
          date -= Agent.tzDiff * 60; //Agent TZ offset
          date = date * 1000; //back to milliseconds
          return (new Date(date)).getTime();
        },
        setValue: function(value){
          var date, hour;
          date = parseInt(value);
          
          if(date != 'NaN') {
            date = new Date(date + (Agent.tzDiff * 60 * 1000));
          } else {
            ocUtils.log('Could not parse date.');
          }
          if(this.fields.startDate && this.fields.startTimeHour && this.fields.startTimeMin){
            hour = date.getHours();
            this.fields.startTimeHour.val(hour);
            this.fields.startTimeMin.val(date.getMinutes());
            this.fields.startDate.datepicker('setDate', date);//datepicker modifies the date object removing the time.
          }
        },
        validate: function(){
          var date, now, startdatetime;
          date = this.fields.startDate.datepicker('getDate');
          now = (new Date()).getTime();
          now += Agent.tzDiff  * 60 * 1000; //Offset by the difference between local and client.
          now = new Date(now);
          if(this.fields.startDate && date && this.fields.startTimeHour && this.fields.startTimeMin){
            startdatetime = new Date(date.getFullYear(), 
                                     date.getMonth(),
                                     date.getDate(),
                                     this.fields.startTimeHour.val(),
                                     this.fields.startTimeMin.val());
            if(startdatetime.getTime() >= now.getTime()){
              return true;
            }
            return false;
          }
        },
        asString: function(){
          return (new Date(this.getValue())).toLocaleString();
        }
      });

    ocScheduler.components.timeDuration = new ocAdmin.Component(['durationHour', 'durationMin'],
      { label: 'durationLabel', errorField: 'missingDuration', required: true, nodeKey: 'timeEnd' },
      { getValue: function(){
          if(this.validate()){
            duration = this.fields.durationHour.val() * 3600; // seconds per hour
            duration += this.fields.durationMin.val() * 60; // seconds per min
            this.value = ocScheduler.components.timeStart.getValue() + (duration * 1000);
          }
          return this.value;
        },
        setValue: function(value){
          var val, hour, min;
          if(typeof value === 'string'){
            value = { duration: value };
          }
          val = parseInt(value.duration);
          if(val == 'NaN') {
            ocUtils.log('Could not parse duration.');
          }
          if(this.fields.durationHour && this.fields.durationMin){
            val = val/1000; //milliseconds -> seconds
            hour  = Math.floor(val/3600);
            min   = Math.floor((val/60) % 60);
            this.fields.durationHour.val(hour);
            this.fields.durationMin.val(min);
          }
        },
        validate: function(){
          if(this.fields.durationHour && this.fields.durationMin && (this.fields.durationHour.val() !== '0' || this.fields.durationMin.val() !== '0')){
            return true;
          }
          return false;
        },
        asString: function(){
          var dur = this.getValue() / 1000;
          var hours = Math.floor(dur / 3600);
          var min   = Math.floor( ( dur /60 ) % 60 );
          return hours + ' hours, ' + min + ' minutes';
        }
      });

    ocScheduler.components.device = new ocAdmin.Component(['agent'],
      { label: 'agentLabel', errorField: 'missingAgent', required: true, nodeKey: 'device' },
      { getValue: function(){
          if(this.fields.agent){
            this.value = this.fields.agent.val();
          }
          return this.value;
        },
        setValue: function(value){
          var opts, agentId, found;
          if(typeof value === 'string'){
            value = { agent: value };
          }
          opts = this.fields.agent.children();
          agentId = value.agent;
          if(opts.length > 0){
            found = false;
            for(var i = 0; i < opts.length; i++){
              if(opts[i].value == agentId){
                found = true;
                opts[i].selected = true;
                break;
              }
            }
            if(!found){ //Couldn't find the previsouly selected agent, add to list and notifiy user.
              this.fields.agent.append($('<option selected="selected">' + agentId + '</option>').val(agentId));
              $('#agent').change();
            }
            this.fields.agent.val(agentId);
          }
        },
        validate: function(){
          if(this.getValue()) {
            return true;
          }
          return false;
        }
      });
  }
}