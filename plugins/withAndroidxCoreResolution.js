// plugins/withAndroidxCoreResolution.js
const {
  withProjectBuildGradle,
  withSettingsGradle,
} = require("@expo/config-plugins");

// ─── 1. Root build.gradle — force androidx.core version across all subprojects ───
const withCoreResolution = (config) => {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes("Pawns SDK compatibility fix")) {
      return cfg;
    }
    cfg.modResults.contents += `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.13.1'
            force 'androidx.core:core-ktx:1.13.1'
        }
    }
}
`;
    return cfg;
  });
};

// ─── 2. settings.gradle — inject JitPack inside dependencyResolutionManagement ──
// Expo 53 uses the new settings.gradle repo management style.
// The maven() call must be inside dependencyResolutionManagement > repositories { }.
const withJitpackRepo = (config) => {
  return withSettingsGradle(config, (cfg) => {
    const contents = cfg.modResults.contents;

    // Skip if already added
    if (contents.includes("jitpack.io")) {
      return cfg;
    }

    // Expo 53 settings.gradle contains:
    //   dependencyResolutionManagement {
    //     repositoriesMode.set(...)
    //     repositories {
    //       google()
    //       mavenCentral()
    //     }
    //   }
    // We inject jitpack as the FIRST entry inside that repositories block.
    const updated = contents.replace(
      /(dependencyResolutionManagement\s*\{[^}]*repositories\s*\{)/s,
      (match) => {
        return (
          match + `\n        maven { url 'https://jitpack.io' } // Pawns SDK`
        );
      },
    );

    if (updated !== contents) {
      cfg.modResults.contents = updated;
    } else {
      // If the regex didn't match, log a warning and skip (don't add bare maven())
      console.warn(
        "[withAndroidxCoreResolution] Could not find dependencyResolutionManagement > repositories in settings.gradle. JitPack NOT injected.",
      );
    }

    return cfg;
  });
};

const withAndroidxCoreResolution = (config) => {
  config = withCoreResolution(config);
  config = withJitpackRepo(config);
  return config;
};

module.exports = withAndroidxCoreResolution;

// // plugins/withAndroidxCoreResolution.js
// const {
//   withProjectBuildGradle,
//   withSettingsGradle,
// } = require("@expo/config-plugins");

// // ─── 1. Root build.gradle — force androidx.core version across all subprojects
// const withCoreResolution = (config) => {
//   return withProjectBuildGradle(config, (cfg) => {
//     if (cfg.modResults.contents.includes("Pawns SDK compatibility fix")) {
//       return cfg;
//     }

//     const block = `
// // ─── Pawns SDK compatibility fix ─────────────────────────────────────────────
// // Forces androidx.core 1.13.1 across all subprojects so the Pawns SDK
// // (which pulls in 1.17.0) doesn't break the build on compileSdk 35 / AGP 8.8.x
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
//     cfg.modResults.contents += block;
//     return cfg;
//   });
// };

// // ─── 2. settings.gradle — add JitPack to dependencyResolutionManagement
// //    Expo 53 uses settings.gradle-style repo management (not allprojects).
// //    Without this, `app.pawns:android-pawns-sdk` cannot be resolved at all.
// const withJitpackRepo = (config) => {
//   return withSettingsGradle(config, (cfg) => {
//     if (cfg.modResults.contents.includes("jitpack.io")) {
//       return cfg; // already present
//     }

//     // Insert jitpack inside the existing repositories { } block inside
//     // dependencyResolutionManagement { }
//     const updated = cfg.modResults.contents.replace(
//       /dependencyResolutionManagement\s*\{([^}]*repositories\s*\{)/,
//       (match, inner) => {
//         return match.replace(
//           /repositories\s*\{/,
//           `repositories {\n        maven { url 'https://jitpack.io' } // Pawns SDK`,
//         );
//       },
//     );

//     if (updated !== cfg.modResults.contents) {
//       cfg.modResults.contents = updated;
//     } else {
//       // Fallback: append at end of file if pattern didn't match
//       cfg.modResults.contents += `\n// Pawns SDK\nmaven { url 'https://jitpack.io' }\n`;
//     }

//     return cfg;
//   });
// };

// const withAndroidxCoreResolution = (config) => {
//   config = withCoreResolution(config);
//   config = withJitpackRepo(config);
//   return config;
// };

// module.exports = withAndroidxCoreResolution;

// // // plugins/withAndroidxCoreResolution.js
// // const { withProjectBuildGradle, withAppBuildGradle } = require("@expo/config-plugins");

// // const RESOLUTION_BLOCK = `
// // // ─── Pawns SDK compatibility fix ─────────────────────────────────────────────
// // allprojects {
// //     configurations.all {
// //         resolutionStrategy {
// //             force 'androidx.core:core:1.13.1'
// //             force 'androidx.core:core-ktx:1.13.1'
// //         }
// //     }
// // }
// // // ─────────────────────────────────────────────────────────────────────────────
// // `;

// // const withAndroidxCoreResolution = (config) => {
// //   // Project-level build.gradle
// //   config = withProjectBuildGradle(config, (cfg) => {
// //     let contents = cfg.modResults.contents;

// //     if (contents.includes("Pawns SDK compatibility fix")) {
// //       return cfg;
// //     }

// //     // Insert after repositories or at the end
// //     if (contents.includes("allprojects {")) {
// //       contents = contents.replace(
// //         /allprojects\s*\{/g,
// //         (match) => match + "\n" + RESOLUTION_BLOCK.replace(/^/gm, "    ")
// //       );
// //     } else {
// //       contents += "\n" + RESOLUTION_BLOCK;
// //     }

// //     cfg.modResults.contents = contents;
// //     return cfg;
// //   });

// //   // App-level build.gradle (extra safety)
// //   config = withAppBuildGradle(config, (cfg) => {
// //     if (!cfg.modResults.contents.includes("Pawns SDK compatibility fix")) {
// //       cfg.modResults.contents += RESOLUTION_BLOCK;
// //     }
// //     return cfg;
// //   });

// //   return config;
// // };

// // module.exports = withAndroidxCoreResolution;

// // // // plugins/withAndroidxCoreResolution.js
// // // // Expo config plugin that forces androidx.core to 1.13.1 across ALL subprojects.
// // // // This prevents the Pawns SDK from pulling in core:1.17.0 which requires
// // // // compileSdk 36 + AGP 8.9.1 — incompatible with Expo 53 (compileSdk 35, AGP 8.8.2).

// // // const { withProjectBuildGradle } = require("@expo/config-plugins");

// // // const RESOLUTION_BLOCK = `
// // // // ─── Pawns SDK compatibility fix ─────────────────────────────────────────────
// // // // app.pawns:android-pawns-sdk transitively pulls in androidx.core:1.17.0 which
// // // // requires compileSdk 36 + AGP 8.9.1. Force 1.13.1 which works with SDK 35.
// // // allprojects {
// // //     configurations.all {
// // //         resolutionStrategy {
// // //             force 'androidx.core:core:1.13.1'
// // //             force 'androidx.core:core-ktx:1.13.1'
// // //         }
// // //     }
// // // }
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // `;

// // // /**
// // //  * @param {import('@expo/config-plugins').ExpoConfig} config
// // //  */
// // // const withAndroidxCoreResolution = (config) => {
// // //   return withProjectBuildGradle(config, (config) => {
// // //     const contents = config.modResults.contents;

// // //     // Avoid duplicate injection on repeated prebuild runs
// // //     if (contents.includes("Pawns SDK compatibility fix")) {
// // //       return config;
// // //     }

// // //     // Append after the last closing brace of the file
// // //     config.modResults.contents = contents + RESOLUTION_BLOCK;
// // //     return config;
// // //   });
// // // };

// // // module.exports = withAndroidxCoreResolution;
