import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    // Kept in step with applicationId below; see the warning there.
    namespace = "com.quanbyit.turbotemplate"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // MB-3 / F-44: a real, unique application id.
        //
        // It was `com.example.mobile`, the Android sample namespace, which Play
        // rejects and which any other app could also claim.
        //
        // WARNING: this value CANNOT be changed after the first store publish.
        // Changing it produces a different app: existing installs never receive
        // the update, and the old id can never be reused. Decide it once.
        applicationId = "com.quanbyit.turbotemplate"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            // MB-3 / F-44: real signing material, never committed.
            //
            // Release builds were signed with the DEBUG keystore, whose key is
            // shipped with the Android SDK and identical on every machine.
            // Anyone could produce a build the device would accept as an
            // update to this app.
            //
            // Values come from android/key.properties (gitignored) or, in CI,
            // from the environment. Both are absent on a fresh clone, and the
            // block below leaves the config unsigned rather than silently
            // falling back to debug keys.
            val keyProps = Properties()
            val keyPropsFile = rootProject.file("key.properties")
            if (keyPropsFile.exists()) {
                keyPropsFile.inputStream().use { keyProps.load(it) }
            }

            val storePath = keyProps.getProperty("storeFile")
                ?: System.getenv("ANDROID_KEYSTORE_PATH")
            val storePass = keyProps.getProperty("storePassword")
                ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
            val alias = keyProps.getProperty("keyAlias")
                ?: System.getenv("ANDROID_KEY_ALIAS")
            val aliasPass = keyProps.getProperty("keyPassword")
                ?: System.getenv("ANDROID_KEY_PASSWORD")

            if (storePath != null && storePass != null && alias != null && aliasPass != null) {
                storeFile = file(storePath)
                storePassword = storePass
                keyAlias = alias
                keyPassword = aliasPass
            }
        }
    }

    buildTypes {
        release {
            // Signed with the release config when keystore material is
            // present. When it is absent the build fails rather than emitting
            // a debug-signed release — see the check below.
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

// MB-3 / F-44: fail the build rather than ship a release nobody can update.
// Without this, an absent keystore produces an unsigned or debug-signed APK
// that installs fine locally and is rejected — or worse, silently accepted —
// downstream.
tasks.whenTaskAdded {
    if (name.contains("assembleRelease") || name.contains("bundleRelease")) {
        doFirst {
            val cfg = android.signingConfigs.getByName("release")
            if (cfg.storeFile == null) {
                throw GradleException(
                    "Release signing is not configured. Provide android/key.properties " +
                        "(storeFile, storePassword, keyAlias, keyPassword) or the " +
                        "ANDROID_KEYSTORE_PATH / ANDROID_KEYSTORE_PASSWORD / " +
                        "ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD environment variables. " +
                        "Never commit the keystore or its passwords."
                )
            }
        }
    }
}

flutter {
    source = "../.."
}
