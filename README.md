# 🌀 Spirale — Agent IA QA Full-Stack & Moteur de Test Autonome (Playwright + Gemini 2.5 Flash)Spirale est une plateforme d'automatisation des tests d'assurance qualité (QA) de bout en bout. 
Propulsée par le modèle Gemini 2.5 Flash, elle traduit des instructions rédigées en langage naturel (français ou anglais) en suites d’actions d'exécution robustes via Playwright et Chromium. Conçue pour une fiabilité absolue (100% de taux de réussite) sur des scénarios d'endurance ultra-complexes pouvant dépasser 3 000 étapes, elle élimine l'écriture manuelle de scripts de test.  La plateforme propose un streaming en temps réel des étapes (via Server-Sent Events), une capture de screenshots à chaque seconde, une page d'accueil immersive avec reveal holographique en 3D (Lithos), et un rapport final interactif et dynamique inspiré du standard d'Allure.  📖 SommaireArchitecture Globale du SystèmeInterface Graphique & Expérience Utilisateur (UX/UI)Le Moteur de Génération IA (Gemini 2.5 Flash)Le Catalogue Exhaustif des 100 Actions PlaywrightMoteur d'Exécution Résilient & Optimisations Anti-FlakyScénarios de Test d'Endurance StandardisésInstallation, Configuration & Déploiement1. Architecture Globale du SystèmeSpirale repose sur une architecture découplée de type MERN/TS, optimisée pour la gestion asynchrone à haute intensité de ressources (génération LLM + exécution de navigateurs Headless).[ Navigateur Client (React 18) ]
         │       ▲
   HTTP  │       │  SSE Stream (Server-Sent Events)
  POST   ▼       │
[ Serveur Backend (Express + Node.js) ]
         │
         ├──► [ Générateur LLM : API Gemini 2.5 Flash ] ── (Sortie JSON Strict)
         │
         └──► [ Moteur d'Exécution Playwright ]
                       │
                       └──► [ Instance Headless Chromium ] ── (Prise de Screenshots 1Hz)
Frontend (/src)Framework : React 18 avec TypeScript et Vite.  Styles : Tailwind CSS avec polices premium (Inter & Playfair Display).  Gestion des flux : Client EventSource natif pour consommer le flux SSE de l'exécution.  Backend (/server)Runtime : Node.js configuré en TypeScript natif.Framework Web : Express.js gérant l'orchestration des endpoints et les flux de streaming d'événements.  Contrôle de l'automatisation : Playwright Core avec binaires Chromium embarqués.  2. Interface Graphique & Expérience Utilisateur (UX/UI)L'application est divisée en quatre vues principales pour assurer une séparation stricte entre l'immersion de marque, la configuration, la surveillance de l'exécution en temps réel et l'analyse post-mortem.  A. Page d'Accueil Immersive : LithosLors de son premier accès, l'utilisateur atterrit sur une vitrine Premium à thème sombre dédiée à la marque de géologie Lithos.  Mécanique du Spot-Following Reveal : Un effet de masque circulaire dynamique (rayon fixe de $260\text{ px}$) suit le curseur de la souris. Le mouvement est amorti par interpolation linéaire (Lerp) avec un facteur de lissage de $0.1$ géré par une boucle requestAnimationFrame.  Rendu Canvas multi-couches : Une première image de base (BG_IMAGE_1) est rendue au niveau inférieur ($z$-index 10) avec un effet de zoom lent (Ken Burns) au chargement. Un composant RevealLayer calcule à la volée un gradient radial à opacités progressives ($1.0 \to 0.0$) dessiné sur un <canvas> masqué. Ce canvas génère un DataURL appliqué comme masque CSS (mask-image) sur un conteneur absolu ($z$-index 30) affichant l'image de révélation (BG_IMAGE_2).  Effet Halo Parallaxe 3D & Mutation de Couleur : En complément, le passage du faisceau lumineux applique une transformation de perspective 3D sur le texte principal et mute dynamiquement la couleur des éléments survolés en un violet néon vibrant.  B. Le Dashboard CentralL'espace de contrôle des rapports affiche l'état historique de la santé applicative.  Métriques de Performance KPI : Cartes affichant le nombre total de exécutions, le taux de réussite global (Success Rate %) calculé dynamiquement, le total de tests passés (Passed) et échoués (Failed).  Liste des Dernières Exécutions : Tableau triable par date, URL cible, statut final et durée globale, équipé d'un état vide (Empty State) avec bouton d'appel à l'action (CTA) vers la création de test.  C. Formulaire de Nouveau TestInterface simplifiée comprenant un champ pour l'URL cible valide et une zone de texte enrichie acceptant des instructions textuelles brutes.  D. Vue de Progression & Rapport Type AllurePendant l'exécution, la page de progression affiche les indicateurs d'état en direct, tandis que les captures d'écran et la chronologie détaillée des étapes s'exécutent de façon indépendante.  Chronologie interactive (Step Timeline) : Statut en temps réel par icône (Succès/Échec/En cours), nom précis de l'action générée par l'IA et compteurs de durée individuelle de l'étape.  Strip de Captures d'Écran : Un carrousel horizontal rafraîchi toutes les secondes affiche le visuel exact du navigateur distant Chromium.  Console Log Terminal : Sortie brute des logs système du worker Playwright.  Rapport Allure Interactif de Fin de Session : Génération immédiate d'un rapport complet post-test intégrant le graphe de répartition des erreurs, le temps d'exécution global, et l'option d'export du livrable final au format PDF.  3. Le Moteur de Génération IA (Gemini 2.5 Flash)Le réacteur logique de Spirale s'appuie sur le modèle de langage Gemini 2.5 Flash de Google.Paramétrage du Contexte et des Limites de TokensAfin de permettre l'exécution stable de scénarios de tests d'endurance d'envergure industrielle sans troncature de réponse, le paramètre maxOutputTokens a été doublé pour atteindre la valeur maximale autorisée de 16 384 tokens. Le prompt système intègre l'ensemble du catalogue des 100 actions Playwright autorisées.  Algorithme de Génération StructuréeL'IA est forcée de répondre selon un schéma JSON strict sous forme d'un tableau d'objets structurés, évitant ainsi toute prose descriptive ou sortie non interprétable par le parseur de commandes.JSON{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SpiraleAutomationSuite",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "action": { "type": "string" },
      "selector": { "type": "string" },
      "value": { "type": "string" },
      "options": {
        "type": "object",
        "properties": {
          "x": { "type": "integer" },
          "y": { "type": "integer" },
          "timeout": { "type": "integer" }
        }
      }
    },
    "required": ["id", "action"]
  }
}
4. Le Catalogue Exhaustif des 100 Actions PlaywrightVoici la spécification rigoureuse des 100 commandes atomiques supportées nativement par l'agent IA de Spirale.  I. Entrées Formulaires (Form Input) — 15 Actions   Nom Technique (action)Paramètres RequisDescription Comportementalefill   selector, valueÉcrase le contenu textuel actuel d'un champ par la valeur spécifiée.  clear   selectorVide l'intégralité d'un champ de saisie HTML.  append   selector, valuePositionne le curseur en fin de champ et ajoute la valeur textuelle.  press_sequentially   selector, valueSaisie caractère par caractère avec décalage de temps aléatoire (frappe humaine).  select_option   selector, valueSélectionne une entrée dans une balise <select> par valeur ou libellé.  check   selectorCoche une case (checkbox) ou un bouton radio si non coché.  uncheck   selectorDécoche un élément de type case à cocher.  select_multiple_options   selector, value (array)Sélection multiple au sein d'une liste HTML ordonnée.  fill_date   selector, valueRenseigne un sélecteur natif de type date (YYYY-MM-DD).  fill_time   selector, valueAligne un champ de type heure sur le format HH:MM.  upload_file   selector, value (path)Injecte un fichier local au niveau d'un noeud d'entrée d'upload.  upload_multiple_files   selector, value (array)Injecte un lot de fichiers simultanés dans un input multi-fichiers.  remove_file   selectorSupprime la sélection de fichier en cours d'un nœud d'upload.  interact_slider   selector, valueAjuste la position d'un slider HTML5 (type range) à la valeur cible.  toggle_switch   selectorChange l'état logique d'un interrupteur ou switch binaire.  II. Actions de Souris & Tactiles (Mouse & Touch) — 15 Actions Nom Technique (action)Paramètres RequisDescription Comportementaleclick   selectorDéclenche un événement click standard sur l'élément ciblé.  double_click   selectorEffectue un double-clic rapide sur l'élément.  right_click   selectorEffectue un clic droit pour ouvrir le menu contextuel natif.  drag_and_drop   selector (source), value (target)Glisse l'élément source et le relâche au-dessus de l'élément cible.  scroll_to_element   selectorFait défiler la page jusqu'à rendre l'élément entièrement visible à l'écran.  hover   selectorPositionne le pointeur de la souris au centre du sélecteur sans cliquer.  mouse_down   selectorMaintient le clic gauche enfoncé sur l'élément ciblé.  mouse_up   selectorRelâche la pression du bouton de la souris.  click_coordinates   options: {x, y}Simule un clic matériel aux coordonnées de pixels absolues $(X, Y)$.  scroll_down   value (pixels)Déplace le viewport vers le bas de la quantité de pixels fournie.  scroll_up   value (pixels)Déplace le viewport vers le haut de la quantité de pixels fournie.  scroll_to_bottom   AucunRéalise un défilement complet immédiat vers le bas de la page web.  scroll_to_top   AucunRéalise un défilement complet immédiat vers le haut de la page web.  touch_tap   selectorSimule un tap tactile unique (utile pour les interfaces mobiles).  touch_long_press   selectorSimule un appui tactile prolongé sur un élément mobile.  III. Clavier (Keyboard) — 10 Actions Nom Technique (action)Paramètres RequisDescription Comportementalepress_key   selector, value (key)Appuie et relâche une touche du clavier (ex: Enter, Escape).  focus   selectorPositionne le focus de la page sur l'élément HTML spécifié.  blur   selectorSupprime le focus de l'élément actif actuel.  keyboard_down   value (key)Maintient une touche enfoncée de manière continue (ex: Shift, Control).  keyboard_up   value (key)Relâche la touche du clavier qui était maintenue enfoncée.  press_combination   value (combinaison)Exécute un raccourci clavier combiné (ex: Control+A, Control+C).  press_backspace   selectorEnvoie une commande d'effacement arrière sur l'élément ciblé.  press_tab   AucunSimule l'appui de la touche Tabulation pour basculer à l'élément suivant.  press_arrow_down   selectorEnvoie la commande Flèche Bas (idéal pour naviguer dans une auto-complétion).  press_arrow_up   selectorEnvoie la commande Flèche Haut.  IV. Assertions & Validations (Assertions) — 20 Actions Nom Technique (action)Paramètres RequisDescription Comportementaleassert_visible   selectorValide la visibilité effective de l'élément dans le viewport actuel.  assert_not_visible   selectorValide l'absence ou le masquage complet de l'élément ciblé.  assert_value   selector, valueVérifie la correspondance exacte de la valeur interne d'un champ d'entrée.  assert_attribute   selector, value (attr:val)Valide la valeur d'un attribut HTML spécifique d'un nœud du DOM.  assert_count   selector, value (int)Valide le compte exact d'éléments correspondants à la requête du sélecteur.  assert_text_contains   selector, valueVérifie la présence d'une sous-chaîne de caractères dans l'élément.  assert_text_equals   selector, valueVérifie la correspondance exacte de la chaîne textuelle de l'élément.  assert_enabled   selectorConfirme que l'élément HTML est actif et ouvert aux interactions.  assert_disabled   selectorConfirme le blocage structurel (attribut disabled) de l'élément.  assert_checked   selectorValide l'état coché d'une case de type checkbox ou radio.  assert_not_checked   selectorValide l'état non coché d'un élément de type checkbox.  assert_url   valueValide la correspondance stricte de la chaîne d'URL actuelle du navigateur.  assert_url_contains   valueVérifie l'inclusion d'un segment d'intérêt au sein de l'URL courante.  assert_title   valueValide l'égalité du titre global de la page web (balise <title>).  assert_focused   selectorVérifie si l'élément ciblé détient le focus d'entrée de la page.  assert_empty   selectorValide le fait qu'un élément ou conteneur ne contient aucun texte.  assert_css_property   selector, value (prop:val)Analyse le style calculé de l'élément pour valider une règle CSS spécifique.  assert_image_loaded   selectorInspecte l'état du nœud <img> pour s'assurer que la ressource est chargée.  assert_cookie_exists   value (nom)Parcourt le stockage des cookies à la recherche du nom spécifié.  assert_local_storage_key   value (cle)Valide l'existence d'une entrée désignée au sein du LocalStorage.  V. Navigation & Fenêtres (Navigation & Windows) — 15 Actions   Nom Technique (action)Paramètres RequisDescription ComportementaleMaps   value (url)Initie le chargement de l'URL cible fournie par l'utilisateur.  go_back   AucunDéclenche l'action native "Précédent" du navigateur.  go_forward   AucunDéclenche l'action native "Suivant" du navigateur.  refresh   AucunForce le rafraîchissement standard (F5) de la page active.  wait_for_navigation   AucunSuspend l'exécution jusqu'à la résolution complète du changement d'URL.  open_new_tab   AucunCrée et bascule sur un nouvel onglet vierge au sein du contexte de navigation.  switch_to_tab   value (index/titre)Aligne le focus de contrôle de l'agent sur l'onglet identifié.  close_current_tab   AucunDétruit l'onglet actuellement actif.  switch_to_iframe   selectorBascule le contexte d'exécution à l'intérieur d'un élément <iframe>.  switch_to_main_frame   AucunRéinitialise le contexte d'exécution vers l'arbre HTML parent principal.  set_viewport_size   value (largeur x hauteur)Redimensionne le viewport (ex: 375x812 pour mobile, 1920x1080 pour desktop).  reload_forced   AucunRafraîchit la page active en forçant le vidage du cache du navigateur.  intercept_request_block   value (pattern)Bloque les requêtes réseau correspondantes (ex: scripts d'analytics, images).  emulate_dark_mode   AucunForce la simulation des règles CSS média liées au mode sombre.  close_browser   AucunTermine la session de test en fermant l'instance Chromium sous-jacente.  VI. Attentes Conditionnelles (Waits) — 10 Actions Nom Technique (action)Paramètres RequisDescription Comportementalewait_for_selector   selectorInterrompt la suite d'actions jusqu'à l'injection de l'élément dans la page.  wait_for_selector_hidden   selectorAttend que le sélecteur cible disparaisse de l'écran (ex: loaders/spinners).  wait_for_timeout   value (ms)Effectue une pause forcée pendant la durée spécifiée en millisecondes.  wait_for_load_state_dom   AucunBloque le thread jusqu'à la résolution de l'événement domcontentloaded.  wait_for_load_state_network   AucunAttend l'absence totale d'activité réseau (networkidle, idéal pour les SPA).  wait_for_function   value (JS inline)Attend que le script JavaScript personnalisé fourni retourne la valeur true.  wait_for_url   valueMarque un temps d'arrêt jusqu'à atteindre l'URL ou le pattern d'URL attendu.  wait_for_attached   selectorAttend l'attachement structurel du nœud au sein du DOM (indépendamment du style).  wait_for_detached   selectorAttend le détachement complet de l'élément HTML de l'arbre du document.  wait_for_text   selector, valueInterrompt l'exécution jusqu'à ce que le texte spécifié apparaisse dans l'élément.  VII. Interactions Système & Avancées (System & Dialogs) — 15 Actions Nom Technique (action)Paramètres RequisDescription Comportementaleaccept_dialog   AucunIntercepte et accepte automatiquement une boîte de dialogue ou une alerte système.  dismiss_dialog   AucunFerme ou refuse une alerte de type pop-up système du navigateur.  fill_dialog_prompt   valueSaisit le texte spécifié au sein d'une invite système avant validation.  take_screenshot_page   AucunCapture la zone d'affichage visible actuelle sous forme d'image.  take_screenshot_element   selectorIsole l'élément ciblé par le sélecteur pour en faire une capture dédiée.  take_screenshot_full_page   AucunRéalise une capture d'écran sur toute la hauteur de la page (défilement inclus).  get_text_content   selectorExtrait le texte d'un nœud HTML et le stocke en vue d'une réutilisation ultérieure.  get_attribute_value   selector, value (attr)Extrait la valeur de l'attribut désigné pour alimenter le registre de test.  clear_cookies   AucunPurge l'ensemble des cookies stockés pour simuler une nouvelle session utilisateur.  clear_local_storage   AucunSupprime l'intégralité des paires clés-valeurs présentes dans le LocalStorage.  clear_session_storage   AucunRéinitialise le conteneur d'état temporaire lié au SessionStorage.  execute_javascript   value (code)Exécute un script JavaScript personnalisé directement dans le contexte de la page.  mock_api_response   value (url:json)Intercepte un point de terminaison réseau pour y injecter une fausse réponse.  emulate_geolocation   options: {x, y}Modifie les coordonnées GPS simulées par le navigateur pour le test.  generate_pdf_report   AucunUtilise le moteur d'impression Chromium pour générer un fichier PDF du rapport.  5. Moteur d'Exécution Résilient & Optimisations Anti-FlakyAfin de garantir une exécution stable sur des parcours utilisateur complexes et des sessions de tests prolongées (jusqu'à 3000 étapes), le noyau d'automatisation intègre des mécanismes avancés de synchronisation et de tolérance aux pannes.  A. Ajustement des Seuils de Tolérance (Timeouts Réhaussés)Délai d'attente des éléments : Rehaussé de $8\text{ s} \to \mathbf{20\text{ s}}$ afin de compenser les retards de rendu des applications lourdes sous charge ou en environnement de staging.  Délai d'attente de navigation : Porté à $\mathbf{30\text{ s}}$ pour sécuriser les redirections complexes à travers des passerelles d'authentification tierces.  B. Algorithme d'Exécution Séquentielle StricteLe moteur de test applique une règle de non-chevauchement des actions : aucune étape ne s'exécute tant que la précédente n'a pas renvoyé une promesse résolue avec succès.  TypeScript// Implémentation du cœur de l'exécuteur séquentiel résilient
async function executeSuite(steps: TestStep[], page: Page) {
  for (const step of steps) {
    try {
      await executeSingleStep(step, page);
    } catch (error) {
      console.error(`Échec critique à l'étape ${step.id} [${step.action}]:`, error);
      throw error;
    }
  }
}
C. Stabilisation Automatique du DOM (Hooks Pré/Post Action)Chaque interaction élémentaire générée par l'IA applique automatiquement un cycle de validation à deux niveaux :Garantie de Visibilité Pré-Action : Avant toute interaction, le moteur attend explicitement que l'élément ciblé soit visible à l'écran.  Stabilisation Post-Action : Pour chaque appel à la méthode click, le moteur suspend la suite de l'exécution jusqu'à la résolution complète du cycle de rafraîchissement du DOM via l'écouteur waitForLoadState('domcontentloaded').  6. Scénarios de Test d'Endurance StandardisésLes scénarios suivants servent de jeux de test pour valider la robustesse de l'infrastructure face à des charges d'exécution prolongées.  Scénario 1 : Validation de Charge & Interactions Sociales (OrangeHRM)   Ce script teste un parcours utilisateur complet au sein d'une application d'entreprise, incluant l'authentification, la publication de contenus à forte répétition et la navigation à travers différents modules.  TypeScriptimport { test, expect } from '@playwright/test';

test('Scénario Endurance OrangeHRM', async ({ page }) => {
  // 1. Authentification globale
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login'); // [cite: 222]
  await page.locator('input[name="username"]').click(); // [cite: 223]
  await page.locator('input[name="username"]').fill('Admin'); // [cite: 224]
  await page.locator('input[name="password"]').click(); // [cite: 225]
  await page.locator('input[name="password"]').fill('admin123'); // [cite: 226]
  await page.locator('button[type="submit"]').click(); // [cite: 227]
  await page.waitForLoadState('domcontentloaded'); // [cite: 228]

  // 2. Navigation vers le fil d'actualité (Buzz)
  await page.locator('text=Buzz').click(); // [cite: 229]
  await page.waitForLoadState('networkidle'); // [cite: 230]

  // 3. Premier cycle de publication
  await page.locator('textarea.oxd-buzz-post-input').click(); // [cite: 231]
  await page.locator('textarea.oxd-buzz-post-input').fill('Test de publication automatique pour validation QA'); // [cite: 232]
  await page.locator('button[type="submit"]').click(); // [cite: 233]
  await page.waitForTimeout(2000); // Attente de la confirmation de succès [cite: 234]

  // 4. Exploration des onglets et interactions sociales
  await page.locator('text=Most Recent Photos').click(); // [cite: 236]
  await page.locator('text=Share Video').click(); // [cite: 237]
  await page.locator('text=Most Recent Posts').click(); // [cite: 238]
  await page.locator('.oxd-buzz-post-action-icon').first().click(); // Like du premier post [cite: 239]
  await page.locator('text=Comment').first().click(); // [cite: 240]
  await page.locator('input[placeholder="Write your comment..."]').fill('Super post !'); // [cite: 241]
  await page.keyboard.press('Enter'); // [cite: 242]

  // 5. Navigation historique et rafraîchissement
  await page.locator('.oxd-buzz-post-user-name').first().click(); // Profil de l'auteur [cite: 243]
  await page.goBack(); // [cite: 244]
  await page.locator('text=Dashboard').click(); // Refresh via Dashboard [cite: 245]
  await page.locator('text=Buzz').click(); // Retour au module Buzz [cite: 246]

  // 6. Deuxième cycle de publication (Test de charge)
  await page.locator('textarea.oxd-buzz-post-input').click(); // [cite: 247]
  await page.locator('textarea.oxd-buzz-post-input').fill('Deuxième message de test de charge'); // [cite: 248]
  await page.locator('button[type="submit"]').click(); // [cite: 249]
  await page.locator('.oxd-buzz-post-actions-share').first().click(); // Partage [cite: 250]
  await page.evaluate(() => window.scrollBy(0, 500)); // Scroll down [cite: 251]
  await page.evaluate(() => window.scrollBy(0, -500)); // Scroll up [cite: 252]

  // 7. Interactions secondaires sur le second post
  await page.locator('text=Most Recent Photos').click(); // [cite: 253]
  await page.locator('text=Most Recent Posts').click(); // [cite: 254]
  await page.locator('.oxd-buzz-post-action-icon').nth(1).click(); // Like du deuxième post [cite: 255]
  await page.locator('text=Comment').nth(1).click(); // [cite: 256]
  await page.locator('input[placeholder="Write your comment..."]').fill('Merci pour le partage'); // [cite: 257]
  await page.keyboard.press('Enter'); // [cite: 258]

  // 8. Troisième cycle de publication et pop-ups système
  await page.locator('text=Dashboard').click(); // [cite: 259]
  await page.locator('text=Buzz').click(); // [cite: 260]
  await page.locator('textarea.oxd-buzz-post-input').click(); // [cite: 261]
  await page.locator('textarea.oxd-buzz-post-input').fill('Troisième texte de test'); // [cite: 262]
  await page.locator('button[type="submit"]').click(); // [cite: 263]
  await page.evaluate(() => window.scrollBy(0, 400)); // [cite: 264]
  
  await page.locator('.oxd-userdropdown-name').click(); // Menu profil [cite: 265]
  await page.locator('text=About').click(); // [cite: 266]
  await page.locator('text=×').click(); // Fermeture de la modale "About" [cite: 267]
  
  await page.locator('.oxd-userdropdown-name').click(); // [cite: 268]
  await page.locator('text=Support').click(); // [cite: 269]
  await page.goBack(); // [cite: 270]

  // 9. Quatrième et cinquième cycles séquentiels de publication
  await page.locator('text=Buzz').click(); // [cite: 271]
  await page.locator('textarea.oxd-buzz-post-input').click(); // [cite: 272]
  await page.locator('textarea.oxd-buzz-post-input').fill('Quatrième texte de test'); // [cite: 273]
  await page.locator('button[type="submit"]').click(); // [cite: 274]
  await page.locator('.oxd-buzz-post-action-icon').nth(2).click(); // Like du troisième post [cite: 275]
  
  await page.locator('text=Dashboard').click(); // [cite: 276]
  await page.locator('text=Buzz').click(); // [cite: 277]
  await page.locator('textarea.oxd-buzz-post-input').click(); // [cite: 278]
  await page.locator('textarea.oxd-buzz-post-input').fill('Cinquième texte de test'); // [cite: 279]
  await page.locator('button[type="submit"]').click(); // [cite: 280]
  
  await page.locator('text=Share Video').click(); // [cite: 281]
  await page.locator('text=Most Recent Posts').click(); // [cite: 282]
  await page.evaluate(() => window.scrollBy(0, 400)); // [cite: 283]
  await page.locator('.oxd-buzz-post-action-icon').nth(3).click(); // Like du quatrième post [cite: 284]

  // 10. Cycles finaux de montée en charge (Publications 6 à 10)
  for (const [index, text] of [
    ['Sixième', 'Sixième texte de test'], // [cite: 288]
    ['Septième', 'Septième texte de test'], // [cite: 296]
    ['Huitième', 'Huitième texte de test'], // [cite: 302]
    ['Neuvième', 'Neuvième texte de test'] // [cite: 311]
  ].entries()) {
    await page.locator('text=Dashboard').click(); // [cite: 285, 299, 308]
    await page.locator('text=Buzz').click(); // [cite: 286, 294, 300, 309]
    await page.locator('textarea.oxd-buzz-post-input').click(); // [cite: 287, 295, 301, 310]
    await page.locator('textarea.oxd-buzz-post-input').fill(text); // [cite: 288, 296, 302, 311]
    await page.locator('button[type="submit"]').click(); // [cite: 289, 297, 303, 312]
    if(index === 0) {
      await page.evaluate(() => window.scrollBy(0, -400)); // [cite: 290]
      await page.locator('.oxd-userdropdown-name').click(); // [cite: 291]
      await page.locator('text=About').click(); // [cite: 292]
      await page.locator('text=×').click(); // [cite: 293]
    } else if(index === 1) {
      await page.locator('.oxd-buzz-post-action-icon').nth(4).click(); // [cite: 298]
    } else if(index === 2) {
      await page.evaluate(() => window.scrollBy(0, 400)); // [cite: 304]
      await page.locator('text=Most Recent Photos').click(); // [cite: 305]
      await page.locator('text=Most Recent Posts').click(); // [cite: 306]
      await page.locator('.oxd-buzz-post-action-icon').nth(5).click(); // [cite: 307]
    }
  }

  // Étape finale : Dixième texte de test et fermeture de session
  await page.locator('textarea.oxd-buzz-post-input').click(); // [cite: 313]
  await page.locator('textarea.oxd-buzz-post-input').fill('Dixième texte de test final'); // [cite: 314]
  await page.locator('button[type="submit"]').click(); // [cite: 315]
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // Scroll complet bas [cite: 316]
  await page.evaluate(() => window.scrollTo(0, 0)); // Scroll complet haut [cite: 317]
  
  // Déconnexion
  await page.locator('.oxd-userdropdown-name').click(); // [cite: 318]
  await page.locator('text=Logout').click(); // [cite: 319]
  await expect(page).toHaveURL(/.*login/); // [cite: 320]
});
Scénario 2 : Simulation E-Commerce E2E Complexe (SauceDemo Shopify)   Ce scénario valide les enchaînements d'actions de recherche, l'analyse des tris dynamiques et la manipulation fine des structures du panier d'achat.  TypeScriptimport { test, expect } from '@playwright/test';

test('Scénario E-Commerce SauceDemo Shopify', async ({ page }) => {
  // 1. Initialisation et première recherche de produit
  await page.goto('https://sauce-demo.myshopify.com/'); // [cite: 322]
  await page.locator('input[type="search"]').click(); // [cite: 323]
  await page.locator('input[type="search"]').fill('Shirt'); // [cite: 324]
  await page.keyboard.press('Enter'); // [cite: 325]
  await page.locator('.product-card').first().click(); // [cite: 326]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 327]
  await page.locator('.drawer__close').click({ timeout: 2000 }).catch(() => {}); // Fermeture tiroir panier si existant [cite: 328]

  // 2. Recherche secondaire et sélection
  await page.locator('input[type="search"]').click(); // [cite: 329]
  await page.locator('input[type="search"]').fill('Pants'); // [cite: 330]
  await page.keyboard.press('Enter'); // [cite: 331]
  await page.locator('.product-card').first().click(); // [cite: 332]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 333]

  // 3. Navigation catalogue directe et ajout ciblé
  await page.locator('text=Catalog').first().click(); // [cite: 334]
  await page.locator('text=Sauce Labs Backpack').click(); // [cite: 335]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 336]

  // 4. Édition et ajustement des quantités du panier
  await page.locator('.cart-icon-container').click(); // Ouvrir le panier [cite: 337]
  await page.locator('.quantity__button[name="plus"]').first().click(); // Quantité + 1 [cite: 338]
  await page.locator('.quantity__button[name="minus"]').first().click(); // Quantité - 1 [cite: 339]
  await page.locator('.cart__remove').nth(1).click(); // Suppression du deuxième élément [cite: 340]

  // 5. Parcours de désistement d'achat (Checkout Abandonment)
  await page.locator('.site-header__logo-link').click(); // Retour Accueil [cite: 341]
  await page.locator('input[type="search"]').click(); // [cite: 342]
  await page.locator('input[type="search"]').fill('Jacket'); // [cite: 343]
  await page.keyboard.press('Enter'); // [cite: 344]
  await page.locator('.product-card').first().click(); // [cite: 345]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 346]
  await page.locator('.cart-icon-container').click(); // [cite: 347]
  await page.locator('button[name="checkout"]').click(); // [cite: 348]
  await page.locator('.site-header__logo-link').click(); // Annulation et retour à l'accueil [cite: 349]

  // 6. Tri de catalogue complexe et validation des extrêmes (Low to High / High to Low)
  await page.locator('text=Catalog').first().click(); // [cite: 351]
  await page.locator('select#SortBy').selectOption('price-ascending'); // Price, low to high [cite: 352, 353]
  await page.locator('.product-card').first().click(); // [cite: 354]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 355]
  
  await page.locator('text=Catalog').first().click(); // [cite: 356]
  await page.locator('select#SortBy').selectOption('price-descending'); // Price, high to low [cite: 357]
  await page.locator('.product-card').first().click(); // [cite: 358]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 359]

  // 7. Opérations itératives complémentaires sur le panier et recherche transversale
  await page.locator('.cart-icon-container').click(); // [cite: 360]
  await page.locator('.quantity__button[name="plus"]').last().click(); // [cite: 361]
  await page.locator('input[type="search"]').click(); // [cite: 362]
  await page.locator('input[type="search"]').fill('Hat'); // [cite: 363]
  await page.keyboard.press('Enter'); // [cite: 364]
  await page.locator('.product-card').first().click(); // [cite: 365]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 366]
  await page.locator('.site-header__logo-link').click(); // [cite: 367]

  // 8. Exploration multi-produits
  await page.locator('text=Catalog').first().click(); // [cite: 369]
  await page.locator('.product-card').nth(1).click(); // Deuxième produit [cite: 370]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 371]
  await page.locator('.cart-icon-container').click(); // [cite: 372]
  await page.locator('button[name="checkout"]').click(); // [cite: 373]
  await page.goBack(); // [cite: 374]

  // 9. Nettoyage partiel et ré-injection d'éléments (Hoodie, Socks, Bag)
  await page.locator('.cart__remove').first().click(); // [cite: 375]
  await page.locator('.cart__remove').first().click(); // [cite: 376]
  
  const searchItems = ['Hoodie', 'Socks', 'Bag']; // [cite: 378, 391, 403]
  for (const [i, item] of searchItems.entries()) {
    await page.locator('input[type="search"]').click(); // [cite: 377, 390, 402]
    await page.locator('input[type="search"]').fill(item); // [cite: 378, 391, 403]
    await page.keyboard.press('Enter'); // [cite: 379, 392, 404]
    await page.locator('.product-card').first().click(); // [cite: 380, 393, 405]
    await page.locator('button:has-text("Add to cart")').click(); // [cite: 381, 394, 406]
    
    if (i === 0) {
      await page.locator('.site-header__logo-link').click(); // [cite: 382]
      await page.locator('text=Catalog').first().click(); // [cite: 383]
      await page.evaluate(() => window.scrollBy(0, 600)); // [cite: 384]
      await page.locator('.product-card').nth(2).click(); // Troisième produit [cite: 385]
      await page.locator('button:has-text("Add to cart")').click(); // [cite: 386]
      await page.locator('.cart-icon-container').click(); // [cite: 387]
      await page.locator('.quantity__button[name="plus"]').first().click(); // [cite: 388]
      await page.locator('.quantity__button[name="minus"]').first().click(); // [cite: 389]
    } else if (i === 1) {
      await page.locator('text=Catalog').first().click(); // [cite: 395]
      await page.locator('.product-card').nth(3).click(); // Quatrième produit [cite: 396]
      await page.locator('button:has-text("Add to cart")').click(); // [cite: 397]
      await page.locator('.cart-icon-container').click(); // [cite: 398]
      await page.locator('button[name="checkout"]').click(); // [cite: 399]
      await page.goBack(); // [cite: 400]
      await page.locator('.site-header__logo-link').click(); // [cite: 401]
    } else if (i === 2) {
      await page.locator('text=Catalog').first().click(); // [cite: 407]
      await page.evaluate(() => window.scrollTo(0, 0)); // Scroll haut [cite: 408]
      await page.locator('.product-card').nth(4).click(); // Cinquième produit [cite: 409]
      await page.locator('button:has-text("Add to cart")').click(); // [cite: 410]
    }
  }

  // 10. Purge complète itérative du panier et validation finale
  await page.locator('.cart-icon-container').click(); // [cite: 411]
  let removes = await page.locator('.cart__remove').all();
  while (removes.length > 0) {
    await removes[0].click();
    await page.waitForTimeout(500);
    removes = await page.locator('.cart__remove').all();
  } // Suppression un par un [cite: 412]

  await page.locator('text=Continue shopping').click(); // [cite: 413]
  await page.locator('input[type="search"]').click(); // [cite: 414]
  await page.locator('input[type="search"]').fill('T-shirt'); // [cite: 415]
  await page.keyboard.press('Enter'); // [cite: 416]
  await page.locator('.product-card').first().click(); // [cite: 417]
  await page.locator('button:has-text("Add to cart")').click(); // [cite: 418]
  await page.locator('.cart-icon-container').click(); // [cite: 419]
  
  // Validation du total et finalisation du checkout
  await expect(page.locator('.cart__subtotal')).toBeVisible(); // [cite: 420]
  await page.locator('button[name="checkout"]').click(); // [cite: 421]
  await page.context().close(); // Fermeture finale de l'onglet [cite: 422]
});
7. Installation, Configuration & DéploiementPrérequis SystèmesRuntime : Node.js v18.x ou supérieur.Moteur d'automatisation : Playwright nécessite les dépendances système de Chromium pour s'exécuter en mode conteneurisé Linux (Debian/Ubuntu).Variables d'Environnement Configuration (.env)Crée un fichier .env à la racine de ton sous-dossier /server :Extrait de codePORT=5000
GEMINI_API_KEY=AIzaSyYourKeyFromGoogleAIStudio
NODE_ENV=production
PLAYWRIGHT_HEADLESS=true
  Script d'Installation Étape par ÉtapeCloner le dépôt officiel :Bashgit clone https://github.com/yourusername/spirale.git
cd spirale
Déployer et lier les dépendances du Frontend (React) :Bashcd src
npm install
Déployer le Backend et configurer les binaires de Chromium :Bashcd ../server
npm install
npx playwright install chromium --with-deps
Lancer la suite applicative en mode Développement :Pour démarrer le serveur d'API Express : npm run dev (depuis le dossier /server).Pour démarrer le serveur d'affichage Vite : npm run dev (depuis le dossier /src).🛠️ Contribution & LicenceLes contributions visant à enrichir la bibliothèque d'actions ou à optimiser les couches de l'orchestrateur SSE sont les bienvenues. Ce projet est distribué sous licence MIT.
