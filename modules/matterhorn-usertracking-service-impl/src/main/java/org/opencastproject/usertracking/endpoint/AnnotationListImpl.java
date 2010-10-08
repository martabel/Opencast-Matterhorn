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
package org.opencastproject.usertracking.endpoint;

import java.util.ArrayList;
import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;

import org.opencastproject.usertracking.api.Annotation;
import org.opencastproject.usertracking.api.AnnotationList;

/**
 * A {@link List} of {@link AnnotationList}s
 */
@XmlType(name = "annotations", namespace = "http://usertracking.opencastproject.org/")
@XmlRootElement(name = "annotations", namespace = "http://usertracking.opencastproject.org/")
@XmlAccessorType(XmlAccessType.FIELD)
public class AnnotationListImpl implements AnnotationList {

  @XmlAttribute(name = "total")
  protected int total;

  @XmlAttribute(name = "offset")
  protected int offset;

  @XmlAttribute(name = "limit")
  protected int limit;

  @XmlElement(name = "annotation", namespace = "http://usertracking.opencastproject.org/")
  protected List<AnnotationImpl> annotations;

  public void add(Annotation annotation) {
    annotations.add((AnnotationImpl)annotation);
  }

  /**
   * A no-arg constructor needed by JAXB
   */
  public AnnotationListImpl() {
    this.annotations = new ArrayList<AnnotationImpl>();
  }

  public void setTotal(int total) {
    this.total = total;
  }

  public void setLimit(int limit) {
    this.limit = limit;
  }

  public void setOffset(int offset) {
    this.offset = offset;
  }
}
