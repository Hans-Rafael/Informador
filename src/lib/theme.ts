import { DarkTheme as NavDark, DefaultTheme as NavLight, type Theme as NavTheme } from 'expo-router';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

// Esquema Material 3 generado a partir del color de marca de InfoBarrio (turquesa, ver estudio UX).
const light = {
  primary: '#006874',
  onPrimary: '#FFFFFF',
  primaryContainer: '#97F0FF',
  onPrimaryContainer: '#001F24',
  secondary: '#4A6267',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#CDE7EC',
  onSecondaryContainer: '#051F23',
  tertiary: '#6B4FA0',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#EBDDFF',
  onTertiaryContainer: '#250059',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#FAFDFD',
  onBackground: '#191C1D',
  surface: '#FAFDFD',
  onSurface: '#191C1D',
  surfaceVariant: '#DBE4E6',
  onSurfaceVariant: '#3F484A',
  outline: '#6F797A',
  outlineVariant: '#BFC8CA',
  inverseSurface: '#2E3132',
  inverseOnSurface: '#EFF1F1',
  inversePrimary: '#4FD8EB',
};

const dark = {
  primary: '#4FD8EB',
  onPrimary: '#00363D',
  primaryContainer: '#004F58',
  onPrimaryContainer: '#97F0FF',
  secondary: '#B1CBD0',
  onSecondary: '#1C3438',
  secondaryContainer: '#334B4F',
  onSecondaryContainer: '#CDE7EC',
  tertiary: '#D3BBFF',
  onTertiary: '#3B1C70',
  tertiaryContainer: '#533687',
  onTertiaryContainer: '#EBDDFF',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  background: '#191C1D',
  onBackground: '#E1E3E3',
  surface: '#191C1D',
  onSurface: '#E1E3E3',
  surfaceVariant: '#3F484A',
  onSurfaceVariant: '#BFC8CA',
  outline: '#899294',
  outlineVariant: '#3F484A',
  inverseSurface: '#E1E3E3',
  inverseOnSurface: '#2E3132',
  inversePrimary: '#006874',
};

function mix(base: string, tint: string, amount: number) {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [a, b] = [parse(base), parse(tint)];
  const out = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `rgb(${out.join(', ')})`;
}

// Superficies elevadas de M3: la superficie teñida con el color primario.
function elevation(colors: typeof light) {
  const tint = (amount: number) => mix(colors.surface, colors.primary, amount);
  return {
    level0: 'transparent',
    level1: tint(0.05),
    level2: tint(0.08),
    level3: tint(0.11),
    level4: tint(0.12),
    level5: tint(0.14),
  };
}

export const paperLight: MD3Theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, ...light, elevation: elevation(light) },
};

export const paperDark: MD3Theme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, ...dark, elevation: elevation(dark) },
};

function toNav(base: NavTheme, paper: MD3Theme): NavTheme {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: paper.colors.primary,
      background: paper.colors.background,
      card: paper.colors.elevation.level2,
      text: paper.colors.onSurface,
      border: paper.colors.outlineVariant,
      notification: paper.colors.error,
    },
  };
}

export const navLight = toNav(NavLight, paperLight);
export const navDark = toNav(NavDark, paperDark);
