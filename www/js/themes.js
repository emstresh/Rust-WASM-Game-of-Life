const themes = [
  [
    '#EA526F',
    '#FCEADE',
    '#FF8A5B',
    '#25CED1',
    '#FFFFFF'
  ],
  [
    '#56E39F',
    '#2A1F2D',
    '#58C1C9',
    '#59686D',
    '#3B2C35'
  ],
  [
    '#735290',
    '#363457',
    '#C4A69D',
    '#98A886',
    '#465C69'
  ]
];

const root = document.documentElement;

const theme = (function() {
  let self = {};

  let idx = 0;
  self.colors = [];

  self.set = (newTheme) => {
    root.style.setProperty('--alive-color', newTheme[0]);
    root.style.setProperty('--dead-color', newTheme[1]);
    root.style.setProperty('--primary-color', newTheme[2]);
    root.style.setProperty('--secondary-color', newTheme[3]);
    root.style.setProperty('--tertiary-color', newTheme[4]);
    self.colors = newTheme;
  };

  self.cycleTheme = () => {
    idx = (idx + 1) % themes.length;
    self.set(themes[idx]);
  };

  self.getValue = (varName) => ( root.style.getPropertyValue(varName) );

  self.set(themes[0]);
  return self;
})();

export { theme };
