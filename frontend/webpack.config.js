const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');

const publicCriticalCss = fs.readFileSync(
  path.resolve(__dirname, 'src/layout/public/public-critical-css.html'),
  'utf-8'
);
const appCriticalCss = fs.readFileSync(
  path.resolve(__dirname, 'src/layout/app/app-critical-css.html'),
  'utf-8'
);
const seoConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/seo-config.json'), 'utf-8'));

const pages = [
    { name: 'index', title: 'AIAssistant - Intelligent AI Solutions', template: './src/index.html', favicon: true, group: 'public' },
    { name: 'login', title: 'Login - AIAssistant', template: './src/login.html', favicon: true, group: 'public' },
    { name: 'register', title: 'Register - AIAssistant', template: './src/register.html', favicon: true, group: 'public' },
    { name: 'dashboard', title: 'Dashboard - AIAssistant', template: './src/layout/app/app.layout.html', favicon: true, group: 'app' },
    { name: 'bot-settings', title: 'Bot Settings - AIAssistant', template: './src/layout/app/app.layout.html', favicon: false, group: 'app' },
    { name: 'visual-editor', title: 'Visual State Editor - AIAssistant', template: './src/visual-editor.html', favicon: true, group: 'app' }
];

const getEntryName = (page) => page.name.replace(/-/g, '_');
const getOgUrl = (pageName, baseUrl) => `${baseUrl}${pageName === 'index' ? '' : `/${pageName}.html`}`;

function createHtmlPlugin(page) {
    const isPublicPage = page.group === 'public';
    const globalSeo = seoConfig.global;
    const seoData = isPublicPage ? seoConfig.pages[page.name] || {} : {};

    return new HtmlWebpackPlugin({
        template: page.template,
        filename: `${page.name}.html`,
        chunks: [getEntryName(page)],
        title: seoData.title || page.title,
        favicon: page.favicon ? './src/favicon.ico' : undefined,
        criticalCss: isPublicPage ? publicCriticalCss : appCriticalCss,
        robots: isPublicPage ? seoData.robots || 'index, follow' : 'noindex, nofollow',
        seoDescription: seoData.description || '',
        seoKeywords: seoData.keywords || '',
        ogTitle: seoData.ogTitle || seoData.title || page.title,
        ogDescription: seoData.ogDescription || seoData.description || '',
        ogImage: isPublicPage ? `${globalSeo.baseUrl}${globalSeo.logo}` : '',
        ogUrl: isPublicPage ? getOgUrl(page.name, globalSeo.baseUrl) : '',
        ogType: seoData.ogType || 'website',
        siteName: globalSeo.siteName,
        author: globalSeo.author,
        themeColor: globalSeo.themeColor,
        twitterHandle: globalSeo.twitterHandle
    });
}

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
  mode: argv.mode || 'development',
  entry: pages.reduce((acc, page) => {
    acc[getEntryName(page)] = `./src/${page.name}.ts`;
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
  plugins: pages.map(createHtmlPlugin).concat([
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/logoAi.png', to: 'logoAi.png' },
        { from: 'src/favicon.ico', to: 'favicon.ico' }
      ]
    })
  ]),
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
        target: 'http://localhost:3000',  // Backend реально работает на порту 3000
        secure: false,
        changeOrigin: true,
      }
    ],
    historyApiFallback: true,
  },
  };
};
