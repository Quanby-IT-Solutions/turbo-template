# HyperVerge SDK Documentation

## Get Started

Integrate a simple workflow by following just four easy steps.

### Step 1: Select a workflow

A workflow is a set of steps that your user's application will undergo to complete their verification process.

The workflows tab of the dashboard displays the workflows configured for you. Please contact the HyperVerge team for further customizations to suit your unique business requirements.

[Learn more about workflows](#)

### Step 2: Configure the Front End
#### Integrate into Mobile Application or Website

Integrate any of our workflows within 10 lines of code!

You can integrate a workflow into your mobile or web application with the help of the HyperVerge front-end SDKs. The SDKs help your users navigate through the configured steps and return the associated results to your app. The SDKs are available in Android, iOS, React Native, Flutter & JavaScript(web).

[How to integrate HyperVerge SDKs?](#)

#### Share Onboarding Link

Alternatively, you can skip the integration and share our ready-to-use onboard links with your users through email, short messaging service(SMS), WhatsApp or other social media channels.

[How to use Onboard Links?](#)

### Step 3: Review Manually

Most workflows have some applications tagged for Needs Review.

These applications should be manually reviewed by someone from your team.

#### Manual Review using the HyperVerge Dashboard

The HyperVerge dashboard supports the user applications and their associated statuses for both SDK integration and onboard links.

Your review team can manually approve or manually decline the applications requiring review through the dashboard.

[View applications on dashboard](#)

#### Manual Review using your Internal Portal

If you want to handle manual review on your own portal, you can fetch application details to your backend using the Results API and the Results Webhook.

### Step 4: Notifying the User

Once the applications marked as needs review have been either approved or declined by your team, you can further notify the user of the verification result as soon as it is available.

If you are using the HyperVerge dashboard for review, the Results Webhook can notify your backend code when an application evaluates to manually approved or manually declined.

## Key Concepts

### Workflows

A workflow is a series of steps an end user(and their application) goes through, in order to complete their onboarding.

HyperVerge provides several out-of-the-box workflows optimized for various business use cases across geographies. You can either implement any of these workflows or customize them(no-code) to suit your business needs.

You can integrate our low-code SDKs or directly share our onboard links with your users to implement a verification workflow.

[Learn more about workflows](#)

### Modules

Modules are the building blocks of a workflow.

Each module has a unique functionality (such as 'ID card validation' or 'database check'). Based on your requirements, your workflow can be built with the appropriate set of modules placed in an order that optimizes business metrics.

[Learn more about modules](#)

![sampleWorkflow](#)

### Applications

An application is essentially, a single journey of an end user through a workflow.

An application is automatically created by HyperVerge every time a user starts onboarding either on your app(through the SDK) or via an onboard link. You can either view applications on the HyperVerge dashboard (also known as the 'Audit Portal ') or fetch the details from your backend using the Results API.

[Learn more about applications](#)

### SDKs

SDKs are the front-end frameworks that can be used to integrate any workflow of HyperVerge into your iOS, Android or Web app. The SDKs can be integrated into your app with just 10 lines of code.

[Learn more about SDKs](#)

### Onboard Links

If you do not want a front end integration, you can still verify your users by sharing the HyperVerge onboarding link with them.

The onboard links are hosted on a HyperVerge server and can implement any workflow of your choice. It internally uses our JavaScript SDK and supports all corresponding customizations.

[Learn more about Onboard Links](#)

### User Roles and Permissions

The user roles and associated permissions configured through the HyperVerge dashboard (or the 'Audit Portal ') play a crucial role in ensuring that invited members or users only have access to the resources necessary for their roles and responsibilities.

Please ensure that you are aware of all the user roles and permissions before inviting members to the dashboard.

## SDK Integration Guides

### Overview

The following document gives an overview of the HyperKYC SDKs.

### What does the SDK do?

The SDK takes in a workflow of your choice and implements it end to end. The final results are returned to your app.

### How does it work?

1. SDK takes in the 'Workflow ID' of the workflow you want to integrate. This can be found on the dashboard
2. SDK implements all the steps in the workflow, including user interactions, APIs, rules etc
3. SDK returns final application status to your app
4. Your app can now inform the user of their application status

![sdk-flow](#)

### SDK Integrations

We provide 5 different frontend SDKs. Visit the below pages to learn about how to integrate them:

- [Android SDK](#)
- [iOS SDK](#)
- [React Native SDK](#)
- [Flutter SDK](#)
- [Web SDK](#)

### Best Practices

The following best practices are recommended for all HyperVerge SDKs (Android, iOS, React Native, Flutter, and Web) to ensure optimal performance, security, and user experience:

- Generate authentication tokens from your backend server, avoid using raw API credentials in mobile applications
- Validate camera and microphone permissions before launching SDK (mobile platforms)
- Use secure storage mechanisms for sensitive verification data
- Use the latest SDK version for optimal performance and newest features
- Exclude unused SDK modules to reduce overall application size
- Implement proper error handling for network connectivity issues
- Ensure your domain is properly whitelisted (web platform)
- Use HTTPS for all production environments
- Consider prefetching configurations for faster load times (web platform)

## Flutter SDK

### Introduction

The HyperKYC Flutter SDK enables you to integrate workflows inside your Flutter app, providing cross-platform identity verification capabilities for both Android and iOS platforms.

### Key Features

- Provides cross-platform support for both Android and iOS platforms
- Delivers native performance through platform-specific implementations
- Enables core functionalities like Camera and Geo Location without internet connectivity
- Features modular architecture to exclude unused components and reduce app size
- Allows configurable UI text for multiple languages
- Enables seamless verification continuation across different devices
- Offers easy integration with pub.dev package management

### Implementation Overview

1. Add the SDK to your Flutter project as a pub.dev dependency
2. Guide users through verification steps using native UI components
3. Receive structured results containing status information and extracted data
4. Process verification results to determine subsequent steps in user workflows

### Prerequisites

**Development Requirements:**

- Flutter SDK: 3.0+ (recommended)
- Dart SDK: 2.17+ (recommended)
- Android: minSdkVersion 21 (Android 5.0) or higher
- iOS: iOS 12+ with Xcode 15.1+
- Development Environment: Flutter CLI with Android Studio or VS Code
- Platform-specific toolchains for Android and iOS development

**Required Permissions:**

The SDK requires:

- **Camera**: for document/face capture
- **Microphone**: for video workflows (optional)
- **Location (optional)**: if setUseLocation(true) is enabled
- **NFC (optional)**: for NFC-based verification workflows

Flutter SDK permissions are handled through platform-specific configuration files. For Android, permissions are configured in the AndroidManifest.xml file, while iOS permissions are handled through Info.plist customization. You add only the permissions your app needs to the respective configuration files, and omit those you don't require. For a comprehensive list of all required permissions, optional permissions, and detailed configuration examples, see our SDK Permissions Guide.

**HyperVerge Account Setup:**

- Active HyperVerge account with dashboard access
- Set up and configure a specific workflow in your HyperVerge One account dashboard
- Obtain valid appId and appKey credentials from the HyperVerge One dashboard
- Ensure you provide the correct WorkflowID to integrate any workflow provided by HyperVerge

### Related Documentation

| Page | Description |
|------|-------------|
| [Quick Start Guide](#) | Get started quickly with Flutter SDK using this step-by-step quick start guide |
| [Integration Guide](#) | Step by step guide for integrating the Flutter SDK into your Flutter application with code examples |
| [Changelogs](#) | Track version updates, new features, bug fixes, and breaking changes in the Flutter SDK |
| [SDK Permissions Guide](#) | Learn about required permissions, optional permissions, and how to configure platform-specific files for your Flutter app |

## Flutter SDK - Quick Start Guide

The following guide helps you integrate the HyperKYC Flutter SDK and launch your first workflow in minutes.

### Step 1: Add SDK to Your Project

Install the Flutter plugin using pub:

```bash
# Install the Flutter plugin
flutter pub add hyperkyc_flutter
```

**Platform-Specific Installation**

**Android:** Ensure minimum SDK version is 21 or higher in android/app/build.gradle. Add the HyperVerge Maven repository in android/build.gradle (see Integration Guide for details).

**iOS:** Install native dependencies:

```bash
cd ios && pod install && cd ..
```

For detailed platform configuration including permissions and repository setup, see the Integration Guide.

### Step 2: Initialize and Launch the SDK

Initialize the SDK and launch a verification workflow in your Flutter app:

The following integration code creates a configuration instance based on the accessToken:

```dart
var hyperKycConfig = HyperKycConfig.fromAccessToken(
    accessToken: "<access-token>", // Refer to the "Authentication" page
    workflowId: "<workflow-id>",
    transactionId: "<transaction-id>",
);

// Launch the HyperVerge SDK with configuration
try {
  HyperKycResult hyperKycResult = await HyperKyc.launch(
      hyperKycConfig: hyperKycConfig
  );

  // Handle verification outcome
  String? status = hyperKycResult.status?.value;
  switch (status) {
    case 'auto_approved':
      // All checks passed - update UI, proceed
      print('Workflow successful - auto approved');
      break;
    case 'auto_declined':
      // Verification failed - show rejection UI
      print('Workflow successful - auto declined');
      break;
    case 'needs_review':
      // Ambiguous result - show pending review UI
      print('Workflow successful - needs review');
      break;
    case 'user_cancelled':
      // User exited flow - handle gracefully
      print('User cancelled the workflow');
      break;
    case 'error':
      // Technical failure - show retry option
      print('Workflow failed with error');
      break;
  }
} catch (e) {
  print('Error launching HyperKYC: $e');
}
```

The following table describes each parameter in the configuration:

| Parameter | Description | Source |
|-----------|-------------|---------|
| appId & appKey | Credentials for authentication | HyperVerge Dashboard Credentials |
| accessToken | Short-lived token from your backend | Generate Access Tokens |
| workflowId | Workflow identifier | HyperVerge Dashboard |
| transactionId | Unique session identifier | Generated by your backend |

That's it! You've launched your first HyperKYC workflow.

### Step 3: Handle Results & Test the Flow

The callback in Step 2 returns one of these statuses:

| Status | Description |
|--------|-------------|
| auto_approved | User verified successfully |
| auto_declined | Application rejected automatically |
| needs_review | Flagged for manual review |
| user_cancelled | User exited before completion |
| error | SDK or network issue |

For detailed response formats, error codes, and field descriptions, see the SDK Response documentation.

**Test:** Build & run your app, trigger the launcher, complete a sample journey, and check the log output to confirm integration.

### Next Steps

Explore advanced capabilities:

- Additional Configurations: See the Integration Guide for detailed configuration options including prefetch, UI customization, language settings, platform-specific setup, and advanced configuration options.
- Error Codes & Troubleshooting: For detailed error codes and descriptions, see Error Response Details.
- Integrate Results Webhook: Receive backend updates when journeys complete using the Results Webhook API.
- Real-time Event Notifications: Track user progress with Real-time Event Notifications.
- Sample Project: Download the Flutter Sample Project for a complete working example.

### Recommendations

Follow these best practices to ensure a secure and smooth integration:

**Important**

- Validate camera & microphone permissions before SDK launch (if your workflow requires these)
- Do not send SDK results directly to your backend for decisioning. To avoid potential man‑in‑the‑middle (MITM) attacks, integrate the Results Webhook instead to securely receive verified outcomes from HyperVerge servers.
- Avoid repeated SDK initialization. Ensure your app prevents multiple button presses or asynchronous triggers to avoid multiple invocations of the SDK.

## Flutter SDK - Integration Guide

This guide provides step-by-step instructions for integrating the HyperKYC Flutter SDK into your project.

### Additional Resource

- Complete Sample Project: A ready to use example project with all the code you need to get started with the Flutter SDK quickly.

### Prerequisites

Before starting the integration, please ensure you meet all the requirements listed in the Prerequisites for Flutter SDK Integration section.

### Integration Steps

The following steps will guide you through implementing the HyperKYC Flutter SDK in your application:

### Step 1: Add the SDK to your Project

**Installation**

HyperKyc Flutter plugin is available on Pub - hyperkyc_flutter

Run the following command in your flutter project directory:

```bash
flutter pub add hyperkyc_flutter
```

### Step 2: Platform Setup

#### Android Configuration

1. Make sure that the minimum SDK version is 21 or higher in android/app/build.gradle:

```gradle
android {
    defaultConfig {
        minSdkVersion 21
        // ... other configurations
    }
}
```

2. Open android/build.gradle file and add the following lines inside allprojects function:

```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        maven {
            url = "https://s3.ap-south-1.amazonaws.com/hvsdk/android/releases"
        }
    }
}
```

3. Sync the project

4. Add only required permissions in AndroidManifest.xml:

android/app/src/main/AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />

<!-- Optional permissions - add only if needed -->
<!-- <uses-permission android:name="android.permission.RECORD_AUDIO" /> -->
<!-- <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" /> -->
<!-- <uses-permission android:name="android.permission.NFC" /> -->
```

5. Remove unused permissions if needed:

android/app/src/main/AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"
  tools:node="remove" />
```

#### iOS Configuration

1. cd to iOS directory and run pod install:

```bash
cd ios && pod install && cd ..
```

2. Add Camera Permissions to request the user for camera permissions, add this key-value pair in your application's Info.plist file:

ios/Runner/Info.plist

```xml
<key>NSCameraUsageDescription</key>
<string>Access to camera is needed for document and face capture</string>

<!-- Optional permissions - add only if needed -->
<key>NSMicrophoneUsageDescription</key>
<string>Granting mic permission allows you to complete video statement</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Location access is required for KYC verification process</string>
```

Key-Value Reference:

- Key: Privacy - Camera Usage Description
- Value: "Access to camera is needed for document and face capture"

### Step 3 (Optional): Prefetch Resources and Configs

To improve performance, prefetch resources and configs before launch:

```dart
await HyperKyc.prefetch(
    appId: "<app-id>",          // obtain this from HyperVerge dashboard
    workflowId: "<workflow-id>" // obtain this from HyperVerge dashboard
);
```

- appId: Your assigned App ID
- workflowId: Workflow configured in the HyperVerge dashboard

### Step 4: Optional Configurations

Create and customize the HyperKYC configuration to match your specific requirements and workflow needs.

#### Step 4.1: Create the HyperKYC Config

HyperKYC Flutter SDK supports two authentication methods for configuration: appID and appKey for straightforward integration, or access tokens for token-based authentication. Both approaches are demonstrated below, with access token generation steps available on the Authentication page.

- Using Access Tokens
- Using Credentials

The following integration code creates a configuration instance based on the accessToken.

```dart
var hyperKycConfig = HyperKycConfig.fromAccessToken(
    accessToken: "<access-token>", // Refer to the "Authentication" page
    workflowId: "<workflow-id>",
    transactionId: "<transaction-id>",
);
```

Here:

- appId & appKey can be accessed from the credentials' tab in the dashboard
- workflowId: To get the workflowID, select the workflow you want to integrate from the workflows' tab of the dashboard
- transactionID: is any unique identifier you want to set for the customer or the customer's application (eg: userId, customerId etc).

#### Step 4.2: Customize the Config

List of workflow configuration options in the HyperVerge Flutter SDK:

### Step 5: Launch the workflow and Implement a Results Handler

Create a results handler to process the outcome of the workflow. The example below shows how to launch the SDK and handle the results:

```dart
try {
  HyperKycResult hyperKycResult = await HyperKyc.launch(
      hyperKycConfig: hyperKycConfig
  );

  // Handle result post workflow finish/exit
  String? status = hyperKycResult.status?.value;
  switch (status) {
    case 'auto_approved':
      // workflow successful
      print('Workflow successful - auto approved');
      break;
    case 'auto_declined':
      // workflow successful
      print('Workflow successful - auto declined');
      break;
    case 'needs_review':
      // workflow successful
      print('Workflow successful - needs review');
      break;
    case 'error':
      // failure
      print('Workflow failed with error');
      break;
    case 'user_cancelled':
      // user cancelled
      print('User cancelled the workflow');
      break;
    default:
      print('Contact HyperVerge for more details');
  }
} catch (e) {
  print('Error launching HyperKYC: $e');
}
```

### Step 6 (Optional): Implement Real-Time Event Notifications

The real-time event notification system provides immediate insights into user journeys through event-based architecture. These events are triggered when users complete major milestones in their journey, allowing you to track progress and implement trigger-based interventions.

To implement real-time event notifications in your Flutter app, refer to the Flutter implementation guide.

### Step 7: Launch the SDK

```dart
HyperKycResult hyperKycResult = await HyperKyc.launch(hyperKycConfig: hyperKycConfig);
```

**Important**

Avoid repeated SDK initialization. Ensure your app prevents multiple button presses or asynchronous triggers to avoid multiple invocations of the SDK.

You are now ready to build and run your Flutter app!

Your Flutter application is now successfully integrated with the HyperKYC SDK. You can build and test your application to ensure everything works as expected.

### SDK Responses

For detailed information about Flutter SDK responses, see the SDK Response Documentation.

### Error Response Details

The Flutter SDK normalizes internal errors into standardized error codes.

| Code | Name | Android | iOS | Description |
|------|------|---------|-----|-------------|
| 101 | SDK_CONFIG_ERROR | ✓ | ✓ | Config errors (empty/invalid appId, workflowId, transactionId, accessToken, defaultLangCode) |
| 102 | SDK_INPUT_ERROR | ✓ | ✓ | Invalid/missing inputs, file inaccessible |
| 103 | USER_CANCELLED_ERROR | ✓ | ✓ | User closed/cancelled workflow |
| 104 | WORKFLOW_ERROR | ✓ | ✓ | Workflow execution errors (doc, face, API, encryption) |
| 105 | SDK_VERSION_ERROR | ✓ | ✓ | SDK version not supported by workflow |
| 106 | PERMISSIONS_ERROR | ✓ | ✓ | Required permission not granted (camera, mic, location) |
| 107 | HARDWARE_ERROR | ✓ | ✓ | Device hardware/camera failure |
| 108 | GPS_ACCESS_DENIED | ✓ | ✓ | Location permission denied |
| 109 | QR_SCANNER_ERROR | ✓ | (reserved) | QR scanner submodule missing (Android) |
| 110 | SSL_CONNECT_ERROR | ✓ | ✓ | SSL handshake/pinning failure |
| 111 | NETWORK_ERROR | ✓ | ✓ | Connectivity/server errors (timeouts, 4xx/5xx, token expired) |
| 112 | SIGNATURE_FAILED_ERROR | ✓ | ✓ | Response signature mismatch |
| 113 | FACE_NOT_DETECTED | ✓ | ✓ | Face not detected or blurry |
| 114 | DEVICE_ROOTED_ERROR | ✓ | – | Android only (rooted/jailbroken device check) |
| 115 | SECURITY_ERROR(reserved) | ✓ | iOS only — screenshot or screen recording detected | |
| 117 | ACTIVITY_DESTROYED_ERROR | ✓ | – | Android only — Activity destroyed / low memory |
| 118 | LOW_STORAGE_ERROR | ✓ | – | Android only — storage < 1 MB |
| 119 | NFC_INVALID_ERROR | ✓ | – | Android only — NFC SDK not integrated |
| 120 | NFC_UNAVAILABLE_ERROR | ✓ | ✓ | NFC not available on device |
| 121 | NFC_AUTHENTICATION_ERROR | ✓ | ✓ | NFC chip authentication failed |
| 122 | NFC_CONNECTION_ERROR | ✓ | ✓ | NFC card disconnected mid-scan |
| 123 | WEB_FORM_ERROR / FORM_V2_ERROR | ✓ | ✓ | Web form integration/config errors |
| 124 | BROWSER_NOT_SUPPORTED | ✓ | ✓ | No supported browser available |
| 125 | NFC_INCOMPLETE_SCAN_ERROR | ✓ | ✓ | NFC scan incomplete (missing DGs) |
| 126 | PRIVACY_CONSENT_DENIED_ERROR | ✓ | ✓ | User denied privacy consent |
| 127 | WEBCORE_NOT_SUPPORTED | ✓ | – | Android only — missing Play Services / WebView |
| 128 | SDK_EXIT_ERROR | ✓ | ✓ | SDK closed unexpectedly / backgrounded |
| 140 | SDK_INTERNAL_ERROR | ✓ | – | Android only — unexpected state |
| 141 | PERMISSION_REVOKED_ERROR / DATE_FORMAT_ERROR (iOS) | ✓ | ✓ | Android: permission revoked mid-flow; iOS: invalid date format |
| 151 | CHECK_SESSION_ERROR | ✓ | ✓ | Session validation failed |

## Input Fields

While most workflows are self sufficient, some workflows require additional fields to be provided at the time of SDK initialization or while generating onboard links.

You can check if this is a requirement for your workflow by looking at the "Inputs to SDK" section in the bottom right of the workflows details page

## SDK Response

The HyperKYC SDKs return five distinct status values for all transactions, each representing a different outcome of the workflow execution. They are:

- auto_approved
- needs_review
- auto_declined
- error
- user_cancelled

### auto_approved / needs_review / auto_declined

When the workflow completes successfully (approved, declined, or requires manual review), the SDK returns:

```json
{
  "TransactionID": "<Transaction_ID>",
  "status": "auto_approved/auto_declined/needs_review",
  // details will be sent if the workflow has sdkResponse
  "details": {
    "fullName": "<Full_Name>",
    "countrySelected": "ind",
    "dateOfBirth": "<Date_of_Birth>",
    "dateOfIssue": "<Date_of_Issue>",
    "selfieImage": "",
    "idFrontImage": "",
    "idBackImage": ""
  }
}
```

When exitOnEndStates is enabled in the workflow, the following response structure is returned if a user attempts to resume a transaction that has already reached a final state:

```json
{
    "TransactionID": "<Transaction_ID>",
    "status": "auto_approved/auto_declined/needs_review",
    "details": {},
    "transactionAlreadyProcessed": true
}
```

### error

When an error occurs during workflow execution, the SDK returns error details including the specific module where the issue occurred:

```json
{
   "TransactionID": "<Transaction_ID>",
   "status": "error",
   "errorMessage": "<error_message>",
   "errorCode": "<error_code>",
   "latestModule": "<module_id>" // module in which the error has occured
}
```

### user_cancelled

When a user voluntarily exits or cancels the process before completion, the SDK returns:

```json
{
   "TransactionID": "<Transaction_ID>",
   "status": "user_cancelled",
   "errorCode": 103,
   "errorMessage": "Workflow cancelled by user",
   "latestModule": "<module_id>" // module in which user closed the SDK
}
```

## SDK Response Details

Upon workflow completion, the HyperKYC Web SDK returns a HyperKycResult object. The following table lists all the fields returned within the object, and their descriptions:

| Field | Description |
|-------|-------------|
| status | The workflow execution status (auto_approved, auto_declined, needs_review, error, user_cancelled) |
| details | The requested data points from the workflow execution, created based on sdkResponse definition in the workflow configuration |
| TransactionID | The transaction ID provided during SDK initialization |
| errorMessage | Error description message (only returned when status is error or user_cancelled) |
| errorCode | Error code (only returned when status is error or user_cancelled) |
| latestModule | The last executed module before cancellation or error (only returned when status is error or user_cancelled) |
| transactionAlreadyProcessed | Indicates that the end state has already been reached for the given TransactionID, as specified in exitOnEndStates within the workflow |

## UI Configurations

The SDKs & Onboard links supports the following UI & text configurations:

### Text Customisations

Any text displayed on the SDK screens can be changed to suit your requirements.

**Supported Languages:**

- You can configure the SDK to support text of multiple languages as long as the languages have a two-letter code ISO 639-1 code (or the alpha-2 language code).
- By default, the SDK uses the device's language to show the correct text to the user. You can override this by providing the language code as an input during integration.

The following is a sample configuration code illustrating this feature.

#### React Native

The following code sample contains an optional configuration parameter defaultLangCode under the configDictionary object for the language configuration.
The configDictionary object in this context is identical to the one used as the default configuration during the initial SDK setup.

```javascript
{
    import { NativeModules } from 'react-native';
    const { Hyperkyc } = NativeModules;

    var configDictionary = {};
    configDictionary["defaultLangCode"] = "vi"; // Optional parameter for language

}
```

### UI Customisations

Based on the element, the following customisations are possible:

#### Colors

- Primary & secondary buttons
- Capture button
- Title texts
- Description texts
- Error text in retake screen

#### Font family, weight, size & alignment

- Primary & secondary buttons
- Title texts
- Description texts
- Error text in retake screen

#### Border Radius

- Primary & secondary buttons

Below diagram summarises all the customisations:

![sdk-customisations](#)

### How to enable these customisations

- Currently, these customistions have to be enbled through a configuration by our Integration engineers. Please reachout to us if you need any UI or text customisations
- We will soon add this functionality to the dashboard

## Real Time Event Notifications

### Objective

Real-time events are milestone notifications emitted by the SDK during the user's onboarding journey. These events provide visibility into the user's progress through each step of the process.

### Key Feature

The Real-Time Event Notifications provides immediate insights into user journeys through event-based architecture.

These events can be integrated with your CRM systems or notification tools, enabling:

- Real-time tracking of user progress.
- Trigger-based interventions (e.g., reminders, agent calls).
- Enhanced funnel analytics and proactive drop-off management.

### Important

Real-time event notifications must be enabled for your account before you can receive them. Even if you implement the event listeners correctly, you will not receive any events unless this feature is enabled. Please contact HyperVerge to enable real-time events for your account.

### Event Details

#### When is it triggered?

Events are triggered when a user completes a major milestone (stage completion) in their journey. For example, when they finish the last module of a step that has event triggers enabled.

#### Sample Event

The following is a JSON structure for the step_ended event:

```json
{
  "schemaVersion": "1.0.0",
  "eventName": "step_ended",
  "timestamp": "2025-04-21T10:35:40.321Z",
  "sdkVersion": "0.45.0",
  "transactionId": "transactionId_1234",
  "workflowId": "onboarding",
  "workflowVersion": "1.0.0",
  "appId": "abcdef",
  "stepId": "digilocker",
  "metadata": {}
}
```

#### Event Description

The following table describes all the details returned in the event notification:

| Field | Type | Description |
|-------|------|-------------|
| schemaVersion | string | The schema version to preserve contract compatibility for existing integrations |
| eventName | string | The name of the event |
| timestamp | string | The UTC time of the event — important for sequencing |
| sdkVersion | string | The version of SDK that sent the event |
| transactionId | string | The unique identifier of the application |
| stepId | string | The identifier of the stage completed |
| metadata | JSON object | The event-specific payload |

### SDK Integration

Use the SDK-provided addEventListener API to subscribe to real-time milestone events.

The following sections highlight how to implement real-time event listeners for each supported platform. Make sure to implement these listeners before launching the HyperKYC SDK to ensure you don't miss any events.

#### Flutter

Implement real-time event notifications in your Flutter app using stream-based listeners.

```dart
// [Recommended] Attach event listeners before launching HyperKYC SDK
HyperKyc.addEventListener(listener: (event) {
    // Handle the step_ended event
});

// [Recommended] Remove all event listeners after receiving the SDK response from HyperKYC SDK
await HyperKyc.removeAllEventListeners();
```

#### Important Notes

- addEventListener() is not the same as DOM event listeners; it simply acts as a callback mechanism.
- removeAllEventListeners() clears any internal references — must be called at the end of the journey to avoid dangling references.
- Calling removeAllEventListeners inside an event listener does not cancel pending future events (in Android & Web platforms, yet).

#### Best Practices

- Attach event listeners before launching the HyperKYC SDK.
- Do not execute blocking code (e.g., synchronous heavy logic) inside the event listener callback.
  - Especially important for JavaScript-based environments which run on a single thread.
  - Use async/await, setTimeout, or background queues.
- Do not execute main-thread blocking code inside the event listener callback.
- Always call removeAllEventListeners() after SDK completion to avoid memory leaks.