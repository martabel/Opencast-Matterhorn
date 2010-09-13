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
package org.opencastproject.composer.impl;

import org.opencastproject.composer.api.EmbedderEngine;
import org.opencastproject.composer.api.EmbedderException;
import org.opencastproject.composer.impl.qtembedder.QTSbtlEmbedderEngine;

import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.net.URISyntaxException;
import java.util.HashMap;

/**
 * Test class for QuickTime embedder engine.
 * 
 */
public class EmbedderEngineTest {

  private EmbedderEngine engine;
  private File[] captions;
  private String[] languages;
  private File movie;
  private File resultingFile;
  
  // default path to QT subtitle embedder
  private static String defaultBinaryPath = "/usr/local/bin/qtsbtlembedder";
  // logger
  private static final Logger logger = LoggerFactory.getLogger(EmbedderEngineTest.class);

  @Before
  public void setUp() throws Exception {
    // create engine
    engine = new QTSbtlEmbedderEngine();
    // load captions and movie
    File engCaptions = new File(EmbedderEngineTest.class.getResource("/captions_test_eng.srt").toURI());
    Assert.assertNotNull(engCaptions);
    File fraCaptions = new File(EmbedderEngineTest.class.getResource("/captions_test_fra.srt").toURI());
    Assert.assertNotNull(fraCaptions);
    captions = new File[] { engCaptions, fraCaptions };
    languages = new String[] { "en", "fr" };
    movie = new File(EmbedderEngineTest.class.getResource("/slidechanges.mov").toURI());
    Assert.assertNotNull(movie);
  }

  @Test
  public void testEmbedding() throws EmbedderException, URISyntaxException {
    logger.info("Checking for Qt subtitle embedder binary in {}", defaultBinaryPath);
	  if (!new File(defaultBinaryPath).canExecute()) {
	    logger.warn("Binary not found, skipping test");
	  } else {
	    logger.info("Binary found, executing test...");
	    resultingFile = engine.embed(movie, captions, languages, new HashMap<String, String>());
	  }
  }

  @After
  public void tearDown() throws Exception {
    if (resultingFile != null)
      Assert.assertTrue(resultingFile.delete());
  }
}