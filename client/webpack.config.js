const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');

const configuration = {
    entry: './src/app.js',
    output: {
        filename: 'app.js',
        chunkFilename: 'bundle.[name].js',
        path: path.resolve(__dirname, "./public/dist"),
        publicPath: '/dist/',
        library: 'app',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [ '@babel/preset-env' ],
                        plugins: [
                            '@babel/plugin-proposal-class-properties',
                            '@babel/plugin-proposal-private-methods',
                            '@babel/plugin-transform-runtime'
                        ]
                    }
                }
            },
            {
                test: /\.s?[ac]ss$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: 'css-loader' },
                    { loader: 'sass-loader', options: { sourceMap: true } }
                ]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({ filename: 'app.css' }),
        new Dotenv()
    ]
}

//Export to Webpack.
module.exports = [ configuration ];