const theme1 = [
  '#8a5e4b',
  '#301c2a',
  '#5b1036',
  '#7c3e4f',
  '#bb9564'
];

const theme2 = [
  '#023C40',
  '#C3979F',
  '#0AD3FF',
  '#78FFD6',
  '#E1FAF9'
];

const root = document.documentElement;

const theme = (function() {
  let self = {};

  self.colors = null;

  self.set = (newTheme) => {
    root.style.setProperty('--alive-color', newTheme[0]);
    root.style.setProperty('--dead-color', newTheme[1]);
    root.style.setProperty('--primary-color', newTheme[2]);
    root.style.setProperty('--secondary-color', newTheme[3]);
    root.style.setProperty('--tertiary-color', newTheme[4]);
    self.colors = newTheme;
  };

  self.getValue = (varName) => ( root.style.getPropertyValue(varName) );

  self.set(theme1);
  return self;
})();

export { theme };
