import { DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#D7C7A1',
    primaryContainer: '#3A3223',
    onPrimaryContainer: '#F6EBD1',
    selectedOption: '#D7C7A1',
    onSelectedOption: '#18140D',
    optionSurface: '#26231F',
    optionBorder: '#4A4030',
    accent: '#7FA987',
    background: '#111111',
    surface: '#1A1A1A',
    surfaceVariant: '#26231F',
    text: '#F4EEE2',
    onSurface: '#F4EEE2',
    onBackground: '#F4EEE2',
    placeholder: '#9B9386',
    disabled: '#514B43',
    error: '#E57373',
    notification: '#D7C7A1',
    onPrimary: '#18140D',
    elevation: {
      level0: '#111111',
      level1: '#1A1A1A',
      level2: '#221F1B',
      level3: '#2A261F',
      level4: '#332D24',
      level5: '#3A3223',
    },
  },
  roundness: 8,
};

export default theme;
