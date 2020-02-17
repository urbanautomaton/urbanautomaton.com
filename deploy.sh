#!/usr/bin/env bash

set -euo pipefail
cd output

export AWS_PROFILE=ua-scoffey

aws s3 sync . s3://www.urbanautomaton.com/ --acl public-read --exclude ".git/*"

find . -name "index.html" -print0 | while read -r -d '' file; do
  file=${file#./}
  path=${file%index.html}
  echo aws s3api put-object --bucket urbanautomaton.com --key "${file}" --acl public-read --website-redirect-location "https://www.urbanautomaton.com/${path}"
  aws s3api put-object --bucket urbanautomaton.com --key "${file}" --acl public-read --website-redirect-location "https://www.urbanautomaton.com/${path}"
done
