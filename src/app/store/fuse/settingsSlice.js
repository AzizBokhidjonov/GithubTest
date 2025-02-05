import { createTheme, getContrastRatio } from '@mui/material/styles';
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import _ from '@lodash';
import {
  defaultSettings,
  defaultThemeOptions,
  extendThemeWithMixins,
  getParsedQuerySettings,
  mustHaveThemeOptions,
} from '@fuse/default-settings';
import settingsConfig from 'app/configs/settingsConfig';
import themeLayoutConfigs from 'app/theme-layouts/themeLayoutConfigs';
import { setUser, updateUserSettings } from 'app/store/userSlice';
import themesConfig, { darkPaletteText, lightPaletteText } from 'app/configs/themesConfig';

export const changeFuseTheme = (theme) => (dispatch, getState) => {
  const { fuse } = getState();
  const { settings } = fuse;

  const newSettings = {
    ...settings.current,
    theme: {
      main: theme,
      navbar: theme,
      toolbar: theme,
      footer: theme,
    },
  };

  dispatch(setDefaultSettings(newSettings));
};

function saveSettingsToLocalStorage(settings) {
  try {
    localStorage.setItem('fuseSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
}

function loadSettingsFromLocalStorage() {
  try {
    const settings = localStorage.getItem('fuseSettings');
    return settings ? JSON.parse(settings) : null;
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    return null;
  }
}

function getInitialSettings() {
  const defaultLayoutStyle = settingsConfig.layout && settingsConfig.layout.style ? settingsConfig.layout.style : 'layout1';
  const layout = {
    style: defaultLayoutStyle,
    config: themeLayoutConfigs[defaultLayoutStyle].defaults,
  };

  const initialSetting = {
    layout,
    theme: {
      main: themesConfig.defaultDark,
      navbar: themesConfig.defaultDark,
      toolbar: themesConfig.defaultDark,
      footer: themesConfig.defaultDark,
    },
    direction: 'ltr', // или загрузить из i18n
    defaultAuth: ['admin'], // например, дефолтная авторизация
    loginRedirectUrl: '/',
  };

  const loadedSettings = loadSettingsFromLocalStorage();
  return _.merge({}, defaultSettings, initialSetting, settingsConfig, getParsedQuerySettings(), loadedSettings);
}

export function generateSettings(_defaultSettings, _newSettings) {
  return _.merge({}, _defaultSettings, {layout: {config: themeLayoutConfigs[_newSettings?.layout?.style]?.defaults}}, _newSettings);
}

const initialSettings = getInitialSettings();

const initialState = {
  initial: initialSettings,
  defaults: _.merge({}, initialSettings),
  current: _.merge({}, initialSettings),
};

export const setDefaultSettings = createAsyncThunk(
  'fuse/settings/setDefaultSettings',
  async (val, { dispatch, getState }) => {
    const { fuse } = getState();
    const { settings } = fuse;
    const defaults = generateSettings(settings.defaults, val);

    dispatch(updateUserSettings(defaults));

    const updatedSettings = {
      ...settings,
      defaults: _.merge({}, defaults),
      current: _.merge({}, defaults),
    };

    saveSettingsToLocalStorage(updatedSettings.current);

    return updatedSettings;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action) => {
      const current = generateSettings(state.defaults, action.payload);
      
      saveSettingsToLocalStorage(current);

      return {
        ...state,
        current,
      };
    },

    setInitialSettings: (state) => {
      saveSettingsToLocalStorage(initialState.current);

      return _.merge({}, initialState);
    },
    resetSettings: (state) => {
      saveSettingsToLocalStorage(state.defaults);

      return {
        ...state,
        defaults: _.merge({}, state.defaults),
        current: _.merge({}, state.defaults),
      };
    },
  },
  extraReducers: {
    [setDefaultSettings.fulfilled]: (state, action) => {
      saveSettingsToLocalStorage(action.payload.current);

      return action.payload;
    },
    [setUser.fulfilled]: (state, action) => {
      const defaults = generateSettings(state.defaults, action.payload?.data?.settings);

      saveSettingsToLocalStorage(defaults);

      return {
        ...state,
        defaults: _.merge({}, defaults),
        current: _.merge({}, defaults),
      };
    },
  },
});

const getDirection = (state) => state.fuse.settings.current.direction;
const getMainTheme = (state) => state.fuse.settings.current.theme.main;
const getNavbarTheme = (state) => state.fuse.settings.current.theme.navbar;
const getToolbarTheme = (state) => state.fuse.settings.current.theme.toolbar;
const getFooterTheme = (state) => state.fuse.settings.current.theme.footer;

function generateMuiTheme(theme, direction) {
  const data = _.merge({}, defaultThemeOptions, theme, mustHaveThemeOptions);
  const response = createTheme(
    _.merge({}, data, {
      mixins: extendThemeWithMixins(data),
      direction,
    })
  );
  return response;
}

export const selectContrastMainTheme = (bgColor) => {
  function isDark(color) {
    return getContrastRatio(color, '#ffffff') >= 3;
  }
  return isDark(bgColor) ? selectMainThemeDark : selectMainThemeLight;
};

function changeThemeMode(theme, mode) {
  const modes = {
    dark: {
      palette: {
        mode: 'dark',
        divider: 'rgba(241,245,249,.12)',
        background: {
          paper: '#1E2125',
          default: '#121212',
        },
        text: darkPaletteText,
      },
    },
    light: {
      palette: {
        mode: 'light',
        divider: '#e2e8f0',
        background: {
          paper: '#FFFFFF',
          default: '#F7F7F7',
        },
        text: lightPaletteText,
      },
    },
  };

  return _.merge({}, theme, modes[mode]);
}

export const selectMainTheme = createSelector(
  [getMainTheme, getDirection],
  (theme, direction, id) => generateMuiTheme(theme, direction)
);

export const selectMainThemeDark = createSelector(
  [getMainTheme, getDirection],
  (theme, direction) => generateMuiTheme(changeThemeMode(theme, 'dark'), direction)
);

export const selectMainThemeLight = createSelector(
  [getMainTheme, getDirection],
  (theme, direction) => generateMuiTheme(changeThemeMode(theme, 'light'), direction)
);

export const selectNavbarTheme = createSelector(
  [getNavbarTheme, getDirection],
  (theme, direction) => generateMuiTheme(theme, direction)
);

export const selectNavbarThemeDark = createSelector(
  [getNavbarTheme, getDirection],
  (theme, direction) => generateMuiTheme(changeThemeMode(theme, 'dark'), direction)
);

export const selectNavbarThemeLight = createSelector(
  [getNavbarTheme, getDirection],
  (theme, direction) => generateMuiTheme(changeThemeMode(theme, 'light'), direction)
);

export const selectToolbarTheme = createSelector(
  [getToolbarTheme, getDirection],
  (theme, direction) => generateMuiTheme(theme, direction)
);

export const selectToolbarThemeDark = createSelector(
  [getToolbarTheme, getDirection],
  (theme, direction) => generateMuiTheme(changeThemeMode(theme, 'dark'), direction)
);

export const selectToolbarThemeLight = createSelector(
  [getToolbarTheme, getDirection],
  (theme, direction) => generateMuiTheme(changeThemeMode(theme, 'light'), direction)
);

export const selectFooterTheme = createSelector(
  [getFooterTheme, getDirection],
  (theme, direction) => generateMuiTheme(theme, direction)
);

export const selectFooterThemeDark = createSelector(
  [getFooterTheme, getDirection],
  (theme, direction) => generateMuiTheme(changeThemeMode(theme, 'dark'), direction)
);

export const selectFooterThemeLight = createSelector(
  [getFooterTheme, getDirection],
  (theme, direction) => generateMuiTheme(changeThemeMode(theme, 'light'), direction)
);

export const selectFuseCurrentSettings = ({ fuse }) => fuse.settings.current;

export const selectFuseCurrentLayoutConfig = ({ fuse }) => fuse.settings.current.layout.config;

export const selectFuseDefaultSettings = ({ fuse }) => fuse.settings.defaults;

export const selectFuseThemesSettings = ({ fuse }) => fuse.settings.themes;

export const { resetSettings, setInitialSettings, setSettings } = settingsSlice.actions;

export default settingsSlice.reducer;