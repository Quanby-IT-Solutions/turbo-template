import 'package:flutter_riverpod/flutter_riverpod.dart';

class AnimationState {
  final Map<String, bool> _visitedScreens;

  AnimationState([Map<String, bool>? visitedScreens])
    : _visitedScreens = visitedScreens ?? {};

  AnimationState copyWith(Map<String, bool> visitedScreens) {
    return AnimationState(Map.from(visitedScreens));
  }

  bool hasVisitedScreen(String screenName) {
    return _visitedScreens[screenName] ?? false;
  }

  AnimationState markScreenAsVisited(String screenName) {
    final newVisited = Map<String, bool>.from(_visitedScreens);
    newVisited[screenName] = true;
    return AnimationState(newVisited);
  }

  AnimationState resetScreen(String screenName) {
    final newVisited = Map<String, bool>.from(_visitedScreens);
    newVisited[screenName] = false;
    return AnimationState(newVisited);
  }

  AnimationState resetAllScreens() {
    return AnimationState();
  }
}

class AnimationStateNotifier extends Notifier<AnimationState> {
  @override
  AnimationState build() => AnimationState();

  bool hasVisitedScreen(String screenName) {
    return state.hasVisitedScreen(screenName);
  }

  void markScreenAsVisited(String screenName) {
    state = state.markScreenAsVisited(screenName);
  }

  void resetScreen(String screenName) {
    state = state.resetScreen(screenName);
  }

  void resetAllScreens() {
    state = state.resetAllScreens();
  }
}

final animationStateProvider =
    NotifierProvider<AnimationStateNotifier, AnimationState>(() {
      return AnimationStateNotifier();
    });
