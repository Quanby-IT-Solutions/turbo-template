import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/shared/widgets/app_text_field.dart';

/// The in-app route to permanent account deletion.
///
/// App Store Review Guideline 5.1.1(v) requires an app that offers account
/// creation to offer deletion from inside the app. A link out to a web form
/// does not satisfy it, which is why this flow begins and ends here.
///
/// Styled destructively and placed last on the profile screen on purpose: it
/// is the one action on that screen that cannot be undone.
class DeleteAccountTile extends StatelessWidget {
  const DeleteAccountTile({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      leading: Icon(Icons.delete_forever_outlined, color: theme.colorScheme.error),
      title: Text('Delete Account', style: TextStyle(color: theme.colorScheme.error)),
      subtitle: const Text('Permanently removes your account and its data'),
      onTap: () => showDialog<void>(
        context: context,
        // A stray tap outside must not dismiss a half-typed password; the
        // dialog also disables its own dismissal while the request is in
        // flight, where closing would hide the outcome of a destructive call.
        barrierDismissible: false,
        builder: (_) => const _DeleteAccountDialog(),
      ),
    );
  }
}

class _DeleteAccountDialog extends ConsumerStatefulWidget {
  const _DeleteAccountDialog();

  @override
  ConsumerState<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends ConsumerState<_DeleteAccountDialog> {
  final _password = TextEditingController();
  bool _deleting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // The confirm button is disabled while the field is empty, so the dialog
    // has to rebuild as it is typed into. Without this the button stays
    // disabled no matter what is entered.
    _password.addListener(_onPasswordChanged);
  }

  void _onPasswordChanged() => setState(() {});

  @override
  void dispose() {
    _password.removeListener(_onPasswordChanged);
    _password.dispose();
    super.dispose();
  }

  /// Maps a refusal to something a user can act on.
  ///
  /// The reason matters more than the wording: "wrong password" is retryable
  /// without leaving the dialog, "sign in again" is not, and "not enabled" is
  /// an operator's problem that the user can do nothing about. A single
  /// generic failure message would make all three look like the first.
  static String _messageFor(DeleteAccountFailure failure) {
    switch (failure) {
      case DeleteAccountFailure.invalidPassword:
        return 'That password is incorrect.';
      case DeleteAccountFailure.noPasswordSet:
        return 'This account signs in with Google and has no password. '
            'Sign out, sign in again, then delete without a password.';
      case DeleteAccountFailure.reauthenticationRequired:
        return 'For your security, sign in again before deleting your account.';
      case DeleteAccountFailure.notEnabled:
        return 'Account deletion is unavailable right now. Please contact support.';
      case DeleteAccountFailure.unknown:
        return 'Something went wrong. Please try again.';
    }
  }

  Future<void> _submit() async {
    setState(() {
      _deleting = true;
      _error = null;
    });

    try {
      await ref.read(authStateProvider.notifier).deleteAccount(password: _password.text);

      // Close before the router reacts to the now-signed-out state, so the
      // dialog is not left mounted over the login screen.
      if (mounted) Navigator.of(context).pop();
    } on DeleteAccountException catch (error) {
      if (!mounted) return;
      setState(() {
        _deleting = false;
        _error = _messageFor(error.failure);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _deleting = false;
        _error = _messageFor(DeleteAccountFailure.unknown);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Delete Account'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Says what goes and that it is immediate. Both stores expect the
          // consequence to be stated before the confirming tap, not after.
          const Text(
            'This permanently deletes your account, your todos, and your '
            'sessions on every device. It happens immediately and cannot be '
            'undone.',
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _password,
            labelText: 'Password',
            obscureText: true,
            autofocus: true,
            autofillHints: const [AutofillHints.password],
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _deleting ? null : _submit(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _deleting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          // Disabled on an empty field rather than submitting and letting the
          // server answer: a blank password would be sent as a passwordless
          // delete, which succeeds on a fresh session and would turn a
          // mis-tap into a deleted account.
          onPressed: _deleting || _password.text.isEmpty ? null : _submit,
          style: FilledButton.styleFrom(
            backgroundColor: theme.colorScheme.error,
            foregroundColor: theme.colorScheme.onError,
          ),
          child: _deleting
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Delete Account'),
        ),
      ],
    );
  }
}
