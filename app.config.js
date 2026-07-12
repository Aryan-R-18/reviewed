require('dotenv').config();

module.exports = {
  expo: {
    name: 'Reviewed',
    slug: 'reviewed',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/applogonew.png',
    scheme: 'reviewed',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/applogonew.png',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#1c1c1c',
        foregroundImage: './assets/applogonew.png',
      },
      predictiveBackGestureEnabled: false,
      package: 'com.aryanr18.reviewed',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-system-ui',
      'react-native-webview',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#1c1c1c',
          image: './assets/applogonew.png',
          imageWidth: 200,
        },
      ],
      'expo-font',
      'expo-web-browser',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow this app to use your location to find places on the map.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow this app to access your photos to upload review images.',
        },
      ],
    ],
    newArchEnabled: true,
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'd8279ca4-8bbf-4e5d-a1a0-740f8857522f',
      },
    },
  },
};
