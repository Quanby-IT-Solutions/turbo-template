import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/scheduling/providers/search_providers.dart';

class DoctorSearchScreen extends ConsumerStatefulWidget {
  const DoctorSearchScreen({super.key});

  @override
  ConsumerState<DoctorSearchScreen> createState() => _DoctorSearchScreenState();
}

class _DoctorSearchScreenState extends ConsumerState<DoctorSearchScreen> {
  final _searchController = TextEditingController();
  List<Doctor> _allDoctors = [];
  List<Doctor> _filteredDoctors = [];
  String _selectedSpecialty = 'All';
  String _selectedLocation = 'All';
  bool _isOnlineOnly = false;
  bool _isLoading = false;

  final List<String> _specialties = [
    'All',
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Endocrinology',
    'Gastroenterology',
    'Mental Health',
    'Neurology',
    'Oncology',
    'Orthopedics',
    'Pediatrics',
    'Pulmonology',
  ];

  final List<String> _locations = [
    'All',
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
  ];

  @override
  void initState() {
    super.initState();
    _loadDoctors();
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    // Debounce search - reload doctors when search text changes
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted && _searchController.text == _searchController.text) {
        _loadDoctors();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDoctors() async {
    setState(() => _isLoading = true);

    try {
      final repository = ref.read(searchRepositoryProvider);

      // If we have a search query, use it; otherwise load all doctors
      final result = await repository.searchDoctors(
        name: _searchController.text.trim().isEmpty
            ? null
            : _searchController.text.trim(),
        specialization: _selectedSpecialty == 'All' ? null : _selectedSpecialty,
        availableOnly: _isOnlineOnly,
        page: 1,
        limit: 50,
      );

      // Convert API doctors to screen Doctor format
      _allDoctors = result.doctors.map((apiDoctor) {
        return Doctor(
          id: apiDoctor.id,
          name: apiDoctor.name,
          specialty: apiDoctor.primarySpecialty,
          location: apiDoctor.organization?.address ?? 'Location not available',
          rating: 4.5, // Default rating (not in API yet)
          reviewCount: 0, // Default (not in API yet)
          yearsExperience: apiDoctor.experience ?? 0,
          bio: apiDoctor.bio ?? 'No bio available',
          education: apiDoctor.qualifications ?? 'Education not available',
          languages: ['English'], // Default (not in API yet)
          isOnline: apiDoctor.isLicenseActive,
          nextAvailable: DateTime.now().add(const Duration(days: 1)), // Default
          consultationFee: 0, // Default (not in API yet)
          profileImage: apiDoctor.image,
        );
      }).toList();

      _filteredDoctors = List.from(_allDoctors);
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Failed to load doctors',
          description: e.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _filterDoctors() {
    final query = _searchController.text.toLowerCase();

    setState(() {
      _filteredDoctors = _allDoctors.where((doctor) {
        final matchesSearch =
            doctor.name.toLowerCase().contains(query) ||
            doctor.specialty.toLowerCase().contains(query);

        final matchesSpecialty =
            _selectedSpecialty == 'All' ||
            doctor.specialty == _selectedSpecialty;

        final matchesLocation =
            _selectedLocation == 'All' || doctor.location == _selectedLocation;

        final matchesOnline = !_isOnlineOnly || doctor.isOnline;

        return matchesSearch &&
            matchesSpecialty &&
            matchesLocation &&
            matchesOnline;
      }).toList();

      // Sort by rating and availability
      _filteredDoctors.sort((a, b) {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return b.rating.compareTo(a.rating);
      });
    });
  }

  void _showFilterBottomSheet() {
    final colorScheme = Theme.of(context).colorScheme;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerLow,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: colorScheme.outline.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Filters',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurface,
                            letterSpacing: -0.3,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _selectedSpecialty = 'All';
                              _selectedLocation = 'All';
                              _isOnlineOnly = false;
                            });
                            setModalState(() {});
                            _filterDoctors();
                          },
                          style: TextButton.styleFrom(
                            backgroundColor: colorScheme.primary.withValues(
                              alpha: 0.1,
                            ),
                            foregroundColor: colorScheme.primary,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Reset All',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Specialty',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest.withValues(
                          alpha: 0.5,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: colorScheme.outline.withValues(alpha: 0.1),
                        ),
                      ),
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedSpecialty,
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        items: _specialties
                            .map(
                              (specialty) => DropdownMenuItem(
                                value: specialty,
                                child: Text(specialty),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedSpecialty = value);
                            setModalState(() {});
                            _filterDoctors();
                          }
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Location',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest.withValues(
                          alpha: 0.5,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: colorScheme.outline.withValues(alpha: 0.1),
                        ),
                      ),
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedLocation,
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        items: _locations
                            .map(
                              (location) => DropdownMenuItem(
                                value: location,
                                child: Text(location),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedLocation = value);
                            setModalState(() {});
                            _filterDoctors();
                          }
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    Container(
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest.withValues(
                          alpha: 0.5,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: colorScheme.outline.withValues(alpha: 0.1),
                        ),
                      ),
                      child: SwitchListTile(
                        title: Text(
                          'Online consultations only',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        value: _isOnlineOnly,
                        activeThumbColor: colorScheme.primary,
                        onChanged: (value) {
                          setState(() => _isOnlineOnly = value);
                          setModalState(() {});
                          _filterDoctors();
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          if (_filteredDoctors.isEmpty) {
                            ToastService.showInfo(
                              context: context,
                              title: 'No Results',
                              description:
                                  'No doctors found matching your criteria. Try adjusting filters.',
                            );
                          } else {
                            ToastService.showInfo(
                              context: context,
                              title: 'Filters Applied',
                              description:
                                  'Found ${_filteredDoctors.length} doctor(s) matching your criteria',
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colorScheme.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: const Text(
                          'Apply Filters',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
          automaticallyImplyLeading: false,
          title: Text(
            'Find a Doctor',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          actions: [
            Container(
              margin: const EdgeInsets.only(right: 16),
              child: IconButton(
                icon: Icon(
                  Icons.filter_list_rounded,
                  color: colorScheme.primary,
                ),
                style: IconButton.styleFrom(
                  backgroundColor: colorScheme.primary.withValues(alpha: 0.1),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _showFilterBottomSheet,
              ),
            ),
          ],
        ),
        body: Column(
          children: [
            // Search Bar
            Container(
              padding: const EdgeInsets.all(16),
              color: colorScheme.surfaceContainerLow,
              child: Container(
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest.withValues(
                    alpha: 0.5,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: colorScheme.outline.withValues(alpha: 0.1),
                  ),
                ),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search doctors by name or specialty...',
                    hintStyle: TextStyle(
                      color: colorScheme.onSurface.withValues(alpha: 0.4),
                    ),
                    prefixIcon: Icon(
                      Icons.search_rounded,
                      color: colorScheme.primary,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                  ),
                ),
              ),
            ),

            // Filter Summary
            if (_selectedSpecialty != 'All' ||
                _selectedLocation != 'All' ||
                _isOnlineOnly)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.05),
                  border: Border(
                    bottom: BorderSide(
                      color: colorScheme.outline.withValues(alpha: 0.1),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.filter_alt_rounded,
                      size: 16,
                      color: colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Filters: ${[if (_selectedSpecialty != 'All') _selectedSpecialty, if (_selectedLocation != 'All') _selectedLocation, if (_isOnlineOnly) 'Online only'].join(', ')}',
                        style: TextStyle(
                          color: colorScheme.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _selectedSpecialty = 'All';
                          _selectedLocation = 'All';
                          _isOnlineOnly = false;
                        });
                        _filterDoctors();
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: colorScheme.primary,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                      ),
                      child: const Text(
                        'Clear',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Results
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredDoctors.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: colorScheme.outline.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(32),
                              border: Border.all(
                                color: colorScheme.outline.withValues(
                                  alpha: 0.2,
                                ),
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              Icons.search_off_rounded,
                              size: 64,
                              color: colorScheme.outline,
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'No doctors found',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Try adjusting your search criteria.',
                            style: TextStyle(
                              fontSize: 14,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                      itemCount: _filteredDoctors.length,
                      itemBuilder: (context, index) {
                        final doctor = _filteredDoctors[index];
                        return _buildDoctorCard(doctor);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDoctorCard(Doctor doctor) {
    final colorScheme = Theme.of(context).colorScheme;

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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showDoctorProfile(doctor),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            colorScheme.primary,
                            colorScheme.primary.withValues(alpha: 0.7),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Center(
                        child: Text(
                          doctor.name.split(' ').map((n) => n[0]).join(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 20,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  doctor.name,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                    color: colorScheme.onSurface,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                              ),
                              if (doctor.isOnline)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.green,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'ONLINE',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            doctor.specialty,
                            style: TextStyle(
                              color: colorScheme.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                Icons.star_rounded,
                                size: 16,
                                color: Colors.amber[700],
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${doctor.rating} (${doctor.reviewCount})',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.6,
                                  ),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '• ${doctor.yearsExperience} years',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.6,
                                  ),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  doctor.bio,
                  style: TextStyle(
                    fontSize: 14,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                    height: 1.4,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest.withValues(
                      alpha: 0.5,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.location_on_rounded,
                        size: 16,
                        color: colorScheme.primary,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          doctor.location,
                          style: TextStyle(
                            fontSize: 13,
                            color: colorScheme.onSurface.withValues(alpha: 0.7),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Icon(
                        Icons.schedule_rounded,
                        size: 16,
                        color: colorScheme.primary,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _formatNextAvailable(doctor.nextAvailable),
                        style: TextStyle(
                          fontSize: 13,
                          color: colorScheme.onSurface.withValues(alpha: 0.7),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Consultation Fee',
                            style: TextStyle(
                              fontSize: 12,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '\$${doctor.consultationFee}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 20,
                              color: Colors.green,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          context.push(
                            '/appointment-booking?doctorId=${doctor.id}&doctorName=${Uri.encodeComponent(doctor.name)}',
                          );
                        },
                        icon: const Icon(
                          Icons.calendar_today_rounded,
                          size: 18,
                        ),
                        label: const Text('Book Now'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colorScheme.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showDoctorProfile(Doctor doctor) {
    final colorScheme = Theme.of(context).colorScheme;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerLow,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12),
                decoration: BoxDecoration(
                  color: colorScheme.outline.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  colorScheme.primary,
                                  colorScheme.primary.withValues(alpha: 0.7),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Center(
                              child: Text(
                                doctor.name.split(' ').map((n) => n[0]).join(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 28,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  doctor.name,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 20,
                                    color: colorScheme.onSurface,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  doctor.specialty,
                                  style: TextStyle(
                                    color: colorScheme.primary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.star_rounded,
                                      size: 18,
                                      color: Colors.amber[700],
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${doctor.rating} (${doctor.reviewCount})',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: colorScheme.onSurface,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),

                      // Stats Cards
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: colorScheme.primary.withValues(
                                  alpha: 0.1,
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.medical_services_rounded,
                                    color: colorScheme.primary,
                                    size: 28,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${doctor.yearsExperience}',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w700,
                                      color: colorScheme.onSurface,
                                    ),
                                  ),
                                  Text(
                                    'Years Exp',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: colorScheme.onSurface.withValues(
                                        alpha: 0.6,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.green.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  const Icon(
                                    Icons.people_rounded,
                                    color: Colors.green,
                                    size: 28,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${doctor.reviewCount}+',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w700,
                                      color: colorScheme.onSurface,
                                    ),
                                  ),
                                  Text(
                                    'Patients',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: colorScheme.onSurface.withValues(
                                        alpha: 0.6,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),

                      // About Section
                      Text(
                        'About',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                          color: colorScheme.onSurface,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest.withValues(
                            alpha: 0.5,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          doctor.bio,
                          style: TextStyle(
                            fontSize: 15,
                            color: colorScheme.onSurface.withValues(alpha: 0.8),
                            height: 1.5,
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Education & Experience
                      Text(
                        'Education & Experience',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                          color: colorScheme.onSurface,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest.withValues(
                            alpha: 0.5,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.school_rounded,
                                  size: 20,
                                  color: colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    doctor.education,
                                    style: TextStyle(
                                      fontSize: 15,
                                      color: colorScheme.onSurface,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Icon(
                                  Icons.work_rounded,
                                  size: 20,
                                  color: colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${doctor.yearsExperience} years of experience',
                                  style: TextStyle(
                                    fontSize: 15,
                                    color: colorScheme.onSurface,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Languages
                      Text(
                        'Languages',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                          color: colorScheme.onSurface,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: doctor.languages.map((language) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: colorScheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: colorScheme.primary.withValues(
                                  alpha: 0.2,
                                ),
                              ),
                            ),
                            child: Text(
                              language,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: colorScheme.primary,
                              ),
                            ),
                          );
                        }).toList(),
                      ),

                      const SizedBox(height: 24),

                      // Location & Availability
                      Text(
                        'Location & Availability',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                          color: colorScheme.onSurface,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest.withValues(
                            alpha: 0.5,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.location_on_rounded,
                                  size: 20,
                                  color: colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    doctor.location,
                                    style: TextStyle(
                                      fontSize: 15,
                                      color: colorScheme.onSurface,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Icon(
                                  Icons.schedule_rounded,
                                  size: 20,
                                  color: colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Next available: ${_formatNextAvailable(doctor.nextAvailable)}',
                                  style: TextStyle(
                                    fontSize: 15,
                                    color: colorScheme.onSurface,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                            if (doctor.isOnline) ...[
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Icon(
                                    Icons.videocam_rounded,
                                    size: 20,
                                    color: Colors.green,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Online consultations available',
                                    style: TextStyle(
                                      fontSize: 15,
                                      color: colorScheme.onSurface,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Book Appointment Button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            context.push(
                              '/appointment-booking?doctorId=${doctor.id}&doctorName=${Uri.encodeComponent(doctor.name)}',
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colorScheme.primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Text(
                            'Book Appointment - \$${doctor.consultationFee}',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatNextAvailable(DateTime dateTime) {
    final now = DateTime.now();
    final difference = dateTime.difference(now);

    if (difference.inDays > 0) {
      return '${difference.inDays} days';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hours';
    } else {
      return 'Soon';
    }
  }
}

class Doctor {
  final String id;
  final String name;
  final String specialty;
  final String location;
  final double rating;
  final int reviewCount;
  final int yearsExperience;
  final String bio;
  final String education;
  final List<String> languages;
  final bool isOnline;
  final DateTime nextAvailable;
  final int consultationFee;
  final String? profileImage;

  Doctor({
    required this.id,
    required this.name,
    required this.specialty,
    required this.location,
    required this.rating,
    required this.reviewCount,
    required this.yearsExperience,
    required this.bio,
    required this.education,
    required this.languages,
    required this.isOnline,
    required this.nextAvailable,
    required this.consultationFee,
    this.profileImage,
  });
}
