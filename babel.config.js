
module.exports = function (api) {
  api.cache(true);
  
  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@/assets': './assets',
          '@/components': './components',
          '@/constants': './constants',
          '@/hooks': './hooks',
          '@/store': './store',
          '@/types': './types',
          '@/utils': './utils',
          '@/services': './services',
          '@/contexts': './contexts',
          '@/lib': './lib',
          '@/localization': './localization',
          '@/features': './features',
          '@/src': './src'
        }
      }
    ],
    'react-native-reanimated/plugin'
  ];
  
  // Add jsx-source plugin only during usage audit
  if (process.env.USAGE_AUDIT === 'true') {
    plugins.unshift('@babel/plugin-transform-react-jsx-source');
    console.log('🔍 JSX source tracking enabled for usage audit');
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins
  };
};
