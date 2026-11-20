// Questionnaire, expériences et certifications par défaut du tunnel.
// Modifiables depuis Admin → CRM & RDV → Tunnel (enregistrés dans settings/tunnel).
(function () {
  const o = (id, label, extra) => Object.assign({ id, label }, extra || {});
  const q = (id, type, title, sub, options, extra) => Object.assign({ id, type, title, sub: sub || '', options: options || [] }, extra || {});
  const when = (qid, ...ids) => ({ if: { q: qid, in: ids } });
  const sub = (a, b) => Object.assign({}, a, b);

  window.QUIZ_DEFAULT = { questions: [
    q('goal', 'one', 'Enchanté {prenom} ! Quel est ton objectif ?', 'Choisis ce qui te correspond le plus.', [
      o('perf', 'Préparation physique & performance', { sub: 'Passer un cap dans ton sport ou revenir de blessure.', icon: '⚡' }),
      o('transfo', 'Transformation physique', { sub: 'Perdre du gras, prendre du muscle, durablement.', icon: '🔥' }),
      o('forme', 'Forme & bien-être', { sub: 'Retrouver de l’énergie et bouger sans douleur.', icon: '🌿' })
    ], { role: 'objectiveType' }),

    q('sportKind', 'one', 'Tu pratiques un sport collectif ou individuel ?', '', [o('co', 'Sport collectif'), o('ind', 'Sport individuel')], sub(when('goal', 'perf'), { grid: true, section: 'Ton sport' })),
    q('sportCo', 'one', 'Quel sport collectif ?', '', [o('rugby', 'Rugby'), o('foot', 'Football'), o('basket', 'Basket'), o('hand', 'Handball'), o('volley', 'Volley'), o('other', 'Autre', { other: true })], sub(when('sportKind', 'co'), { grid: true, otherPh: 'Lequel ?' })),
    q('posRugby', 'one', 'Tu joues à quel poste ?', 'Un avant et un trois-quarts ne se préparent pas pareil.', [o('p1', 'Pilier / talonneur'), o('p2', '2e ligne'), o('p3', '3e ligne'), o('p4', 'Demi de mêlée / ouverture'), o('p5', 'Centre'), o('p6', 'Ailier / arrière')], sub(when('sportCo', 'rugby'), { grid: true })),
    q('posFoot', 'one', 'Tu joues à quel poste ?', '', [o('p1', 'Gardien'), o('p2', 'Défenseur central'), o('p3', 'Latéral'), o('p4', 'Milieu'), o('p5', 'Attaquant')], sub(when('sportCo', 'foot'), { grid: true })),
    q('posBasket', 'one', 'Tu joues à quel poste ?', '', [o('p1', 'Meneur'), o('p2', 'Arrière / ailier'), o('p3', 'Intérieur')], sub(when('sportCo', 'basket'), { grid: true })),
    q('posHand', 'one', 'Tu joues à quel poste ?', '', [o('p1', 'Gardien'), o('p2', 'Ailier'), o('p3', 'Arrière / demi-centre'), o('p4', 'Pivot')], sub(when('sportCo', 'hand'), { grid: true })),
    q('posVolley', 'one', 'Tu joues à quel poste ?', '', [o('p1', 'Passeur'), o('p2', 'Réceptionneur-attaquant'), o('p3', 'Central'), o('p4', 'Pointu'), o('p5', 'Libéro')], sub(when('sportCo', 'volley'), { grid: true })),
    q('sportInd', 'one', 'Quel sport individuel ?', '', [o('judo', 'Judo / lutte'), o('boxe', 'Boxe / MMA'), o('run', 'Course / trail'), o('bike', 'Vélo / triathlon'), o('crossfit', 'CrossFit / Hyrox'), o('tennis', 'Tennis / padel'), o('golf', 'Golf'), o('other', 'Autre', { other: true })], sub(when('sportKind', 'ind'), { grid: true, otherPh: 'Lequel ?' })),
    q('weightCat', 'one', 'Tu combats dans une catégorie de poids ?', 'Faire le poids, ça se prépare.', [o('cut', 'Oui, et je dois faire le poids'), o('ok', 'Oui, sans souci de poids'), o('no', 'Non')], when('sportInd', 'judo', 'boxe')),
    q('enduranceFormat', 'one', 'Sur quel format ?', '', [o('short', 'Jusqu’à 10 km'), o('long', 'Semi ou marathon'), o('trail', 'Trail / ultra'), o('tri', 'Triathlon')], sub(when('sportInd', 'run', 'bike'), { grid: true })),
    q('perfLevel', 'one', 'À quel niveau tu pratiques ?', '', [o('l1', 'Loisir'), o('l2', 'Compétition régionale'), o('l3', 'Niveau national'), o('l4', 'Professionnel ou centre de formation')], sub(when('goal', 'perf'), { role: 'level', section: 'Ta pratique' })),
    q('perfGoal', 'many', 'Qu’est-ce que tu veux améliorer ?', 'Plusieurs choix possibles.', [o('force', 'Force'), o('speed', 'Vitesse / explosivité'), o('endu', 'Endurance / cardio'), o('prev', 'Prévenir les blessures'), o('back', 'Revenir de blessure'), o('season', 'Préparer ma saison')], when('goal', 'perf')),
    q('perfDeadline', 'one', 'Tu as une échéance ?', 'Compétition, reprise, sélection, test physique…', [o('d1', 'Dans moins d’un mois'), o('d2', 'Dans 1 à 3 mois'), o('d3', 'Dans plus de 3 mois'), o('d4', 'Pas d’échéance précise')], when('goal', 'perf')),
    q('perfNow', 'one', 'Comment tu te prépares aujourd’hui ?', '', [o('club', 'Seulement avec mon club'), o('self', 'Seul, avec mes propres séances'), o('online', 'Avec un programme trouvé en ligne'), o('none', 'Rien de spécifique')], when('goal', 'perf')),

    q('tGoal', 'one', 'Quelle transformation tu vises ?', '', [o('fat', 'Perdre du gras'), o('muscle', 'Prendre du muscle'), o('both', 'Les deux : perdre et me muscler'), o('tone', 'Me raffermir, me tonifier')], sub(when('goal', 'transfo'), { section: 'Ton objectif' })),
    q('tKg', 'one', 'Combien de kilos tu aimerais perdre ?', 'Approximativement, ça me donne un ordre d’idée.', [o('k1', 'Moins de 5 kg'), o('k2', '5 à 10 kg'), o('k3', '10 à 20 kg'), o('k4', 'Plus de 20 kg')], sub(when('tGoal', 'fat', 'both'), { grid: true })),
    q('tLevel', 'one', 'Tu fais du sport en ce moment ?', '', [o('l1', 'Pas du tout'), o('l2', '1 à 2 fois par semaine'), o('l3', '3 fois ou plus par semaine')], sub(when('goal', 'transfo'), { role: 'level' })),
    q('tTried', 'many', 'Qu’est-ce que tu as déjà essayé ?', 'Plusieurs choix possibles.', [o('diet', 'Des régimes'), o('gym', 'La salle, seul'), o('app', 'Une appli ou un programme en ligne'), o('coach', 'Un coach'), o('none', 'Rien encore', { excl: true })], when('goal', 'transfo')),
    q('tFood', 'one', 'Et ton alimentation, honnêtement ?', 'Aucun jugement : c’est juste notre point de départ.', [o('f1', 'Je ne fais pas vraiment attention'), o('f2', 'Plutôt équilibrée mais irrégulière'), o('f3', 'Je fais déjà attention'), o('f4', 'Beaucoup de repas sur le pouce ou au resto')], when('goal', 'transfo')),

    q('fGoal', 'many', 'Qu’est-ce qui compte le plus pour toi ?', 'Plusieurs choix possibles.', [o('energy', 'Plus d’énergie'), o('pain', 'Moins de douleurs'), o('sleep', 'Mieux dormir, moins de stress'), o('restart', 'Reprendre une activité'), o('age', 'Rester en forme en vieillissant')], sub(when('goal', 'forme'), { section: 'Ta forme' })),
    q('fPain', 'many', 'Où as-tu mal ?', 'Plusieurs choix possibles.', [o('back', 'Dos'), o('neck', 'Nuque / épaules'), o('knee', 'Genoux'), o('hip', 'Hanches'), o('other', 'Ailleurs')], when('fGoal', 'pain')),
    q('fLevel', 'one', 'Ton niveau d’activité actuel ?', '', [o('l1', 'Plutôt sédentaire'), o('l2', 'Un peu actif (marche, vélo…)'), o('l3', 'Actif régulièrement')], sub(when('goal', 'forme'), { role: 'level' })),
    q('fDay', 'one', 'À quoi ressemble ta journée type ?', '', [o('desk', 'Assis, au bureau'), o('phys', 'Debout ou physique'), o('shift', 'Horaires décalés'), o('home', 'À la maison, avec les enfants')], when('goal', 'forme')),
    q('fSleep', 'one', 'Comment tu dors ?', '', [o('good', 'Bien'), o('mid', 'Moyen'), o('bad', 'Mal')], sub(when('goal', 'forme'), { grid: true })),
    q('fPast', 'one', 'Tu as déjà fait du sport ?', '', [o('reg', 'Oui, régulièrement'), o('long', 'Il y a longtemps'), o('never', 'Jamais vraiment')], when('goal', 'forme')),

    q('age', 'one', 'Quel âge as-tu ?', '', [o('a1', 'Moins de 25 ans'), o('a2', '25 à 35 ans'), o('a3', '35 à 45 ans'), o('a4', '45 à 55 ans'), o('a5', 'Plus de 55 ans')], { grid: true, section: 'Ton quotidien' }),
    q('injury', 'one', 'Une blessure ou une douleur à prendre en compte ?', 'Opération, entorse, tendinite, mal de dos…', [o('no', 'Non, rien'), o('yes', 'Oui', { other: true })], { grid: true, otherPh: 'Dis-m’en plus (où, depuis quand…)' }),
    q('freq', 'one', 'Combien de séances par semaine c’est réaliste pour toi ?', 'Réaliste, pas idéal : on construit sur ta vraie vie.', [o('s2', '2'), o('s3', '3'), o('s4', '4'), o('s5', '5 ou plus')], { grid: true }),
    q('place', 'many', 'Où peux-tu t’entraîner ?', 'Plusieurs choix possibles.', [o('gym', 'En salle'), o('homeEq', 'À la maison avec du matériel'), o('home', 'À la maison sans matériel'), o('out', 'En extérieur'), o('club', 'Au club')]),
    q('blocker', 'many', 'Qu’est-ce qui t’a freiné jusqu’ici ?', 'Plusieurs choix possibles.', [o('time', 'Manque de temps'), o('results', 'Pas de résultats'), o('pain', 'Douleur ou blessure'), o('motiv', 'Motivation'), o('food', 'Nutrition'), o('start', 'Je ne sais pas par où commencer')], { role: 'blocker', optional: true, extraText: 'Autre chose ? (facultatif)', section: 'Ta motivation' }),
    q('objective', 'text', '{prenom}, dans 3 mois, qu’est-ce qui aura changé ?', 'En une phrase, avec tes mots. C’est ce qu’on travaillera ensemble.', [], { role: 'objective', placeholder: 'Ce que tu veux atteindre' }),
    q('why', 'text', 'Pourquoi maintenant ?', 'Ce qui te décide aujourd’hui (facultatif).', [], { optional: true, long: true, placeholder: 'Ex : un mariage cet été, une saison qui reprend, un déclic…' }),
    q('motivation', 'scale', 'Dernière question : sur 10, à quel point tu es prêt à t’y mettre ?', '', [], { low: 'Pas vraiment', high: 'À fond' })
  ] };

  window.EXP_DEFAULT = [
    { id: 'sca', name: 'Sporting Club Albigeois', detail: 'Rugby pro' },
    { id: 'to13', name: 'Toulouse Olympique XIII', detail: 'Super League' },
    { id: 'papa', name: 'Papa Inshape', detail: 'Coaching' },
    { id: 'r2', name: 'R2', detail: 'CrossFit' },
    { id: 'abd', name: 'ABD Coach', detail: 'Golf, judo…' },
    { id: 'volley', name: 'Volley', detail: 'Élite féminin · N3' }
  ];
  window.CERT_DEFAULT = [
    { id: 'master', name: 'Master STAPS', detail: 'Prépa physique et réathlétisation' },
    { id: 'ffr', name: 'CC PPR – FFR', detail: 'Préparateur physique rugby' },
    { id: 'exos', name: 'EXOS', detail: 'Performance Specialist' },
    { id: 'ffhm', name: 'BF1 Haltérophilie', detail: 'FFHM' }
  ];
})();
