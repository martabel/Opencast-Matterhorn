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
package org.opencastproject.remotetest.util;

import org.opencastproject.remotetest.Main;
import org.opencastproject.remotetest.security.TrustedHttpClient;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;
import org.w3c.dom.Document;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import javax.xml.namespace.QName;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.TransformerException;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;

/**
 * Test utilities
 *
 */
public class Utils {


  public static Document parseXml(InputStream in) throws Exception {
      DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
      factory.setNamespaceAware(true);
      DocumentBuilder builder = factory.newDocumentBuilder();
      return builder.parse(in);
   }
  
  public static Object xPath(Document document, String path, QName returnType)
    throws XPathExpressionException, TransformerException {
    XPath xPath = XPathFactory.newInstance().newXPath();
    xPath.setNamespaceContext(new UniversalNamespaceResolver(document));
    return xPath.compile(path).evaluate(document, returnType);
  }
  
  public static Boolean xPathExists(Document document, String path) throws Exception {
    return (Boolean) xPath(document, path, XPathConstants.BOOLEAN);
  }
  
  public static JSONObject parseJson(String doc) throws Exception {
    return (JSONObject) JSONValue.parse(doc);
  }
  
  public static String schedulerEvent(Integer duration, String title, String id) throws Exception {
	Long start = System.currentTimeMillis() + 60000;
	Long end = start + duration;
	String event = IOUtils.toString(Utils.class.getResourceAsStream("/scheduler-event.xml"), "UTF-8");
	return event
		.replace("@@id@@", id)
		.replace("@@title@@", title)
		.replace("@@start@@", start.toString())
		.replace("@@end@@", end.toString())
		.replace("@@duration@@", duration.toString());
  }

  public static File getUrlAsFile(String url) throws IOException {
    HttpGet get = new HttpGet(url);
    HttpResponse response = null;
    FileOutputStream out = null;
    try {
      response = Main.getClient().execute(get);
      File f = File.createTempFile("testfile", ".tmp");
      out = new FileOutputStream(f);
      IOUtils.copy(response.getEntity().getContent(), out);
      return f;
    } finally {
      Main.getClient().close(response);
    }
  }
  
  public static Document getUrlAsDocument(String url) throws Exception {
    TrustedHttpClient client = Main.getClient();
    HttpGet get = new HttpGet(url);
    HttpResponse response = null;
    try {
      response = client.execute(get);
      return parseXml(response.getEntity().getContent());
    } finally {
      client.close(response);
    }
  }
  
  public static final String md5(File f) throws IOException {
    byte[] bytes = new byte[1024];
    InputStream is = null;
    try {
      MessageDigest md = MessageDigest.getInstance("MD5");
      is = new DigestInputStream(new FileInputStream(f), md);
      while ((is.read(bytes)) >= 0) {}
      return hex(md.digest());
    } catch(NoSuchAlgorithmException e) {
      throw new IOException("No MD5 algorithm available");
    } finally {
      is.close();
    }
  }
  
  /**
   * Converts the checksum to a hex string.
   * 
   * @param data
   *          the digest
   * @return the digest hex representation
   */
  private static String hex(byte[] data) {
    StringBuffer buf = new StringBuffer();
    for (int i = 0; i < data.length; i++) {
      int halfbyte = (data[i] >>> 4) & 0x0F;
      int two_halfs = 0;
      do {
        if ((0 <= halfbyte) && (halfbyte <= 9))
          buf.append((char) ('0' + halfbyte));
        else
          buf.append((char) ('a' + (halfbyte - 10)));
        halfbyte = data[i] & 0x0F;
      } while (two_halfs++ < 1);
    }
    return buf.toString();
  }

  
}
