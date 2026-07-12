require('dotenv').config();

module.exports = {
  expo: {
    name: 'reviewed',
    slug: 'reviewed',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'reviewed',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/expo.icon',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: 'com.aryanr18.reviewed',
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-system-ui',
      [
        'react-native-maps',
        {
          googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
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
        projectId: '1137ead5-96b3-4751-a95e-b4fcd847241f',
      },
    },
  },
};
