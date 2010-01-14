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
package org.opencastproject.capture.impl;

import org.opencastproject.capture.admin.api.AgentState;
import org.opencastproject.capture.admin.api.RecordingState;
import org.opencastproject.capture.api.CaptureAgent;
import org.opencastproject.capture.api.StateService;
import org.opencastproject.capture.pipeline.PipelineFactory;
import org.opencastproject.media.mediapackage.DublinCoreCatalog;
import org.opencastproject.media.mediapackage.MediaPackage;
import org.opencastproject.media.mediapackage.MediaPackageBuilderFactory;
import org.opencastproject.media.mediapackage.MediaPackageElement;
import org.opencastproject.media.mediapackage.MediaPackageElementBuilder;
import org.opencastproject.media.mediapackage.MediaPackageElementBuilderFactory;
import org.opencastproject.media.mediapackage.MediaPackageElementFlavor;
import org.opencastproject.media.mediapackage.MediaPackageElements;
import org.opencastproject.media.mediapackage.MediaPackageException;
import org.opencastproject.media.mediapackage.UnsupportedElementException;
import org.opencastproject.media.mediapackage.MediaPackageElement.Type;
import org.opencastproject.util.ZipUtil;

import org.apache.commons.io.FileUtils;
import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.FileEntity;
import org.apache.http.impl.client.DefaultHttpClient;
import org.gstreamer.Bus;
import org.gstreamer.GstObject;
import org.gstreamer.Pipeline;
import org.gstreamer.State;
import org.osgi.service.cm.ConfigurationException;
import org.osgi.service.cm.ManagedService;
import org.osgi.service.command.CommandProcessor;
import org.osgi.service.component.ComponentContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Document;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.util.Dictionary;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Properties;
import java.util.Vector;

import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

/**
 * Implementation of the Capture Agent: using gstreamer, generates several Pipelines
 * to store several tracks from a certain recording.
 */
public class CaptureAgentImpl implements CaptureAgent, ManagedService {
  private static final Logger logger = LoggerFactory.getLogger(CaptureAgentImpl.class);
  
  // TODO: move outside
  //private static final long default_capture_length = 1 * 60 * 60 * 1000; //1 Hour

  /** The agent's pipeline **/
  private Pipeline pipe = null;

  /** Keeps the recordings which have not been succesfully ingested yet **/
  HashMap<String, RecordingImpl> pendingRecordings = new HashMap<String,RecordingImpl>();

  /** The agent's current state.  Used for logging */
  private String agentState = null;
  /** A pointer to the current capture directory.  Note that this should be null except for when we are actually capturing */
  //private File currentCaptureDir = null;
  /** The properties object for the current capture.  NOTE THAT THIS WILL BE NULL IF THE AGENT IS NOT CURRENTLY CAPTURING. */
  //private Properties currentCaptureProps = null;

  /** A pointer to the state service.  This is where all of the recording state information should be kept. */
  private StateService stateService = null;
  
  /** Indicates the ID of the recording currently being recorded **/
  private String currentRecID = null;
  
  /** Capturing files only? */
  private boolean mockCapture = false;

  private static final String samplesDir = System.getProperty("java.io.tmpdir") + File.separator + "opencast" + File.separator + "samples";
  
  public CaptureAgentImpl() {
    logger.info("Starting CaptureAgentImpl.");
    setAgentState(AgentState.IDLE);
  }

  /**
   * Gets the state service this capture agent is pushing its state to
   * @return The service this agent pushes its state to.
   */
  public StateService getStateService() {
    return stateService;
  }

  /**
   * Sets the state service this capture agent should push its state to.
   * @param service The service to push the state information to
   */
  public void setStateService(StateService service) {
    stateService = service;
    setAgentState(agentState);
  }

  /**
   * Unsets the state service which this capture agent should push its state to.
   */
  public void unsetStateService() {
    stateService = null;
  }


  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.recorder.api.CaptureAgent#startCapture()
   */
  @Override
  public String startCapture() {

    logger.info("Starting capture using default values for MediaPackage and properties.");

    // Creates default MediaPackage
    MediaPackage pack;
    try {
      pack = MediaPackageBuilderFactory.newInstance().newMediaPackageBuilder().createNew();
    } catch (org.opencastproject.util.ConfigurationException e) {
      logger.error("Wrong configuration for the default media package: {}.", e.getMessage());
      return null;
    } catch (MediaPackageException e) {
      logger.error("Media Package exception: {}.", e.getMessage());
      return null;
    }

    return startCapture(pack, ConfigurationManager.getInstance().getAllProperties());
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.recorder.api.CaptureAgent#startCapture(org.opencastproject.media.mediapackage.MediaPackage)
   */
  @Override
  public String startCapture(MediaPackage mediaPackage) {

    logger.info("Starting capture using default values for the capture properties and a passed in media package.");

    return startCapture(mediaPackage, ConfigurationManager.getInstance().getAllProperties());

  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.recorder.api.CaptureAgent#startCapture(java.util.HashMap)
   */
  @Override
  public String startCapture(Properties properties) {
    logger.info("Starting capture using a passed in properties and default media package.");

    // Creates default MediaPackage
    MediaPackage pack;
    try {
      pack = MediaPackageBuilderFactory.newInstance().newMediaPackageBuilder().createNew();
    } catch (org.opencastproject.util.ConfigurationException e) {
      logger.error("Wrong configuration for the default media package: {}.", e.getMessage());
      return null;
    } catch (MediaPackageException e) {
      logger.error("Media Package exception: {}.", e.getMessage());
      return null;
    }

    return startCapture(pack, properties);
  }

  /**
   * {@inheritDoc}
   * 
   * @see 
   *      org.opencastproject.recorder.api.CaptureAgent#startCapture(org.opencastproject.media.mediapackage.MediaPackage,
   *      HashMap properties)
   */
  @Override
  public String startCapture(MediaPackage mediaPackage, Properties properties) {

    if (currentRecID != null || !agentState.equals(AgentState.IDLE)) {
      logger.warn("Unable to start capture, a different capture is still in progress in {}.",
              pendingRecordings.get(currentRecID).getDir().getAbsolutePath());
      return null;
    } else {
      setAgentState(AgentState.CAPTURING);
    }
    
    // Creates a new recording object, checking if it was correctly initialized
    RecordingImpl newRec = new RecordingImpl(mediaPackage, properties);
    if (newRec.getRecordingID() == null) {
      logger.error("Couldn't create a valid recording ID");
      setAgentState(AgentState.IDLE);
      //TODO:  Heh, now what?  We can't set a capture error if the id doesn't exist...
      //setRecordingState(recordingID, RecordingState.CAPTURE_ERROR);
      return null;
    }

    // Checks there is no duplicate ID
    String recordingID = newRec.getRecordingID();

    if (pendingRecordings.containsKey(recordingID)) {
      logger.error("There is already a recording with ID {}", recordingID);
      setAgentState(AgentState.IDLE);
      //TODO:  Do we set the recording to an error state here?
      //setRecordingState(recordingID, RecordingState.CAPTURE_ERROR);
      return null;
    } else {
      pendingRecordings.put(recordingID, newRec);
      currentRecID = recordingID;
    }

    // Is this a "mock" capture?
    mockCapture = false;
    if (properties != null && properties.get(CaptureParameters.CAPTURE_DEVICE_NAMES) != null) {
      String[] deviceList = ((String)properties.get(CaptureParameters.CAPTURE_DEVICE_NAMES)).split(",");
      boolean everythingOk = true;
      File f = new File(samplesDir);
      for (String device : deviceList) {
        String key = CaptureParameters.CAPTURE_DEVICE_PREFIX + device + CaptureParameters.CAPTURE_DEVICE_SOURCE;
        String value = (String)properties.get(key);
        if (value == null || !(new File(f, value).isFile()))
          everythingOk = false;
      }
      if (everythingOk) {
        logger.info("Preparing for mock capture.");
        mockCapture = true;

        for (String device : deviceList) {
          String key = "capture.device." + device + ".src";
          String value = (String)properties.get(key);
          File src = new File(f, value);
          String destFileNameKey = CaptureParameters.CAPTURE_DEVICE_PREFIX  + device + CaptureParameters.CAPTURE_DEVICE_DEST;
          String destFileName = (String)properties.get(destFileNameKey);
          File dest = new File(newRec.getDir(), destFileName);
          logger.debug("Copying mock file {} to {}", src, dest);
          try {
            FileUtils.copyFile(src, dest);
          } catch (FileNotFoundException e) {
            throw new RuntimeException("Error copying " + src + " to recording directory " + newRec.getDir());
          } catch (IOException e) {
            throw new RuntimeException("Error copying " + src + " to recording directory " + newRec.getDir());
          }
        }

        // Add the sample dublin core, otherwise the recording won't show up in search
        File dcCatalog = new File(f, "dublincore.xml");
        try {
          MediaPackageElementBuilder eb = MediaPackageElementBuilderFactory.newInstance().newElementBuilder();
          mediaPackage.add(eb.elementFromURI(dcCatalog.toURI(), Type.Catalog, DublinCoreCatalog.FLAVOR));
        } catch (UnsupportedElementException e) {
          throw new RuntimeException("Error adding " + dcCatalog + " to recording");
        }

        return recordingID;
      }
    }

    pipe = PipelineFactory.create(newRec.getProperties());

    if (pipe == null) {
      logger.error("Capture {} could not start, pipeline was null!", recordingID);
      setAgentState(AgentState.IDLE);
      setRecordingState(recordingID, RecordingState.CAPTURE_ERROR);
      return recordingID;
    }

    logger.info("Initializing devices for capture.");

    Bus bus = pipe.getBus();
    bus.connect(new Bus.EOS() {
      /**
       * {@inheritDoc}
       * @see org.gstreamer.Bus.EOS#endOfStream(org.gstreamer.GstObject)
       */
      public void endOfStream(GstObject arg0) {
        logger.debug("Pipeline received EOS.");
      }
    });
    bus.connect(new Bus.ERROR() {
      /**
       * {@inheritDoc}
       * @see org.gstreamer.Bus.ERROR#errorMessage(org.gstreamer.GstObject, int, java.lang.String)
       */
      public void errorMessage(GstObject arg0, int arg1, String arg2) {
        logger.error(arg0.getName() + ": " + arg2);
        stopCapture();
      }
    });

    pipe.play();

    while (pipe.getState() != State.PLAYING);
    logger.info("{} started.", pipe.getName());

    setRecordingState(recordingID, RecordingState.CAPTURING);
    //setAgentState(AgentState.CAPTURING);
    return recordingID;
  }

  /**
   * {@inheritDoc}
   * @see org.opencastproject.capture.api.CaptureAgent#stopCapture()
   */
  @Override
  public boolean stopCapture() {
    if (pipe == null && !mockCapture) {
      logger.warn("Pipeline is null, unable to stop capture.");
      setAgentState(AgentState.IDLE);
      return false;
    }

    if (currentRecID == null) { 
      logger.warn("There is no currentRecID assigned, but the Pipeline is not null!!!");
      pipe.stop();
      pipe = null;
      setAgentState(AgentState.IDLE);
      return false;
    }

    RecordingImpl theRec = pendingRecordings.get(currentRecID);
    File stopFlag = new File(theRec.getDir(), "capture.stopped");

    //Take the properties out of the class level variable so that we can start capturing again immediately without worrying about overwriting them.
    //Properties cur = currentCaptureProps;
    //currentCaptureProps = null;
    currentRecID = null;

    //Update the states of everything.
    setRecordingState(theRec.getRecordingID(), RecordingState.CAPTURE_FINISHED);
    setAgentState(AgentState.IDLE);
    
    // No need to stop a pipeline if it's a mock capture
    if (mockCapture)
      return true;

    try {
      // Sending End Of Stream event to the Pipeline so its components stop appropriately
      //pipe.sendEvent(new EOSEvent());
      //while (pipe.getState() != State.NULL);
      //pipe.setState(State.NULL);
      pipe.stop();

      // Gst.deinit();

      stopFlag.createNewFile();
    } catch (IOException e) {
      setRecordingState(theRec.getRecordingID(), RecordingState.CAPTURE_ERROR);
      logger.error("IOException: Could not create \"capture.stopped\" file: {}.", e.getMessage());
      return false; 
    }
    /*
    try {
      IngestJob.scheduleJob(cur, state_service);
    } catch (IOException e) {
      logger.error("IOException while attempting to schedule ingest for recording {}.", recordingID);
      setRecordingState(recordingID, RecordingState.UPLOAD_ERROR);
      return false;
    } catch (SchedulerException e) {
      logger.error("SchedulerException while attempting to schedule ingest for recording {}: {}.", recordingID, e);
      setRecordingState(recordingID, RecordingState.UPLOAD_ERROR);
      return false;
    }
     */
    return true;
  }

  /**
   * {@inheritDoc}
   * @see org.opencastproject.capture.api.CaptureAgent#stopCapture()
   */
  @Override
  public boolean stopCapture(String recordingID) {
    if (currentRecID != null) {
      if (recordingID.equals(currentRecID)) {
        return stopCapture();
      }
    }
    return false;
  }


  /**
   * Generates the manifest.xml file from the files specified in the properties
   * @return A status boolean 
   */
  public boolean createManifest(String recID) {

    RecordingImpl recording = pendingRecordings.get(recID);    
    if (recording == null) {
      logger.error("[createManifest] Recording {} not found!", recID);
      return false;
    } else
      logger.debug("Generating manifest for recording {}", recID);

    String[] friendlyNames = recording.getProperty(CaptureParameters.CAPTURE_DEVICE_NAMES).split(",");
    
    // Includes the tracks in the MediaPackage
    try {
      MediaPackageElementBuilder elemBuilder = MediaPackageElementBuilderFactory.newInstance().newElementBuilder();
      MediaPackageElementFlavor flavor = null; 

      // Adds the files present in the Properties
      for (String name : friendlyNames) {
        name = name.trim();

        if (name == "")
          continue;

        // TODO: This should be modified to allow a more flexible way of detecting the track flavour.
        // Suggestions: a dedicated class or a/several field(s) in the properties indicating what type of track is each
        if (name.equals("PRESENTER") || name.equals("AUDIO"))
          flavor = MediaPackageElements.PRESENTER_TRACK;
        else if (name.equals("SCREEN"))
          flavor = MediaPackageElements.PRESENTATION_TRACK;
        
        String outputProperty = CaptureParameters.CAPTURE_DEVICE_PREFIX  + name + CaptureParameters.CAPTURE_DEVICE_DEST;
        File outputFile = new File(recording.getDir(), recording.getProperty(outputProperty));

        // Adds the file to the MediaPackage
        if (outputFile.exists())
          recording.getMediaPackage().add(elemBuilder.elementFromURI(outputFile.toURI(),
                  MediaPackageElement.Type.Track,
                  flavor));
        else 
          logger.warn ("Required file {} not found", outputFile.getName());
      } 

      // TODO: Attach files outside this class, before calling startCapture()
      // Adds the rest of the files (in case some attachment was left there by the scheduler)
      /* File[] files = captureDir.listFiles();
      for (File item : files)
        // Discards the "capture.stopped" file and the files in the properties --they have already been processed
        // Also checks the file exists
        if (item.exists() && (!props.contains(item.getName().trim())) && (!item.getName().equals("capture.stopped")))
          pkg.add(new URI(item.getName()));*/
    } catch (UnsupportedElementException e) {
      logger.error("Unsupported Element Exception: {}.", e.getMessage());
      return false;
    }
        
    // Serialize the metadata file and the MediaPackage
    try {
      // Gets the manifest.xml as a Document object
      Document doc = recording.getMediaPackage().toXml();

      // Defines a transformer to convert the object in a xml file
      Transformer transformer = TransformerFactory.newInstance().newTransformer();
      transformer.setOutputProperty(OutputKeys.INDENT, "yes");

      // Initializes StreamResult with File object to save to file
      File manifestFile = new File(recording.getDir(), recording.getManifestName());
      StreamResult stResult = new StreamResult(new FileOutputStream(manifestFile));
      DOMSource source = new DOMSource(doc);
      transformer.transform(source, stResult);

      // Closes the stream to make sure all the content is written to the file
      stResult.getOutputStream().close();
      
      // TODO: Move this out to another method, together with the code block commented above this method
      /*// Serializes the metadata catalog
      stResult = new StreamResult(new FileOutputStream(new File(recording.getDir(), recording.getAgentCatalogName())));
      source = new DOMSource(metaFile);
      transformer.transform(source, stResult);

      // Closes the stream to make sure all the content is written to the file
      stResult.getOutputStream().close();*/
      
      // Stores the File reference to the MediaPackage in the corresponding recording
      recording.setManifest(manifestFile);

    } catch (MediaPackageException e) {
      logger.error("MediaPackage Exception: {}.", e.getMessage());
      return false;
    } catch (TransformerException e) {
      logger.error("Transformer Exception: {}.", e.getMessage());
      return false;
    } catch (IOException e) {
      logger.error("I/O Exception: {}.", e.getMessage());
      return false;
    }

    return true;
  }

  /**
   * Compresses the files contained in the output directory
   * @param ZIP_NAME - The name of the zip file created
   * @return A File reference to the file zip created
   */
  public File zipFiles(String recID) {

    RecordingImpl recording = pendingRecordings.get(recID);

    if (recording == null) {
      logger.error("[createManifest] Recording {} not found!", recID);
      return null;
    }

    Iterable<MediaPackageElement> mpElements = recording.getMediaPackage().elements();
    Vector<File> filesToZip = new Vector<File>();
    
    // Adds the manifest first
    filesToZip.add(recording.getManifest());
    
    for (MediaPackageElement item : mpElements) {
      File tmpFile = new File(item.getURI().normalize());
      // TODO: Is this really a warning or should we fail completely and return an error?
      if (!tmpFile.exists())
        logger.warn("Required file {} doesn't exist!", tmpFile.getName());
      filesToZip.add(tmpFile);
    }
    
    logger.info("Zipping {} files:", filesToZip.size());
    for (File f : filesToZip)
      logger.info("--> {}", f.getName());
    
    return ZipUtil.zip(filesToZip.toArray(new File[filesToZip.size()]), recording.getDir().getAbsolutePath() + File.separator + recording.getZipName());
  }

  
  /**
   * Sends a file to the REST ingestion service
   * @param url : The service URL
   * @param fileDesc : The descriptor for the media package
   */
  public int ingest(String recID) {
    
    RecordingImpl recording = pendingRecordings.get(recID);
    
    if (recording == null) {
      logger.error("[createManifest] Recording {} not found!", recID);
      return -1;
    }

    URL url = null;
    try {
      logger.info("Ingest URL is " + recording.getProperty(CaptureParameters.INGEST_ENDPOINT_URL));
      url = new URL(recording.getProperty(CaptureParameters.INGEST_ENDPOINT_URL));
    } catch (NullPointerException e) {
      logger.warn("Nullpointer while parsing ingest target URL.");
      return -2;
    } catch (MalformedURLException e) {
      logger.warn("Malformed URL for ingest target.");
      return -3;
    }

    if (url == null) {
      logger.warn("Unable to ingest media because the ingest target URL is null.");
      return -1;
    }
    
    HttpClient client = new DefaultHttpClient();
    HttpPost postMethod = new HttpPost(url.toString());
    int retValue = -1;

    File fileDesc = new File(recording.getDir(), "media.zip");

    try {
      // Sets the file as the body of the request
      FileEntity myFileEntity = new FileEntity(fileDesc, URLConnection.getFileNameMap().getContentTypeFor(fileDesc.getName()));

      logger.warn("Sending the file " + fileDesc.getAbsolutePath() + " with a size of "+ fileDesc.length());

      setRecordingState(recID, RecordingState.UPLOADING);

      postMethod.setEntity(myFileEntity);

      // Send the file
      HttpResponse response = client.execute(postMethod);

      retValue = response.getStatusLine().getStatusCode();

      setRecordingState(recID, RecordingState.UPLOAD_FINISHED);
    } catch (ClientProtocolException e) {
      logger.error("Failed to submit the data: {}.", e.getMessage());
      setRecordingState(recID, RecordingState.UPLOAD_ERROR);
    } catch (IOException e) {
      logger.error("I/O Exception: {}.", e.getMessage());
      setRecordingState(recID, RecordingState.UPLOAD_ERROR);
    } finally {
      client.getConnectionManager().shutdown();
      //setAgentState(AgentState.IDLE);
    }

    return retValue;
  } 

  /**
   * Sets the machine's current encoding status
   * 
   * @param state The state for the agent.  Defined in AgentState.
   * @see org.opencastproject.capture.api.AgentState
   */
  private void setAgentState(String state) {
    agentState = state;
    if (stateService != null) {
      stateService.setAgentState(agentState);
    } else {
      logger.warn("State service for capture agent is null, unable to push updates to remote server!  This is only a problem if you see this message repeating.");
    }
  }

  /**
   * {@inheritDoc}
   * @see org.opencastproject.capture.api.CaptureAgent#getAgentState()
   */
  public String getAgentState() {
    return agentState;
  }

  /**
   * Convenience method which wraps calls to the state_service to make sure it's not going to null pointer on me.
   * @param recordingID The ID of the recording to update
   * @param state The state to update the recording to
   */
  // TODO: Move this to the Recording class
  private void setRecordingState(String recordingID, String state) {
    if (stateService != null) {
      stateService.setRecordingState(recordingID, state);
    } else {
      logger.warn("State service for capture agent is null, unable to push updates to remote server!  This is only a problem if you see this message repeating.");
    }
  }

  /**
   * @param recID
   * @return A Recording with ID recID, or null if it doesn't exists
   */
  public RecordingImpl getRecording(String recID) {
    return pendingRecordings.get(recID);
  }

  public void updated(Dictionary props) throws ConfigurationException {
    // Update any configuration properties here
  }

  /**
   * Callback from the OSGi container once this service is started. This is where we register our shell commands.
   * 
   * @param ctx
   *          the component context
   */
  public void activate(ComponentContext ctx) {
    Dictionary<String, Object> commands = new Hashtable<String, Object>();
    commands.put(CommandProcessor.COMMAND_SCOPE, "capture");
    commands.put(CommandProcessor.COMMAND_FUNCTION, new String[] { "status", "start", "stop", "ingest", "reset", "capture" });
    logger.info("Registering capture agent osgi shell commands");
    ctx.getBundleContext().registerService(CaptureAgentShellCommands.class.getName(), new CaptureAgentShellCommands(this), commands);
    copyMediaToFiles();
  }

  /**
   * Copy sample media included in the bundle to java.io.tmpdir/opencast/samples.
   */
  protected void copyMediaToFiles() {
    File tmpDir = new File(samplesDir);
    try {
      tmpDir.mkdirs();
      logger.info("Preparing sample media");
      FileUtils.copyURLToFile(getClass().getClassLoader().getResource("samples/audio.mp3"), new File(tmpDir, "audio.mp3"));
      FileUtils.copyURLToFile(getClass().getClassLoader().getResource("samples/screen.mpg"), new File(tmpDir, "screen.mpg"));
      FileUtils.copyURLToFile(getClass().getClassLoader().getResource("samples/camera.mpg"), new File(tmpDir, "camera.mpg"));
      FileUtils.copyURLToFile(getClass().getClassLoader().getResource("samples/dublincore.xml"), new File(tmpDir, "dublincore.xml"));
    } catch (IOException e) {
      throw new RuntimeException("Unable to copy media to " + tmpDir, e);
    }
  }

}
