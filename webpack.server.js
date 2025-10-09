import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  target: 'node', // Since target is node not browser
  entry: "./src/server.js",
  mode: 'development',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'server.js',
    library: {
      type: "module",
    },
  },
  experiments: {
    outputModule: true,
  },
  target: ["node", "es2020"],
  resolve: {
    extensions: ['.js', '.jsx']
  },
  externalsType: "module",
  externals: {
    express: "express",
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { "modules": false }],
              ["@babel/preset-react", { "runtime": "automatic" }]
            ]
          }
        }
      }
    ]
  },
}

export default config;