package org.opencastproject.workingfilerepository.impl;

import org.opencastproject.util.UrlSupport;

import junit.framework.Assert;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.File;
import java.io.InputStream;
import java.net.URI;
import java.util.Arrays;

import javax.ws.rs.core.Response;

public class WorkingFileRepositoryRestEndpointTest {
  
  WorkingFileRepositoryRestEndpoint endpoint = null;
  
  @Before
  public void setup() throws Exception {
    endpoint = new WorkingFileRepositoryRestEndpoint();
    endpoint.rootDirectory = "target/endpointroot";
    FileUtils.forceMkdir(new File(endpoint.rootDirectory));
    endpoint.serverUrl = UrlSupport.DEFAULT_BASE_URL;
    endpoint.serviceUrl = new URI("http://localhost/files");
  }
  
  @After
  public void tearDown() throws Exception {
    FileUtils.forceDelete(new File(endpoint.rootDirectory));
  }

  @Test
  public void testExtractImageContentType() throws Exception {
    String mediaPackageId = "mp";
    String image = "element1";

    endpoint.put(mediaPackageId, image, "opencast_header.gif", getClass().getResourceAsStream("/opencast_header.gif"));

    // execute gets, and ensure that the content types are correct
    Response response = endpoint.restGet(mediaPackageId, image, null);

    Assert.assertEquals("Gif content type", "image/gif", response.getMetadata().getFirst("Content-Type"));
        
    // Make sure the image byte stream was not modified by the content type detection
    InputStream in = getClass().getResourceAsStream("/opencast_header.gif");
    byte[] bytesFromClasspath = IOUtils.toByteArray(in);
    byte[] bytesFromRepo = IOUtils.toByteArray((InputStream)response.getEntity());
    Assert.assertTrue(Arrays.equals(bytesFromClasspath, bytesFromRepo));
  }

  @Test
  public void testExtractXmlContentType() throws Exception {
    String mediaPackageId = "mp";
    String dc = "element1";
    endpoint.put(mediaPackageId, dc, "dublincore.xml", getClass().getResourceAsStream("/dublincore.xml"));

    // execute gets, and ensure that the content types are correct
    Response response = endpoint.restGet(mediaPackageId, dc, null);

    Assert.assertEquals("Gif content type", "application/xml", response.getMetadata().getFirst("Content-Type"));

    // Make sure the image byte stream was not modified by the content type detection
    InputStream imageIn = getClass().getResourceAsStream("/dublincore.xml");
    byte[] imageBytesFromClasspath = IOUtils.toByteArray(imageIn);
    byte[] imageBytesFromRepo = IOUtils.toByteArray((InputStream)response.getEntity());
    Assert.assertTrue(Arrays.equals(imageBytesFromClasspath, imageBytesFromRepo));
  }
  
  public void testEtag() throws Exception {
    String mediaPackageId = "mp";
    String dc = "element1";

    endpoint.put(mediaPackageId, dc, "dublincore.xml", getClass().getResourceAsStream("/dublincore.xml"));

    String md5 = DigestUtils.md5Hex(getClass().getResourceAsStream("/dublincore.xml"));
    Response response = endpoint.restGet(mediaPackageId, dc, md5);
    Assert.assertEquals(Response.Status.NOT_MODIFIED.getStatusCode(), response.getStatus());
    Assert.assertNull(response.getEntity());

    response = endpoint.restGet(mediaPackageId, dc, "foo");
    Assert.assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    Assert.assertNotNull(response.getEntity());
  }

}
