import 'package:flutter/material.dart';
import 'package:mobile/core/widgets/placeholder_screen.dart';

class MessagingScreen extends StatelessWidget {
  const MessagingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Messages',
      description: 'Communicate securely with doctors and patients.',
      icon: Icons.message,
    );
  }
}