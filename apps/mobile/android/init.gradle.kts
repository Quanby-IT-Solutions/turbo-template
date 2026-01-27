// Permanent fix for Gradle 8+ provider issues with Flutter plugins
// This init script ensures all Android library projects have their providers initialized

gradle.allprojects {
    afterEvaluate {
        if (plugins.hasPlugin("com.android.library")) {
            try {
                val android = extensions.findByName("android")
                if (android != null) {
                    // Force provider initialization by accessing compileSdk
                    try {
                        val compileSdkMethod = android.javaClass.methods.find { 
                            it.name == "getCompileSdkVersion" || it.name == "getCompileSdk"
                        }
                        compileSdkMethod?.invoke(android)
                    } catch (e: Exception) {
                        // Try to set it if getter fails
                        try {
                            val setCompileSdkMethod = android.javaClass.methods.find { 
                                (it.name == "setCompileSdkVersion" || it.name == "compileSdk") && 
                                it.parameterCount == 1
                            }
                            setCompileSdkMethod?.invoke(android, 34)
                        } catch (e2: Exception) {
                            // Ignore if we can't configure
                        }
                    }
                }
            } catch (e: Exception) {
                // Plugin might handle this differently
            }
        }
    }
}
