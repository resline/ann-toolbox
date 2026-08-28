/** Identyfikatory testowe modułu Energia. Nigdy nie wpisuj ich w testach wprost. */
export const energiaIds = {
  root: 'energia-root',

  bank: 'energia-bank',
  bankCount: 'energia-bank-count',
  bankToggle: 'energia-bank-toggle',
  bankClear: 'energia-bank-clear',
  bankList: 'energia-bank-list',

  actionSos: 'energia-action-sos',
  actionRoulette: 'energia-action-roulette',
  actionAdd: 'energia-action-add',

  filters: 'energia-filters',
  filter: (level: string) => `energia-filter-${level}`,
  filterEmpty: 'energia-filter-empty',
  filterReset: 'energia-filter-reset',
  menuEmpty: 'energia-menu-empty',

  section: (category: string) => `energia-section-${category}`,

  card: (id: string) => `energia-card-${id}`,
  cardOpen: (id: string) => `energia-card-open-${id}`,
  cardFavorite: (id: string) => `energia-card-favorite-${id}`,
  cardMenu: (id: string) => `energia-card-menu-${id}`,
  cardEdit: (id: string) => `energia-card-edit-${id}`,
  cardRemove: (id: string) => `energia-card-remove-${id}`,
  cardDone: (id: string) => `energia-card-done-${id}`,

  detail: 'energia-detail',
  detailDescription: 'energia-detail-description',
  detailDuration: 'energia-detail-duration',
  detailEnergy: 'energia-detail-energy',
  detailCategory: 'energia-detail-category',
  detailHistory: 'energia-detail-history',
  detailDone: 'energia-detail-done',

  roulette: 'energia-roulette',
  rouletteWheel: 'energia-roulette-wheel',
  rouletteSlice: (index: number) => `energia-roulette-slice-${index}`,
  rouletteSpin: 'energia-roulette-spin',
  rouletteResult: 'energia-roulette-result',
  rouletteAccept: 'energia-roulette-accept',
  rouletteAgain: 'energia-roulette-again',
  rouletteEmpty: 'energia-roulette-empty',
  rouletteReset: 'energia-roulette-reset',

  sos: 'energia-sos',
  sosStep: 'energia-sos-step',
  sosNext: 'energia-sos-next',
  sosDone: 'energia-sos-done',

  form: 'energia-form',
  formName: 'energia-form-name',
  formDescription: 'energia-form-description',
  formDuration: 'energia-form-duration',
  formSubmit: 'energia-form-submit',
} as const;
