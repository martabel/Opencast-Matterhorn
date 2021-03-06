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
package org.opencastproject.composer.gstreamer;

import org.opencastproject.composer.api.ComposerService;
import org.opencastproject.composer.api.EmbedderException;
import org.opencastproject.composer.api.EncoderEngine;
import org.opencastproject.composer.api.EncoderException;
import org.opencastproject.composer.api.EncodingProfile;
import org.opencastproject.inspection.api.MediaInspectionException;
import org.opencastproject.inspection.api.MediaInspectionService;
import org.opencastproject.job.api.AbstractJobProducer;
import org.opencastproject.job.api.Job;
import org.opencastproject.job.api.JobBarrier;
import org.opencastproject.mediapackage.Attachment;
import org.opencastproject.mediapackage.Catalog;
import org.opencastproject.mediapackage.MediaPackageElement;
import org.opencastproject.mediapackage.MediaPackageElementBuilder;
import org.opencastproject.mediapackage.MediaPackageElementBuilderFactory;
import org.opencastproject.mediapackage.MediaPackageElementParser;
import org.opencastproject.mediapackage.MediaPackageException;
import org.opencastproject.mediapackage.Track;
import org.opencastproject.mediapackage.identifier.IdBuilder;
import org.opencastproject.mediapackage.identifier.IdBuilderFactory;
import org.opencastproject.security.api.OrganizationDirectoryService;
import org.opencastproject.security.api.SecurityService;
import org.opencastproject.security.api.UserDirectoryService;
import org.opencastproject.serviceregistry.api.ServiceRegistry;
import org.opencastproject.serviceregistry.api.ServiceRegistryException;
import org.opencastproject.util.NotFoundException;
import org.opencastproject.workspace.api.Workspace;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.NotImplementedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Dictionary;
import java.util.LinkedList;
import java.util.List;

/**
 * GStreamer based implementation of the composer service api.
 */
public class GStreamerComposerService extends AbstractJobProducer implements ComposerService {

  /** The logging instance */
  private static final Logger logger = LoggerFactory.getLogger(GStreamerComposerService.class);

  /** The collection name */
  public static final String COLLECTION = "composer-gs";

  /** List of available operations on jobs */
  private enum Operation {
    Caption, Encode, Image, ImageConversion, Mux, Trim
  };

  /** Encoding profile manager */
  private GSEncodingProfileScanner profileScanner = null;

  /** Reference to the media inspection service */
  private MediaInspectionService inspectionService = null;

  /** Reference to the workspace service */
  private Workspace workspace = null;

  /** Reference to the receipt service */
  private ServiceRegistry serviceRegistry;

  /** The organization directory service */
  protected OrganizationDirectoryService organizationDirectoryService = null;

  /** Reference to the encoder engine factory */
  private GStreamerFactory encoderEngineFactory;

  /** Id builder used to create ids for encoded tracks */
  private final IdBuilder idBuilder = IdBuilderFactory.newInstance().newIdBuilder();

  /** The security service */
  protected SecurityService securityService = null;

  /** The user directory service */
  protected UserDirectoryService userDirectoryService = null;

  /**
   * Creates a new instance of the composer service.
   */
  public GStreamerComposerService() {
    super(JOB_TYPE);
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.job.api.AbstractJobProducer#process(org.opencastproject.job.api.Job)
   */
  protected String process(Job job) throws Exception {
    Operation op = null;
    String operation = job.getOperation();
    List<String> arguments = job.getArguments();
    try {
      op = Operation.valueOf(operation);
      Track firstTrack = null;
      Track secondTrack = null;
      String encodingProfile = null;

      String serialized;

      switch (op) {
        case Caption:
          firstTrack = (Track) MediaPackageElementParser.getFromXml(arguments.get(0));
          Catalog[] catalogs = new Catalog[arguments.size() - 1];
          for (int i = 1; i < arguments.size(); i++) {
            catalogs[i] = (Catalog) MediaPackageElementParser.getFromXml(arguments.get(i));
          }
          MediaPackageElement resultingElement = captions(job, firstTrack, catalogs);
          serialized = MediaPackageElementParser.getAsXml(resultingElement);
          break;
        case Encode:
          firstTrack = (Track) MediaPackageElementParser.getFromXml(arguments.get(0));
          encodingProfile = arguments.get(1);
          resultingElement = encode(job, firstTrack, null, encodingProfile, null);
          serialized = MediaPackageElementParser.getAsXml(resultingElement);
          break;
        case Image:
          firstTrack = (Track) MediaPackageElementParser.getFromXml(arguments.get(0));
          encodingProfile = arguments.get(1);
          long[] times = new long[arguments.size() - 2];
          for (int i = 2; i < arguments.size(); i++) {
            times[i - 2] = Long.parseLong(arguments.get(i));
          }
          List<Attachment> resultingElements = image(job, firstTrack, encodingProfile, times);
          serialized = MediaPackageElementParser.getArrayAsXml(resultingElements);
          break;
        case ImageConversion:
          Attachment sourceImage = (Attachment) MediaPackageElementParser.getFromXml(arguments.get(0));
          encodingProfile = arguments.get(1);
          resultingElement = convertImage(job, sourceImage, encodingProfile);
          serialized = MediaPackageElementParser.getAsXml(resultingElement);
          break;
        case Mux:
          firstTrack = (Track) MediaPackageElementParser.getFromXml(arguments.get(0));
          secondTrack = (Track) MediaPackageElementParser.getFromXml(arguments.get(1));
          encodingProfile = arguments.get(2);
          resultingElement = mux(job, firstTrack, secondTrack, encodingProfile);
          serialized = MediaPackageElementParser.getAsXml(resultingElement);
          break;
        case Trim:
          firstTrack = (Track) MediaPackageElementParser.getFromXml(arguments.get(0));
          encodingProfile = arguments.get(1);
          long start = Long.parseLong(arguments.get(2));
          long duration = Long.parseLong(arguments.get(3));
          resultingElement = trim(job, firstTrack, encodingProfile, start, duration);
          serialized = MediaPackageElementParser.getAsXml(resultingElement);
          break;
        default:
          throw new IllegalStateException("Don't know how to handle operation '" + operation + "'");
      }

      return serialized;
    } catch (IllegalArgumentException e) {
      throw new ServiceRegistryException("This service can't handle operations of type '" + op + "'", e);
    } catch (IndexOutOfBoundsException e) {
      throw new ServiceRegistryException("This argument list for operation '" + op + "' does not meet expectations", e);
    } catch (Exception e) {
      throw new ServiceRegistryException("Error handling operation '" + op + "'", e);
    }
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.composer.api.ComposerService#encode(org.opencastproject.mediapackage.Track,
   *      java.lang.String)
   */
  @Override
  public Job encode(Track sourceTrack, String profileId) throws EncoderException, MediaPackageException {
    try {
      return serviceRegistry.createJob(JOB_TYPE, Operation.Encode.toString(),
              Arrays.asList(MediaPackageElementParser.getAsXml(sourceTrack), profileId));
    } catch (ServiceRegistryException e) {
      throw new EncoderException("Unable to create a job", e);
    }
  }

  /**
   * Encodes audio and video track to a file. If both an audio and a video track are given, they are muxed together into
   * one movie container.
   * 
   * @param videoTrack
   *          the video track
   * @param audioTrack
   *          the audio track
   * @param profileId
   *          the encoding profile
   * @param properties
   *          encoding properties
   * @param block
   *          <code>true</code> to only return once encoding is finished
   * @return the receipt
   * @throws EncoderException
   *           if encoding fails
   */
  protected Track encode(Job job, Track videoTrack, Track audioTrack, String profileId,
          Dictionary<String, String> properties) throws EncoderException, MediaPackageException {

    try {
      String targetTrackId = idBuilder.createNew().toString();

      // Get the tracks and make sure they exist
      final File audioFile;
      if (audioTrack == null) {
        audioFile = null;
      } else {
        audioFile = getTrack(audioTrack);
      }

      final File videoFile;
      if (videoTrack == null) {
        videoFile = null;
      } else {
        videoFile = getTrack(videoTrack);
      }

      // Create the engine
      final EncodingProfile profile = profileScanner.getProfile(profileId);
      if (profile == null) {
        throw new EncoderException(null, "Profile '" + profileId + " is unkown");
      }
      final EncoderEngine encoderEngine = encoderEngineFactory.newEncoderEngine(profile);
      if (encoderEngine == null) {
        throw new EncoderException(null, "No encoder engine available for profile '" + profileId + "'");
      }

      if (audioTrack != null && videoTrack != null)
        logger.info("Muxing audio track {} and video track {} into {}", new String[] { audioTrack.getIdentifier(),
                videoTrack.getIdentifier(), targetTrackId });
      else if (audioTrack == null)
        logger.info("Encoding video track {} to {} using profile '{}'", new String[] { videoTrack.getIdentifier(),
                targetTrackId, profileId });
      else if (videoTrack == null)
        logger.info("Encoding audio track {} to {} using profile '{}'", new String[] { audioTrack.getIdentifier(),
                targetTrackId, profileId });

      // Do the work
      File encodingOutput = encoderEngine.mux(audioFile, videoFile, profile, null);

      // Put the file in the workspace
      URI returnURL = null;
      InputStream in = null;
      try {
        in = new FileInputStream(encodingOutput);
        returnURL = workspace.putInCollection(COLLECTION,
                job.getId() + "." + FilenameUtils.getExtension(encodingOutput.getAbsolutePath()), in);
        logger.info("Copied the encoded file to the workspace at {}", returnURL);
      } catch (Exception e) {
        throw new EncoderException("Unable to put the encoded file into the workspace", e);
      } finally {
        IOUtils.closeQuietly(in);
      }
      if (encodingOutput != null) {
        String encodingOutputPath = encodingOutput.getAbsolutePath();
        if (encodingOutput.delete()) {
          logger.info("Deleted local copy of encoded file at {}", encodingOutputPath);
        } else {
          logger.warn("Could not delete local copy of encoded file at {}", encodingOutputPath);
        }
      }

      // Have the encoded track inspected and return the result
      Job inspectionJob = null;
      try {
        inspectionJob = inspectionService.inspect(returnURL);
        JobBarrier barrier = new JobBarrier(serviceRegistry, inspectionJob);
        if (!barrier.waitForJobs().isSuccess()) {
          throw new EncoderException("Media inspection of " + returnURL + " failed");
        }
      } catch (MediaInspectionException e) {
        throw new EncoderException("Media inspection of " + returnURL + " failed", e);
      }

      Track inspectedTrack = (Track) MediaPackageElementParser.getFromXml(inspectionJob.getPayload());
      inspectedTrack.setIdentifier(targetTrackId);

      return inspectedTrack;
    } catch (Exception e) {
      logger.warn("Error encoding " + videoTrack + " and " + audioTrack, e);
      if (e instanceof EncoderException) {
        throw (EncoderException) e;
      } else {
        throw new EncoderException(e);
      }
    }
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.composer.api.ComposerService#mux(org.opencastproject.mediapackage.Track,
   *      org.opencastproject.mediapackage.Track, java.lang.String)
   */
  @Override
  public Job mux(Track videoTrack, Track audioTrack, String profileId) throws EncoderException, MediaPackageException {
    try {
      return serviceRegistry.createJob(
              JOB_TYPE,
              Operation.Mux.toString(),
              Arrays.asList(MediaPackageElementParser.getAsXml(videoTrack),
                      MediaPackageElementParser.getAsXml(audioTrack), profileId));
    } catch (ServiceRegistryException e) {
      throw new EncoderException("Unable to create a job", e);
    }
  }

  /**
   * Muxes the audio and video track into one movie container.
   * 
   * @param job
   *          the associated job
   * @param videoTrack
   *          the video track
   * @param audioTrack
   *          the audio track
   * @param profileId
   *          the profile identifier
   * @return the muxed track
   * @throws EncoderException
   *           if encoding fails
   * @throws MediaPackageException
   *           if serializing the mediapackage elements fails
   */
  protected Track mux(Job job, Track videoTrack, Track audioTrack, String profileId) throws EncoderException,
          MediaPackageException {
    return encode(job, videoTrack, audioTrack, profileId, null);
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.composer.api.ComposerService#trim(org.opencastproject.mediapackage.Track,
   *      java.lang.String, long, long)
   */
  @Override
  public Job trim(final Track sourceTrack, final String profileId, final long start, final long duration)
          throws EncoderException, MediaPackageException {
    try {
      return serviceRegistry.createJob(
              JOB_TYPE,
              Operation.Trim.toString(),
              Arrays.asList(MediaPackageElementParser.getAsXml(sourceTrack), profileId, Long.toString(start),
                      Long.toString(duration)));
    } catch (ServiceRegistryException e) {
      throw new EncoderException("Unable to create a job", e);
    }
  }

  /**
   * Trims the given track using the encoding profile <code>profileId</code> and the given starting point and duration
   * in miliseconds.
   * 
   * @param job
   *          the associated job
   * @param sourceTrack
   *          the source track
   * @param profileId
   *          the encoding profile identifier
   * @param start
   *          the trimming in-point
   * @param duration
   *          the trimming duration
   * @return the trimmed track
   * @throws EncoderException
   *           if trimming fails
   */
  protected Track trim(Job job, Track sourceTrack, String profileId, long start, long duration) throws EncoderException {
    try {
      String targetTrackId = idBuilder.createNew().toString();

      // Get the track and make sure it exists
      final File trackFile = getTrack(sourceTrack);

      // Get the encoding profile
      final EncodingProfile profile = profileScanner.getProfile(profileId);
      if (profile == null) {
        throw new EncoderException("Profile '" + profileId + " is unkown");
      }

      // Create the engine
      final EncoderEngine encoderEngine = encoderEngineFactory.newEncoderEngine(profile);
      if (encoderEngine == null) {
        throw new EncoderException(encoderEngine, "No encoder engine available for profile '" + profileId + "'");
      }

      // Do the work
      File encodingOutput = encoderEngine.trim(trackFile, profile, start, duration, null);

      // Put the file in the workspace
      URI returnURL = null;
      InputStream in = null;
      try {
        in = new FileInputStream(encodingOutput);
        returnURL = workspace.putInCollection(COLLECTION,
                job.getId() + "." + FilenameUtils.getExtension(encodingOutput.getAbsolutePath()), in);
        logger.info("Copied the trimmed file to the workspace at {}", returnURL);
      } catch (FileNotFoundException e) {
        throw new EncoderException("Encoded file " + encodingOutput + " not found", e);
      } catch (IOException e) {
        throw new EncoderException("Error putting " + encodingOutput + " into the workspace", e);
      } finally {
        IOUtils.closeQuietly(in);
      }
      if (encodingOutput != null) {
        String encodingOutputPath = encodingOutput.getAbsolutePath();
        if (encodingOutput.delete()) {
          logger.info("Deleted local copy of the trimmed file at {}", encodingOutputPath);
        } else {
          logger.warn("Could not delete local copy of the trimmed file at {}", encodingOutputPath);
        }
      }
      // Have the encoded track inspected and return the result
      Job inspectionJob = null;
      try {
        inspectionJob = inspectionService.inspect(returnURL);
        JobBarrier barrier = new JobBarrier(serviceRegistry, inspectionJob);
        if (!barrier.waitForJobs().isSuccess()) {
          throw new EncoderException("Media inspection of " + returnURL + " failed");
        }
      } catch (MediaInspectionException e) {
        throw new EncoderException("Media inspection of " + returnURL + " failed", e);
      }

      Track inspectedTrack = (Track) MediaPackageElementParser.getFromXml(inspectionJob.getPayload());
      inspectedTrack.setIdentifier(targetTrackId);

      return inspectedTrack;
    } catch (Exception e) {
      logger.warn("Error trimming " + sourceTrack, e);
      if (e instanceof EncoderException) {
        throw (EncoderException) e;
      } else {
        throw new EncoderException(e);
      }
    }
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.composer.api.ComposerService#image(org.opencastproject.mediapackage.Track,
   *      java.lang.String, long)
   */
  public Job image(Track sourceTrack, String profileId, long... times) throws EncoderException, MediaPackageException {

    if (sourceTrack == null)
      throw new IllegalArgumentException("SourceTrack cannot be null");

    if (times.length == 0)
      throw new IllegalArgumentException("At least one time argument has to be specified");

    String[] parameters = new String[times.length + 2];
    parameters[0] = MediaPackageElementParser.getAsXml(sourceTrack);
    parameters[1] = profileId;
    for (int i = 0; i < times.length; i++) {
      parameters[i + 2] = Long.toString(times[i]);
    }

    try {
      return serviceRegistry.createJob(JOB_TYPE, Operation.Image.toString(), Arrays.asList(parameters));
    } catch (ServiceRegistryException e) {
      throw new EncoderException("Unable to create a job", e);
    }
  }

  /**
   * Extracts an image from <code>sourceTrack</code> at the given point in time.
   * 
   * @param job
   *          the associated job
   * @param sourceTrack
   *          the source track
   * @param profileId
   *          the identifer of the encoding profile to use
   * @param times
   *          (one or more) times in miliseconds
   * @return the image as an attachment element
   * @throws EncoderException
   *           if extracting the image fails
   */
  protected List<Attachment> image(Job job, Track sourceTrack, String profileId, long... times)
          throws EncoderException, MediaPackageException {

    if (sourceTrack == null)
      throw new EncoderException("SourceTrack cannot be null");

    try {
      logger.info("creating an image using video track {}", sourceTrack.getIdentifier());

      // Get the encoding profile
      final EncodingProfile profile = profileScanner.getProfile(profileId);
      if (profile == null) {
        throw new EncoderException("Profile '" + profileId + "' is unknown");
      }

      // Create the encoding engine
      final EncoderEngine encoderEngine = encoderEngineFactory.newEncoderEngine(profile);
      if (encoderEngine == null) {
        throw new EncoderException("No encoder engine available for profile '" + profileId + "'");
      }

      // make sure there is a video stream in the track
      if (sourceTrack != null && !sourceTrack.hasVideo()) {
        throw new EncoderException("Cannot extract an image without a video stream");
      }

      // The time should not be outside of the track's duration
      for (long time : times) {
        if (time < 0 || time > sourceTrack.getDuration()) {
          throw new EncoderException("Can not extract an image at time " + Long.valueOf(time)
                  + " from a track with duration " + Long.valueOf(sourceTrack.getDuration()));
        }
      }

      // Finally get the file that needs to be encoded
      File videoFile = getTrack(sourceTrack);

      // Do the work
      List<File> encodingOutput = encoderEngine.extract(videoFile, profile, null, times);

      // check for validity of output
      if (encodingOutput == null || encodingOutput.isEmpty()) {
        throw new EncoderException("Image extraction failed: no images were produced");
      }
      for (File output : encodingOutput) {
        if (output == null || !output.isFile()) {
          cleanup(encodingOutput);
          throw new EncoderException("Image extraction failed: encoding output doesn't exist at " + output);
        }
      }

      // Put the file in the workspace
      List<URI> workspaceURIs = new LinkedList<URI>();
      for (int i = 0; i < encodingOutput.size(); i++) {
        File output = encodingOutput.get(i);
        InputStream in = null;
        try {
          in = new FileInputStream(output);
          URI returnURL = workspace.putInCollection(COLLECTION,
                  job.getId() + "_" + i + "." + FilenameUtils.getExtension(output.getAbsolutePath()), in);
          logger.debug("Copied image file to the workspace at {}", returnURL);
          workspaceURIs.add(returnURL);
        } catch (Exception e) {
          cleanup(encodingOutput);
          cleanupWorkspace(workspaceURIs);
          throw new EncoderException("Unable to put image file into the workspace", e);
        } finally {
          IOUtils.closeQuietly(in);
        }
      }

      // cleanup
      cleanup(encodingOutput);

      MediaPackageElementBuilder builder = MediaPackageElementBuilderFactory.newInstance().newElementBuilder();
      List<Attachment> imageAttachments = new LinkedList<Attachment>();
      for (URI url : workspaceURIs) {
        Attachment attachment = (Attachment) builder.elementFromURI(url, Attachment.TYPE, null);
        imageAttachments.add(attachment);
      }

      return imageAttachments;
    } catch (Exception e) {
      logger.warn("Error extracting image from " + sourceTrack, e);
      if (e instanceof EncoderException) {
        throw (EncoderException) e;
      } else {
        throw new EncoderException(e);
      }
    }
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.composer.api.ComposerService#convertImage(org.opencastproject.mediapackage.Attachment,
   *      java.lang.String)
   */
  @Override
  public Job convertImage(Attachment image, String profileId) throws EncoderException, MediaPackageException {
    if (image == null)
      throw new IllegalArgumentException("Source image cannot be null");

    String[] parameters = new String[2];
    parameters[0] = MediaPackageElementParser.getAsXml(image);
    parameters[1] = profileId;

    try {
      return serviceRegistry.createJob(JOB_TYPE, Operation.ImageConversion.toString(), Arrays.asList(parameters));
    } catch (ServiceRegistryException e) {
      throw new EncoderException("Unable to create a job", e);
    }
  }

  /**
   * Converts an image from <code>sourceImage</code> to a new format.
   * 
   * @param job
   *          the associated job
   * @param sourceImage
   *          the source image
   * @param profileId
   *          the identifer of the encoding profile to use
   * @return the image as an attachment element
   * @throws EncoderException
   *           if converting the image fails
   */
  protected Attachment convertImage(Job job, Attachment sourceImage, String profileId) throws EncoderException,
          MediaPackageException {
    // TODO: Implement this for gstreamer
    throw new UnsupportedOperationException("Not yet implemented");
  }

  /**
   * {@inheritDoc}
   * 
   * Supports inserting captions in QuickTime files.
   * 
   * @see org.opencastproject.composer.api.ComposerService#captions(org.opencastproject.mediapackage.Track,
   *      org.opencastproject.mediapackage.Attachment, java.lang.String)
   */
  @Override
  public Job captions(final Track mediaTrack, final Catalog[] captions) throws EmbedderException, MediaPackageException {
    List<String> args = new ArrayList<String>();
    args.set(0, MediaPackageElementParser.getAsXml(mediaTrack));
    for (int i = 0; i < captions.length; i++) {
      args.set(i + 1, MediaPackageElementParser.getAsXml(captions[i]));
    }

    try {
      return serviceRegistry.createJob(JOB_TYPE, Operation.Caption.toString(), args);
    } catch (ServiceRegistryException e) {
      throw new EmbedderException("Unable to create a job", e);
    }
  }

  /**
   * Adds the closed captions contained in the <code>captions</code> catalog collection to <code>mediaTrack</code>.
   * 
   * @param job
   *          the associated job
   * @param mediaTrack
   *          the source track
   * @param captions
   *          the caption catalogs
   * @return the captioned track
   * @throws EmbedderException
   *           if embedding captions into the track fails
   */
  protected Track captions(Job job, Track mediaTrack, Catalog[] captions) throws EncoderException, EmbedderException {
    throw new NotImplementedException("Adding captions not implemented in gstreamer composer");
  }
  
  @Override
  public Job watermark(Track mediaTrack, String watermark, String profileId) {
    // TODO: implement me
    throw new UnsupportedOperationException("Not supported yet.");
  }

  /**
   * Deletes any valid file in the list.
   * 
   * @param encodingOutput
   *          list of files to be deleted
   */
  protected void cleanup(List<File> encodingOutput) {
    for (File file : encodingOutput) {
      if (file != null && file.isFile()) {
        String path = file.getAbsolutePath();
        if (file.delete()) {
          logger.info("Deleted local copy of image file at {}", path);
        } else {
          logger.warn("Could not delete local copy of image file at {}", path);
        }
      }
    }
  }

  protected void cleanupWorkspace(List<URI> workspaceURIs) {
    for (URI url : workspaceURIs) {
      try {
        workspace.delete(url);
      } catch (Exception e) {
        logger.warn("Could not delete {} from workspace: {}", url, e.getMessage());
      }
    }
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.composer.api.ComposerService#listProfiles()
   */
  @Override
  public EncodingProfile[] listProfiles() {
    Collection<EncodingProfile> profiles = profileScanner.getProfiles().values();
    return profiles.toArray(new EncodingProfile[profiles.size()]);
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.composer.api.ComposerService#getProfile(java.lang.String)
   */
  @Override
  public EncodingProfile getProfile(String profileId) {
    return profileScanner.getProfiles().get(profileId);
  }

  protected File getTrack(Track track) throws EncoderException {
    try {
      return workspace.get(track.getURI());
    } catch (NotFoundException e) {
      throw new EncoderException("Requested track " + track + " is not found");
    } catch (IOException e) {
      throw new EncoderException("Unable to access track " + track);
    }
  }

  /**
   * Sets the media inspection service
   * 
   * @param mediaInspectionService
   *          an instance of the media inspection service
   */
  protected void setMediaInspectionService(MediaInspectionService mediaInspectionService) {
    this.inspectionService = mediaInspectionService;
  }

  /**
   * Sets the gstreamer encoder engine factory
   * 
   * @param encoderEngineFactory
   *          The encoder engine factory
   */
  protected void setGSEncoderEngineFactory(GStreamerFactory gsFactory) {
    this.encoderEngineFactory = gsFactory;
  }

  /**
   * Sets the workspace
   * 
   * @param workspace
   *          an instance of the workspace
   */
  protected void setWorkspace(Workspace workspace) {
    this.workspace = workspace;
  }

  /**
   * Sets the service registry
   * 
   * @param serviceManager
   */
  protected void setServiceRegistry(ServiceRegistry serviceManager) {
    this.serviceRegistry = serviceManager;
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.job.api.AbstractJobProducer#getServiceRegistry()
   */
  @Override
  protected ServiceRegistry getServiceRegistry() {
    return serviceRegistry;
  }

  /**
   * Sets the profile scanner
   * 
   * @param scanner
   */
  protected void setProfileScanner(GSEncodingProfileScanner scanner) {
    this.profileScanner = scanner;
  }

  /**
   * Callback for setting the security service.
   * 
   * @param securityService
   *          the securityService to set
   */
  public void setSecurityService(SecurityService securityService) {
    this.securityService = securityService;
  }

  /**
   * Callback for setting the user directory service.
   * 
   * @param userDirectoryService
   *          the userDirectoryService to set
   */
  public void setUserDirectoryService(UserDirectoryService userDirectoryService) {
    this.userDirectoryService = userDirectoryService;
  }

  /**
   * Sets a reference to the organization directory service.
   * 
   * @param organizationDirectory
   *          the organization directory
   */
  public void setOrganizationDirectoryService(OrganizationDirectoryService organizationDirectory) {
    this.organizationDirectoryService = organizationDirectory;
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.job.api.AbstractJobProducer#getSecurityService()
   */
  @Override
  protected SecurityService getSecurityService() {
    return securityService;
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.job.api.AbstractJobProducer#getUserDirectoryService()
   */
  @Override
  protected UserDirectoryService getUserDirectoryService() {
    return userDirectoryService;
  }

  /**
   * {@inheritDoc}
   * 
   * @see org.opencastproject.job.api.AbstractJobProducer#getOrganizationDirectoryService()
   */
  @Override
  protected OrganizationDirectoryService getOrganizationDirectoryService() {
    return organizationDirectoryService;
  }

}
