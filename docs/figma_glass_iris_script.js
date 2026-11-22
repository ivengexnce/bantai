// =====================================================================
// BANTAI - Glass Iris AI Chat Dashboard (Figma Plugin API Script)
// File: https://www.figma.com/design/c6kKkaQQSXuKrgNYDRQCeb
// =====================================================================

(async () => {
  // 1. Load Required Typography
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const page = figma.currentPage;

  // Helper: Hex to RGB 0-1
  const hex = (h, opacity = 1) => {
    const clean = h.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return { type: 'SOLID', color: { r, g, b }, opacity };
  };

  // 2. Main Desktop Canvas Frame (1440 x 1024)
  const root = figma.createFrame();
  root.name = "BANTAI — Glass Iris AI Chat Dashboard";
  root.resize(1440, 1024);
  root.x = 100;
  root.y = 100;
  root.fills = [hex('#0E0E0E')];
  root.clipsContent = true;

  // Ambient Atmospheric Light (Top Blue Glow)
  const ambientGlow = figma.createEllipse();
  ambientGlow.name = "Ambient Atmospheric Glow";
  ambientGlow.resize(900, 450);
  ambientGlow.x = 270;
  ambientGlow.y = -180;
  ambientGlow.fills = [{
    type: 'GRADIENT_RADIAL',
    gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
    gradientStops: [
      { color: { r: 0.184, g: 0.420, b: 1.0, a: 0.18 }, position: 0 },
      { color: { r: 0.353, g: 0.298, b: 0.961, a: 0.08 }, position: 0.5 },
      { color: { r: 0.055, g: 0.055, b: 0.055, a: 0 }, position: 1 }
    ]
  }];
  root.appendChild(ambientGlow);

  // =====================================================================
  // A. LEFT NAVIGATION RAIL (64px wide)
  // =====================================================================
  const navRail = figma.createFrame();
  navRail.name = "Left Navigation Rail";
  navRail.resize(64, 1024);
  navRail.x = 0;
  navRail.y = 0;
  navRail.fills = [hex('#151515', 0.95)];
  navRail.strokes = [hex('#FFFFFF', 0.06)];
  navRail.strokeWeight = 1;
  navRail.strokeAlign = 'INSIDE';
  navRail.layoutMode = 'VERTICAL';
  navRail.primaryAxisAlignItems = 'SPACE_BETWEEN';
  navRail.counterAxisAlignItems = 'CENTER';
  navRail.paddingTop = 20;
  navRail.paddingBottom = 20;
  navRail.paddingLeft = 12;
  navRail.paddingRight = 12;

  // Top Nav Items Container
  const navTop = figma.createFrame();
  navTop.name = "Nav Top Group";
  navTop.layoutMode = 'VERTICAL';
  navTop.counterAxisAlignItems = 'CENTER';
  navTop.itemSpacing = 24;
  navTop.fills = [];

  // 1. BANTAI Logo Emblem (Glass Iris Mini Orb)
  const logoOrb = figma.createEllipse();
  logoOrb.name = "Logo Emblem";
  logoOrb.resize(36, 36);
  logoOrb.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0.5, 0.5, 0], [-0.5, 0.5, 0.5]],
    gradientStops: [
      { color: { r: 0.184, g: 0.420, b: 1.0, a: 1 }, position: 0 },
      { color: { r: 0.353, g: 0.298, b: 0.961, a: 1 }, position: 1 }
    ]
  }];
  logoOrb.strokes = [hex('#00F0FF', 0.5)];
  logoOrb.strokeWeight = 1.5;
  navTop.appendChild(logoOrb);

  // 2. Nav Icons Stack
  const navIcons = figma.createFrame();
  navIcons.name = "Nav Icons";
  navIcons.layoutMode = 'VERTICAL';
  navIcons.counterAxisAlignItems = 'CENTER';
  navIcons.itemSpacing = 16;
  navIcons.fills = [];

  // Helper to create nav button
  const createNavButton = (name, label, isActive = false) => {
    const btn = figma.createFrame();
    btn.name = name;
    btn.resize(40, 40);
    btn.cornerRadius = 10;
    btn.layoutMode = 'VERTICAL';
    btn.primaryAxisAlignItems = 'CENTER';
    btn.counterAxisAlignItems = 'CENTER';

    if (isActive) {
      btn.fills = [hex('#2F6BFF', 0.15)];
      btn.strokes = [hex('#2F6BFF', 0.4)];
      btn.strokeWeight = 1;
    } else {
      btn.fills = [];
    }

    const txt = figma.createText();
    txt.characters = label;
    txt.fontSize = 15;
    txt.fontName = { family: "Inter", style: isActive ? "Bold" : "Medium" };
    txt.fills = [hex(isActive ? '#2F6BFF' : '#8C8C8C')];
    btn.appendChild(txt);
    return btn;
  };

  navIcons.appendChild(createNavButton("New Chat (+)", "+", true));
  navIcons.appendChild(createNavButton("Chat History", "💬", false));
  navIcons.appendChild(createNavButton("Explore / Tools", "🧭", false));
  navIcons.appendChild(createNavButton("Saved Memory", "🧠", false));
  navIcons.appendChild(createNavButton("Settings", "⚙️", false));

  navTop.appendChild(navIcons);
  navRail.appendChild(navTop);

  // Bottom Nav Item (User Avatar)
  const userAvatar = figma.createFrame();
  userAvatar.name = "User Profile";
  userAvatar.resize(38, 38);
  userAvatar.cornerRadius = 19;
  userAvatar.fills = [hex('#1D1D1D')];
  userAvatar.strokes = [hex('#5A4CF5', 0.5)];
  userAvatar.strokeWeight = 1.5;
  userAvatar.layoutMode = 'VERTICAL';
  userAvatar.primaryAxisAlignItems = 'CENTER';
  userAvatar.counterAxisAlignItems = 'CENTER';

  const avatarText = figma.createText();
  avatarText.characters = "MM";
  avatarText.fontSize = 12;
  avatarText.fontName = { family: "Inter", style: "Semi Bold" };
  avatarText.fills = [hex('#FFFFFF')];
  userAvatar.appendChild(avatarText);

  navRail.appendChild(userAvatar);
  root.appendChild(navRail);

  // =====================================================================
  // B. TOP NAVIGATION BAR (1376px wide, 60px high)
  // =====================================================================
  const topBar = figma.createFrame();
  topBar.name = "Top Navigation Bar";
  topBar.resize(1376, 60);
  topBar.x = 64;
  topBar.y = 0;
  topBar.fills = [hex('#151515', 0.85)];
  topBar.strokes = [hex('#FFFFFF', 0.05)];
  topBar.strokeWeight = 1;
  topBar.strokeAlign = 'INSIDE';
  topBar.layoutMode = 'HORIZONTAL';
  topBar.primaryAxisAlignItems = 'SPACE_BETWEEN';
  topBar.counterAxisAlignItems = 'CENTER';
  topBar.paddingLeft = 24;
  topBar.paddingRight = 24;

  // Left Section: Navigation Controls & Breadcrumb
  const topBarLeft = figma.createFrame();
  topBarLeft.name = "Nav & Breadcrumb";
  topBarLeft.layoutMode = 'HORIZONTAL';
  topBarLeft.counterAxisAlignItems = 'CENTER';
  topBarLeft.itemSpacing = 16;
  topBarLeft.fills = [];

  const backBtn = figma.createFrame();
  backBtn.resize(28, 28);
  backBtn.cornerRadius = 6;
  backBtn.fills = [hex('#1D1D1D')];
  backBtn.strokes = [hex('#FFFFFF', 0.06)];
  backBtn.layoutMode = 'VERTICAL';
  backBtn.primaryAxisAlignItems = 'CENTER';
  backBtn.counterAxisAlignItems = 'CENTER';
  const backTxt = figma.createText();
  backTxt.characters = "‹";
  backTxt.fontSize = 16;
  backTxt.fontName = { family: "Inter", style: "Regular" };
  backTxt.fills = [hex('#8C8C8C')];
  backBtn.appendChild(backTxt);
  topBarLeft.appendChild(backBtn);

  const breadcrumb = figma.createText();
  breadcrumb.characters = "Home  /  BANTAI";
  breadcrumb.fontSize = 13;
  breadcrumb.fontName = { family: "Inter", style: "Medium" };
  breadcrumb.fills = [hex('#8C8C8C')];
  topBarLeft.appendChild(breadcrumb);

  topBar.appendChild(topBarLeft);

  // Center Section: Search Bar (360px wide)
  const searchBar = figma.createFrame();
  searchBar.name = "Search Field";
  searchBar.resize(360, 36);
  searchBar.cornerRadius = 8;
  searchBar.fills = [hex('#1D1D1D')];
  searchBar.strokes = [hex('#FFFFFF', 0.08)];
  searchBar.strokeWeight = 1;
  searchBar.layoutMode = 'HORIZONTAL';
  searchBar.primaryAxisAlignItems = 'SPACE_BETWEEN';
  searchBar.counterAxisAlignItems = 'CENTER';
  searchBar.paddingLeft = 12;
  searchBar.paddingRight = 12;

  const searchLeft = figma.createFrame();
  searchLeft.layoutMode = 'HORIZONTAL';
  searchLeft.counterAxisAlignItems = 'CENTER';
  searchLeft.itemSpacing = 8;
  searchLeft.fills = [];

  const searchPlaceholder = figma.createText();
  searchPlaceholder.characters = "Search Anything...";
  searchPlaceholder.fontSize = 13;
  searchPlaceholder.fontName = { family: "Inter", style: "Regular" };
  searchPlaceholder.fills = [hex('#6E6E6E')];
  searchLeft.appendChild(searchPlaceholder);
  searchBar.appendChild(searchLeft);

  const shortcutBadge = figma.createFrame();
  shortcutBadge.cornerRadius = 4;
  shortcutBadge.paddingLeft = 6;
  shortcutBadge.paddingRight = 6;
  shortcutBadge.paddingTop = 2;
  shortcutBadge.paddingBottom = 2;
  shortcutBadge.fills = [hex('#151515')];
  shortcutBadge.strokes = [hex('#FFFFFF', 0.08)];
  const shortcutText = figma.createText();
  shortcutText.characters = "⌘K";
  shortcutText.fontSize = 10;
  shortcutText.fontName = { family: "Inter", style: "Medium" };
  shortcutText.fills = [hex('#8C8C8C')];
  shortcutBadge.appendChild(shortcutText);
  searchBar.appendChild(shortcutBadge);

  topBar.appendChild(searchBar);

  // Right Section: Status Indicator & Notifications
  const topBarRight = figma.createFrame();
  topBarRight.name = "Status & Profile";
  topBarRight.layoutMode = 'HORIZONTAL';
  topBarRight.counterAxisAlignItems = 'CENTER';
  topBarRight.itemSpacing = 16;
  topBarRight.fills = [];

  const statusPill = figma.createFrame();
  statusPill.cornerRadius = 12;
  statusPill.paddingLeft = 10;
  statusPill.paddingRight = 10;
  statusPill.paddingTop = 4;
  statusPill.paddingBottom = 4;
  statusPill.fills = [hex('#2F6BFF', 0.12)];
  statusPill.strokes = [hex('#2F6BFF', 0.3)];
  statusPill.layoutMode = 'HORIZONTAL';
  statusPill.counterAxisAlignItems = 'CENTER';
  statusPill.itemSpacing = 6;

  const dot = figma.createEllipse();
  dot.resize(6, 6);
  dot.fills = [hex('#2F6BFF')];
  statusPill.appendChild(dot);

  const statusText = figma.createText();
  statusText.characters = "Silicon: Localhost (Port 4000)";
  statusText.fontSize = 11;
  statusText.fontName = { family: "Inter", style: "Medium" };
  statusText.fills = [hex('#2F6BFF')];
  statusPill.appendChild(statusText);
  topBarRight.appendChild(statusPill);

  topBar.appendChild(topBarRight);
  root.appendChild(topBar);

  // =====================================================================
  // C. MAIN AI ASSISTANT HERO CONTAINER (720px Wide, Centered)
  // =====================================================================
  const heroContainer = figma.createFrame();
  heroContainer.name = "Main AI Hero Experience";
  heroContainer.resize(720, 900);
  heroContainer.x = 64 + (1376 - 720) / 2; // 392
  heroContainer.y = 80;
  heroContainer.fills = [];
  heroContainer.layoutMode = 'VERTICAL';
  heroContainer.primaryAxisAlignItems = 'MIN';
  heroContainer.counterAxisAlignItems = 'CENTER';
  heroContainer.itemSpacing = 28;

  // 1. THE GLASS IRIS ORB (Visual Centerpiece, 240x240)
  const orbContainer = figma.createFrame();
  orbContainer.name = "Glass Iris — Central AI Orb";
  orbContainer.resize(240, 240);
  orbContainer.fills = [];

  // Layer A: Outer Diffuse Ambient Glow
  const orbGlow = figma.createEllipse();
  orbGlow.name = "Orb Ambient Aura";
  orbGlow.resize(240, 240);
  orbGlow.x = 0;
  orbGlow.y = 0;
  orbGlow.fills = [{
    type: 'GRADIENT_RADIAL',
    gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
    gradientStops: [
      { color: { r: 0.184, g: 0.420, b: 1.0, a: 0.35 }, position: 0 },
      { color: { r: 0.353, g: 0.298, b: 0.961, a: 0.15 }, position: 0.55 },
      { color: { r: 0.055, g: 0.055, b: 0.055, a: 0 }, position: 1 }
    ]
  }];
  orbContainer.appendChild(orbGlow);

  // Layer B: Glass Outer Sphere (200x200)
  const orbGlass = figma.createEllipse();
  orbGlass.name = "Crystal Glass Sphere";
  orbGlass.resize(200, 200);
  orbGlass.x = 20;
  orbGlass.y = 20;
  orbGlass.fills = [{
    type: 'GRADIENT_RADIAL',
    gradientTransform: [[0.4, -0.3, 0.45], [0.3, 0.4, 0.35]],
    gradientStops: [
      { color: { r: 0.08, g: 0.12, b: 0.28, a: 0.9 }, position: 0 },
      { color: { r: 0.05, g: 0.07, b: 0.18, a: 0.95 }, position: 0.7 },
      { color: { r: 0.02, g: 0.03, b: 0.08, a: 1.0 }, position: 1 }
    ]
  }];
  orbGlass.strokes = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0.7, 0.7, 0], [-0.7, 0.7, 0.5]],
    gradientStops: [
      { color: { r: 0.0, g: 0.941, b: 1.0, a: 0.75 }, position: 0 },
      { color: { r: 0.184, g: 0.420, b: 1.0, a: 0.4 }, position: 0.5 },
      { color: { r: 0.353, g: 0.298, b: 0.961, a: 0.75 }, position: 1 }
    ]
  }];
  orbGlass.strokeWeight = 1.5;
  orbContainer.appendChild(orbGlass);

  // Layer C: Swirling Electric Blue & Violet Energy Core (130x130)
  const orbCore = figma.createEllipse();
  orbCore.name = "Swirling Energy Core";
  orbCore.resize(130, 130);
  orbCore.x = 55;
  orbCore.y = 55;
  orbCore.fills = [{
    type: 'GRADIENT_ANGULAR',
    gradientTransform: [[0.5, 0.5, 0], [-0.5, 0.5, 0.5]],
    gradientStops: [
      { color: { r: 0.184, g: 0.420, b: 1.0, a: 0.95 }, position: 0 },
      { color: { r: 0.0, g: 0.941, b: 1.0, a: 0.8 }, position: 0.3 },
      { color: { r: 0.353, g: 0.298, b: 0.961, a: 0.9 }, position: 0.65 },
      { color: { r: 0.486, g: 0.282, b: 0.941, a: 0.85 }, position: 0.85 },
      { color: { r: 0.184, g: 0.420, b: 1.0, a: 0.95 }, position: 1 }
    ]
  }];
  orbContainer.appendChild(orbCore);

  // Layer D: Refraction Ring Inner
  const refractionRing = figma.createEllipse();
  refractionRing.name = "Internal Refraction Ring";
  refractionRing.resize(164, 164);
  refractionRing.x = 38;
  refractionRing.y = 38;
  refractionRing.fills = [];
  refractionRing.strokes = [hex('#2F6BFF', 0.35)];
  refractionRing.strokeWeight = 1;
  orbContainer.appendChild(refractionRing);

  // Layer E: Specular Glass Reflection Arc
  const specular = figma.createEllipse();
  specular.name = "Glass Specular Highlight";
  specular.resize(70, 35);
  specular.x = 45;
  specular.y = 35;
  specular.rotation = -25;
  specular.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 0.5]],
    gradientStops: [
      { color: { r: 1, g: 1, b: 1, a: 0.45 }, position: 0 },
      { color: { r: 1, g: 1, b: 1, a: 0 }, position: 1 }
    ]
  }];
  orbContainer.appendChild(specular);

  heroContainer.appendChild(orbContainer);

  // 2. Greeting & Main Headings
  const textGroup = figma.createFrame();
  textGroup.name = "Headlines Group";
  textGroup.layoutMode = 'VERTICAL';
  textGroup.counterAxisAlignItems = 'CENTER';
  textGroup.itemSpacing = 8;
  textGroup.fills = [];

  const greeting = figma.createText();
  greeting.characters = "Hello, Meet 👋";
  greeting.fontSize = 15;
  greeting.fontName = { family: "Inter", style: "Medium" };
  greeting.fills = [hex('#8C8C8C')];
  textGroup.appendChild(greeting);

  const headline = figma.createText();
  headline.characters = "WHAT'S ON YOUR MIND?";
  headline.fontSize = 36;
  headline.fontName = { family: "Inter", style: "Bold" };
  headline.fills = [hex('#FFFFFF')];
  textGroup.appendChild(headline);

  const subline = figma.createText();
  subline.characters = "Your intelligent companion for thinking, creating, learning, and getting things done.";
  subline.fontSize = 14;
  subline.fontName = { family: "Inter", style: "Regular" };
  subline.fills = [hex('#8C8C8C')];
  textGroup.appendChild(subline);

  heroContainer.appendChild(textGroup);

  // 3. Dark Glass Chat Composer (720px wide, 14px rounded corners)
  const composer = figma.createFrame();
  composer.name = "Chat Composer";
  composer.resize(720, 128);
  composer.cornerRadius = 14;
  composer.fills = [hex('#151515', 0.95)];
  composer.strokes = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { color: { r: 0.184, g: 0.420, b: 1.0, a: 0.4 }, position: 0 },
      { color: { r: 0.353, g: 0.298, b: 0.961, a: 0.4 }, position: 1 }
    ]
  }];
  composer.strokeWeight = 1.5;
  composer.layoutMode = 'VERTICAL';
  composer.primaryAxisAlignItems = 'SPACE_BETWEEN';
  composer.paddingTop = 16;
  composer.paddingBottom = 12;
  composer.paddingLeft = 18;
  composer.paddingRight = 18;

  // Placeholder
  const placeholder = figma.createText();
  placeholder.characters = "Ask BANTAI anything...";
  placeholder.fontSize = 14;
  placeholder.fontName = { family: "Inter", style: "Regular" };
  placeholder.fills = [hex('#6E6E6E')];
  composer.appendChild(placeholder);

  // Composer Bottom Controls Bar
  const composerBar = figma.createFrame();
  composerBar.name = "Composer Controls";
  composerBar.layoutMode = 'HORIZONTAL';
  composerBar.primaryAxisAlignItems = 'SPACE_BETWEEN';
  composerBar.counterAxisAlignItems = 'CENTER';
  composerBar.fills = [];
  composerBar.layoutSizingHorizontal = 'FILL';

  // Left Controls: +, Mode Pill, Deep Think Toggle, Model Pill
  const composerLeft = figma.createFrame();
  composerLeft.layoutMode = 'HORIZONTAL';
  composerLeft.counterAxisAlignItems = 'CENTER';
  composerLeft.itemSpacing = 8;
  composerLeft.fills = [];

  const attachBtn = figma.createFrame();
  attachBtn.resize(30, 30);
  attachBtn.cornerRadius = 8;
  attachBtn.fills = [hex('#1D1D1D')];
  attachBtn.layoutMode = 'VERTICAL';
  attachBtn.primaryAxisAlignItems = 'CENTER';
  attachBtn.counterAxisAlignItems = 'CENTER';
  const attachTxt = figma.createText();
  attachTxt.characters = "+";
  attachTxt.fontSize = 15;
  attachTxt.fontName = { family: "Inter", style: "Semi Bold" };
  attachTxt.fills = [hex('#8C8C8C')];
  attachBtn.appendChild(attachTxt);
  composerLeft.appendChild(attachBtn);

  const modePill = figma.createFrame();
  modePill.cornerRadius = 8;
  modePill.paddingLeft = 10;
  modePill.paddingRight = 10;
  modePill.paddingTop = 6;
  modePill.paddingBottom = 6;
  modePill.fills = [hex('#1D1D1D')];
  modePill.strokes = [hex('#FFFFFF', 0.08)];
  const modeTxt = figma.createText();
  modeTxt.characters = "Tapori Mode ▾";
  modeTxt.fontSize = 11;
  modeTxt.fontName = { family: "Inter", style: "Medium" };
  modeTxt.fills = [hex('#FFFFFF')];
  modePill.appendChild(modeTxt);
  composerLeft.appendChild(modePill);

  const deepThinkPill = figma.createFrame();
  deepThinkPill.cornerRadius = 8;
  deepThinkPill.paddingLeft = 10;
  deepThinkPill.paddingRight = 10;
  deepThinkPill.paddingTop = 6;
  deepThinkPill.paddingBottom = 6;
  deepThinkPill.fills = [hex('#5A4CF5', 0.15)];
  deepThinkPill.strokes = [hex('#5A4CF5', 0.35)];
  const deepThinkTxt = figma.createText();
  deepThinkTxt.characters = "🧠 Deep Think";
  deepThinkTxt.fontSize = 11;
  deepThinkTxt.fontName = { family: "Inter", style: "Semi Bold" };
  deepThinkTxt.fills = [hex('#5A4CF5')];
  deepThinkPill.appendChild(deepThinkTxt);
  composerLeft.appendChild(deepThinkPill);

  const modelPill = figma.createFrame();
  modelPill.cornerRadius = 8;
  modelPill.paddingLeft = 8;
  modelPill.paddingRight = 8;
  modelPill.paddingTop = 6;
  modelPill.paddingBottom = 6;
  modelPill.fills = [hex('#1D1D1D')];
  const modelTxt = figma.createText();
  modelTxt.characters = "Bhai (7B)";
  modelTxt.fontSize = 11;
  modelTxt.fontName = { family: "Inter", style: "Regular" };
  modelTxt.fills = [hex('#8C8C8C')];
  modelPill.appendChild(modelTxt);
  composerLeft.appendChild(modelPill);

  composerBar.appendChild(composerLeft);

  // Right Controls: Mic + Gradient Send Button
  const composerRight = figma.createFrame();
  composerRight.layoutMode = 'HORIZONTAL';
  composerRight.counterAxisAlignItems = 'CENTER';
  composerRight.itemSpacing = 8;
  composerRight.fills = [];

  const micBtn = figma.createFrame();
  micBtn.resize(32, 32);
  micBtn.cornerRadius = 8;
  micBtn.fills = [hex('#1D1D1D')];
  micBtn.layoutMode = 'VERTICAL';
  micBtn.primaryAxisAlignItems = 'CENTER';
  micBtn.counterAxisAlignItems = 'CENTER';
  const micTxt = figma.createText();
  micTxt.characters = "🎤";
  micTxt.fontSize = 13;
  micTxt.fills = [hex('#8C8C8C')];
  micBtn.appendChild(micTxt);
  composerRight.appendChild(micBtn);

  const sendBtn = figma.createFrame();
  sendBtn.resize(32, 32);
  sendBtn.cornerRadius = 8;
  sendBtn.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { color: { r: 0.184, g: 0.420, b: 1.0, a: 1 }, position: 0 },
      { color: { r: 0.353, g: 0.298, b: 0.961, a: 1 }, position: 1 }
    ]
  }];
  sendBtn.layoutMode = 'VERTICAL';
  sendBtn.primaryAxisAlignItems = 'CENTER';
  sendBtn.counterAxisAlignItems = 'CENTER';
  const sendTxt = figma.createText();
  sendTxt.characters = "➔";
  sendTxt.fontSize = 14;
  sendTxt.fontName = { family: "Inter", style: "Bold" };
  sendTxt.fills = [hex('#FFFFFF')];
  sendBtn.appendChild(sendTxt);
  composerRight.appendChild(sendBtn);

  composerBar.appendChild(composerRight);
  composer.appendChild(composerBar);

  heroContainer.appendChild(composer);

  // 4. Suggested Prompt Cards (3-Column Layout)
  const cardsRow = figma.createFrame();
  cardsRow.name = "Suggested Prompt Cards";
  cardsRow.resize(720, 88);
  cardsRow.layoutMode = 'HORIZONTAL';
  cardsRow.itemSpacing = 16;
  cardsRow.fills = [];

  const createPromptCard = (title, desc, colorHex, iconChar) => {
    const card = figma.createFrame();
    card.name = title;
    card.resize(229, 88);
    card.cornerRadius = 12;
    card.fills = [hex('#151515')];
    card.strokes = [hex('#FFFFFF', 0.06)];
    card.strokeWeight = 1;
    card.layoutMode = 'VERTICAL';
    card.itemSpacing = 6;
    card.paddingTop = 14;
    card.paddingBottom = 14;
    card.paddingLeft = 14;
    card.paddingRight = 14;

    const iconBadge = figma.createFrame();
    iconBadge.resize(24, 24);
    iconBadge.cornerRadius = 6;
    iconBadge.fills = [hex(colorHex, 0.15)];
    iconBadge.layoutMode = 'VERTICAL';
    iconBadge.primaryAxisAlignItems = 'CENTER';
    iconBadge.counterAxisAlignItems = 'CENTER';
    const iconTxt = figma.createText();
    iconTxt.characters = iconChar;
    iconTxt.fontSize = 12;
    iconTxt.fills = [hex(colorHex)];
    iconBadge.appendChild(iconTxt);
    card.appendChild(iconBadge);

    const cardTitle = figma.createText();
    cardTitle.characters = title;
    cardTitle.fontSize = 13;
    cardTitle.fontName = { family: "Inter", style: "Semi Bold" };
    cardTitle.fills = [hex('#FFFFFF')];
    card.appendChild(cardTitle);

    const cardDesc = figma.createText();
    cardDesc.characters = desc;
    cardDesc.fontSize = 11;
    cardDesc.fontName = { family: "Inter", style: "Regular" };
    cardDesc.fills = [hex('#8C8C8C')];
    card.appendChild(cardDesc);

    return card;
  };

  cardsRow.appendChild(createPromptCard("01 — Ask Anything", "Get answers and explore ideas.", "#2F6BFF", "⚡"));
  cardsRow.appendChild(createPromptCard("02 — Deep Think", "Explore complex questions.", "#5A4CF5", "🧠"));
  cardsRow.appendChild(createPromptCard("03 — Create Something", "Write, plan, and build.", "#2453DB", "✨"));

  heroContainer.appendChild(cardsRow);

  // 5. Recent Conversations Section (Timeline / Tree Line Design)
  const recentSection = figma.createFrame();
  recentSection.name = "Recent Conversations Section";
  recentSection.resize(720, 160);
  recentSection.layoutMode = 'VERTICAL';
  recentSection.itemSpacing = 10;
  recentSection.fills = [];

  // Header
  const recentHeader = figma.createFrame();
  recentHeader.layoutMode = 'HORIZONTAL';
  recentHeader.primaryAxisAlignItems = 'SPACE_BETWEEN';
  recentHeader.counterAxisAlignItems = 'CENTER';
  recentHeader.fills = [];
  recentHeader.layoutSizingHorizontal = 'FILL';

  const recentTitle = figma.createText();
  recentTitle.characters = "RECENT CONVERSATIONS";
  recentTitle.fontSize = 11;
  recentTitle.fontName = { family: "Inter", style: "Semi Bold" };
  recentTitle.fills = [hex('#8C8C8C')];
  recentHeader.appendChild(recentTitle);

  const viewAll = figma.createText();
  viewAll.characters = "View All Conversations →";
  viewAll.fontSize = 12;
  viewAll.fontName = { family: "Inter", style: "Medium" };
  viewAll.fills = [hex('#2F6BFF')];
  recentHeader.appendChild(viewAll);

  recentSection.appendChild(recentHeader);

  // Conversation Items
  const items = [
    { title: "QuickSort algorithmic partitioning and Big-O analysis", time: "12m ago", opacity: 1.0 },
    { title: "Docker multi-stage build optimization and security", time: "2h ago", opacity: 0.85 },
    { title: "Dual-database air-gap architecture and CEL rules", time: "Yesterday", opacity: 0.70 },
    { title: "Mumbai Tapori calibration parameters for Qwen 2.5", time: "3 days ago", opacity: 0.55 }
  ];

  for (const item of items) {
    const row = figma.createFrame();
    row.resize(720, 26);
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    row.counterAxisAlignItems = 'CENTER';
    row.fills = [];
    row.layoutSizingHorizontal = 'FILL';

    const left = figma.createFrame();
    left.layoutMode = 'HORIZONTAL';
    left.counterAxisAlignItems = 'CENTER';
    left.itemSpacing = 8;
    left.fills = [];

    const icon = figma.createText();
    icon.characters = "💬";
    icon.fontSize = 11;
    icon.fills = [hex('#2F6BFF', item.opacity)];
    left.appendChild(icon);

    const txt = figma.createText();
    txt.characters = item.title;
    txt.fontSize = 12;
    txt.fontName = { family: "Inter", style: "Regular" };
    txt.fills = [hex('#FFFFFF', item.opacity)];
    left.appendChild(txt);
    row.appendChild(left);

    const timeTxt = figma.createText();
    timeTxt.characters = item.time;
    timeTxt.fontSize = 11;
    timeTxt.fontName = { family: "Inter", style: "Regular" };
    timeTxt.fills = [hex('#6E6E6E', item.opacity)];
    row.appendChild(timeTxt);

    recentSection.appendChild(row);
  }

  heroContainer.appendChild(recentSection);
  root.appendChild(heroContainer);

  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([root]);

  return {
    status: "success",
    fileUrl: "https://www.figma.com/design/c6kKkaQQSXuKrgNYDRQCeb",
    message: "BANTAI Glass Iris AI Chat Dashboard created in Figma!"
  };
})();
