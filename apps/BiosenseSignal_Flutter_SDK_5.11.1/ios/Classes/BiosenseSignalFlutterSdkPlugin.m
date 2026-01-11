#import "BiosenseSignalFlutterSdkPlugin.h"
#if __has_include(<biosensesignal_flutter_sdk/biosensesignal_flutter_sdk-Swift.h>)
#import <biosensesignal_flutter_sdk/biosensesignal_flutter_sdk-Swift.h>
#else
// Support project import fallback if the generated compatibility header
// is not copied when this plugin is created as a library.
// https://forums.swift.org/t/swift-static-libraries-dont-copy-generated-objective-c-header/19816
#import "biosensesignal_flutter_sdk-Swift.h"
#endif

@implementation BiosenseSignalFlutterSdkPlugin
+ (void)registerWithRegistrar:(NSObject<FlutterPluginRegistrar>*)registrar {
  [SwiftBiosenseSignalFlutterSdkPlugin registerWithRegistrar:registrar];
}
@end
