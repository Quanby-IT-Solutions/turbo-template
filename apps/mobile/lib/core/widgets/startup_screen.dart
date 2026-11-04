import 'package:flutter/material.dart';

/// Shown only while the launch's first session check runs.
///
/// Without it the router had to pick a screen before it knew who was signed
/// in, so it showed /login and then jumped to Home for a signed-in user. Same
/// rocket as the login screen so the hand-off to either screen reads as one
/// app; no text, because there is nothing for the user to do yet.
class StartupScreen extends StatelessWidget {
  const StartupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.rocket_launch_rounded,
              size: 64,
              color: colorScheme.primary,
            ),
            const SizedBox(height: 32),
            SizedBox.square(
              dimension: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                semanticsLabel: 'Loading',
                color: colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
