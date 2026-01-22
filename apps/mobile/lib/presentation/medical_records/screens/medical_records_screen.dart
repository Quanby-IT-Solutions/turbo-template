import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/patient/providers/patient_providers.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/domain/entities/patient.dart';
import 'package:mobile/domain/entities/consultation.dart';
import 'package:mobile/domain/entities/user.dart' as user_entity;
import 'package:mobile/presentation/doctor/providers/doctor_providers.dart';

class MedicalRecordsScreen extends ConsumerStatefulWidget {
  const MedicalRecordsScreen({super.key});

  @override
  ConsumerState<MedicalRecordsScreen> createState() =>
      _MedicalRecordsScreenState();
}

class _MedicalRecordsScreenState extends ConsumerState<MedicalRecordsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedMetric = 'heart-rate';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // Helper: Calculate BMI
  double _calculateBMI(double weight, double height) {
    if (height <= 0) return 0.0;
    return weight / ((height / 100) * (height / 100));
  }

  // Helper: Format date
  String _formatDate(DateTime date) {
    return DateFormat('MMMM dd, yyyy').format(date);
  }

  // Helper: Format date short
  String _formatDateShort(DateTime date) {
    return DateFormat('MMM dd, yyyy').format(date);
  }

  // Helper: Format time
  String _formatTime(DateTime date) {
    return DateFormat('hh:mm a').format(date);
  }

  // Helper: Copy to clipboard
  Future<void> _copyToClipboard(String text, String label) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$label copied to clipboard')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final patientAsync = ref.watch(currentPatientProvider);
    final user = ref.watch(currentUserProvider);

    return AnimatedNavWrapper(
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          title: Padding(
                padding: const EdgeInsets.only(left: 8.0), 
                child: Text(
                  'Medical Records',
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              centerTitle: false,
              elevation: 0,
              backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
              automaticallyImplyLeading: false,
          // leading: IconButton(
          //   icon: Icon(
          //     Icons.arrow_back_ios_rounded,
          //     color: colorScheme.primary,
          //   ),
          //   onPressed: () => context.pop(),
          // ),
        
          // bottom: TabBar(
          //   controller: _tabController,
          //   tabs: const [
          //     Tab(text: 'Overview'),
          //     Tab(text: 'Health Trends'),
          //     Tab(text: 'Consultations'),
          //     Tab(text: 'Self Check History'),
          //   ],
          //   labelColor: colorScheme.primary,
          //   unselectedLabelColor: colorScheme.onSurface.withValues(alpha: 0.6),
          //   indicatorColor: colorScheme.primary,
          // ),
        ),
        body: patientAsync.when(
          data: (patient) {
            if (patient == null) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.person_outline_rounded,
                      size: 64,
                      color: colorScheme.outline,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No patient profile found',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(currentPatientProvider);
              },
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Patient Summary Card
                    _buildPatientSummaryCard(context, patient, user, colorScheme),
                    const SizedBox(height: 16),

                    // Key Metrics Cards
                    _buildMetricsCards(context, patient, colorScheme),
                    const SizedBox(height: 16),

                    // Contact & Medical Information
                    _buildContactMedicalCards(context, patient, colorScheme),
                    const SizedBox(height: 16),

                    // Summary Statistics Cards
                    // _buildStatisticsCards(context, patient, colorScheme),
                    // const SizedBox(height: 16),

                    // // Tab Content
                    // SizedBox(
                    //   height: MediaQuery.of(context).size.height * 0.6,
                    //   child: TabBarView(
                    //     controller: _tabController,
                    //     children: [
                    //       _buildOverviewTab(context, patient, colorScheme),
                    //       _buildHealthTrendsTab(context, patient, colorScheme),
                    //       _buildConsultationsTab(context, patient, colorScheme),
                    //       _buildSelfCheckTab(context, patient, colorScheme),
                    //     ],
                    //   ),
                    // ),

                    // Summary Statistics Cards
                    _buildStatisticsCards(context, patient, colorScheme),
                    const SizedBox(height: 24),

                    // Tab Bar (moved here)
                    TabBar(
                      controller: _tabController,
                      isScrollable: true,
                      tabAlignment: TabAlignment.start, // 👈 force tabs to start at left
                      padding: EdgeInsets.zero,         // 👈 remove default outer padding
                      labelPadding: const EdgeInsets.symmetric(horizontal: 12), // 👈 tighter tabs
                      tabs: const [
                        Tab(text: 'Overview'),
                        Tab(text: 'Health Trends'),
                        Tab(text: 'Consultations'),
                        Tab(text: 'Self Check History'),
                      ],
                      labelColor: colorScheme.primary,
                      unselectedLabelColor: colorScheme.onSurface.withOpacity(0.6),
                      indicatorColor: colorScheme.primary,
                    ),

                    const SizedBox(height: 16),

                    // Tab Content
                    SizedBox(
                      height: MediaQuery.of(context).size.height * 0.6,
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildOverviewTab(context, patient, colorScheme),
                          _buildHealthTrendsTab(context, patient, colorScheme),
                          _buildConsultationsTab(context, patient, colorScheme),
                          _buildSelfCheckTab(context, patient, colorScheme),
                        ],
                      ),
                    ),
                    const SizedBox(height: 100),
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
                  'Error loading medical records',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString(),
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Patient Summary Card
  Widget _buildPatientSummaryCard(
    BuildContext context,
    Patient patient,
    user_entity.User? user,
    ColorScheme colorScheme,
  ) {
    final profileImageUrl = user?.profileImageUrl;
    final hasProfileImage =
        profileImageUrl != null && profileImageUrl.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: hasProfileImage
                ? ClipOval(
                    child: Image.network(
                      profileImageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          Icon(Icons.person_rounded, size: 40, color: colorScheme.primary),
                    ),
                  )
                : Icon(Icons.person_rounded, size: 40, color: colorScheme.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  patient.displayName,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${patient.age} years old • ${patient.gender}',
                  style: TextStyle(
                    fontSize: 14,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'PATIENT ID',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface.withValues(alpha: 0.5),
                    letterSpacing: 1,
                  ),
                ),
                Text(
                  patient.id,
                  style: TextStyle(
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Key Metrics Cards
  Widget _buildMetricsCards(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    final bmi = _calculateBMI(patient.weight, patient.height);
    String bmiCategory = 'Normal weight';
    if (bmi < 18.5) {
      bmiCategory = 'Underweight';
    } else if (bmi >= 25) {
      bmiCategory = 'Overweight';
    }

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 1.2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      children: [
        _buildMetricCard(
          context,
          'Height',
          '${patient.height.toStringAsFixed(0)}',
          'cm',
          colorScheme,
        ),
        _buildMetricCard(
          context,
          'Weight',
          '${patient.weight.toStringAsFixed(1)}',
          'kg',
          colorScheme,
        ),
        _buildMetricCard(
          context,
          'BMI',
          bmi.toStringAsFixed(1),
          bmiCategory,
          colorScheme,
        ),
        _buildMetricCard(
          context,
          'Blood Type',
          patient.bloodType,
          '',
          colorScheme,
        ),
      ],
    );
  }

  Widget _buildMetricCard(
    BuildContext context,
    String label,
    String value,
    String unit,
    ColorScheme colorScheme,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
            ),
          ),
          if (unit.isNotEmpty) ...[
            Text(
              unit,
              style: TextStyle(
                fontSize: 12,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ],
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }

  // Contact & Medical Information Cards
  Widget _buildContactMedicalCards(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    return Column(
      children: [
        // Contact Information
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Contact Information',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              _buildInfoRow(Icons.phone_rounded, patient.contactNumber, colorScheme),
              const SizedBox(height: 8),
              _buildInfoRow(Icons.location_on_rounded, patient.address, colorScheme),
              const SizedBox(height: 8),
              _buildInfoRow(
                Icons.calendar_today_rounded,
                _formatDate(patient.dateOfBirth),
                colorScheme,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Medical Information
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Medical Information',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              _buildInfoRow(
                Icons.add_circle_outline_rounded,
                patient.medicalHistory ?? 'No significant medical history',
                colorScheme,
              ),
              const SizedBox(height: 8),
              _buildInfoRow(
                Icons.warning_rounded,
                patient.allergies ?? 'None',
                colorScheme,
              ),
              const SizedBox(height: 8),
              _buildInfoRow(
                Icons.medication_rounded,
                patient.medications ?? 'None',
                colorScheme,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(IconData icon, String text, ColorScheme colorScheme) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: colorScheme.onSurface.withValues(alpha: 0.6)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface,
            ),
          ),
        ),
      ],
    );
  }

  // Summary Statistics Cards
  Widget _buildStatisticsCards(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    final consultationsAsync = ref.watch(
      patientConsultationsProvider(
        ConsultationListParams(patientId: patient.id),
      ),
    );
    final medicalRecordsAsync = ref.watch(
      patientMedicalRecordsProvider(patient.id),
    );
    final vitalsHistoryAsync = ref.watch(
      patientVitalsHistoryProvider(patient.id),
    );

    return consultationsAsync.when(
      data: (consultations) {
        final medicalRecords = medicalRecordsAsync.value ?? [];
        final vitalsHistory = vitalsHistoryAsync.value ?? {};
        final vitalsList = vitalsHistory['items'] as List<dynamic>? ?? [];

        final lastConsultation = consultations.isNotEmpty
            ? consultations.reduce((a, b) =>
                a.startTime.isAfter(b.startTime) ? a : b)
            : null;

        final lastHealthScan = vitalsList.isNotEmpty
            ? vitalsList.first
            : null;

        return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // FULL WIDTH — Total Consultations
          SizedBox(
            width: double.infinity,
            height: 100, // 👈 adjust to taste (90–120 works well)
            child: _buildStatCard(
              context,
              Icons.calendar_today_rounded,
              '${consultations.length}',
              'TOTAL CONSULTATIONS',
              colorScheme,
            ),
          ),


          const SizedBox(height: 12),

          // 2-COLUMN GRID — rest of stats
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.8, // taller
            children: [
              _buildStatCard(
                context,
                Icons.favorite_rounded,
                '${vitalsList.length}',
                'HEALTH SCANS',
                colorScheme,
              ),
              _buildStatCard(
                context,
                Icons.access_time_rounded,
                lastConsultation != null
                    ? _formatDateShort(lastConsultation.startTime)
                    : 'N/A',
                'LAST CONSULTATION',
                colorScheme,
              ),
              _buildStatCard(
                context,
                Icons.favorite_border_rounded,
                lastHealthScan != null
                    ? _formatDateShort(
                        DateTime.parse(
                          (lastHealthScan as Map)['createdAt'] as String,
                        ),
                      )
                    : 'N/A',
                'LAST HEALTH SCAN',
                colorScheme,
              ),
              _buildStatCard(
                context,
                Icons.description_rounded,
                '${medicalRecords.length}',
                'MEDICAL RECORDS',
                colorScheme,
              ),
            ],
          ),
        ],
      );

      },
      loading: () => const SizedBox(height: 80, child: Center(child: CircularProgressIndicator())),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    IconData icon,
    String value,
    String label,
    ColorScheme colorScheme,
  ) {
    return Container(
      
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: colorScheme.onSurface.withValues(alpha: 0.6)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 9,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                    letterSpacing: 0.5,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Overview Tab
  Widget _buildOverviewTab(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    final bmi = _calculateBMI(patient.weight, patient.height);
    String bmiCategory = 'Normal weight';
    if (bmi < 18.5) {
      bmiCategory = 'Underweight';
    } else if (bmi >= 25) {
      bmiCategory = 'Overweight';
    }

    return SingleChildScrollView(
      child: Column(
        children: [
          // Personal Information
          _buildInfoCard(
            context,
            'Personal Information',
            [
              _buildInfoField('NAME', patient.displayName, colorScheme),
              _buildInfoField('GENDER', patient.gender, colorScheme),
              _buildInfoField('DATE OF BIRTH', _formatDate(patient.dateOfBirth), colorScheme),
              _buildInfoField('BLOOD TYPE', patient.bloodType, colorScheme),
              _buildInfoField('HEIGHT', '${patient.height.toStringAsFixed(0)} cm', colorScheme),
              _buildInfoField('WEIGHT', '${patient.weight.toStringAsFixed(1)} kg', colorScheme),
              _buildInfoField('BMI', '${bmi.toStringAsFixed(1)} ($bmiCategory)', colorScheme),
            ],
            colorScheme,
          ),
          const SizedBox(height: 16),
          // Medical History
          _buildInfoCard(
            context,
            'Medical History',
            [
              _buildInfoField(
                'MEDICAL HISTORY',
                patient.medicalHistory ?? 'No significant medical history',
                colorScheme,
              ),
              const SizedBox(height: 12),
              Text(
                'ALLERGIES',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface.withValues(alpha: 0.5),
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 4),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBadge(
                    (patient.allergies != null && patient.allergies!.isNotEmpty)
                        ? patient.allergies!
                        : 'None',
                    colorScheme,
                  ),
                ],
              ),

              const SizedBox(height: 12),
              Text(
                'CURRENT MEDICATIONS',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface.withValues(alpha: 0.5),
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 4),
             Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBadge(
                    (patient.medications != null && patient.medications!.isNotEmpty)
                        ? patient.medications!
                        : 'None',
                    colorScheme,
                  ),
                ],
              ),

            ],
            colorScheme,
          ),
          const SizedBox(height: 16),
          // Emergency Contact (placeholder)
          _buildInfoCard(
            context,
            'Emergency Contact',
            [
              _buildInfoField('NAME', 'Not provided', colorScheme),
              _buildInfoField('RELATIONSHIP', 'Not provided', colorScheme),
              _buildInfoField('PHONE', 'Not provided', colorScheme),
              _buildInfoField('ADDRESS', 'Not provided', colorScheme),
            ],
            colorScheme,
          ),
          const SizedBox(height: 16),
          // Insurance Information (using PhilHealth)
          _buildInfoCard(
            context,
            'Insurance Information',
            [
              _buildInfoField('PROVIDER', 'PhilHealth', colorScheme),
              _buildInfoField(
                'POLICY NUMBER',
                patient.philHealthId ?? 'Not provided',
                colorScheme,
              ),
              _buildInfoField('CONTACT', 'Not provided', colorScheme),
            ],
            colorScheme,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(
  BuildContext context,
  String title,
  List<Widget> children,
  ColorScheme colorScheme,
) {
  return SizedBox(
    width: double.infinity, // 👈 FULL WIDTH, NO EXCUSES
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    ),
  );
}


  Widget _buildInfoField(String label, String value, ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface.withValues(alpha: 0.5),
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(String text, ColorScheme colorScheme) {
    return SizedBox(
      width: double.infinity,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: colorScheme.primary.withValues(alpha: 0.2),
          ),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: colorScheme.primary,
          ),
        ),
      ),
    );
  }


  // Health Trends Tab
  Widget _buildHealthTrendsTab(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    final vitalsHistoryAsync = ref.watch(patientVitalsHistoryProvider(patient.id));

    return vitalsHistoryAsync.when(
      data: (vitalsHistory) {
        final vitalsList = vitalsHistory['items'] as List<dynamic>? ?? [];
        return SingleChildScrollView(
          child: Column(
            children: [
              // Metric Trend Cards
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 3,
                childAspectRatio: 1.1,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                children: [
                  _buildTrendCard('Heart Rate', '+6.9%', 'bpm', Icons.trending_up_rounded, Colors.green, colorScheme),
                  _buildTrendCard('Blood Pressure', '-5%', 'mmHg', Icons.remove_rounded, Colors.blue, colorScheme),
                  _buildTrendCard('SpO2', '-1%', '%', Icons.remove_rounded, Colors.blue, colorScheme),
                  _buildTrendCard('Weight', '+6.9%', 'kg', Icons.trending_up_rounded, Colors.green, colorScheme),
                  _buildTrendCard('Stress Level', '-4.8%', '', Icons.remove_rounded, Colors.blue, colorScheme),
                  _buildTrendCard('General Wellness', '+4.5%', '', Icons.remove_rounded, Colors.blue, colorScheme),
                ],
              ),
              const SizedBox(height: 16),
              // Chart Section
              _buildChartSection(context, vitalsList, colorScheme),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => Center(
        child: Text(
          'Error loading health trends',
          style: TextStyle(color: colorScheme.error),
        ),
      ),
    );
  }

  Widget _buildTrendCard(
    String label,
    String change,
    String unit,
    IconData icon,
    Color color,
    ColorScheme colorScheme,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
              Icon(icon, size: 14, color: color),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                change,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
              if (unit.isNotEmpty)
                Text(
                  unit,
                  style: TextStyle(
                    fontSize: 10,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                color: color.withValues(alpha: 0.2),
              ),
            ),
            child: Text(
              change.contains('+') ? 'Improving' : 'Stable',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChartSection(
    BuildContext context,
    List<dynamic> vitalsList,
    ColorScheme colorScheme,
  ) {
    // Process data for chart
    final chartData = <FlSpot>[];
    final dates = <String>[];

    if (vitalsList.isNotEmpty) {
      // Sort by date
      final sorted = List<Map<String, dynamic>>.from(vitalsList)
        ..sort((a, b) {
          final dateA = DateTime.parse(a['createdAt'] as String? ?? DateTime.now().toIso8601String());
          final dateB = DateTime.parse(b['createdAt'] as String? ?? DateTime.now().toIso8601String());
          return dateA.compareTo(dateB);
        });

      for (int i = 0; i < sorted.length && i < 10; i++) {
        final item = sorted[i];
        final date = DateTime.parse(item['createdAt'] as String? ?? DateTime.now().toIso8601String());
        final value = (item['heartRate'] as num?)?.toDouble() ?? 70.0;
        chartData.add(FlSpot(i.toDouble(), value));
        dates.add(DateFormat('MMM dd').format(date));
      }
    }

    // Default data if empty
    if (chartData.isEmpty) {
      chartData.addAll([
        FlSpot(0, 72),
        FlSpot(1, 68),
        FlSpot(2, 75),
        FlSpot(3, 70),
        FlSpot(4, 73),
        FlSpot(5, 69),
        FlSpot(6, 71),
      ]);
      dates.addAll(['Jan 15', 'Jan 20', 'Jan 28', 'Oct 16', 'Oct 17', 'Oct 21', 'Oct 28']);
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Heart Rate Trend',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  Text(
                    'Heart Rate Over Time',
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ),
              DropdownButton<String>(
                value: _selectedMetric,
                items: const [
                  DropdownMenuItem(value: 'heart-rate', child: Text('Heart Rate')),
                  DropdownMenuItem(value: 'blood-pressure', child: Text('Blood Pressure')),
                  DropdownMenuItem(value: 'spo2', child: Text('SpO2')),
                  DropdownMenuItem(value: 'weight', child: Text('Weight')),
                  DropdownMenuItem(value: 'stress', child: Text('Stress Level')),
                  DropdownMenuItem(value: 'wellness', child: Text('General Wellness')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedMetric = value);
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 200,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(show: true, drawVerticalLine: false),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: true, reservedSize: 40),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      getTitlesWidget: (value, meta) {
                        final index = value.toInt();
                        if (index >= 0 && index < dates.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              dates[index],
                              style: TextStyle(
                                fontSize: 10,
                                color: colorScheme.onSurface.withValues(alpha: 0.6),
                              ),
                            ),
                          );
                        }
                        return const Text('');
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: true),
                lineBarsData: [
                  LineChartBarData(
                    spots: chartData,
                    isCurved: true,
                    color: colorScheme.primary,
                    barWidth: 3,
                    dotData: FlDotData(show: true),
                    belowBarData: BarAreaData(show: false),
                  ),
                ],
                minY: 60,
                maxY: 80,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Consultations Tab
  Widget _buildConsultationsTab(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    final consultationsAsync = ref.watch(
      patientConsultationsProvider(
        ConsultationListParams(patientId: patient.id),
      ),
    );

    return consultationsAsync.when(
      data: (consultations) {
        if (consultations.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.calendar_today_rounded,
                  size: 64,
                  color: colorScheme.outline,
                ),
                const SizedBox(height: 16),
                Text(
                  'No consultations found',
                  style: TextStyle(
                    fontSize: 16,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          );
        }

        return SingleChildScrollView(
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: colorScheme.outline.withValues(alpha: 0.1),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Your Consultations',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        Text(
                          '${consultations.length} consultations found',
                          style: TextStyle(
                            fontSize: 12,
                            color: colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Consultation Cards
              ...consultations.map((consultation) => _buildConsultationCard(
                    context,
                    consultation,
                    colorScheme,
                  )),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => Center(
        child: Text(
          'Error loading consultations',
          style: TextStyle(color: colorScheme.error),
        ),
      ),
    );
  }

  Widget _buildConsultationCard(
    BuildContext context,
    Consultation consultation,
    ColorScheme colorScheme,
  ) {
    final doctorAsync = ref.watch(doctorByIdProvider(consultation.doctorId));

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Date/Time Column
              Container(
                width: 80,
                child: Column(
                  children: [
                    Text(
                      _formatDateShort(consultation.startTime),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    Text(
                      _formatTime(consultation.startTime),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    Text(
                      DateFormat('EEE').format(consultation.startTime).toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        color: colorScheme.onSurface.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Doctor Info
                    doctorAsync.when(
                      data: (doctor) {
                        return Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: colorScheme.surfaceContainerHighest,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.person_rounded,
                                color: colorScheme.onSurface.withValues(alpha: 0.6),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Dr. ${doctor.firstName} ${doctor.lastName}',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: colorScheme.onSurface,
                                    ),
                                  ),
                                  if (doctor.specialization.isNotEmpty)
                                    Text(
                                      doctor.specialization,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: colorScheme.onSurface.withValues(alpha: 0.6),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        );
                      },
                      loading: () => const SizedBox(height: 48, child: CircularProgressIndicator()),
                      error: (_, __) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 12),
                    // Consultation Code
                    Row(
                      children: [
                        Icon(
                          Icons.folder_rounded,
                          size: 16,
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          consultation.consultationCode,
                          style: TextStyle(
                            fontSize: 12,
                            fontFamily: 'monospace',
                            color: colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Action Buttons
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            // View details
                          },
                          icon: const Icon(Icons.visibility_rounded, size: 16),
                          label: const Text('View Details'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colorScheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => _copyToClipboard(
                            consultation.consultationCode,
                            'Consultation code',
                          ),
                          icon: const Icon(Icons.copy_rounded, size: 16),
                          label: const Text('Copy Code'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                        if (consultation.endTime == null)
                          OutlinedButton.icon(
                            onPressed: () {
                              // Join meeting
                            },
                            icon: const Icon(Icons.video_call_rounded, size: 16),
                            label: const Text('Join Now'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              // Status Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: consultation.endTime == null
                      ? Colors.blue.withValues(alpha: 0.1)
                      : Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: consultation.endTime == null
                        ? Colors.blue.withValues(alpha: 0.2)
                        : Colors.green.withValues(alpha: 0.2),
                  ),
                ),
                child: Text(
                  consultation.endTime == null ? 'IN PROGRESS' : 'COMPLETED',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: consultation.endTime == null ? Colors.blue : Colors.green,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Self Check History Tab
  Widget _buildSelfCheckTab(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    final medicalRecordsAsync = ref.watch(patientMedicalRecordsProvider(patient.id));
    final vitalsHistoryAsync = ref.watch(patientVitalsHistoryProvider(patient.id));

    return medicalRecordsAsync.when(
      data: (medicalRecords) {
        final vitalsHistory = vitalsHistoryAsync.value ?? {};
        final vitalsList = vitalsHistory['items'] as List<dynamic>? ?? [];

        // Filter self-check records
        final selfCheckRecords = medicalRecords
            .where((record) =>
                record.recordType.contains('SELF_CHECK') ||
                record.title.contains('Self-Check'))
            .toList();

        // Combine with vitals history
        final allSelfChecks = <Map<String, dynamic>>[];

        // Add medical records
        for (final record in selfCheckRecords) {
          allSelfChecks.add({
            'type': 'medical_record',
            'id': record.id,
            'title': record.title,
            'date': record.createdAt,
            'createdBy': record.createdBy,
            'isPrivate': !record.isPublic,
          });
        }

        // Add vitals history entries
        for (final vital in vitalsList) {
          final vitalMap = vital as Map<String, dynamic>;
          allSelfChecks.add({
            'type': 'vital',
            'id': vitalMap['id'] as String? ?? '',
            'title': 'Self-Check Health Scan Results',
            'date': DateTime.parse(
              vitalMap['createdAt'] as String? ?? DateTime.now().toIso8601String(),
            ),
            'createdBy': patient.email,
            'isPrivate': true,
            'metricsCount': 16, // Approximate
          });
        }

        // Sort by date (newest first)
        allSelfChecks.sort((a, b) => (b['date'] as DateTime).compareTo(a['date'] as DateTime));

        if (allSelfChecks.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.notes_rounded,
                  size: 64,
                  color: colorScheme.outline,
                ),
                const SizedBox(height: 16),
                Text(
                  'No self-check history found',
                  style: TextStyle(
                    fontSize: 16,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          );
        }

        return SingleChildScrollView(
          child: Column(
            children: allSelfChecks.map((selfCheck) {
              return _buildSelfCheckCard(
                context,
                selfCheck,
                colorScheme,
              );
            }).toList(),
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => Center(
        child: Text(
          'Error loading self-check history',
          style: TextStyle(color: colorScheme.error),
        ),
      ),
    );
  }

  Widget _buildSelfCheckCard(
    BuildContext context,
    Map<String, dynamic> selfCheck,
    ColorScheme colorScheme,
  ) {
    final date = selfCheck['date'] as DateTime;
    final metricsCount = selfCheck['metricsCount'] as int? ?? 16;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.notes_rounded,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  selfCheck['title'] as String? ?? 'Consultation Notes',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Self-Check Health Scan Results',
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Self-check health scan performed on ${_formatDate(date)}. Results include: ($metricsCount health metrics measured)',
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Created by: ${selfCheck['createdBy'] as String? ?? 'patient'}',
                  style: TextStyle(
                    fontSize: 10,
                    color: colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Colors.blue.withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.lock_rounded,
                      size: 12,
                      color: Colors.blue,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Private',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Colors.blue,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _formatDate(date),
                style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 8),
              IconButton(
                icon: Icon(
                  Icons.visibility_rounded,
                  size: 20,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
                onPressed: () {
                  // View details
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
