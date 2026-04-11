import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'tour_provider.g.dart';

/// Manages the "Take a Tour" trigger signal.
@riverpod
class TourTrigger extends _$TourTrigger {
  @override
  bool build() => false;

  void trigger() => state = true;
  void reset() => state = false;
}

/// A single tour step registered by a [TourItem] widget.
class TourEntry {
  const TourEntry({
    required this.key,
    required this.tabIndex,
    required this.order,
  });

  /// The [GlobalKey] used by the underlying [Showcase] widget.
  final GlobalKey key;

  /// Which tab index this entry lives on (null = always visible, e.g. nav bar).
  final int? tabIndex;

  /// Sort order within the tab. Lower values come first.
  /// Entries are sorted globally by (tabIndex, order).
  final double order;
}

/// Central registry that [TourItem] widgets register/unregister themselves with.
///
/// HomeScreen reads [orderedKeys] and [tabForKey] at tour start time.
/// Developers just wrap any widget with [TourItem] — no manual list editing.
class TourRegistry {
  TourRegistry._();
  static final instance = TourRegistry._();

  final Map<GlobalKey, TourEntry> _entries = {};

  /// Register a tour entry. Called by [TourItem] on init.
  void register(TourEntry entry) {
    _entries[entry.key] = entry;
  }

  /// Unregister a tour entry. Called by [TourItem] on dispose.
  void unregister(GlobalKey key) {
    _entries.remove(key);
  }

  /// All registered keys sorted by (tabIndex ?? 999, order).
  List<GlobalKey> get orderedKeys {
    final sorted = _entries.values.toList()
      ..sort((a, b) {
        final tabCmp = (a.tabIndex ?? 999).compareTo(b.tabIndex ?? 999);
        if (tabCmp != 0) return tabCmp;
        return a.order.compareTo(b.order);
      });
    return sorted.map((e) => e.key).toList();
  }

  /// Returns the tab index for a given key, or null if always-visible.
  int? tabForKey(GlobalKey key) => _entries[key]?.tabIndex;
}
