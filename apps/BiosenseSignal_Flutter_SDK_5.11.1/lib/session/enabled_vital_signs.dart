class EnabledVitalSigns {
  final int enabledVitalSigns;

  EnabledVitalSigns(this.enabledVitalSigns);

  bool isEnabled(int vitalSignType) {
    return (enabledVitalSigns & vitalSignType > 0);
  }
}
