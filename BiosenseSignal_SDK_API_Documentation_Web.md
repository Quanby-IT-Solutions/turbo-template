# BiosenseSignal Web SDK Developer Portal

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

### 3. Resolving license server accessibility in certain regions

The SDK connects with the license server at [https://licensing-api.biosensesignal.com](https://licensing-api.biosensesignal.com). The traffic to this server is routed through a Cloudflare service. Since Cloudflare is inaccessible in certain countries, a custom workaround is available for these regions. Contact our customer support if the license server is unreachable in your target territories.

### 4. Updates in Wellness Index and Wellness Level indicators

The calculation methods for Wellness Index and Wellness Level have been updated. These indicators are derived from several other indicators and can still be determined even if only a subset of them is available. For optimal results, it is recommended to set a measurement duration of at least 50 seconds and ensure that as many contributing indicator values as possible are obtained. For additional information, refer to the Indicators Technical Information page.

The indicators used in the calculation are:

- Pulse Rate
- Blood Pressure
- Heart Rate Variability (RRi)

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

## Known Limitations

- Instruct the user to wait for 3 minutes between face measurements to prevent device overheating.
- Android devices with lower Geekbench 6.0 (single-core) benchmark scores might encounter inconsistency when using the SDK.
- The SDK must have a valid internet connection on the first launch to obtain license information. If an issue occurs, instruct the user to check their network connection and recreate the SDK session.
- Hemoglobin and Hemoglobin A1c are under research.

## System Requirements

The BiosenseSignal Web SDK provides support for Android smartphones and tablets, as well as iPhones and iPads. The SDK may operate on additional devices or browsers; however, these are not officially supported. For clarification regarding compatibility, please contact the support team.

The requirements below must be met in order to support the calculation of vital signs using the SDK.

### System Requirements - Android

The following device requirements must be met in order to use the BiosenseSignal Framework in your Android application:

#### Benchmark Performance Verification

Based on the Geekbench 6 single-core results from [https://browser.geekbench.com/android-benchmarks](https://browser.geekbench.com/android-benchmarks), it is recommended to use a device with a benchmark score of 500 or higher. Devices with a score of 300 or higher are supported.

#### RAM

The device must have at least 3GB of RAM.

#### Camera

**FPS**

The camera must support 15 FPS (frames per second) imaging.

**Image Size**

The camera must allow an image output size of 640x480 pixels.

#### Browser

BiosenseSignal SDK supports Chrome version 113 or later.

### System Requirements - iOS

The following device requirements must be met in order to use the BiosenseSignal SDK in your iOS application:

#### iOS Operating System Version

Running the BiosenseSignal SDK requires iOS 16.7 or later. Some indicators might require a higher version of iOS. For additional information regarding the supported indicators see the Indicators Technical Information page.

#### Safari Browser Version

Running the BiosenseSignal SDK requires iOS 16.6 or later.

#### iPhone Devices

The list of iPhone devices compatible with the BiosenseSignal SDK includes iPhone XS and all subsequent iPhone models.

#### iPad Devices

The list of iPad devices compatible with the BiosenseSignal SDK includes iPad (6th generation) and all subsequent models, including the iPad Mini and iPad Pro families.

#### Camera

The BiosenseSignal SDK requires access to the device's camera in order to perform its functions.

## Target Accuracy

The table below indicates the target accuracy levels of the different indicators in this version.

| Indicator | Range | Unit of measurement | Resolution | Estimated Error level |
|-----------|-------|---------------------|------------|----------------------|
| Pulse Rate | 48-180 | bpm | 1 | MAE ≦ 3 |
| Respiration Rate | 8-30 | brpm | 1 | MAE ≦ 3 |
| Mean RRi | 420-1400 | ms | 1 | MAE ≦ 25 |
| Blood Pressure Systolic | 90-160 | mmHg | 1 | MAE ≦ 15 |
| Blood Pressure Diastolic | 50-100 | mmHg | 1 | MAE ≦ 10 |
| Hemoglobin | 9-17 | g/dL | 0.1 | MAE ≦ 1.5 |
| Hemoglobin A1C | 4-8 | % | 0.01 | MAE ≦ 1.1 |

**MAE**: Mean absolute error

## Indicators Technical Information

### Confidence Level

The confidence level of a vital sign indicates the probability of accuracy of the measurement result for that vital sign. The higher the level, the greater the probability of the result accuracy. The confidence level takes into account all the inputs required to calculate a result, including signal quality, any warnings during the measurement duration, and the specific data required for the vital sign, such as the amount of information needed to measure a result.

The confidence level values are: Low, Medium, and High.

The SDK does not report the confidence level for all indicators. If the confidence level of any indicator is not High, it is recommended to take another measurement and adhere better to the Best Practices.

### Indicators Information

The table below indicates the technical information of the supported health indicators. Some indicators are calculated only when the measurement is completed. Their values are reported only when the SDK has gathered enough data to calculate them.

The "Required Measurement Duration" refers to a measurement taken according to the Best Practices" without signal-quality issues. In case of interruptions or mis-detections, the time required for adequate vital signs collection might increase.

| Indicator | The Appearance of Runtime Results Since Measurement Starts (sec) | Required Measurement Duration for a Final Result Calculation (sec) | Has Confidence Level |
|-----------|-------------------------------------------------------------------|---------------------------------------------------------------------|----------------------|
| ASCVD Risk | Final report only | 35 | - |
| ASCVD Risk Level | Final report only | 35 | - |
| Blood Pressure(1) | Final report only | 35 | - |
| Cardiac Workload | Final report only | 35 | Yes |
| Respiration Rate | 23 | 35 | Yes |
| Heart Age | Final report only | 35 | Yes |
| Hemoglobin*(1) | Final report only | 35 | - |
| Hemoglobin A1c*(1) | Final report only | 35 | - |
| High Blood Pressure Risk(1) | Final report only | 35 | - |
| High Fasting Glucose Risk*(1) | Final report only | 35 | - |
| High HbA1c Risk*(1) | Final report only | 35 | - |
| High Total Cholesterol Risk*(1) | Final report only | 35 | - |
| LF/HF Ratio | Final report only | 50 | - |
| Low Hemoglobin Risk*(1) | Final report only | 35 | - |
| Mean Arterial Pressure | Final report only | 35 | Yes |
| Mean RRi | Final report only | 35 | Yes |
| Normalized Stress Index | Final report only | 35 | - |
| Parasympathetic Nervous System Index (PNS Index) | Final report only | 50 | - |
| Parasympathetic Nervous System Zone (PNS Zone) | Final report only | 50 | - |
| Pulse Pressure | Final report only | 35 | Yes |
| Pulse Rate | 8 | 20 | Yes |
| PRQ | Final report only | 35 | Yes |
| RMSSD | Final report only | 35 | Yes |
| RRi | Final report only | 50 | Yes |
| SD1 | Final report only | 50 | - |
| SD2 | Final report only | 50 | - |
| SDNN | Final report only | 35 | Yes |
| Stress Index | Final report only | 35 | - |
| Stress Level | Final report only | 35 | - |
| Sympathetic Nervous System Index (SNS Index) | Final report only | 50 | - |
| Sympathetic Nervous System Zone (SNS Zone) | Final report only | 50 | - |
| Wellness Index | Final report only | 20 | - |
| Wellness Level | Final report only | 20 | - |

\* - These indicators are still under research.

(1) - These indicators are supported only on Android smartphones and tablets as well as on iOS devices with version 17 or later.

## Getting the SDK and a License Key

A valid license key is required to activate the SDK and take measurements. Please contact the support team for getting a valid license key.

## SDK Integration

Once you receive the BiosenseSignal_Web_Sample_X.X.X.zip file, you are ready to add the Web SDK to your application.

Follow the steps below to integrate the SDK into your application.

### 1. Add the BiosenseSignal SDK package to your Project

#### 1.1. Extract the BiosenseSignal_Web_Sample_X.X.X.tgz file.

#### 1.2. Copy the biosensesignal-web-sdk-vX.X.X-X.tgz file into your project folder

#### 1.3. Use npm to install:

```bash
npm install biosensesignal-web-sdk-vX.X.X-X.tgz
```

Or yarn:

```bash
yarn install biosensesignal-web-sdk-vX.X.X-X.tgz
```

#### 1.4. Add the following to your webpack.config.js file plugins:

```javascript
plugins: [
  new CopyPlugin({
    patterns: [
      {
        from: path.resolve(paths.node_modules, '@biosensesignal/web-sdk/dist'),
        to: path.resolve(paths.build),
        globOptions: {
          ignore: ["**/main.*"]
        }
      },
    ],
  }),
] 
```

## Add COOP and COEP Headers to Allow Use of SharedArrayBuffer

### Intro

Our multi-threaded WASM relies on SharedArrayBuffer which is gated behind COOP and COEP headers.

### Goal

Add COOP and COEP headers to allow use of SharedArrayBuffer.

**Note**

SharedArrayBuffer in Safari/iOS is only supported from version 15.2 so make sure your browser is up to date.

### Solution

Our Web SDK uses SharedArrayBuffer which requires cross-origin isolation. Follow these instructions to enable cross-origin isolation:

1. Set the `Cross-Origin-Opener-Policy: same-origin` header on your top-level document. If you had set `Cross-Origin-Opener-Policy-Report-Only: same-origin`, replace it. This blocks communication between your top-level document and its popup windows.

2. Set the `Cross-Origin-Embedder-Policy: require-corp` header on your top-level document. If you had set `Cross-Origin-Embedder-Policy-Report-Only: require-corp`, replace it. This will block the loading of cross-origin resources that are not opted-in.

3. Check that `self.crossOriginIsolated` returns `true` in console to verify that your page is cross-origin isolated.

### Notes for Issues with iframe or Integrations with Third Party Packages

Enabling cross-origin isolation on a local server might be challenging as simple servers do not support sending headers. You can launch Chrome with a command-line flag `--enable-features=SharedArrayBuffer` to enable SharedArrayBuffer without enabling cross-origin isolation. Learn how to run Chrome with a command line flag on respective platforms.

For a production server you could register for an origin trial here: [Delaying the Desktop Chrome change](https://developer.chrome.com/origintrials/#/view_trial/-7123568710593282047)

If you are using cross-origin resources, cross-origin isolation requires explicitly opting in all cross-origin resources. Follow these steps to opt them in:

- On cross-origin resources such as images, scripts, stylesheets, iframes, and others:
  - Set the `Cross-Origin-Resource-Policy: cross-origin` header
  - For same-site resources, set `Cross-Origin-Resource-Policy: same-site` header

- For resources loadable using CORS:
  - Set the `crossorigin` attribute in HTML tags (e.g., `<img src="example.jpg" crossorigin>`)
  - For JavaScript fetch requests, set `request.mode` to `cors`

- For iframes using SharedArrayBuffer:
  - Add `allow="cross-origin-isolated"` to the `<iframe>` tag
  - For nested iframes or worker scripts, apply these steps recursively
  - Set `Cross-Origin-Embedder-Policy: require-corp` header on all iframes and worker scripts

- Handle popup windows:
  - Note that cross-origin popup windows using `postMessage()` won't work with cross-origin isolation
  - Alternative solutions:
    - Move communication to a non-cross-origin isolated document
    - Use HTTP requests instead

### Impact Analysis (Optional)

You can also analyze the impact of cross-origin isolation on your cross-origin resources before enabling by following the instruction given below. Please keep in mind that this is not a mandatory step but it can help you assess which resources will or might be affected by cross origin-isolation.

1. Set `Cross-Origin-Opener-Policy-Report-Only: same-origin` on your top-level document. As the name indicates, this header only sends reports about the impact that COOP: same-origin would have on your site—it won't actually disable communication with popup windows
2. Set up reporting and configure a web server to receive reports
3. Set `Cross-Origin-Embedder-Policy-Report-Only: require-corp` on your top-level document. Again, this header lets you see the impact of enabling COEP: require-corp without actually affecting your site's functioning yet. You can configure this header to send reports to the same reporting server that you set up in the previous step.

### How to Add COOP and COEP Headers for IIS

#### IIS Setup

There are three ways to add COOP and COEP headers in IIS:

1. **Using IIS Manager**

   Follow these instructions and add:

   - Name: `Cross-Origin-Opener-Policy`
   - Value: `same-origin`

   - Name: `Cross-Origin-Embedder-Policy`
   - Value: `require-corp`

2. **In IIS config** - add lines 5 and 6 below in your IIS Config.

   ```xml
   <configuration>
    <system.webServer>
     <httpProtocol>
      <customHeaders>
       <add name="Cross-Origin-Opener-Policy" value="same-origin" /> 
       <add name="Cross-Origin-Embedder-Policy" value="require-corp" />
      </customHeaders> 
     </httpProtocol>
    </system.webServer>
   </configuration>
   ```

3. **Programmatically** - see this [link](https://learn.microsoft.com/en-us/iis/configuration/system.webserver/httpprotocol/customheaders/) for your preferred language

### How to Add COOP and COEP Headers for CloudFront

Enter AWS CloudFront > Function and add modify-headers handler like so:

![cloudfront1](image_cloudfront1.png)

**CloudFront Function Code:**

```javascript
function handler(event) {
   var response = event.response;
   var headers = response.headers;

   /* Set the headers - must be lowercased */
   headers['cross-origin-opener-policy'] = {value: 'same-origin'};
   headers['cross-origin-embedder-policy'] = {value: 'require-corp'};
   headers['cloudfront-function'] = {value: 'true'};
   return response;
}
```

To associate the modify-headers to a specific distributions you have the following two options:

**Option 1:**

In Publish tab above click on "Add association" to add the distribution like so:

![cloudfront2](image_cloudfront2.png)

**Option 2:**

Enter CloudFront > Distributions > Behaviors and click on "Create behavior."

![cloudfront3](image_cloudfront3.png)

Scroll down to "Function Association" and select modify-headers under "Viewer response".

![cloudfront4](image_cloudfront4.png)

Finally, click on "Save changes"

## Quick Start

This quick start guide describes the basic flow for measuring vital signs using the BiosenseSignal SDK.

### Creating a Measurement Session

A session is an interface for performing vital sign measurements.

- Only a single session can be created at any given time. Terminate the previous session before creating a new session.
- A session is intended for a single user. When measuring the vital signs of another user, a new session must be created. See User Information.

The following code can be used to create a session with the relevant parameters:

```typescript
import healthMonitorManager, {
    FaceSessionOptions
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
};

const faceSession = await healthMonitorManager.createFaceSession(options);
```

### Waiting for the Session to Transition into ACTIVE State

The application can receive session state updates by using the OnStateChange callback interface:

```typescript
import { 
    SessionState, 
} from '@biosensesignal/web-sdk';

const onStateChange = useCallback((state: SessionState) => {
    if (state == SessionState.ACTIVE) {
        console.log("Session is ready to start measuring");
    }
}, []);
```

**Note**

For more information on session states and state transitions, see Session State section.

### Starting a Measurement

A measurement can be started by calling the `start()` method:

```typescript
session.start();
```

### Receiving Results During a Measurement

The application can receive instantaneous vital signs values by using OnVitalSign callback interface:

```typescript
import { 
    VitalSigns,
} from '@biosensesignal/web-sdk';

const onVitalSign = useCallback((vitalSign: VitalSigns) => {
    // Handle vital sign result 
}, []);
```

During the measurement, the instantaneous vital sign values are available only for specific vital signs, while the results of all vital signs are received once the measurement has been completed.

**Note**

For more information on receiving and handling vital sign information, see Vital Signs.

### Stopping a Measurement

The measurement is stopped either after the measurement duration (provided in the start function) has ended, or when the stop method is called.

```typescript
session.stop();
```

**Note**

Calling the stop method initiates the calculation of the final results. See Vital Signs

**Important**

When the measurement stops, the session will transition to the STOPPING state.

The STOPPING state reflects that the session has initiated a stopping process that ends when the session state transitions to ACTIVE. At this point, a new measurement can be started.

### Receiving Final Results

The application can receive final vital sign results and vital sign confidence levels by implementing OnFinalResults callsback interface:

```typescript
import { 
    VitalSignsResults,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    // Handle the final results of the measurements
}, []);
```

The final results are computed when the session is in STOPPING state. For more information about receiving and handling the final results, see Vital Signs.

### Terminating a Session

It is recommended to terminate the session whenever the measuring screen is not visible. The `terminate()` method provides a safe and structured way to shut down an active session. It ensures that all allocated resources are released properly while allowing execution to continue immediately.

#### Description

Terminates the active session and releases resources. This function initiates the termination process but does not block execution while waiting for it to complete.

#### Usage

```typescript
session.terminate();
console.log("Session termination initiated.");
```

#### Behavior

- If the session is already terminated, the function does nothing.
- If the session is active, it starts the termination process asynchronously.
- Non-blocking behavior: The function returns immediately, even if cleanup is still in progress.

#### Expected Developer Behavior

✅ Call `terminate()` when the session is no longer needed.

✅ Do not assume immediate termination; if logic depends on session termination, implement necessary wait logic before proceeding.

✅ Handle any warnings or logs to monitor the termination process.

❌ Do not attempt to restart a terminated session. A new session must be created instead.

#### Example Usage

```typescript
session.terminate();
console.log("Session termination initiated.");
```

#### Ensuring Completion Before Proceeding

If subsequent actions depend on session termination, listen to the OnStateChange callback and make sure the session is terminated before proceeding:

```typescript
import { 
    SessionState, 
} from '@biosensesignal/web-sdk';

const onStateChange = useCallback((state: SessionState) => {
    switch (state) {            
        case SessionState.TERMINATED:
            console.log("Session is terminated");
            break;
    }
}, []);
```

#### Session Lifecycle: Termination Flow

1. Developer calls `terminate()` → Session enters the termination phase.
2. Internal cleanup begins (asynchronously) → Resources like the camera and processing units are released.
3. Session state updates to TERMINATED once the cleanup is complete.
4. Further API calls dependent on an active session will fail.

#### Frequently Asked Questions

❓ **How can I know when termination is complete?**

Since `terminate()` is non-blocking, you should not assume immediate completion. Instead: Monitor session state reaches the `SessionState.TERMINATED` state. Listen to system logs for confirmation.

❓ **What happens if I call terminate() twice?**

Calling `terminate()` on an already terminated session has no effect.

❓ **Will terminate() throw errors?**

No, `terminate()` handles errors internally. If error handling is required, monitor session state.

#### Conclusion

- Use `terminate()` to properly close a session.
- Expect non-blocking behavior – termination runs in the background.
- Check session state before and after termination if required.

## Session State

A measuring session is always in a "state". The session transitions between possible states either by following an API action called by the application, or via internal logic that is intended to prepare the session for performing measurements. The session state diagram appears in the figure below.

### Session States

#### State Diagram

![Session State Diagram](session_state_diagram.png)

The table below provides a description of each session state:

| State Name | State Definition |
|------------|------------------|
| INIT | The session is in its initial state, performing initialization actions. Please wait until you receive the message indicating that the session is in the ACTIVE state before starting to measure vital signs or before calling any session APIs. |
| ACTIVE | The session is now ready to be started. The application can display the camera preview, if using face measurements. Refer to the Creating a Preview page for detailed instructions. |
| MEASURING | The session is processing the data and calculating vital signs. For information on the handling of instantaneous vital signs, please refer to the Vital Signs page. |
| STOPPING | The session has been stopped, and the measurement results are being calculated. For information on the handling the final results, please see the Vital Signs page. |
| TERMINATED | The session has been gracefully terminated, and a new session can now be initiated. |

### Session State Transitions

The table below describes the actions that cause a transition between the states:

| State | Next State | Trigger |
|-------|------------|---------|
| INIT | ACTIVE | Once all initialization actions are completed, the session transitions to the ACTIVE state. |
| ACTIVE | MEASURING | Calling the `start()` method causes the session to transition to the MEASURING state. |
| MEASURING | STOPPING | The session will transition to the STOPPING state under the following circumstances:<br>• The measurement ends gracefully either because it reached the defined duration or due to a manual invocation of the `stop()` method.<br>• The measurement was stopped due to an error. Refer to the Alerts section for more information. |
| STOPPING | ACTIVE | The SDK has finished performing the vital sign calculations. |
| ACTIVE | TERMINATED | By calling the `terminate()` method, the session transitions to the TERMINATED state. |

**Note**

The STOPPING state is a 'transition state' that end automatically after a short period. Do not call any session methods while the session is in transition.

### Receiving Session State Updates

The application can receive session state updates by using OnStateChange callback:

```typescript
import { 
    SessionState, 
} from '@biosensesignal/web-sdk';

const onStateChange = useCallback((state: SessionState) => {
    // Receive session state updates
}, []);
```

### Handling State Transitions

The code below is a simple example for handling session transitions updates by using OnStateChange callback:

```typescript
import { 
    SessionState, 
} from '@biosensesignal/web-sdk';

const onStateChange = useCallback((state: SessionState) => {
    switch (state) {
        case SessionState.INIT:
            console.log("Session is initializing and NOT ready");
            break;
        case SessionState.ACTIVE:
            console.log("Session is ready to start measuring");
            break;
        case SessionState.MEASURING:
            console.log("Session is measuring vital signs");
            break;
        case SessionState.STOPPING:
            console.log("Session is stopping the measuring of vital signs");
            break;
        case SessionState.TERMINATED:
            console.log("Session is terminated");
            break;
    }
}, []);
```

## Enabled Vital Signs

Enabled Vital Signs is a map of vital signs that are set to be measured in the course of a specific session.

### Receiving Enabled Vital Signs

The application can receive information regarding the enabled vital signs by using onEnabledVitalSigns callback (under the LicenseInfo interface):

```typescript
import { 
    EnabledVitalSigns
} from '@biosensesignal/web-sdk';

const onEnabledVitalSigns = useCallback((vitalSigns: EnabledVitalSigns) => {
    // Receive the enabled vital signs for the session
}, []);
```

### Checking if a Vital Sign is Enabled

The following code can be used to determine the supported vital signs:

```typescript
import { 
    EnabledVitalSigns
} from '@biosensesignal/web-sdk';

const onEnabledVitalSigns = useCallback((enabledVitalSigns: EnabledVitalSigns) => {
    // Checking if pulse rate is enabled
    console.log(`Is pulse rate enabled: ${enabledVitalSigns.isEnabledPulseRate}`)
}, []);
```

## User Information

For the calculation of the ASCVD Risk and Heart Age indicators, the SDK requires receiving the user information with the details of the user taking the measurement. If this information is not provided to the SDK, these indicators will not be calculated.

The user information consists of these fields:

- Sex (as classified at birth) [UNSPECIFIED / MALE / FEMALE]
- Age [years]
- Weight [Kilograms]
- Height [Centimeters]
- Smoking Status [UNSPECIFIED / SMOKER / NON_SMOKER]

The application can provide the user information as part of the session initialization.

In the following example, the sex is female, the age is 35 years, the weight is 65 kilograms, the height is 165 centimeters and the smoking status is smoker. In the example the measurement session is a face session, but it can be used in a PPG Device session as well.

```typescript
import healthMonitorManager, {
    FaceSessionOptions,
    Sex,
    SmokingStatus,
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
    userInformation: {sex: Sex.MALE, age: 35, weight: 75, height: 165, smokingStatus: SmokingStatus.NON_SMOKER}, 
};

const faceSession = await healthMonitorManager.createFaceSession(options);
```

If any of the user information parameters is unknown, it is recommended to provide the known parameters and to leave the others 'null'/'UNSPECIFIED'.

**Important**

When a session is created with user information, all measurements performed during that session use the same user information. Therefore, a new session must be created in order to update the user information.

## Creating a Preview for the User

As part of your application, it is recommended to present the user with a camera preview, as it helps the user to center his/her face on the camera screen. The following code can be used to create a preview and present it to the user.

**Note**

Unlike native SDKs, the camera preview is rendered directly on the Video element by the browser, rather than by the BiosenseSignal SDK.

### 1. Create a video element in your web application

```typescript
import styled from 'styled-components';
import { mirror } from '@biosensesignal/common/src/style/mirror';

const Video = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  object-fit: cover;
  height: 100%;
  ${mirror};
  @media (max-width: 1000px) and (orientation: landscape) {
    height: 100%;
  }
`;
 
const videoElement = useRef<HTMLVideoElement>(null);

return (
    <>
        <Video
            ref={videoElement}
            id="video"
            muted={true}
            playsInline={true}
        />
    </>
);
```

### 2. Pass the video element to the SDK when creating a session

```typescript
import healthMonitorManager, {
    FaceSessionOptions,
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = { 
    input: videoElement.current, 
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
};

const faceSession = await healthMonitorManager.createFaceSession(options);
```

## Device Orientation

The SDK supports the setting of the device orientation in face measurement sessions. The orientation is determined by the application during the session creation and can be set according to the current device orientation at the time the session is created, or according to the preferred UI orientation.

The orientation is defined as the position of the native base of the device (also commonly known as the charging port location), relative to the device's current rotation. For example, if the device is rotated so its base is to the left of the user, then the orientation is defined as LANDSCAPE_LEFT.

Upon session creation, if no specific orientaion is requested, the legal orientation is the device's orientation once 'start' is being called.

In the following example, the device orientation is LANDSCAPE_LEFT:

```typescript
import healthMonitorManager, {
    FaceSessionOptions,
    DeviceOrientation
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = {  
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
    orientation: DeviceOrientation.PORTRAIT, 
};

const faceSession = await healthMonitorManager.createFaceSession(options);
```

The SDK defines the possible device orientations as an enum:

```typescript
export enum DeviceOrientation {
  PORTRAIT,            
  LANDSCAPE_LEFT,      
  LANDSCAPE_RIGHT    
}
```

When the device orientation differs from the requested orientation during a measurement, then:

- The SDK will indicate that the image orientation is incorrect as part of Image Validity.
- Images with an incorrect orientation will not be processed by the SDK.

## Image Validity

While the basic instruction for taking a measurement is simple—just look at the camera and start the measurement—there are a few guidelines that the user must follow to ensure accurate measurement results. These guidelines are listed in the best practices for taking a measurement.

During the measurement, the SDK assists the user in following these guidelines. It validates each camera image and updates the ImageValidity with any detected deviations from the guidelines.

An image is considered valid if the SDK did not detect any violations to the best practices for taking a measurement. If the image is not considered valid the SDK reports the reason for invalidating the image.

The conditions in the table below will invalidate the image for processing by the SDK.

| Name | Meaning |
|------|---------|
| VALID | The image is valid. |
| INVALID_DEVICE_ORIENTATION | The device orientation is unsupported for the session. |
| INVALID_ROI | The SDK cannot detect the user's face. |
| TILTED_HEAD | The user's face is not facing directly towards the camera. |
| FACE_TOO_FAR | Currently not supported in Web |
| UNEVEN_LIGHT | The light on the user's face is not evenly distributed. |

Image validity verification is reported as part of OnImageData callback interface:

```typescript
import healthMonitorManager, { 
    FaceSessionOptions,
    ImageValidity
} from '@biosensesignal/web-sdk';

const onImageData = useCallback((imageValidity: ImageValidity) => {
    let message: string;
    if (imageValidity != ImageValidity.VALID) {
        switch (imageValidity) {
        case ImageValidity.INVALID_DEVICE_ORIENTATION:
            message = 'Unsupported Orientation';
            break;
        case ImageValidity.TILTED_HEAD:
            message = 'Head Tilted';
            break;
        case ImageValidity.FACE_TOO_FAR: // Placeholder, currently not supported
            message = 'You Are Too Far';
            break;
        case ImageValidity.UNEVEN_LIGHT:
            message = 'Uneven Lighting';
            break;
        case ImageValidity.INVALID_ROI:
        default:
            message = 'Face Not Detected';
        }
        console.log(`ImageValidity = ${message}`);
    } 
}, []);

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData 
};

const faceSession = await healthMonitorManager.createFaceSession(options);
```

**Note**

It is possible that an image is not valid due to several reasons. For example, when a user is too far and the light is not evenly distributed on his face.

## Measurement Guidance

For precise face measurements with the BiosenseSignal SDK, the user is required to follow the image validation guidance. The SDK guides users to adhere to measurement guidelines, specifying exceptions in the Image Validity information. For detailed information on image validity, see the Image Validity page.

The SDK notifies the application about the image validity of each frame. It is highly recommended to prompt the user for any reported exception and instruct them to adhere to the best practices for taking a measurement. Utilize the sample application code for implementing image validity prompt notifications.

The SDK supports configuring whether to enable strict measurement guidance. This setting determines whether the SDK processes all video images when a face is detected (default behavior) or only processes images with valid image validity. In the following example, the strict measurement guidance is set to true:

```typescript
import healthMonitorManager, {
    FaceSessionOptions
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
    strictMeasurementGuidance: true, 
};

const faceSession = await healthMonitorManager.createFaceSession(options);
```

### Strict Measurement Guidance Set to False (Default)

When set to false (default SDK behavior), the SDK processes all video images as long as a face is detected (ROI image data exists).

### Strict Measurement Guidance Set to True

When set to true, the SDK will process only valid face images to ensure increased precision.

If a sequence of invalid images persists for over 0.5 seconds, the SDK warns of a significant gap. In addition to affecting the precision of the results, these gaps may also cause delays in the appearance of vital signs and impact confidence in the final results.

On a third occurrence of a 0.5-second gap, the SDK throws an error, stopping the session without final results. This behavior statistically improves measurement precision and encourages users to follow measurement guidance more effectively.

The table below summarizes the differences between setting Strict Measurement Guidance to true and false.

| Strict Measurement Guidance | False (default) | True |
|--------------------------------|----------------|------|
| Report Image Validity Info | Yes | Yes |
| Images with invalid Image Validity | Processed by SDK, as long as the face is detected (ROI image data exists) | Not processed by SDK |
| Periods over 0.5 sec with invalid Image Validity but with ROI image data | No warning is issued | Issues a warning when the user complies again with the guidelines |
| Impact on precision | Normal precision | Increased precision |

## Alerts

Alerts are messages that are sent from SDK to the application when a malfunction occurs. There are two alert categories:

- **Warning** - indicates a minor, temporary issue that does not interrupt the current operation.
- **Error** - indicates a severe incident that cannot be resolved by the SDK and results in the termination of any in-progress measurement.

The alert interface contains a numeric code that represents a specific issue.

The reasons for warnings and errors can vary - from accuracy problems to incorrect API usage, to license issues or even device-related errors.

### Receiving Alerts

In the event that an alert is received, it is recommended to display the numeric alert code in the UI for reference. If the alert is related to a misuse of the SDK or to improper measurement conditions, and the issue persists, please contact the support team.

The application can receive alerts using OnError and OnWarning callback interfaces.

```typescript
import { 
    AlertData
} from '@biosensesignal/web-sdk';

const onError = (errorData: AlertData) => {
    // Receive errors
};

const onWarning = (warningData: AlertData) => {
    // Receive warnings
};
```

### Warnings

A warning indicates a minor, temporary issue. While a warning does not interrupt the measurement, it is encouraged to guide the user on how to avoid such warnings in the future, and to follow the best practices for taking a measurement.

```typescript
import { 
    AlertData
} from '@biosensesignal/web-sdk';

// Handle warnings
const onWarning = (warningData: AlertData) => {
    console.log(`Warning: ${warningData.code}`);
};
```

### Errors

An error indicates a severe incident from which the SDK cannot recover. Some of the common reasons for errors include network issues, CPU overload, insufficient lighting, and sub-standard environmental conditions. See the Alerts List for details on each error.

When an error occurs during the measurement, the SDK will terminate any ongoing measurement and will refrain from sending vital sign results to the application. Additionally, the session state will transition from MEASURING to STOPPING (see Session States).

#### Internal Errors

If an invalid SDK internal state occurs during the operation of the SDK, an internal error will be returned to the application. The internal error number may not appear in the Alerts List page. As mentioned earlier, it is advisable to display the error number in the user interface for reference.

If an internal error is received, please report it to the support team. Include the error code you received and provide a detailed description of the problem.

```typescript
import { 
    AlertData
} from '@biosensesignal/web-sdk';

// Handle error
const onError = (errorData: AlertData) => {
    console.log(`Error: ${errorData.code}`);
};
```

## Alerts List

This page contains a list of public SDK alerts. Some of them can be received via OnError and OnWarning callback interfaces, while others can be received as a MonitorError.

You can reference these alerts in your code using the type AlertData.

**Note**

The alerts list JSON file is available to download here: [alerts.json](alerts.json). To save the file, right-click the link and choose the option to download.

### DEVICE_CODE_MINIMUM_OS_VERSION_ERROR

**Code:** 8

**Cause:** The device's operating system version is lower than the minimum version required to run the SDK.

**Solution:** Upgrade the device operating system or use another device.

### DEVICE_CODE_CLOCK_SKEW_ERROR

**Code:** 17

**Cause:** Severe clock skew detected

**Solution:** The user should verify that the device date, time and timezone are set correctly. It is recommended to enable 'Set automatically' in the device settings.

### DEVICE_CODE_MINIMUM_BROWSER_VERSION_ERROR

**Code:** 18

**Cause:** The browser version is older than the minimum required version.

**Solution:** Upgrade the device's browser or use another browser.

### CAMERA_CODE_NO_CAMERA_ERROR

**Code:** 1001

**Cause:** The session.start() command was called, but the device has no camera with the required specifications.

**Solution:** The camera must support a resolution of 640x480 at 30FPS. The user should verify that the device camera works properly.

### CAMERA_CODE_CAMERA_OPEN_ERROR

**Code:** 1002

**Cause:** Could not operate the camera.

**Solution:** The user should verify that the device camera works properly and try again. If the problem persists, the user should restart the application.

### CAMERA_CODE_CAMERA_MISSING_PERMISSIONS_ERROR

**Code:** 1005

**Cause:** The application does not have permission to access the camera.

**Solution:** The user should grant the web page permission to use the camera.

### CAMERA_CODE_UNEXPECTED_IMAGE_DIMENSIONS_WARNING

**Code:** 1501

**Cause:** The images received from the camera have a different resolution than the requested resolution.

**Solution:** Instruct the user to retry taking the measurements. If the problem persists, then the device is probably malfunctioning, or does not support VGA resolution. The user should be instructed to use a different device. Although this is just a "warning" alert, and the measurement continues, the accuracy of the measurement may be impacted by the unexpected resolution.

### LICENSE_CODE_ACTIVATION_LIMIT_REACHED_ERROR

**Code:** 2002

**Cause:** No more devices can be used with your license.

**Solution:** Contact the sales team to increase the number of device authorizations in your license.

### LICENSE_CODE_METER_ATTRIBUTE_USES_LIMIT_REACHED_ERROR

**Code:** 2003

**Cause:** No more measurements are allowed for the provided license.

**Solution:** Contact the sales team to increase the number of measurements in your license.

### LICENSE_CODE_AUTHENTICATION_FAILED_ERROR

**Code:** 2004

**Cause:** Several issues might cause this error: clock skew detected, the SDK was unable to authenticate the license, a bad token was received from the license server

**Solution:** The user should take the following actions: Check the internet connection. Set the device time correctly. Verify that the device has sufficient storage.

### LICENSE_CODE_INVALID_LICENSE_KEY_ERROR

**Code:** 2007

**Cause:** The provided license key is invalid.

**Solution:** Use the license key provided by the support team. If the problem persists, contact the support team.

### LICENSE_CODE_REVOKED_LICENSE_ERROR

**Code:** 2010

**Cause:** The license was revoked.

**Solution:** Contact the customer support team.

### LICENSE_CODE_INTERNAL_ERROR_9

**Code:** 2016

**Cause:** SSL error. Unable to authenticate the license server response.

**Solution:** The user should check the device's local time, internet connection, try a different network, or try again later.

### LICENSE_CODE_LICENSE_EXPIRED_ERROR

**Code:** 2017

**Cause:** The license has expired.

**Solution:** Contact the customer support team.

### LICENSE_CODE_LICENSE_SUSPENDED_ERROR

**Code:** 2018

**Cause:** The license is suspended.

**Solution:** Contact the customer support team.

### LICENSE_CODE_NETWORK_ISSUES_ERROR

**Code:** 2024

**Cause:** No internet connection.

**Solution:** The user should check the internet connection and try again.

### LICENSE_CODE_SSL_HANDSHAKE_ERROR

**Code:** 2025

**Cause:** SSL certificate security warning.

**Solution:** The user should check the device's local time, internet connection, try a different network, or try again later.

### LICENSE_CODE_INPUT_LICENSE_KEY_EMPTY_ERROR

**Code:** 2032

**Cause:** No license key was provided to the SDK.

**Solution:** Initiate the SDK with a valid license key, provided by the support team.

### LICENSE_CODE_INPUT_PRODUCT_ID_ILLEGAL_ERROR

**Code:** 2034

**Cause:** An invalid product ID was provided.

**Solution:** The product ID must be null when establishing a session.

### LICENSE_CODE_CANNOT_OPEN_FILE_FOR_READ_ERROR

**Code:** 2035

**Cause:** The SDK cannot read from the file system, or a file may be corrupted.

**Solution:** Instruct the user to check the installation integrity.

### LICENSE_CODE_MONTHLY_USAGE_TRACKING_REQUIRES_SYNC_ERROR

**Code:** 2036

**Cause:** The SDK failed to authenticate with the license server as required by the license type.

**Solution:** Instruct the user to check the internet connection and try again.

### LICENSE_CODE_SSL_HANDSHAKE_DEVICE_DATE_ERROR

**Code:** 2037

**Cause:** SSL certificate security warning.

**Solution:** The user should check the device's local time, internet connection, try a different network, or try again later.

### LICENSE_CODE_SSL_HANDSHAKE_CERTIFICATE_EXPIRED_ERROR

**Code:** 2038

**Cause:** SSL certificate security warning.

**Solution:** The user should check the device's local time, internet connection, try a different network, or try again later.

### LICENSE_CODE_MIN_SDK_ERROR

**Code:** 2039

**Cause:** The SDK version is too old to be used with this license.

**Solution:** Upgrade to the latest SDK version or contact the support team.

### LICENSE_CODE_NETWORK_TIMEOUT_ERROR

**Code:** 2042

**Cause:** Network timeout reached for a single call

**Solution:** Advise the user to try the following steps: verify the internet connection speed, restart the application, wait briefly, attempt using another network, or try again later. If the issue persists, please contact our support team.

### MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_ERROR

**Code:** 3003

**Cause:** The face was not detected for a period of over 0.5 seconds several times.

**Solution:** The user should ensure that the face remains still during the measurement and follow the best practices provided by the provider for taking accurate measurements.

### MEASUREMENT_CODE_INVALID_RECENT_DETECTION_RATE_ERROR

**Code:** 3004

**Cause:** More than two periods of multiple frame losses were detected during the measurement. This issue may occur if the device is overloaded and unable to process video frames in real-time, or if there is insufficient lighting on the user's face.

**Solution:** For the User: - Ensure the device is not overloaded, overheated, or running low on resources. - Improve the lighting on your face to enhance SDK performance. - If the problem persists, close other applications or services, or restart the device. - Follow best practices for taking a measurement and provide guidance on optimizing device performance. For the Application Developer: - Avoid using debugging or developer tools or performing intensive logging during the measurement.

### MEASUREMENT_CODE_LICENSE_ACTIVATION_FAILED_ERROR

**Code:** 3006

**Cause:** The license activation failed.

**Solution:** The user should check the device's internet connection, and should check that no invalid proxy configuration is used. If the problem persists, the user should contact the support team.

### MEASUREMENT_CODE_INVALID_MEASUREMENT_AVERAGE_DETECTION_RATE_ERROR

**Code:** 3008

**Cause:** The average frame rate is significantly lower than expected. This issue may result from device overloading or insufficient lighting on the user's face.

**Solution:** For the User: Close resource-intensive applications to free up device resources. Ensure the device is not busy, overheated, or overloaded. Allow the device to cool down and retry the measurement. If the problem persists, consider using another device. For the Application Developer: Verify that the SDK implementation does not impose excessive demands on the device. Provide users with clear instructions to optimize their device performance and follow best practices for taking a measurement. Ensure your application minimizes background activity during SDK operations.

### MEASUREMENT_CODE_TOO_MANY_FRAMES_INORDER_ERROR

**Code:** 3009

**Cause:** Multiple consecutive frames were received in incorrect timestamp order. This error occurs if warning 3506 is issued multiple times.

**Solution:** The user should rerun the measurement.

### MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_WARNING

**Code:** 3500

**Cause:** A face was not detected for a period of over 0.5 seconds.

**Solution:** The instantaneous vital signs should not be displayed to the user for a few seconds until the algorithms overcome the detection issues. The user must follow the best practices for taking a measurement.

### MEASUREMENT_CODE_INVALID_RECENT_FPS_RATE_WARNING

**Code:** 3505

**Cause:** Camera FPS is degraded and may affect the measurement quality.

**Solution:** The user should make sure to follow the best practices for taking a measurement.

### MEASUREMENT_CODE_MEASUREMENT_MISPLACED_FRAME_WARNING

**Code:** 3506

**Cause:** A frame was received in incorrect timestamp order.

**Solution:** The user should proceed with the measurement.

### VITAL_SIGN_CODE_BLOOD_PRESSURE_PROCESSING_FAILED_WARNING

**Code:** 4505

**Cause:** Failure to calculate blood pressure in this measurement. This warning does not impact other vital sign measurements. The failure may have been caused by corrupted installation files.

**Solution:** Blood pressure will not be calculated for this measurement session. The other vital sign results will be presented. The user can retry the measurement. If the problem persists, the user should reinstall/repair the app.

### VITAL_SIGN_CODE_MEASURING_WITH_NO_ENABLED_VITAL_SIGNS_WARNING

**Code:** 4506

**Cause:** No vital signs were processed as part of this measurement.

**Solution:** This warning is issued when the license does not support the calculation of any vital signs, or when the SDK cannot access license information. The user should check the internet connection and try another measurement.

### SESSION_CODE_ILLEGAL_START_CALL_ERROR

**Code:** 6004

**Cause:** A session start call was made when the session is not in READY state

**Solution:** Wait for session state to become READY before calling start.

### SESSION_CODE_ILLEGAL_STOP_CALL_ERROR

**Code:** 6005

**Cause:** A session stop call was made when the session is not in PROCESSING state

**Solution:** Call stop only when session is processing.

### INITIALIZATION_CODE_INVALID_PROCESSING_TIME_ERROR

**Code:** 7002

**Cause:** An invalid session time was provided when creating a session.

**Solution:** Use a valid session time. The valid session time range is between 20-180 seconds.

### INITIALIZATION_CODE_INVALID_LICENSE_FORMAT

**Code:** 7005

**Cause:** The provided license key is either empty or its format is invalid.

**Solution:** Check the SDK license key provided by the support team. Ensure it is not empty and follows a valid format - avoid including spaces, newlines, or special characters.

### INITIALIZATION_CODE_SDK_LOAD_FAILURE

**Code:** 7006

**Cause:** The SDK fails to load the algorithmic binary file (a.wasm.gz).

**Solution:** Make sure a.wasm.gz is white listed and is deliverable by the server.

### INITIALIZATION_CODE_UNSUPPORTED_USER_WEIGHT

**Code:** 7007

**Cause:** The weight submitted by the user is not supported. The supported weight range is between 40 to 200 kilograms.

**Solution:** The user should either submit a weight within the supported range, or not specify a weight at all.

### INITIALIZATION_CODE_UNSUPPORTED_USER_AGE

**Code:** 7008

**Cause:** The age submitted by the user is not supported. The supported age range is between 18 to 110 years.

**Solution:** The user should either submit an age within the supported range or not specify an age at all.

### INITIALIZATION_CODE_CONCURRENT_SESSIONS_ERROR

**Code:** 7009

**Cause:** Trying to create a new session before terminating the previous session.

**Solution:** The previous session should be terminated before establishing a new one.

### INITIALIZATION_CODE_UNSUPPORTED_USER_HEIGHT

**Code:** 7012

**Cause:** The height submitted by the user is not supported. The supported height range is between 130 to 230 centimeters.

**Solution:** The application should specify a height value within the supported range or not specify a height at all.

### INITIALIZATION_CODE_MEMORY_ALLOCATION_ERROR

**Code:** 7013

**Cause:** The memory allocation failed due to an internal bug in Emscripten when running on iOS 17 or earlier. This is caused due to several invocations of the SDK in the same tab one after the other, e.g. when 'refreshing' the page several times. For additional information see https://bugs.webkit.org/show_bug.cgi?id=222097#c17.

**Solution:** To mitigate this, it is recommended that each measurement be initiated in a new tab. If this issue arises, advise the user to restart the browser or open the page in a new tab (provide a clickable link while preserving the context) and continue as normal. This Webkit issue has been resolved in iOS 18. For further information, refer to https://bugs.webkit.org/show_bug.cgi?id=222097#c17 and https://bugs.webkit.org/show_bug.cgi?id=255103.

### INITIALIZATION_CODE_INITIAL_MEMORY_ALLOCATION_ERROR

**Code:** 7014

**Cause:** Memory allocation failure

**Solution:** Instruct the user to close all other applications and active browser tabs, wait for a few seconds and try again. If the problem still persists it means the device is too weak to run the SDK.

### INITIALIZATION_CODE_BROWSER_NOT_SUPPORTING_SHARED_ARRAY_BUFFER_ERROR

**Code:** 7015

**Cause:** The user's browser does not support SharedArrayBuffer.

**Solution:** Instruct the user to upgrade the browser's version or use another browser/device.

### INITIALIZATION_MEMORY_CONSUMPTION_WARNING

**Code:** 7501

**Cause:** The application is attempting to invoke the SDK in a tab where it has been invoked before. Due to an internal bug in Emscripten for iOS17 and below there is a potential memory leak that might prevent running the SDK properly.

**Solution:** Recurring SDK invocations within the same tab (e.g., refreshing the page multiple times) can result in a memory leak, which may eventually lead to memory allocation failures. To mitigate this, it is recommended that each measurement be initiated in a new tab. If this issue arises, advise the user to restart the browser or open the page in a new tab (provide a clickable link while preserving the context) and continue as normal. This Webkit issue has been resolved in iOS 18. For further information, refer to Webkit https://bugs.webkit.org/show_bug.cgi?id=222097#c17 and Webkit https://bugs.webkit.org/show_bug.cgi?id=255103.

## License

The BiosenseSignal SDK uses a licensing mechanism to protect against unauthorized usage, and to grant measurement permissions specified in the license agreement.

### License Types

In Web, the only available license type is **Session**: Sessions

### Using the License Key

A valid license key must be provided in order to initiate a measurement session or activate a user.

```typescript
import healthMonitorManager, {
    FaceSessionOptions
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,  
});

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
};

const faceSession = await healthMonitorManager.createFaceSession(options);
```

**WARNING**

The application must secure the license key and prevent it from being exposed to 3rd parties.

### Receiving License Updates

The SDK sends a LicenseInfo data that contains:

- **Offline Measurements Info** - An object with information about offline measurements
- **Activation ID** - A string with the license activation id.

The application can receive license-related messages by implementing the LicenseInfo callback interface:

```typescript
import { 
    OfflineMeasurements
} from '@biosensesignal/web-sdk';
  
const onOfflineMeasurement = useCallback(
  (offlineMeasurements: OfflineMeasurements) => {
      console.log(`License Offline Measurements: 
          ${offlineMeasurements.totalMeasurements}/
          ${offlineMeasurements.remainingMeasurements}`);
  },
  [],
);

const onActivation = useCallback((activationId: string) => {
    console.log(`License Activation ID: ${activationId}`)
}, []);
```

### License Server Network Routing

The SDK connects with the license server at [https://licensing-api.biosensesignal.com](https://licensing-api.biosensesignal.com). The traffic to this server is routed through a Cloudflare service. Since Cloudflare is inaccessible in certain countries, a custom workaround is available for these regions. Contact our customer support if the license server is unreachable in your target territories.

## Sessions License

When sessions licensing is employed, the license server provides the SDK with an allocated number of measurements (or "quota") as specified in the license agreement.

The SDK requires an internet connection, allowing it to communicate with the license server in order to verify the license validity.

### Measurement Consumption

Upon calling the `start` method the SDK instructs the license server to consume a single measurement and changes the session state from ACTIVE to MEASURING. If no measurements are available on the server, then the process will be aborted and the SDK will send an error and the session will transition back to STOPPING and ACTIVE state (see Session State).

**Note**

The SDK shares the activation ID with the application also when using a sessions license. However, the activation quota is unlimited when using this type of license.

### Time Left for License Timer

To support cases where a session was consumed from the license quota, but the measurement failed for any reason like incoming phone call, the application can perform repeated measurements without consuming additional sessions from the license. A "session timeframe" timer is triggered when starting the first measurement. The timer is set initially to 9 minutes (540 seconds). During this timeframe the application can perform repeated measurements without consuming additional sessions from the license.

The following code can be used to update the device user interface or to decide if the user is still entitled to repeat a measurement. The Offline Measurements End Time is the time remaining on the timer. When this timer expires, then a starting new measurement will result consuming a new session from the license quota.

The application can receive the timer end time by implementing `onOfflineMeasurement` as part of LicenseInfo:

```typescript
import { 
    OfflineMeasurements
} from '@biosensesignal/web-sdk';
  
const onOfflineMeasurement = useCallback(
  (offlineMeasurements: OfflineMeasurements) => {
      console.log(`License Offline Measurements: 
          ${offlineMeasurements.totalMeasurements}/
          ${offlineMeasurements.remainingMeasurements}`);
  },
  [],
);
```

### Remaining Measurements and Offline Measurements

**Note**

This section is relevant only for licenses with a custom configuration of more than 1 offline measurement, as configured in the license server. This configuration requires the assistance of the support team.

By default, the licensing mechanism is configured to consume 1 measurement from the license's quota on the server upon calling the session start method. Some licenses are configured to fetch additional measurements from the server and store them locally on the SDK for future use. This allows the application to start additional sessions even if the device has no live internet access.

The following parameters indicate the status of the locally stored measurements:

- **Offline Measurements** - The total number of measurements that can be stored locally on the device.
- **Remaining Measurements** - The total number of measurements that were already downloaded from the server to the SDK and can be used in future sessions.

The application can receive the information regarding offline measurements by using LicenseInfo callback interface:

```typescript
import { 
    OfflineMeasurements
} from '@biosensesignal/web-sdk';
  
const onOfflineMeasurement = useCallback(
  (offlineMeasurements: OfflineMeasurements) => {
      console.log(`License Offline Measurements: 
          ${offlineMeasurements.totalMeasurements}/
          ${offlineMeasurements.remainingMeasurements}`);
  },
  [],
);
```

## Vital Signs

The BiosenseSignal SDK measures a comprehensive range of vital signs and physiological indicators. For the sake of brevity, we refer to the set of physical indicators calculated by the SDK as "vital signs". The vital sign results provided at the end of the measurement include both the vital sign values and the vital sign confidence levels.

Information on the supported vital signs can be found on the BiosenseSignal Vital Signs and Health Indicators Information document.

**Note**

In order to receive a result for a specific vital sign, the vital sign must be enabled. Information on enabled vital signs can be found on the Enabled Vital Signs page.

The vital sign values measured by the SDK are reported at two stages of the measurement:

- **Instantaneous results** - available during the measurement.
- **Final results** - available upon successful completion of a measurement.

### Instantaneous Vital Signs Values

Instantaneous vital sign values are provided as soon as they become available. To receive instantaneous vital sign results, the application can use the useVitalsSigns hook:

```typescript
import { 
    VitalSigns,
} from '@biosensesignal/web-sdk';

const onVitalSign = useCallback((vitalSign: VitalSigns) => {
    // Handle vital sign result 
}, []);
```

Instantaneous vital sign values can be received for the following vital signs during the measurement:

- Pulse Rate
- Respiration Rate

### Final Results

Final vital sign results are calculated at the end of a measurement.

The application can receive the final vital signs results by using the useFinalResults hook:

```typescript
import { 
    VitalSignsResults,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    // Handle the final results of the measurements
}, []);
```

## Confidence Level

The confidence level of a vital sign indicates the probability of accuracy of the measurement result for that vital sign. The higher the level, the greater the probability and accuracy of the result. The confidence level takes into consideration all the inputs required to calculate a result, including signal quality, any warnings during the measurement duration, and the specific data required for the vital sign, such as the amount of information needed to measure a result. The confidence level values are LOW, MEDIUM, HIGH, and UNKNOWN. The accuracy report refers to results in which the confidence level is HIGH.

The SDK Accuracy Targets are available in SDK Accuracy Targets.

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

The application can receive the ASCVD Risk result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    ASCVDRiskSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const ascvdRisk = results.ascvdRisk as ASCVDRiskSign;           
    if (ascvdRisk?.value != null) {
        console.log(`ASCVD Risk: ${ascvdRisk.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## ASCVD Risk Level

The ASCVD Risk Level value is sent as part of the final results and can have one of the following values:

- **Low (< 10%)**: Indicates minimal estimated cardiovascular risk
- **Medium (10–20%)**: Indicates medium estimated cardiovascular risk
- **High (> 20%)**: Indicates high estimated cardiovascular risk

The ASCVD Risk Level indicator is based on the ASCVD Risk result. If any details are missing from the User Information, the ASCVD Risk Level will not be calculated. For more information on User Information, see the User Information page.

The application can receive the ASCVD Risk Level result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    ASCVDRiskLevelSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const ascvdRiskLevel = results.ascvdRiskLevel as ASCVDRiskLevelSign;           
    if (ascvdRiskLevel?.value != null) {
        console.log(`ASCVD Risk Level: ${ascvdRiskLevel.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Blood Pressure

The Blood Pressure result includes Systolic and Diastolic values and both values are sent as part of the final results.

The application can receive the Blood Pressure result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    BloodPressureSign,
    BloodPressureValue,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const bloodPressure = results.bloodPressure as BloodPressureSign;
    if (bloodPressure?.value != null) {
        const bloodPressureValue = bloodPressure.value as BloodPressureValue;
        console.log(`Blood Pressure: ${bloodPressureValue.systolic}/${bloodPressureValue.diastolic}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Cardiac Workload

The Cardiac Workload value is sent as part of the final results.

The application can receive the Cardiac Workload result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    CardiacWorkloadSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const cardiacWorkload = results.cardiacWorkload as CardiacWorkloadSign;  
    if (cardiacWorkload?.value != null) {
        console.log(`Cardiac Workload: ${cardiacWorkload.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Heart Age

The Heart Age value is sent as part of the final results.

The User Information is required to calculate the Heart Age result. If any details are missing from the User Information, the Heart Age will not be calculated. For more information on User Information, see the User Information page.

The application can receive the Heart Age result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    HeartAgeSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const heartAge = results.heartAge as HeartAgeSign;  
    if (heartAge?.value != null) {
        console.log(`Heart Age: ${heartAge.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Hemoglobin

The Hemoglobin value is sent as part of the final results.

The application can receive the Hemoglobin result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    HemoglobinSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const hemoglobin = results.hemoglobin as HemoglobinSign;
    if (hemoglobin?.value != null) {
        console.log(`Hemoglobin: ${hemoglobin.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Hemoglobin A1c

The Hemoglobin A1c value is sent as part of the final results.

The application can receive the Hemoglobin A1c result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    HemoglobinA1cSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const hemoglobinA1c = results.hemoglobinA1c as HemoglobinA1cSign;
    if (hemoglobinA1c?.value != null) {
        console.log(`Hemoglobin A1c: ${hemoglobinA1c.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## High Blood Pressure Risk

The High Blood Pressure Risk value is sent as part of the final results.

The definition for the result includes three entries: Low, Medium, and High.

The application can receive the High Blood Pressure Risk result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    HighBloodPressureRiskSign,
    HighBloodPressureRisk,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const highBloodPressureRisk = results.highBloodPressureRisk as HighBloodPressureRiskSign;
    if (highBloodPressureRisk?.value != null) {
        const risk = highBloodPressureRisk.value as HighBloodPressureRisk;
        console.log(`High Blood Pressure Risk: ${risk}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## High Fasting Glucose Risk

The High Fasting Glucose Risk value is sent as part of the final results.

The definition for the result includes three entries: Low, Medium, and High. However, in this version, only Low and High results will be used.

The application can receive the High Fasting Glucose Risk result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    HighFastingGlucoseRiskSign,
    HighFastingGlucoseRisk,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const highFastingGlucoseRisk = results.highFastingGlucoseRisk as HighFastingGlucoseRiskSign;
    if (highFastingGlucoseRisk?.value != null) {
        const risk = highFastingGlucoseRisk.value as HighFastingGlucoseRisk;
        console.log(`High Fasting Glucose Risk: ${risk}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## High Hemoglobin A1c Risk

The High Hemoglobin A1c Risk value is sent as part of the final results.

The definition for the result includes three entries: Low, Medium, and High.

The application can receive the High Hemoglobin A1c Risk result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    HighHemoglobinA1CRiskSign,
    HighHemoglobinA1CRisk,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const highHemoglobinA1CRisk = results.highHemoglobinA1CRisk as HighHemoglobinA1CRiskSign;
    if (highHemoglobinA1CRisk?.value != null) {
        const risk = highHemoglobinA1CRisk.value as HighHemoglobinA1CRisk;
        console.log(`High Hemoglobin A1c Risk: ${risk}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## High Total Cholesterol Risk

The High Total Cholesterol Risk value is sent as part of the final results.

The definition for the result includes three entries: Low, Medium, and High.

The application can receive the High Total Cholesterol Risk result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    HighTotalCholesterolRiskSign,
    HighTotalCholesterolRisk,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;    
    const highTotalCholesterolRisk = results.highTotalCholesterolRisk as HighTotalCholesterolRiskSign;
    if (highTotalCholesterolRisk?.value != null) {
        const risk = highTotalCholesterolRisk.value as HighTotalCholesterolRisk;
        console.log(`High Total Cholesterol Risk: ${risk}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## LF/HF

The LF/HF value is sent as part of the final results.

The application can receive the LF/HF result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    LfhfSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const lfhf = results.lfhf as LfhfSign;
    if (lfhf?.value != null) {
        console.log(`LFHF: ${lfhf.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Low Hemoglobin Risk

The Low Hemoglobin Risk value is sent as part of the final results.

The definition for the result includes three entries: Low, Medium, and High. However, in this version, only Low and High results will be used.

The application can receive the Low Hemoglobin Risk result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    LowHemoglobinRiskSign,
    LowHemoglobinRisk,
} from '@biosensesignal/web-sdk';
const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;    
    const lowHemoglobinRisk = results.lowHemoglobinRisk as LowHemoglobinRiskSign;
    if (lowHemoglobinRisk?.value != null) {
        const risk = lowHemoglobinRisk.value as LowHemoglobinRisk;
        console.log(`Low Hemoglobin Risk: ${risk}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Mean Arterial Pressure

The Mean Arterial Pressure value is sent as part of the final results.

The application can receive the Mean Arterial Pressure result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    MeanArterialPressureSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const meanArterialPressure = results.meanArterialPressure as MeanArterialPressureSign;           
    if (meanArterialPressure?.value != null) {
        console.log(`Mean Arterial Pressure: ${meanArterialPressure.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Mean RRi

The Mean RRi value is sent as part of the final results.

The application can receive the Mean RRi result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    MeanRRISign,
    ConfidenceLevel,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const meanRri = results.meanRri as MeanRRISign;
    if (meanRri?.value != null) {
        const confidenceLevel = meanRri.confidenceLevel as ConfidenceLevel;
        console.log(`Mean RRI: ${meanRri.value}`);
        console.log(`Confidence Level: ${confidenceLevel}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Normalized Stress Index

The Normalized Stress Index value is sent as part of the final results.

The application can receive the Normalized Stress Index result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    NormalizedStressIndexSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const normalizedStressIndex = results.normalizedStressIndex as NormalizedStressIndexSign;
    if (normalizedStressIndex?.value != null) {
        console.log(`Normalized Stress Index: ${normalizedStressIndex.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## PNS Index

The PNS Index value is sent as part of the final results.

The application can receive the PNS Index result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    PnsIndexSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const pnsIndex = results.pnsIndex as PnsIndexSign;
    if (pnsIndex?.value != null) {
        console.log(`PNS Index: ${pnsIndex.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## PNS Zone

The PNS Zone value is sent as part of the final results.

The application can receive the PNS Zone result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    PnsZoneSign,
    PnsZone,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const pnsZone = results.pnsZone as PnsZoneSign;
    if (pnsZone?.value != null) {
        const pnsZoneLevel = pnsZone.value as PnsZone;
        console.log(`PNS Zone: ${pnsZoneLevel}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## PRQ

The PRQ value is sent as part of the final results.

The application can receive the PRQ result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    PRQSign,
    ConfidenceLevel,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const prq = results.prq as PRQSign;
    if (prq?.value != null) {
        const confidenceLevel = prq.confidenceLevel as ConfidenceLevel;
        console.log(`PRQ: ${prq.value}`);
        console.log(`Confidence Level: ${confidenceLevel}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Pulse Pressure

The Pulse Pressure value is sent as part of the final results.

The application can receive the Pulse Pressure result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    PulsePressureSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const pulsePressure = results.pulsePressure as PulsePressureSign;           
    if (pulsePressure?.value != null) {
        console.log(`Pulse Pressure: ${pulsePressure.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Pulse Rate

The Pulse Rate value is sent both as an instantaneous value during the measurement and as part of the final results.

The application can receive the Pulse Rate result by implementing the OnFinalResults and OnVitalSign interfaces:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    PulseRateSign,
    ConfidenceLevel,
} from '@biosensesignal/web-sdk';

const onVitalSign = useCallback((vitalSign: VitalSigns) => {
    if (vitalSign?.pulseRate != null) {
        console.log(`Pulse Rate: ${vitalSign.pulseRate}`);
    }
}, []);

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const pulseRate = results.pulseRate as PulseRateSign;
    if (pulseRate?.value != null) {
        const confidenceLevel = pulseRate.confidenceLevel as ConfidenceLevel;
        console.log(`Pulse Rate: ${pulseRate.value}`);
        console.log(`Confidence Level: ${confidenceLevel}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## RMSSD

The RMSSD value is sent as part of the final results.

The application can receive the RMSSD result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    RmssdSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const rmssd = results.rmssd as RmssdSign;
    if (rmssd?.value != null) {
        console.log(`RMSSD: ${rmssd.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## RRi

The RRi values are sent as part of the final results.

The application can receive the RRi result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    RRISign,
    RRIValue,
    ConfidenceLevel,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const rri = results.rri as RRISign;
    if (rri?.value != null) {
        const rriEntries = rri.value as RRIValue[]; 
        const confidenceLevel = rri.confidenceLevel as ConfidenceLevel;
        for (const rriValue of rriEntries) {
              console.log(`RRI value: ${rriValue}`);
        }
        console.log(`Confidence Level: ${confidenceLevel}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Respiration Rate

The Respiration Rate value is sent both as an instantaneous value during the measurement and as part of the final results.

The application can receive the Respiration Rate result by implementing the OnFinalResults and OnVitalSign interfaces:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    RespirationRateSign,
    ConfidenceLevel,
} from '@biosensesignal/web-sdk';

const onVitalSign = useCallback((vitalSign: VitalSigns) => {
    if (vitalSign?.respirationRate != null) {
        console.log(`Respiration Rate: ${vitalSign.respirationRate}`);
    }
}, []);

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const respirationRate = results.respirationRate as RespirationRateSign;
    if (respirationRate?.value != null) {
        const confidenceLevel = respirationRate.confidenceLevel as ConfidenceLevel;
        console.log(`Respiration Rate: ${respirationRate.value}`);
        console.log(`Confidence Level: ${confidenceLevel}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## SD1

The SD1 value is sent as part of the final results.

The application can receive the SD1 result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    Sd1Sign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const sd1 = results.sd1 as Sd1Sign;
    if (sd1?.value != null) {
        console.log(`SD1: ${sd1.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## SD2

The SD2 value is sent as part of the final results.

The application can receive the SD2 result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    Sd2Sign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const sd2 = results.sd2 as Sd2Sign;
    if (sd2?.value != null) {
        console.log(`SD2: ${sd2.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## SDNN

The SDNN value is sent as part of the final results.

The application can receive the SDNN result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    SDNNSign,
    ConfidenceLevel,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const sdnn = results.sdnn as SDNNSign;
    if (sdnn?.value != null) {
        const confidenceLevel = sdnn.confidenceLevel as ConfidenceLevel;
        console.log(`SDNN: ${sdnn.value}`);
        console.log(`Confidence Level: ${confidenceLevel}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Stress Index

The Stress Index value is sent as part of the final results.

The application can receive the Stress Index result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    StressIndexSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const stressIndex = results.stressIndex as StressIndexSign;
    if (stressIndex?.value != null) {
        console.log(`Stress Index: ${stressIndex.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## SNS Index

The SNS Index value is sent as part of the final results.

The application can receive the SNS Index result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    SnsIndexSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const snsIndex = results.snsIndex as SnsIndexSign;
    if (snsIndex?.value != null) {
        console.log(`SNS Index: ${snsIndex.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## SNS Zone

The SNS Zone value is sent as part of the final results.

The application can receive the SNS Zone result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    SnsZoneSign,
    SnsZone,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const snsZone = results.snsZone as SnsZoneSign;
    if (snsZone?.value != null) {
        const snsZoneLevel = snsZone.value as SnsZone;
        console.log(`SNS Zone: ${snsZoneLevel}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Wellness Index

The Wellness Index value is sent as part of the final results. It is calculated based on several other indicators and can still be determined even if only a subset of them is available. For optimal results, it is recommended to ensure that the measurement duration is sufficient and that as all relevant indicator values are calculated.

The indicators used in the calculation are:

- Pulse Rate
- Blood Pressure
- Heart Rate Variability (RRi)

The application can receive the Wellness Index result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    WellnessIndexSign,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const wellnessIndex = results.wellnessIndex as WellnessIndexSign;
    if (wellnessIndex?.value != null) {
        console.log(`Wellness Index: ${wellnessIndex.value}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Wellness Level

The Wellness Level value is sent as part of the final results. It is calculated based on several other indicators and can still be determined even if only a subset of them is available. For optimal results, it is recommended to ensure that the measurement duration is sufficient and that as all relevant indicator values are calculated.

The indicators used in the calculation are:

- Pulse Rate
- Blood Pressure
- Heart Rate Variability (RRi)

The application can receive the Wellness Level result by implementing the OnFinalResults callback interface:

```typescript
import { 
    VitalSigns,
    VitalSignsResults,
    WellnessLevelSign,
    WellnessLevel,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    const results = vitalSignsResults.results as VitalSigns;
    const wellnessLevel = results.wellnessLevel as WellnessLevelSign;
    if (wellnessLevel?.value != null) {
        const level = wellnessLevel.value as WellnessLevel;
        console.log(`Wellness Level: ${level}`);
    }
}, []);
```

For general information about vital signs see the Vital Signs and Health Indicators Information Document.

For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

## Web Sample Application

The Sample Application (also abbreviated as "SampleApp") is a reference project for implementing an application based on the BiosenseSignal SDK.

### Dependencies

- Install Visual Studio Code or other IDE which is suitable for web development.
- Install Node.js version >= 14 for building the project.
- Install Package manager (npm or yarn) - If you installed Node.js, npm is already set up.

### Building the Sample Application

The following instructions are relevant for Web sample application.

1. Unzip BiosenseSignal_Web_Sample_X.X.X.zip.
2. Open Visual Studio Code.
3. Select File->Open.
4. Choose the unzipped folder BiosenseSignal_Web_Sample_X.X.X.
5. Click on Open.
6. Open the terminal and change directory to the extracted sample-app directory.
7. Run `yarn install` or `npm install`.
8. Run `yarn start` or `npm start` and wait for the building process to finish.
9. The SampleApp is now served from local server. Open your browser and enter the address that appears in the console - The app should open.

**Note**

When opening the app from a mobile device browser, your PC (Local server) and mobile device must be connected to the same WIFI.

### Measuring Vital Signs

1. Position your face in the center of the camera preview.
2. Click the Start button.
3. Pulse Rate vital sign values (this is an example of an "instantaneous" value) should be received after approximately 8 seconds.
4. After the measurement ends (either by tapping on the Stop button or at the end of the defined measurement duration), Pulse Rate (PR), Respiration Rate (RR), Stress Level (SL), SDNN and Blood Pressure (BP) results will be shown (this is an example of a "final" result).
5. The final results may be invalid if there was insufficient measuring time.
6. For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.

Also see the following relevant pages:

- Best practices on how to take a measurement
- SDK Accuracy Targets
- SDK Alerts

## Getting Support

Our professional support team is available to assist you throughout the integration process.

---

Last updated: 10/9/25, 6:13 PM