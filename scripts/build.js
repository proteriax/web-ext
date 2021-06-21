#!/usr/bin/env node
const fs = require("fs")
const { resolve } = require("path")
const api = require("../src/web-ext-api.json")

const lib = resolve(__dirname, "../lib")
const target = resolve(lib, "index.js")

const source = fs.readFileSync(target, "utf8").split("\n")
source[0] = `const apiMetadata = ${JSON.stringify(api)};`
fs.writeFileSync(target, source.join("\n"))

try {
  fs.unlinkSync(resolve(lib, "web-ext-api.json"))
} catch {}
