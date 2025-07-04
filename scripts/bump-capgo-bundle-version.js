import fs from "fs";
import semver from "semver";
const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

if (!pkg.version) {
    console.error(`package.json -- missing version field`);
    process.exit(1);
} 
console.log(`package.json version: ${pkg.version}`);

// Check if bundle.json exists, create default if not
let bundle;
try {
  bundle = JSON.parse(fs.readFileSync("./bundle.json", "utf-8"));
} catch (error) {
  console.log(
    `bundle.json not found, creating with bundleversion: ${pkg.version}`
  );
  bundle = { bundleversion: pkg.version };
}

console.log(`bundle.json current bundleversion ${bundle.bundleversion}`);
if (semver.lt(bundle.bundleversion, pkg.version)) {
  console.log(
    `version was bumped, setting new baseline: ${bundle.bundleversion} --> ${pkg.version}`
  );
  bundle.bundleversion = pkg.version;
}

const newBundleVersion = semver.inc(bundle.bundleversion, "prerelease");
bundle.bundleversion = newBundleVersion;
console.log(`bundle.json new bundleversion ${newBundleVersion}`);

fs.writeFileSync("./bundle.json", JSON.stringify(bundle, null, 2));
