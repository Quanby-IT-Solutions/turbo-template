# BiosenseSignal Flutter SDK Developer Portal

Welcome to the BiosenseSignal Developer Portal!

This portal provides information about the API and the steps required for integration with the BiosenseSignal SDK. The BiosenseSignal SDK utilizes PPG technology to compute health indicators either by capturing a short video stream from the user's face or by analyzing data from external PPG devices.

## What's New in This Version - SDK v5.11

### 1. New health indicators

This version includes the following new health indicators:

- ASCVD Risk Level
- Cardiac Workload
- Pulse Pressure
- Mean Arterial Pressure

### 2. Improvement in existing health indicators

This SDK includes improvements in the following health indicators using face measurements:

- Pulse Rate
- Blood Pressure

**Bloodless Blood Tests indicators and risks:**

- Hemoglobin
- Hemoglobin A1c
- High Blood Pressure Risk
- High Fasting Glucose Risk
- High Hemoglobin A1c Risk
- Low Hemoglobin Risk

**Heart Rate Variability-derived indicators**

- Mean RRi
- Normalized Stress Index
- Parasympathetic Nervous System Index (PNS Index)
- Parasympathetic Nervous System Zone (PNS Zone)
- PRQ
- RMSSD
- RRi
- SD1
- SD2
- SDNN
- Stress Index
- Stress Level
- Sympathetic Nervous System Index (SNS Index)
- Sympathetic Nervous System Zone (SNS Zone)
- Wellness Index
- Wellness Level

### 3. Polar support

High Blood Pressure Risk is now supported also using Polar Verity Sense

### 4. Resolving license server accessibility in certain regions

The SDK connects with the license server at [https://licensing-api.biosensesignal.com](https://licensing-api.biosensesignal.com). The traffic to this server is routed through a Cloudflare service. Since Cloudflare is inaccessible in certain countries, a custom workaround is available for these regions. Contact our customer support if the license server is unreachable in your target territories.

### 5. iPad support

The following indicators are now supported in face measurements on iPad devices as well:

**Bloodless Blood Tests Indicators:**

- Hemoglobin
- Hemoglobin A1c

**Risk Indicators:**

- Low Hemoglobin Risk
- High HbA1c Risk
- High Fasting Glucose Risk
- High Total Cholesterol Risk
- ASCVD Risk
- ASCVD Risk Level
- Heart Age

### 6. Compatibility with Android 16 KB page size

The SDK is now compatible with Google Play's 16 KB page size requirement. For additional information see [https://android-developers.googleblog.com/2025/05/prepare-play-apps-for-devices-with-16kb-page-size.html](https://android-developers.googleblog.com/2025/05/prepare-play-apps-for-devices-with-16kb-page-size.html)

### 7. Updates in Wellness Index and Wellness Level indicators

The calculation methods for Wellness Index and Wellness Level have been updated. These indicators are derived from several other indicators and can still be determined even if only a subset of them is available. For optimal results, it is recommended to set a measurement duration of at least 50 seconds and ensure that as many contributing indicator values as possible are obtained. For additional information, refer to the Indicators Technical Information page.

The indicators used in the calculation are:

- Pulse Rate
- Oxygen Saturation (SpO₂)
- Blood Pressure
- Heart Rate Variability (RRi)

### 8. SDK Logs (Optional)

Starting with SDK v5.11, the SDK includes an optional logging feature that allows apps to store encrypted, lightweight log files locally. These logs are intended to help diagnose unexpected behavior or other issues during SDK usage.

They can be especially helpful when contacting support, as sharing these logs may provide insight into the root cause of a problem.

## Target Accuracy

The table below indicates the target accuracy levels of the different indicators in this version.

| Indicator                | Range    | Unit of measurement | Resolution | Estimated Error level |
| ------------------------ | -------- | ------------------- | ---------- | --------------------- |
| Pulse Rate               | 48-180   | bpm                 | 1          | MAE ≦ 3               |
| Respiration Rate         | 8-30     | brpm                | 1          | MAE ≦ 3               |
| Mean RRi                 | 420-1400 | ms                  | 1          | MAE ≦ 25              |
| Blood Pressure Systolic  | 90-160   | mmHg                | 1          | MAE ≦ 15              |
| Blood Pressure Diastolic | 50-100   | mmHg                | 1          | MAE ≦ 10              |
| Hemoglobin               | 9-17     | g/dL                | 0.1        | MAE ≦ 1.5             |
| Hemoglobin A1C           | 4-8      | %                   | 0.01       | MAE ≦ 1.1             |

**MAE: Mean absolute error**

## Indicators Technical Information

### Confidence Level

The confidence level of a vital sign indicates the probability of accuracy of the measurement result for that vital sign. The higher the level, the greater the probability of the result accuracy. The confidence level takes into account all the inputs required to calculate a result, including signal quality, any warnings during the measurement duration, and the specific data required for the vital sign, such as the amount of information needed to measure a result.

The confidence level values are: Low, Medium, and High.

The SDK does not report the confidence level for all indicators. If the confidence level of any indicator is not High, it is recommended to take another measurement and adhere better to the Best Practices.

### Indicators Information

The table below indicates the technical information of the supported health indicators. Some indicators are calculated only when the measurement is completed. Their values are reported only when the SDK has gathered enough data to calculate them.

The "Required Measurement Duration" refers to a measurement taken according to the Best Practices" without signal-quality issues. In case of interruptions or mis-detections, the time required for adequate vital signs collection might increase.

| Indicator                                        | The Appearance of Runtime Results Since Measurement Starts (sec) | Required Measurement Duration for a Final Result Calculation (sec) | Has Confidence Level | Available using Face | Available using Polar Measurement |
| ------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------- | -------------------- | --------------------------------- |
| ASCVD Risk                                       | Final report only                                                | 35                                                                 | -                    | Yes                  | -                                 |
| ASCVD Risk Level                                 | Final report only                                                | 35                                                                 | -                    | Yes                  | -                                 |
| Blood Pressure                                   | Final report only                                                | 35                                                                 | -                    | Yes                  | Yes                               |
| Cardiac Workload                                 | Final report only                                                | 35                                                                 | -                    | Yes                  | Yes                               |
| Respiration Rate                                 | 23                                                               | 35                                                                 | Yes                  | Yes                  | Yes                               |
| Heart Age                                        | Final report only                                                | 35                                                                 | Yes                  | Yes                  | -                                 |
| Hemoglobin\*                                     | Final report only                                                | 35                                                                 | -                    | Yes                  | -                                 |
| Hemoglobin A1c\*                                 | Final report only                                                | 35                                                                 | -                    | Yes                  | -                                 |
| High Blood Pressure Risk                         | Final report only                                                | 35                                                                 | -                    | Yes                  | Yes                               |
| High Fasting Glucose Risk\*                      | Final report only                                                | 35                                                                 | -                    | Yes                  | -                                 |
| High HbA1c Risk\*                                | Final report only                                                | 35                                                                 | -                    | Yes                  | -                                 |
| High Total Cholesterol Risk\*                    | Final report only                                                | 35                                                                 | -                    | Yes                  | -                                 |
| LF/HF Ratio                                      | Final report only                                                | 50                                                                 | -                    | Yes                  | Yes                               |
| Low Hemoglobin Risk\*                            | Final report only                                                | 35                                                                 | -                    | Yes                  | -                                 |
| Mean Arterial Pressure                           | Final report only                                                | 35                                                                 | -                    | Yes                  | Yes                               |
| Mean RRi                                         | Final report only                                                | 35                                                                 | Yes                  | Yes                  | Yes                               |
| Normalized Stress Index                          | Final report only                                                | 35                                                                 | -                    | Yes                  | Yes                               |
| Oxygen Saturation (SpO2)                         | 35                                                               | 35                                                                 | -                    | Yes                  | -                                 |
| Parasympathetic Nervous System Index (PNS Index) | Final report only                                                | 50                                                                 | -                    | Yes                  | Yes                               |
| Parasympathetic Nervous System Zone (PNS Zone)   | Final report only                                                | 50                                                                 | -                    | Yes                  | Yes                               |
| Pulse Pressure                                   | Final report only                                                | 35                                                                 | -                    | Yes                  | Yes                               |
| Pulse Rate                                       | 8                                                                | 20                                                                 | Yes                  | Yes                  | Yes                               |
| PRQ                                              | Final report only                                                | 35                                                                 | Yes                  | Yes                  | Yes                               |
| RMSSD                                            | Final report only                                                | 35                                                                 | Yes                  | Yes                  | Yes                               |
| RRi                                              | Final report only                                                | 50                                                                 | Yes                  | Yes                  | Yes                               |
| SD1                                              | Final report only                                                | 50                                                                 | -                    | Yes                  | Yes                               |
| SD2                                              | Final report only                                                | 50                                                                 | -                    | Yes                  | Yes                               |
| SDNN                                             | Final report only                                                | 35                                                                 | Yes                  | Yes                  | Yes                               |
| Stress Index                                     | Final report only                                                | 35                                                                 | -                    | Yes                  | Yes                               |
| Stress Level                                     | Final report only                                                | 35                                                                 | -                    | Yes                  | Yes                               |
| Sympathetic Nervous System Index (SNS Index)     | Final report only                                                | 50                                                                 | -                    | Yes                  | Yes                               |
| Sympathetic Nervous System Zone (SNS Zone)       | Final report only                                                | 50                                                                 | -                    | Yes                  | Yes                               |
| Wellness Index                                   | Final report only                                                | 20                                                                 | -                    | Yes                  | Yes                               |
| Wellness Level                                   | Final report only                                                | 20                                                                 | -                    | Yes                  | Yes                               |

_Indicators marked with _ are still under research.\*

## Known Limitations

- Instruct the user to wait for 3 minutes between face measurements to prevent device overheating.
- Instruct the user to wait for 1 minute between external PPG device measurements to prevent device overheating.
- Android devices with lower Geekbench 6.0 (single-core) benchmark scores might encounter inconsistency when using the SDK.
- The SDK requires a valid internet connection during its first launch to obtain license information. If an issue occurs, instruct the user to check their network connection and restart the SDK session.

**Polar pairing tips:**

- During the discovery process, other Polar devices may appear in the device list as Polar Verity Sense. Instruct users to pair only with Polar Verity Sense devices.
- If repeated connections to the same device fail, instruct the user to open the operating system's Bluetooth settings, find the device, open its settings and disconnect the device. If the problem persists, the user should verify the official Polar Flow app successfully pairs with this device and follow the instructions at https://support.polar.com/en/support/pairing_polar_device_with_flow_app_fails_now_what.

## Getting the SDK and a License Key

A valid license key is required to activate the SDK and take measurements. Please contact the support team to get a valid license key.

## Sample Application

We have prepared a sample application that demonstrates the integration with the SDK. The purpose of this app is to facilitate the development process of a new application. It serves as a useful starting point for developers, helping to streamline the development process and familiarize them with the API. For more information, please refer to the Sample App page.

## Getting Support

Our professional support team is available to assist you throughout the integration process.

## System Requirements

The BiosenseSignal SDK supports a wide range of devices. The following requirements must be met in order to support the calculation of vital signs using the SDK.

### Flutter SDK

Flutter SDK version 1.20 or higher must be installed on the build machine. The Flutter SDK can be downloaded from https://docs.flutter.dev/get-started/install.

The BiosenseSignal Flutter SDK supports Android and iOS. Android-specific and iOS-specific system requirements can be found in the sections below.

### System Requirements - Android

The following device requirements must be met in order to use the BiosenseSignal Framework in your Android application:

#### Operating System Version

To run the BiosenseSignal SDK, Android 10 (API 29) or a higher version is required.

#### Benchmark Performance Verification

Based on the Geekbench 6 single-core results from https://browser.geekbench.com/android-benchmarks, it is recommended to use a device with a benchmark score of 500 or higher. Devices with a score of 300 or higher are supported.

#### CPU

The device processor Application Binary Interface (ABI) must support arm64-v8a. The following code can be used to verify the processor's support for arm64-v8a:

**Kotlin**

```kotlin
if (Build.SUPPORTED_64_BIT_ABIS.isEmpty() || !Build.CPU_ABI.contains("arm")) {
    // The processor is NOT supported
}
```

#### Camera

**FPS**  
The camera must support 30 FPS (frames per second) imaging. The SDK enforces this requirement by verifying that CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES contains a range with a minimum of 30 FPS and a maximum of 30 FPS.

**Image Size**  
The camera must allow an image output size of 640x480 pixels. The SDK enforces this requirement by verifying that CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP contains an output size of 640px width and 480px height.

### System Requirements - iOS

The following device requirements must be met in order to use the BiosenseSignal Framework in your iOS application:

#### iOS Version

iOS Deployment target 14 or later

**Note**  
The deployment target can be 11 or later, but if the device's iOS version number is lower than 14, the application must avoid calling the SDK API.

#### Xcode Version

Xcode 11.4 or a later version is necessary for developing applications that incorporate the BiosenseSignal Framework.

#### iOS Operating System Version

Running the BiosenseSignal Framework requires iOS 14 or later. When integrating with the BiosenseSignal iOS Framework, ensure that the deployment target of your application is iOS 11 or later. In such cases, it is the application's responsibility to not call the BiosenseSignal Framework when the runtime OS version is lower than iOS 14.

#### iPhone Devices

The list of iPhone devices compatible with the BiosenseSignal Framework includes iPhone XS and all subsequent iPhone models.

#### iPad Devices

The list of iPad devices compatible with the BiosenseSignal Framework includes iPad (6th generation) and all subsequent models, including the iPad Mini and iPad Pro families.

#### Swift Version

To ensure compatibility, make sure you are using Swift 5.0 or a more recent version.

#### C++ Flag

The BiosenseSignal iOS Framework is built with the C++17 flag [-std=c++17].

#### Architecture

The BiosenseSignal iOS Framework is compatible with arm64 architecture, which is supported by all recent iOS devices.

#### Camera

The BiosenseSignal Framework requires access to the device's camera in order to perform its functions.

### PPG Devices

#### Polar

To create a Polar session, you need a Polar device that meets the following criteria:

- The supported Polar device is Polar Verity Sense.
- The SDK requires a minimum firmware version of 2.1.0 to be supported.

**Note**  
See the following instructions on how to update the Polar's firmware.

## SDK Integration

Once you receive the BiosenseSignal*Flutter_SDK*<VERSION>.zip file, you are ready to add the Flutter SDK to your application.

Follow the steps below to integrate the SDK into your application.

### 1. Add the Framework to your Project

1.1. Extract the content of the BiosenseSignal*Flutter_SDK*<VERSION>.zip file into the root folder of your project.

1.2. Add the following to your pubspec.yaml, under the dependencies section:

```yaml
biosensesignal_flutter_sdk:
  path: ./BiosenseSignal_Flutter_SDK_<VERSION>
```

1.3. Run the following commands:

```bash
flutter pub get
cd ios
pod install
```

### 2. Android Integration with the SDK

2.1. In android/app/build.gradle modify minSdkVersion to 27.

2.2. In android/app/src/main/AndroidManifest.xml add the following:

```xml
<uses-permission android:name="android.permission.CAMERA"/>

<uses-feature android:name="android.hardware.camera" android:required="true"/>
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false"/>
<uses-feature android:name="android.hardware.camera.front" android:required="true"/>
<uses-feature android:name="android.hardware.camera.front.autofocus" android:required="false"/>
```

2.3. In android/app/src/main/java/<YOUR_PATH>/MainActivity.java make sure MainActivity extends either FlutterActivity or FlutterFragmentActivity:

**Kotlin**

```kotlin
package com.biosensesignal.flutter_sample

import io.flutter.embedding.android.FlutterActivity

class MainActivity: FlutterActivity() {

}
```

#### Additional setup when using Polar devices:

2.4. In your app's repositories section, add JitPack:

```gradle
repositories {
    ...
    maven { url 'https://jitpack.io' }
}
```

2.5. In your app's gradle dependencies section, add Polar dependencies:

```gradle
dependencies {
    ...
    implementation 'com.github.polarofficial:polar-ble-sdk:5.1.0'
    implementation 'io.reactivex.rxjava3:rxjava:3.1.6'
    implementation 'io.reactivex.rxjava3:rxandroid:3.0.2'
}
```

2.6. In your AndroidManifest.xml file, add the following permissions:

```xml
<!-- The SDK needs Bluetooth scan permission to search for BLE devices.
BiosenseSignal SDK doesn't use the scan to decide the location so "neverForLocation" permission
flag can be used.-->
<uses-permission
    android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation"
    tools:targetApi="s" />

<!-- BiosenseSignal SDK needs Bluetooth connect permission to connect for found BLE devices.-->
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Allows BiosenseSignal SDK to connect to paired bluetooth devices. Legacy Bluetooth permission,
which is needed on devices with API 30 (Android Q) or older. -->
<uses-permission
android:name="android.permission.BLUETOOTH"
android:maxSdkVersion="30" />

<!-- Allows BiosenseSignal SDK to discover and pair bluetooth devices. Legacy Bluetooth permission,
which is needed on devices with API 30 (Android Q) or older. -->
<uses-permission
android:name="android.permission.BLUETOOTH_ADMIN"
android:maxSdkVersion="30" />

<!-- BiosenseSignal SDK needs the fine location permission to get results for Bluetooth scan. Request
fine location permission on devices with API 30 (Android Q). Note, if your application
needs location for other purposes than bluetooth then remove android:maxSdkVersion="30"-->
<uses-permission
android:name="android.permission.ACCESS_FINE_LOCATION"
android:maxSdkVersion="30" />

<!-- The coarse location permission is needed, if fine location permission is requested. Request
coarse location permission on devices with API 30 (Android Q). Note, if your application
needs location for other purposes than bluetooth then remove android:maxSdkVersion="30" -->
<uses-permission
android:name="android.permission.ACCESS_COARSE_LOCATION"
android:maxSdkVersion="30" />
```

#### Build Android App Bundle (.aab)

**For SDK v5.11.1 and previous versions only**

**Note**  
Starting from November 2025 Google Play doesn't allow to upload apps with the useLegacyPackaging flag. Upgrade to SDK v5.11.2 and remove this flag when uploading to the Google Play.

When building the app as Android App Bundle (.aab extension), add the useLegacyPackaging flag to build.gradle file in the android folder, under the android section as the following example:

```gradle
android {
    packagingOptions {
        jniLibs {
            useLegacyPackaging = true
        }
    }
}
```

### 3. iOS Integration with the SDK

3.1. Grant the application camera permission in info.plist :

```xml
<key>NSCameraUsageDescription</key>
<string>Used for vital signs monitoring</string>
```

#### Additional setup when using Polar devices:

3.2. Grant the application bluetooth permission in info.plist

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>App needs access to your bluetooth in order to measure your health.</string>
```

3.3. Grant the application background mode permission in info.plist

```xml
<key>UIBackgroundModes</key>
<array>
    <string>bluetooth-central</string>
</array>
```

#### iOS Simulator Compatibility

The SDK is compatible with the Xcode simulator and will compile and run smoothly.

However, please note that as the simulator does not support camera access, attempting to create a face session will result in an error with the code cameraCodeNoCameraError = 1001.

#### Files App Access (for Logs)

When saveToPublicFolder is set to true in LogsConfiguration, logs will be saved to the app's Documents folder, making them accessible to users through the Files app under the "On My iPhone" section. To make the app visible in the Files app, include the following section in the app's Info.plist:

```xml
<key>UIFileSharingEnabled</key>
<true/>
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

## Flutter Sample Application

The Sample Application (also abbreviated as "SampleApp") is a reference project for implementing an application based on the BiosenseSignal SDK.

### Building the Sample Application

The following instructions are relevant for Flutter (Android & iOS) sample applications.

1. **Open the Sample App in the Code Editor of Your Choice.**  
   You may see errors regarding the missing package:biosensesignal_flutter_sdk imports. This will be solved after completing the following steps.

2. **Add the SDK to the application**  
   Place the SDK folder inside the project, at the same level of the lib, ios & android folders. Make sure to rename the folder to biosensesignalsdk, as in the screenshot below:

   ![SDK Folder Structure](img)

3. **Update the Sample App Dependencies**  
   Open the terminal application and navigate to the project's root directory. Run `flutter pub get` to update the Flutter dependencies.

4. **Update the Sample App Pods (iOS only)**  
   Open the terminal application and navigate to the ios directory. Run `pod install` to install and update the iOS Pods.

5. **Set the License Key**  
   Open the measurement_model.dart file.  
   Replace the `<ENTER_YOUR_LICENSE_KEY>` string, with the license key that you received by email.

   ```dart
   class MeasurementModel extends ChangeNotifier
       implements SessionInfoListener, VitalSignsListener, ImageDataListener {
     final licenseKey = "<ENTER_YOUR_LICENSE_KEY>";
     final measurementDuration = 60;
     Session? _session;
     sdk_image_data.ImageData? imageData;
   ```

6. **Configure the Measurement Duration (Optional)**  
   Open the measurement_model.dart file  
   Replace the value of measurementDuration with a value between 20-180. The value represents the measurement duration in seconds. The sample application allows the user to stop the measurement before the defined measurement duration.

   **Note**  
   Each vital sign has a minimal measurement duration that is required for calculating its value. For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

   ```dart
   class MeasurementModel extends ChangeNotifier
       implements SessionInfoListener, VitalSignsListener, ImageDataListener {
     final licenseKey = "<ENTER_YOUR_LICENSE_KEY>";
     final measurementDuration = 60;
     Session? _session;
     sdk_image_data.ImageData? imageData;
   ```

7. **Run the application**

   **Android**  
   Connect an Android device to your computer.  
   Use one of the following methods:
   - If you are using Android Studio IDE, then click the green play button.
   - If you are using VS Code IDE then press the <F5> key.
   - If you are using the terminal application then run `flutter run`.

   **iOS**  
   Connect an iOS device to your computer.  
   Use one of the following methods:
   - Open the ios/Runner.xcworkspace in XCode and click the play button.
   - If you are using VS Code IDE then press the <F5> key.
   - If you are using the terminal application then run `flutter run`.

### Measuring Vital Signs

- Position your face in the center of the camera preview.
- Click the Start button and verify that you see the face detection graphics (bounding rectangle).
- Pulse Rate vital sign values (this is an example of an "instantaneous" value) should be received after approximately 8 seconds.
- After the measurement ends (either by tapping on the Stop button or at the end of the defined measurement duration), an alert with the Pulse Rate and Mean RRi results will be shown (this is an example of a "final" result).
- The final results may be invalid if there was insufficient measuring time.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

Also see the following relevant pages:

- Best practices on how to take a measurement
- SDK Accuracy Targets
- SDK Alerts

## Quick Start

This quick start guide describes the basic flow for measuring vital signs using the BiosenseSignal SDK.

The SDK supports the following measurements modes:

- Face Measurement
- Polar Measurement

A sample flow for face measurement follows. See Measurement Modes for more information about measurement modes.

### Creating a Measurement Session

A session is an interface for performing vital sign measurements.

When creating a session, it is essential to define the measurement mode. The SDK supports two measurement modes:

- **Face Measurements (Front Camera)**: This mode utilizes the front camera for capturing face-related measurements.
- **Polar Measurements (External PPG Sensor)**: This mode enables measurements using the Polar Verity Sense sensor.

**Important Notes:**

- Only a single session can be created at any given time. Terminate the previous session before creating a new session.
- When switching to a different measurement mode (for example, from face to polar, or from polar to face), the current session must be terminated, and a new session must be created.
- A session is intended for a single user. When measuring the vital signs of another user, a new session must be created. See User Information.

The following code can be used to create a session with the relevant parameters:

**Note**  
For simplicity, the code sample below uses `this` (the current class) as the implementor of all the session builder listeners.

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    Session? session = await FaceSessionBuilder()
        .withImageDataListener(this)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

### Waiting for the Session to Transition into ready State

The application can receive session state updates by implementing `onSessionStateChange` as part of `SessionInfoListener`.

```dart
@override
void onSessionStateChange(SessionState sessionState) {
    if (state == SessionState.ready) {
        print("Session is ready to start measuring");
    }
}
```

**Note**  
For more information on session states and state transitions, see Session State section.

### Starting a Measurement

A measurement can be started by calling the `start` method

```dart
try {
    var measurementDuration = 60;
    session.start(measurementDuration);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

### Receiving Results During a Measurement

The application can receive instantaneous vital signs values by implementing `onVitalSign` as part of `VitalSignsListener`.

```dart
 @override
 void onVitalSign(VitalSign vitalSign) {
    // Handle vital sign result
}
```

During the measurement, the instantaneous vital sign values are available only for specific vital signs, while the results of all vital signs are received once the measurement has been completed.

**Note**  
For more information on receiving and handling vital sign information, see Vital Signs.

### Stopping a Measurement

The measurement is stopped either after the measurement duration (provided in the `start` function) has ended, or when the `stop` method is called.

```dart
try {
    session.stop();
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

**Note**  
Calling the `stop` method initiates the calculation of the final results. See Vital Signs

**Important**  
When the measurement stops, the session will transition to the stopping state.

The stopping state reflects that the session has initiated a stopping process that ends when the session state transitions to ready. At this point, a new measurement can be started.

### Receiving Final Results

The application can receive final vital sign results and vital sign confidence levels by implementing `onFinalResults` as part of `VitalSignsListener`.

```dart
 @override
void onFinalResults(VitalSignsResults results) {
    // Handle the final results of the measurements
}
```

The final results are computed when the session is in stopping state. For more information about receiving and handling the final results, see Vital Signs.

### Terminating a Session

It is recommended to terminate the session whenever the measuring screen is not visible.

```dart
session.terminate();
```

**Important**  
Terminating the current session is mandatory in order to create a new session. When calling `terminate()`, the session will transition to terminating state.

The terminating state means that the session has started a termination process that ends when the session state transitions to terminated.

## Measurement Modes

The SDK supports the following measurements modes:

- Face Measurement
- Polar Measurement

Once a face session is created, the application can receive notification on the session state transitions, the allowed vital signs for the session and set the user information.

### Face Measurement

A face measurement is performed by creating a face session and facing the front (selfie) camera to the user's face.

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    Session? session = await FaceSessionBuilder()
        .withImageDataListener(this)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

After creating the face session the application can receive the camera images, create camera preview, set the [device orientation] and enforce the image validity according to the measurement guidance.

#### Face Measurement Using the Back Camera

The SDK now supports taking face measurements using the back camera. It is recommended to set `.withStrictMeasurementGuidance(false)` when using the back camera to ensure accurate face distance calculations and avoid invalid image issues.

**Note**  
This option is for evaluation and integration purposes only. Please contact our support if you would like to use this option in production.

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    Session? session = await FaceSessionBuilder()
        .withCameraLocation(CameraLocation.back)
        .withImageDataListener(this)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

### Polar Measurement

A Polar measurement is conducted by creating a polar session and pairing the device with the Polar Verity Sense sensor.

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    String deviceId = "<ENTER_POLAR_DEVICE_ID>"
    Session? session = await PolarSessionBuilder(deviceId)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .withPPGDeviceInfoListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

The user must wear the Verity Sense device on the forearm and follow the best practices for taking a measurement using external devices.

The Polar Device ID can either be retrieved by the PPG Device Scanner or found on the Polar device as shown in the image below:

![Polar Device ID](img)

Additional information regarding Polar Verity Sense can be found in Polar Verity Sense User Manual.

## Session State

A measuring session is always in a "state". The session transitions between possible states either by following an API action called by the application, or via internal logic that is intended to prepare the session for performing measurements. The session state diagram appears in the figure below.

### Session States

**State Diagram**

![Session State Diagram](img)

The table below provides a description of each session state:

| State Name   | State Definition                                                                                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| initializing | The session is in its initial state, performing initialization actions. Please wait until you receive the message indicating that the session is in the ready state before starting to measure vital signs or before calling any session APIs.                                                   |
| ready        | The session is now ready to be started. The application can display the camera preview, if using face measurements. Refer to the Creating a Preview page for detailed instructions. On Polar sessions the SDK starts receiving data from the PPG device and optimized for a quick session start. |
| starting     | The session is currently preparing to measure vital signs.                                                                                                                                                                                                                                       |
| processing   | The session is processing the data and calculating vital signs. For information on the handling of instantaneous vital signs, please refer to the Vital Signs page.                                                                                                                              |
| stopping     | The session has been stopped, and the measurement results are being calculated. For information on the handling the final results, please see the Vital Signs page.                                                                                                                              |
| terminating  | The session is currently being terminated. Please refrain from calling any session APIs.                                                                                                                                                                                                         |
| terminated   | The session has been gracefully terminated, and a new session can now be initiated.                                                                                                                                                                                                              |

### Session State Transitions

The table below describes the actions that cause a transition between the states:

| State        | Next State   | Trigger                                                                                                                                                                                                                                                                                                                          |
| ------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| initializing | ready        | Once all initialization actions are completed, the session transitions to the ready state.                                                                                                                                                                                                                                       |
| initializing | terminating  | When a connection with a PPGDeviceSession is lost and the session has been terminated then the SDK will transition to terminating state.                                                                                                                                                                                         |
| ready        | starting     | Calling the start() method causes the session to transition to the starting state.                                                                                                                                                                                                                                               |
| starting     | processing   | The session's actions in the starting state were completed.                                                                                                                                                                                                                                                                      |
| processing   | stopping     | The session will transition to the stopping state under the following circumstances:<br>• The measurement ends gracefully either because it reached the defined duration or due to a manual invocation of the stop() method.<br>• The measurement was stopped due to an error. Refer to the Alerts section for more information. |
| stopping     | initializing | This transition is relevant only for PPGDeviceSession. When the connection with the device is lost, the SDK will transition to the initializing state and remain there until it either successfully reconnects with the device or the session is terminated.                                                                     |
| stopping     | ready        | The SDK has finished performing the vital sign calculations.                                                                                                                                                                                                                                                                     |
| ready        | terminating  | By calling the terminate() method, the session transitions to the terminating state.                                                                                                                                                                                                                                             |
| terminating  | terminated   | The termination actions have been completed.                                                                                                                                                                                                                                                                                     |

**Note**  
The starting, stopping and terminating states are 'transition states' that end automatically after a short period. Do not call any session methods while the session is in transition.

### Receiving Session State Updates

The application can receive session state updates by implementing `onSessionState` as part of `SessionInfoListener`:

```dart
void onSessionStateChange(SessionState sessionState) {
    // Receive session state updates
}

void onWarning(WarningData warningData) {
    // Receive warnings
}

void onError(ErrorData errorData) {
    // Receive errors
}

void onLicenseInfo(LicenseInfo licenseInfo) {
    // Receive license info
}

void onEnabledVitalSigns(SessionEnabledVitalSigns enabledVitalSigns) {
    // Receive the enabled vital signs for the session
}
```

### Handling State Transitions

The code below is a simple example for handling session transitions updates by implementing `onSessionState` as part of `SessionInfoListener`.

````dart
@override
void onSessionStateChange(SessionState sessionState) {
    switch (sessionState) {
        case SessionState.initializing:
            print("Session is initializing and NOT ready");
            break;
        case SessionState.ready:
            print("Session is ready to start measuring");
            break;
        case SessionState.starting:
            print("Session is preparing for the measurement of vital signs");
            break;
        case SessionState.processing:
            print("Session is measuring vital signs");
            break;
        case SessionState.stopping:
            print("Session is stopping the measuring of vital signs");
            break;
        case SessionState.terminating:
            print("Session is preparing to terminate");
            break;
        case SessionState.terminated:
            print("Session is terminated");
            break;
    }
}

## Enabled Vital Signs

Enabled Vital Signs is a list of vital signs that are set to be measured in the course of a specific session. The Enabled Vital Signs list is the intersection of all vital signs that are supported according to the following criteria:

- **Device** - vital signs that are supported by the current device.
- **Measurement Mode** - vital signs that are supported by the current measurement mode (face/polar).
- **License** - vital signs that are determined by the current license, as specified in the license agreement.

### Receiving Enabled Vital Signs

The application can receive information regarding the enabled vital signs by implementing `onEnabledVitalSigns` as part of `SessionInfoListener`:

```dart
void onSessionStateChange(SessionState sessionState) {
    // Receive session state updates
}

void onWarning(WarningData warningData) {
    // Receive warnings
}

void onError(ErrorData errorData) {
    // Receive errors
}

void onLicenseInfo(LicenseInfo licenseInfo) {
    // Receive license info
}

void onEnabledVitalSigns(SessionEnabledVitalSigns enabledVitalSigns) {
    // Receive the enabled vital signs for the session
}
````

### Checking if a Vital Sign is Enabled

The following code can be used to determine the supported vital signs:

````dart
@override
void onEnabledVitalSigns(SessionEnabledVitalSigns enabledVitalSigns) {
    // Checking if pulse rate is enabled
    print("Is pulse rate enabled: ${enabledVitalSigns.isEnabled(VitalSignTypes.pulseRate)}");

    // Checking if pulse rate is enabled for the specific device:
    print("Is pulse rate device enabled: ${enabledVitalSigns.isDeviceEnabled(VitalSignTypes.pulseRate)}");

    // Checking if pulse rate is enabled for the measurement mode:
    print("Is pulse rate mode enabled: ${enabledVitalSigns.isMeasurementModeEnabled(VitalSignTypes.pulseRate)}");

    // Checking if pulse rate is enabled for the license:
    print("Is pulse rate license enabled: ${enabledVitalSigns.isLicenseEnabled(VitalSignTypes.pulseRate)}");
}

## User Information

For the calculation of the ASCVD Risk and the Heart Age indicators, the SDK requires receiving the user information with the details of the user taking the measurement.

The demographic information consists of three fields:

- Sex (as classified at birth) [UNSPECIFIED / MALE / FEMALE]
- Age [years]
- Weight [Kilograms]
- Height [Centimeters]
- Smoking Status [UNSPECIFIED / SMOKER / NON_SMOKER]

The application can provide the user information as part of the session initialization.

In the following example, the sex is female, the age is 35 years, the weight is 65 kilograms, the height is 165 centimeters and the smoking status is smoker. In the example the measurement session is a face session, but it can be used in a PPG Device session as well.

```dart
try {
    final licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    final userInformation = UserInformation(sex: Sex.female, age: 35, weight: 65, height: 165, smokingStatus: SmokingStatus.smoker);
    Session? session = await FaceSessionBuilder()
        .withUserInformation(userInformation)
        .withImageDataListener(this)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
````

If any of the user information parameters is unknown, it is recommended to provide the known parameters and to leave the others 'null'/'UNSPECIFIED'.

**Important**  
When a session is created with user information, all measurements performed during that session use the same user information. Therefore, a new session must be created in order to update the user information.

## Logs

The SDK includes an optional logging feature that lets apps save encrypted, lightweight log files locally. These logs can assist in diagnosing unexpected behavior or other issues during SDK usage.

Through a configurable API, applications can:

- Specify which types of logs to collect.
- Choose whether logs are saved to a publicly accessible folder.
- Receive a notification when the logs are ready after a session completes.

To enable logging, use the `withLogs(configuration, listener)` method available on both `FaceSessionBuilder` and `PolarSessionBuilder`.

### Creating a Session with Logs

Create a `LogsConfiguration` object and pass it to `withLogs(configuration, listener)`. Optionally, provide a `LogsListener` to receive a callback when the logs are saved.

```dart
try {
  final licenseDetails = LicenseDetails(licenseKey: "<ENTER_YOUR_LICENSE_KEY>");

  final logsConfiguration = LogsConfiguration(
    logsLevel: LogsLevel.defaultLogs,
    saveLogsToPublicFolder: true
  );

  final session = await FaceSessionBuilder()
      .withImageListener(this)
      .withVitalSignsListener(this)
      .withSessionInfoListener(this)
      .withLogs(logsConfiguration, this)
      .build(licenseDetails);
} catch (e) {
  print('Error creating session: $e');
}
```

### Logs Configuration

Use `LogsConfiguration` to control logging behavior.

```dart
class LogsConfiguration {
  final LogsLevel logsLevel;
  final bool saveLogsToPublicFolder;
}
```

- `logsLevel`: The desired logging level (see Logs Level).
- `saveLogsToPublicFolder`: If true, logs are saved to a publicly accessible folder (for easy access or sharing).

### Logs Level

Defines the verbosity and types of logs to collect. Currently, only the default level is available.

```dart
enum LogsLevel {
  defaultLogs
}
```

### Logs Listener

Implement the `LogsListener` abstract class to receive log information when the session ends.

```dart
abstract class LogsListener {
  void onLogsReady(LogsInfo logsInfo);
}
```

The SDK invokes this method after the logs are successfully saved.

### Logs Info

The `LogsInfo` object provides details about the saved logs.

```dart
class LogsInfo {
  final int measurementDuration;
  final String logsPath;
}
```

- `measurementDuration`: Duration of the measurement in seconds.
- `logsPath`: Full path to the saved log files.

### Permissions required for iOS

When `saveLogsToPublicFolder` is set to true in `LogsConfiguration`, logs will be saved to the app's Documents folder, making them accessible to users through the Files app under the "On My iPhone" section. To make the app visible in the Files app, include the following section in the app's Info.plist:

```xml
<key>UIFileSharingEnabled</key>
<true/>
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

## Images

The application can receive the camera image stream from the SDK by implementing `ImageListener`, and then pass it to the session builder when creating a face session.

The SDK sends an `ImageData` object that contains:

- The current image captured by the camera.
- The face detection coordinates, as calculated by the SDK.
- The image validity information.

```dart
@override
void onImage(ImageData imageData) {
    // imageData.imageWidth -       The image's width
    // imageData.imageHeight -      The image's height
    // imageData.roi -              A geometry.Rect object
    // imageData.imageValidity -    An integer with a value from com.biosensesignal.sdk.api.images.ImageValidity class
}
```

By default, the SDK processes camera images in a portrait orientation, regardless of the device orientation. Instructions on how to process the camera stream in other orientations can be found at Device Orientation Setup.

## Creating a User Preview

As part of your application, it is recommended to present the user with a camera preview, as it helps the user to center his/her face on the camera screen. It also allows for the presentation of a face detection bounding graphic on the screen.

The following code can be used to create a preview and present a face detection bounding graphic to the user.

### 1. Add a CameraPreviewView widget to the screen

`CameraPreviewView` widget is supplied by the BiosenseSignal Flutter SDK. It is a wrapper widget of a native (iOS/Android) view.

**Note**  
Due to performance considerations, the camera preview is implemented as a native view that presents the images received from the SDK and is wrapped by a Flutter widget.

The aspect ratio of the images received from the SDK is 4:3. In order to preserve the same aspect ratio in the UI and prevent image distortion, the `CameraPreviewView` widget is wrapped with Flutter's `AspectRatio` widget, set to `aspectRatio: 0.75`.

```dart
class _CameraPreview extends StatefulWidget {
  const _CameraPreview({ Key? key }) : super(key: key);

  @override
  _CameraPreviewState createState() => _CameraPreviewState();
}

class _CameraPreviewState extends State<_CameraPreview> {

  Size? size;

  @override
  Widget build(BuildContext context) {

    return WidgetSize(
      onChange: (size) => setState(() { this.size = size; }),
      child: AspectRatio(
        aspectRatio: 0.75,
        child: Stack(
          children: [
            Stack(
              children: <Widget>[
                const CameraPreviewView(),
                _FaceDetectionView(size: size),
              ],
            ),
          ]
        )
      )
    );
  }
}
```

### 2. Drawing the Face Detection Graphics

Face detection graphics are implemented in Flutter on the `CameraPreviewView` widget. This allows the application to control the look and feel of the face detection bounding graphic in accordance with the application's UI requirements. The position of the face detection bounding graphic in the image is provided by the SDK.

````dart
class _FaceDetectionView extends StatelessWidget {

  final Size? size;
  const _FaceDetectionView({ Key? key, required this.size}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    var imageInfo  = context.select<MeasurementModel, sdk_image_data.ImageData?>((model) => model.imageData);
    if (imageInfo == null) {
      return Container();
    }

    var roi = imageInfo.roi;
    if (roi == null) {
      return Container();
    }

    var devicePixelRatio = MediaQuery.of(context).devicePixelRatio;
    var widthFactor = size!.width / (imageInfo.imageWidth / devicePixelRatio);
    var heightFactor = size!.height / (imageInfo.imageHeight / devicePixelRatio);
    return Positioned(
      left: (roi.left * widthFactor) / devicePixelRatio,
      top: (roi.top * heightFactor) / devicePixelRatio,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.transparent,
          border: Border.all(width: 4, color: const Color(0xff0653F4)),
          borderRadius: BorderRadius.circular(5),
        ),
        width: (roi.width * widthFactor) / devicePixelRatio,
        height: (roi.height * heightFactor) / devicePixelRatio
      )
    );
  }
}

## Device Orientation

The SDK supports the setting of the device orientation in face measurement sessions. The orientation is determined by the application during the session creation and can be set according to the current device orientation at the time the session is created, or according to the preferred UI orientation.

The orientation is defined as the position of the native base of the device (also commonly known as the charging port location), relative to the device's current rotation. For example, if the device is rotated so its base is to the left of the user, then the orientation is defined as `landscapeLeft`.

The default device orientation is `portrait`. If any other orientation is requested, then it must be provided when creating a new measurement session.

In the following example, the device orientation is `landscapeLeft`:

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    Session? session = await FaceSessionBuilder()
        .withDeviceOrientation(DeviceOrientation.landscapeLeft)
        .withSessionInfoListener(this)
        .withVitalSignsListener(this)
        .withImageDataListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
````

The SDK defines the possible device orientations as an enum:

```dart
enum DeviceOrientation {
  portrait,             //The power charging port is facing down
  portraitUpsideDown,   //The power charging port is facing up
  landscapeLeft,        //The power charging port is facing left
  landscapeRight        //The power charging port is facing right
}
```

When the device orientation differs from the requested orientation during a measurement, then:

- The SDK will indicate that the image orientation is incorrect as part of `ImageListener`.
- Images with an incorrect orientation will not be processed by the SDK.

## Image Validity

While the basic instruction for taking a measurement is simple—just look at the camera and start the measurement—there are a few guidelines that the user must follow to ensure accurate measurement results. These guidelines are listed in the best practices for taking a measurement.

During the measurement, the SDK assists the user in following these guidelines. It validates each camera image and updates the `imageValidity` with any detected deviations from the guidelines.

An image is considered valid if the SDK did not detect any violations to the best practices for taking a measurement. If the image is not considered valid the SDK reports the reason for invalidating the image.

The conditions in the table below will invalidate the image for processing by the SDK.

| Name                     | Meaning                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| valid                    | The image is valid.                                                                                               |
| invalidDeviceOrientation | The device orientation is unsupported for the session.                                                            |
| invalidRoi               | The SDK cannot detect the user's face.                                                                            |
| tiltedHead               | The user's face is not facing directly towards the camera.                                                        |
| faceTooFar               | The user's face is positioned too far from the camera. Instruct the user to hold the camera closer to their face. |
| unevenLight              | The light on the user's face is not evenly distributed.                                                           |

Image validity verification is reported as part of `onImageData` as part of `ImageDataListener`:

```dart
@override
void onImageData(ImageData imageData) {
    switch (imageData.imageValidity) {
        case ImageValidity.valid:
            // Valid
            break;
        case ImageValidity.invalidDeviceOrientation:
            // Invalid device orientation
            break;
        case ImageValidity.invalidRoi:
            // Invalid ROI
            break;
        case ImageValidity.tiltedHead:
            // Tilted Head
            break;
        case ImageValidity.faceTooFar:
            // Face Too Far
            break;
        case ImageValidity.unevenLight:
            // Uneven Light
            break;
    }
}
```

**Note**  
It is possible that an image is not valid due to several reasons. For example, when a user is too far and the light is not evenly distributed on his face.

## Measurement Guidance

For precise face measurements with the BiosenseSignal SDK, the user is required to follow the image validation guidance. The SDK guides users to adhere to measurement guidelines, specifying exceptions in the Image Validity information. For detailed information on image validity, see the Image Validity page.

The SDK notifies the application about the image validity of each frame. It is highly recommended to prompt the user for any reported exception and instruct them to adhere to the best practices for taking a measurement. Utilize the sample application code for implementing image validity prompt notifications.

The SDK supports configuring whether to enable strict measurement guidance. This setting determines whether the SDK processes all video images when a face is detected (default behavior) or only processes images with valid image validity. In the following example, the strict measurement guidance is set to true:

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    Session? session = await FaceSessionBuilder()
        .withStrictMeasurementGuidance(true)
        .withSessionInfoListener(this)
        .withVitalSignsListener(this)
        .withImageDataListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

### Strict Measurement Guidance Set to False (Default)

When set to false (default SDK behavior), the SDK processes all video images as long as a face is detected (ROI image data exists).

### Strict Measurement Guidance Set to True

When set to true, the SDK will process only valid face images to ensure increased precision.

If a sequence of invalid images persists for over 0.5 seconds, the SDK warns of a significant gap. In addition to affecting the precision of the results, these gaps may also cause delays in the appearance of vital signs and impact confidence in the final results.

On a third occurrence of a 0.5-second gap, the SDK throws an error, stopping the session without final results. This behavior statistically improves measurement precision and encourages users to follow measurement guidance more effectively.

The table below summarizes the differences between setting Strict Measurement Guidance to true and false.

| Strict Measurement Guidance                                              | False (default)                                                           | True                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Report Image Validity Info                                               | Yes                                                                       | Yes                                                               |
| Images with invalid Image Validity                                       | Processed by SDK, as long as the face is detected (ROI image data exists) | Not processed by SDK                                              |
| Periods over 0.5 sec with invalid Image Validity but with ROI image data | No warning is issued                                                      | Issues a warning when the user complies again with the guidelines |
| Impact on precision                                                      | Normal precision                                                          | Increased precision                                               |

## PPG Device Session

Besides measurements using the camera, the SDK also supports Vital Sign measurements using PPG Devices. The current supported devices are:

- Polar (Polar Verity Sense model)

Creating a PPG Device session is done by using the `PolarSessionBuilder` API

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    String deviceId = "<ENTER_POLAR_DEVICE_ID>"
    Session? session = await PolarSessionBuilder(deviceId)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .withPPGDeviceInfoListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

During session initialization, the SDK attempts to connect with the specified PPG Device using the provided device type and device ID. The session transitions to the ready state only when the connection is established. Session creation may fail for various reasons, such as disabled Bluetooth on the mobile device or an outdated PPG device firmware. For detailed error information, please consult the Alerts List.

## PPG Device Info

The application can receive info related to the PPG device by implementing `PPGDeviceInfoListener`, and then pass it to the session builder when creating a session.

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    String deviceId = "<ENTER_POLAR_DEVICE_ID>"
    Session? session = await PolarSessionBuilder(deviceId)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .withPPGDeviceInfoListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

Upon successful initialization and connection with a PPG Device, the SDK sends a `PPGDeviceInfo` object containing the device type, ID, and version.

The info of the connected PPG Device.

```dart
  @override
  void onPPGDeviceBatteryLevel(int level) {
    // Receive battery level changes
  }

  @override
  void onPPGDeviceInfo(PPGDeviceInfo ppgDeviceInfo) {
    // ppgDeviceInfo.deviceType -       The PPGDeviceType
    // ppgDeviceInfo.deviceId -         The device's ID
    // ppgDeviceInfo.version -          The firmware version of the device
  }
```

The SDK also provides the initial battery level of the device upon connection, as well as any subsequent changes in the device's battery level while the session is active.

```dart
  @override
  void onPPGDeviceBatteryLevel(int level) {
    // Receive battery level changes
  }

  @override
  void onPPGDeviceInfo(PPGDeviceInfo ppgDeviceInfo) {
    // ppgDeviceInfo.deviceType -       The PPGDeviceType
    // ppgDeviceInfo.deviceId -         The device's ID
    // ppgDeviceInfo.version -          The firmware version of the device
  }
```

## PPG Device Scanner

The SDK provides an API to scan for nearby PPG devices, based on a specified PPGDeviceType. The results obtained during the scan can be utilized later to create PPG Device sessions with any device from the list.

### Creating a PPG Device Scanner

Scanning for PPG Devices is done by creating a PPGDeviceScanner object. In the following sample, a scanner, searching for PPGDeviceType.POLAR, is created, with this as the PPGDeviceScannerListener.

```dart
PPGDeviceScanner scanner = PPGDeviceScanner(PPGDeviceType.POLAR, this);
```

### Starting a Scan for PPG Devices

To initiate a scan, call the start method. If the method is called without a timeoutDuration parameter, or with a value of 0 or below, the default timeout of 60 seconds is used. The timeout duration should be specified in seconds.

If a scanner is already performing a scan, calling start will first stop the current scan before starting a new one.

In the following example, scanner.start is called with a timeoutDuration of 30 seconds.

```dart
try {
    var timeoutDuration = 30;
    scanner.start(timeoutDuration);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

### Receiving Results During a Scan

To receive PPGDevice objects, the application should implement the onPPGDeviceDiscovered method as part of PPGDeviceScannerListener.

The PPGDevice objects obtained through this method represent nearby PPG devices found by the scanner during the scan. These devices are potential candidates for establishing a session later, utilizing their deviceId field.

```dart
@override
void onPPGDeviceDiscovered(PPGDevice ppgDevice) {
    // ppgDevice.deviceType -      The PPGDeviceType of the found device
    // ppgDevice.deviceId   -      The ID to use later when creating a PPG Device Session
}

@override
void onPPGDeviceScanFinished() {
    // Called when a scan is finished or stopped
}
```

**Note**

Please note that devices found during the scan do not guarantee a successful session establishment. Certain factors, such as the device having a version lower than the allowed minimum in the SDK, can cause a session to fail.

For more information on potential errors during session establishment, refer to the Alerts List.

### Stopping a Scan for PPG Devices

During a scan, it will automatically stop when the timeout period ends. Additionally, the application can manually stop the scan by calling the stop method.

```dart
scanner.stop();
```

When a scan timeout is finished, the method onPPGDeviceScanFinished (part of PPGDeviceScannerListener) is called.

```dart
@override
void onPPGDeviceDiscovered(PPGDevice ppgDevice) {
    // ppgDevice.type     -      The PPGDeviceType of the found device
    // ppgDevice.deviceID -      The ID to use later when creating a PPG Device Session
}

@override
void onPPGDeviceScanFinished() {
    // Called when a scan is finished or stopped
}
```

## Fall Detection

### Creating a Session with Fall Detection Enabled

When creating a PPG Device session the application can instruct the SDK to monitor falling events during the lifetime of that session.

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    String deviceId = "<ENTER_POLAR_DEVICE_ID>"
    Session? session = await PolarSessionBuilder(deviceId)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .withPPGDeviceInfoListener(this)
        .withFallDetectionListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

When such a session is created and transitioned to ready state, falling events are continuously monitored as long as the session is in any of the states ready, starting, processing and stopping. For more information on the session states see the Session State page.

**Note**

When a session with fall detection is created the fall detection is active also when the SDK is in ready state! On the other hand, vital signs are measured only during the processing state and reported when the state stops and returns to ready state.

A fall event data includes the estimated fall peak time. There might be a delay of up to 5 seconds between the fall itself and the fall notification.

The application can receive indication on a fall event by implementing FallDetectionListener:

```dart
 @override
void onFallDetection(FallDetectionData data) {
    // data.time -       A DateTime object. The time the fall was detected
}
```

### License Support for Fall Detection and Error Handling

To utilize fall detection within a session, your license must be configured to enable this feature. If your license does not support fall detection, the SDK will return the error licenseCodeFallDetectionDisabledError shortly after the session is created. Please contact our support team to enable the fall detection feature for your license.

The error monitoringStoppedError indicates that the SDK stopped monitoring fall detection events during the lifetime of this session due to some error. A new session can be created to work around this temporary issue.

Other errors might also happen during the lifetime of a session. It is possible that an error occurs, but the session is still in processing state. In that case the vital signs measurements are still active, but the fall detection is paused for that session until it terminates. A new session can be created to work around this temporary issue.

**Note**

In the event of unstable communication with the PPG device, the bandwidth between the SDK and the PPG device may be affected. For more information, please refer to the monitoringDataGapExceedsLimitWarning warning in the Alerts List page.

## Alerts

Alerts are messages that are sent from SDK to the application when a malfunction occurs. There are two alert categories:

Warning - indicates a minor, temporary issue that does not interrupt the current operation.
Error - indicates a severe incident that cannot be resolved by the SDK and results in the termination of any in-progress measurement.
The alert object contains a numeric code that represents a specific issue.

The reasons for warnings and errors can vary - from accuracy problems to incorrect API usage, to license issues or even device-related errors.

### Receiving Alerts

In the event that an alert is received, it is recommended to display the numeric alert code in the UI for reference. If the alert is related to a misuse of the SDK or to improper measurement conditions, and the issue persists, please contact the support team.

The application can receive alerts by implementing onError and onWarning as part of SessionInfoListener .

```dart
@override
void onSessionStateChange(SessionState sessionState) {
    // Receive session state updates
}

@override
void onWarning(WarningData warningData) {
    // Receive warnings
}

@override
void onError(ErrorData errorData) {
    // Receive errors
}

@override
void onLicenseInfo(LicenseInfo licenseInfo) {
    // Receive license info
}

@override
void onEnabledVitalSigns(SessionEnabledVitalSigns enabledVitalSigns) {
    // Receive the enabled vital signs for the session
}
```

### Warnings

A warning indicates a minor, temporary issue. While a warning does not interrupt the measurement, it is encouraged to guide the user on how to avoid such warnings in the future, and to follow the best practices for taking a measurement.

```dart
@override
void onWarning(WarningData warningData) {
    print("WARNING", "Received Warning. Domain: ${warningData.domain} Code: ${warningData.code}");
}
```

### Errors

An error indicates a severe incident from which the SDK cannot recover. Some of the common reasons for errors include network issues, CPU overload, insufficient lighting, and sub-standard environmental conditions. See the Alerts List for details on each error.

When an error occurs during the measurement, the SDK will terminate any ongoing measurement and will refrain from sending vital sign results to the application. Additionally, the session state will transition from measuring to stopping (see Session States).

### Internal Errors

If an invalid SDK internal state occurs during the operation of the SDK, an internal error will be returned to the application. The internal error number may not appear in the Alerts List page. As mentioned earlier, it is advisable to display the error number in the user interface for reference.

If an internal error is received, please report it to the support team. Include the error code you received and provide a detailed description of the problem.

```dart
@override
void onError(ErrorData errorData) {
    print("Received Error. Domain: ${errorData.domain} Code ${errorData.code}");
}
```

## Alerts List

This page contains a list of public SDK alerts. Some of them can be received via SessionInfoListener, while others can be received as a HealthMonitorException.

You can reference these alerts in your code using the class AlertCodes.

**Note**

The alerts list JSON file is available to download here: alerts.json. To save the file, right-click the link and choose the option to download.

### deviceCodeLowPowerModeEnabledError

Code: 4  
Cause: A session was requested to run while the device is in 'Low Power' mode.  
Solution: The user should open the device settings and turn off 'Low Power Mode' or charge your device until the 'Low Power Mode' turns off.

### deviceCodeMinimumOsVersionError

Code: 8  
Cause: The device's operating system version is lower than the minimum version required to run the SDK.  
Solution: Upgrade the device operating system or use another device.

### deviceCodeMinimumBatteryLevelError

Code: 14  
Cause: The battery level is below 20% and prevents accurate measurement.  
Solution: The user should connect the device to a charger and wait until battery is sufficiently charged.

### deviceCodeClockSkewError

Code: 17  
Cause: Severe clock skew detected  
Solution: The user should verify that the device date, time, and timezone are set correctly. It is recommended to set the date and time automatically in the device settings.

### deviceBluetoothIsOffError

Code: 19  
Cause: The Bluetooth is off.  
Solution: Instruct the user to turn on Bluetooth.

### deviceBluetoothMissingPermissionsError

Code: 20  
Cause: The application does not have Bluetooth permissions.  
Solution: Instruct the user to grant the application permissions to use the Bluetooth.

### deviceLocationIsOffError

Code: 21  
Cause: The device location service is off.  
Solution: Instruct the user to turn on the device location service in the device settings.

### cameraCodeNoCameraError

Code: 1001  
Cause: The session.start() command was called, but the device has no camera with the required specifications.  
Solution: The camera must support a resolution of 640x480 at 30FPS. The user should verify that the device camera works properly.

### cameraCodeCameraOpenError

Code: 1002  
Cause: Could not operate the camera.  
Solution: The user should verify that the device camera works properly and try again. If the problem persists, the user should restart the application.

### cameraCodeCameraMissingPermissionsError

Code: 1005  
Cause: The application does not have permission to access the camera.  
Solution: The user should access the device settings and grant the application permission to use the camera.

### cameraCodeUnexpectedImageDimensionsWarning

Code: 1501  
Cause: The images received from the camera have a different resolution than the requested resolution.  
Solution: Instruct the user to retry taking the measurements. If the problem persists, then the device is probably malfunctioning, or does not support VGA resolution. The user should be instructed to use a different device. Although this is just a "warning" alert, and the measurement continues, the accuracy of the measurement may be impacted by the unexpected resolution.

### licenseCodeActivationLimitReachedError

Code: 2002  
Cause: No more devices can be used with your license  
Solution: Contact the sales team to increase the number of device authorizations in your license.

### licenseCodeMeterAttributeUsesLimitReachedError

Code: 2003  
Cause: No more measurements are allowed for the provided license. (Relevant only for customers with a 'per session' license).  
Solution: Contact the sales team to increase the number of measurements in your license.

### licenseCodeAuthenticationFailedError

Code: 2004  
Cause: Several issues might cause this error: clock skew detected, the SDK was unable to authenticate the license, a bad token was received from the license server  
Solution: The user should take the following actions: Check the internet connection. Set the device time correctly. Verify that the device has sufficient storage.

### licenseCodeInvalidLicenseKeyError

Code: 2007  
Cause: The provided license key is invalid.  
Solution: Use the license key provided by the support team. If the problem persists, contact the support team.

### licenseCodeRevokedLicenseError

Code: 2010  
Cause: The license was revoked.  
Solution: Contact the customer support team.

### licenseCodeInternalError9

Code: 2016  
Cause: SSL error. Unable to authenticate the license server response.  
Solution: The user should check the device's local time, internet connection, try a different network, or try again later.

### licenseCodeLicenseExpiredError

Code: 2017  
Cause: The license has expired.  
Solution: Contact the customer support team.

### licenseCodeLicenseSuspendedError

Code: 2018  
Cause: The license is suspended.  
Solution: Contact the customer support team.

### licenseCodeNetworkIssuesError

Code: 2024  
Cause: No internet connection.  
Solution: Check your internet connection and The user should check the internet connection and try again. again

### licenseCodeSslHandshakeError

Code: 2025  
Cause: SSL certificate security warning.  
Solution: The user should check the device's local time, internet connection, try a different network, or try again later.

### licenseCodeInputLicenseKeyEmptyError

Code: 2032  
Cause: No license key was provided to the SDK.  
Solution: Initiate the SDK with a valid license key, provided by the support team.

### licenseCodeInputProductIdIllegalError

Code: 2034  
Cause: An invalid product ID was provided.  
Solution: The product ID must be null when establishing a session.

### licenseCodeCannotOpenFileForReadError

Code: 2035  
Cause: The SDK cannot read from the file system, or a file may be corrupted.  
Solution: Instruct the user to check the installation integrity.

### licenseCodeMonthlyUsageTrackingRequiresSyncError

Code: 2036  
Cause: The SDK failed to authenticate with the license server as required by the license type.  
Solution: Instruct the user to check the internet connection and try again.

### licenseCodeSslHandshakeDeviceDateError

Code: 2037  
Cause: SSL certificate security warning.  
Solution: The user should check the device's local time, internet connection, try a different network, or try again later.

### licenseCodeSslHandshakeCertificateExpiredError

Code: 2038  
Cause: SSL certificate security warning.  
Solution: The user should check the device's local time, internet connection, try a different network, or try again later.

### licenseCodeMinSdkError

Code: 2039  
Cause: The SDK version is too old to be used with this license.  
Solution: Upgrade to the latest SDK version or contact the support team.

### licenseCodeNetworkTimeoutError

Code: 2042  
Cause: Network timeout reached for a single call  
Solution: Advise the user to try the following steps: verify the internet connection speed, restart the application, wait briefly, attempt using another network, or try again later. If the issue persists, please contact our support team.

### licenseCodeMonitoringDisabledError

Code: 2049  
Cause: This license does not include entitlement for fall detection using.  
Solution: Contact the sales team to enable fall detection on your license.

### measurementCodeMisdetectionDurationExceedsLimitError

Code: 3003  
Cause: The face was not detected for a period of over 0.5 seconds several times.  
Solution: The user should ensure that the face remains still during the measurement and follow the best practices provided by the provider for taking accurate measurements.

### measurementCodeInvalidRecentDetectionRateError

Code: 3004  
Cause: More than two periods of multiple frame losses were detected during the measurement. This issue may occur if the device is overloaded and unable to process video frames in real-time.  
Solution: For the User: Ensure the device is not overloaded, overheated, or running low on resources. If the problem persists, close other applications or services, or restart the device. ollow best practices for taking a measurement and provide guidance on optimizing device performance. For the Application Developer: Avoid using debugging or developer tools or performing intensive logging during the measurement.

### measurementCodeLicenseActivationFailedError

Code: 3006  
Cause: The license activation failed.  
Solution: The user should check the device's internet connection, and should check that no invalid proxy configuration is used. If the problem persists, the user should contact the support team.

### measurementCodeInvalidMeasurementAverageDetectionRateError

Code: 3008  
Cause: The average frame rate is significantly lower than expected. This issue may result from device overloading.  
Solution: For the User: Close resource-intensive applications to free up device resources. Ensure the device is not busy, overheated, or overloaded. Allow the device to cool down and retry the measurement. If the problem persists, consider using another device. For the Application Developer: Verify that the SDK implementation does not impose excessive demands on the device. Provide users with clear instructions to optimize their device performance and follow best practices for taking a measurement. Ensure your application minimizes background activity during SDK operations.

### measurementCodeTooManyFramesInorderError

Code: 3009  
Cause: Multiple consecutive frames were received in incorrect timestamp order. This error occurs if warning 3506 is issued multiple times.  
Solution: The user should rerun the measurement.

### measurementCodeMisdetectionDurationExceedsLimitWarning

Code: 3500  
Cause: A face was not detected for a period of over 0.5 seconds.  
Solution: The instantaneous vital signs should not be displayed to the user for a few seconds until the algorithms overcome the detection issues. The user must follow the best practices for taking a measurement.

### measurementCodeInvalidRecentFpsRateWarning

Code: 3505  
Cause: Camera FPS is degraded and may affect the measurement quality.  
Solution: The user should make sure to follow the best practices for taking a measurement.

### measurementCodeMeasurementMisplacedFrameWarning

Code: 3506  
Cause: A frame was received in incorrect timestamp order.  
Solution: The user should proceed with the measurement.

### vitalSignCodeBloodPressureProcessingFailedWarning

Code: 4505  
Cause: Failure to calculate blood pressure in this measurement. This warning does not impact other vital sign measurements. The failure may have been caused by corrupted installation files.  
Solution: Blood pressure will not be calculated for this measurement session. The other vital sign results will be presented. The user can retry the measurement. If the problem persists, the user should reinstall/repair the app.

### vitalSignCodeMeasuringWithNoEnabledVitalSignsWarning

Code: 4506  
Cause: No vital signs were processed as part of this measurement.  
Solution: This warning is issued when the license does not support the calculation of any vital signs, or when the SDK cannot access license information. The user should check the internet connection and try another measurement.

### sessionCodeIllegalStartCallError

Code: 6004  
Cause: A session start call was made when the session is not in READY state  
Solution: Wait for session state to become READY before calling start.

### sessionCodeIllegalStopCallError

Code: 6005  
Cause: A session stop call was made when the session is not in PROCESSING state  
Solution: Call stop only when session is processing.

### initializationCodeInvalidProcessingTimeError

Code: 7002  
Cause: An invalid session time was provided when creating a session.  
Solution: Use a valid session time. The valid session time range is between 20-180 seconds.

### initializationCodeRotationAndOrientationMismatch

Code: 7004  
Cause: Both the withImageRotation and withDeviceOrientation properties were used when creating a session.  
Solution: The use of both the withImageRotation and withDeviceOrientation properties are not supported when creating a session. Use only the withDeviceOrientation property.

### initializationCodeInvalidLicenseFormat

Code: 7005  
Cause: The provided license key is either empty or its format is invalid.  
Solution: Check the SDK license key provided by the support team. Ensure it is not empty and follows a valid format - avoid including spaces, newlines, or special characters.

### initializationCodeSdkLoadFailure

Code: 7006  
Cause: The SDK failed to initialize, probably due to unsupported hardware.  
Solution: The user should verify that the device chipset is 64 bits, and that the Android OS is 64 bits. If the problem persists, contact the support team and specify the exact device model used.

### initializationCodeUnsupportedUserWeight

Code: 7007  
Cause: The weight submitted by the user is not supported. The supported weight range is between 40 to 200 kilograms.  
Solution: The user should either submit a weight within the supported range, or not specify a weight at all.

### initializationCodeUnsupportedUserAge

Code: 7008  
Cause: The age submitted by the user is not supported. The supported age range is between 18 to 110 years.  
Solution: The user should either submit an age within the supported range or not specify an age at all.

### initializationCodeConcurrentSessionsError

Code: 7009  
Cause: Trying to create a new session before terminating the previous session.  
Solution: The previous session should be terminated before establishing a new one.

### initializationMissingPolarDependenciesError

Code: 7010  
Cause: The Polar SDK is missing as a dependency in the application's build.gradle file.  
Solution: Edit the application's build.gradle file to include Polar SDK as a dependency. Please refer to the documentation for additional information.

### initializationMissingAnalyticsDependenciesError

Code: 7011  
Cause: The application instructed to use the analytics feature within the SDK, but the Segment Anlytics-Kotlin dependency is not included in the application's build.gradle file.  
Solution: Edit the application's build.gradle file to include Segment Anlytics-Kotlin as a dependency.

### initializationCodeUnsupportedUserHeight

Code: 7012  
Cause: The height submitted by the user is not supported. The supported height range is between 130 to 230 centimeters.  
Solution: The application should specify a height value within the supported range or not specify a height at all.

### ppgDeviceConnectionTimeoutError

Code: 8003  
Cause: It took too long to the Bluetooth device to respond to the connection request.  
Solution: Instruct the user to turn off the bluetooth device and after a while turn it back on and try again to connect.

### ppgDeviceInvalidDeviceIdError

Code: 8004  
Cause: The requested ID of the Bluetooth device has an invalid format.  
Solution: Make sure to provide a valid Bluetooth device ID.

### ppgDeviceUnsupportedFirmwareVersionError

Code: 8005  
Cause: The Bluetooth device firmware version is not supported.  
Solution: Upgrade the Bluetooth device firmware or try another device.

### ppgDeviceUnsupportedDeviceModelError

Code: 8006  
Cause: The Bluetooth device hardware is not supported.  
Solution: Instruct the user to use another Bluetooth device.

### ppgDeviceConnectionError

Code: 8007  
Cause: The Bluetooth device was disconnected.  
Solution: Instruct the user to check the Bluetooth device battery, turn the Bluetooth off and back on and to try connecting again.

### ppgDeviceMisplacementError

Code: 8008  
Cause: The sensor is misplaced, removed, or not fastened to the skin.  
Solution: Instruct the user to wear the PPG device snugly over a clean area of skin on their non-dominant upper arm. Ensure direct contact with the skin (underneath clothing) and avoid placing it over tattoos. If issues persist, clean the device and the skin area, and fasten the band securely.

### ppgDeviceNotOnBodyWarning

Code: 8501  
Cause: The PPG Device is not fastened to the user's arm.  
Solution: Instruct the user to fasten the PPG device strap to the arm

### monitoringStoppedError

Code: 9001  
Cause: Monitoring of fall detection temporarily stopped for this session.  
Solution: You can continue measuring vital signs within this session unless another error is reported concurrently. To resume fall detection monitoring, terminate this session and create a new session with the relevant configuration. Make sure no other monitoring errors are reported during this process.

### monitoringDataGapExceedsLimitWarning

Code: 9500  
Cause: Some data was dropped in the stream from the PPG Device, potentially hindering the SDK's ability to accurately monitor the user.  
Solution: The SDK will automatically address this issue, and fall detection monitoring will resume within approximately 6 seconds. However, if this problem persists, it may be due to an unstable Bluetooth connection. We advise instructing the user to move closer to the mobile phone to enhance communication with the external PPG device.

## License

The BiosenseSignal SDK uses a licensing mechanism to protect against unauthorized usage, and to grant measurement permissions specified in the license agreement.

### License Types

The following license types are available:

- Active Users
- Sessions

### Using the License Key

A valid license key must be provided in order to initiate a measurement session or activate a user.

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    Session? session = await FaceSessionBuilder()
        .withImageDataListener(this)
        .withVitalSignsListener(this)
        .withSessionInfoListener(this)
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

**WARNING**

The application must secure the license key and prevent it from being exposed to 3rd parties.

### Receiving License Updates

The SDK sends a LicenseInfo object that contains:

- Offline Measurements Info - An object with information about offline measurements
- Activation ID - An object with the license activation information capabilities

The application can receive license-related messages by implementing onLicenseInfo as part of SessionInfoListener:

```dart
void onSessionStateChange(SessionState sessionState) {
    // Receive session state updates
}

void onWarning(WarningData warningData) {
    // Receive warnings
}

void onError(ErrorData errorData) {
    // Receive errors
}

void onLicenseInfo(LicenseInfo licenseInfo) {
    // Receive license info
}

void onEnabledVitalSigns(SessionEnabledVitalSigns enabledVitalSigns) {
    // Receive the enabled vital signs for the session
}
```

### License Server Network Routing

The SDK connects with the license server at https://licensing-api.biosensesignal.com. The traffic to this server is routed through a Cloudflare service. Since Cloudflare is inaccessible in certain countries, a custom workaround is available for these regions. Contact our customer support if the license server is unreachable in your target territories.

## Active Users License

When active users licensing is employed, the SDK registers a device on the license server upon the first invocation of the SDK in every calendar month. Once activated, there is no limitation on the number of measurements during that calendar month. The number of allowed activations is based on the terms specified in the license agreement and is configured in the license. The SDK must have a live internet connection upon the user's first SDK usage of the month in order to re-activate the device.

If the SDK failed to register the device on the license server, then the SDK will retry the registration when starting the first measurement, in parallel with the measurement process.

If the SDK failed to communicate with the license server, then the process wil fail and the measurement will end in an error state. See the alerts list page regarding possible network-related errors.

The SDK periodically attempts to sync with the license server to verify license validity and receive configuration updates.

### License Activation

License activation is the process of registering a device on the license server.

Upon activation, the SDK receives an activation ID from the licensing server and shares it with the application. If the device was already registered, then the provided activation ID will be the same activation ID as was provided on the last usage of the SDK.

The application can receive the application ID by implementing onLicenseInfo as part of SessionInfoListener:

```dart
@Override
void onLicenseInfo(LicenseInfo licenseInfo) {
    print("Activation ID: ${licenseInfo.licenseActivationInfo.activationID}}");
}
```

## Sessions License

When sessions licensing is employed, the license server provides the SDK with an allocated number of measurements (or "quota") as specified in the license agreement.

The SDK requires an internet connection, allowing it to communicate with the license server in order to verify the license validity.

### Measurement Consumption

Upon calling the start method the SDK instructs the license server to consume a single measurement and changes the session state from ready to starting. If no measurements are available on the server, then the process will be aborted and the SDK will send an error and the session will transition back to stopping and ready state (see Session State).

**Note**

The SDK shares the activation ID with the application also when using a sessions license. However, the activation quota is unlimited when using this type of license.

### Time Left for License Timer

To support cases where a session was consumed from the license quota, but the measurement failed for any reason like incoming phone call, the application can perform repeated measurements without consuming additional sessions from the license. A "session timeframe" timer is triggered when starting the first measurement. The timer is set initially to 9 minutes (540 seconds). During this timeframe the application can perform repeated measurements without consuming additional sessions from the license quota.

The following code can be used to update the device user interface or to decide if the user is still entitled to repeat a measurement. The Offline Measurements End Time is the time remaining on the timer. When this timer expires, then a starting new measurement will result consuming a new session from the license quota.

The application can receive the timer end time by implementing onLicenseInfo as part of SessionInfoListener:

```dart
@Override
void onLicenseInfo(LicenseInfo licenseInfo) {
    LicenseOfflineMeasurements? offlineMeasurements = licenseInfo.offlineMeasurements;
    if (offlineMeasurements != null) {
        print("Offline Measurements: ${offlineMeasurements.totalMeasurements}");
        print("Remaining Offline Measurements: ${offlineMeasurements.remainingMeasurements}");
        print("Offline Measurements End Time: ${offlineMeasurements.measurementEndTimestamp}");
    }
}
```

### Remaining Measurements and Offline Measurements

**Note**

This section is relevant only for licenses with a custom configuration of more than 1 offline measurement, as configured in the license server. This configuration requires the assistance of the support team.

By default, the licensing mechanism is configured to consume 1 measurement from the license's quota on the server upon calling the session start method. Some licenses are configured to fetch additional measurements from the server and store them locally on the SDK for future use. This allows the application to start additional sessions even if the device has no live internet access.

The following parameters indicate the status of the locally stored measurements:

- Offline Measurements - The total number of measurements that can be stored locally on the device.
- Remaining Measurements - The total number of measurements that were already downloaded from the server to the SDK and can be used in future sessions.

The application can receive the information regarding offline measurements by implementing onLicenseInfo as part of SessionInfoListener:

```dart
@Override
void onLicenseInfo(LicenseInfo licenseInfo) {
    LicenseOfflineMeasurements? offlineMeasurements = licenseInfo.offlineMeasurements;
    if (offlineMeasurements != null) {
        print("Offline Measurements: ${offlineMeasurements.totalMeasurements}");
        print("Remaining Offline Measurements: ${offlineMeasurements.remainingMeasurements}");
        print("Offline Measurements End Time: ${offlineMeasurements.measurementEndTimestamp}");
    }
}
```

## Sharing Anonymized Analytics

As an application developer, you have the option to share anonymized SDK usage data with us. This data helps us improve the overall performance and functionality of the SDK for all users.

### What Data is Collected?

We collect anonymized data about how the user interacts with the SDK. This excludes any personally identifiable information (PII) or personal health results (PHI) generated by the SDK. Sharing is Optional, disabled by default, and Controlled by You! You have complete control over whether to share this anonymized usage data with us. This is an opt-in process, meaning you must explicitly choose to share this data. We will only collect data from customers who have actively opted-in through a dedicated and secure API.

### Data Security and Anonymity

We take data security and privacy very seriously. We have implemented robust measures to ensure that all collected data is anonymized and cannot be linked back to any individual user or device.

### API

```dart
try {
    LicenseDetails licenseDetails = LicenseDetails("<ENTER_YOUR_LICENSE_KEY>");
    Session? session = await FaceSessionBuilder()
        .withSessionInfoListener(this)
        .withVitalSignsListener(this)
        .withImageDataListener(this)
        .withAnalytics()
        .build(licenseDetails);
} on HealthMonitorException catch(e) {
    print("Received Error. Domain: ${e.domain} Code: ${e.code}");
}
```

## Vital Signs

The BiosenseSignal SDK measures a comprehensive range of vital signs and physiological indicators. For the sake of brevity, we refer to the set of physical indicators calculated by the SDK as "vital signs". The vital sign results provided at the end of the measurement include both the vital sign values and the vital sign confidence levels.

Information on the supported vital signs can be found on the BiosenseSignal Vital Signs and Health Indicators Information document.

**Note**

In order to receive a result for a specific vital sign, the vital sign must be enabled. Information on enabled vital signs can be found on the Enabled Vital Signs page.

The application can receive vital sign values by implementing VitalSignsListener:

```dart
 @override
 void onVitalSign(VitalSign vitalSign) {
    // Handle vital sign result
}

 @override
void onFinalResults(VitalSignsResults results) {
    // Handle the final results of the measurements
}
```

The vital sign values measured by the SDK are reported at two stages of the measurement:

- Instantaneous results - available during the measurement.
- Final results - available upon successful completion of a measurement.

### Instantaneous Vital Signs Values

Instantaneous vital sign values are provided as soon as they become available. To receive instantaneous vital sign results, the application can implement the onVitalSign method as part of VitalSignsListener.

```dart
 @override
 void onVitalSign(VitalSign vitalSign) {
    // Handle vital sign result
}
```

Instantaneous vital sign values can be received for the following vital signs during the measurement:

- Pulse Rate
- Respiration Rate
- Oxygen Saturation

### Final Results

Final vital sign results are calculated at the end of a measurement.

The application can receive the final vital signs results by implementing the onFinalResults method as part of VitalSignsListener.

```dart
 @override
void onFinalResults(VitalSignsResults results) {
    // Handle the final results of the measurements
}
```

## Confidence Level

The confidence level of a vital sign indicates the probability of accuracy of the measurement result for that vital sign. The higher the level, the greater the probability and accuracy of the result. The confidence level takes into consideration all the inputs required to calculate a result, including signal quality, any warnings during the measurement duration, and the specific data required for the vital sign, such as the amount of information needed to measure a result. The confidence level values are low, medium, high, and unknown. The accuracy report refers to results in which the confidence level is high.

The SDK Accuracy Targets are specified on the Accuracy Targets page.

It is recommended that the application advises the user to follow the guidelines described in best practices on how to take a measurement and repeat the measurement as needed.

The confidence values will be reported to the application as part of the final report for each of the following vital signs:

- Pulse Rate
- Respiration Rate
- SDNN
- Mean RRi
- PRQ
- RRI

**Note**

If there is insufficient data to calculate the vital sign result at the end of the measurement, neither the vital sign result nor its confidence level will be included in the final report.

## ASCVD Risk

The ASCVD Risk value is sent as part of the final results.

**Note**

The ASCVD (Atherosclerotic Cardiovascular Disease) Risk Score is a percentage value that estimates an individual's 10-year risk of developing heart disease or stroke. The SDK returns a maximum value of 30, meaning that any result at this threshold represents a high ASCVD risk, including cases where the actual risk may be greater.

The User Information is required to calculate the ASCVD Risk result. If any details are missing from the User Information, the ASCVD Risk will not be calculated. For more information on User Information, see the User Information page.

This indicator is supported for face measurements.

The application can receive the ASCVD Risk result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
  VitalSign? vitalSign = vitalSignsResults.getResult(VitalSignTypes.ascvdRisk);
  if (vitalSign is VitalSignAscvdRisk) {
    print("ASCVD Risk: ${vitalSign.value}");
  }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## ASCVD Risk Level

The ASCVD Risk Level value is sent as part of the final results and can receive one of the following values:

- Low (< 10%): Indicates minimal estimated cardiovascular risk
- Medium (10–20%): Indicates medium estimated cardiovascular risk
- High (> 20%): Indicates high estimated cardiovascular risk

The ASCVD Risk Level indicator is based on the ASCVD Risk result. If any details are missing from the User Information, the ASCVD Risk Level will not be calculated. For more information on User Information, see the User Information page.

This indicator is supported for face measurements.

The application can receive the ASCVD Risk Level result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.ascvdRiskLevel);
    if (vitalSign is VitalSignAscvdRiskLevel) {
        print("ASCVD Risk Level: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Blood Pressure

The Blood Pressure result includes Systolic and Diastolic values and both values are sent as part of the final results.

The application can receive the Blood Pressure result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.bloodPressure);
    if (vitalSign is VitalSignBloodPressure) {
        print("Blood Pressure: ${vitalSign.value.systolic}/${vitalSign.value.diastolic}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Cardiac Workload

The Cardiac Workload value is sent as part of the final results.

The application can receive the Cardiac Workload result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.cardiacWorkload);
    if (vitalSign is VitalSignCardiacWorkload) {
        print("Cardiac Workload: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Heart Age

The Heart Age value is sent as part of the final results.

The User Information is required to calculate the Heart Age result. If any details are missing from the User Information, the Heart Age will not be calculated. For more information on User Information, see the User Information page.

This indicator is supported for face measurements.

The application can receive the Heart Age result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.heartAge);
    if (vitalSign is VitalSignHeartAge) {
        print("Heart Age: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Hemoglobin

The Hemoglobin value is sent as part of the final results.

This indicator is supported for face measurements.

The application can receive the Hemoglobin result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.hemoglobin);
    if (vitalSign is VitalSignHemoglobin) {
        print("Hemoglobin: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Hemoglobin A1c

The Hemoglobin A1c value is sent as part of the final results.

This indicator is supported for face measurements.

The application can receive the Hemoglobin A1c result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.hemoglobinA1C);
    if (vitalSign is VitalSignHemoglobinA1C) {
        print("Hemoglobin A1c: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## High Blood Pressure Risk

The High Blood Pressure Risk value is sent as part of the final results.

The enum definition for the result includes three entries: Low, Medium, and High.

The application can receive the High Blood Pressure Risk result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.highBloodPressureRisk);
    if (vitalSign is VitalSignHighBloodPressureRisk) {
        print("High Blood Pressure Risk: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## High Fasting Glucose Risk

The High Fasting Glucose Risk value is sent as part of the final results.

This indicator is supported for face measurements.

The enum definition for the result includes three entries: Low, Medium, and High. However, in this version, only Low and High results will be used.

The application can receive the High Fasting Glucose Risk result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.highFastingGlucoseRisk);
    if (vitalSign is VitalSignHighFastingGlucoseRisk) {
        print("High Fasting Glucose Risk: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## High Hemoglobin A1c Risk

The High Hemoglobin A1c Risk value is sent as part of the final results.

This indicator is supported for face measurements.

The enum definition for the result includes three entries: Low, Medium, and High.

The application can receive the High Hemoglobin A1c Risk result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.highHemoglobinA1cRisk);
    if (vitalSign is VitalSignHighHemoglobinA1cRisk) {
        print("High Hemoglobin A1c Risk: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## High Total Cholesterol Risk

The High Total Cholesterol Risk value is sent as part of the final results.

This indicator is supported for face measurements.

The enum definition for the result includes three entries: Low, Medium, and High.

The application can receive the High Total Cholesterol Risk result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.highTotalCholesterolRisk);
    if (vitalSign is VitalSignHighTotalCholesterolRisk) {
        print("High Total Cholesterol Risk: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## LF/HF

The LF/HF value is sent as part of the final results.

The application can receive the LF/HF result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.lfhf);
    if (vitalSign is VitalSignLfhf) {
        print("LFHF: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Low Hemoglobin Risk

The Low Hemoglobin Risk value is sent as part of the final results.

This indicator is supported for face measurements.

The enum definition for the result includes three entries: Low, Medium, and High. However, in this version, only Low and High results will be used.

The application can receive the Low Hemoglobin Risk result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.lowHemoglobinRisk);
    if (vitalSign is VitalSignLowHemoglobinRisk) {
        print("Low Hemoglobin Risk: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Mean Arterial Pressure

The Mean Arterial Pressure value is sent as part of the final results.

The application can receive the Mean Arterial Pressure result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.meanArterialPressure);
    if (vitalSign is VitalSignMeanArterialPressure) {
        print("Mean Arterial Pressure: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Mean RRi

The Mean RRi value is sent as part of the final results.

The application can receive the Mean RRi result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.meanRri);
    if (vitalSign is VitalSignMeanRri) {
        print("Mean Rri: ${vitalSign.value}");
        print("Confidence Level: ${vitalSign.confidence?.level.toString() ?? "N/A"}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Normalized Stress Index

The Normalized Stress Index value is sent as part of the final results.

The application can receive the Normalized Stress Index result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.normalizedStressIndex);
    if (vitalSign is VitalSignNormalizedStressIndex) {
        print("Normalized Stress Index: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Oxygen Saturation

The Oxygen Saturation value is sent both as an instantaneous value during the measurement and as part of the final results.

The application can receive the Oxygen Saturation (SpO2) result by implementing VitalSignsListener:

```dart
@override
void onVitalSign(VitalSign vitalSign) {
    if (vitalSign.getType() == VitalSignTypes.oxygenSaturation) {
        VitalSignOxygenSaturation oxygenSaturation = vitalSign as VitalSignOxygenSaturation;
        print("Oxygen Saturation: ${oxygenSaturation.value}");
    }
}

@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.oxygenSaturation);
    if (vitalSign is VitalSignOxygenSaturation) {
        print("Oxygen Saturation: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## PNS Index

The PNS Index value is sent as part of the final results.

The application can receive the PNS Index result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.pnsIndex);
    if (vitalSign is VitalSignPnsIndex) {
        print("PNS Index: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## PNS Zone

The PNS Zone value is sent as part of the final results.

The application can receive the PNS Zone result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.pnsZone);
    if (vitalSign is VitalSignPnsZone) {
        print("PNS Zone: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## PRQ

The PRQ value is sent as part of the final results.

The application can receive the PRQ result by implementing VitalSignsListener:

```dart
@override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.prq);
    if (vitalSign is VitalSignPrq) {
        print("PRQ: ${vitalSign.value}");
        print("Confidence Level: ${vitalSign.confidence?.level.toString() ?? "N/A"}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Pulse Pressure

The Pulse Pressure value is sent as part of the final results.

The application can receive the Pulse Pressure result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.pulsePressure);
    if (vitalSign is VitalSignPulsePressure) {
        print("Pulse Pressure: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Pulse Rate

The Pulse Rate value is sent both as an instantaneous value during the measurement and as part of the final results.

The application can receive the Pulse Rate result by implementing VitalSignsListener:

```dart
@Override
void onVitalSign(VitalSign vitalSign) {
    if (vitalSign.getType() == VitalSignTypes.pulseRate) {
        VitalSignPulseRate pulseRate = vitalSign as VitalSignPulseRate;
        print("Pulse Rate: ${pulseRate.value}");
    }
}

@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.pulseRate);
    if (vitalSign is VitalSignPulseRate) {
        print("Pulse Rate: ${vitalSign.value}");
        print("Confidence Level: ${vitalSign.confidence?.level.toString() ?? "N/A"}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## RMSSD

The RMSSD value is sent as part of the final results.

The application can receive the RMSSD result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.rmssd);
    if (vitalSign is VitalSignRmssd) {
        print("RMSSD: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## RRi

The RRi values are sent as part of the final results.

The application can receive the RRi result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.rri);
    if (vitalSign is VitalSignRri) {
        for (var rriValue in vitalSign.value) {
          print("RRI value: $rriValue");
        }

        print("Confidence Level: ${vitalSign.confidence?.level.toString() ?? "N/A"}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Respiration Rate

The Respiration Rate value is sent both as an instantaneous value during the measurement and as part of the final results.

The application can receive the Respiration Rate result by implementing VitalSignsListener:

```dart
@Override
void onVitalSign(VitalSign vitalSign) {
    if (vitalSign.getType() == VitalSignTypes.respirationRate) {
        VitalSignRespirationRate respirationRate = vitalSign as VitalSignRespirationRate;
        print("Respiration Rate: ${respirationRate.value}");
    }
}

@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.respirationRate);
    if (vitalSign is VitalSignRespirationRate) {
        print("Respiration Rate: ${vitalSign.value}");
        print("Confidence Level: ${vitalSign.confidence?.level.toString() ?? "N/A"}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## SD1

The SD1 value is sent as part of the final results.

The application can receive the SD1 result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.sd1);
    if (vitalSign is VitalSignSd1) {
        print("SD1: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## SD2

The SD2 value is sent as part of the final results.

The application can receive the SD2 result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.sd2);
    if (vitalSign is VitalSignSd2) {
        print("SD2: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## SDNN

The SDNN value is sent as part of the final results.

The application can receive the SDNN result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.sdnn);
    if (vitalSign is VitalSignSdnn) {
        print("SDNN: ${vitalSign.value}");
        print("Confidence Level: ${vitalSign.confidence?.level.toString() ?? "N/A"}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## SNS Index

The SNS Index value is sent as part of the final results.

The application can receive the SNS Index result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.snsIndex);
    if (vitalSign is VitalSignSnsIndex) {
        print("SNS Index: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## SNS Zone

The SNS Zone value is sent as part of the final results.

The application can receive the SNS Zone result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.snsZone);
    if (vitalSign is VitalSignSnsZone) {
        print("SNS Zone: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Stress Level

The Stress Level value is sent as part of the final results.

The application can receive the Stress Level result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.stressLevel);
    if (vitalSign is VitalSignStressLevel) {
        print("Stress Level: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Stress Index

The Stress Index value is sent as part of the final results.

The application can receive the Stress Index result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.stressIndex);
    if (vitalSign is VitalSignStressIndex) {
        print("Stress Index: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Wellness Index

The Wellness Index value is sent as part of the final results. It is calculated based on several other indicators and can still be determined even if only a subset of them is available. For optimal results, it is recommended to ensure that the measurement duration is sufficient and that as all relevant indicator values are calculated.

The indicators used in the calculation are:

Pulse Rate
Oxygen Saturation (SpO₂)
Blood Pressure
Heart Rate Variability (RRi)
The application can receive the Wellness Index result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.wellnessIndex);
    if (vitalSign is VitalSignWellnessIndex) {
        print("Wellness Index: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Wellness Level

The Wellness Level value is sent as part of the final results. It is calculated based on several other indicators and can still be determined even if only a subset of them is available. For optimal results, it is recommended to ensure that the measurement duration is sufficient and that as all relevant indicator values are calculated.

The indicators used in the calculation are:

Pulse Rate
Oxygen Saturation (SpO₂)
Blood Pressure
Heart Rate Variability (RRi)
The application can receive the Wellness Level result by implementing VitalSignsListener:

```dart
@Override
void onFinalResults(VitalSignsResults results) {
    VitalSign? vitalSign = results.getResult(VitalSignTypes.wellnessLevel);
    if (vitalSign is VitalSignWellnessLevel) {
        print("Wellness Level: ${vitalSign.value}");
    }
}
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported vital signs by platform and measurement mode (face/polar), along with their required measurement durations, refer to the Indicators Technical Information page.

## Accuracy table and Report times

The final report includes the confidence level for several vital signs.
The confidence level indicates the likelihood that the result is within the expected
accuracy target, as defined below.

| Vital                    | Range    | Unit of measurement | Resolution | Error level |
| ------------------------ | -------- | ------------------- | ---------- | ----------- |
| Pulse Rate               | 50-140   | bpm                 | 1          | RMSE ≦ 3    |
| Respiration Rate         | 10-30    | rpm                 | 1          | RMSE ≦ 3    |
| Blood Pressure Systolic  | 90-160   | mmHg                | 1          | MAE ≦ 15    |
| Blood Pressure Diastolic | 50-100   | mmHg                | 1          | MAE ≦ 10    |
| Mean RRi                 | 400-1200 | ms                  | 1          | Mean ≦ 25   |
| Hemoglobin               | 9-17     | g/dL                | 0.1        | MAE ≦ 1.0   |
| Hemoglobin A1C           | 3.8-8    | %                   | 0.01       | MAE ≦ 0.5   |

Confidence level: The confidence level can be either LOW, MEDIUM, or HIGH.

## Report timings

A certain amount of data must be collected to calculate valid, accurate results for a vital
sign. The amount of required data is different for each vital sign.
\*From SDK version 5.5.x, Finger scans (PPG) are deprecated.

| Vital Sign                                               | Supported Measurement Types | The appearance of runtime results in seconds since measurement starts (sec) | Required measurement duration to generate a valid final report (sec) |
| -------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| ASCVD Risk                                               | Face                        | Final report only                                                           | 35                                                                   |
| Blood Pressure                                           | Face, Polar                 | Final report only                                                           | 35                                                                   |
| Breathing Rate                                           | Face, Polar                 | 23 - Face<br>17 - Polar                                                     | 35 - Face<br>37 - Polar                                              |
| Heart Age                                                | Face                        | Final report only                                                           | 35                                                                   |
| Hemoglobin                                               | Face                        | Final report only                                                           | 35                                                                   |
| Hemoglobin A1c                                           | Face                        | Final report only                                                           | 35                                                                   |
| High Blood Pressure Risk (replacing "hypertension Risk") | Face                        | Final report only                                                           | 35                                                                   |
| High Fasting Glucose Risk                                | Face                        | Final report only                                                           | 35                                                                   |
| High HbA1c Risk (replacing "Diabetes Risk")              | Face                        | Final report only                                                           | 35                                                                   |
| High Total Cholesterol Risk                              | Face                        | Final report only                                                           | 35                                                                   |
| LF/HF Ratio                                              | Face, Polar                 | Final report only                                                           | 50                                                                   |
| Low Hemoglobin Risk                                      | Face                        | Final report only                                                           | 35                                                                   |
| Mean RRi                                                 | Face, Polar                 | Final report only                                                           | 35                                                                   |
| Normalized Stress Index                                  | Face, Polar                 | Final report only                                                           | 35 - Face<br>50 - Polar                                              |
| Oxygen Saturation                                        | Face                        | 35                                                                          | 35                                                                   |
| Parasympathetic Nervous System Index (PNS Index)         | Face, Polar                 | Final report only                                                           | 50                                                                   |
| Parasympathetic Nervous System Zone (PNS Zone)           | Face, Polar                 | Final report only                                                           | 50                                                                   |
| Pulse Rate                                               | Face, Polar                 | 11 - Face<br>7 - Polar                                                      | 20                                                                   |
| PRQ                                                      | Face, Polar                 | Final report only                                                           | 35 - Face<br>37 - Polar                                              |
| RMSSD                                                    | Face, Polar                 | Final report only                                                           | 35                                                                   |
| RRi                                                      | Face, Polar                 | Final report only                                                           | 50                                                                   |
| SD1                                                      | Face, Polar                 | Final report only                                                           | 50                                                                   |
| SD2                                                      | Face, Polar                 | Final report only                                                           | 50                                                                   |
| SDNN                                                     | Face, Polar                 | Final report only                                                           | 35                                                                   |
| Stress Index                                             | Face, Polar                 | Final report only                                                           | Face - 35<br>Polar - 50                                              |
| Stress Level                                             | Face, Polar                 | Final report only                                                           | Face - 35<br>Polar - 50                                              |
| Sympathetic Nervous System Index (SNS Index)             | Face, Polar                 | Final report only                                                           | 50                                                                   |
| Sympathetic Nervous System Zone (SNS Zone)               | Face, Polar                 | Final report only                                                           | 50                                                                   |
| Wellness Index                                           | Face, Polar                 | Final report only                                                           | 20                                                                   |
| Wellness Level                                           | Face, Polar                 | Final report only                                                           | 20                                                                   |

Notes
● Some indicators are calculated when the measurement is completed. They are
returned when given that the SDK has enough time to gather the necessary data
to calculate them.
● The above numbers refer to a measurement taken according to the best
practices without signal-quality issues.
● In case of interruptions or misdetections, the time required for adequate vital
signs collection might increase.

## Best Practices - How to take a measurement

This article describes the best practices for taking a measurement
Wait 3 minutes between measurements to avoid device overheating
rPPG - Face scan
To get accurate readings, follow the guidelines below:
Device
● Ensure the battery level is above 20% and not in power-save mode.
● Ensure your camera lenses are clean and unscratched.
● Place the device on a stand about 30 cm away from your face.
● Position the device with the selfie camera at eye level and parallel to
the face. Use a stand to reduce
● shaking and movements of the device.
Subject
● Sit still during the measurement.
● Ensure your feet are placed flat on the floor and your legs are
uncrossed.
● Make sure your face is fully exposed, ensuring it is not covered by hair or accessories
(i.e., mask, sunglasses, hat).
● Avoid moving or talking throughout the measurement and remain focused on the screen
until the measurement is complete.
Environmental Conditions
● Ensure your face is evenly illuminated
● Avoid measuring in locations with multiple light sources (preferably a
single light source directed towards the face).
● Settle into a position where no light sources are directed toward the
camera (e.g., by sitting against a wall).
● Ensure neither the camera nor the area in the frame is exposed to
direct sunlight.
● Avoid movement of other persons behind or within your vicinity.
● Avoid highly reflective objects in the surrounding area, including
mirrors, glass windows, tables, etc.
● Ensure the level of the light illuminating your face is a minimum
of 400 lux.
● It is recommended that you use a cold light (>4500K) and not a
monochromatic light source.
External Sensor Devices
Currently, our SDK supports the Polar Verity Sense device.
Mobile Device

1. Ensure that your mobile device is not in power-saving mode.
2. Stay within the Bluetooth® range of your smartphone throughout the
   measurement to avoid connection or signal disruptions.
   Polar Verity Sense Sensor
3. Ensure that your Polar Verity Sense™ battery is sufficiently charged.
4. Turn on your Polar Verity Sense™ by pressing the silver button located
   on the side of the sensor.
5. Verify that there is a green light visible on the back of the sensor.
6. Pair your Polar Verity Sense™ with your smartphone via Bluetooth®.
7. Wear the Polar Verity Sense™ snugly over clean skin on the
   outer-center part of your non-dominant upper arm and fasten the
   band securely.
8. Ensure the sensor is in direct contact with your skin (underneath
   clothing). Avoid placing it over tattoos or adjusting it during the
   measurements.
9. When putting on the armband, ensure that the device’s power button
   is facing upwards and the "POLAR" label on the device is not
   upside down. This ensures that the sensor is positioned properly on
   your skin.

Subject

1. Act naturally during the measurement. Avoid unnecessary movements
   or adjustments to the sensor on your skin.

## Supported Vital Signs (SDK 5.9)

The table below shows the current supported vital signs for each SDK platform.

### iOS

| Health Indicator               | Face | Polar |
| ------------------------------ | ---- | ----- |
| ASCVD Risk                     | Yes  | --    |
| Blood Pressure                 | Yes  | Yes   |
| Heart Age                      | Yes  | --    |
| Hemoglobin \*                  | Yes  | --    |
| Hemoglobin A1c \*              | Yes  | --    |
| High Blood Pressure Risk       | Yes  | --    |
| High Fasting-Glucose Risk \*   | Yes  | --    |
| High HbA1c Risk \*             | Yes  | --    |
| High Total-Cholesterol Risk \* | Yes  | --    |
| HRV-SDNN                       | Yes  | Yes   |
| LF/HF                          | Yes  | Yes   |
| Low Hemoglobin Risk \*         | Yes  | --    |
| Mean RRi                       | Yes  | Yes   |
| Normalized Stress Index        | Yes  | Yes   |
| Oxygen Saturation (SpO2)       | Yes  | --    |
| PNS index                      | Yes  | Yes   |
| PNS Zone                       | Yes  | Yes   |
| PRQ                            | Yes  | Yes   |
| Pulse Rate                     | Yes  | Yes   |
| Respiration Rate               | Yes  | Yes   |
| RMSSD                          | Yes  | Yes   |
| RRi                            | Yes  | Yes   |
| SD1                            | Yes  | Yes   |
| SD2                            | Yes  | Yes   |
| SNS Index                      | Yes  | Yes   |
| SNS Zone                       | Yes  | Yes   |
| Stress level                   | Yes  | Yes   |
| Stress Index                   | Yes  | Yes   |
| Wellness Index                 | Yes  | Yes   |
| Wellness Level                 | Yes  | Yes   |

- This indicator is under research  
  \*\* Supported only on iPhone devices

### Android

| Health Indicator               | RPPG | Polar |
| ------------------------------ | ---- | ----- |
| ASCVD Risk                     | Yes  | --    |
| Blood Pressure                 | Yes  | Yes   |
| Heart Age                      | Yes  | --    |
| Hemoglobin \*                  | Yes  | --    |
| Hemoglobin A1c \*              | Yes  | --    |
| High Blood Pressure Risk       | Yes  | --    |
| High Fasting-Glucose Risk \*   | Yes  | --    |
| High HbA1c Risk \*             | Yes  | --    |
| High Total-Cholesterol Risk \* | Yes  | --    |
| HRV-SDNN                       | Yes  | Yes   |
| LF/HF                          | Yes  | Yes   |
| Low Hemoglobin Risk \*         | Yes  | --    |
| Mean RRi                       | Yes  | Yes   |
| Normalized Stress Index        | Yes  | Yes   |
| Oxygen Saturation (SpO2)       | Yes  | --    |
| PNS index                      | Yes  | Yes   |
| PNS Zone                       | Yes  | Yes   |
| PRQ                            | Yes  | Yes   |
| Pulse Rate                     | Yes  | Yes   |
| Respiration Rate               | Yes  | Yes   |
| RMSSD                          | Yes  | Yes   |
| RRi                            | Yes  | Yes   |
| SD1                            | Yes  | Yes   |
| SD2                            | Yes  | Yes   |
| SNS Index                      | Yes  | Yes   |
| SNS Zone                       | Yes  | Yes   |
| Stress Index                   | Yes  | Yes   |
| Stress level                   | Yes  | Yes   |
| Wellness Index                 | Yes  | Yes   |
| Wellness Level                 | Yes  | Yes   |

- This indicator is under research

### Web

| Health Indicator               | RPPG     |
| ------------------------------ | -------- |
| ASCVD Risk                     | Yes \*\* |
| Blood Pressure                 | Yes \*\* |
| Respiration Rate               | Yes      |
| Heart Age                      | Yes \*\* |
| Hemoglobin \*                  | Yes \*\* |
| Hemoglobin A1c \*              | Yes \*\* |
| High Blood Pressure Risk       | Yes \*\* |
| High Fasting-Glucose Risk \*   | Yes \*\* |
| High HbA1c Risk \*             | Yes \*\* |
| High Total-Cholesterol Risk \* | Yes \*\* |
| LF/HF                          | Yes      |
| Low Hemoglobin Risk \*         | Yes \*\* |
| Mean RRi                       | Yes      |
| Normalized Stress Index        | Yes      |
| PNS index                      | Yes      |
| PNS Zone                       | Yes      |
| PRQ                            | Yes      |
| Pulse Rate                     | Yes      |
| RMSSD                          | Yes      |
| RRi                            | Yes      |
| SD1                            | Yes      |
| SD2                            | Yes      |
| SDNN                           | Yes      |
| Stress level                   | Yes      |
| Stress Index                   | Yes      |
| SNS Index                      | Yes      |
| SNS Zone                       | Yes      |
| Wellness Index                 | Yes      |
| Wellness Level                 | Yes      |

- This indicator is under research  
  \*\* Supported only on Android devices as well as on iPhones

## Vital Signs and Health Indicators Information

Vital Signs and Health Indicators Information
SDK v5.11
Basic Vital Signs
Wellness Score
Blood Pressure
Heart Rate
PRQ
Oxygen Saturation
Cardiac Workload
Pulse Pressure
Mean Arterial Pressure (MAP)
Bloodless Blood Tests
Hemoglobin - Under research
Hemoglobin A1C - Under research
Risks
High Blood Pressure Risk
High HbA1c Risk – Under Research
High Fasting Glucose Risk – Under Research
High Total Cholesterol Risk – Under Research
Low Hemoglobin Risk – Under Research
ASCVD Risk
ASCVD Risk Level
Heart Age
Stress
Stress Level
Stress Index
Normalized Stress Index
Heart Rate Variability
HRV SDNN
Mean RRi
RMSSD
Advanced Heart Rate Variability
Recovery Ability (PNS Zone)
PNS Index
Stress Response (SNS Zone)
SNS Index
SD1
SD 2
LF/HF
RRi Data
Basic Vital Signs
Wellness Score
The Wellness Score is a prediction risk score that is used to predict a person's cardiovascular
risk for the next 5 to 10 years. The Wellness Score is based on the vital signs measured by our
technology, and is designed to serve as a reference when measured at rest, under similar
conditions during all of the measurements, and if the score is consistent in repeated
measurements over time.
The higher the wellness score, the lower the cardiovascular risk.
How is it calculated?
Your Wellness Score is calculated using your vitals results from any single measurement. The
values of each one of the vital sign measurements affect your Wellness Score prediction.
Generally, a lower Heart Rate at rest implies more efficient heart function and better
cardiovascular fitness. Therefore, a higher Heart Rate reduces your Wellness Score - even
when the heart rate is within the normal range. For example, heart rates that are higher than 65
reduce the wellness score to a medium score, and values that are higher than 84 reduce the
wellness score to a low score.
HRV measures the variation in time between heartbeats. The Stress Level that is calculated
from this variance also affects your Wellness Score. Thus, Very High and High stress levels are
correlated with a low score, while Mild and Normal stress levels are correlated with a medium
score.
Your Oxygen Saturation level measures the amount of oxygen in the blood delivered from the
lungs to the rest of the body. A higher level implies a more efficient function, thus, a lower
Oxygen Saturation level reduces the Wellness Score.
In addition, High Blood Pressure readings at rest may pose a higher risk of health problems and
therefore may reduce the Wellness Score.
Blood Pressure
The pressure of blood is exerted on the walls of the arteries, which carry blood from the heart to
other parts of the body. Normal systolic pressure is from 100 to 129.
Blood Pressure measures the pressure of circulating blood against artery walls, and it is
measured by two numbers. The first number, or systolic pressure, refers to the pressure inside
the artery when the heart contracts and pumps blood throughout the body. The second number,
or diastolic pressure, refers to the pressure inside the artery when the heart is at rest and is
filling with blood.
Most people don’t know if they have high Blood Pressure – especially since there may be no
noticeable warning signs or symptoms – and therefore the Blood Pressure must be measured.
Blood pressure changes in response to different activities and is recommended to be measured
while at rest. Consistently high blood pressure readings may result in a diagnosis of high blood
pressure (hypertension), which poses a higher risk for health problems such as heart disease,
heart attack, and stroke. In most cases, high blood pressure has no defined cause, and it is
called primary hypertension. However, it is related to unhealthy lifestyles such as physical
inactivity, stressful life, obesity, shift work, pregnancy, etc. It should be emphasized that Blood
Pressure can be managed through diagnosis, lifestyle changes, medication and long-term
monitoring.
Blood Pressure is categorized as low, normal, or elevated: low blood pressure is defined as
systolic pressure of less than 100, normal blood pressure is defined as systolic pressure of 100
to 129, while elevated blood pressure is defined as systolic pressure of 130 or higher.
These numbers should be used as a guide only. A single Blood Pressure measurement that is
higher than normal is not necessarily an indication of a problem. Your doctor will want to see
multiple Blood Pressure measurements over several days or weeks before making a diagnosis
of high blood pressure and commencing treatment.
Heart Rate
This is the number of times your heart beats per minute. The normal resting rate is 60 to 100
beats for a healthy adult.
Think of your heart as a pump that pushes blood through your body. With every beat, the heart
pumps blood containing oxygen and nutrients around the body and brings back waste products.
A healthy heart supplies the body with the right amount of blood at a rate proportionate to
whatever activity the body is undertaking.
Normal resting rates can differ between people. Furthermore, heart rates are lower when at rest
and increase during exercise. Moreover, this rate can change with different situations such as
the weather, body position, emotions, body size, medication, and the use of caffeine and
nicotine.
At rest, a fast Heart Rate may indicate acute health conditions such as an infection,
dehydration, stress, anxiety, thyroid disorder, shock, anemia, or certain heart conditions.
Moreover, it can predict long-term risk for cardiovascular events. A low Heart Rate is common
for people who exercise frequently and participate in athletics.
Tracking Heart Rate can provide insight into fitness levels, heart health, and emotional health.
Moreover, for individuals taking medication for cardiovascular conditions, daily Heart Rate
measurements can assist the doctor in advising on the proper course of treatment.
A healthy heartbeat is important in protecting cardiac health. If you feel that your heart is beating
out of rhythm (too fast or too slow), speak to a doctor about your symptoms.
Breathing Rate
The number of breaths you take per minute. The normal at-rest Breathing Rate is 12 to 20
breaths per minute for a healthy adult. In general, breathing rates are slightly faster in women
than men.
When you inhale, oxygen enters your lungs and circulates to the various internal organs. When
you exhale, carbon dioxide moves out of the body. A normal Breathing Rate plays a critical role
in keeping the balance of oxygen and carbon dioxide even in the body. If the oxygen level in the
blood is low, or if the carbon dioxide level in the blood is high, your Breathing Rate increases.
Various factors affect the Breathing Rate, including injuries, exercise, fever, anxiety, emotions,
mood, alcohol, medication, metabolic issues, and medical conditions. A high or low rate might
be the result of an activity and therefore does not indicate that there is anything wrong.
However, in other cases, such as various diseases, injuries, dehydration, or heart problems, a
change in the Breathing Rate may occur that can be considered abnormal, thereby
necessitating medical attention.
Knowing your Breathing Rate can help your doctor provide you with medical advice. If your
Breathing Rate changes or if you feel that your breathing is too fast or too slow, speak to a
doctor about your symptoms.
PRQ
The Pulse-Respiration Quotient (PRQ) is a measure of the ratio of a person’s pulse rate
(measured in beats per minute) to their respiratory rate (measured in breaths per minute).
The PRQ reflects the efficiency with which the heart and lungs are working together. In general,
the normal PRQ ratio is around 5. This ratio is kept both when the pulse rate is low and when it
is high. When the pulse rate is 60bpm the respiration rate is expected to be around 12rpm, and
at a pulse rate of 100bpm the expected respiration rate is about 20rpm. In case of a severe
deviation from this ratio, the subject needs to consult a physician for further examination.
The pulse-respiration quotient metric measures to what extent this interplay is functioning
normally. A low or high score would indicate that your HR and/or BR are working
disproportionately, which may indicate that both the heart and the lungs are working inefficiently.
Moreover, a person’s pathophysiological state (the functional changes associated with or
resulting from disease or injury) is indicated by abnormal PRQ readings.
Oxygen Saturation
Oxygen Saturation, or SpO2, is a measure of how much oxygen the red blood cells are carrying
from the lungs to the rest of the body. Normal SpO2 for healthy lungs ranges between
95%-100%. For individuals with chronic conditions or lung diseases could be lower than 95%.
A low level of oxygen in the blood is called hypoxemia. Typically, an Oxygen Saturation level
lower than 90% is considered hypoxemia, which can be caused by chronic pulmonary diseases
(COPD, COVID-19, Asthma, Lung Fibrosis, pulmonary hypertension), heart failure, sleep apnea,
anemia, and high-altitude exposure (insufficient oxygen in the air) and medications that
suppress breathing control.
Common symptoms of hypoxemia include headache, rapid heart rate, coughing, shortness of
breath, wheezing, confusion, and blueness of the skin and mucus membranes (cyanosis).
Oxygen Saturation levels can also be used by athletes to understand whether a decrease in
performance is a result of altitude changes or ability.
If you feel that your oxygen Saturation is low, speak to a doctor about your symptoms. They will
let you know what is normal for your specific condition.
Cardiac Workload
Cardiac Workload is an index that measures how much effort a person’s heart muscle is putting
in to pump blood throughout their body. Think of it as a measure of the intensity of the heart's
job at any given moment. A lower value generally indicates that the heart is working efficiently,
while a higher value signifies more strain.
This measurement is dynamic and changes based on daily activities. For example, Cardiac
Workload will naturally be lower during rest and higher during exercise or moments of stress. By
monitoring this indicator, you can gain a deeper understanding of how different activities and
overall health status affect the heart. While individual results vary, consistently elevated
readings during rest may suggest a higher cardiovascular strain, and it's a good idea to discuss
this with a healthcare provider.
Pulse Pressure
Blood pressure readings provide two numbers: a top number (systolic) and a bottom number
(diastolic). Pulse Pressure is the difference between them (Pulse Pressure=Systolic−Diastolic).
While standard blood pressure measures the force of blood against artery walls, Pulse Pressure
provides unique insight into the force the heart generates with each beat and the flexibility of a
person’s arteries.
A normal Pulse Pressure at rest is typically around 40 mmHg. A consistently high Pulse
Pressure may suggest that arteries are becoming less elastic, while a low Pulse Pressure could
indicate the heart isn't pumping as much blood as it should. Because it provides different
information than a standard blood pressure reading, tracking Pulse Pressure can help
individuals and their caretakers providers get a more complete picture of their heart health.
Mean Arterial Pressure (MAP)
Mean Arterial Pressure (MAP) represents the average pressure in the arteries during one
complete heartbeat. While a standard blood pressure reading shows the highest and lowest
pressure points, MAP provides a single, powerful value that reflects the overall blood flow to
vital organs, such as the brain and kidneys.
MAP is a crucial indicator for assessing whether a person’s organs are receiving a steady
supply of oxygen-rich blood. A normal MAP for a resting adult is generally between 70−100
mmHg. A value below 60 mmHg could imply that blood flow to vital organs is reduced.
Monitoring your MAP offers a more comprehensive view of the cardiovascular system's
performance, complementing regular blood pressure measurements.
Bloodless Blood Tests
Hemoglobin - Under research
Hemoglobin is a protein in a person’s red blood cells that carries oxygen to the human body's
organs and tissues and transports carbon dioxide from your organs and tissues back to your
lungs.
Hemoglobin is measured in g/dL and in resolution up to 0.1 g/dL
The category is based on your profile gender. The healthy ranges are:
● Men: 14 to 18 g/dL
● Women: 12 to 16 g/dL
Hemoglobin A1C - Under research
Hemoglobin A1C (or HbA1c) represents the average blood glucose (sugar) level for the last two
to three months. HbA1c is measured in percentage with resolution up to 0.01%.
HbA1c ranges:
● Normal < 5.6 %
● Prediabetes risk 5.7-6.4 %
● Diabetes risk > 6.5 %
Risks
High Blood Pressure Risk
The High Blood Pressure Risk result indicates whether your blood pressure exceeds preset
systolic/diastolic values.
Possible results: Low, Medium, or High.
Higher results indicate that your blood pressure is above the preset systolic/diastolic thresholds.
Blood pressure is the force exerted by blood against artery walls. Consistently high blood
pressure can signal potential health concerns. High Blood Pressure Risk helps individuals
understand if their blood pressure levels are elevated beyond a healthy range.
Maintaining optimal blood pressure is crucial for overall wellbeing. Prolonged high blood
pressure can put extra strain on the heart and blood vessels. While it often shows no symptoms,
unmanaged high blood pressure is a major risk factor for heart disease and can contribute to
severe long-term health risks. By monitoring this indicator, individuals can take proactive steps
toward lifestyle adjustments or seek professional guidance to support cardiovascular health.
High HbA1c Risk – Under Research
The High Hemoglobin A1c Risk (HbA1c) result indicates whether your Hemoglobin A1c level
exceeds a preset threshold.
Possible results: Low, Medium, or High.
Higher results indicate that Hemoglobin A1c levels are above the preset threshold.
HbA1c reflects the average blood sugar levels over the past two to three months, providing
insight into long-term blood sugar control. Consistently high HbA1c levels may indicate difficulty
in maintaining balanced glucose levels.
Monitoring HbA1c is important because elevated levels can be an early sign of poor blood sugar
management, which over time may lead to metabolic health concerns. Unlike daily blood sugar
measurements, HbA1c offers a broader picture of glucose trends, making it a valuable tool for
understanding long-term patterns. By tracking this indicator, individuals can gain awareness of
their blood sugar stability and take proactive steps toward healthier lifestyle choices.
High Fasting Glucose Risk – Under Research
The High Fasting Glucose Risk result indicates whether your glucose level exceeds a preset
threshold after at least 8 hours of fasting.
Fasting is essential for High Fasting Glucose Risk measurement. If you did not fast for 8-12
hours before taking a measurement, please disregard these results.
Possible results: Low or High.
A high result indicates that your fasting glucose level is above the preset threshold.
Glucose is the body’s primary source of energy, fuelling cells and vital functions. However, when
blood glucose levels are consistently high, it may indicate poor sugar control, which can be a
sign of prediabetes or diabetes mellitus.
Maintaining balanced glucose levels is essential for overall metabolic health. Prolonged high
blood sugar can strain the body's ability to regulate glucose effectively, potentially leading to
long-term health complications. Since elevated glucose levels may not always cause immediate
symptoms, monitoring this indicator helps individuals stay aware of their blood sugar control and
take steps toward healthier lifestyle choices.
High Total Cholesterol Risk – Under Research
The High Total Cholesterol Risk result indicates whether your total cholesterol level exceeds a
preset threshold.
Possible results: Low, Medium, or High.
Higher results indicate that the total cholesterol level is above the preset thresholds.
Cholesterol is a lipid (fat-like substance) found in the blood, essential for cell function and
hormone production. However, excessively high levels can contribute to the buildup of fatty
deposits in blood vessels.
Managing cholesterol levels is important because excessive amounts can lead to
atherosclerosis, a condition where arteries become narrowed and hardened, increasing the risk
of cardiovascular diseases. Since high cholesterol often has no noticeable symptoms,
monitoring this indicator helps individuals stay informed about their heart health and take
proactive steps, such as lifestyle adjustments, to maintain balanced cholesterol levels.
Low Hemoglobin Risk – Under Research
The Low Hemoglobin Risk result indicates whether your hemoglobin level is below a preset
threshold.
Possible results: Low or High.
A high result indicates that your hemoglobin level is below the preset threshold.
Hemoglobin is a protein in red blood cells that carries oxygen from the lungs to the rest of the
body. When hemoglobin levels are too low, the body’s ability to transport oxygen efficiently is
reduced.
Maintaining healthy hemoglobin levels is crucial for energy, endurance, and well-being. Low
hemoglobin can cause fatigue, dizziness, and shortness of breath, as the body struggles to
supply enough oxygen to tissues and organs. By monitoring this indicator, individuals can
become more aware of potential oxygen deficiencies and take steps to support their overall
health.
ASCVD Risk
ASCVD (Atherosclerotic Cardiovascular Disease) Risk estimates the likelihood of experiencing
an atherosclerotic cardiovascular event within 10 years. The ASCVD score is calculated using
our SDK's vital signs data combined with user demographic information, including:
● Age – Within the Framingham-supported range
● Sex – Male/Female
● BMI (Height and weight)
● Smoker – Yes/No
This score strongly correlates with the Framingham ASCVD score for predicting 10-year risk.
The ASCVD risk score will fall within one of the following categories:
● Below 1%
● Between 1%-30%
● Above 30%
ASCVD Risk Level
The ASCVD Risk Level indicates the level of a cardiovascular event within the next 10 years.
There are 3 ASCVD Risk levels:
● Low - indicates ASCVD Risk of up to 10%
● Medium - indicates ASCVD Risk of between 10% to 20% inclusive
● High - indicates ASCVD Risk of above 20%
Heart Age
The Framingham Heart Age estimates the biological age of the heart based on risk factors and
comparing it to an ideal healthy profile.
The Framingham Heart Age is a metric derived from the Framingham Heart Study and intended
to communicate cardiovascular risk in a simple and intuitive way by comparing a person’s
cardiovascular health to that of an average, healthy individual of the same sex.
The resulting cardiovascular risk is compared to the risk level of an "ideal" individual of the same
sex who has optimal risk factor values (e.g., healthy cholesterol, no smoking, normal blood
pressure). The heart age is the chronological age of this "ideal" person with the same level of
risk.
Interpretation

1. Heart age equals chronological age: Cardiovascular health aligns with average
   expectations for their age.
2. Heart age is younger than chronological age: Indicates better cardiovascular health than
   average.
3. Heart age is older than chronological age: Suggests higher cardiovascular risk and
   potential need for lifestyle changes or medical intervention.
   Stress
   Stress Level
   The body's reaction to a challenge or demand. There are five levels of Stress:
   The human body is designed to experience stress and react to it. When you deal with
   challenges and changes, your body produces physical and mental responses. Stress might be
   positive, keeping us alert, motivated, and ready to avoid danger. However, stress becomes a
   problem when stressors continue without relief or periods of relaxation.
   The application’s Stress Level measurement is based on Baevsky’s Stress Index which is
   approved for use in the US and in Europe. The index is calculated using Heart Rate Variability
   (HRV) measurements.
   It’s important to note that Stress Levels are indicative only and need to be corroborated with
   other parameters by a doctor before making a valid diagnosis. Stress Levels are highly dynamic
   and should be monitored over longer periods to detect abnormal trends.
   Stress Index
   Stress is the body's reaction to a challenge or demand.
   The application’s Stress Level measurement is based on Baevsky’s Stress Index which is
   approved for use in the US and in Europe. The index is calculated using Heart Rate Variability
   (HRV) measurements.
   The stress index is calculated from the Heart Rate Variability (HRV) measurements, which
   means that stress levels are derived from physiological conditions. HRV analysis is a globally
   accepted methodology and technique for evaluating the functional state of an organism and,
   specifically, components of the autonomic nervous system.
   The Stress Index is used to set the Stress Level.
   Normalized Stress Index
   Stress is the body's reaction to a challenge or demand.
   The Normalized Stress Level is calculated from the Stress Index and scaled to a range of 0 to
4. A high value indicates high stress.
   The Normalized Stress Index is calculated from the Heart Rate Variability (HRV) measurements
   and derived from physiological conditions. HRV analysis is a globally accepted methodology
   and technique for evaluating the functional state of an organism and, specifically, components of
   the autonomic nervous system.
   Heart Rate Variability
   HRV SDNN
   SDNN is a calculated parameter of Heart Rate Variability (HRV) that represents the standard
   deviation of normal-to-normal R-R-intervals. SDNN is expressed in milliseconds, and a normal
   value for this is over 50. However, SDNN values are also dependent on age and gender and
   normally become lower with age.
   An individual's heartbeats do not occur at constant intervals, but rather with a small variance
   between them. HRV measures the variation in time between the heartbeats.
   High levels of HRV generally indicate aerobic and general fitness. Athletes may track HRV to
   adjust their training program. They can learn when the body is being overworked, which often
   results in a drop in HRV, and can learn how fast they recover. Moreover, persons with high HRV
   may be more resilient to stress.
   HRV measurements provide feedback about your lifestyle and can help inspire taking steps
   toward a healthier life. If you are implementing changes in your lifestyle such as meditation,
   better sleep, better nutrition, and participation in sports and physical activity, you may notice
   changes in the HRV. In addition, this could help to track your nervous system's reactions to the
   environment, emotions, thoughts, and feelings.
   The sympathetic system (Stress Response) is activated when the body is under stress, causing
   the heart to beat faster and more regularly, and causing HRV to decrease. The parasympathetic
   system (Recovery Ability) manages the heart’s activity to help the body reach a relaxed state
   and to recover from a stressful event. This relaxation response results in a slower and less
   regular heartbeat and is indicated by a higher HRV.
   If you have questions about your results, seek a doctor’s advice and they will let you know
   what’s normal for your specific condition.
   Mean RRi
   Mean RRi is the average time between the RR intervals (RRi) in milliseconds. RRi is the
   variation of the interval between successive heartbeats. A longer Mean RR interval indicates a
   lower heart rate and higher parasympathetic cardiac activation.
   The Mean RRi is one of the parameters used to calculate the PNS Index, along with RMSSD
   and SD1.
   RMSSD
   An important measure of the Heart Rate Variability. RMSSD is the root mean square of
   successive RR interval differences. It reflects the beat-to-beat variance in the heart rate.
   RMSSD can help identify a general level of fatigue. In addition, a higher RMSSD is linked to
   parasympathetic control, a sign that you are in the “rest and digest” mode. A lower RMSSD is
   linked to elevated sympathetic activity, an indication of a Stress Response.
   RMSSD is one of the parameters used to calculate the PNS Index, along with Mean RRi and
   SD1.
   Advanced Heart Rate Variability
   Recovery Ability (PNS Zone)
   The Recovery Ability that is also known as "rest and digest'' response refers to the body’s ability
   to recover, accumulate energy, and regulate bodily functions after stressful occurrences. This is
   part of the autonomic system that consists of two sub-systems, the sympathetic (Stress
   Response) system and the parasympathetic (Recovery Ability) system. Your Heart Rate
   Variability is reflected in the balance between these two sub-systems.
   There are three zones of Recovery Ability:
   The normal and high zones are more desirable than the low zone. In the normal and high
   zones, the body is able to effectively conserve energy, relax, or recover from a stressful
   occurrence.
   The parasympathetic metric measures the activity of the PNS and indicates how capable a
   person is of relaxing or recovering after stressful events. A low zone would indicate a stressful
   state, while a high zone would suggest calmness.
   The system plays an important role in alleviating stress and promoting recovery. It does so by
   inhibiting the activity of the sympathetic nervous system and ceasing the production of stress
   hormones. It returns bodily functions to their resting state by slowing the heart rate, lowering
   blood pressure, reducing muscle tension, and restoring regular breathing, digestion, and
   glandular activity.
   The recovery ability is derived from the parasympathetic nervous system (PNS) index. The PNS
   Index calculation is based on the following three parameters: Mean RRi, RMSSD, and SD1.
   These zones should be used as a guide only. Seek a doctor’s advice in order to obtain a valid
   diagnosis.
   PNS Index
   The PNS Index calculation is based on the following three parameters: Mean RRi, RMSSD, and
   SD1, and is used to indicate the body’s Recovery Ability zones.
   Stress Response (SNS Zone)
   The Stress Response, which is also known as "fight or flight" response, refers to a physiological
   reaction to imminent danger that occurs when we are scared, anxious, stressed, attacked, or
   threatened. Essentially, it prepares our body to either deal with a threat or to run for safety. This
   is part of the autonomic system that consists of two sub-systems, the sympathetic (Stress
   Response) system and the parasympathetic (recovery ability) system. Your Heart Rate
   Variability is reflected in the balance between those two sub-systems.
   There are three zones of Stress Response:
   The normal and low zones are more desirable than the high zone. In the normal and low zones,
   the body is able to effectively respond to stressful situations and emergencies.
   When preparing for an emergency, the sympathetic nervous system (SNS) activates numerous
   complex pathways and components. These physiological activities help to achieve a faster heart
   rate, breathing rate, and blood pressure. Noticeable changes include blood flow that moves
   away from the skin and stomach, and is redirected from the intestines to the brain, heart, and
   muscles, as well as sweating, "goose-bumps", dilation of the pupils, and a host of other feelings
   that appear during the Stress Response. In addition, there is a psychological aspect to the
   Stress Response. Automated responses include quick thinking and focusing on salient targets
   such as the source of the threat and escape options.
   The stress created by a situation is helpful and increases the chances of coping effectively with
   the threat. This type of stress can help you perform better in situations where you are under
   pressure to do well.
   This Stress Response is derived from the sympathetic nervous system (SNS) Index. The SNS
   Index is calculated based on the following three parameters: Heart Rate, Baevsky’s Stress
   Index, and SD2.
   These zones should be used as a guide only. Seek a doctor’s advice in order to obtain a valid
   diagnosis.
   SNS Index
   The SNS index is calculated based on the following three parameters: Heart Rate, Baevsky’s
   stress index, SD2, and is used to set the stress response zone.
   SD1
   SD1 is a poincaré plot standard deviation perpendicular to the line of identity.
   SD1 is one of the parameters used to calculate the PNS Index, along with RRi and RMSSD.
   SD 2
   SD2 is a poincaré plot standard deviation along the line of identity.
   SD2 is one of the parameters used to calculate the SNS Index, along with Heart Rate and
   Baevsky’s Stress Index.
   LF/HF
   LF and HF stand for Low-Frequency and High-Frequency bands, which represent the
   Sympathetic and Parasympathetic activity, respectively.
   The LF/HF ratio reflects the balance between sympathetic and parasympathetic activity. The
   normal range is between LF(ms
   2
   )/HF(ms
   2
   ) = 0.27 - 0.38. A lower ratio of LF/HF indicates a high
   Parasympathetic stress level, and a higher ratio indicates an increased Sympathetic activity
   which is a biomarker of stress.
   RRi Data
   The RR interval is the time between the "R" peaks of successive heartbeats, in milliseconds.
   An individual's heartbeats do not occur at constant intervals, but rather with a small variance
   between them. Heart Rate Variability (HRV) is the variation in time between the heartbeats. You
   can export the RR interval data for analysis use.

Last updated: 11/4/25, 5:48 PM

```

```