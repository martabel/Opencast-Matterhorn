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
package org.opencastproject.distribution.streaming.endpoint;

import org.opencastproject.distribution.api.DistributionService;
import org.opencastproject.job.api.Job;
import org.opencastproject.job.api.JobParser;
import org.opencastproject.mediapackage.AbstractMediaPackageElement;
import org.opencastproject.mediapackage.MediaPackageElement;
import org.opencastproject.rest.RestPublisher;
import org.opencastproject.util.DocUtil;
import org.opencastproject.util.doc.DocRestData;
import org.opencastproject.util.doc.Format;
import org.opencastproject.util.doc.Param;
import org.opencastproject.util.doc.RestEndpoint;
import org.opencastproject.util.doc.RestTestForm;

import org.osgi.service.component.ComponentContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

/**
 * Rest endpoint for distributing media to the local streaming distribution channel.
 */
@Path("/")
public class StreamingDistributionRestService {

  /** The logger */
  private static final Logger logger = LoggerFactory.getLogger(StreamingDistributionRestService.class);
  
  /** The distribution service */
  protected DistributionService service;
  
  public void activate(ComponentContext cc) {
    String serviceUrl = (String) cc.getProperties().get(RestPublisher.SERVICE_PATH_PROPERTY);
    docs = generateDocs(serviceUrl);
  }

  /**
   * @param service the service to set
   */
  public void setService(DistributionService service) {
    this.service = service;
  }
  
  @POST
  @Path("/")
  @Produces(MediaType.TEXT_XML)
  public Response distribute(@FormParam("mediapackageId") String mediaPackageId, @FormParam("element") String elementXml)
          throws Exception {
    Job job = null;

    try {
      MediaPackageElement element = AbstractMediaPackageElement.getFromXml(elementXml);
      job = service.distribute(mediaPackageId, element, false);
    } catch (Exception e) {
      logger.warn("Error distributing element", e);
      return Response.serverError().status(Status.INTERNAL_SERVER_ERROR).build();
    }
    return Response.ok(JobParser.serializeToString(job)).build();
  }

  @POST
  @Path("/retract")
  @Produces(MediaType.TEXT_XML)
  public Response retract(@FormParam("mediapackageId") String mediaPackageId) throws Exception {
    Job job = null;
    try {
      job = service.retract(mediaPackageId, false);
    } catch (Exception e) {
      logger.warn("Unable to retract mediapackage '{}' from streaming channel: {}", new Object[] { mediaPackageId, e });
      return Response.serverError().status(Status.INTERNAL_SERVER_ERROR).build();
    }
    return Response.ok(JobParser.serializeToString(job)).build();
  }

  @GET
  @Produces(MediaType.TEXT_HTML)
  @Path("docs")
  public String getDocumentation() {
    return docs;
  }

  protected String docs;
  private String[] notes = {
          "All paths above are relative to the REST endpoint base (something like http://your.server/files)",
          "If the service is down or not working it will return a status 503, this means the the underlying service "
                  + "is not working and is either restarting or has failed. A status code 500 means a general failure has "
                  + "occurred which is not recoverable and was not anticipated. In other words, there is a bug!" };

  private String generateDocs(String serviceUrl) {
    DocRestData data = new DocRestData("streamingdistributionservice", "Streaming Distribution Service", serviceUrl, notes);

    // abstract
    data.setAbstract("This service distributes media packages to the streaming server.");

    // distribute
    RestEndpoint endpoint = new RestEndpoint("distribute", RestEndpoint.Method.POST, "/",
            "Distribute a media package to the streaming server");
    endpoint.addFormat(new Format("XML", null, null));
    endpoint.addRequiredParam(new Param("mediapackageId", Param.Type.TEXT, null,
            "The media package identifier"));
    endpoint.addRequiredParam(new Param("elementId", Param.Type.STRING, null, "A media package element"));
    endpoint.addStatus(org.opencastproject.util.doc.Status.OK(null));
    endpoint.addStatus(org.opencastproject.util.doc.Status.ERROR(null));
    endpoint.setTestForm(RestTestForm.auto());
    data.addEndpoint(RestEndpoint.Type.WRITE, endpoint);

    // retract
    RestEndpoint retractEndpoint = new RestEndpoint("retract", RestEndpoint.Method.POST, "/retract",
            "Retract a media package from the streaming server");
    retractEndpoint.addRequiredParam(new Param("mediapackageId", Param.Type.STRING, null, "The media package ID"));
    retractEndpoint.addStatus(org.opencastproject.util.doc.Status.OK(null));
    retractEndpoint.addStatus(org.opencastproject.util.doc.Status.ERROR(null));
    retractEndpoint.setTestForm(RestTestForm.auto());
    data.addEndpoint(RestEndpoint.Type.WRITE, retractEndpoint);

    return DocUtil.generate(data);
  }

}