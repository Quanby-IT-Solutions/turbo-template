import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/patient/providers/patient_providers.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/domain/entities/consultation.dart';

class PatientMeetDoctorScreen extends ConsumerStatefulWidget {
  const PatientMeetDoctorScreen({super.key});

  @override
  ConsumerState<PatientMeetDoctorScreen> createState() =>
      _PatientMeetDoctorScreenState();
}

class _PatientMeetDoctorScreenState
    extends ConsumerState<PatientMeetDoctorScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _meetingCodeController = TextEditingController();
  bool _isJoining = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _meetingCodeController.dispose();
    super.dispose();
  }

  void _startVideoCall(String consultationId) {
    context.push('/video-call', extra: {'consultationId': consultationId});
  }

  Future<void> _copyMeetingCode() async {
    final code = _meetingCodeController.text.trim();
    if (code.isNotEmpty) {
      await Clipboard.setData(ClipboardData(text: code));
      if (mounted) {
        ToastService.showSuccess(
          context: context,
          title: 'Copied',
          description: 'Meeting code copied to clipboard',
        );
      }
    }
  }

  Future<void> _joinMeeting() async {
    final code = _meetingCodeController.text.trim().toUpperCase();
    if (code.length != 6) {
      ToastService.showError(
        context: context,
        title: 'Invalid Code',
        description: 'Please enter a valid 6-character meeting code',
      );
      return;
    }

    setState(() => _isJoining = true);
    try {
      // TODO: Implement WebRTC join via code
      // For now, show a message that this feature is coming soon
      if (mounted) {
        ToastService.showInfo(
          context: context,
          title: 'Coming Soon',
          description: 'Join via code functionality will be available soon',
        );
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Join Failed',
          description: 'Failed to join meeting: ${e.toString()}',
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isJoining = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedNavWrapper(
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          backgroundColor: colorScheme.surfaceContainerLow,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_rounded,
              color: colorScheme.primary,
            ),
            onPressed: () => context.pop(),
          ),
          title: Text(
            'Meet Doctor',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(96),
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: colorScheme.outline.withValues(alpha: 0.1),
                  width: 1,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(6),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: colorScheme.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: Colors.transparent,
                  labelColor: Colors.white,
                  unselectedLabelColor:
                      colorScheme.onSurface.withValues(alpha: 0.6),
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                  ),
                  tabs: const [
                    Tab(
                      text: 'Join via Code',
                      icon: Icon(Icons.video_call_rounded, size: 18),
                    ),
                    Tab(
                      text: 'Scheduled Consultations',
                      icon: Icon(Icons.calendar_today_rounded, size: 18),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildJoinViaCodeTab(),
            _buildScheduledConsultationsTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildJoinViaCodeTab() {
    final colorScheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: colorScheme.outline.withValues(alpha: 0.1),
                  width: 1,
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Icon
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: colorScheme.primary.withValues(alpha: 0.2),
                        width: 2,
                      ),
                    ),
                    child: Icon(
                      Icons.video_call_rounded,
                      size: 48,
                      color: colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Title
                  Text(
                    'Join Doctor Meeting',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onSurface,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),

                  // Meeting Code Input
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _meetingCodeController,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 4,
                            fontFeatures: const [FontFeature.tabularFigures()],
                            color: colorScheme.onSurface,
                          ),
                          maxLength: 6,
                          textCapitalization: TextCapitalization.characters,
                          decoration: InputDecoration(
                            hintText: 'Enter code',
                            hintStyle: TextStyle(
                              color: colorScheme.onSurface.withValues(alpha: 0.4),
                            ),
                            counterText: '',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: colorScheme.surface,
                          ),
                          onChanged: (value) => setState(() {}),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.copy_rounded),
                        onPressed: _meetingCodeController.text.trim().isNotEmpty
                            ? _copyMeetingCode
                            : null,
                        tooltip: 'Copy code',
                        style: IconButton.styleFrom(
                          backgroundColor: colorScheme.surfaceContainerHighest,
                          foregroundColor: colorScheme.onSurface,
                          padding: const EdgeInsets.all(16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Join Meeting Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _meetingCodeController.text.trim().length == 6 &&
                              !_isJoining
                          ? _joinMeeting
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colorScheme.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isJoining
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text(
                              'Join Meeting',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Connection Status (placeholder for now)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Not Connected',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface.withValues(alpha: 0.7),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Descriptive Text
                  Column(
                    children: [
                      Text(
                        'Enter a meeting code provided by your doctor to join the consultation',
                        style: TextStyle(
                          fontSize: 14,
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Make sure you have a stable internet connection before joining',
                        style: TextStyle(
                          fontSize: 14,
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildScheduledConsultationsTab() {
    final colorScheme = Theme.of(context).colorScheme;
    final user = ref.watch(currentUserProvider);

    final consultationsAsync = ref.watch(
      patientConsultationsProvider(
        ConsultationListParams(
          patientId: user?.id,
        ),
      ),
    );

    return consultationsAsync.when(
      data: (consultations) {
        final now = DateTime.now();
        
        // Show only scheduled/active consultations (those that haven't ended)
        final scheduledConsultations = consultations
            .where((c) => c.endTime == null && c.startTime.isAfter(now.subtract(const Duration(hours: 1))))
            .toList()
          ..sort((a, b) => a.startTime.compareTo(b.startTime));

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(
              patientConsultationsProvider(
                ConsultationListParams(
                  patientId: user?.id,
                ),
              ),
            );
          },
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with title and schedule button
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Upcoming Consultations',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'View and join your scheduled consultations',
                            style: TextStyle(
                              fontSize: 14,
                              color: colorScheme.onSurface.withValues(alpha: 0.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () {
                        context.push('/doctor-search');
                      },
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      child: const Text('Schedule'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                if (scheduledConsultations.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(48.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: colorScheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(32),
                              border: Border.all(
                                color: colorScheme.primary.withValues(alpha: 0.2),
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              Icons.calendar_today_rounded,
                              size: 64,
                              color: colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'No Scheduled Consultations',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Schedule a consultation to get started',
                            style: TextStyle(
                              fontSize: 14,
                              color: colorScheme.onSurface.withValues(alpha: 0.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...scheduledConsultations.map((consultation) => 
                    _buildScheduledConsultationCard(consultation)),
              ],
            ),
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load consultations',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              error.toString(),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                ref.invalidate(
                  patientConsultationsProvider(
                    ConsultationListParams(
                      patientId: user?.id,
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduledConsultationCard(Consultation consultation) {
    final colorScheme = Theme.of(context).colorScheme;

    String formatDateTime(DateTime dateTime) {
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      final weekdays = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      final weekday = weekdays[dateTime.weekday - 1];
      final month = months[dateTime.month - 1];
      final hour = dateTime.hour > 12 ? dateTime.hour - 12 : dateTime.hour == 0 ? 12 : dateTime.hour;
      final ampm = dateTime.hour >= 12 ? 'PM' : 'AM';
      final minute = dateTime.minute.toString().padLeft(2, '0');
      return '$weekday, $month ${dateTime.day}, ${dateTime.year} at $hour:$minute $ampm';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.06),
            offset: const Offset(0, 4),
            blurRadius: 12,
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Consultation ${consultation.consultationCode}',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        formatDateTime(consultation.startTime),
                        style: TextStyle(
                          fontSize: 14,
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: colorScheme.primary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Text(
                    'Scheduled',
                    style: TextStyle(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Consultation Type: Video Call • Duration: 30 minutes',
                    style: TextStyle(
                      fontSize: 14,
                      color: colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: () => _startVideoCall(consultation.id),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colorScheme.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Join Meeting'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
