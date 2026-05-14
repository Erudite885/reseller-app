
// plugins/withAndroidxCoreResolution.js
const { withProjectBuildGradle, withAppBuildGradle } = require("@expo/config-plugins");

const RESOLUTION_BLOCK = `
// ─── Pawns SDK compatibility fix ─────────────────────────────────────────────
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.13.1'
            force 'androidx.core:core-ktx:1.13.1'
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
`;

const withAndroidxCoreResolution = (config) => {
  // Project-level build.gradle
  config = withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (contents.includes("Pawns SDK compatibility fix")) {
      return cfg;
    }

    // Insert after repositories or at the end
    if (contents.includes("allprojects {")) {
      contents = contents.replace(
        /allprojects\s*\{/g,
        (match) => match + "\n" + RESOLUTION_BLOCK.replace(/^/gm, "    ")
      );
    } else {
      contents += "\n" + RESOLUTION_BLOCK;
    }

    cfg.modResults.contents = contents;
    return cfg;
  });

  // App-level build.gradle (extra safety)
  config = withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes("Pawns SDK compatibility fix")) {
      cfg.modResults.contents += RESOLUTION_BLOCK;
    }
    return cfg;
  });

  return config;
};

module.exports = withAndroidxCoreResolution;


// // plugins/withAndroidxCoreResolution.js
// // Expo config plugin that forces androidx.core to 1.13.1 across ALL subprojects.
// // This prevents the Pawns SDK from pulling in core:1.17.0 which requires
// // compileSdk 36 + AGP 8.9.1 — incompatible with Expo 53 (compileSdk 35, AGP 8.8.2).

// const { withProjectBuildGradle } = require("@expo/config-plugins");

// const RESOLUTION_BLOCK = `
// // ─── Pawns SDK compatibility fix ─────────────────────────────────────────────
// // app.pawns:android-pawns-sdk transitively pulls in androidx.core:1.17.0 which
// // requires compileSdk 36 + AGP 8.9.1. Force 1.13.1 which works with SDK 35.
// allprojects {
//     configurations.all {
//         resolutionStrategy {
//             force 'androidx.core:core:1.13.1'
//             force 'androidx.core:core-ktx:1.13.1'
//         }
//     }
// }
// // ─────────────────────────────────────────────────────────────────────────────
// `;

// /**
//  * @param {import('@expo/config-plugins').ExpoConfig} config
//  */
// const withAndroidxCoreResolution = (config) => {
//   return withProjectBuildGradle(config, (config) => {
//     const contents = config.modResults.contents;

//     // Avoid duplicate injection on repeated prebuild runs
//     if (contents.includes("Pawns SDK compatibility fix")) {
//       return config;
//     }

//     // Append after the last closing brace of the file
//     config.modResults.contents = contents + RESOLUTION_BLOCK;
//     return config;
//   });
// };

// module.exports = withAndroidxCoreResolution;
