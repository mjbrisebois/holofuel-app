var path			= require('path');
var webpack			= require('webpack');

module.exports = {
    mode: 'production', // production | development
    entry: [ '@babel/polyfill', './js/app.js' ],
    output: {
	path: path.resolve(__dirname, 'build'),
	publicPath: 'build/',
	filename: 'webpacked.app.js'
    },
    module: {
	rules: [
	    {
		test: /\.m?js$/,
		exclude: /(node_modules|bower_components)/,
		use: {
		    loader: 'babel-loader',
		    options: {
			presets: ['@babel/preset-env']
		    }
		}
	    },
	    {
		test: /\.html$/,
		exclude: /node_modules/,
		use: {
		    loader: 'html-loader'
		}
	    }
	]
    },
    stats: {
	colors: true
    },
    devtool: 'source-map'
};
