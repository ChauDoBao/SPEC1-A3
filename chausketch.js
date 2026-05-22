/*
REFERENCE:
Google (n.d.) Gemini (Gemini Pro) [large language model], Google, accessed 27 March 2026. https://gemini.google.com/
Processing Foundation (n.d.) p5.js (version 1.9.0) [software library], Processing Foundation, accessed 27 March 2026. https://p5js.org/
60 Minutes Archive [2025], Steve Jobs on being inspired by the Beatles | 60 Minutes Archive, streaming video, YouTube, accessed 24 March 2026, https://youtu.be/vydmUCGQnyI?si=JFI5i2cd-J3_PBHG*/

// --- 1. GLOBAL ARRAYS ---
let nodes = [];            // Array to store all individual Node objects (the triangles)
let edges = [];            // Array to store connection pairs between nodes close to each other
let faces = [];            // Array to store groups of 3 nodes that form a closed triangular face
let pulses = [];           // Array to store active RippleFlow objects (the shooting energy)
let bokehParticles = [];   // Array to store the blurry background floating circles

// --- 2. STATE & UI VARIABLES ---
let appState = "READY";    // Controls the current screen state ("READY", "INTRO", "ART", or "OUTRO")
let menuState = "CLOSED";  // Tracks whether the bottom ADAPT menu is currently open or closed
let currentShape = "ORIGINAL"; // Tracks the current active shape/physics rule applied to the nodes
let introAlpha = 255;      // Controls the opacity of the intro screen's base text
let outroAlpha = 0;        // Controls the fade-in opacity of the outro screen
let artAlpha = 0;          // Controls the fade-in opacity of the main generative art scene
let homeHover = false;     // Boolean to track if the mouse is hovering over the Home button
let nextHover = false;     // Boolean to track if the mouse is hovering over the Next Link
let soundHover = false;    // Boolean to track if the mouse is hovering over the Sound button
let isMuted = false;       // Boolean to track if global audio is muted
let introStage = 1;        // Tracks which phase of the intro text animation is currently playing
let targetY, slideY;       // Variables to manage the smooth vertical sliding animation of intro text
let morphAlpha = 255;      // Controls the fade-in/out opacity of the changing words in the intro
let activeSlider = null;   // Tracks which HUD slider (1 or 2) is currently being dragged

let sliderSpeed = 0.5;     // Stores the current value (0.0 to 1.0) of the "Global Currents" slider
let sliderStrength = 0.4;  // Stores the current value (0.0 to 1.0) of the "Local Impact" slider

// Instruction States
let instrState = 0;        // Tracks the current step of the instructional text sequence
let instrTimer = 0;        // Stores the timestamp for when the next instruction should appear
let hasShownBaseInstr = false; // Flag to ensure the base instructions only show once
let hasShownSlider1 = false;   // Flag to ensure the slider 1 tooltip only shows once
let hasShownSlider2 = false;   // Flag to ensure the slider 2 tooltip only shows once
let hasShownAdapt = false;     // Flag to ensure the ADAPT menu tooltip only shows once

// Audio State Variables
let artMusicStarted = false;   // Flag to ensure background music only triggers its start sequence once
let isNavigatingHome = false;  // Flag to prevent multiple rapid clicks on the Home button during transition
let hasIntroSoundPlayed = false; // Flag to ensure the intro sound effect only plays once

// Network Geometry Settings
const sides = 10;          // Number of nodes per ring in the default circular formation
const rings = 4;           // Number of concentric rings in the default formation
let centerX, centerY;      // Variables to store the center coordinates of the canvas
let connectionDistance = 140; // The maximum pixel distance for two nodes to connect with a line

// Assets
let homeImg;               // Variable to hold the loaded house icon image
let soundOnImg, soundOffImg; // Variables to hold the loaded speaker icon images

// Audio Assets
let sliderSound;           // Variable to hold the mechanical ticking sound for sliders
let adaptSound;            // Variable to hold the click sound for ADAPT menu buttons
let chargedSound;          // Variable to hold the sound when a node reaches 100% charge
let pulseSound;            // Variable to hold the sound when an energy pulse is fired
let progressSound;         // Variable to hold the sound when an energy pulse hits a node
let bgMusic;               // Variable to hold the ambient background music track
let introSound;            // Variable to hold the transition sound played during the intro
let clickSound;

// --- RESPONSIVE & GRID SETTINGS ---
let ui = {                 // Object to centrally manage responsive layout variables
  isMobile: false,         // Boolean set to true if screen width is narrow
  sidebarW: 180,           // Width constraint used for desktop sidebars
  margin: 50,              // Standard margin padding
  fPercent: 12,            // Font size for slider percentage text
  fLabel: 10,              // Font size for slider label text
  fNav: 16,                // Font size for navigation elements
  fIntro: 60,              // Font size for intro text
};

function preload() {       // p5.js lifecycle function: runs first to load media before setup
  homeImg = loadImage('house.png'); // Loads the home icon image from the directory
  soundOnImg = loadImage("sound-on.png"); // Loads the active sound icon image
  soundOffImg = loadImage("sound-off.png"); // Loads the muted sound icon image

  sliderSound = loadSound("slider(edited).wav"); // Loads the slider tick audio
  adaptSound = loadSound("adapt(fix).wav");   // Loads the menu click audio
  chargedSound = loadSound("connected.wav");     // Loads the node power-up audio
  pulseSound = loadSound("resource-flow-new.wav"); // Loads the pulse shooting audio
  progressSound = loadSound("charged.wav");      // Loads the pulse impact audio
  bgMusic = loadSound("backgroundchau.wav");     // Loads the background music
  introSound = loadSound("transition-adapt.wav"); // Loads the intro transition audio
  clickSound = loadSound("hover.wav");
}

function setup() {         // p5.js lifecycle function: runs once after preload finishes
  let cnv = createCanvas(windowWidth, windowHeight); // Creates a canvas filling the browser window
  cnv.parent('canvas-container'); // Attaches the canvas to the specified HTML div

  updateUILayout();        // Calls custom function to set initial font sizes based on screen size

  centerX = width * 0.5;   // Calculates and stores horizontal center
  centerY = height * 0.5;  // Calculates and stores vertical center
  targetY = height / 2;    // Sets the target Y coordinate for the sliding intro text
  slideY = targetY;        // Sets the initial Y coordinate for the sliding intro text

  initNetwork();           // Calls custom function to generate the nodes and connections

  bokehParticles = [];     // Initializes the background particle array
  for (let i = 0; i < 12; i++) { // Loops 12 times to create 12 particles
    bokehParticles.push({  // Adds a new particle object with randomized properties
      x: random(width), y: random(height), // Random current position
      anchorX: random(width), anchorY: random(height), // Random center point for it to drift around
      size: random(150, 300), // Random radius for the blurry circle
      col: random(['#ff6666', '#ffffff', '#ff9999']), // Randomly picks one of three colors
      phaseX: random(TWO_PI), phaseY: random(TWO_PI), // Random starting angles for the sine wave drift
      speedX: random(0.001, 0.004), speedY: random(0.001, 0.004), // Random movement speeds
      driftRange: random(40, 80) // How far it can drift from its anchor point
    });
  }

  let nextBtn = select('#next-btn'); // Uses p5 DOM to grab the HTML button by its ID
  if (nextBtn) {           // Checks if the HTML button actually exists on the page
    nextBtn.mousePressed((e) => { // Attaches a click event listener to the HTML button
      e.preventDefault();  // Prevents the browser's default link-click behavior (jumping to top)
      e.stopPropagation(); // Stops the click event from passing through to the p5 canvas underneath

      if (appState === "ART") {
        if (clickSound && clickSound.isLoaded()) {
            clickSound.setVolume(0.5); // Adjust volume as needed
            clickSound.play();
        }
        appState = "OUTRO";     // Changes the global state to trigger the outro animation
        outroAlpha = 0;         // Resets the outro fade-in opacity to 0
        let footer = select('#dynamic-footer'); // Grabs the HTML footer element
        if (footer) footer.removeClass('show-now'); // Hides the HTML footer

        if (bgMusic && bgMusic.isPlaying()) { // Checks if background music is currently playing
          bgMusic.fade(0, 1.5); // Smoothly fades the music volume to 0 over 1.5 seconds
setTimeout(() => {
         }, 1500);        }
      }
    });
  }
}

function updateUILayout() { // Custom function to recalculate sizes based on screen width
  ui.isMobile = width < 700; // Sets boolean to true if screen is narrower than 700px
  ui.margin = ui.isMobile ? 25 : 60; // Applies a smaller margin on mobile, larger on desktop

  if (ui.isMobile) {       // If the layout should be mobile...
    ui.fPercent = 12;      // Sets mobile font size for percentages
    ui.fLabel = 12;        // Sets mobile font size for labels
    ui.fNav = 12;          // Sets mobile font size for navigation
    ui.fIntro = min(width * 0.09, 45); // Scales intro font relative to screen, caps at 45
  } else {                 // If the layout should be desktop...
    ui.fPercent = 16;      // Sets desktop font size for percentages
    ui.fLabel = 16;        // Sets desktop font size for labels
    ui.fNav = 16;          // Sets desktop font size for navigation
    ui.fIntro = min(width * 0.06, 75); // Scales intro font relative to screen, caps at 75
  }
}

function draw() {          // p5.js lifecycle function: runs 60 times per second
  background(4, 6, 12);    // Paints the background a very dark blue on every frame

  if (appState === "READY") { // If we are waiting for user interaction...
    drawReadyScreen();        // Call function to draw the static "Click to start" screen
  } else if (appState === "INTRO") { // If we are in the intro animation phase...
    drawIntro();              // Call function to animate the intro text
  }
  else if (appState === "ART") { // If we are in the main interactive art phase...

    let footer = select("#dynamic-footer"); // Grabs the HTML footer
    if (footer && !footer.hasClass("show-now")) { // If it exists but is hidden...
      footer.addClass("show-now"); // Adds class to make the HTML footer visible
    }

    // Initialize background music sequence if it hasn't started yet
    if (!artMusicStarted && bgMusic && bgMusic.isLoaded() && getAudioContext().state === 'running') {
      bgMusic.setVolume(0);   // Start volume at 0
      bgMusic.loop();         // Start the track looping
      bgMusic.fade(0.3, 2);   // Smoothly fade volume up to 30% over 2 seconds
      artMusicStarted = true; // Mark as started so this block doesn't run again
    }

    // --- SENTENCE BY SENTENCE INSTRUCTIONS ---
    if (instrState === 0 && !hasShownBaseInstr) { // Trigger first instruction
      instrState = 1; // Advance state
      instrTimer = millis() + 6000; // Set timer for 6 seconds
      let instr = select('#instruction-text'); // Grab HTML text element
      if (instr) {
        instr.html("This network of small incomplete triangles represents Least Developed Countries (LDCs) - fragile systems where connections are easily disrupted."); // Set text
        instr.addClass('show-instruction'); // Fade text in
      }
    } else if (instrState === 1 && millis() > instrTimer) { // After 6 seconds...
      instrState = 2; // Advance state
      instrTimer = millis() + 7000; // Set timer for 7 seconds
      let instr = select('#instruction-text');
      if (instr) instr.html("In this piece, each interaction reveals a process of receiving and adapting - illustrating how LDCs depend on global support to navigate both local and global challenges."); // Change text
    } else if (instrState === 2 && millis() > instrTimer) { // After 7 seconds...
      instrState = 3; // Advance state
      instrTimer = millis() + 5000; // Set timer for 5 seconds
      let instr = select('#instruction-text');
      if (instr) instr.html("Click anywhere on the network to send resources into motion."); // Change text
    } else if (instrState === 3 && millis() > instrTimer) { // After 5 seconds...
      instrState = 4; // Advance state to signify sequence complete
      hasShownBaseInstr = true; // Flag that base instructions are done
      let instr = select('#instruction-text');
      if (instr) instr.removeClass('show-instruction'); // Fade text out
    }

    drawArt();             // Call function to render the nodes, lines, and pulses
    drawCinematicBars();   // Call function to render top and bottom black gradients

    if (!ui.isMobile) {    // If rendering for desktop...
      let uiX = 70;        // Sets horizontal position for sliders
      let opac = mouseX < ui.sidebarW || activeSlider !== null ? 255 : 80; // Fade sliders based on mouse proximity
      // Draw top slider (Speed)
      drawHUDSlider(uiX, height / 2 - 150, sliderSpeed, "Global Currents", 1, opac, false);
      // Draw bottom slider (Strength)
      drawHUDSlider(uiX, height / 2 + 150, sliderStrength, "Local Impact", 2, opac, false);
    } else {               // If rendering for mobile...
      let opac = mouseY > height - 150 || activeSlider !== null ? 255 : 120; // Fade based on bottom proximity
      let sliderW = (width - 60) / 2; // Calculate width to fit two sliders horizontally
      // Draw left slider horizontally at the bottom
      drawHUDSlider(width / 2 - sliderW / 2 - 10, height - 130, sliderSpeed, "Global Currents", 1, opac, true);
      // Draw right slider horizontally at the bottom
      drawHUDSlider(width / 2 + sliderW / 2 + 10, height - 130, sliderStrength, "Local Impact", 2, opac, true);
    }

    drawAdaptMenu();       // Call function to render the category buttons
  }
  else if (appState === "OUTRO") { // If in the outro phase...
    drawOutro();           // Call function to render the final text screen
  }

  // These elements are drawn unconditionally over all screens
  drawHomeButton();        // Call function to render house icon
  drawSoundButton();       // Call function to render speaker icon
}

// --- 3. NAVIGATION & MOUSE LOGIC ---

function mousePressed() {  // p5.js built-in function: triggers when canvas is clicked
  // If we are waiting for user interaction to start the app...
  if (appState === "READY") {
    userStartAudio();      // Unlocks browser audio context
    appState = "INTRO";    // Transition state to start the intro animation
    return;                // Exit function early
  }

  if (getAudioContext().state !== 'running') { // Failsafe: ensures audio context is running
    userStartAudio();      // Unlocks browser audio context
  }
if (soundHover) {
    isMuted = !isMuted; // Toggle the state first

    if (isMuted) {
      // 1. We are MUTING. Play the click sound first.
      if (clickSound && clickSound.isLoaded()) clickSound.play();
      
      // 2. Wait 1000 milliseconds for the click to finish, then pull the master mute switch.
      setTimeout(() => {
        if (isMuted) outputVolume(0); // Double-check it wasn't unmuted during the delay
      }, 600); 
      
    } else {
      // 1. We are UNMUTING. Turn the master switch back on first.
      outputVolume(1); 
      
      // 2. Now play the click sound so we can actually hear it.
      if (clickSound && clickSound.isLoaded()) clickSound.play();
    }
    
    return; 
  }

  if (homeHover) {
    if (!isNavigatingHome) {
      isNavigatingHome = true;
      
      // 1. Play the click sound immediately
      if (clickSound && clickSound.isLoaded() && !isMuted) {
          clickSound.play();
      }

      // 2. Fade out the background music
      if (bgMusic && bgMusic.isPlaying()) bgMusic.fade(0, 1);
      if (introSound && introSound.isPlaying()) introSound.fade(0, 1);
      
      // 3. Wait exactly 1 second for the fade to finish before jumping
      setTimeout(() => {
        window.location.href = "index.html"; 
      }, 600);
    }
    return; 
  }

  // Interactive pulse spawning logic
  if (appState === "ART" && !activeSlider) { // If in the art phase and not currently dragging a slider...
    let closestNode = null; // Variable to store the target node
    let minDist = 100;      // Search radius in pixels

    for (let n of nodes) {  // Loop through all nodes
      let d = dist(mouseX, mouseY, n.pos.x, n.pos.y); // Check distance between mouse and node
      if (d < minDist) {    // If it's the closest one found so far within the radius...
        minDist = d;        // Update minimum distance
        closestNode = n;    // Save this node as the target
      }
    }

    if (closestNode) {      // If a valid node was clicked...
      // Find all neighbors within 1.5x connection distance
      let nearbyNodes = nodes.filter(other => dist(closestNode.pos.x, closestNode.pos.y, other.pos.x, other.pos.y) < connectionDistance * 1.5);
      let numShots = floor(random(3, 6)); // Pick a random number of pulses to fire (3 to 5)
      nearbyNodes = shuffle(nearbyNodes).slice(0, numShots); // Shuffle neighbors and pick the selected amount
      if (!nearbyNodes.includes(closestNode)) nearbyNodes[0] = closestNode; // Ensure the originally clicked node is always hit

      for (let target of nearbyNodes) { // Loop through the selected target nodes
        pulses.push(new RippleFlow(target)); // Instantiate and add a new pulse chasing the target
      }

      if (pulseSound && pulseSound.isLoaded()) { // If pulse sound is ready...
        setTimeout(() => {  // Delay audio playback by 500ms to sync with visual impact
          if (!isMuted) {   // Check mute state right before playing
            let panning = map(closestNode.pos.x, 0, width, -1.0, 1.0); // Map X position to left/right stereo panning
            pulseSound.pan(panning); // Apply panning
            pulseSound.setVolume(0.2); // Set volume
            pulseSound.play(); // Play sound
          }
        }, 500);            // 500ms delay
      }
      return;               // Exit function
    }
  }
}

function mouseReleased() { // p5.js built-in function: triggers when mouse button is released
  activeSlider = null;     // Clears the active slider flag so it stops following the mouse
}

// --- 4. SCREEN DRAWING FUNCTIONS ---
function drawReadyScreen() { // Custom function to draw the initial un-clicked state
  // 1. MATCH THE MOBILE BREAKPOINT
  let isMobile = width < 600; // Check if mobile width
  let fontSize = isMobile ? 32 : 80; // Determine font size

  // 2. MATCH THE FONT EXACTLY
  textFont("new-science-extended"); // Set font family
  textSize(fontSize);      // Apply font size
  textStyle(BOLD);         // Apply bold style
  drawingContext.font = `700 ${fontSize}px new-science-extended, serif`; // Native canvas font declaration

  fill(255, 50); // Set fill to white with low opacity (ghosted effect)

  // 3. MATCH THE LAYOUT EXACTLY
  if (isMobile) {          // Mobile layout processing
    // Two-line layout for mobile
    let txtStage = "STAGE 2: "; 
    let topWidth = textWidth(txtStage); // Get pixel width of text
    let startX = width / 2 - topWidth / 2; // Calculate centered X position

    textAlign(LEFT, CENTER); // Set alignment
    text(txtStage, startX, height / 2 - 25); // Draw first line

    textAlign(CENTER, CENTER); // Set alignment
    text("SHARE", width / 2, height / 2 + 25); // Draw second line
  } else {                 // Desktop layout processing
    // Single-line layout for desktop
    textAlign(CENTER, CENTER); // Set alignment
    text("STAGE 2: SHARE", width / 2, height / 2); // Draw text perfectly centered
  }

  // Draw the "Click to Start" Instruction
  textAlign(CENTER, CENTER); // Ensure alignment is centered
  textFont("mulish-variable"); // Set instruction font
  textSize(isMobile ? 14 : 18); // Set instruction size
  fill(255, 150 + sin(frameCount * 0.1) * 50); // Calculate pulsing opacity using sine wave
  // Pushed down slightly (80) to account for the two-line title on mobile
  text("(Click anywhere to allow sounds)", width / 2, height / 2 + 80); // Draw instruction text
}

function drawIntro() {     // Custom function to animate the intro sequence
  // --- NEW: AUTO-PLAY INTRO SOUND ---
  if (introSound && introSound.isLoaded() && !hasIntroSoundPlayed) { // If sound is ready and hasn't played...
    introSound.setVolume(0.5); // Set volume

    setTimeout(() => {
      introSound.play();   // Play the audio
    }, 1600);

    hasIntroSoundPlayed = true; // Lock the flag so it doesn't play repeatedly
  }

  let fontSize = ui.isMobile ? 32 : 80; // Determine font size based on mobile flag

  textFont("new-science-extended"); // Set font family
  textSize(fontSize);      // Apply font size
  textStyle(BOLD);         // Apply bold style
  drawingContext.font = `700 ${fontSize}px new-science-extended, sans-serif`; // Native canvas font declaration
  noStroke();              // Remove borders from text

  let txtStage = "STAGE "; // Set string parts
  let num1 = "2: ", text1 = "SHARE"; 
  let num2 = "3: ", text2 = "RECEIVE & ADAPT"; 

  let currentNum = (introStage === 1) ? num1 : num2; // Pick string based on phase
  let currentText = (introStage === 1) ? text1 : text2; // Pick string based on phase

  slideY = lerp(slideY, targetY, 0.1); // Smoothly interpolate slideY towards targetY for animation

  if (ui.isMobile) {       // Mobile rendering logic
    let topWidth = textWidth(txtStage) + textWidth(currentNum); // Calculate total width
    let startX = (width / 2) - (topWidth / 2); // Calculate start position to center it

    textAlign(LEFT, CENTER); // Set alignment
    fill(255, introAlpha);   // Apply base opacity
    text(txtStage, startX, targetY - 25); // Draw static part

    fill(255, morphAlpha);   // Apply morphing opacity
    text(currentNum, startX + textWidth(txtStage), targetY - 25); // Draw morphing number

    textAlign(CENTER, CENTER); // Realign for center text
    text(currentText, width / 2, slideY + 25); // Draw morphing text, utilizing slideY for movement

  } else {                 // Desktop rendering logic
    textAlign(LEFT, CENTER); // Set alignment

    let fullContent = currentNum + currentText; // Combine strings
    let fullWidth = textWidth(txtStage) + textWidth(fullContent); // Calculate width
    let startX = (width / 2) - (fullWidth / 2); // Calculate center X position

    fill(255, introAlpha);   // Apply base opacity
    text(txtStage, startX, targetY); // Draw static part

    let numX = startX + textWidth(txtStage); // Calculate offset for dynamic part
    fill(255, morphAlpha);   // Apply morphing opacity
    text(fullContent, numX, slideY); // Draw dynamic part utilizing slideY
  }

  if (frameCount > 120 && introStage === 1) { // After 2 seconds in phase 1...
    morphAlpha -= 10;        // Quickly fade out dynamic text
    if (morphAlpha <= 0) {   // Once completely invisible...
      introStage = 2;        // Advance to phase 2
      slideY = targetY - (ui.isMobile ? 35 : 60); // Snap Y position up to prepare for downward slide
    }
  }

  if (introStage === 2) {    // If in phase 2...
    morphAlpha = min(morphAlpha + 15, introAlpha); // Quickly fade dynamic text back in
    if (frameCount > 260) {  // After approx 4.3 seconds total...
      introAlpha -= 5;       // Fade out entire intro sequence
      morphAlpha = introAlpha; // Link morph opacity to base opacity

      if (introAlpha <= 0) { // Once fully faded out...
        appState = "ART";    // Change app state to main ART sequence
        if (introSound && introSound.isPlaying()) { // Check if intro sound is still going
          introSound.fade(0, 1); // Fade it out over 1 second
          setTimeout(() => introSound.stop(), 1000); // Stop it completely after 1 second
        }
      }
    }
  }
}

function drawOutro() {     // Custom function to render the final outro screen
  if (outroAlpha < 255) outroAlpha += 3; // Gradually fade elements in

  blendMode(ADD);          // Set additive blending for particles
  bokehParticles.forEach(b => { // Loop through background particles
    b.x = b.anchorX + sin(frameCount * b.speedX + b.phaseX) * b.driftRange; // Animate X position
    b.y = b.anchorY + cos(frameCount * b.speedY + b.phaseY) * b.driftRange; // Animate Y position
    drawSoftCircle(b.x, b.y, b.size, b.col); // Draw the particle
  });

  blendMode(BLEND);        // Reset blending mode
  textAlign(CENTER, CENTER); // Set text alignment
  rectMode(CENTER);        // Set rect drawing mode (not actively drawing rects here, but safe)
  noStroke();              // Remove text borders

  fill(255, outroAlpha);   // Set fill with fading alpha
  textFont("new-science-extended"); // Set font family
  let titleSize = ui.isMobile ? 24 : 32; // Set responsive font size
  textSize(titleSize);     // Apply font size
  textStyle(BOLD);         // Set to bold
  drawingContext.font = `700 ${titleSize}px new-science-extended, sans-serif`; // Canvas API font setup
  text("Connect 2 Partners, Share 1 Solution Now", width / 2, height / 2 - 60); // Draw main heading

  textFont("mulish-variable"); // Set sub-font family
  let pSize = ui.isMobile ? 14 : 18; // Set responsive sub-font size
  textSize(pSize);         // Apply sub-font size
  textStyle(NORMAL);       // Reset to normal weight
  drawingContext.font = `200 ${pSize}px mulish-variable, sans-serif`; // Canvas API font setup
  let ctaText = "Find two international peers, host an online discussion, and share one simple, low-cost idea that can be started in a week to address a shared local challenge in your neighborhood."; // Text string
  text(ctaText, width / 2, height / 2 + 40, width * 0.85); // Draw paragraph text with constrained width

  fill(255, outroAlpha * 0.4); // Set dimmed fill color
  textSize(14);            // Set small text size
  drawingContext.font = `200 14px mulish-variable, sans-serif`; // Canvas API font setup
  text("CLICK HOME TO RETURN TO MAIN PAGE", width / 2, height / 2 + 180); // Draw return instruction
}

function drawArt() {       // Custom function to render the generative network and physics
  if (artAlpha < 255) artAlpha += 5; // Gradually fade in the scene opacity
  push();                  // Save drawing state
  drawingContext.globalAlpha = artAlpha / 255; // Apply the fade-in globally to all rendering in this block

  blendMode(ADD);          // Additive blending for glowing particles
  noStroke();              // Remove borders
  for (let b of bokehParticles) { // Loop through all background particles
    b.x = b.anchorX + sin(frameCount * b.speedX + b.phaseX) * b.driftRange; // Calculate drifted X
    b.y = b.anchorY + cos(frameCount * b.speedY + b.phaseY) * b.driftRange; // Calculate drifted Y
    drawSoftCircle(b.x, b.y, b.size, b.col); // Render particle
  }

  // Logic to autonomously fire pulses based on 'Global Currents' slider
  // Generates a mod interval between 120 (slow) and 10 (fast)
  if (frameCount % floor(map(sliderSpeed, 0, 1, 120, 10)) === 0) { 
    let randomNode = random(nodes); // Pick a random node
    pulses.push(new RippleFlow(randomNode)); // Spawn a pulse targeting it
  }

  blendMode(BLEND);        // Reset blend mode
  for (let f of faces) {   // Loop through all triangle faces
    let facePower = min(f.a.powerLevel, min(f.b.powerLevel, f.c.powerLevel)); // Find minimum power of its 3 points
    if (facePower > 0) {   // If it has power...
      fill(255, 80, 80, 160 * facePower); // Fill transparent red scaled by power
      triangle(f.a.pos.x, f.a.pos.y, f.b.pos.x, f.b.pos.y, f.c.pos.x, f.c.pos.y); // Draw physical triangle
    }
  }

  for (let e of edges) {   // Loop through all connecting edges
    let edgePower = min(e.a.powerLevel, e.b.powerLevel); // Find minimum power of its 2 points
    let alpha = lerp(40, 200, edgePower); // Interpolate line opacity based on power
    strokeWeight(1);       // Thin line
    stroke(255, alpha);    // White color with calculated alpha
    drawingContext.setLineDash([2, 5]); // Set stroke to dashed line
    line(e.a.pos.x, e.a.pos.y, e.b.pos.x, e.b.pos.y); // Draw line between nodes
    drawingContext.setLineDash([]); // Reset dashed line to solid for standard rendering
  }

  blendMode(ADD);          // Additive blending for glowing pulses
  for (let i = pulses.length - 1; i >= 0; i--) { // Loop backward through pulses array
    pulses[i].update();    // Execute pulse logic
    pulses[i].display();   // Render pulse tail
    if (pulses[i].isFinished) pulses.splice(i, 1); // Delete pulse if it hit target to save memory
  }

  blendMode(BLEND);        // Reset blend mode
  for (let node of nodes) { // Loop through all nodes
    if (dist(mouseX, mouseY, node.pos.x, node.pos.y) < 20) { // If mouse is hovering over node...
      cursor(HAND);        // Change to pointer hand
    }
    node.update();         // Execute node physics
    node.display();        // Render node glow aura
    node.drawV();          // Render node triangle geometry
  }
  pop();                   // Restore original drawing state
}

// --- 5. CORE CLASSES ---

class Node {               // Class definition for the network vertices (triangles)
  constructor(x, y) {      // Initialization function
    this.anchor = createVector(x, y); // Origin target position to spring back to
    this.pos = createVector(x, y);    // Current live position
    this.vel = createVector(0, 0);    // Current physical velocity
    this.acc = createVector(0, 0);    // Current physical acceleration
    this.mass = random(0.8, 1.2);     // Randomized mass for varied physical response

    this.noiseOffsetX = random(2000); // Seed for horizontal jitter
    this.noiseOffsetY = random(4000); // Seed for vertical jitter
    this.isCharging = false;          // Boolean tracking incoming energy
    this.isPowered = false;           // Boolean tracking 100% full energy
    this.chargeLevel = 0;             // Float tracking energy progress
    this.powerLevel = 0;              // Float tracking output visual intensity
    this.glowRadius = 10;             // Radius of the aura
  }

  applyForce(force) {      // Method to accumulate physical force
    let f = p5.Vector.div(force, this.mass); // F = M * A, so A = F / M
    this.acc.add(f);       // Add computed acceleration
  }

  update() {               // Method to execute physics and update position per frame
    let stiffness = map(sliderStrength, 0, 1, 0.05, 0.25); // Scale spring stiffness via slider
    let spring = p5.Vector.sub(this.anchor, this.pos);     // Calculate vector pointing to anchor
    spring.mult(stiffness); // Apply stiffness multiplier
    this.applyForce(spring); // Push node toward anchor

    let mousePos = createVector(mouseX, mouseY); // Get mouse position vector
    let dMouse = p5.Vector.dist(this.pos, mousePos); // Calculate distance to mouse
    let resistance = map(sliderStrength, 0, 1, 1, 0.2); // Calculate how easily it gets pushed by mouse

    if (dMouse < 120) {    // If mouse is close...
      let repel = p5.Vector.sub(this.pos, mousePos); // Calculate vector pointing away from mouse
      repel.normalize();   // Set vector magnitude to 1
      let strength = map(dMouse, 0, 120, 5, 0) * resistance; // Calculate repel strength based on proximity
      repel.mult(strength); // Scale vector by strength
      this.applyForce(repel); // Push node away from mouse
    }

    let globalFlow = sliderSpeed; // Alias the speed slider variable

    if (currentShape === "CLIMATE") { // Environmental physics: Climate
      // Generate procedural wind using simplex noise based on position and time
      let nAngle = noise(this.pos.x * 0.01, this.pos.y * 0.01, frameCount * 0.05) * TWO_PI;
      let wind = p5.Vector.fromAngle(nAngle).mult(globalFlow * 2); // Convert to force vector
      this.applyForce(wind); // Apply wind force
    }
    else if (currentShape === "POVERTY") { // Environmental physics: Poverty
      if (sliderStrength < 0.5) { // Only triggers if local impact is low
        // Calculate vector pulling toward canvas center
        let drift = p5.Vector.sub(this.pos, createVector(centerX, centerY)).mult(0.01);
        this.applyForce(drift); // Apply gravity force
      }
    }
    else if (currentShape === "EDUCATION") { // Environmental physics: Education
      let pulseForce = sin(frameCount * 0.02) * globalFlow; // Calculate sine wave pulsing strength
      this.applyForce(createVector(0, pulseForce)); // Apply pulsing force up and down
    }

    this.vel.add(this.acc); // Standard Euler integration: add acceleration to velocity
    this.vel.mult(0.85);    // Standard Euler integration: apply friction/damping
    this.pos.add(this.vel); // Standard Euler integration: add velocity to position
    this.acc.mult(0);       // Standard Euler integration: reset acceleration

    let jitter = this.isPowered ? 0.5 : (this.isCharging ? 2 : 4); // Set visual jitter magnitude
    this.pos.x += map(noise(this.noiseOffsetX), 0, 1, -jitter, jitter); // Apply horizontal jitter
    this.pos.y += map(noise(this.noiseOffsetY), 0, 1, -jitter, jitter); // Apply vertical jitter
    this.noiseOffsetX += 0.01; // Advance noise step
    this.noiseOffsetY += 0.01; // Advance noise step

    if (this.isPowered) this.powerLevel = 1; // Snap visual power level to 1 if fully powered
  }

  drawV() {                // Method to draw the node geometry
    push();                // Save state
    translate(this.pos.x, this.pos.y); // Translate origin to node position
    let p = this.isPowered ? 1 : this.chargeLevel; // Determine charge float
    let dotSize = lerp(2, 6, p); // Interpolate corner dot sizes based on charge

    if (this.isPowered) {  // Styling for powered nodes
      stroke(255, 120, 120); // Solid red stroke
      strokeWeight(2.5);     // Thick stroke
    } else {               // Styling for unpowered nodes
      stroke(255, 80, 80, lerp(120, 255, this.chargeLevel)); // Fade red stroke
      strokeWeight(1.5);     // Thin stroke
    }

    noFill();              // Transparent shape inside
    let r = 9;             // Size radius for the geometry
    // Calculate equilateral triangle points relative to origin
    let p1 = { x: 0, y: -r }, p2 = { x: -r * 0.86, y: r * 0.5 }, p3 = { x: r * 0.86, y: r * 0.5 };

    if (this.isPowered) {  // Draw closed triangle if powered
      beginShape(); vertex(p1.x, p1.y); vertex(p2.x, p2.y); vertex(p3.x, p3.y); endShape(CLOSE);
    } else {               // Draw open 'V' lines if not powered
      line(p1.x, p1.y, p2.x, p2.y); line(p1.x, p1.y, p3.x, p3.y);
    }

    noStroke(); fill(255); // Reset stroke and fill white for dots
    // Draw circles at the corners of the geometry
    ellipse(p1.x, p1.y, dotSize, dotSize);
    ellipse(p2.x, p2.y, dotSize, dotSize);
    ellipse(p3.x, p3.y, dotSize, dotSize);
    pop();                 // Restore state
  }

  charge(amount) {         // Method to apply partial energy
    this.isCharging = true; // Set charging flag
    this.chargeLevel = amount; // Store new amount
    this.glowRadius = 10 + (amount * 25); // Expand aura radius
  }

  powerUp() {              // Method to apply total energy
    this.isCharging = false; // Reset charging flag
    this.isPowered = true;   // Set powered flag
    this.powerLevel = 1;     // Max out visual power
    this.glowRadius = 35;    // Max out aura radius

    if (chargedSound && chargedSound.isLoaded() && !isMuted) { // Handle audio
      let r = random(0.9, 1.1); // Calculate random playback rate to vary pitch
      chargedSound.rate(r);     // Apply rate
      chargedSound.setVolume(0.6); // Set volume
      chargedSound.play();      // Play chime
    }
  }

  display() {              // Method to draw the radial aura
    let baseGlow = sliderStrength * 0.5; // Determine minimum glow from slider
    let coreAlpha = max(this.isPowered ? 0.5 : this.chargeLevel * 0.2, baseGlow); // Determine actual alpha
    let radius = map(sliderStrength, 0, 1, 10, 50); // Map radius size from slider

    if (this.isPowered || this.isCharging || sliderStrength > 0.1) { // Conditional render
      // Build gradient
      let grad = drawingContext.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, radius);
      grad.addColorStop(0, `rgba(255, 130, 130, ${coreAlpha})`); // Core color
      grad.addColorStop(1, `rgba(255, 60, 60, 0)`); // Edge color (transparent)
      drawingContext.fillStyle = grad; // Apply gradient
      noStroke();          // No border
      circle(this.pos.x, this.pos.y, radius * 2); // Draw shape containing gradient
    }
  }
}

class RippleFlow {         // Class definition for the traveling energy pulses
  constructor(targetNode) { // Initialization function
    let angle = random(TWO_PI); // Pick random spawn angle
    let r = max(width, height) * 0.9; // Calculate radius to push spawn point off-screen
    this.startPos = createVector(centerX + cos(angle) * r, centerY + sin(angle) * r); // Compute starting X/Y

    this.target = targetNode; // Store reference to the node being targeted
    this.progress = 0;        // Track progress from 0.0 to 1.0
    this.isFinished = false;  // Flag for array cleanup
  }

  update() {               // Method to advance pulse per frame
    if (!this.target) { this.isFinished = true; return; } // Safely exit if target missing

    let prevProgress = this.progress; // Store old progress
    // Advance progress based on slider speed mapping
    this.progress += map(pow(sliderSpeed, 2), 0, 1, 0.003, 0.025);
    // Check if pulse crossed the 1.0 threshold EXACTLY on this frame
    if (prevProgress < 1 && this.progress >= 1) {
      if (progressSound && progressSound.isLoaded() && !isMuted) { // Play impact audio
        progressSound.setVolume(0.15);
        progressSound.play();
      }
    }

    if (this.progress >= 1) { // If pulse has arrived at target...
      if (prevProgress < 1) { // Only do physics kick on exact frame of impact
        let impact = p5.Vector.sub(this.target.pos, this.startPos); // Get directional vector
        impact.normalize(); // Get pure direction
        impact.mult(15);    // Multiply into massive impact force
        this.target.applyForce(impact); // Apply force to target node
      }

      if (this.target.chargeLevel < 1) { // Update target's internal energy
        this.target.charge(this.target.chargeLevel + 0.35); // Add 35%
      } else if (!this.target.isPowered) { // Or fully power it
        this.target.powerUp();
        this.isFinished = true; // Mark pulse for deletion
      }
      if (this.target.isPowered) this.isFinished = true; // Mark pulse for deletion
    }
  }

  display() {              // Method to draw the pulse tail
    if (!this.target) return; // Safely exit if target missing

    noStroke();            // Remove borders
    let numDots = floor(map(sliderStrength, 0, 1, 30, 100)); // Calculate trail fidelity from slider
    for (let i = 0; i < numDots; i++) { // Loop to draw tail segments
      let dotT = i / numDots; // Calculate percentage position of this segment
      if (dotT > this.progress) continue; // Don't draw segments ahead of pulse head

      let p = p5.Vector.lerp(this.startPos, this.target.pos, dotT); // Get pixel coordinate of segment
      let wave = exp(-pow((dotT - this.progress) * 16, 2)); // Calculate exponential curve for fading tail thickness
      fill(255, 255 * wave); // Apply calculated opacity
      ellipse(p.x, p.y, 1.2 + wave * 4.5); // Draw ellipse scaled by the wave formula
    }
  }
}

// --- 6. AUTOMATION & NAVIGATION ---

function initNetwork() {   // Custom function to instantiate nodes and connections
  nodes = []; edges = []; faces = []; // Clear arrays

  let mobileScale = ui.isMobile ? 0.7 : 1.0; // Apply mobile sizing factor

  connectionDistance = min(width, height) * 0.18 * mobileScale; // Set cutoff distance for edge generation
  let spacing = min(width, height) * 0.11 * mobileScale; // Set ring spacing

  for (let r = 1; r <= rings; r++) { // Iterate over layers of rings
    for (let i = 0; i < sides; i++) { // Iterate over nodes per ring
      let angle = i * (TWO_PI / sides) - HALF_PI; // Calculate polar angle
      let radius = r * spacing; // Calculate polar radius
      let x = centerX + radius * cos(angle); // Convert polar to Cartesian X
      let y = centerY + radius * sin(angle); // Convert polar to Cartesian Y
      nodes.push(new Node(x, y)); // Add instantiated Node
    }
  }
  for (let i = 0; i < nodes.length; i++) { // Nested loops to build connections
    for (let j = i + 1; j < nodes.length; j++) {
      let d = dist(nodes[i].anchor.x, nodes[i].anchor.y, nodes[j].anchor.x, nodes[j].anchor.y); // Get dist between node A and B
      if (d < connectionDistance) { // If within threshold...
        edges.push({ a: nodes[i], b: nodes[j] }); // Save connection line
        for (let k = j + 1; k < nodes.length; k++) { // Loop again for third node
          let d2 = dist(nodes[i].anchor.x, nodes[i].anchor.y, nodes[k].anchor.x, nodes[k].anchor.y); // Get dist node A and C
          let d3 = dist(nodes[j].anchor.x, nodes[j].anchor.y, nodes[k].anchor.x, nodes[k].anchor.y); // Get dist node B and C
          if (d2 < connectionDistance && d3 < connectionDistance) { // If all three are close...
            faces.push({ a: nodes[i], b: nodes[j], c: nodes[k] }); // Save triangular face
          }
        }
      }
    }
  }
}

function transformShape(type) { // Custom function to recalculate node anchors based on chosen category
  currentShape = type;     // Update global state

  let mobileScale = ui.isMobile ? 0.7 : 1.0; // Scale factor
  let scaleF = (min(width, height) / 900) * mobileScale; // Unified scaling math variable

  nodes.forEach((n, i) => { // Loop through existing nodes
    let tx, ty;             // Declare temporary target variables
    if (type === "POVERTY") { // Math to form Poverty geometry
      tx = centerX + (i % 10 - 5) * (55 * scaleF);
      ty = centerY - (160 * scaleF) + (i / 10) * (85 * scaleF) + abs(i % 10 - 5) * (22 * scaleF);
    } else if (type === "EDUCATION") { // Math to form Education geometry
      tx = centerX - (210 * scaleF) + (i % 7) * (75 * scaleF);
      ty = centerY - (160 * scaleF) + floor(i / 7) * (75 * scaleF);
    } else if (type === "CLIMATE") { // Math to form Climate geometry
      let ang = i * 0.42;
      let rad = (60 * scaleF) + i * (5.5 * scaleF);
      tx = centerX + cos(ang) * rad;
      ty = centerY + sin(ang) * rad;
    } else if (type === "INFRA") { // Math to form Infrastructure geometry
      tx = centerX + (i % 3 - 1) * (110 * scaleF);
      ty = height - (220 * scaleF) - floor(i / 3) * (35 * scaleF);
    } else {                // Fallback math for ORIGINAL geometry
      let s = min(width, height) * 0.11 * mobileScale;
      let r = floor(i / sides) + 1;
      let a = (i % sides) * (TWO_PI / sides) - HALF_PI;
      tx = centerX + r * s * cos(a);
      ty = centerY + r * s * sin(a);
    }
    n.anchor.set(tx, ty);   // Reassign the node's anchor point to the calculated coordinate
  });
}

// --- 7. UI COMPONENT RENDERING ---

function drawAdaptMenu() { // Function to render bottom category buttons
  let btnW = ui.isMobile ? width * 0.22 : 125; // Define button width
  let btnH = ui.isMobile ? 36 : 42;            // Define button height

  let bottomY = ui.isMobile ? height - 190 : height - 160; // Define vertical location
  let startX = width / 2; // Center horizontally

  if (menuState === "CLOSED") { // If menu not clicked yet...
    // Draw singular open button
    drawTextButton(startX, bottomY, btnW, btnH, "ADAPT", () => { menuState = "OPEN"; });
  } else {                      // If menu clicked open...
    let options = ["POVERTY", "EDUCATION", "CLIMATE", "INFRA"]; // Set labels

    let spacing = min(150, width / (options.length + 0.5)); // Calculate horizontal layout spacing
    let totalW = (options.length - 1) * spacing; // Calculate full width of button block

    options.forEach((opt, i) => { // Loop to draw each specific button
      let x = (width / 2 - totalW / 2) + (i * spacing); // Calculate exact X for this iteration
      drawTextButton(x, bottomY, btnW - 10, btnH, opt, () => { // Pass drawing call with callback function
        transformShape(opt); // Triggers network reshape on click

        if (!hasShownAdapt && instrState === 4) { // Handles instructional tooltip for this interaction
          let instr = select('#instruction-text');
          if (instr) {
            instr.html("Now you can observe how LDCs transform incoming resources to tackle four major challenges...");
            instr.addClass('show-instruction');
            setTimeout(() => instr.removeClass('show-instruction'), 5000);
          }
          hasShownAdapt = true;
        }

      });
    });
  }
}

function drawTextButton(x, y, w, h, label, callback) { // Helper function to create interactive UI buttons
  // Boolean math to check if mouse is within rect bounding box
  let isHover = (mouseX > x - w / 2 && mouseX < x + w / 2 && mouseY > y - h / 2 && mouseY < y + h / 2);

  push(); translate(x, y); rectMode(CENTER); textAlign(CENTER, CENTER); // Setup drawing parameters
  stroke(255, isHover ? 255 : 120); // Border is brighter if hovering
  fill(isHover ? 255 : 0, isHover ? 255 : 60); // Fill is solid if hovering
  rect(0, 0, w, h, 5); noStroke(); fill(isHover ? 0 : 255); // Draw rect, then prep for text

  let fontSize = ui.isMobile ? 10 : 13; // Set text size
  textSize(fontSize); // Apply size
  textStyle(NORMAL); // Apply style
  textFont("mulish-variable"); // Set font
  drawingContext.font = `200 ${fontSize}px mulish-variable, sans-serif`; // Canvas API font setup
  text(label, 0, 0); // Draw text string

  if (isHover && mouseIsPressed && !activeSlider) { // Mouse click handler
    if (adaptSound && adaptSound.isLoaded() && !isMuted) { // Play button UI sound
      adaptSound.play();
    }
    callback(); // Execute the specific function passed into the button parameters
    mouseIsPressed = false; // Reset p5 mouse variable to debounce rapid clicks
  }
  pop(); // Restore drawing parameters
}

function drawHUDSlider(x, y, val, label, id, sliderOpacity, horizontal) { // Mega function for drawing value sliders
  let isMobile = width < 600; // Layout check
  let h = isMobile ? 120 : 200; // Determine line length
  let activeColor = color(255, 80, 80); // Establish primary slider color

  // Determine hit-box bounding area (different for vertical desktop vs horizontal mobile layouts)
  let over = horizontal
    ? mouseX > x - (isMobile ? width / 4 : 90) && mouseX < x + (isMobile ? width / 4 : 90) && mouseY > y - 30 && mouseY < y + 30
    : mouseX > x - 30 && mouseX < x + 30 && mouseY > y - 100 && mouseY < y + 100;

  // Instructional tooltip logic for interacting with sliders
  let isInteracting = isMobile ? (activeSlider === id) : over; // Defines "interacting" based on layout constraints
  if (isInteracting && appState === "ART" && instrState === 4) { // Only show tooltips if intro is done
    let instr = select('#instruction-text');
    if (id === 1 && !hasShownSlider1) { // Tooltip text for Speed slider
      if (instr) {
        instr.html("Use the first slider to adjust the flow of these currents");
        instr.addClass('show-instruction');
        setTimeout(() => instr.removeClass('show-instruction'), 5000);
      }
      hasShownSlider1 = true;
    } else if (id === 2 && !hasShownSlider2) { // Tooltip text for Impact slider
      if (instr) {
        instr.html("Use the second to influence how deeply they transform the system.");
        instr.addClass('show-instruction');
        setTimeout(() => instr.removeClass('show-instruction'), 5000);
      }
      hasShownSlider2 = true;
    }
  }

  if (mouseIsPressed && over) activeSlider = id; // Flag this specific slider as currently "grabbed" globally

  if (activeSlider === id) { // Execution logic if grabbed
    let prevVal = val; // Store old value
    // Parse raw value from mouse coordinate
    let rawVal = horizontal
      ? map(mouseX, x - (isMobile ? width / 4 : 90), x + (isMobile ? width / 4 : 90), 0, 1)
      : map(mouseY, y + 100, y - 100, 0, 1);

    // Snap to cleanly formatted tenth decimals
    let snappedVal = round(constrain(rawVal, 0, 1) * 10) / 10;

    if (snappedVal !== prevVal) { // Handle audio ticking when crossing a new increment
      if (sliderSound && sliderSound.isLoaded() && !isMuted) {
        let pitch = (snappedVal > prevVal) ? map(snappedVal, 0, 1, 1, 1.5) : map(snappedVal, 0, 1, 0.5, 0.9); // Alter pitch based on drag direction
        sliderSound.rate(pitch); // Set pitch
        sliderSound.setVolume(0.5); // Set vol
        sliderSound.play(); // Play tick
      }
    }

    if (id === 1) sliderSpeed = snappedVal; // Overwrite global speed state
    if (id === 2) sliderStrength = snappedVal; // Overwrite global strength state
  }

  // Visualization rendering block
  push();
  translate(x, y); // Center context on slider
  drawingContext.globalAlpha = sliderOpacity / 255; // Fade based on parameter
  textFont("mulish-variable"); // Set text font

  let len = isMobile ? width / 2 - 50 : 180; // Size variable

  if (horizontal) { // Render logic for bottom horizontal layout
    textAlign(LEFT, CENTER); // Left text setup
    drawingContext.font = `500 ${ui.fLabel}px mulish-variable, sans-serif`;
    fill(255);
    text(label, -len / 2, -10); // Draw title

    textAlign(RIGHT, CENTER); // Right text setup
    drawingContext.font = `500 ${ui.fPercent}px mulish-variable, sans-serif`;
    text(floor(val * 100) + "%", len / 2, -10); // Draw percent

    stroke(255, 40); // Track outline setup
    strokeWeight(2);
    line(-len / 2, 5, len / 2, 5); // Draw track line
    stroke(activeColor); // Track fill setup
    line(-len / 2, 5, map(val, 0, 1, -len / 2, len / 2), 5); // Draw filled red line
    noStroke();
    for (let i = 0; i <= 10; i++) { // Loop rendering small increment dots
      let nx = map(i, 0, 10, -len / 2, len / 2);
      fill(i / 10 <= val + 0.01 ? activeColor : 80);
      circle(nx, 5, 3);
    }
    fill(activeColor);
    circle(map(val, 0, 1, -len / 2, len / 2), 5, 12); // Draw grab knob
  } else { // Render logic for side vertical layout
    textAlign(CENTER, CENTER); // Text setup
    drawingContext.font = `500 ${ui.fPercent}px mulish-variable, sans-serif`;
    fill(255);
    text(floor(val * 100) + "%", 0, -125); // Draw percent at top

    drawingContext.font = `500 ${ui.fLabel}px mulish-variable, sans-serif`;
    let words = label.split(" "); // Handle multi-word strings
    let labelY = min(130, height - y - 20); // Keep label on screen bounds

    if (words.length > 1) { // Render multiple words stacked
      text(words[0], 0, labelY);
      text(words[1], 0, labelY + ui.fLabel + 5);
    } else { // Render single word
      text(label, 0, labelY);
    }

    stroke(255, 40); // Base track
    strokeWeight(2);
    line(0, -100, 0, 100); // Draw track line
    stroke(activeColor); // Fill track
    line(0, 100, 0, map(val, 0, 1, 100, -100)); // Draw filled red line
    noStroke();
    for (let i = 0; i <= 10; i++) { // Iterate over vertical increment dots
      let ny = map(i, 0, 10, 100, -100);
      fill(i / 10 <= val + 0.01 ? activeColor : 80);
      circle(0, ny, 5);
    }
    fill(activeColor);
    circle(0, map(val, 0, 1, 100, -100), 16); // Draw grab knob
  }
  pop(); // Cleanup drawing state
}

function drawHomeButton() { // Function rendering top-left home navigation
  let x = ui.isMobile ? 25 : 54; // Responsive margin X
  let y = ui.isMobile ? 30 : 45; // Responsive margin Y
  let size = ui.isMobile ? 24 : 32; // Responsive icon scale

  homeHover = mouseX > x && mouseX < x + size && mouseY > y && mouseY < y + size; // Math boundary check
  if (homeHover) cursor(HAND); // Show CSS hand pointer

  push();
  if (homeHover) { // Visual feedback logic
    tint(255, 255); // Full white
  } else {
    tint(255, 100); // Faded white
  }
  if (homeImg) image(homeImg, x, y, size, size); // Draw graphic
  pop();
}

function drawSoundButton() { // Function rendering top-right mute toggle
  let size = ui.isMobile ? 24 : 32; // Responsive icon scale
  let marginX = ui.isMobile ? 25 : 54; // Responsive margin X
  let y = ui.isMobile ? 30 : 45; // Responsive margin Y
  let x = width - marginX - size; // Pin to right side of viewport

  soundHover = mouseX > x && mouseX < x + size && mouseY > y && mouseY < y + size; // Math boundary check

  push();
  if (soundHover) { // Visual feedback logic
    cursor(HAND); // Show CSS hand pointer
    tint(255, 255); // Full white
  } else {
    tint(255, 100); // Faded white
  }

  let currentImg = isMuted ? soundOffImg : soundOnImg; // Dynamically grab proper image based on global state
  if (currentImg) {
    image(currentImg, x, y, size, size); // Draw graphic
  }
  pop();
}

function drawCinematicBars() { // Function drawing shadow gradients top/bottom
  let isMobile = width < 600; // Mobile flag check
  let barH = isMobile ? 100 : 150; // Gradient height constraint
  noStroke();
  let topGrad = drawingContext.createLinearGradient(0, 0, 0, barH); // Define top canvas API gradient object
  topGrad.addColorStop(0, "rgba(0,0,0,1)"); // Hard black at ceiling
  topGrad.addColorStop(1, "rgba(0,0,0,0)"); // Transparent at bottom limit
  drawingContext.fillStyle = topGrad; // Apply gradient
  rect(0, 0, width, barH); // Draw top rect
  let bottomGrad = drawingContext.createLinearGradient( // Define bottom canvas API gradient object
    0,
    height,
    0,
    height - barH
  );
  bottomGrad.addColorStop(0, "rgba(0,0,0,1)"); // Hard black at floor
  bottomGrad.addColorStop(1, "rgba(0,0,0,0)"); // Transparent at top limit
  drawingContext.fillStyle = bottomGrad; // Apply gradient
  rect(0, height - barH, width, barH); // Draw bottom rect
}

function drawSoftCircle(x, y, r, c) { // Utility drawing function for generating blurry particle blobs
  let cl = color(c); // Read hex string to p5 color format
  let g = drawingContext.createRadialGradient(x, y, 0, x, y, r); // Define radial canvas API gradient
  g.addColorStop(0, `rgba(${red(cl)}, ${green(cl)}, ${blue(cl)}, 0.15)`); // Light core opacity
  g.addColorStop(0.8, `rgba(${red(cl)}, ${green(cl)}, ${blue(cl)}, 0.03)`); // Soft mid opacity
  g.addColorStop(1, `rgba(${red(cl)}, ${green(cl)}, ${blue(cl)}, 0)`); // Clear edge opacity
  drawingContext.fillStyle = g; circle(x, y, r * 2); // Apply gradient and draw particle
}

function windowResized() { // p5.js lifecycle function: triggered on browser resize events
  resizeCanvas(windowWidth, windowHeight); // Adjust memory/DOM size of canvas
  updateUILayout(); // Re-trigger layout math logic
  centerX = width / 2; // Readjust center X
  centerY = height / 2; // Readjust center Y
  targetY = height / 2; // Readjust UI vertical targets

  initNetwork(); // Tear down and rebuild original node web structure
  transformShape(currentShape); // Apply active physics state layout variables to new grid
}
