#
# To learn more about a Podspec see http://guides.cocoapods.org/syntax/podspec.html.
# Run `pod lib lint biosensesignal_flutter_sdk.podspec` to validate before publishing.
#
Pod::Spec.new do |s|
    s.name             = 'biosensesignal_flutter_sdk'
    s.version          = '5.11.1'
    s.summary          = 'A new flutter plugin project.'
    s.description      = <<-DESC
        BiosenseSignal Flutter SDK.
                         DESC
    s.author           = { 'BiosenseSignal' => '' }
    s.homepage         = 'https://biosensesignal.com'
    s.license          = { :file => '../LICENSE' }
    s.source           = { :path => '.' }
    s.source_files = 'Classes/**/*'
    s.public_header_files = 'Classes/**/*.h'
    s.dependency 'Flutter'
    s.platform = :ios, '14.0'
    s.ios.deployment_target = '14.0'
    s.swift_versions = ['5.0']

  # Flutter.framework does not contain a i386 slice.
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386' }
  s.preserve_paths = 'BiosenseSignal.xcframework'
  s.xcconfig = { 'OTHER_LDFLAGS' => '-framework BiosenseSignal' }
  s.vendored_frameworks = "BiosenseSignal.xcframework"
end
