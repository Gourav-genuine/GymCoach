import { DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00E5FF',
    accent: '#76FF03',
    background: '#0A0E1A',
    surface: '#141B2D',
    surfaceVariant: '#1E2740',
    text: '#EAEAEA',
    onSurface: '#EAEAEA',
    onBackground: '#EAEAEA',
    placeholder: '#8892A4',
    disabled: '#3A4560',
    error: '#FF5252',
    notification: '#00E5FF',
    onPrimary: '#000000',
    elevation: {
      level0: '#0A0E1A',
      level1: '#141B2D',
      level2: '#1E2740',
      level3: '#253050',
      level4: '#2C3860',
      level5: '#334070',
    },
  },
  roundness: 12,
};

export default theme;
