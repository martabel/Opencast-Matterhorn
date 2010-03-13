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
package org.opencastproject.scheduler.endpoint;

import java.util.Hashtable;

import javax.xml.bind.annotation.adapters.XmlAdapter;

/**
 * Adapter class for JaxB to represent a Hashtable for the Metadata
 *
 */
public class HashtableAdapter extends XmlAdapter<MetadataEntry[], Hashtable<String, String>> {
  public HashtableAdapter () {
  }

  /**
   * {@inheritDoc}
   * @see javax.xml.bind.annotation.adapters.XmlAdapter#marshal(java.lang.Object)
   */
  @Override
  public MetadataEntry[] marshal(Hashtable<String, String> myHashtable) throws Exception {
    String [] keys = myHashtable.keySet().toArray(new String[0]);
    MetadataEntry [] meta = new MetadataEntry [keys.length];
    for (int i = 0; i < keys.length; i++) meta[i] = new MetadataEntry(keys[i], myHashtable.get(keys[i])); 
    return meta;
  }



  /**
   * {@inheritDoc}
   * @see javax.xml.bind.annotation.adapters.XmlAdapter#unmarshal(java.lang.Object)
   */
  @Override
  public Hashtable<String, String> unmarshal(MetadataEntry[] data) throws Exception {
    Hashtable<String, String> myHashtable = new Hashtable<String, String>();
    for (int i=0; i < data.length; i++) {
      myHashtable.put(data[i].getKey(), data[i].getValue());
    }
    return myHashtable;
  }
}
