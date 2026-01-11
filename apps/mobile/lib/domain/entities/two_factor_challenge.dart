import 'package:equatable/equatable.dart';

enum TwoFactorMethod { emailOtp }

class TwoFactorChallenge extends Equatable {
  final String email;
  final TwoFactorMethod method;
  final bool canTrustDevice;
  final DateTime createdAt;

  TwoFactorChallenge({
    required this.email,
    this.method = TwoFactorMethod.emailOtp,
    this.canTrustDevice = true,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  TwoFactorChallenge copyWith({
    String? email,
    TwoFactorMethod? method,
    bool? canTrustDevice,
    DateTime? createdAt,
  }) {
    return TwoFactorChallenge(
      email: email ?? this.email,
      method: method ?? this.method,
      canTrustDevice: canTrustDevice ?? this.canTrustDevice,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  String get methodLabel {
    switch (method) {
      case TwoFactorMethod.emailOtp:
        return 'Email code';
    }
  }

  @override
  List<Object?> get props => [email, method, canTrustDevice, createdAt];
}
