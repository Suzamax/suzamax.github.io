#!/usr/bin/env sh

hugo mod get -u
hugo mod npm pack
npm install
hugo --gc --minify