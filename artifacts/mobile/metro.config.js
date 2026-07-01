const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [/\.cache\/openid-client\/.*/];

// Watch workspace lib packages so Metro sees changes in @workspace/*
const workspaceLibs = [
  path.resolve(__dirname, "../../lib/nutrition"),
  path.resolve(__dirname, "../../lib/api-client-react"),
  path.resolve(__dirname, "../../lib/api-zod"),
];
config.watchFolders = [...(config.watchFolders || []), ...workspaceLibs];

module.exports = config;
