#!/usr/bin/env bash

set -euo pipefail

hugo mod get -u
hugo mod npm pack
npm install
hugo --gc --minify --renderStaticToDisk