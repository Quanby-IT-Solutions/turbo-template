import com.android.build.gradle.LibraryExtension

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)

    // Some Flutter plugins (including permission_handler_android) still declare their own
    // buildscript classpath with an older AGP. Force a single AGP version to avoid
    // mismatches that can manifest as Gradle Provider "no value available" errors.
    buildscript {
        configurations.findByName("classpath")?.resolutionStrategy?.force(
            "com.android.tools.build:gradle:8.9.1",
        )
    }

    // Ensure all Android library modules (Flutter plugins) have compileSdk configured.
    // Some plugins rely on the host app's compileSdk but don't set it themselves, which
    // can lead to Gradle provider "no value available" errors when wiring Javac tasks.
    plugins.withId("com.android.library") {
        extensions.configure<LibraryExtension> {
            compileSdk = 36
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
