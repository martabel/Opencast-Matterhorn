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
package org.opencastproject.capture.pipeline.bins;

public class UnableToCreateElementException extends Exception {
  private static final long serialVersionUID = -5253223965630359510L;
  private String message = "";

  public UnableToCreateElementException(String friendlyName, String elementName) {
    message = friendlyName + " could not create " + elementName;
  }

  @Override
  public String getMessage() {
    return message;
  }
}
