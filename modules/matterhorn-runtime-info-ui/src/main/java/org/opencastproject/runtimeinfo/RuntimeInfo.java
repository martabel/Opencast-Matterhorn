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
package org.opencastproject.runtimeinfo;

import org.opencastproject.security.api.SecurityService;
import org.opencastproject.util.DocUtil;
import org.opencastproject.util.doc.DocRestData;
import org.opencastproject.util.doc.Format;
import org.opencastproject.util.doc.RestEndpoint;
import org.opencastproject.util.doc.RestTestForm;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.osgi.framework.BundleContext;
import org.osgi.framework.Constants;
import org.osgi.framework.InvalidSyntaxException;
import org.osgi.framework.ServiceReference;
import org.osgi.service.component.ComponentContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.Servlet;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

/**
 * This REST endpoint provides information about the runtime environment, including the services and user interfaces
 * deployed and the current login context.
 */
@Path("/")
public class RuntimeInfo {
  private static final long serialVersionUID = 1L;
  private static final Logger logger = LoggerFactory.getLogger(RuntimeInfo.class);
  private static final String RS_CONTEXT = "opencast.rest.url";
  private static final String RS_CONTEXT_FILTER = "(" + RS_CONTEXT + "=*)";

  private SecurityService securityService;
  private BundleContext bundleContext;
  private String serverUrl;
  private String engageBaseUrl;
  private String adminBaseUrl;
  private boolean testMode;
  private String docs;
  
  protected void setSecurityService(SecurityService securityService) {
    this.securityService = securityService;
  }

  protected ServiceReference[] getRestServiceReferences() throws InvalidSyntaxException {
    return bundleContext.getAllServiceReferences(null, RS_CONTEXT_FILTER);
  }

  protected ServiceReference[] getUserInterfaceServiceReferences() throws InvalidSyntaxException {
    return bundleContext.getAllServiceReferences(Servlet.class.getName(), "(&(alias=*)(classpath=*))");
  }

  public void activate(ComponentContext cc) {
    logger.debug("start()");
    this.bundleContext = cc.getBundleContext();
    this.adminBaseUrl = bundleContext.getProperty("org.opencastproject.admin.ui.url");
    if (adminBaseUrl == null)
      adminBaseUrl = serverUrl;
    this.engageBaseUrl = bundleContext.getProperty("org.opencastproject.engage.ui.url");
    if (engageBaseUrl == null)
      engageBaseUrl = serverUrl;
    this.serverUrl = bundleContext.getProperty("org.opencastproject.server.url");
    this.testMode = "true".equalsIgnoreCase(bundleContext.getProperty("testMode"));
  }

  public void deactivate() {
  }

  protected String generateDocs() {
    DocRestData data = new DocRestData("RuntimeInfo", "Runtime Information", "/info/rest", null);

    // abstract
    data.setAbstract("This service provides information about the runtime environment, including the servives that are" +
      "deployed and the current user context.");

    // services
    RestEndpoint servicesEndpoint = new RestEndpoint("services", RestEndpoint.Method.GET, "/components.json", "List " +
      "the REST services and user interfaces running on this host");
    servicesEndpoint.addFormat(new Format("JSON", null, null));
    servicesEndpoint.addStatus(org.opencastproject.util.doc.Status.OK("The components running on this host"));
    servicesEndpoint.setTestForm(RestTestForm.auto());
    data.addEndpoint(RestEndpoint.Type.READ, servicesEndpoint);

    // me
    RestEndpoint meEndpoint = new RestEndpoint("me", RestEndpoint.Method.GET, "/me.json", "Information about the curent user");
    meEndpoint.addFormat(new Format("JSON", null, null));
    meEndpoint.addStatus(org.opencastproject.util.doc.Status.OK("Returns information about the current user"));
    meEndpoint.setTestForm(RestTestForm.auto());
    data.addEndpoint(RestEndpoint.Type.READ, meEndpoint);

    logger.debug("generated documentation for {}", data);
    
    return DocUtil.generate(data);
  }

  @GET
  @Produces(MediaType.TEXT_HTML)
  @Path("docs")
  public String getDocumentation() {
    if (docs == null) { docs = generateDocs(); }
    return docs;
  }
  
  @GET
  @Produces(MediaType.APPLICATION_JSON)
  @Path("components.json")
  @SuppressWarnings("unchecked")
  public String getRuntimeInfo() {
    JSONObject json = new JSONObject();
    json.put("engage", engageBaseUrl);
    json.put("admin", adminBaseUrl);
    json.put("rest", getRestAsJson());
    json.put("ui", getUserInterfacesAsJson());
    return json.toJSONString();
  }

  @GET
  @Path("me.json")
  @Produces(MediaType.APPLICATION_JSON)
  @SuppressWarnings("unchecked")
  public String getMyInfo() {
    String username = securityService.getUserName();
    JSONArray roles = new JSONArray();
    for (String role : securityService.getRoles()) {
      roles.add(role);
    }
    JSONObject json = new JSONObject();
    json.put("username", username);
    json.put("roles", roles);
    return json.toJSONString();
  }

  @SuppressWarnings("unchecked")
  protected JSONArray getRestAsJson() {
    JSONArray json = new JSONArray();
    ServiceReference[] serviceRefs = null;
    try {
      serviceRefs = getRestServiceReferences();
    } catch (InvalidSyntaxException e) {
      e.printStackTrace();
    }
    if (serviceRefs == null)
      return json;
    for (ServiceReference jaxRsRef : serviceRefs) {
      String description = (String) jaxRsRef.getProperty(Constants.SERVICE_DESCRIPTION);
      String servletContextPath = (String) jaxRsRef.getProperty(RS_CONTEXT);
      JSONObject endpoint = new JSONObject();
      endpoint.put("description", description);
      endpoint.put("docs", serverUrl + servletContextPath + "/docs");
      endpoint.put("wadl", serverUrl + servletContextPath + "/?_wadl&type=xml");
      json.add(endpoint);
    }
    return json;
  }

  @SuppressWarnings("unchecked")
  protected JSONArray getUserInterfacesAsJson() {
    JSONArray json = new JSONArray();
    ServiceReference[] serviceRefs = null;
    try {
      serviceRefs = getUserInterfaceServiceReferences();
    } catch (InvalidSyntaxException e) {
      e.printStackTrace();
    }
    if (serviceRefs == null)
      return json;
    for (ServiceReference ref : serviceRefs) {
      String description = (String) ref.getProperty(Constants.SERVICE_DESCRIPTION);
      String alias = (String) ref.getProperty("alias");
      String welcomeFile = (String) ref.getProperty("welcome.file");
      String welcomePath = "/".equals(alias) ? alias + welcomeFile : alias + "/" + welcomeFile;
      String testSuite = (String) ref.getProperty("test.suite");
      JSONObject endpoint = new JSONObject();
      endpoint.put("description", description);
      endpoint.put("welcomepage", serverUrl + welcomePath);
      if (testSuite != null && testMode) {
        String testSuitePath = "/".equals(alias) ? alias + testSuite : alias + "/" + testSuite;
        endpoint.put("testsuite", serverUrl + testSuitePath);
      }
      json.add(endpoint);
    }
    return json;
  }
}