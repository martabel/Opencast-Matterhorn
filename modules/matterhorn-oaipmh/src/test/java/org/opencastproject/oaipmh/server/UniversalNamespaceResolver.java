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

package org.opencastproject.oaipmh.server;

import org.w3c.dom.Document;

import javax.xml.XMLConstants;
import javax.xml.namespace.NamespaceContext;
import java.util.Iterator;

/**
 * Copied from the test harness module.
 */
public class UniversalNamespaceResolver implements NamespaceContext {
  private Document sourceDocument;

  /**
   * 
   * Store the source document.
   * 
   * @param document
   *          source document
   */
  public UniversalNamespaceResolver(Document document) {
    sourceDocument = document;
  }

  /**
   * 
   * {@inheritDoc}
   * 
   * @see javax.xml.namespace.NamespaceContext#getNamespaceURI(String)
   */
  public String getNamespaceURI(String prefix) {
    if (prefix.equals(XMLConstants.DEFAULT_NS_PREFIX)) {
      return sourceDocument.lookupNamespaceURI(null);
    } else {
      return sourceDocument.lookupNamespaceURI(prefix);
    }
  }

  /**
   * 
   * {@inheritDoc}
   * 
   * @see javax.xml.namespace.NamespaceContext#getPrefix(String)
   */
  public String getPrefix(String namespaceURI) {
    return sourceDocument.lookupPrefix(namespaceURI);
  }

  /**
   * 
   * {@inheritDoc}
   * 
   * @see javax.xml.namespace.NamespaceContext#getPrefixes(String)
   */
  @SuppressWarnings("unchecked")
  public Iterator getPrefixes(String namespaceURI) {
    return null;
  }

}