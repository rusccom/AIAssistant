const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');

const criticalCss = fs.readFileSync(path.resolve(__dirname, 'src/layout/critical-css.html'), 'utf-8');

// Configuration for all pages
const pages = [
    { name: 'index', title: 'AIAssistant - Intelligent AI Solutions', template: './src/index.html', favicon: true },
    { name: 'login', title: 'Login - AIAssistant', template: './src/login.html', favicon: true },
    { name: 'register', title: 'Register - AIAssistant', template: './src/register.html', favicon: true },
    { name: 'about', title: 'About Us - AIAssistant', template: './src/about.html', favicon: true },
    { name: 'contacts', title: 'Contact Us - AIAssistant', template: './src/contacts.html', favicon: true },
    { name: 'dashboard', title: 'Dashboard - AIAssistant', template: './src/layout/dashboard.layout.html', favicon: true },
    { name: 'bot-settings', title: 'Bot Settings - AIAssistant', template: './src/layout/dashboard.layout.html', favicon: false },
    { name: 'visual-editor', title: 'Visual State Editor - AIAssistant', template: './src/visual-editor.html', favicon: true }
];

module.exports = {
  mode: 'development',
  entry: pages.reduce((acc, page) => {
    acc[page.name.replace(/-/g, '_')] = `./src/${page.name}.ts`;
    return acc;
  }, {}),
  devtool: 'inline-source-map',
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
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: pages.map(page => {
    return new HtmlWebpackPlugin({
        template: page.template,
        filename: `${page.name}.html`,
        chunks: [page.name.replace(/-/g, '_')],
        title: page.title,
        favicon: page.favicon ? './src/favicon.ico' : undefined,
        criticalCss: criticalCss,
    });
  }),
  devServer: {
    static: './dist',
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