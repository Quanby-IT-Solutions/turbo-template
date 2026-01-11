import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/data/repositories/search_repository.dart';

final searchRepositoryProvider = Provider<SearchRepository>((ref) {
  return SearchRepository();
});



