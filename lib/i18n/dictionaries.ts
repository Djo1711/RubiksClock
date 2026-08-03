export const locales = ['fr', 'en'] as const

export type Locale = (typeof locales)[number]

export type Dictionary = {
  appName: string
  tagline: string
  navTimer: string
  navHistory: string
  navLeaderboard: string
  navSignIn: string
  idleHint: string
  armingHint: string
  readyHint: string
  releaseHint: string
  inspectionLabel: string
  plus2Warning: string
  dnfWarning: string
  runningHint: string
  stoppedHint: string
  abortHint: string
  scramble: string
  newScramble: string
  scrambleLoading: string
  statsTitle: string
  best: string
  worst: string
  mo3: string
  ao5: string
  ao12: string
  sessionMean: string
  solveCount: string
  solvesTitle: string
  noSolves: string
  penaltyNone: string
  penaltyPlus2: string
  penaltyDnf: string
  deleteSolve: string
  clearSession: string
  clearSessionConfirm: string
  cancel: string
  settings: string
  settingsKeys: string
  settingsKeysHint: string
  settingsKeysCapture: string
  settingsKeysReset: string
  settingsHideTime: string
  settingsHideTimeHint: string
  settingsSounds: string
  settingsSoundsHint: string
  settingsLanguage: string
  ghostingHint: string
  comingSoonTitle: string
  comingSoonBody: string
  backToTimer: string
}

export const dictionaries: Record<Locale, Dictionary> = {
  fr: {
    appName: 'RubiksClock',
    tagline: 'Chronomètre de speedcubing aux règles WCA',
    navTimer: 'Chrono',
    navHistory: 'Historique',
    navLeaderboard: 'Classement',
    navSignIn: 'Se connecter',
    idleHint: 'Maintiens les six touches des deux mains',
    armingHint: 'Continue de maintenir…',
    readyHint: 'Prêt — relâche pour lancer l’inspection',
    releaseHint: 'Prêt — relâche pour démarrer le solve',
    inspectionLabel: 'Inspection',
    plus2Warning: '+2 : inspection dépassée',
    dnfWarning: 'DNF : plus de 17 secondes d’inspection',
    runningHint: 'Espace pour arrêter',
    stoppedHint: 'Maintiens les six touches pour le solve suivant',
    abortHint: 'Échap pour annuler',
    scramble: 'Mélange',
    newScramble: 'Nouveau mélange',
    scrambleLoading: 'Génération du mélange…',
    statsTitle: 'Statistiques de la session',
    best: 'Meilleur',
    worst: 'Pire',
    mo3: 'mo3',
    ao5: 'ao5',
    ao12: 'ao12',
    sessionMean: 'Moyenne',
    solveCount: 'Solves',
    solvesTitle: 'Solves de la session',
    noSolves: 'Aucun solve pour le moment.',
    penaltyNone: 'OK',
    penaltyPlus2: '+2',
    penaltyDnf: 'DNF',
    deleteSolve: 'Supprimer ce solve',
    clearSession: 'Vider la session',
    clearSessionConfirm: 'Supprimer tous les solves de cette session ?',
    cancel: 'Annuler',
    settings: 'Réglages',
    settingsKeys: 'Touches',
    settingsKeysHint:
      'Les touches sont lues par position physique, donc le même placement de doigts marche en AZERTY comme en QWERTY.',
    settingsKeysCapture: 'Appuie sur une touche…',
    settingsKeysReset: 'Rétablir Q Z D / L I J',
    settingsHideTime: 'Masquer le temps pendant le solve',
    settingsHideTimeHint: 'Comme en compétition : tu ne vois le temps qu’à la fin.',
    settingsSounds: 'Signaux sonores',
    settingsSoundsHint: 'Bips aux 8 et 12 secondes d’inspection (règles A3b1 et A3b2).',
    settingsLanguage: 'Langue',
    ghostingHint:
      'Ton clavier ne remonte pas les six touches en même temps ? Change-les dans les réglages.',
    comingSoonTitle: 'Bientôt disponible',
    comingSoonBody:
      'Cette page arrive avec les comptes utilisateurs. En attendant, tes solves sont enregistrés dans ce navigateur.',
    backToTimer: 'Retour au chrono',
  },
  en: {
    appName: 'RubiksClock',
    tagline: 'A speedcubing timer that plays by WCA rules',
    navTimer: 'Timer',
    navHistory: 'History',
    navLeaderboard: 'Leaderboard',
    navSignIn: 'Sign in',
    idleHint: 'Hold the six keys with both hands',
    armingHint: 'Keep holding…',
    readyHint: 'Ready — release to start inspection',
    releaseHint: 'Ready — release to start the solve',
    inspectionLabel: 'Inspection',
    plus2Warning: '+2: inspection exceeded',
    dnfWarning: 'DNF: inspection past 17 seconds',
    runningHint: 'Space to stop',
    stoppedHint: 'Hold the six keys for the next solve',
    abortHint: 'Escape to cancel',
    scramble: 'Scramble',
    newScramble: 'New scramble',
    scrambleLoading: 'Generating scramble…',
    statsTitle: 'Session statistics',
    best: 'Best',
    worst: 'Worst',
    mo3: 'mo3',
    ao5: 'ao5',
    ao12: 'ao12',
    sessionMean: 'Mean',
    solveCount: 'Solves',
    solvesTitle: 'Session solves',
    noSolves: 'No solves yet.',
    penaltyNone: 'OK',
    penaltyPlus2: '+2',
    penaltyDnf: 'DNF',
    deleteSolve: 'Delete this solve',
    clearSession: 'Clear session',
    clearSessionConfirm: 'Delete every solve in this session?',
    cancel: 'Cancel',
    settings: 'Settings',
    settingsKeys: 'Keys',
    settingsKeysHint:
      'Keys are read by physical position, so the same fingering works on AZERTY and QWERTY.',
    settingsKeysCapture: 'Press a key…',
    settingsKeysReset: 'Reset to Q Z D / L I J',
    settingsHideTime: 'Hide the time while solving',
    settingsHideTimeHint: 'Competition style: you only see the result at the end.',
    settingsSounds: 'Sound cues',
    settingsSoundsHint: 'Beeps at 8 and 12 seconds of inspection (A3b1 and A3b2).',
    settingsLanguage: 'Language',
    ghostingHint:
      'Keyboard not reporting all six keys at once? Remap them in the settings.',
    comingSoonTitle: 'Coming soon',
    comingSoonBody:
      'This page arrives with user accounts. Until then your solves are stored in this browser.',
    backToTimer: 'Back to the timer',
  },
}

export const LOCALE_STORAGE_KEY = 'rubiksclock.locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}
