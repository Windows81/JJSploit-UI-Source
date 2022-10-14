#!/bin/bash
p=`echo "https://cdn.discordapp.com/attachments/[0-9]+/[0-9]+/JJSploit_Installer.exe"`
l=`curl -s https://cdn.wearedevs.net/software/jjsploit/latestdata.txt -H 'Cache-Control: no-cache, no-store'|grep -Eo $p`
curl $l -o ".exe"
7z e -aoa ".exe" "\$PLUGINSDIR/app-32.7z"
7z e -aoa "app-32.7z" "resources/app.asar"
npx asar e app.asar .
rmdir node_modules --ignore-fail-on-non-empty