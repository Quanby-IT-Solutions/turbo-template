import 'dart:ui';

class ImageData {
  final int imageWidth;
  final int imageHeight;
  final Rect? roi;
  final int imageValidity;

  ImageData(
      {required this.imageWidth,
      required this.imageHeight,
      required this.roi,
      required this.imageValidity});
}
