/**
 *  Copyright 2009, 2010 The Regents of the University of California
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
package org.opencastproject.workflow.handler;

import org.opencastproject.mediapackage.MediaPackage;
import org.opencastproject.workflow.api.AbstractResumableWorkflowOperationHandler;
import org.opencastproject.workflow.api.WorkflowBuilder;
import org.opencastproject.workflow.api.WorkflowInstance;
import org.opencastproject.workflow.api.WorkflowOperationException;
import org.opencastproject.workflow.api.WorkflowOperationResult;
import org.opencastproject.workflow.api.WorkflowOperationResult.Action;

import org.osgi.service.component.ComponentContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Simple implementation that holds for user-entered trim points.
 */
public class TrimWorkflowOperationHandler extends AbstractResumableWorkflowOperationHandler {

  private static final Logger logger = LoggerFactory.getLogger(TrimWorkflowOperationHandler.class);

  /** The configuration options for this handler */
  private static final SortedMap<String, String> CONFIG_OPTIONS;

  /** Path to the hold ui resources */
  private static final String HOLD_UI_PATH = "/ui/operation/trim/index.html";

  /** Name of the configuration option that provides the tags we are looking for */
  private static final String PREVIEW_TAG_NAME = "source-tag";

  static {
    CONFIG_OPTIONS = new TreeMap<String, String>();
    CONFIG_OPTIONS.put(PREVIEW_TAG_NAME, "The tag identifying the preview media");
    CONFIG_OPTIONS.put(REQUIRED_PROPERTY, "The configuration key that must be set to true for this operation to run.");
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.workflow.api.WorkflowOperationHandler#getConfigurationOptions()
   */
  @Override
  public SortedMap<String, String> getConfigurationOptions() {
    return CONFIG_OPTIONS;
  }

  public void activate(ComponentContext cc) {
    super.activate(cc);
    setHoldActionTitle("Trim");
    registerHoldStateUserInterface(HOLD_UI_PATH);
    logger.info("Registering trim hold state ui from classpath {}", HOLD_UI_PATH);
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.workflow.api.WorkflowOperationHandler#start(org.opencastproject.workflow.api.WorkflowInstance)
   */
  @Override
  public WorkflowOperationResult start(WorkflowInstance workflowInstance) throws WorkflowOperationException {
    if (!"true".equalsIgnoreCase(workflowInstance.getCurrentOperation().getConfiguration(REQUIRED_PROPERTY)))
      return WorkflowBuilder.getInstance().buildWorkflowOperationResult(Action.CONTINUE);

    logger.info("Holding for trim...");

    // What are we looking for?
    String tag = workflowInstance.getCurrentOperation().getConfiguration(PREVIEW_TAG_NAME);

    // Let's see if there is preview media available
    MediaPackage mp = workflowInstance.getMediaPackage();
    if (mp.getTracksByTag(tag).length == 0) {
      logger.warn("No media with tag '{}' found to preview", tag);
    }

    return WorkflowBuilder.getInstance().buildWorkflowOperationResult(Action.PAUSE);
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.workflow.api.ResumableWorkflowOperationHandler#resume(org.opencastproject.workflow.api.WorkflowInstance,
   *      java.util.Map)
   */
  @Override
  public WorkflowOperationResult resume(WorkflowInstance workflowInstance, Map<String, String> properties)
          throws WorkflowOperationException {
    logger.info("resuming workflow {} with trim properties {}", workflowInstance, properties);
    return super.resume(workflowInstance, properties);
  }
}