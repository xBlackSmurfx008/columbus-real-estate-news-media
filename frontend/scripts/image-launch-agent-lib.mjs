export const IMAGE_BACKFILL_TIMES = [
  { hour: 7, minute: 5 },
  { hour: 8, minute: 5 },
  { hour: 12, minute: 35 },
];

function xml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function buildImageBackfillPlist({ frontendPath, nodePath, codexBinPath }) {
  const path = [codexBinPath, nodePath.slice(0, nodePath.lastIndexOf("/")), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(":");
  const entries = IMAGE_BACKFILL_TIMES.map(({ hour, minute }) => `
      <dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>${minute}</integer></dict>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.cren.image-backfill</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/env</string><string>PATH=${xml(path)}</string><string>${xml(nodePath)}</string>
    <string>${xml(`${frontendPath}/scripts/run-image-backfill.mjs`)}</string>
  </array>
  <key>WorkingDirectory</key><string>${xml(frontendPath)}</string>
  <key>StartCalendarInterval</key><array>${entries}
  </array>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>${xml(`${frontendPath}/var/cren-images/launchd.stdout.log`)}</string>
  <key>StandardErrorPath</key><string>${xml(`${frontendPath}/var/cren-images/launchd.stderr.log`)}</string>
</dict></plist>
`;
}
