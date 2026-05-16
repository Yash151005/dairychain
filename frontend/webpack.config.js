const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const path = require("path");
const webpack = require("webpack");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(/^\.\/_ctx$/, (resource) => {
      if (resource.context.includes(`${path.sep}node_modules${path.sep}expo-router`)) {
        resource.request = path.resolve(__dirname, "expo-router-ctx.web.js");
      }
    })
  );

  return config;
};
