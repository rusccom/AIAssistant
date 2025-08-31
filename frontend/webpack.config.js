const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');

const criticalCss = fs.readFileSync(path.resolve(__dirname, 'src/layout/critical-css.html'), 'utf-8');
const seoConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/seo-config.json'), 'utf-8'));

// Configuration for all pages
const pages = [
    { name: 'index', title: 'AIAssistant - Intelligent AI Solutions', template: './src/index.html', favicon: true },
    { name: 'login', title: 'Login - AIAssistant', template: './src/login.html', favicon: true },
    { name: 'register', title: 'Register - AIAssistant', template: './src/register.html', favicon: true },
    { name: 'dashboard', title: 'Dashboard - AIAssistant', template: './src/layout/dashboard.layout.html', favicon: true },
    { name: 'bot-settings', title: 'Bot Settings - AIAssistant', template: './src/layout/dashboard.layout.html', favicon: false },
    { name: 'visual-editor', title: 'Visual State Editor - AIAssistant', template: './src/visual-editor.html', favicon: true }
];

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
  mode: argv.mode || 'development',
  entry: pages.reduce((acc, page) => {
    acc[page.name.replace(/-/g, '_')] = `./src/${page.name}.ts`;
    return acc;
  }, {}),
  devtool: isProduction ? 'source-map' : 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.content\.html$/,
        use: 'html-loader',
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
        }
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: isProduction ? '[name].[contenthash].bundle.js' : '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: pages.map(page => {
    const seoData = seoConfig.pages[page.name] || {};
    const globalSeo = seoConfig.global;
    
    return new HtmlWebpackPlugin({
        template: page.template,
        filename: `${page.name}.html`,
        chunks: [page.name.replace(/-/g, '_')],
        title: seoData.title || page.title,
        favicon: page.favicon ? './src/favicon.ico' : undefined,
        criticalCss: criticalCss,
        // SEO data
        seoDescription: seoData.description || '',
        seoKeywords: seoData.keywords || '',
        ogTitle: seoData.ogTitle || seoData.title || page.title,
        ogDescription: seoData.ogDescription || seoData.description || '',
        ogImage: `${globalSeo.baseUrl}${globalSeo.logo}`,
        ogUrl: `${globalSeo.baseUrl}${page.name === 'index' ? '' : '/' + page.name + '.html'}`,
        ogType: seoData.ogType || 'website',
        siteName: globalSeo.siteName,
        author: globalSeo.author,
        themeColor: globalSeo.themeColor,
        twitterHandle: globalSeo.twitterHandle
    });
  }),
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist'),
      },
      {
        directory: path.join(__dirname, 'src'),
        publicPath: '/',
      }
    ],
    port: 9001,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
        secure: false,
        changeOrigin: true,
      }
    ],
    historyApiFallback: true,
  },
  };
}; 