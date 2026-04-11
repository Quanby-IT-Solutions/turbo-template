import 'package:flutter/material.dart';
import '../../core/theme/app_styles.dart';

class AppTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String labelText;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final String? Function(String?)? validator;
  final void Function(String)? onFieldSubmitted;
  final bool autofocus;
  final String? hintText;

  const AppTextField({
    super.key,
    this.controller,
    required this.labelText,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.validator,
    this.onFieldSubmitted,
    this.autofocus = false,
    this.hintText,
  });

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  final FocusNode _focusNode = FocusNode();
  bool _isFocused = false;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() {
        _isFocused = _focusNode.hasFocus;
      });
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    Color dividerColor = theme.colorScheme.outlineVariant;
    double dividerHeight = 0.5;
    
    if (_errorText != null) {
      dividerColor = theme.colorScheme.error;
      dividerHeight = 2.0;
    } else if (_isFocused) {
      dividerColor = theme.colorScheme.primary;
      dividerHeight = 2.0;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        TextFormField(
          controller: widget.controller,
          focusNode: _focusNode,
          autofocus: widget.autofocus,
          obscureText: widget.obscureText,
          keyboardType: widget.keyboardType,
          textInputAction: widget.textInputAction,
          autofillHints: widget.autofillHints,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.9),
          ),
          decoration: InputDecoration(
            labelText: widget.labelText,
            hintText: widget.hintText,
            prefixIcon: widget.prefixIcon != null ? IconTheme(
              data: IconThemeData(
                color: _isFocused ? theme.colorScheme.primary : theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              child: widget.prefixIcon!,
            ) : null,
            suffixIcon: widget.suffixIcon,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            errorBorder: InputBorder.none,
            focusedErrorBorder: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
            floatingLabelStyle: theme.textTheme.labelMedium?.copyWith(
              color: _errorText != null ? theme.colorScheme.error : theme.colorScheme.primary,
            ),
            labelStyle: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
            ),
            errorStyle: const TextStyle(height: 0, fontSize: 0),
          ),
          validator: (value) {
            String? error;
            if (widget.validator != null) {
              error = widget.validator!(value);
            }
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && _errorText != error) {
                setState(() => _errorText = error);
              }
            });
            return error;
          },
          onFieldSubmitted: widget.onFieldSubmitted,
        ),
        AnimatedContainer(
          duration: AppMotion.durationFast,
          curve: AppMotion.enterCurve,
          height: dividerHeight,
          width: double.infinity,
          decoration: BoxDecoration(
            color: dividerColor,
            borderRadius: BorderRadius.circular(dividerHeight / 2),
          ),
        ),
        AnimatedOpacity(
          opacity: _errorText != null ? 1.0 : 0.0,
          duration: AppMotion.durationFast,
          curve: AppMotion.enterCurve,
          child: AnimatedSize(
            duration: AppMotion.durationFast,
            curve: AppMotion.enterCurve,
            alignment: Alignment.topCenter,
            child: _errorText != null
                ? Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _errorText!,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.error,
                      ),
                    ),
                  )
                : const SizedBox(width: double.infinity, height: 0),
          ),
        ),
      ],
    );
  }
}
