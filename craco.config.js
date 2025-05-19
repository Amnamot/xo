module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Отключаем все оптимизации
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        minimize: false,
        minimizer: [],
        splitChunks: false,
        runtimeChunk: false,
        flagIncludedChunks: false,
        concatenateModules: false
      };
      
      // Устанавливаем режим development
      webpackConfig.mode = 'development';
      
      // Отключаем минификацию в Terser
      webpackConfig.optimization.minimizer = [];
      
      return webpackConfig;
    }
  }
}; 