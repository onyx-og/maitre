// webpack.client.config.js
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "development",
  target: "web",
  entry: "./src/client.js",
  output: {
    path: path.resolve(__dirname, "dist/client"),
    filename: "client.js",
    publicPath: "/client/",
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { modules: false }],
              "@babel/preset-react",
            ],
          },
        },
      },
    ],
  },
};
