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
package org.opencastproject.conductor.impl;

import org.opencastproject.conductor.api.ConductorService;
import org.opencastproject.media.mediapackage.MediaPackage;
import org.opencastproject.media.mediapackage.MediaPackageBuilderFactory;
import org.opencastproject.workflow.api.WorkflowBuilder;
import org.opencastproject.workflow.api.WorkflowService;

import org.apache.commons.io.IOUtils;
import org.osgi.service.component.ComponentContext;
import org.osgi.service.event.Event;
import org.osgi.service.event.EventAdmin;
import org.osgi.service.event.EventHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.util.Dictionary;
import java.util.HashMap;
import java.util.Hashtable;

/**
 * This is the default implementation of the conductor service.
 */
public class ConductorServiceImpl implements ConductorService, EventHandler {
  private static final Logger logger = LoggerFactory.getLogger(ConductorServiceImpl.class);

  WorkflowService workflowService = null;

  public void setWorkflowService(WorkflowService workflowService) {
    this.workflowService = workflowService;
  }
  
  private EventAdmin eventAdmin;
  
  protected void setEventAdmin(EventAdmin eventAdmin){
    this.eventAdmin = eventAdmin;
  }
  
  protected void unsetEventAdmin(EventAdmin eventAdmin){
    this.eventAdmin = null;
  }

  public void activate(ComponentContext componentContext) {
    logger.info("init() loading default workflow definitions");
    try {
      InputStream review = ConductorServiceImpl.class.getClassLoader().getResourceAsStream("/workflows/review.xml");
      workflowService.registerWorkflowDefinition(WorkflowBuilder.getInstance().parseWorkflowDefinition(review));

      InputStream distOnly = ConductorServiceImpl.class.getClassLoader().getResourceAsStream(
              "/workflows/distribute-only.xml");
      workflowService.registerWorkflowDefinition(WorkflowBuilder.getInstance().parseWorkflowDefinition(distOnly));

      InputStream composeAndDist = ConductorServiceImpl.class.getClassLoader().getResourceAsStream(
              "/workflows/compose-and-distribute.xml");
      workflowService.registerWorkflowDefinition(WorkflowBuilder.getInstance().parseWorkflowDefinition(composeAndDist));

      InputStream errorHandler = ConductorServiceImpl.class.getClassLoader().getResourceAsStream(
              "/workflows/default-error-handler.xml");
      workflowService.registerWorkflowDefinition(WorkflowBuilder.getInstance().parseWorkflowDefinition(errorHandler));
      
      InputStream composeDistPublish = ConductorServiceImpl.class.getClassLoader().getResourceAsStream("workflows/compose-distribute-publish.xml");
      workflowService.registerWorkflowDefinition(WorkflowBuilder.getInstance().parseWorkflowDefinition(composeDistPublish));
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  /**
   * {@inheritDoc} If Event contains 'mediaPackage' property with serialized Mediapackage, new MediaPackage is build and
   * then Review workflow is started. After successful start of workflow ACK message is sent back anouncing that
   * processing completed successfully. If there is an error during MediaPackage building or starting Review workflow,
   * ACK message will contain exception property with linked exception.
   * 
   * @see org.osgi.service.event.EventHandler#handleEvent(org.osgi.service.event.Event)
   */
  public void handleEvent(Event event) {
    logger.info("Received event");

    Object property = event.getProperty("mediaPackage");
    if (property == null || !(property instanceof String)) {
      // received event, but without or invalid media package
      logger.error("Property 'mediaPackage' not present or is invalid");
    } else {
      try {
        MediaPackage mp = MediaPackageBuilderFactory.newInstance().newMediaPackageBuilder().loadFromManifest(
                IOUtils.toInputStream((String) property));
        // MediaPackage mp = (MediaPackage) property;
        logger.info("Received media package " + mp.getIdentifier().getLocalName());
        // execute 'review' workflow
        workflowService.start(workflowService.getWorkflowDefinitionByName("Review"), mp, new HashMap<String, String>());

        if (eventAdmin != null) {
          eventAdmin.postEvent(new Event("org/opencastproject/conductor/ACK", null));
        } else {
          logger.warn("EventAdmin not available: ACK message was not sent");
        }
      } catch (Exception e) {
        // invalid media package manifest or problem with workflow service
        logger.error("Exception occured: " + e.getMessage());
        Dictionary<String, Throwable> exception = new Hashtable<String, Throwable>();
        exception.put("exception", e);
        if (eventAdmin != null) {
          eventAdmin.postEvent(new Event("org/opencastproject/conductor/ACK", exception));
        } else {
          logger.warn("EventAdmin not available: ACK message was not sent");
        }
      }
    }
  }

  // /**
  // * {@inheritDoc}
  // *
  // * @see org.opencastproject.conductor.api.ConductorService#getWorkflowDefinitions()
  // */
  // public WorkflowDefinitionList getWorkflowDefinitions() {
  // WorkflowDefinitionListImpl list = new WorkflowDefinitionListImpl();
  // for(WorkflowDefinition def : defs.values()) {
  // if(allOperationsAvailable(def)) {
  // list.getWorkflowDefinition().add(def);
  // } else {
  // logger.warn("Workflow definition " + def.getTitle() + " is unavailable due to missing operations");
  // }
  // }
  // return list;
  // }
  //
  // protected boolean allOperationsAvailable(WorkflowDefinition def) {
  // List<String> availableOperationNames = getOperationNames();
  // for(WorkflowOperationDefinition op : def.getOperations().getOperation()) {
  // if( ! availableOperationNames.contains(op.getName())) {
  // return false;
  // }
  // }
  // return true;
  // }
  //  
  // protected List<String> getOperationNames() {
  // List<String> list = new ArrayList<String>();
  // try {
  // for(ServiceReference ref :
  // componentContext.getBundleContext().getServiceReferences(WorkflowOperationHandler.class.getName(), null)) {
  // WorkflowOperationHandler handler = (WorkflowOperationHandler) componentContext.getBundleContext().getService(ref);
  // list.addAll(Arrays.asList(handler.getOperationsToHandle()));
  // }
  // } catch (InvalidSyntaxException e) {
  // logger.warn(e.getMessage());
  // }
  // return list;
  // }
  //  
  // /**
  // * {@inheritDoc}
  // *
  // * @see org.opencastproject.conductor.api.ConductorService#getWorkflowDefinitionByTitle(java.lang.String)
  // */
  // public WorkflowDefinition getWorkflowDefinitionByTitle(String name) {
  // WorkflowDefinition def = defs.get(name);
  // if(def == null) {
  // logger.warn("Workflow definition " + name + " is not installed");
  // return null;
  // }
  // if(allOperationsAvailable(def)) {
  // return def;
  // } else {
  // logger.warn("Workflow definition " + name + " is unavailable due to missing operations");
  // return null;
  // }
  // }
  //
  // /**
  // * {@inheritDoc}
  // * @see
  // org.opencastproject.conductor.api.ConductorService#addWorkflowDefinition(org.opencastproject.workflow.api.WorkflowDefinition)
  // */
  // public void addWorkflowDefinition(WorkflowDefinition def) {
  // defs.put(def.getTitle(), def);
  // }
  //
  // /**
  // * {@inheritDoc}
  // * @see org.opencastproject.conductor.api.ConductorService#removeWorkflowDefinition(java.lang.String)
  // */
  // public WorkflowDefinition removeWorkflowDefinition(String title) {
  // for(Iterator<Entry<String, WorkflowDefinition>> iter = defs.entrySet().iterator(); iter.hasNext();) {
  // Entry<String, WorkflowDefinition> entry = iter.next();
  // WorkflowDefinition def = entry.getValue();
  // if(title.equals(def.getTitle())) {
  // iter.remove();
  // return def;
  // }
  // }
  // return null;
  // }

}
