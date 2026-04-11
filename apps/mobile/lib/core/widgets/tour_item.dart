import 'package:flutter/material.dart';
import 'package:showcaseview/showcaseview.dart';

import '../../features/home/presentation/providers/tour_provider.dart';

/// A self-registering tour-step wrapper.
///
/// Wrap any widget with [TourItem] to include it in the feature tour.
/// It automatically registers a [TourEntry] with [TourRegistry] on mount
/// and unregisters on dispose — no manual key lists needed.
///
/// ```dart
/// TourItem(
///   tabIndex: 0,
///   order: 1,
///   title: 'Welcome!',
///   description: 'This is the greeting section',
///   child: MyWidget(),
/// )
/// ```
class TourItem extends StatefulWidget {
  const TourItem({
    super.key,
    required this.tabIndex,
    required this.order,
    required this.title,
    required this.description,
    required this.child,
    this.targetShapeBorder,
  });

  /// Which tab this tour step lives on. Use `null` for always-visible elements.
  final int? tabIndex;

  /// Sort order within the tab. Lower values appear first in the tour.
  final double order;

  /// Showcase title text.
  final String title;

  /// Showcase description text.
  final String description;

  /// The widget to highlight.
  final Widget child;

  /// Optional custom shape border for the showcase overlay.
  final ShapeBorder? targetShapeBorder;

  @override
  State<TourItem> createState() => _TourItemState();
}

class _TourItemState extends State<TourItem> {
  late final GlobalKey _showcaseKey;
  late final TourEntry _entry;

  @override
  void initState() {
    super.initState();
    _showcaseKey = GlobalKey(
      debugLabel: 'tour_${widget.tabIndex}_${widget.order}',
    );
    _entry = TourEntry(
      key: _showcaseKey,
      tabIndex: widget.tabIndex,
      order: widget.order,
    );
    TourRegistry.instance.register(_entry);
  }

  @override
  void dispose() {
    TourRegistry.instance.unregister(_showcaseKey);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Showcase(
      key: _showcaseKey,
      title: widget.title,
      description: widget.description,
      targetShapeBorder: widget.targetShapeBorder ?? const RoundedRectangleBorder(),
      child: widget.child,
    );
  }
}
